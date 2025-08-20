

'use server';

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { BankAccount, BettingSettings, Sport, AppSettings, BetOption } from '@/lib/types';
import { bettingSettingsSchema, type BettingSettingsFormValues, appSettingsSchema, type AppSettingsFormValues } from '@/lib/schemas';
import { sports } from '@/lib/data';
import { deleteFileByPath } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';


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
            // Ensure every account has a UUID
            return (data.accounts as BankAccount[] || []).map(acc => ({ ...acc, id: acc.id || uuidv4() }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching bank details:", error);
        return [];
    }
}


// Server action to add a new bank account.
export async function addBankAccount(newAccount: BankAccount) {
    if (!newAccount) {
      return { error: 'Invalid data provided.' };
    }
    
    const docRef = doc(db, 'adminSettings', 'paymentDetails');

    try {
        const currentAccounts = await getBankDetails();
        const updatedAccounts = [...currentAccounts, newAccount];
        
        await setDoc(docRef, { accounts: updatedAccounts });
        
        revalidatePath('/admin/bank-details');
        return { success: 'New bank account added successfully!' };

    } catch (error: any) {
        console.error("Error adding bank account: ", error);
        return { error: 'An unknown error occurred while adding the account.' };
    }
}


// Server action to delete a single bank account.
export async function deleteBankAccount(accountId: string) {
    if (!accountId) {
      return { error: 'Account ID is required.' };
    }
    
    const docRef = doc(db, 'adminSettings', 'paymentDetails');

    try {
        const currentAccounts = await getBankDetails();
        const accountToDelete = currentAccounts.find(acc => acc.id === accountId);

        if (!accountToDelete) {
            return { error: 'Account not found.' };
        }

        // Delete the QR code from storage if it exists
        if (accountToDelete.qrCodePath) {
            await deleteFileByPath(accountToDelete.qrCodePath);
        }

        const updatedAccounts = currentAccounts.filter(acc => acc.id !== accountId);

        await setDoc(docRef, { accounts: updatedAccounts });
        
        revalidatePath('/admin/bank-details');
        return { success: 'Bank account deleted successfully!' };

    } catch (error: any) {
        console.error("Error deleting bank account: ", error);
        return { error: 'An unknown error occurred while deleting the account.' };
    }
}


// --- Betting Settings ---

// Function to get betting settings
export async function getBettingSettings(): Promise<BettingSettings> {
    const defaultBetOptions: BetOption[] = [
        { amount: 9, payout: 18 },
        { amount: 19, payout: 40 },
        { amount: 29, payout: 60 },
    ];
    
    // Ensure the default structure includes all sports defined in `lib/data`
    const defaultSettings: BettingSettings = {
        betOptions: {
            // Cricket gets a special structure
            Cricket: {
                general: [...defaultBetOptions],
                oneSided: [...defaultBetOptions],
                player: [...defaultBetOptions],
            },
            // Other sports get the regular array
            ...sports.filter(s => s !== 'Cricket').reduce((acc, sport) => {
                acc[sport] = [...defaultBetOptions];
                return acc;
            }, {} as Record<Exclude<Sport, 'Cricket'>, BetOption[]>)
        }
    };

    try {
        const docRef = doc(db, 'adminSettings', 'betting');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().betOptions) {
             const dataFromDb = docSnap.data() as BettingSettings;
             
             // Merge DB data with defaults to ensure all sports are present
             // and cricket has its required structure
             const finalSettings: BettingSettings = {
                 betOptions: {
                    ...defaultSettings.betOptions, // Start with default structure
                    ...dataFromDb.betOptions, // Overwrite with DB data
                 }
             };
             
             // Ensure cricket substructure is fully present
             if (!finalSettings.betOptions.Cricket.general) {
                 finalSettings.betOptions.Cricket.general = [...defaultBetOptions];
             }
             if (!finalSettings.betOptions.Cricket.oneSided) {
                 finalSettings.betOptions.Cricket.oneSided = [...defaultBetOptions];
             }
             if (!finalSettings.betOptions.Cricket.player) {
                 finalSettings.betOptions.Cricket.player = [...defaultBetOptions];
             }
             
             // Ensure other sports have valid arrays
             sports.forEach(sport => {
                 if (sport !== 'Cricket') {
                     if (!finalSettings.betOptions[sport] || !Array.isArray(finalSettings.betOptions[sport]) || finalSettings.betOptions[sport].length === 0) {
                         finalSettings.betOptions[sport] = [...defaultBetOptions];
                     }
                 }
             })

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
