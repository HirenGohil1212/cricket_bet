

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

// ** NEW RELIABLE HELPER **
// This function reliably extracts the storage path from a Firebase Storage URL.
function getPathFromUrl(url: string): string | null {
    try {
        if (!url.startsWith('https://firebasestorage.googleapis.com')) {
            console.warn("URL does not seem to be a Firebase Storage URL:", url);
            return null;
        }
        // Split the URL at the '/o/' part which separates the bucket info from the file path
        const urlParts = url.split('/o/');
        if (urlParts.length < 2) return null;

        // The file path is the part after '/o/' but before the query parameters
        const pathEncoded = urlParts[1].split('?')[0];
        if (!pathEncoded) return null;
        
        // URL Decode the path to handle special characters like '/' (%2F)
        return decodeURIComponent(pathEncoded);
    } catch (error) {
        console.error("Could not parse URL to get storage path:", error);
        return null;
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
                const batches: WriteBatch[] = [];
                let currentBatch = writeBatch(db);
                let operationCount = 0;

                for (const docSnapshot of snapshot.docs) {
                     if (collectionName === 'deposits') {
                        const data = docSnapshot.data();
                        
                        let pathToDelete: string | null = null;
                        
                        // **ROBUST DELETION LOGIC**
                        // 1. Prioritize the direct path if it exists (for new data)
                        if (data.screenshotPath) {
                            pathToDelete = data.screenshotPath;
                        } 
                        // 2. Fallback to parsing the URL for older data
                        else if (data.screenshotUrl) {
                            pathToDelete = getPathFromUrl(data.screenshotUrl);
                        }

                        if (pathToDelete) {
                            try {
                                await deleteFileByPath(pathToDelete);
                            } catch (storageError) {
                                console.error(`Failed to delete storage file for deposit ${docSnapshot.id}. Path: ${pathToDelete}`, storageError);
                            }
                        }
                    }

                    currentBatch.delete(docSnapshot.ref);
                    operationCount++;
                    totalDeleted++;

                    if (operationCount >= 499) {
                        batches.push(currentBatch);
                        currentBatch = writeBatch(db);
                        operationCount = 0;
                    }
                }

                if (operationCount > 0) {
                    batches.push(currentBatch);
                }

                await Promise.all(batches.map(batch => batch.commit()));
            }
        }
        
        revalidatePath('/admin/data-management');
        return { success: `Successfully deleted ${totalDeleted} historical records.` };
    } catch (error: any) {
        console.error("Error deleting data history: ", error);
        return { error: 'Failed to delete data history. Check server logs for details.' };
    }
}
