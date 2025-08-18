

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
    if (!path) {
        console.warn("deleteFileByPath called with no path.");
        return;
    };

    try {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found, could not delete: ${path}. This may not be an error if the file was already deleted.`);
        } else {
            console.error(`Failed to delete file at path ${path}:`, error);
            // We re-throw the error so the calling function knows the deletion failed.
            throw error;
        }
    }
};
