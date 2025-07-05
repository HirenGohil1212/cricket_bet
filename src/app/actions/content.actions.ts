
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { ContentSettings } from '@/lib/types';

interface UpdateContentPayload {
    youtubeUrl: string;
    bannerImageUrl?: string;
    smallVideoUrl?: string;
}

// Function to get existing content settings
export async function getContent(): Promise<ContentSettings | null> {
    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Data is now stored directly as URLs, so no need for getDownloadURL logic.
            const contentSettings: ContentSettings = {
                youtubeUrl: data.youtubeUrl || '',
                bannerImageUrl: data.bannerImageUrl || '',
                smallVideoUrl: data.smallVideoUrl || '',
            };
            return contentSettings;
        }
        return null;
    } catch (error) {
        console.error("Error fetching content settings:", error);
        return null;
    }
}

// Server action to update content settings
export async function updateContent(payload: UpdateContentPayload) {
    if (!payload) {
      return { error: 'Invalid data provided.' };
    }

    try {
        const docRef = doc(db, 'adminSettings', 'content');
        
        await setDoc(docRef, payload, { merge: true });
        
        revalidatePath('/admin/content');
        revalidatePath('/'); // Also revalidate home page where banner is shown
        return { success: 'Content updated successfully!' };

    } catch (error: any) {
        console.error("Error updating content: ", error);
        return { error: error.message || 'An unknown error occurred while updating content.' };
    }
}
