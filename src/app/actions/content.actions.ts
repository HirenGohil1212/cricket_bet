
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { ContentSettings } from '@/lib/types';

interface UpdateContentPayload {
    youtubeUrl: string;
    bannerImagePath?: string;
    smallVideoPath?: string;
}

// Function to get existing content settings
export async function getContent(): Promise<ContentSettings | null> {
    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const contentSettings: ContentSettings = {
                youtubeUrl: data.youtubeUrl || '',
                bannerImageUrl: '',
                bannerImagePath: data.bannerImagePath,
                smallVideoUrl: '',
                smallVideoPath: data.smallVideoPath,
            };

            if (data.bannerImagePath) {
                try {
                    contentSettings.bannerImageUrl = await getDownloadURL(ref(storage, data.bannerImagePath));
                } catch (e) {
                     // If URL fails to generate (e.g., object deleted), it will just be an empty string
                    console.error("Error generating banner download URL:", e);
                }
            }

            if (data.smallVideoPath) {
                try {
                    contentSettings.smallVideoUrl = await getDownloadURL(ref(storage, data.smallVideoPath));
                } catch (e) {
                     // If URL fails to generate, it will just be an empty string
                    console.error("Error generating video download URL:", e);
                }
            }

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
