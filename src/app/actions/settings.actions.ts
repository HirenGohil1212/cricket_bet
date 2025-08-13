
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { BankAccount, BettingSettings } from '@/lib/types';
import { bettingSettingsSchema, type BettingSettingsFormValues } from '@/lib/schemas';
import { sports } from '@/lib/data';


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
    const defaultBetOptions = [
        { amount: 9, payout: 18 },
        { amount: 19, payout: 40 },
        { amount: 29, payout: 60 },
    ];
    
    const defaultSettings: BettingSettings = {
        betOptions: sports.reduce((acc, sport) => {
            acc[sport] = [...defaultBetOptions];
            return acc;
        }, {} as Record<Sport, typeof defaultBetOptions>)
    };

    try {
        const docRef = doc(db, 'adminSettings', 'betting');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().betOptions) {
             const data = docSnap.data() as BettingSettings;
             // Ensure all sports have settings, if not, populate with default
             let allSportsHaveSettings = true;
             for (const sport of sports) {
                if (!data.betOptions[sport]) {
                    allSportsHaveSettings = false;
                    data.betOptions[sport] = [...defaultBetOptions];
                }
             }
             if (!allSportsHaveSettings) {
                // If we had to add a default, we should probably save it back
                await setDoc(docRef, data, { merge: true });
             }
             return data;
        }
        // Return default settings if not found or if the structure is old/incomplete
        return defaultSettings;
    } catch (error) {
        console.error("Error fetching betting settings:", error);
         // Default on error
        return defaultSettings;
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
        await setDoc(docRef, { betOptions: validatedFields.data.betOptions });
        
        revalidatePath('/admin/betting-settings');
        revalidatePath('/');
        return { success: 'Betting settings updated successfully!' };

    } catch (error: any) {
        console.error("Error updating betting settings: ", error);
        return { error: 'Failed to update settings.' };
    }
}
