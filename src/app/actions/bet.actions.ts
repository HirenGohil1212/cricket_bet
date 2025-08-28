

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
import { getMatchById } from './match.actions';

interface CreateBetParams {
    userId: string;
    matchId: string;
    predictions: Prediction[];
    amount: number;
    betType: 'qna' | 'player';
    isOneSidedBet?: boolean;
}

// Server action to create a new bet and update wallet
export async function createBet({ userId, matchId, predictions, amount, betType, isOneSidedBet = false }: CreateBetParams) {
    if (!userId) {
        return { error: 'You must be logged in to place a bet.' };
    }
    if (!predictions || predictions.length === 0) {
        return { error: 'At least one prediction is required.' };
    }

    try {
        const userRef = doc(db, 'users', userId);
        
        const match = await getMatchById(matchId);
        
        if (!match) {
             return { error: 'Match not found. Please try again.' };
        }
        
        const bettingSettings = match.bettingSettings;
        if (!bettingSettings) {
            return { error: 'Betting is not configured for this match. Please contact support.' };
        }

        let sportBetOptions;
        if (match.sport === 'Cricket') {
            if (betType === 'player') {
                sportBetOptions = bettingSettings.betOptions.Cricket.player;
            } else if (isOneSidedBet) {
                sportBetOptions = bettingSettings.betOptions.Cricket.oneSided;
            } else {
                sportBetOptions = bettingSettings.betOptions.Cricket.general;
            }
        } else {
             // For non-cricket sports, player bets use the general options
             sportBetOptions = bettingSettings.betOptions[match.sport];
        }

        const selectedOption = sportBetOptions.find(opt => opt.amount === amount);

        if (!selectedOption) {
            return { error: 'The selected bet amount is not valid for this type of bet. Please refresh and try again.' };
        }
        
        const potentialWin = selectedOption.payout;
        
        const result = await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw new Error("User document not found.");
            }
            
            const userData = userDoc.data();
            
            const wasFirstBet = userData.isFirstBetPlaced === false;

            const currentBalance = userData.walletBalance;
            if (currentBalance < amount) {
                throw new Error("Insufficient wallet balance.");
            }

            const newBalance = currentBalance - amount;
            
            const userUpdateData: { walletBalance: number; isFirstBetPlaced?: boolean } = {
                walletBalance: newBalance,
            };
            if (wasFirstBet) {
                userUpdateData.isFirstBetPlaced = true;
            }
            transaction.update(userRef, userUpdateData);
            
            const matchDescription = `${match.teamA.name} vs ${match.teamB.name}`;

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
                betType,
            });
            
            return { shouldCheckReferral: true, referredBy: userData.referredBy };
        });

        if (result.shouldCheckReferral && result.referredBy) {
            await processReferral(userId, result.referredBy);
        }

        revalidatePath('/');
        revalidatePath('/wallet');
        revalidatePath('/game-history');
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
                betType: data.betType || 'qna',
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

// New function to get the total amount a user has spent on bets.
export async function getTotalBetAmountForUser(userId: string): Promise<number> {
  if (!userId) {
    return 0;
  }
  try {
    const betsCol = collection(db, 'bets');
    const q = query(betsCol, where('userId', '==', userId));
    const betSnapshot = await getDocs(q);

    if (betSnapshot.empty) {
      return 0;
    }

    const totalAmount = betSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    return totalAmount;
  } catch (error) {
    console.error(`Error fetching total bet amount for user ${userId}:`, error);
    return 0;
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
