

'use server';

import { doc, getDoc, updateDoc, collection, writeBatch, query, where, getDocs, Timestamp, WriteBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserBankAccount } from '@/lib/types';
import { userBankAccountSchema, type UserBankAccountFormValues } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

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
export async function deleteUserDataHistory({ startDate, endDate }: { startDate: Date; endDate: Date }) {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userIds = usersSnapshot.docs.map(doc => doc.id);

    let totalDeleted = 0;

    const collectionsToDelete = ['bets', 'deposits', 'withdrawals'];

    for (const collectionName of collectionsToDelete) {
      // Firebase queries on `in` array have a limit of 30 items. Batch the userIds.
      for (let i = 0; i < userIds.length; i += 30) {
        const userIdChunk = userIds.slice(i, i + 30);
        
        const q = query(
          collection(db, collectionName),
          where('userId', 'in', userIdChunk),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          where('timestamp', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            // Firestore batch writes have a limit of 500 operations.
            let batch: WriteBatch = writeBatch(db);
            let operationCount = 0;

            snapshot.docs.forEach((doc, index) => {
                batch.delete(doc.ref);
                operationCount++;
                totalDeleted++;

                if (operationCount === 499) {
                    batch.commit();
                    batch = writeBatch(db);
                    operationCount = 0;
                }
            });

            if (operationCount > 0) {
                await batch.commit();
            }
        }
      }
    }
    
    return { success: `Successfully deleted ${totalDeleted} historical records.` };
  } catch (error: any) {
    console.error("Error deleting user data history: ", error);
    return { error: 'Failed to delete user data history.' };
  }
}
