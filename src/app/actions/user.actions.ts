

'use server';

import { doc, getDoc, updateDoc, collection, writeBatch, query, where, getDocs, Timestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserBankAccount, UserProfile } from '@/lib/types';
import { userBankAccountSchema, type UserBankAccountFormValues } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import { deleteFileByPath } from '@/lib/storage';
import { endOfDay, startOfDay } from 'date-fns';

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
            
            // --- Backup Logic ---
            const backupCollectionName = `delete_${collectionName}`;
            const backupBatch = writeBatch(db);
            snapshot.docs.forEach(docSnapshot => {
                const backupDocRef = doc(db, backupCollectionName, docSnapshot.id);
                backupBatch.set(backupDocRef, docSnapshot.data());
            });
            await backupBatch.commit();
            
            // --- Deletion Logic (after backup) ---
            const deleteBatch = writeBatch(db);

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();
                
                // Special handling for deposits to delete associated storage file first
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
            totalDeleted += snapshot.size;
        }
        
        revalidatePath('/admin/data-management');
        return { success: `Successfully backed up and deleted ${totalDeleted} historical records.` };
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

        const referredUsers = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                name: data.name,
                phoneNumber: data.phoneNumber,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                walletBalance: data.walletBalance,
                role: data.role,
                referralCode: data.referralCode,
            } as UserProfile;
        });
        return referredUsers;
    } catch (error) {
        console.error("Error fetching referred users:", error);
        return [];
    }
}
