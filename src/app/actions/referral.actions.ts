
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
    orderBy,
    runTransaction,
    increment
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { ReferralSettings, ReferralSettingsFormValues, Transaction, Referral } from '@/lib/types';
import { referralSettingsSchema } from '@/lib/schemas';
import { getTotalDepositsForUser } from './wallet.actions';

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


// --- Award Signup Bonus to New User ---

// This function is now called directly from the signup page.
export async function awardSignupBonus(newUserId: string) {
    if (!newUserId) return;

    try {
        const settings = await getReferralSettings();
        if (!settings.isEnabled || settings.referredUserBonus === 0) {
            return; // Referrals disabled or no signup bonus to give
        }

        const newUserRef = doc(db, 'users', newUserId);
        
        await runTransaction(db, async (transaction) => {
            const newUserDoc = await transaction.get(newUserRef);
            if (!newUserDoc.exists()) {
                // The user document might not be committed yet when this is called from signup.
                // We will add the bonus directly to the user object before setting it.
                // This transaction will just log the bonus.
            }

            // Update new user's balance and log transaction
            transaction.update(newUserRef, { 
                walletBalance: increment(settings.referredUserBonus)
            });

            const newUserTransactionRef = doc(collection(db, 'transactions'));
            transaction.set(newUserTransactionRef, {
                userId: newUserId,
                amount: settings.referredUserBonus,
                type: 'referral_bonus',
                description: 'Welcome bonus for using a referral code.',
                timestamp: Timestamp.now(),
            });
        });

    } catch (error) {
        console.error(`Error awarding signup bonus to ${newUserId}:`, error);
        // Fail silently to not disrupt the signup flow
    }
}


// --- Payout Logic for the Referrer ---

// This function is called from the createBet action when a referred user places a bet.
export async function processReferral(newUserId: string, referrerId: string) {
    try {
        const settings = await getReferralSettings();
        if (!settings.isEnabled || settings.referrerBonus === 0) {
            return;
        }

        const newUserRef = doc(db, 'users', newUserId);
        const newUserDoc = await getDoc(newUserRef);
        if (!newUserDoc.exists() || newUserDoc.data()?.referralBonusAwarded) {
            return; // Already processed or user not found.
        }

        // Find the pending referral document
        const referralsRef = collection(db, 'referrals');
        const q = query(referralsRef, 
            where('referredUserId', '==', newUserId), 
            where('referrerId', '==', referrerId),
            where('status', '==', 'pending')
        );
        const referralSnapshot = await getDocs(q);

        if (referralSnapshot.empty) {
            return; // No pending referral found for this pair.
        }
        const referralDoc = referralSnapshot.docs[0];

        const betsQuery = query(collection(db, 'bets'), where('userId', '==', newUserId));
        const betsSnapshot = await getDocs(betsQuery);
        const totalWagered = betsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        
        const totalDeposited = await getTotalDepositsForUser(newUserId);
        if (totalDeposited === 0) {
            return; // User has not made their first deposit yet.
        }
        
        const conditionMet = totalWagered >= (totalDeposited + settings.referredUserBonus);
        if (!conditionMet) {
            return;
        }
        
        const referrerRef = doc(db, 'users', referrerId);
        const batch = writeBatch(db);

        const referrerDoc = await getDoc(referrerRef);
        if(referrerDoc.exists()) {
            batch.update(referrerRef, { walletBalance: increment(settings.referrerBonus) });

            const referrerTransactionRef = doc(collection(db, 'transactions'));
            batch.set(referrerTransactionRef, {
                userId: referrerId,
                amount: settings.referrerBonus,
                type: 'referral_bonus',
                description: `Bonus for referring ${newUserDoc.data()?.name || 'a new user'}.`,
                timestamp: Timestamp.now(),
            });
        }
        
        batch.update(newUserRef, { referralBonusAwarded: true });
        
        // Update the referral document to 'completed'
        batch.update(referralDoc.ref, {
            status: 'completed',
            completedAt: Timestamp.now()
        });

        await batch.commit();

    } catch (error) {
        console.error("Error processing referral for referrer: ", error);
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

// New function to get pending referrals for a user
export async function getPendingReferrals(userId: string): Promise<Referral[]> {
  if (!userId) return [];
  try {
    const referralsCol = collection(db, 'referrals');
    const q = query(
      referralsCol,
      where('referrerId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as Referral;
    });
  } catch (error) {
    console.error("Error fetching pending referrals:", error);
    return [];
  }
}
