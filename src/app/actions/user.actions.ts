

'use server';

import { doc, getDoc, updateDoc, collection, writeBatch, query, where, getDocs, Timestamp, deleteDoc, orderBy, setDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import type { UserBankAccount, UserProfile, UserRole, UserPermissions } from '@/lib/types';
import { userBankAccountSchema, type UserBankAccountFormValues } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import { deleteFileByPath } from '@/lib/storage';
import { endOfDay, startOfDay } from 'date-fns';
import { getReferralSettings } from './referral.actions';
import { deleteUser as deleteAuthUser, updateProfile } from 'firebase/auth';


// --- Admin-only User Management Actions ---
export async function toggleUserAccount(uid: string, disable: boolean) {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { disabled: disable });
        // NOTE: Firebase Admin SDK is required to disable auth user.
        // This Firestore flag will prevent login in the app logic.
        revalidatePath('/admin/users');
        return { success: `User account has been ${disable ? 'disabled' : 'enabled'}.` };
    } catch (error: any) {
        console.error("Error toggling user account:", error);
        return { error: 'Failed to update user status.' };
    }
}

export async function deleteUserAccount(uid: string) {
    try {
        const batch = writeBatch(db);

        // 1. Delete user's main document
        const userRef = doc(db, 'users', uid);
        batch.delete(userRef);

        // Collections to clean up
        const collectionsToClean = ['bets', 'deposits', 'withdrawals', 'transactions'];

        for (const collectionName of collectionsToClean) {
            const userDocsQuery = query(collection(db, collectionName), where('userId', '==', uid));
            const userDocsSnapshot = await getDocs(userDocsQuery);
            
            for (const docSnapshot of userDocsSnapshot.docs) {
                // Special handling for deposits to delete screenshots
                if (collectionName === 'deposits') {
                    const depositData = docSnapshot.data();
                    if (depositData.screenshotPath) {
                        try {
                            await deleteFileByPath(depositData.screenshotPath);
                        } catch (storageError) {
                             console.error(`Could not delete storage file for deposit ${docSnapshot.id}, but will still delete Firestore record. Error:`, storageError);
                        }
                    }
                }
                batch.delete(docSnapshot.ref);
            }
        }
        
        // 2. Commit all deletions in a single batch
        await batch.commit();

        revalidatePath('/admin/users');
        return { success: "User's account and all associated data have been permanently deleted." };
    } catch (error: any) {
        console.error("Error deleting user account and data:", error);
        return { error: 'Failed to delete user data.' };
    }
}


// Function to get user's bank account
export async function getUserBankAccount(userId: string): Promise<UserBankAccount | null> {
    if (!userId) return null;
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().bankAccount) {
            return userDoc.data().bankAccount as UserBankAccount;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user bank account:", error);
        return null;
    }
}

// Server action to update user's bank account
export async function updateUserBankAccount(userId: string, data: UserBankAccountFormValues) {
    if (!userId) {
        return { error: 'You must be logged in.' };
    }

    const validatedFields = userBankAccountSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid data provided.' };
    }

    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            bankAccount: validatedFields.data
        });
        
        revalidatePath('/profile');
        revalidatePath('/wallet');
        return { success: 'Bank details updated successfully!' };

    } catch (error: any) {
        console.error("Error updating bank details: ", error);
        return { error: 'Failed to update bank details.' };
    }
}

// Server action to update a user's role and permissions
export async function updateUserRoleAndPermissions(
    userId: string, 
    role: UserRole, 
    permissions: Partial<UserPermissions>
) {
    if (!userId) {
        return { error: 'User ID is required.' };
    }

    try {
        const userRef = doc(db, 'users', userId);
        const updateData: { role: UserRole, permissions?: Partial<UserPermissions> } = { role };
        
        if (role === 'sub-admin') {
            updateData.permissions = permissions;
        } else {
            // If role is not sub-admin, ensure permissions are cleared
            updateData.permissions = {};
        }

        await updateDoc(userRef, updateData);
        
        revalidatePath('/admin/users');
        return { success: "User's role and permissions updated successfully." };

    } catch (error: any) {
        console.error("Error updating user role:", error);
        return { error: 'Failed to update user role.' };
    }
}


// Server action to delete user data history
export async function deleteDataHistory({ startDate, endDate, collectionsToDelete }: { startDate: Date; endDate: Date; collectionsToDelete: string[] }) {
    if (collectionsToDelete.length === 0) {
        return { error: 'Please select at least one data type to delete.' };
    }

    try {
        let totalDeleted = 0;
        const dateFieldMap: { [key: string]: string } = {
            bets: 'timestamp',
            deposits: 'createdAt',
            withdrawals: 'createdAt',
            matches: 'startTime',
        };
        
        const finalStartDate = startOfDay(startDate);
        const finalEndDate = endOfDay(endDate);

        for (const collectionName of collectionsToDelete) {
            const dateField = dateFieldMap[collectionName];
            if (!dateField) continue;
            
            const collectionRef = collection(db, collectionName);
            const q = query(collectionRef, where(dateField, '>=', finalStartDate), where(dateField, '<=', finalEndDate));
            const snapshot = await getDocs(q);

            if (snapshot.empty) continue;

            const deleteBatch = writeBatch(db);
            let deletedInCollection = 0;

            snapshot.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                
                // Safety Check: Do not delete pending requests or active matches.
                if ((collectionName === 'deposits' || collectionName === 'withdrawals') && data.status === 'Processing') {
                    return; 
                }
                if (collectionName === 'matches' && ['Upcoming', 'Live'].includes(data.status)) {
                    return;
                }
                
                // Handle associated file deletions before document deletion
                if (collectionName === 'deposits') {
                    const pathToDelete = data.screenshotPath || data.screenshotUrl;
                    if (pathToDelete) {
                        deleteFileByPath(pathToDelete).catch(storageError => {
                            console.error(`Could not delete storage file for deposit ${docSnapshot.id}, but will still delete Firestore record. Error:`, storageError);
                        });
                    }
                }
                
                if (collectionName === 'matches') {
                    if (data.teamA?.logoPath) {
                        deleteFileByPath(data.teamA.logoPath).catch(e => console.error(e));
                    }
                     if (data.teamB?.logoPath) {
                        deleteFileByPath(data.teamB.logoPath).catch(e => console.error(e));
                    }
                }
                
                // Add the document to the delete batch
                deleteBatch.delete(docSnapshot.ref);
                deletedInCollection++;
            });
            
            if (deletedInCollection > 0) {
                 await deleteBatch.commit();
                 totalDeleted += deletedInCollection;
            }
        }
        
        revalidatePath('/admin/data-management');
        revalidatePath('/admin/dashboard');
        return { success: `Successfully deleted ${totalDeleted} historical records. Pending requests and active matches were preserved.` };
    } catch (error: any) {
        console.error("Error deleting data history: ", error);
        return { error: 'Failed to delete data history. Check server logs for details.' };
    }
}


// New function to get users referred by a specific user
export async function getReferredUsers(referrerId: string): Promise<UserProfile[]> {
    if (!referrerId) {
        return [];
    }
    try {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('referredBy', '==', referrerId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return [];
        }

        const referredUsers = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                name: data.name,
                phoneNumber: data.phoneNumber,
                walletBalance: data.walletBalance,
                referralCode: data.referralCode,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                role: data.role || 'user',
                bankAccount: data.bankAccount,
                referredBy: data.referredBy,
                isFirstBetPlaced: data.isFirstBetPlaced,
                referralBonusAwarded: data.referralBonusAwarded,
            } as UserProfile;
        });

        // Sort on the client side to avoid needing a composite index
        referredUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return referredUsers;
    } catch (error) {
        console.error("Error fetching referred users:", error);
        return [];
    }
}

// New action to reset financial statistics
export async function resetFinancialStats() {
    try {
        const summaryRef = doc(db, 'statistics', 'financialSummary');
        const initialSummary = {
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalWagered: 0,
            totalPayouts: 0,
            // also resetting income, revenue, profit fields
            betIncome: 0,
            grossRevenue: 0,
            finalProfit: 0,
            totalReferralBonuses: 0,
            totalUserWalletFunds: 0
        };
        await setDoc(summaryRef, initialSummary);

        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/financial-reports');
        return { success: 'All-time financial statistics have been reset successfully.' };
    } catch (error: any) {
        console.error("Error resetting financial stats: ", error);
        return { error: 'Failed to reset statistics.' };
    }
}


// New action to fix missing signup bonuses
export async function fixMissingSignupBonuses() {
    try {
        const referralSettings = await getReferralSettings();
        if (!referralSettings.isEnabled || referralSettings.referredUserBonus <= 0) {
            return { success: 'Referral program is disabled or bonus is zero. No action taken.', count: 0 };
        }
        
        const bonusAmount = referralSettings.referredUserBonus;

        const usersRef = collection(db, 'users');
        // Find users who were referred, have a zero balance, and haven't placed a bet.
        // This is a likely indicator of a user who missed their bonus.
        const q = query(
            usersRef, 
            where('referredBy', '!=', null),
            where('walletBalance', '==', 0),
            where('isFirstBetPlaced', '==', false)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return { success: 'No users found who need a bonus fix.', count: 0 };
        }

        const batch = writeBatch(db);
        let fixedCount = 0;

        querySnapshot.forEach(userDoc => {
            const userRef = doc(db, 'users', userDoc.id);
            // Update their balance
            batch.update(userRef, { walletBalance: bonusAmount });

            // Create a transaction log for the bonus
            const transactionRef = doc(collection(db, 'transactions'));
            batch.set(transactionRef, {
                userId: userDoc.id,
                amount: bonusAmount,
                type: 'referral_bonus',
                description: 'Welcome bonus for using a referral code (Applied retroactively).',
                timestamp: Timestamp.now(),
            });
            fixedCount++;
        });

        await batch.commit();
        
        revalidatePath('/admin/users');
        return { success: `Successfully awarded signup bonuses to ${fixedCount} user(s).`, count: fixedCount };

    } catch (error: any) {
        console.error("Error fixing missing bonuses: ", error);
        return { error: 'An error occurred while trying to fix bonuses.' };
    }
}

export async function getTotalWinningsForUser(userId: string): Promise<number> {
    if (!userId) {
        return 0;
    }
    try {
        const betsCol = collection(db, 'bets');
        const q = query(betsCol, where('userId', '==', userId), where('status', '==', 'Won'));
        const betSnapshot = await getDocs(q);

        if (betSnapshot.empty) {
            return 0;
        }

        const totalWinnings = betSnapshot.docs.reduce((sum, doc) => {
            return sum + (doc.data().potentialWin || 0);
        }, 0);

        return totalWinnings;

    } catch (any) {
        console.error(`Error fetching total winnings for user ${userId}:`, any);
        return 0;
    }
}
