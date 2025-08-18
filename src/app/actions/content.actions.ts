
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { ContentSettings } from '@/lib/types';
import { deleteFileByPath } from '@/lib/storage';

interface UpdateContentPayload {
    youtubeUrl: string;
    bannerImageUrl?: string;
    bannerImagePath?: string;
    smallVideoUrl?: string;
    smallVideoPath?: string;
}

// Function to get existing content settings
export async function getContent(): Promise<ContentSettings | null> {
    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as ContentSettings;
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
        const currentContent = await getContent();

        // If a new banner is being uploaded and an old one exists, delete the old one from storage
        if (payload.bannerImagePath && currentContent?.bannerImagePath && payload.bannerImagePath !== currentContent.bannerImagePath) {
            await deleteFileByPath(currentContent.bannerImagePath);
        }

        // If a new video is being uploaded and an old one exists, delete the old one
        if (payload.smallVideoPath && currentContent?.smallVideoPath && payload.smallVideoPath !== currentContent.smallVideoPath) {
            await deleteFileByPath(currentContent.smallVideoPath);
        }
        
        await setDoc(docRef, payload, { merge: true });
        
        revalidatePath('/admin/content');
        revalidatePath('/'); // Also revalidate home page where banner is shown
        return { success: 'Content updated successfully!' };

    } catch (error: any) {
        console.error("Error updating content: ", error);
        return { error: error.message || 'An unknown error occurred while updating content.' };
    }
}
