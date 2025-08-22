

'use server';

import { doc, getDoc, updateDoc, collection, writeBatch, query, where, getDocs, Timestamp, deleteDoc, orderBy, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserBankAccount, UserProfile } from '@/lib/types';
import { userBankAccountSchema, type UserBankAccountFormValues } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import { deleteFileByPath } from '@/lib/storage';
import { endOfDay, startOfDay } from 'date-fns';
import { getReferralSettings } from './referral.actions';

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
            
            const q = query(
                collection(db, collectionName),
                where(dateField, '>=', Timestamp.fromDate(finalStartDate)),
                where(dateField, '<=', Timestamp.fromDate(finalEndDate))
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) continue;

            const docsToDelete = [];
            const docsToBackup = [];

            // ** NEW ROBUST LOGIC **
            // Filter out pending requests before processing
            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();
                
                if ((collectionName === 'deposits' || collectionName === 'withdrawals') && data.status === 'Processing') {
                    // Skip any pending requests
                    continue;
                }

                // ** NEW **: Skip any upcoming or live matches
                if (collectionName === 'matches' && (data.status === 'Upcoming' || data.status === 'Live')) {
                    continue;
                }
                
                docsToBackup.push(docSnapshot);
                docsToDelete.push(docSnapshot);
            }

            if (docsToBackup.length > 0) {
                const backupCollectionName = `delete_${collectionName}`;
                const backupBatch = writeBatch(db);
                docsToBackup.forEach(docSnapshot => {
                    const backupDocRef = doc(db, backupCollectionName, docSnapshot.id);
                    backupBatch.set(backupDocRef, docSnapshot.data());
                });
                await backupBatch.commit();
            }
            
            if (docsToDelete.length > 0) {
                const deleteBatch = writeBatch(db);

                for (const docSnapshot of docsToDelete) {
                    const data = docSnapshot.data();
                    
                    if (collectionName === 'deposits') {
                        const pathToDelete = data.screenshotPath || data.screenshotUrl;
                        if (pathToDelete) {
                            try {
                                await deleteFileByPath(pathToDelete);
                            } catch (storageError) {
                                console.error(`Could not delete storage file for deposit ${docSnapshot.id}, but will still delete Firestore record. Error:`, storageError);
                            }
                        }
                    }
                    
                    if (collectionName === 'matches') {
                        if (data.teamA?.logoPath) {
                            try {
                                await deleteFileByPath(data.teamA.logoPath);
                            } catch (storageError) {
                                 console.error(`Could not delete storage file for Team A logo in match ${docSnapshot.id}. Error:`, storageError);
                            }
                        }
                         if (data.teamB?.logoPath) {
                            try {
                                await deleteFileByPath(data.teamB.logoPath);
                            } catch (storageError) {
                                 console.error(`Could not delete storage file for Team B logo in match ${docSnapshot.id}. Error:`, storageError);
                            }
                        }
                    }
                    
                    deleteBatch.delete(docSnapshot.ref);
                }
                
                await deleteBatch.commit();
                totalDeleted += docsToDelete.length;
            }
        }
        
        revalidatePath('/admin/data-management');
        revalidatePath('/admin/dashboard');
        return { success: `Successfully backed up and deleted ${totalDeleted} historical records. Pending requests and active matches were preserved.` };
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
        const q = query(usersCol, where('referredBy', '==', referrerId), orderBy('createdAt', 'desc'));
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
                // Explicitly add other fields even if they might be undefined to match the type
                bankAccount: data.bankAccount,
                referredBy: data.referredBy,
                isFirstBetPlaced: data.isFirstBetPlaced,
                referralBonusAwarded: data.referralBonusAwarded,
            } as UserProfile;
        });

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
