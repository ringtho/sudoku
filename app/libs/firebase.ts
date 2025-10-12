import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
};

let services: FirebaseServices | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export function getFirebase(): FirebaseServices {
  if (services) return services;

  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
    throw new Error("Firebase environment variables are not configured.");
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  let db: Firestore;

  if (typeof window !== "undefined") {
    try {
      db = initializeFirestore(
        app,
        {
          cache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        } as Record<string, unknown>,
      );
    } catch (error) {
      db = getFirestore(app);
    }
  } else {
    db = getFirestore(app);
  }
  const googleProvider = new GoogleAuthProvider();

  services = { app, auth, db, googleProvider };
  return services;
}

export async function signInWithGooglePopup() {
  const { auth, googleProvider } = getFirebase();
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  const { auth } = getFirebase();
  await signOut(auth);
}

export function observeAuthState(callback: (user: User | null) => void) {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, callback);
}
