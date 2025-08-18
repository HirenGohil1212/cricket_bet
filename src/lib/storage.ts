

'use client'; 

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

// Uploads a file directly to Firebase Storage and returns both the public download URL and the storage path.
export const uploadFile = async (file: File, path: string): Promise<{ downloadUrl: string; storagePath: string }> => {
    if (!file) {
        throw new Error("No file provided for upload.");
    }
    const storagePath = `${path}/${uuidv4()}-${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl, storagePath };
};

// Deletes a file from Firebase Storage using its direct storage path.
export const deleteFileByPath = async (path: string): Promise<void> => {
    if (!path) return;

    try {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found, could not delete: ${path}`);
        } else {
            console.error(`Failed to delete file at path ${path}:`, error);
            throw error;
        }
    }
};


// ** NEW ROBUST FUNCTION **
// Deletes a file from Firebase Storage using its full public HTTPS URL.
// This is useful for deleting files when only the URL is known (e.g., for older data).
export const deleteFileByUrl = async (url: string): Promise<void> => {
    if (!url) return;

    try {
        // ref() is the correct Firebase SDK method to get a reference from a URL
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found from URL, could not delete: ${url}`);
        } else {
            console.error(`Failed to delete file from URL ${url}:`, error);
            throw error;
        }
    }
};
