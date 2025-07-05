
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { ContentSettings } from '@/lib/types';
import { contentManagementSchema, type ContentManagementFormValues } from '@/lib/schemas';


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
export async function updateContent(data: ContentManagementFormValues) {
    const validatedFields = contentManagementSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid data provided.' };
    }

    const { youtubeUrl, bannerImageDataUri, smallVideoDataUri } = validatedFields.data;

    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const currentContent = await getContent();

        let bannerImageUrl = currentContent?.bannerImageUrl || '';
        let smallVideoUrl = currentContent?.smallVideoUrl || '';

        // If a new banner is uploaded, upload it to storage and delete the old one
        if (bannerImageDataUri) {
            if (currentContent?.bannerImageUrl && currentContent.bannerImageUrl.includes('firebasestorage.googleapis.com')) {
                try {
                    const oldFileRef = ref(storage, currentContent.bannerImageUrl);
                    await deleteObject(oldFileRef);
                } catch (e: any) {
                    if (e.code !== 'storage/object-not-found') console.error("Could not delete old banner:", e);
                }
            }
            const storageRef = ref(storage, `content/banner-${uuidv4()}`);
            const mimeType = bannerImageDataUri.match(/data:(.*);base64,/)?.[1];
            const base64Data = bannerImageDataUri.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            await uploadBytes(storageRef, imageBuffer, { contentType: mimeType });
            bannerImageUrl = await getDownloadURL(storageRef);
        }

        // If a new video is uploaded, upload it to storage and delete the old one
        if (smallVideoDataUri) {
             if (currentContent?.smallVideoUrl && currentContent.smallVideoUrl.includes('firebasestorage.googleapis.com')) {
                try {
                    const oldFileRef = ref(storage, currentContent.smallVideoUrl);
                    await deleteObject(oldFileRef);
                } catch (e: any) {
                     if (e.code !== 'storage/object-not-found') console.error("Could not delete old video:", e);
                }
            }
            const storageRef = ref(storage, `content/video-${uuidv4()}`);
            const mimeType = smallVideoDataUri.match(/data:(.*);base64,/)?.[1];
            const base64Data = smallVideoDataUri.split(',')[1];
            const videoBuffer = Buffer.from(base64Data, 'base64');
            await uploadBytes(storageRef, videoBuffer, { contentType: mimeType });
            smallVideoUrl = await getDownloadURL(storageRef);
        }

        const newContent: ContentSettings = {
            youtubeUrl: youtubeUrl || '',
            bannerImageUrl,
            smallVideoUrl,
        };

        await setDoc(docRef, newContent, { merge: true });
        
        revalidatePath('/admin/content');
        return { success: 'Content updated successfully!' };

    } catch (error: any) {
        console.error("Error updating content: ", error);
        return { error: error.message || 'Failed to update content.' };
    }
}
