
'use server';

import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    writeBatch,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { ReferralSettings, ReferralSettingsFormValues, Transaction } from '@/lib/types';
import { referralSettingsSchema } from '@/lib/schemas';

// --- Admin Actions ---

// Function to get referral settings
export async function getReferralSettings(): Promise<ReferralSettings> {
    try {
        const docRef = doc(db, 'adminSettings', 'referral');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as ReferralSettings;
        }
        // Return default settings if not found
        return { isEnabled: false, referrerBonus: 100, referredUserBonus: 50 };
    } catch (error) {
        console.error("Error fetching referral settings:", error);
        return { isEnabled: false, referrerBonus: 0, referredUserBonus: 0 };
    }
}

// Server action to update referral settings
export async function updateReferralSettings(data: ReferralSettingsFormValues) {
    const validatedFields = referralSettingsSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid data provided.' };
    }

    try {
        const docRef = doc(db, 'adminSettings', 'referral');
        await setDoc(docRef, validatedFields.data, { merge: true });
        
        revalidatePath('/admin/referrals');
        return { success: 'Referral settings updated successfully!' };

    } catch (error: any) {
        console.error("Error updating referral settings: ", error);
        return { error: 'Failed to update settings.' };
    }
}

// --- Payout Logic ---

export async function processReferral(newUserId: string, referrerId: string) {
    try {
        // 1. Get referral settings
        const settings = await getReferralSettings();
        if (!settings.isEnabled || (settings.referrerBonus === 0 && settings.referredUserBonus === 0)) {
            return; // Referrals disabled or no bonus to give
        }
        
        // 2. Check if referral bonus was already awarded
        const newUserRef = doc(db, 'users', newUserId);
        const newUserDoc = await getDoc(newUserRef);
        if (!newUserDoc.exists() || newUserDoc.data()?.referralBonusAwarded) {
            return; // Already processed or user not found
        }

        // 3. Check for at least one completed deposit
        const depositsRef = collection(db, 'deposits');
        const depositQuery = query(depositsRef, where('userId', '==', newUserId), where('status', '==', 'Completed'));
        const depositSnapshot = await getDocs(depositQuery);
        if (depositSnapshot.empty) {
            return; // No completed deposit yet, so not a successful referral
        }

        // 4. Perform transaction to award bonuses and log everything
        const referrerRef = doc(db, 'users', referrerId);
        const batch = writeBatch(db);

        // Update referrer's balance
        const referrerDoc = await getDoc(referrerRef);
        if(referrerDoc.exists()) {
            const referrerBalance = referrerDoc.data().walletBalance || 0;
            batch.update(referrerRef, { walletBalance: referrerBalance + settings.referrerBonus });

            // Log transaction for referrer
            const referrerTransactionRef = doc(collection(db, 'transactions'));
            batch.set(referrerTransactionRef, {
                userId: referrerId,
                amount: settings.referrerBonus,
                type: 'referral_bonus',
                description: `Bonus for referring ${newUserDoc.data()?.name || 'a new user'}.`,
                timestamp: Timestamp.now(),
            });
        }
        
        // Update new user's balance
        const newUserBalance = newUserDoc.data()?.walletBalance || 0;
        batch.update(newUserRef, { 
            walletBalance: newUserBalance + settings.referredUserBonus,
            referralBonusAwarded: true // Mark as awarded
        });

        // Log transaction for new user
        const newUserTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newUserTransactionRef, {
            userId: newUserId,
            amount: settings.referredUserBonus,
            type: 'referral_bonus',
            description: 'Welcome bonus for using a referral code.',
            timestamp: Timestamp.now(),
        });
        
        // Log the successful referral itself for admin tracking
        const referralLogRef = doc(collection(db, 'referrals'));
        batch.set(referralLogRef, {
            referrerId,
            referrerName: referrerDoc.data()?.name || 'Unknown',
            referredUserId: newUserId,
            referredUserName: newUserDoc.data()?.name || 'Unknown',
            referrerBonus: settings.referrerBonus,
            referredUserBonus: settings.referredUserBonus,
            completedAt: Timestamp.now()
        });
        
        await batch.commit();

    } catch (error) {
        console.error("Error processing referral: ", error);
        // Fail silently in the background, but log the error.
    }
}

// --- History Actions ---
export async function getBonusTransactions(userId: string): Promise<Transaction[]> {
  if (!userId) return [];
  try {
    const transCol = collection(db, 'transactions');
    const q = query(
      transCol,
      where('userId', '==', userId),
      where('type', '==', 'referral_bonus'),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      } as Transaction;
    });
  } catch (error) {
    console.error("Error fetching bonus transactions:", error);
    return [];
  }
}
