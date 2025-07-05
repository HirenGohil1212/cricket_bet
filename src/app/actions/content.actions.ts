
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { ContentSettings } from '@/lib/types';
import { contentManagementSchema, type ContentManagementFormValues } from '@/lib/schemas';


const ACCEPTED_BANNER_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4"];

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
export async function updateContent(data: ContentManagementFormValues) {
    const validatedFields = contentManagementSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid data provided.' };
    }

    const { youtubeUrl, bannerImageDataUri, smallVideoDataUri } = validatedFields.data;

    try {
        const docRef = doc(db, 'adminSettings', 'content');
        
        const updatePayload: Record<string, any> = {
            youtubeUrl: youtubeUrl || ''
        };

        if (bannerImageDataUri) {
            const matches = bannerImageDataUri.match(/^data:(.+);base64,(.*)$/);
            if (!matches || matches.length !== 3) {
                return { error: 'Invalid banner image format. Please re-upload the image.' };
            }
            const mimeType = matches[1];
            const base64Data = matches[2];

            if (!ACCEPTED_BANNER_TYPES.includes(mimeType)) {
                return { error: 'Invalid banner file type. Only PNG, JPG, or WEBP are allowed.' };
            }
            const newBannerPath = `content/banner-${uuidv4()}`;
            const storageRef = ref(storage, newBannerPath);
            await uploadString(storageRef, base64Data, 'base64', { contentType: mimeType });
            updatePayload.bannerImagePath = newBannerPath;
        }

        if (smallVideoDataUri) {
            const matches = smallVideoDataUri.match(/^data:(.+);base64,(.*)$/);
            if (!matches || matches.length !== 3) {
                return { error: 'Invalid video format. Please re-upload the video.' };
            }
            const mimeType = matches[1];
            const base64Data = matches[2];

            if (!ACCEPTED_VIDEO_TYPES.includes(mimeType)) {
                return { error: 'Invalid video file type. Only MP4 videos are allowed.' };
            }

            const newVideoPath = `content/video-${uuidv4()}`;
            const storageRef = ref(storage, newVideoPath);
            await uploadString(storageRef, base64Data, 'base64', { contentType: mimeType });
            updatePayload.smallVideoPath = newVideoPath;
        }

        await setDoc(docRef, updatePayload, { merge: true });
        
        revalidatePath('/admin/content');
        revalidatePath('/'); // Also revalidate home page where banner is shown
        return { success: 'Content updated successfully!' };

    } catch (error: any) {
        console.error("Error updating content: ", error);
        return { error: error.message || 'Failed to update content.' };
    }
}
