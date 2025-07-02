
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
import type { Bet } from '@/lib/types';

interface CreateBetParams {
    userId: string;
    matchId: string;
    questionId: string;
    questionText: string;
    predictionA: string;
    predictionB: string;
    amount: number;
}

// Server action to create a new bet and update wallet
export async function createBet({ userId, matchId, questionId, questionText, predictionA, predictionB, amount }: CreateBetParams) {
    if (!userId) {
        return { error: 'You must be logged in to place a bet.' };
    }

    try {
        const userRef = doc(db, 'users', userId);
        const matchRef = doc(db, 'matches', matchId);

        await runTransaction(db, async (transaction) => {
            // All reads must come before writes in a transaction
            const userDoc = await transaction.get(userRef);
            const matchDoc = await transaction.get(matchRef);

            if (!userDoc.exists()) {
                throw new Error("User document not found.");
            }
            if (!matchDoc.exists()) {
                throw new Error("Match document not found.");
            }

            const currentBalance = userDoc.data().walletBalance;
            if (currentBalance < amount) {
                throw new Error("Insufficient wallet balance.");
            }

            // All writes must come after reads
            const newBalance = currentBalance - amount;
            transaction.update(userRef, { walletBalance: newBalance });
            
            const matchData = matchDoc.data();
            const potentialWin = amount * 2; // Simple 2x win for now
            const matchDescription = `${matchData.teamA.name} vs ${matchData.teamB.name}`;

            const newBetRef = doc(collection(db, "bets"));
            transaction.set(newBetRef, {
                userId,
                matchId,
                matchDescription,
                questionId,
                questionText,
                predictionA,
                predictionB,
                amount,
                status: 'Pending',
                timestamp: Timestamp.now(),
                potentialWin,
            });
        });

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
                questionId: data.questionId || '', // Add fallback for old bets
                questionText: data.questionText || 'Match Winner', // Add fallback for old bets
                predictionA: data.predictionA || '', 
                predictionB: data.predictionB || '',
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
