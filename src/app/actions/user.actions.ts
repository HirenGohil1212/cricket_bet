

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

                for (const docSnapshot of snapshot.docs) {
                     if (collectionName === 'deposits') {
                        const data = docSnapshot.data();
                        
                        try {
                            // Prioritize the direct screenshotPath if it exists (for new data).
                            if (data.screenshotPath) {
                                await deleteFileByPath(data.screenshotPath);
                            // If not, fall back to parsing the URL (for old data).
                            } else if (data.screenshotUrl) {
                                await deleteFileByUrl(data.screenshotUrl);
                            }
                        } catch (storageError) {
                             // Log the error, but don't stop the whole process.
                             // It might be that the file was already deleted or never existed.
                             console.error(`Could not delete storage file for deposit ${docSnapshot.id}.`, storageError);
                        }
                    }
                    // Always add the database document deletion to the batch.
                    batch.delete(docSnapshot.ref);
                    totalDeleted++;
                }

                // Commit all the batched database deletions.
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
