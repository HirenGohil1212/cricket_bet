
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
        // Step 1: Get the current state from the DB before any changes
        const currentAccounts = await getBankDetails();
        const currentAccountMap = new Map(currentAccounts.map(acc => [acc.id, acc]));

        // Step 2: Process new data and file uploads first
        const finalAccounts = await Promise.all(accounts.map(async (account) => {
            // If a new file is present, upload it.
            if (account.qrCodeFile instanceof File) {
                const { uploadFile } = await import('@/lib/storage');
                const { downloadUrl, storagePath } = await uploadFile(account.qrCodeFile, 'qrcodes');
                return { ...account, qrCodeUrl: downloadUrl, qrCodePath: storagePath };
            }
            // Otherwise, return the account as is (it might have an existing URL).
            return account;
        }));

        // Step 3: Compare old and new states to find what needs to be deleted from storage.
        const newAccountIds = new Set(finalAccounts.map(acc => acc.id));

        // Case 1: An entire account was deleted from the UI.
        const accountsToDelete = currentAccounts.filter(acc => acc.id && !newAccountIds.has(acc.id));
        for (const account of accountsToDelete) {
            if (account.qrCodePath) {
                await deleteFileByPath(account.qrCodePath);
            }
        }

        // Case 2: An existing account had its QR code replaced with a new one.
        for (const newAccount of finalAccounts) {
            if (!newAccount.id) continue;
            const oldAccount = currentAccountMap.get(newAccount.id);
            // If an old account existed, had a QR path, and its path is different from the new path (meaning a new file was uploaded), delete the old one.
            if (oldAccount && oldAccount.qrCodePath && newAccount.qrCodePath !== oldAccount.qrCodePath) {
                await deleteFileByPath(oldAccount.qrCodePath);
            }
        }
        
        // Step 4: Save the final, correct list of accounts to Firestore.
        // We need to strip out the 'qrCodeFile' property as it cannot be stored in Firestore.
        const accountsForFirestore = finalAccounts.map(({ qrCodeFile, ...rest }) => rest);
        await setDoc(docRef, { accounts: accountsForFirestore });
        
        revalidatePath('/admin/bank-details');
        return { success: 'Bank details updated successfully!' };

    } catch (error: any) {
        console.error("Error updating bank details: ", error);
        if (error.code && error.code.startsWith('storage/')) {
            return { error: 'A problem occurred with file storage. Please try again.' };
        }
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
