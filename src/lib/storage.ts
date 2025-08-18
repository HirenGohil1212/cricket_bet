

'use client'; 

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

// Uploads a file directly to Firebase Storage and returns the public download URL.
// This is faster and more reliable as it offloads the work to the browser.
export const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!file) {
        throw new Error("No file provided for upload.");
    }
    const storagePath = `${path}/${uuidv4()}-${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
};

// Deletes a file from Firebase Storage using its public download URL.
export const deleteFileByUrl = async (url: string): Promise<void> => {
    try {
        // Firebase Storage URLs have a specific format. We can extract the path from it.
        // Example URL: https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/path%2Fto%2Ffile.jpg?alt=media&token=...
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error: any) {
        // It's common for 'storage/object-not-found' errors if a file was already deleted or the URL is wrong.
        // We can choose to ignore this specific error to make the deletion process more robust.
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found, could not delete: ${url}`);
        } else {
            // Re-throw other errors
            throw error;
        }
    }
};
