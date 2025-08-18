
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { BankAccount, BettingSettings, Sport, AppSettings } from '@/lib/types';
import { bettingSettingsSchema, type BettingSettingsFormValues, appSettingsSchema, type AppSettingsFormValues } from '@/lib/schemas';
import { sports } from '@/lib/data';
import { deleteFileByPath } from '@/lib/storage';


// --- App Settings ---

// Function to get existing app settings
export async function getAppSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
        whatsappNumber: '',
    };
    try {
        const docRef = doc(db, 'adminSettings', 'app');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { ...defaultSettings, ...docSnap.data() } as AppSettings;
        }
        return defaultSettings;
    } catch (error) {
        console.error("Error fetching app settings:", error);
        return defaultSettings;
    }
}

// Server action to update app settings
export async function updateAppSettings(data: AppSettingsFormValues) {
    const validatedFields = appSettingsSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid data provided.' };
    }

    try {
        const docRef = doc(db, 'adminSettings', 'app');
        await setDoc(docRef, validatedFields.data, { merge: true });
        
        revalidatePath('/admin/settings');
        revalidatePath('/'); // Revalidate home page to update support button
        return { success: 'App settings updated successfully!' };

    } catch (error: any) {
        console.error("Error updating app settings: ", error);
        return { error: 'Failed to update settings.' };
    }
}


// --- Bank Details ---

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
        // Get the current accounts to compare and find deletions
        const currentAccounts = await getBankDetails();
        const newAccountIds = new Set(accounts.map(acc => acc.id));

        // Find accounts that are in the current list but not in the new list
        const accountsToDelete = currentAccounts.filter(acc => acc.id && !newAccountIds.has(acc.id));

        // Delete the QR code from storage for each deleted account
        for (const account of accountsToDelete) {
            if (account.qrCodePath) {
                try {
                    await deleteFileByPath(account.qrCodePath);
                } catch (storageError) {
                    // Log the error but don't block the Firestore update.
                    // The QR code might have been manually deleted, which is okay.
                    console.error(`Could not delete QR code for account ${account.id}. Path: ${account.qrCodePath}`, storageError);
                }
            }
        }
        
        // Save the new list of accounts
        await setDoc(docRef, { accounts });
        
        revalidatePath('/admin/bank-details');
        return { success: 'Bank details updated successfully!' };

    } catch (error: any) {
        console.error("Error updating bank details: ", error);
        return { error: 'An unknown error occurred while updating bank details.' };
    }
}


// --- Betting Settings ---

// Function to get betting settings
export async function getBettingSettings(): Promise<BettingSettings> {
    const defaultBetOptions = [
        { amount: 9, payout: 18 },
        { amount: 19, payout: 40 },
        { amount: 29, payout: 60 },
    ];
    
    // Ensure the default structure includes all sports defined in `lib/data`
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
             const dataFromDb = docSnap.data() as BettingSettings;
             
             // Merge DB data with defaults to ensure all sports are present
             const finalSettings: BettingSettings = {
                 betOptions: sports.reduce((acc, sport) => {
                     // Use data from DB if available, otherwise fall back to default
                     acc[sport] = dataFromDb.betOptions[sport] && dataFromDb.betOptions[sport].length > 0 
                                  ? dataFromDb.betOptions[sport]
                                  : [...defaultBetOptions];
                     return acc;
                 }, {} as Record<Sport, typeof defaultBetOptions>)
             };

             return finalSettings;
        }
        // Return default settings if document doesn't exist or is malformed
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
      // Create a detailed error message from Zod issues
      const errorDetails = validatedFields.error.issues.map(issue => `${issue.path.join('.')} - ${issue.message}`).join(', ');
      return { error: `Invalid data provided: ${errorDetails}` };
    }

    try {
        const docRef = doc(db, 'adminSettings', 'betting');
        // The data is already in the correct format { betOptions: { ... } }
        await setDoc(docRef, validatedFields.data);
        
        // Revalidate paths where these settings are used
        revalidatePath('/admin/betting-settings');
        revalidatePath('/'); // Home page uses betting settings
        
        return { success: 'Betting settings updated successfully!' };

    } catch (error: any) {
        console.error("Error updating betting settings: ", error);
        return { error: 'Failed to update settings.' };
    }
}
