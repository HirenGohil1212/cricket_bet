
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { BankAccount } from '@/lib/types';
import { bankDetailsFormSchema, type BankDetailsFormValues } from '@/lib/schemas';


// Function to get existing bank details
export async function getBankDetails(): Promise<BankAccount[]> {
    try {
        const docRef = doc(db, 'adminSettings', 'paymentDetails');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return (data.accounts as BankAccount[]) || [];
        }
        return [];
    } catch (error) {
        console.error("Error fetching bank details:", error);
        return [];
    }
}

// Server action to update bank details
export async function updateBankDetails(data: BankDetailsFormValues) {
    
    const validatedFields = bankDetailsFormSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid data provided.' };
    }

    const { accounts } = validatedFields.data;

    try {
        const docRef = doc(db, 'adminSettings', 'paymentDetails');
        const updatedAccounts: BankAccount[] = [];

        for (const account of accounts) {
            let qrCodeUrl = account.qrCodeUrl || '';

            // If a new QR code is uploaded as a data URI, upload it to storage
            if (account.qrCodeDataUri) {
                const storageRef = ref(storage, `qrcodes/${uuidv4()}`);
                const mimeType = account.qrCodeDataUri.match(/data:(.*);base64,/)?.[1];
                
                await uploadString(storageRef, account.qrCodeDataUri.split(',')[1], 'base64', {
                    contentType: mimeType
                });

                qrCodeUrl = await getDownloadURL(storageRef);
            }

            updatedAccounts.push({
                upiId: account.upiId,
                accountHolderName: account.accountHolderName,
                accountNumber: account.accountNumber,
                ifscCode: account.ifscCode,
                qrCodeUrl: qrCodeUrl,
            });
        }

        await setDoc(docRef, { accounts: updatedAccounts }, { merge: true });
        
        revalidatePath('/admin/bank-details');
        return { success: 'Bank details updated successfully!' };

    } catch (error: any) {
        console.error("Error updating bank details: ", error);
        return { error: error.message || 'Failed to update bank details.' };
    }
}
