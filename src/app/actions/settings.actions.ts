

'use server';

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { BankAccount, BettingSettings, Sport, AppSettings } from '@/lib/types';
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


// Server action to update bank details, including deletions.
export async function updateBankDetails(newAccounts: BankAccount[]) {
    if (!Array.isArray(newAccounts)) {
      return { error: 'Invalid data provided.' };
    }
    
    const docRef = doc(db, 'adminSettings', 'paymentDetails');

    try {
        // 1. Get the current state from the database to compare against
        const currentAccounts = await getBankDetails();
        const currentAccountMap = new Map(currentAccounts.map(acc => [acc.id, acc]));

        const accountsWithUploads = await Promise.all(newAccounts.map(async (account) => {
            let qrCodeUrl = account.qrCodeUrl || '';
            let qrCodePath = account.qrCodePath || '';
            const originalAccount = currentAccountMap.get(account.id!);

            // A file is present in the form state for this account.
            if (account.qrCodeFile instanceof File) {
                // If there was an old file for this account, delete it first
                if (originalAccount?.qrCodePath) {
                    await deleteFileByPath(originalAccount.qrCodePath);
                }
                const uploadResult = await uploadFile(account.qrCodeFile, 'qrcodes');
                qrCodeUrl = uploadResult.downloadUrl;
                qrCodePath = uploadResult.storagePath;
            } else if (originalAccount) {
                // No new file, so retain the old path and URL.
                qrCodeUrl = originalAccount.qrCodeUrl;
                qrCodePath = originalAccount.qrCodePath || '';
            }

            return {
                id: account.id || uuidv4(), // Ensure new accounts get an ID
                upiId: account.upiId,
                accountHolderName: account.accountHolderName,
                accountNumber: account.accountNumber,
                ifscCode: account.ifscCode,
                qrCodeUrl,
                qrCodePath,
            };
        }));
        
        // Identify and delete QR codes for accounts that were fully removed
        const newAccountIds = new Set(accountsWithUploads.map(acc => acc.id));
        for (const [id, account] of currentAccountMap.entries()) {
            if (!newAccountIds.has(id)) {
                // This account was deleted
                if (account.qrCodePath) {
                    await deleteFileByPath(account.qrCodePath);
                }
            }
        }
        
        // 3. Save the new state
        await setDoc(docRef, { accounts: accountsWithUploads });
        
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
