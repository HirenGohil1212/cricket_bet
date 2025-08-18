

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

// ** NEW, RELIABLE HELPER FUNCTION **
// This function correctly extracts the file path from the full download URL.
function getPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.pathname.includes('/o/')) {
        return null; // Not a standard Firebase Storage URL
    }
    // The path is after '/o/' and before '?alt=media'
    const path = urlObj.pathname.split('/o/')[1];
    if (!path) {
      return null;
    }
    // URL-decode the path to handle characters like %2F (for /)
    return decodeURIComponent(path);
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
                const batch = writeBatch(db);

                for (const docSnapshot of snapshot.docs) {
                     if (collectionName === 'deposits') {
                        const data = docSnapshot.data();
                        let storagePath: string | null = null;

                        // ** NEW ROBUST LOGIC **
                        // 1. Prioritize the direct screenshotPath if it exists (for new data).
                        if (data.screenshotPath) {
                            storagePath = data.screenshotPath;
                        // 2. If not, fall back to parsing the URL (for old data).
                        } else if (data.screenshotUrl) {
                            storagePath = getPathFromUrl(data.screenshotUrl);
                        }
                        
                        // If we have a path, attempt to delete the file from storage first.
                        if (storagePath) {
                            try {
                                await deleteFileByPath(storagePath);
                            } catch (storageError) {
                                console.error(`Failed to delete storage file for deposit ${docSnapshot.id}. Path: ${storagePath}`, storageError);
                                // Optional: Decide if you want to stop the whole process if one file fails.
                                // For now, we log the error and continue deleting the database record.
                            }
                        }
                    }
                    // Add the database document deletion to the batch.
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
