
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { BankAccount, BettingSettings } from '@/lib/types';
import { bankDetailsFormSchema, bettingSettingsSchema, type BankDetailsFormValues, type BettingSettingsFormValues } from '@/lib/schemas';


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


// Function to get betting settings
export async function getBettingSettings(): Promise<BettingSettings> {
    try {
        const docRef = doc(db, 'adminSettings', 'betting');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().betOptions) {
            return docSnap.data() as BettingSettings;
        }
        // Return default settings if not found or if the structure is old
        return { 
            betOptions: [
                { amount: 9, payout: 18 },
                { amount: 19, payout: 40 },
                { amount: 29, payout: 60 },
            ]
        };
    } catch (error) {
        console.error("Error fetching betting settings:", error);
         // Default on error
        return { 
            betOptions: [
                { amount: 9, payout: 18 },
                { amount: 19, payout: 40 },
                { amount: 29, payout: 60 },
            ]
        };
    }
}

// Server action to update betting settings
export async function updateBettingSettings(data: BettingSettingsFormValues) {
    const validatedFields = bettingSettingsSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid data provided.' };
    }

    try {
        const docRef = doc(db, 'adminSettings', 'betting');
        await setDoc(docRef, validatedFields.data, { merge: true });
        
        revalidatePath('/admin/betting-settings');
        revalidatePath('/');
        return { success: 'Betting settings updated successfully!' };

    } catch (error: any) {
        console.error("Error updating betting settings: ", error);
        return { error: 'Failed to update settings.' };
    }
}
