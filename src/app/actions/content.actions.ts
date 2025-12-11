
'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import type { ContentSettings, Banner } from '@/lib/types';
import { deleteFileByPath, listFiles } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';


// --- DEPRECATED FIELDS ---
// youtubeUrl: string;
// bannerImageUrl?: string;
// bannerImagePath?: string;

interface UpdateContentPayload {
    smallVideoUrl?: string;
    smallVideoPath?: string;
}

// Function to get existing content settings
export async function getContent(): Promise<ContentSettings> {
    const defaultContent: ContentSettings = {
        banners: [],
        smallVideoUrl: '',
        youtubeUrl: ''
    };
    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
             // Ensure banners array exists and each banner has an ID
            const data = docSnap.data();
            const banners = (data.banners || []).map((b: Banner) => ({ ...b, id: b.id || uuidv4() }));
            return { ...defaultContent, ...data, banners };
        }
        return defaultContent;
    } catch (error) {
        console.error("Error fetching content settings:", error);
        return defaultContent;
    }
}

// Server action to update content settings (now only for video)
export async function updateContent(payload: UpdateContentPayload) {
    if (!payload) {
      return { error: 'Invalid data provided.' };
    }

    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const currentContent = await getContent();

        // If a new video is being uploaded and an old one exists, delete the old one
        if (payload.smallVideoPath && currentContent?.smallVideoPath && payload.smallVideoPath !== currentContent.smallVideoPath) {
            await deleteFileByPath(currentContent.smallVideoPath);
        }
        
        await updateDoc(docRef, {
            smallVideoUrl: payload.smallVideoUrl || currentContent.smallVideoUrl || '',
            smallVideoPath: payload.smallVideoPath || currentContent.smallVideoPath || '',
        });
        
        revalidatePath('/admin/content');
        revalidatePath('/'); // Also revalidate home page
        return { success: 'Content updated successfully!' };

    } catch (error: any) {
        console.error("Error updating content: ", error);
        return { error: error.message || 'An unknown error occurred while updating content.' };
    }
}

export async function addBanner(newBanner: { imageUrl: string; imagePath: string; }) {
    if (!newBanner.imageUrl || !newBanner.imagePath) {
        return { error: 'Invalid banner data.' };
    }
    const docRef = doc(db, 'adminSettings', 'content');
    try {
        const currentContent = await getContent();
        const updatedBanners = [...currentContent.banners, { ...newBanner, id: uuidv4() }];
        await updateDoc(docRef, { banners: updatedBanners });
        revalidatePath('/admin/content');
        revalidatePath('/');
        return { success: 'New banner added.', newBanner: { ...newBanner, id: uuidv4() } };
    } catch (error: any) {
        return { error: `Failed to add banner: ${error.message}` };
    }
}

export async function deleteBanner(bannerId: string) {
    if (!bannerId) return { error: 'Banner ID is required.' };
    const docRef = doc(db, 'adminSettings', 'content');
    try {
        const currentContent = await getContent();
        const bannerToDelete = currentContent.banners.find(b => b.id === bannerId);
        
        if (!bannerToDelete) return { error: 'Banner not found.' };

        if (bannerToDelete.imagePath) {
            await deleteFileByPath(bannerToDelete.imagePath);
        }

        const updatedBanners = currentContent.banners.filter(b => b.id !== bannerId);
        await updateDoc(docRef, { banners: updatedBanners });
        
        revalidatePath('/admin/content');
        revalidatePath('/');
        return { success: 'Banner deleted.' };
    } catch (error: any) {
        return { error: `Failed to delete banner: ${error.message}` };
    }
}


// Server action to delete a specific content asset
export async function deleteContentAsset({ assetType }: { assetType: 'video' }) {
    if (!assetType) {
        return { error: 'Asset type is required.' };
    }
    
    try {
        const docRef = doc(db, 'adminSettings', 'content');
        const currentContent = await getContent();
        if (!currentContent) {
            return { error: 'No content settings found to delete from.' };
        }

        if (assetType === 'video') {
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
