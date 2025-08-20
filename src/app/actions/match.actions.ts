'use server';

import { collection, addDoc, getDocs, doc, deleteDoc, Timestamp, query, orderBy, getDoc, writeBatch, updateDoc, limit, runTransaction, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Match, Player } from '@/lib/types';
import { matchSchema, type MatchFormValues } from '@/lib/schemas';
import { countries } from '@/lib/countries';
import { deleteFileByPath } from '@/lib/storage';


// This is a simplified payload that the server action will receive
interface MatchServerPayload {
    sport: Match['sport'];
    teamA: { name: string; logoUrl: string; logoPath?: string; countryCode: string; players: Player[] };
    teamB: { name: string; logoUrl: string; logoPath?: string; countryCode: string; players: Player[] };
    startTime: Date;
    isSpecialMatch: boolean;
    allowOneSidedBets: boolean;
    questions: { question: string }[];
}

// Server action to create a new match
export async function createMatch(payload: MatchServerPayload) {
    try {
        const { 
            sport, 
            teamA, 
            teamB, 
            startTime, 
            isSpecialMatch,
            allowOneSidedBets,
            questions,
        } = payload;

        const now = new Date();
        const status = startTime > now ? 'Upcoming' : 'Live';

        const newMatchRef = await addDoc(collection(db, "matches"), {
            sport,
            teamA,
            teamB,
            startTime: Timestamp.fromDate(startTime),
            status,
            score: '',
            winner: '',
            isSpecialMatch,
            allowOneSidedBets,
        });

        // ** NEW LOGIC **: Add questions directly from the payload
        if (questions && questions.length > 0) {
            const batch = writeBatch(db);
            const questionsCollectionRef = collection(db, `matches/${newMatchRef.id}/questions`);
            
            questions.forEach((q, index) => {
                const questionRef = doc(questionsCollectionRef);
                batch.set(questionRef, {
                    question: q.question,
                    order: index,
                    createdAt: Timestamp.now(),
                    status: 'active',
                    result: null,
                });
            });
            await batch.commit();
        }

        revalidatePath('/admin/matches');
        revalidatePath('/');
        return { success: 'Match created successfully with custom questions!' };
    } catch (error: any) {
        console.error("Error creating match: ", error);
        return { error: 'An unknown error occurred while creating the match.' };
    }
}

export async function deleteMatch(matchId: string) {
    if (!matchId) {
        return { error: 'Match ID is required.' };
    }
    
    const matchRef = doc(db, "matches", matchId);

    try {
        const matchDoc = await getDoc(matchRef);
        if (!matchDoc.exists()) {
            return { error: 'Match not found.' };
        }
        
        const matchData = matchDoc.data();
        
        // Delete team logos if they have a path
        if (matchData.teamA?.logoPath) {
            await deleteFileByPath(matchData.teamA.logoPath);
        }
        if (matchData.teamB?.logoPath) {
            await deleteFileByPath(matchData.teamB.logoPath);
        }

        // Delete player images - this part seems to be missing in the original logic. Assuming player objects have an imagePath.
        // We need to ensure player objects have `imagePath` when created/updated if we want to delete their images.
        // For now, let's assume they don't and focus on the logos as requested.

        // Finally, delete the Firestore document for the match
        await deleteDoc(matchRef);

        revalidatePath('/admin/matches');
        revalidatePath('/');
        return { success: 'Match and associated logos deleted successfully!' };
    } catch (error: any) {
        console.error("Error deleting match: ", error);
        return { error: 'Failed to delete match.' };
    }
}

export async function getMatches(): Promise<Match[]> {
    try {
        const matchesCol = collection(db, 'matches');
        const q = query(matchesCol, orderBy('startTime', 'desc'), limit(50));
        const matchSnapshot = await getDocs(q);
        const now = new Date();

        const matchList = matchSnapshot.docs.map(doc => {
            const data = doc.data();
            const startTime = (data.startTime as Timestamp).toDate();
            
            let currentStatus: Match['status'] = data.status;
            if (currentStatus === 'Upcoming' && startTime <= now) {
                currentStatus = 'Live';
            }

            if (data.teamA.logoUrl && data.teamA.logoUrl.includes('flagpedia.net')) {
                data.teamA.logoUrl = data.teamA.logoUrl.replace('/w80/', '/w320/').replace('/w40/', '/w320/');
            }
            if (data.teamB.logoUrl && data.teamB.logoUrl.includes('flagpedia.net')) {
                data.teamB.logoUrl = data.teamB.logoUrl.replace('/w80/', '/w320/').replace('/w40/', '/w320/');
            }

            return {
                id: doc.id,
                sport: data.sport,
                teamA: data.teamA,
                teamB: data.teamB,
                status: currentStatus,
                startTime: startTime.toISOString(),
                score: data.score || '', 
                winner: data.winner || '',
                isSpecialMatch: data.isSpecialMatch || false,
                allowOneSidedBets: data.allowOneSidedBets || false,
            } as Match;
        });
        return matchList;
    } catch (error) {
        console.error("Error fetching matches:", error);
        return [];
    }
}

export async function getMatchById(matchId: string): Promise<Match | null> {
    try {
        const matchRef = doc(db, 'matches', matchId);
        const matchSnap = await getDoc(matchRef);

        if (!matchSnap.exists()) {
            return null;
        }

        const data = matchSnap.data();
        const startTime = (data.startTime as Timestamp).toDate();
        const now = new Date();
        
        let currentStatus: Match['status'] = data.status;
        if (currentStatus === 'Upcoming' && startTime <= now) {
            currentStatus = 'Live';
        }

        if (data.teamA.logoUrl && data.teamA.logoUrl.includes('flagpedia.net')) {
            data.teamA.logoUrl = data.teamA.logoUrl.replace('/w80/', '/w320/').replace('/w40/', '/w320/');
        }
        if (data.teamB.logoUrl && data.teamB.logoUrl.includes('flagpedia.net')) {
            data.teamB.logoUrl = data.teamB.logoUrl.replace('/w80/', '/w320/').replace('/w40/', '/w320/');
        }

        return {
            id: matchSnap.id,
            sport: data.sport,
            teamA: data.teamA,
            teamB: data.teamB,
            status: currentStatus,
            startTime: startTime.toISOString(),
            score: data.score || '',
            winner: data.winner || '',
            isSpecialMatch: data.isSpecialMatch || false,
            allowOneSidedBets: data.allowOneSidedBets || false,
        } as Match;
    } catch (error) {
        console.error("Error fetching match by ID:", error);
        return null;
    }
}

export async function updateMatch(matchId: string, payload: MatchServerPayload) {
    try {
        const matchRef = doc(db, 'matches', matchId);
        const existingMatchSnap = await getDoc(matchRef);
        if (!existingMatchSnap.exists()) {
            return { error: "Match not found." };
        }
        const existingMatchData = existingMatchSnap.data() as Match;

        const {
            sport,
            teamA,
            teamB,
            startTime,
            isSpecialMatch,
            allowOneSidedBets,
            questions,
        } = payload;

        // If a new logo was uploaded for team A, delete the old one
        if (teamA.logoPath && teamA.logoPath !== existingMatchData.teamA.logoPath) {
            await deleteFileByPath(existingMatchData.teamA.logoPath!);
        }
        // If a new logo was uploaded for team B, delete the old one
        if (teamB.logoPath && teamB.logoPath !== existingMatchData.teamB.logoPath) {
            await deleteFileByPath(existingMatchData.teamB.logoPath!);
        }

        const now = new Date();
        const status = startTime > now ? 'Upcoming' : 'Live';

        const batch = writeBatch(db);

        // Update the main match document
        batch.update(matchRef, {
            sport,
            teamA,
            teamB,
            startTime: Timestamp.fromDate(startTime),
            ...(existingMatchData.status !== 'Finished' && { status }),
            isSpecialMatch,
            allowOneSidedBets,
        });
        
        // ** NEW LOGIC **: Overwrite the questions for this match
        const questionsCollectionRef = collection(db, `matches/${matchId}/questions`);
        const existingQuestionsSnapshot = await getDocs(questionsCollectionRef);
        existingQuestionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        if (questions && questions.length > 0) {
            questions.forEach((q, index) => {
                const questionRef = doc(questionsCollectionRef);
                batch.set(questionRef, {
                    question: q.question,
                    order: index,
                    createdAt: Timestamp.now(),
                    status: 'active',
                    result: null,
                });
            });
        }
        
        await batch.commit();
        
        revalidatePath('/admin/matches');
        revalidatePath(`/admin/matches/edit/${matchId}`);
        revalidatePath('/');
        return { success: 'Match updated successfully!' };
        
    } catch (error: any) {
        console.error("Error updating match: ", error);
        return { error: 'An unknown error occurred while updating the match.' };
    }
}

export async function cancelMatch(matchId: string) {
    if (!matchId) {
        return { error: 'Match ID is required.' };
    }

    const matchRef = doc(db, 'matches', matchId);
    const betsRef = collection(db, 'bets');
    const betsToRefundQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Pending'));

    try {
        const matchDoc = await getDoc(matchRef);
        if (!matchDoc.exists()) {
            return { error: 'Match not found.' };
        }
        if (['Finished', 'Cancelled'].includes(matchDoc.data().status)) {
            return { error: 'Match is already finished or cancelled.' };
        }

        const betsSnapshot = await getDocs(betsToRefundQuery);
        
        // Use a transaction for all writes to ensure atomicity
        await runTransaction(db, async (transaction) => {
            // All reads must be done before writes in a transaction
            const userDocs = new Map<string, any>();
            const userRefs: { [key: string]: any } = {};

            // Collect all user documents that need updating
            for (const betDoc of betsSnapshot.docs) {
                const userId = betDoc.data().userId;
                if (!userDocs.has(userId)) {
                    const userRef = doc(db, 'users', userId);
                    userRefs[userId] = userRef;
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) {
                        throw new Error(`User with ID ${userId} not found.`);
                    }
                    userDocs.set(userId, userDoc);
                }
            }

            // Perform all writes
            for (const betDoc of betsSnapshot.docs) {
                const betData = betDoc.data();
                const userId = betData.userId;
                const userRef = userRefs[userId];
                const userDoc = userDocs.get(userId);
                
                const currentBalance = userDoc.data().walletBalance || 0;
                const newBalance = currentBalance + betData.amount;
                
                // Refund user
                transaction.update(userRef, { walletBalance: newBalance });
                // Update bet status
                transaction.update(betDoc.ref, { status: 'Refunded' });
            }

            // Update match status to Cancelled
            transaction.update(matchRef, { status: 'Cancelled' });
        });

        revalidatePath('/admin/matches');
        revalidatePath('/admin/q-and-a');
        revalidatePath('/');
        revalidatePath('/wallet'); // Users need to see their refund
        return { success: 'Match cancelled and all pending bets refunded successfully.' };
    } catch (error: any) {
        console.error("Error cancelling match:", error);
        return { error: error.message || 'An unknown error occurred during cancellation.' };
    }
}
