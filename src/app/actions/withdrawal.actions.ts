
'use server';

import { 
    collection,
    addDoc, 
    getDocs, 
    doc, 
    runTransaction,
    query, 
    Timestamp,
    orderBy,
    updateDoc,
    getDoc,
    increment
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { WithdrawalRequest } from '@/lib/types';


// User action to create a withdrawal request
export async function createWithdrawalRequest({ userId, userName, amount }: { userId: string, userName: string, amount: number }) {
    if (!userId) {
        return { error: 'You must be logged in.' };
    }

    try {
        const userRef = doc(db, 'users', userId);
        
        // Use a transaction to ensure balance and bank details are read consistently
        const { success, error } = await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }

            const userData = userDoc.data();
            const currentBalance = userData.walletBalance || 0;
            const bankAccount = userData.bankAccount;

            if (amount > currentBalance) {
                throw new Error("Insufficient wallet balance.");
            }

            if (!bankAccount) {
                throw new Error("You must add your bank details in your profile before making a withdrawal request.");
            }
             if (amount < 100) {
                throw new Error("Minimum withdrawal amount is INR 100.");
            }

            await addDoc(collection(db, "withdrawals"), {
                userId,
                userName,
                amount,
                userBankAccount: bankAccount, // Copy bank details for historical record
                status: 'Processing',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            return { success: true };
        });

        if (error) {
            return { error };
        }
        
        revalidatePath('/wallet');
        revalidatePath('/admin/withdrawals');
        return { success: 'Withdrawal request submitted successfully!' };

    } catch (err: any) {
        console.error("Error creating withdrawal request: ", err);
        return { error: err.message || 'Failed to submit withdrawal request.' };
    }
}

// Admin function to get all withdrawal requests
export async function getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
        const withdrawalsCol = collection(db, 'withdrawals');
        const q = query(withdrawalsCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
            } as WithdrawalRequest;
        });
    } catch (error) {
        console.error("Error fetching all withdrawals:", error);
        return [];
    }
}


// Admin action to approve a withdrawal request
export async function approveWithdrawal(withdrawalId: string, userId: string, amount: number) {
    if (!withdrawalId || !userId || !amount) {
        return { error: "Missing required information for approval." };
    }

    try {
        const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
        const userRef = doc(db, 'users', userId);
        const summaryRef = doc(db, 'statistics', 'financialSummary');

        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }

            // Update user balance
            const currentBalance = userDoc.data().walletBalance || 0;
            if (currentBalance < amount) {
                throw new Error("User has insufficient funds for this withdrawal.");
            }
            const newBalance = currentBalance - amount;
            transaction.update(userRef, { walletBalance: newBalance });

            // Update withdrawal status
            transaction.update(withdrawalRef, { 
                status: 'Approved',
                updatedAt: Timestamp.now(),
            });

            // Update all-time financial summary
            transaction.update(summaryRef, {
                totalWithdrawals: increment(amount)
            });
        });

        revalidatePath('/admin/withdrawals');
        revalidatePath('/admin/financial-reports');
        revalidatePath('/admin/dashboard');
        return { success: 'Withdrawal approved and wallet updated.' };

    } catch (error: any) {
        console.error("Error approving withdrawal:", error);
        return { error: error.message || "Failed to approve withdrawal." };
    }
}


// Admin action to reject a withdrawal request
export async function rejectWithdrawal(withdrawalId: string) {
     if (!withdrawalId) {
        return { error: "Withdrawal ID is required." };
    }
    try {
        const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
        await updateDoc(withdrawalRef, {
            status: 'Rejected',
            updatedAt: Timestamp.now()
        });

        revalidatePath('/admin/withdrawals');
        return { success: 'Withdrawal request has been rejected.' };

    } catch (error: any) {
        console.error("Error rejecting withdrawal:", error);
        return { error: error.message || "Failed to reject withdrawal." };
    }
}
