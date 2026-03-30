"use client";

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase config
// NOTE: This file contains your Firebase project configuration.
// Keep any secrets (if you add them later) out of client bundles.
const firebaseConfig = {
  apiKey: "AIzaSyDIJcyzecSBg7_6L-0sv1sL8KcR-pz2txI",
  authDomain: "movie-night-d674f.firebaseapp.com",
  projectId: "movie-night-d674f",
  storageBucket: "movie-night-d674f.firebasestorage.app",
  messagingSenderId: "40227626644",
  appId: "1:40227626644:web:db5494a4aac870f8dd5e81",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Export shared instances for use across the app.
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

