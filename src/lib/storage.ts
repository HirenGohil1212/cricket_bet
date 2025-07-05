
'use client'; // This will be used on the client

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

// Uploads a file and returns the download URL
export const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!file) {
        throw new Error("No file provided for upload.");
    }
    // Return the storage path, not the download URL
    const storagePath = `${path}/${uuidv4()}-${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    return storagePath;
};

// Deletes a file from a Firebase Storage path
export const deleteFileFromPath = async (filePath: string): Promise<void> => {
    if (!filePath) return;

    try {
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
    } catch (error: any) {
        // It's common for this to fail if the file doesn't exist, so we can often ignore it.
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found at ${filePath}, skipping deletion.`);
        } else {
            console.error(`Error deleting file from path ${filePath}:`, error);
        }
    }
};

// Extracts path from a Firebase Storage URL
function getPathFromUrl(url: string) {
    if (!url.startsWith('https://firebasestorage.googleapis.com')) {
        return null;
    }
    const urlObject = new URL(url);
    // The path is after '/o/' and before the '?alt=media' part
    const path = decodeURIComponent(urlObject.pathname.split('/o/')[1].split('?')[0]);
    return path;
}


// Deletes a file from a Firebase Storage URL
export const deleteFileFromUrl = async (fileUrl: string): Promise<void> => {
    if (!fileUrl) return;
    
    const filePath = getPathFromUrl(fileUrl);

    if (filePath) {
        await deleteFileFromPath(filePath);
    } else {
        console.warn(`Could not extract path from URL: ${fileUrl}. Skipping deletion.`);
    }
};
