
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { BankAccount } from '@/lib/types';
import { bankDetailsFormSchema, type BankDetailsFormValues } from '@/lib/schemas';


// Helper function to get a storage path from a full URL
function getPathFromStorageUrl(url: string): string | null {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return null; // Not a Firebase Storage URL that we can delete
  }
  try {
    const urlObject = new URL(url);
    // Pathname is /v0/b/your-bucket.appspot.com/o/path%2Fto%2Ffile.jpg
    const decodedPath = decodeURIComponent(urlObject.pathname);
    // We want to extract 'path/to/file.jpg'
    const pathSegment = '/o/';
    const startIndex = decodedPath.indexOf(pathSegment);
    if (startIndex === -1) return null;
    
    // Extract the path and remove any query parameters
    return decodedPath.substring(startIndex + pathSegment.length).split('?')[0]; 
  } catch (error) {
    console.error("Could not parse storage URL:", error, "URL:", url);
    return null;
  }
}

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
                // First, delete the old QR code if it exists
                if (account.qrCodeUrl) {
                    const pathToDelete = getPathFromStorageUrl(account.qrCodeUrl);
                    if (pathToDelete) {
                        try {
                            const oldFileRef = ref(storage, pathToDelete);
                            await deleteObject(oldFileRef);
                        } catch (e: any) {
                            // If the object doesn't exist, we don't need to throw an error.
                            if (e.code !== 'storage/object-not-found') {
                                console.error("Could not delete old QR Code:", e);
                            }
                        }
                    }
                }
                
                // Now, upload the new QR code
                const storageRef = ref(storage, `qrcodes/${uuidv4()}`);
                const mimeType = account.qrCodeDataUri.match(/data:(.*);base64,/)?.[1];
                const base64Data = account.qrCodeDataUri.split(',')[1];
                const imageBuffer = Buffer.from(base64Data, 'base64');
                await uploadBytes(storageRef, imageBuffer, { contentType: mimeType });
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
