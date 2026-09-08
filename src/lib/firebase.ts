import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { writable } from "svelte/store";
import type { User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const authUser = writable<User | null>(null);
export const authPlan = writable<string | null>(null);
export const isAuthLoading = writable<boolean>(true);

auth.onAuthStateChanged((user) => {
  authUser.set(user);
  if (user) {
    // Listen to user document for plan
    const userDocRef = doc(db, "users", user.uid);
    onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        authPlan.set(data.plan || "free");
      } else {
        authPlan.set("free");
      }
      isAuthLoading.set(false);
    }, (error) => {
      console.error("Error fetching user data:", error);
      authPlan.set("free");
      isAuthLoading.set(false);
    });
  } else {
    authPlan.set(null);
    isAuthLoading.set(false);
  }
});
