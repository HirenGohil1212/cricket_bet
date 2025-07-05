
'use server';

import { collection, addDoc, getDocs, doc, deleteDoc, Timestamp, query, orderBy, getDoc, writeBatch, updateDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Match, Player } from '@/lib/types';
import { matchSchema, type MatchFormValues } from '@/lib/schemas';
import { countries } from '@/lib/countries';


// This is a simplified payload that the server action will receive
interface MatchServerPayload {
    sport: Match['sport'];
    teamA: { name: string; logoUrl: string; countryCode: string; players: Player[] };
    teamB: { name: string; logoUrl: string; countryCode: string; players: Player[] };
    startTime: Date;
    isSpecialMatch: boolean;
    allowOneSidedBets: boolean;
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
            allowOneSidedBets
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

        const templateRef = doc(db, 'questionTemplates', sport);
        const templateSnap = await getDoc(templateRef);

        if (templateSnap.exists()) {
            const templateData = templateSnap.data();
            if (templateData.questions && Array.isArray(templateData.questions) && templateData.questions.length > 0) {
                const batch = writeBatch(db);
                const questionsCollectionRef = collection(db, `matches/${newMatchRef.id}/questions`);
                
                templateData.questions.forEach((q: any) => {
                    const questionRef = doc(questionsCollectionRef);
                    batch.set(questionRef, {
                        question: q.question,
                        createdAt: Timestamp.now(),
                        status: 'active',
                        result: null,
                    });
                });
                await batch.commit();
            }
        }

        revalidatePath('/admin/matches');
        revalidatePath('/admin/q-and-a');
        revalidatePath('/');
        return { success: 'Match created successfully and questions applied!' };
    } catch (error: any) {
        console.error("Error creating match: ", error);
        return { error: 'An unknown error occurred while creating the match.' };
    }
}

export async function deleteMatch(matchId: string) {
    if (!matchId) {
        return { error: 'Match ID is required.' };
    }
    try {
        await deleteDoc(doc(db, "matches", matchId));
        revalidatePath('/admin/matches');
        revalidatePath('/');
        return { success: 'Match deleted successfully!' };
    } catch (error) {
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
        } = payload;

        const now = new Date();
        const status = startTime > now ? 'Upcoming' : 'Live';

        await updateDoc(matchRef, {
            sport,
            teamA,
            teamB,
            startTime: Timestamp.fromDate(startTime),
            ...(existingMatchData.status !== 'Finished' && { status }),
            isSpecialMatch,
            allowOneSidedBets,
        });
        
        revalidatePath('/admin/matches');
        revalidatePath(`/admin/matches/edit/${matchId}`);
        revalidatePath('/');
        return { success: 'Match updated successfully!' };
        
    } catch (error: any) {
        console.error("Error updating match: ", error);
        return { error: 'An unknown error occurred while updating the match.' };
    }
}
