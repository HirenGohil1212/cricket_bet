

'use server';

import { doc, getDoc, updateDoc, collection, writeBatch, query, where, getDocs, Timestamp, WriteBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserBankAccount } from '@/lib/types';
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
                where(dateField, '>=', finalStartDate),
                where(dateField, '<=', finalEndDate)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                // For deposit records, we need to delete files from storage first.
                if (collectionName === 'deposits') {
                    for (const doc of snapshot.docs) {
                        const data = doc.data();
                        if (data.screenshotPath) {
                            try {
                                await deleteFileByPath(data.screenshotPath);
                            } catch (storageError) {
                                console.error(`Failed to delete storage file ${data.screenshotPath}:`, storageError);
                                // We'll continue even if a single file deletion fails.
                            }
                        }
                    }
                }

                // Now, batch delete the Firestore documents.
                let batch: WriteBatch = writeBatch(db);
                let operationCount = 0;

                for (const doc of snapshot.docs) {
                    batch.delete(doc.ref);
                    operationCount++;
                    totalDeleted++;

                    // Firestore batch writes have a limit of 500 operations.
                    // We commit the batch and start a new one if the limit is reached.
                    if (operationCount === 499) {
                        await batch.commit();
                        batch = writeBatch(db);
                        operationCount = 0;
                    }
                }

                // Commit any remaining operations in the last batch.
                if (operationCount > 0) {
                    await batch.commit();
                }
            }
        }
        
        revalidatePath('/admin/data-management');
        return { success: `Successfully deleted ${totalDeleted} historical records.` };
    } catch (error: any) {
        console.error("Error deleting data history: ", error);
        return { error: 'Failed to delete data history. Check server logs for details.' };
    }
}
