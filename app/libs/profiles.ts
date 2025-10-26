import {
  collection,
  doc,
  getDoc,
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
  emailLower?: string | null;
  displayNameLower?: string | null;
  searchTokens?: string[];
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
  const emailLower = user.email?.toLowerCase() ?? null;
  const displayNameLower = user.displayName ? user.displayName.toLowerCase() : null;
  const searchTokens = buildSearchTokens({
    uid: user.uid,
    email: emailLower,
    displayName: displayNameLower,
  });
  const payload = {
    uid: user.uid,
    email: emailLower,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    updatedAt: Date.now(),
    createdAt: user.metadata?.creationTime ? Date.parse(user.metadata.creationTime) : Date.now(),
    emailLower,
    displayNameLower,
    searchTokens,
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

type TokenSource = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

const MAX_PREFIX_LENGTH = 12;

function buildSearchTokens(source: TokenSource) {
  const tokens = new Set<string>();

  const pushPrefixes = (value: string | null | undefined) => {
    if (!value) return;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;
    const segments = normalized.split(/[\s@._-]+/).filter(Boolean);
    for (const segment of segments) {
      const maxLen = Math.min(segment.length, MAX_PREFIX_LENGTH);
      for (let i = 1; i <= maxLen; i++) {
        tokens.add(segment.slice(0, i));
      }
    }
  };

  pushPrefixes(source.displayName);
  pushPrefixes(source.email);
  pushPrefixes(source.uid);

  if (source.email) {
    tokens.add(source.email);
  }
  if (source.displayName) {
    tokens.add(source.displayName.trim().toLowerCase());
  }

  return Array.from(tokens).slice(0, 120);
}

export async function searchProfiles(term: string, size = 6) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [] as UserProfile[];
  const { db } = getFirebase();
  const segments = normalized.split(/[\s@._-]+/).filter(Boolean);
  const primary = segments[0];
  if (!primary) return [] as UserProfile[];

  const profilesQuery = query(
    profilesCollection(db),
    where("searchTokens", "array-contains", primary),
    limit(size * 3),
  );

  const snapshot = await getDocs(profilesQuery);
  if (snapshot.empty) return [] as UserProfile[];

  const results: UserProfile[] = [];
  snapshot.forEach((docSnap) => {
    const profile = docSnap.data() as UserProfile;
    if (!profile) return;
    const match = segments.every((segment) => {
      if (!segment) return true;
      if (profile.searchTokens?.includes(segment)) return true;
      if (profile.displayNameLower?.includes(segment)) return true;
      if (profile.emailLower?.includes(segment)) return true;
      return false;
    });
    if (match) {
      results.push(profile);
    }
  });

  results.sort((a, b) => {
    const nameA = a.displayName ?? a.email ?? a.uid;
    const nameB = b.displayName ?? b.email ?? b.uid;
    return nameA.localeCompare(nameB);
  });

  return results.slice(0, size);
}

export async function getProfilesByUids(uids: string[]) {
  const unique = Array.from(new Set(uids)).filter(Boolean);
  if (unique.length === 0) return new Map<string, UserProfile>();
  const { db } = getFirebase();
  const entries = await Promise.all(
    unique.map(async (uid) => {
      try {
        const snapshot = await getDoc(profileDoc(db, uid));
        if (!snapshot.exists()) return [uid, null] as const;
        return [uid, snapshot.data() as UserProfile] as const;
      } catch (error) {
        console.error("Failed to fetch profile", uid, error);
        return [uid, null] as const;
      }
    }),
  );
  const map = new Map<string, UserProfile>();
  for (const [uid, profile] of entries) {
    if (profile) {
      map.set(uid, profile);
    }
  }
  return map;
}
