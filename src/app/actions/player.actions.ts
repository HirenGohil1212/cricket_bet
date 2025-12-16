
'use server';

import { collection, addDoc, getDocs, doc, deleteDoc, Timestamp, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Player, Sport } from '@/lib/types';
import { deleteFileByPath } from '@/lib/storage';

// Server action to create a new player
export async function createPlayer(playerData: { name: string; imageUrl: string; imagePath: string; sport: Sport }) {
    try {
        const docRef = await addDoc(collection(db, "players"), {
            ...playerData,
            createdAt: Timestamp.now(),
        });
        revalidatePath('/admin/players');
        revalidatePath('/admin/matches/add');
        revalidatePath('/admin/matches/edit/*');
        return { success: 'Player created successfully!', id: docRef.id, playerData };
    } catch (error: any) {
        console.error("Error creating player: ", error);
        return { error: 'An unknown error occurred while creating the player.' };
    }
}

// Function to get all players
export async function getPlayers(): Promise<Player[]> {
    try {
        const playersCol = collection(db, 'players');
        const q = query(playersCol, orderBy('createdAt', 'desc'));
        const playerSnapshot = await getDocs(q);

        const playerList = playerSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                imageUrl: data.imageUrl,
                imagePath: data.imagePath,
                sport: data.sport,
            } as Player;
        });
        return playerList;
    } catch (error) {
        console.error("Error fetching players:", error);
        return [];
    }
}

// Function to get players by sport
export async function getPlayersBySport(sport: Sport): Promise<Player[]> {
    try {
        const playersCol = collection(db, 'players');
        // The orderBy was causing a composite index error. Removing it to fix the query.
        const q = query(playersCol, where('sport', '==', sport));
        const playerSnapshot = await getDocs(q);

        const playerList = playerSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                imageUrl: data.imageUrl,
                imagePath: data.imagePath,
                sport: data.sport,
            } as Player;
        });
        return playerList;
    } catch (error) {
        console.error("Error fetching players by sport:", error);
        return [];
    }
}


// Server action to delete a player
export async function deletePlayer(playerId: string) {
    if (!playerId) {
        return { error: 'Player ID is required.' };
    }
    const playerRef = doc(db, "players", playerId);
    try {
        const playerDoc = await getDoc(playerRef);
        if (!playerDoc.exists()) {
            return { error: "Player not found." };
        }

        const playerData = playerDoc.data();
        if (playerData.imagePath) {
            await deleteFileByPath(playerData.imagePath);
        }

        await deleteDoc(playerRef);
        revalidatePath('/admin/players');
        return { success: 'Player deleted successfully!' };
    } catch (error: any) {
        console.error("Error deleting player: ", error);
        return { error: 'Failed to delete player.' };
    }
}
