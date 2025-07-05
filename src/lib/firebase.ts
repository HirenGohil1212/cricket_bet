// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgPSd0JZuTg1LqgPz1uHY1j0dhsequr14",
  authDomain: "staffable-e2ebf.firebaseapp.com",
  projectId: "staffable-e2ebf",
  storageBucket: "staffable-e2ebf.appspot.com",
  messagingSenderId: "227110655537",
  appId: "1:227110655537:web:6618d8d7d2bdf5dcac2710",
  measurementId: "G-79F3LN8203"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
// Explicitly pass the storage bucket URL to the getStorage function.
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);

export { app, auth, db, storage };
