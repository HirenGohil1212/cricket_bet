
'use server';

import { collection, addDoc, getDocs, doc, deleteDoc, Timestamp, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { DummyUser, Sport } from '@/lib/types';

// Server action to create a new dummy user
export async function createDummyUser(playerData: { name: string; sport: Sport }) {
    try {
        const docRef = await addDoc(collection(db, "dummyUsers"), {
            ...playerData,
            createdAt: Timestamp.now(),
        });
        revalidatePath('/admin/dummy-users');
        return { success: 'Dummy user created successfully!', id: docRef.id, playerData };
    } catch (error: any) {
        console.error("Error creating dummy user: ", error);
        return { error: 'An unknown error occurred while creating the dummy user.' };
    }
}

// Function to get all dummy users
export async function getDummyUsers(): Promise<DummyUser[]> {
    try {
        const dummyUsersCol = collection(db, 'dummyUsers');
        const q = query(dummyUsersCol, orderBy('createdAt', 'desc'));
        const dummyUserSnapshot = await getDocs(q);

        const dummyUserList = dummyUserSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                sport: data.sport,
            } as DummyUser;
        });
        return dummyUserList;
    } catch (error) {
        console.error("Error fetching dummy users:", error);
        return [];
    }
}

// Function to get dummy users by sport
export async function getDummyUsersBySport(sport: Sport): Promise<DummyUser[]> {
    if (!sport) return [];
    try {
        const dummyUsersCol = collection(db, 'dummyUsers');
        const q = query(dummyUsersCol, where('sport', '==', sport));
        const dummyUserSnapshot = await getDocs(q);

        const dummyUserList = dummyUserSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                sport: data.sport,
            } as DummyUser;
        });
        return dummyUserList;
    } catch (error) {
        console.error("Error fetching dummy users by sport:", error);
        return [];
    }
}


// Server action to delete a dummy user
export async function deleteDummyUser(dummyUserId: string) {
    if (!dummyUserId) {
        return { error: 'Dummy user ID is required.' };
    }
    const dummyUserRef = doc(db, "dummyUsers", dummyUserId);
    try {
        const dummyUserDoc = await getDoc(dummyUserRef);
        if (!dummyUserDoc.exists()) {
            return { error: "Dummy user not found." };
        }

        await deleteDoc(dummyUserRef);
        revalidatePath('/admin/dummy-users');
        return { success: 'Dummy user deleted successfully!' };
    } catch (error: any) {
        console.error("Error deleting dummy user: ", error);
        return { error: 'Failed to delete dummy user.' };
    }
}
