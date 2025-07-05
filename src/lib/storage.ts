
'use client'; 

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
