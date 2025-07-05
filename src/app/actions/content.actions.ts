
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import type { ContentSettings } from '@/lib/types';
import { contentManagementSchema, type ContentManagementFormValues } from '@/lib/schemas';


// Helper function to get a storage path from a full URL
function getPathFromStorageUrl(url: string): string | null {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return null; // Not a Firebase Storage URL that we can delete
  }
  try {
    const urlObject = new URL(url);
    // Pathname is /v0/b/your-bucket.appspot.com/o/path%2Fto%2Ffile.jpg
    const decodedPath = decodeURIComponent(urlObject.pathname);
    // We want to extract 'path/to/file.jpg'
    const pathSegment = '/o/';
    const startIndex = decodedPath.indexOf(pathSegment);
    if (startIndex === -1) return null;
    
    // Extract the path and remove any query parameters
    return decodedPath.substring(startIndex + pathSegment.length).split('?')[0]; 
  } catch (error) {
    console.error("Could not parse storage URL:", error, "URL:", url);
    return null;
  }
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

        // If a new banner is uploaded, just upload it and set the new path.
        if (bannerImageDataUri) {
            const newBannerPath = `content/banner-${uuidv4()}`;
            const storageRef = ref(storage, newBannerPath);
            const mimeType = bannerImageDataUri.match(/data:(.*);base64,/)?.[1];
            const base64Data = bannerImageDataUri.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            await uploadBytes(storageRef, imageBuffer, { contentType: mimeType });
            updatePayload.bannerImagePath = newBannerPath;
        }

        // If a new video is uploaded, just upload it and set the new path.
        if (smallVideoDataUri) {
            const newVideoPath = `content/video-${uuidv4()}`;
            const storageRef = ref(storage, newVideoPath);
            const mimeType = smallVideoDataUri.match(/data:(.*);base64,/)?.[1];
            const base64Data = smallVideoDataUri.split(',')[1];
            const videoBuffer = Buffer.from(base64Data, 'base64');
            await uploadBytes(storageRef, videoBuffer, { contentType: mimeType });
            updatePayload.smallVideoPath = newVideoPath;
        }

        // Use setDoc with merge:true to create or update the document without overwriting fields not in the payload.
        await setDoc(docRef, updatePayload, { merge: true });
        
        revalidatePath('/admin/content');
        revalidatePath('/'); // Also revalidate home page where banner is shown
        return { success: 'Content updated successfully!' };

    } catch (error: any) {
        console.error("Error updating content: ", error);
        return { error: error.message || 'Failed to update content.' };
    }
}
