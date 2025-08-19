
'use server';

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { ContentSettings } from '@/lib/types';
import { deleteFileByPath, listFiles } from '@/lib/storage';

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


// Server action to delete a specific content asset
export async function deleteContentAsset({ assetType }: { assetType: 'banner' | 'video' }) {
    if (!assetType) {
        return { error: 'Asset type is required.' };
    }
    
    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const currentContent = await getContent();
        if (!currentContent) {
            return { error: 'No content settings found to delete from.' };
        }

        if (assetType === 'banner') {
            if (currentContent.bannerImagePath) {
                await deleteFileByPath(currentContent.bannerImagePath);
            }
            await updateDoc(docRef, {
                bannerImageUrl: '',
                bannerImagePath: ''
            });
        } else if (assetType === 'video') {
             if (currentContent.smallVideoPath) {
                await deleteFileByPath(currentContent.smallVideoPath);
            }
            await updateDoc(docRef, {
                smallVideoUrl: '',
                smallVideoPath: ''
            });
        }

        revalidatePath('/admin/content');
        revalidatePath('/');
        return { success: `${assetType.charAt(0).toUpperCase() + assetType.slice(1)} deleted successfully.` };

    } catch (error: any) {
        console.error(`Error deleting ${assetType}: `, error);
        return { error: `Failed to delete ${assetType}.` };
    }
}


// New Server Action to list all files in the 'content' folder
export async function listContentFiles() {
    try {
        const files = await listFiles('content');
        return { files };
    } catch (error: any) {
        console.error("Error listing content files:", error);
        return { error: 'Failed to list content files.', files: [] };
    }
}

// New Server Action to delete a file by its full path
export async function deleteContentFileByPath(path: string) {
    if (!path) {
        return { error: 'File path is required.' };
    }
    try {
        await deleteFileByPath(path);
        revalidatePath('/admin/content');
        return { success: 'File deleted successfully.' };
    } catch (error: any) {
        console.error(`Error deleting file at path ${path}:`, error);
        return { error: `Failed to delete file.` };
    }
}
