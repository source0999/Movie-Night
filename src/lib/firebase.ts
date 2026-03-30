import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Make sure it's set in .env.local and in GitHub Actions secrets.`,
    );
  }
  return value;
}

function getFirebaseConfig() {
  return {
    apiKey: requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: requiredEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: requiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requiredEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requiredEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

function ensureInitialized() {
  if (firebaseApp && firestoreDb && firebaseAuth) {
    return { db: firestoreDb, auth: firebaseAuth };
  }

  firebaseApp = initializeApp(getFirebaseConfig());
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

