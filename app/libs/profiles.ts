import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  limit,
  type Firestore,
  type QuerySnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirebase } from "./firebase";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  updatedAt: number;
  createdAt?: number;
};

function profilesCollection(db: Firestore) {
  return collection(db, "profiles");
}

function profileDoc(db: Firestore, uid: string) {
  return doc(db, "profiles", uid);
}

export async function ensureUserProfile(user: User | null) {
  if (!user) return;
  const { db } = getFirebase();
  const ref = profileDoc(db, user.uid);
  const payload = {
    uid: user.uid,
    email: user.email?.toLowerCase() ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    updatedAt: Date.now(),
    createdAt: user.metadata?.creationTime ? Date.parse(user.metadata.creationTime) : Date.now(),
  } satisfies UserProfile;
  await setDoc(ref, payload, { merge: true });
}

export async function findProfileByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const { db } = getFirebase();
  const profilesQuery = query(profilesCollection(db), where("email", "==", normalized), limit(1));
  const snapshot: QuerySnapshot = await getDocs(profilesQuery);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return docSnap.data() as UserProfile;
}
