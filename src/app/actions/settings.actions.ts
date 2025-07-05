
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { BankAccount, BettingSettings } from '@/lib/types';
import { bettingSettingsSchema, type BettingSettingsFormValues } from '@/lib/schemas';


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
export async function updateBankDetails(accounts: BankAccount[]) {
    if (!Array.isArray(accounts)) {
      return { error: 'Invalid data provided.' };
    }

    const docRef = doc(db, 'adminSettings', 'paymentDetails');

    try {
        await setDoc(docRef, { accounts });
        
        revalidatePath('/admin/bank-details');
        return { success: 'Bank details updated successfully!' };

    } catch (error: any) {
        console.error("Error updating bank details: ", error);
        return { error: 'An unknown error occurred while updating bank details.' };
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
