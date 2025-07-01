'use server';

import { collection, addDoc, getDocs, doc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Match } from '@/lib/types';
import { matchSchema, type MatchFormValues } from '@/lib/schemas';
import { countries } from '@/lib/countries';

// Server action to create a new match
export async function createMatch(values: MatchFormValues) {
    try {
        const validatedFields = matchSchema.safeParse(values);

        if (!validatedFields.success) {
            return { error: 'Invalid fields.' };
        }

        const { sport, teamA, teamB, teamALogo, teamBLogo, startTime, teamACountry, teamBCountry } = validatedFields.data;

        const countryA = countries.find(c => c.code.toLowerCase() === teamACountry.toLowerCase());
        const countryB = countries.find(c => c.code.toLowerCase() === teamBCountry.toLowerCase());

        if (!countryA || !countryB) {
            return { error: 'Invalid country selection.' };
        }
        
        const teamAName = teamA && teamA.trim() ? teamA.trim() : countryA.name;
        const teamBName = teamB && teamB.trim() ? teamB.trim() : countryB.name;

        // Use country flag as default logo if no custom logo is provided
        const teamAFlagUrl = `https://flagpedia.net/data/flags/w80/${teamACountry.toLowerCase()}.webp`;
        const teamBFlagUrl = `https://flagpedia.net/data/flags/w80/${teamBCountry.toLowerCase()}.webp`;

        const now = new Date();
        const status = startTime > now ? 'Upcoming' : 'Live';

        await addDoc(collection(db, "matches"), {
            sport,
            teamA: { name: teamAName, logoUrl: teamALogo || teamAFlagUrl, countryCode: teamACountry },
            teamB: { name: teamBName, logoUrl: teamBLogo || teamBFlagUrl, countryCode: teamBCountry },
            startTime: Timestamp.fromDate(startTime),
            status,
            score: '',
            winner: '',
        });

        revalidatePath('/admin/matches');
        revalidatePath('/');
        return { success: 'Match created successfully!' };
    } catch (error) {
        console.error("Error creating match: ", error);
        return { error: 'Failed to create match.' };
    }
}

// Server action to delete a match
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


// Function to get all matches from Firestore
export async function getMatches(): Promise<Match[]> {
    try {
        const matchesCol = collection(db, 'matches');
        const q = query(matchesCol, orderBy('startTime', 'desc'));
        const matchSnapshot = await getDocs(q);
        const matchList = matchSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                sport: data.sport,
                teamA: data.teamA,
                teamB: data.teamB,
                status: data.status,
                startTime: (data.startTime as Timestamp).toDate().toISOString(),
                // Ensure score and winner are always strings to avoid serialization errors
                score: data.score || '', 
                winner: data.winner || '',
            } as Match;
        });
        return matchList;
    } catch (error) {
        console.error("Error fetching matches:", error);
        return [];
    }
}
