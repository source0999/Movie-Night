import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

// Firebase config
// NOTE: This file contains your Firebase project configuration.
// Keep any secrets (if you add them later) out of client bundles.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyDIJcyzecSBg7_6L-0sv1sL8KcR-pz2txI",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "movie-night-d674f.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "movie-night-d674f",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "movie-night-d674f.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "40227626644",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:40227626644:web:db5494a4aac870f8dd5e81",
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

function ensureInitialized() {
  if (firebaseApp && firestoreDb && firebaseAuth) {
    return { db: firestoreDb, auth: firebaseAuth };
  }

  firebaseApp = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);
  firebaseAuth = getAuth(firebaseApp);

  return { db: firestoreDb, auth: firebaseAuth };
}

// Initialize (or return the existing) shared Firebase instances.
// IMPORTANT: call this from client code (e.g., inside a useEffect) so
// static builds don't execute any Firebase initialization during render.
export function initFirebase() {
  return ensureInitialized();
}

// Optional helpers for call sites that need direct access.
export function getDb() {
  return ensureInitialized().db;
}

export function getFirebaseAuth() {
  return ensureInitialized().auth;
}

