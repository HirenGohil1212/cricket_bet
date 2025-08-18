

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

/**
 * Extracts the storage path from a Firebase Storage URL.
 * E.g., "https://.../o/deposits%2Fimage.png?alt=media..." -> "deposits/image.png"
 */
function getPathFromUrl(url: string): string | null {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        const pathName = urlObj.pathname;
        
        // Find the path part starting after /o/
        const pathStartIndex = pathName.indexOf('/o/');
        if (pathStartIndex === -1) return null;

        // The encoded path is the part after /o/
        const encodedPath = pathName.substring(pathStartIndex + 3);
        
        // Decode the path to handle special characters like %2F for /
        return decodeURIComponent(encodedPath);
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
            if (snapshot.empty) continue;

            const batch = writeBatch(db);

            for (const docSnapshot of snapshot.docs) {
                if (collectionName === 'deposits') {
                    const data = docSnapshot.data();
                    try {
                        // Prioritize the direct path if it exists
                        let pathToDelete = data.screenshotPath;
                        
                        // If not, fall back to extracting it from the URL
                        if (!pathToDelete && data.screenshotUrl) {
                            pathToDelete = getPathFromUrl(data.screenshotUrl);
                        }

                        if (pathToDelete) {
                            await deleteFileByPath(pathToDelete);
                        }
                    } catch (storageError) {
                        console.error(`Could not delete storage file for deposit ${docSnapshot.id}, but will still delete Firestore record.`, storageError);
                    }
                }
                
                // Add the Firestore document deletion to the batch
                batch.delete(docSnapshot.ref);
                totalDeleted++;
            }
            
            // Commit the batched Firestore deletions
            await batch.commit();
        }
        
        revalidatePath('/admin/data-management');
        return { success: `Successfully deleted ${totalDeleted} historical records.` };
    } catch (error: any) {
        console.error("Error deleting data history: ", error);
        return { error: 'Failed to delete data history. Check server logs for details.' };
    }
}
