
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
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
// This is the robust way to handle deletion for both old and new data schemas.
export const deleteFileByPath = async (pathOrUrl: string): Promise<void> => {
    if (!pathOrUrl) {
        console.warn("deleteFileByPath called with no path or URL.");
        return;
    };

    try {
        const fileRef = ref(storage, pathOrUrl);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found, could not delete: ${pathOrUrl}. This may not be an error.`);
        } else {
            console.error(`Failed to delete file at path/url ${pathOrUrl}:`, error);
            throw error;
        }
    }
};


// New function to list all files in a specific folder
export const listFiles = async (path: string): Promise<{ name: string, url: string, fullPath: string }[]> => {
    const folderRef = ref(storage, path);
    const result = await listAll(folderRef);

    const fileDetails = await Promise.all(
        result.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return {
                name: itemRef.name,
                url: url,
                fullPath: itemRef.fullPath,
            };
        })
    );

    return fileDetails;
};
