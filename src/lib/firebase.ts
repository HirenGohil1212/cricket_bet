// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDA6f8n94qtAdQjgJOsd7ZCZjLFRQv0n14",
  authDomain: "upi11-fb31e.firebaseapp.com",
  projectId: "upi11-fb31e",
  storageBucket: "upi11-fb31e.firebasestorage.app",
  messagingSenderId: "684721069475",
  appId: "1:684721069475:web:2a59d88a0a5c5157d08e16",
  measurementId: "G-XH6GFRDTN0"
};




// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
