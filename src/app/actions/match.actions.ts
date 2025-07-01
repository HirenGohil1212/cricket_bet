'use server';

import { z } from 'zod';
import { collection, addDoc, getDocs, doc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Sport, Match } from '@/lib/types';

const sports: Sport[] = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"];

// Schema for adding/editing a match
export const matchSchema = z.object({
  sport: z.enum(sports, { required_error: "Please select a sport." }),
  teamA: z.string().min(2, { message: "Team A name must be at least 2 characters." }),
  teamB: z.string().min(2, { message: "Team B name must be at least 2 characters." }),
  teamALogo: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  teamBLogo: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  startTime: z.date({ required_error: "A start date and time is required." }),
});

export type MatchFormValues = z.infer<typeof matchSchema>;

// Server action to create a new match
export async function createMatch(values: MatchFormValues) {
    try {
        const validatedFields = matchSchema.safeParse(values);

        if (!validatedFields.success) {
            return { error: 'Invalid fields.' };
        }

        const { sport, teamA, teamB, teamALogo, teamBLogo, startTime } = validatedFields.data;

        const now = new Date();
        const status = startTime > now ? 'Upcoming' : 'Live';

        await addDoc(collection(db, "matches"), {
            sport,
            teamA: { name: teamA, logoUrl: teamALogo || `https://placehold.co/40x40.png` },
            teamB: { name: teamB, logoUrl: teamBLogo || `https://placehold.co/40x40.png` },
            startTime: Timestamp.fromDate(startTime),
            status,
            score: '',
            winner: '',
        });

        revalidatePath('/admin/matches');
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
                startTime: (data.startTime as Timestamp).toDate(),
                score: data.score,
                winner: data.winner,
            } as Match;
        });
        return matchList;
    } catch (error) {
        console.error("Error fetching matches:", error);
        return [];
    }
}
