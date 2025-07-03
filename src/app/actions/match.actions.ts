
'use server';

import { collection, addDoc, getDocs, doc, deleteDoc, Timestamp, query, orderBy, getDoc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Match, Player } from '@/lib/types';
import { matchSchema, type MatchFormValues } from '@/lib/schemas';
import { countries } from '@/lib/countries';

// Server action to create a new match
export async function createMatch(values: MatchFormValues) {
    try {
        const validatedFields = matchSchema.safeParse(values);

        if (!validatedFields.success) {
            return { error: 'Invalid fields.' };
        }

        const { 
            sport, 
            teamA, 
            teamB, 
            teamACountry, 
            teamBCountry, 
            startTime, 
            teamALogoDataUri, 
            teamBLogoDataUri,
            teamAPlayers,
            teamBPlayers,
        } = validatedFields.data;

        const countryA = countries.find(c => c.code.toLowerCase() === teamACountry.toLowerCase());
        const countryB = countries.find(c => c.code.toLowerCase() === teamBCountry.toLowerCase());

        if (!countryA || !countryB) {
            return { error: 'Invalid country selection.' };
        }
        
        const teamAName = teamA && teamA.trim() ? teamA.trim() : countryA.name;
        const teamBName = teamB && teamB.trim() ? teamB.trim() : countryB.name;

        // Use country flag as default logo if no custom logo is provided
        let teamALogoUrl = `https://flagpedia.net/data/flags/w320/${teamACountry.toLowerCase()}.webp`;
        let teamBLogoUrl = `https://flagpedia.net/data/flags/w320/${teamBCountry.toLowerCase()}.webp`;

        if (teamALogoDataUri) {
            const storageRef = ref(storage, `logos/${uuidv4()}`);
            const mimeType = teamALogoDataUri.match(/data:(.*);base64,/)?.[1];
            
            await uploadString(storageRef, teamALogoDataUri.split(',')[1], 'base64', {
                contentType: mimeType
            });

            teamALogoUrl = await getDownloadURL(storageRef);
        }

        if (teamBLogoDataUri) {
            const storageRef = ref(storage, `logos/${uuidv4()}`);
            const mimeType = teamBLogoDataUri.match(/data:(.*);base64,/)?.[1];
            
            await uploadString(storageRef, teamBLogoDataUri.split(',')[1], 'base64', {
                contentType: mimeType
            });

            teamBLogoUrl = await getDownloadURL(storageRef);
        }

        // Process players
        const processPlayers = async (players: MatchFormValues['teamAPlayers']) => {
            if (!players || players.length === 0) return [];
            
            const processedPlayers: Player[] = [];
            for (const player of players) {
                let playerImageUrl = '';
                if (player.playerImageDataUri) {
                    const storageRef = ref(storage, `players/${uuidv4()}`);
                    const mimeType = player.playerImageDataUri.match(/data:(.*);base64,/)?.[1];
                    await uploadString(storageRef, player.playerImageDataUri.split(',')[1], 'base64', { contentType: mimeType });
                    playerImageUrl = await getDownloadURL(storageRef);
                }
                processedPlayers.push({ name: player.name, imageUrl: playerImageUrl });
            }
            return processedPlayers;
        };
        
        const processedTeamAPlayers = await processPlayers(teamAPlayers);
        const processedTeamBPlayers = await processPlayers(teamBPlayers);

        const now = new Date();
        const status = startTime > now ? 'Upcoming' : 'Live';

        // Create the match document
        const newMatchRef = await addDoc(collection(db, "matches"), {
            sport,
            teamA: { 
                name: teamAName, 
                logoUrl: teamALogoUrl, 
                countryCode: teamACountry,
                players: processedTeamAPlayers
            },
            teamB: { 
                name: teamBName, 
                logoUrl: teamBLogoUrl, 
                countryCode: teamBCountry,
                players: processedTeamBPlayers
            },
            startTime: Timestamp.fromDate(startTime),
            status,
            score: '',
            winner: '',
        });

        // Now, check for a question template and apply it
        const templateRef = doc(db, 'questionTemplates', sport);
        const templateSnap = await getDoc(templateRef);

        if (templateSnap.exists()) {
            const templateData = templateSnap.data();
            const questions = templateData.questions;

            if (questions && Array.isArray(questions) && questions.length > 0) {
                const batch = writeBatch(db);
                const questionsCollectionRef = collection(db, `matches/${newMatchRef.id}/questions`);
                
                questions.forEach((q: any) => {
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

            // Fix blurry flag URLs on the fly by always requesting high-resolution images
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
