'use server';

import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    runTransaction,
    query, 
    where,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Bet } from '@/lib/types';
import { auth } from '@/lib/firebase';

interface CreateBetParams {
    matchId: string;
    team: string;
    amount: number;
}

// Server action to create a new bet and update wallet
export async function createBet({ matchId, team, amount }: CreateBetParams) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return { error: 'You must be logged in to place a bet.' };
    }

    try {
        const userRef = doc(db, 'users', currentUser.uid);
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
                userId: currentUser.uid,
                matchId: matchId,
                matchDescription: matchDescription,
                prediction: team,
                amount: amount,
                status: 'Pending',
                timestamp: Timestamp.now(),
                potentialWin: potentialWin,
            });
        });

        revalidatePath('/');
        // The client doesn't use the returned bet object, so just returning success is fine 
        // and avoids any potential serialization issues.
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
        const q = query(betsCol, where('userId', '==', userId), orderBy('timestamp', 'desc'));
        const betSnapshot = await getDocs(q);

        const betList = betSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                matchId: data.matchId,
                matchDescription: data.matchDescription,
                prediction: data.prediction,
                amount: data.amount,
                status: data.status,
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
                potentialWin: data.potentialWin,
            } as Bet;
        });
        return betList;
    } catch (error) {
        console.error("Error fetching user bets:", error);
        return [];
    }
}
