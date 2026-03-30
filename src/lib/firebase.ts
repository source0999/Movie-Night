import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

function requiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Make sure it's set in .env.local and in GitHub Actions secrets.`,
    );
  }
  return value;
}

function getFirebaseConfig() {
  // Use explicit env var references so Next can inline them into the client bundle.
  const apiKey = requiredEnv(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    "NEXT_PUBLIC_FIREBASE_API_KEY",
  );
  const authDomain = requiredEnv(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  );
  const projectId = requiredEnv(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  );
  const storageBucket = requiredEnv(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  );
  const messagingSenderId = requiredEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  );
  const appId = requiredEnv(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  );

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
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

