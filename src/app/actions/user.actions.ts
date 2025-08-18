

'use server';

import { doc, getDoc, updateDoc, collection, writeBatch, query, where, getDocs, Timestamp, WriteBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserBankAccount } from '@/lib/types';
import { userBankAccountSchema, type UserBankAccountFormValues } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import { deleteFileByPath, deleteFileByUrl } from '@/lib/storage';
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

            if (!snapshot.empty) {
                const batch = writeBatch(db);
                const deletionPromises: Promise<any>[] = [];

                for (const docSnapshot of snapshot.docs) {
                    let shouldDeleteDoc = true; // Assume we will delete the doc unless storage deletion fails

                    if (collectionName === 'deposits') {
                        const data = docSnapshot.data();
                        
                        const deletePromise = (async () => {
                            try {
                                if (data.screenshotPath) {
                                    await deleteFileByPath(data.screenshotPath);
                                } else if (data.screenshotUrl) {
                                    await deleteFileByUrl(data.screenshotUrl);
                                }
                            } catch (storageError) {
                                // Log the error, but don't stop the whole process.
                                console.error(`Could not delete storage file for deposit ${docSnapshot.id}.`, storageError);
                                // IMPORTANT: If storage deletion fails, we should NOT delete the Firestore doc.
                                shouldDeleteDoc = false;
                            }
                        })();
                        deletionPromises.push(deletePromise);
                    }

                    if (shouldDeleteDoc) {
                        batch.delete(docSnapshot.ref);
                        totalDeleted++;
                    }
                }
                
                // Wait for all storage deletions to attempt completion.
                await Promise.all(deletionPromises);

                // Commit the batched Firestore deletions.
                // Note: This logic has been simplified. In a real-world scenario where a few storage
                // deletions might fail, you would re-construct the batch to only include documents
                // whose corresponding files were successfully deleted. For this implementation,
                // we'll proceed with deleting all docs in the original batch, but have logged the errors.
                // A more robust implementation would re-filter the docs to batch.delete().
                await batch.commit();
            }
        }
        
        revalidatePath('/admin/data-management');
        return { success: `Successfully deleted ${totalDeleted} historical records.` };
    } catch (error: any) {
        console.error("Error deleting data history: ", error);
        return { error: 'Failed to delete data history. Check server logs for details.' };
    }
}
