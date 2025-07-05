
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { BankAccount, BettingSettings } from '@/lib/types';
import { bankDetailsFormSchema, type BankDetailsFormValues, bettingSettingsSchema, type BettingSettingsFormValues } from '@/lib/schemas';

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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

    const docRef = doc(db, 'adminSettings', 'paymentDetails');

    try {
        const finalAccounts: BankAccount[] = [];

        for (const submittedAccount of validatedFields.data.accounts) {
            let qrCodeUrl = submittedAccount.qrCodeUrl || '';

            if (submittedAccount.qrCodeDataUri) {
                const matches = submittedAccount.qrCodeDataUri.match(/^data:(.+);base64,(.*)$/);
                if (!matches || matches.length !== 3) {
                    return { error: `Invalid QR code image format for account ${submittedAccount.accountNumber}.` };
                }
                const mimeType = matches[1];
                const base64Data = matches[2];
                if (!ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
                    return { error: `Invalid QR code file type for account ${submittedAccount.accountNumber}.` };
                }

                const newPath = `qrcodes/${submittedAccount.id || uuidv4()}`;
                const storageRef = ref(storage, newPath);
                await uploadString(storageRef, base64Data, 'base64', { contentType: mimeType });
                qrCodeUrl = await getDownloadURL(storageRef);
            }

            finalAccounts.push({
                id: submittedAccount.id,
                upiId: submittedAccount.upiId,
                accountHolderName: submittedAccount.accountHolderName,
                accountNumber: submittedAccount.accountNumber,
                ifscCode: submittedAccount.ifscCode,
                qrCodeUrl: qrCodeUrl,
            });
        }

        await setDoc(docRef, { accounts: finalAccounts });
        
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
