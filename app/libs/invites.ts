import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Firestore,
  type FirestoreError,
  type QueryConstraint,
} from "firebase/firestore";
import { nanoid } from "nanoid";

import { getFirebase } from "./firebase";

const INVITE_EXPIRATION_MINUTES = 60 * 24; // 24 hours

export type InviteMode = "link" | "email";

export type RoomInvite = {
  id: string;
  roomId: string;
  createdBy: string;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
  mode: InviteMode;
  memo?: string | null;
  targetEmail?: string | null;
  redeemedBy?: string | null;
  redeemedAt?: Timestamp | null;
  roomName?: string | null;
};

type CreateInviteOptions = {
  mode?: InviteMode;
  memo?: string;
  targetEmail?: string;
  expiresInMinutes?: number;
  roomName?: string;
};

type CreateInviteResult = {
  id: string;
  expiresAt: Timestamp | null;
};

function invitesCollection(db: Firestore, roomId: string) {
  return collection(db, "rooms", roomId, "invites");
}

function inviteDoc(db: Firestore, roomId: string, inviteId: string) {
  return doc(db, "rooms", roomId, "invites", inviteId);
}

export async function createRoomInvite(
  roomId: string,
  createdBy: string,
  options: CreateInviteOptions = {},
): Promise<CreateInviteResult> {
  const { db } = getFirebase();
  const inviteId = nanoid(12);
  const mode = options.mode ?? "link";
  const now = Date.now();
  const ttlMinutes = options.expiresInMinutes ?? INVITE_EXPIRATION_MINUTES;
  const expiresAt = Timestamp.fromDate(new Date(now + ttlMinutes * 60 * 1000));

  const payload = {
    roomId,
    createdBy,
    createdAt: serverTimestamp() as unknown as Timestamp,
    expiresAt,
    mode,
    memo: options.memo ?? null,
    roomName: options.roomName ?? null,
    targetEmail: mode === "email" && options.targetEmail ? options.targetEmail.trim().toLowerCase() : null,
    redeemedBy: null,
    redeemedAt: null,
  } satisfies Omit<RoomInvite, "id">;

  await setDoc(inviteDoc(db, roomId, inviteId), {
    ...payload,
    id: inviteId,
  });

  return { id: inviteId, expiresAt };
}

export async function redeemRoomInvite(
  roomId: string,
  inviteId: string,
  uid: string,
  userEmail?: string | null,
): Promise<void> {
  const { db } = getFirebase();
  const inviteRef = inviteDoc(db, roomId, inviteId);
  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(inviteRef);
    if (!snapshot.exists()) {
      throw new Error("Invite not found or already removed.");
    }

    const data = snapshot.data() as Omit<RoomInvite, "id">;
    if (data.redeemedBy) {
      throw new Error("Invite already used.");
    }
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      throw new Error("Invite has expired.");
    }
    if (data.mode === "email") {
      if (!userEmail) {
        throw new Error("Sign in with the invited email to join.");
      }
      const normalized = userEmail.trim().toLowerCase();
      if (!data.targetEmail || normalized !== data.targetEmail) {
        throw new Error("This invite is bound to a different email address.");
      }
    }

    transaction.update(inviteRef, {
      redeemedBy: uid,
      redeemedAt: serverTimestamp(),
    });

    transaction.update(roomRef, {
      allowedUids: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function revokeRoomInvite(roomId: string, inviteId: string) {
  const { db } = getFirebase();
  await deleteDoc(inviteDoc(db, roomId, inviteId));
}

export async function getRoomInvite(roomId: string, inviteId: string): Promise<RoomInvite | null> {
  const { db } = getFirebase();
  const ref = inviteDoc(db, roomId, inviteId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...(snapshot.data() as Omit<RoomInvite, "id">) };
}

export function listenToRoomInvites(
  roomId: string,
  callback: (invites: RoomInvite[]) => void,
  options: { limitTo?: number } = {},
  onError?: (error: FirestoreError) => void,
) {
  const { db } = getFirebase();
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (options.limitTo) {
    constraints.push(limit(options.limitTo));
  }
  const baseQuery = query(invitesCollection(db, roomId), ...constraints);
  return onSnapshot(
    baseQuery,
    (snapshot) => {
      const invites: RoomInvite[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<RoomInvite, "id">),
      }));
      callback(invites);
    },
    (error) => onError?.(error),
  );
}
