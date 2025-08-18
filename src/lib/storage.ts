

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

// Deletes a file from Firebase Storage using its direct storage path OR full HTTPS URL.
export const deleteFileByPath = async (pathOrUrl: string): Promise<void> => {
    if (!pathOrUrl) {
        console.warn("deleteFileByPath called with no path or URL.");
        return;
    };

    try {
        // ref() can take either a gs:// path or an https:// download URL
        const fileRef = ref(storage, pathOrUrl);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found, could not delete: ${pathOrUrl}. This may not be an error if the file was already deleted.`);
        } else {
            console.error(`Failed to delete file at path/url ${pathOrUrl}:`, error);
            // Re-throw the error so the calling function knows the deletion failed.
            throw error;
        }
    }
};

