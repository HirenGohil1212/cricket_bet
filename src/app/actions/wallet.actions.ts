
'use server';

import { 
    collection,
    addDoc, 
    getDocs, 
    doc, 
    runTransaction,
    query, 
    where,
    Timestamp,
    orderBy,
    updateDoc,
    writeBatch,
    increment
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { DepositRequest } from '@/lib/types';

interface CreateDepositRequestParams {
    userId: string;
    userName: string;
    amount: number;
    utrNumber: string;
    screenshotUrl: string;
    screenshotPath: string;
}

// User action to create a deposit request
export async function createDepositRequest({ userId, userName, amount, utrNumber, screenshotUrl, screenshotPath }: CreateDepositRequestParams) {
    if (!userId || !userName) {
        return { error: 'You must be logged in to make a deposit.' };
    }
    if (amount < 100) {
        return { error: 'Minimum deposit amount is INR 100.' };
    }
     if (!screenshotUrl || !screenshotPath) {
        return { error: 'A payment screenshot is required.' };
    }
    if (!utrNumber) {
        return { error: 'UTR/Transaction ID is required.' };
    }

    try {
        await addDoc(collection(db, "deposits"), {
            userId,
            userName,
            amount,
            utrNumber,
            screenshotUrl,
            screenshotPath, // Save the direct path for reliable deletion
            status: 'Processing',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        revalidatePath('/wallet');
        revalidatePath('/admin/deposits');
        return { success: 'Deposit request submitted successfully! It will be reviewed shortly.' };

    } catch (error: any) {
        console.error("Error creating deposit request: ", error);
        return { error: 'An unknown error occurred while submitting your deposit.' };
    }
}

// Function to get all deposit requests for a specific user
export async function getUserDeposits(userId: string): Promise<DepositRequest[]> {
    if (!userId) return [];
    try {
        const depositsCol = collection(db, 'deposits');
        const q = query(depositsCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
            } as DepositRequest;
        });
    } catch (error) {
        console.error("Error fetching user deposits:", error);
        return [];
    }
}

// New function to get the total approved deposit amount for a user
export async function getTotalDepositsForUser(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
        const depositsCol = collection(db, 'deposits');
        const q = query(depositsCol, where('userId', '==', userId), where('status', '==', 'Approved'));
        const querySnapshot = await getDocs(q);
        
        const totalAmount = querySnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        return totalAmount;

    } catch (error) {
        console.error(`Error fetching total deposits for user ${userId}:`, error);
        return 0;
    }
}


// Admin function to get all deposit requests
export async function getAllDeposits(): Promise<DepositRequest[]> {
    try {
        const depositsCol = collection(db, 'deposits');
        const q = query(depositsCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const deposits = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
            } as DepositRequest;
        });

        return deposits;
    } catch (error) {
        console.error("Error fetching all deposits:", error);
        return [];
    }
}

// Admin action to approve a deposit request
export async function approveDeposit(depositId: string, userId: string, amount: number) {
    if (!depositId || !userId || !amount) {
        return { error: "Missing required information for approval." };
    }

    try {
        const depositRef = doc(db, 'deposits', depositId);
        const userRef = doc(db, 'users', userId);
        const summaryRef = doc(db, 'statistics', 'financialSummary');

        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }

            // Update user balance
            const currentBalance = userDoc.data().walletBalance || 0;
            const newBalance = currentBalance + amount;
            transaction.update(userRef, { walletBalance: newBalance });
            
            // Update deposit status
            transaction.update(depositRef, { 
                status: 'Approved',
                updatedAt: Timestamp.now(),
                amount: amount // Update amount if admin changed it
            });

            // Update all-time financial summary
            transaction.update(summaryRef, {
                totalDeposits: increment(amount)
            });
        });

        revalidatePath('/admin/deposits');
        revalidatePath('/admin/financial-reports');
        revalidatePath('/admin/dashboard');
        return { success: 'Deposit approved and wallet updated.' };

    } catch (error: any) {
        console.error("Error approving deposit:", error);
        return { error: error.message || "Failed to approve deposit." };
    }
}


// Admin action to reject a deposit request
export async function rejectDeposit(depositId: string) {
     if (!depositId) {
        return { error: "Deposit ID is required." };
    }
    try {
        const depositRef = doc(db, 'deposits', depositId);
        await updateDoc(depositRef, {
            status: 'Rejected',
            updatedAt: Timestamp.now()
        });

        revalidatePath('/admin/deposits');
        return { success: 'Deposit request has been rejected.' };

    } catch (error: any) {
        console.error("Error rejecting deposit:", error);
        return { error: error.message || "Failed to reject deposit." };
    }
}
