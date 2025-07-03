
'use server';

import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    runTransaction,
    query, 
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Bet, Prediction } from '@/lib/types';
import { processReferral } from './referral.actions';
import { getBettingSettings } from './settings.actions';

interface CreateBetParams {
    userId: string;
    matchId: string;
    predictions: Prediction[];
    amount: number;
}

// Server action to create a new bet and update wallet
export async function createBet({ userId, matchId, predictions, amount }: CreateBetParams) {
    if (!userId) {
        return { error: 'You must be logged in to place a bet.' };
    }
    if (!predictions || predictions.length === 0) {
        return { error: 'At least one prediction is required.' };
    }

    try {
        const userRef = doc(db, 'users', userId);
        const matchRef = doc(db, 'matches', matchId);
        
        // Get the current betting options
        const bettingSettings = await getBettingSettings();
        const selectedOption = bettingSettings.betOptions.find(opt => opt.amount === amount);

        if (!selectedOption) {
            return { error: 'The selected bet amount is not valid. Please refresh and try again.' };
        }
        
        const potentialWin = selectedOption.payout;
        
        const result = await runTransaction(db, async (transaction) => {
            // All reads must come before writes in a transaction
            const userDoc = await transaction.get(userRef);
            const matchDoc = await transaction.get(matchRef);

            if (!userDoc.exists()) {
                throw new Error("User document not found.");
            }
            if (!matchDoc.exists()) {
                throw new Error("Match document not found.");
            }
            
            const userData = userDoc.data();
            const isFirstBet = userData.isFirstBetPlaced === false;

            const currentBalance = userData.walletBalance;
            if (currentBalance < amount) {
                throw new Error("Insufficient wallet balance.");
            }

            // All writes must come after reads
            const newBalance = currentBalance - amount;
            transaction.update(userRef, { 
                walletBalance: newBalance,
                ...(isFirstBet && { isFirstBetPlaced: true })
            });
            
            const matchData = matchDoc.data();
            const matchDescription = `${matchData.teamA.name} vs ${matchData.teamB.name}`;

            const newBetRef = doc(collection(db, "bets"));
            transaction.set(newBetRef, {
                userId,
                matchId,
                matchDescription,
                predictions,
                amount,
                status: 'Pending',
                timestamp: Timestamp.now(),
                potentialWin,
            });
            
            // Return data to be used outside the transaction
            return { isFirstBet, referredBy: userData.referredBy };
        });

        // After the transaction is successful, check if a referral needs to be processed
        if (result.isFirstBet && result.referredBy) {
            await processReferral(userId, result.referredBy);
        }

        revalidatePath('/');
        revalidatePath('/wallet');
        return { success: 'Bet placed successfully!' };

    } catch (error: any) {
        console.error("Error creating bet: ", error);
        return { error: error.message || 'Failed to place bet.' };
    }
}

// Function to get all bets for a specific user
export async function getUserBets(userId: string): Promise<Bet[]> {
    if (!userId) {
        return [];
    }
    try {
        const betsCol = collection(db, 'bets');
        const q = query(betsCol, where('userId', '==', userId));
        const betSnapshot = await getDocs(q);

        const betList = betSnapshot.docs.map(doc => {
            const data = doc.data();
            
            return {
                id: doc.id,
                userId: data.userId,
                matchId: data.matchId,
                matchDescription: data.matchDescription,
                amount: data.amount,
                status: data.status,
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
                potentialWin: data.potentialWin,
                predictions: data.predictions || [],
            } as Bet;
        });

        // Sort by timestamp descending to ensure the newest bets are first.
        betList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return betList;
    } catch (error) {
        console.error("Error fetching user bets:", error);
        return [];
    }
}


// New function to get total bet amount for a match
export async function getTotalBetAmountForMatch(matchId: string): Promise<number> {
    if (!matchId) {
        return 0;
    }
    try {
        const betsCol = collection(db, 'bets');
        const q = query(betsCol, where('matchId', '==', matchId));
        const betSnapshot = await getDocs(q);

        if (betSnapshot.empty) {
            return 0;
        }

        const totalAmount = betSnapshot.docs.reduce((sum, doc) => {
            return sum + (doc.data().amount || 0);
        }, 0);

        return totalAmount;

    } catch (error) {
        console.error("Error fetching total bet amount for match:", error);
        return 0;
    }
}
