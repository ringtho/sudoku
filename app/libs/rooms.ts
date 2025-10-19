import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
  type DocumentSnapshot,
  type Timestamp,
  type QueryConstraint,
  type FirestoreError,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import { generateSudoku, type Difficulty } from "./sudoku";
import type { NotesRecord, SudokuSerializedState } from "../hooks/useSudokuGame";

export type RoomStatus = "waiting" | "active" | "completed";

export type RoomDocument = {
  id: string;
  name: string;
  ownerUid: string;
  ownerName: string;
  ownerColor?: string;
  difficulty: Difficulty;
  status: RoomStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  puzzle: string;
  solution: string;
  board: string;
  notes: NotesRecord;
  allowedUids: string[];
};

export type RoomMember = {
  uid: string;
  displayName: string;
  color: string;
  cursorIndex: number | null;
  lastActive: Timestamp | null;
  isTyping?: boolean;
};

export type CreateRoomInput = {
  name: string;
  difficulty: Difficulty;
  ownerUid: string;
  ownerName: string;
  ownerColor?: string;
};

const ROOM_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#a855f7",
  "#facc15",
];

function assignColor(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ROOM_COLORS.length;
  return ROOM_COLORS[index];
}

function roomsCollection(db: Firestore) {
  return collection(db, "rooms");
}

function roomDoc(db: Firestore, roomId: string) {
  return doc(roomsCollection(db), roomId);
}

function membersCollection(db: Firestore, roomId: string) {
  return collection(roomDoc(db, roomId), "members");
}

export async function createRoom({ name, difficulty, ownerUid, ownerName, ownerColor }: CreateRoomInput) {
  const { db } = getFirebase();
  const { puzzle, solution } = generateSudoku(difficulty, `${ownerUid}-${Date.now()}`);

  const roomRef = await addDoc(roomsCollection(db), {
    name,
    ownerUid,
    ownerName,
    ownerColor: ownerColor ?? assignColor(ownerUid),
    difficulty,
    status: "waiting" satisfies RoomStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    puzzle,
    solution,
    board: puzzle,
    notes: {},
    allowedUids: [ownerUid],
  });

  const memberRef = doc(membersCollection(db, roomRef.id), ownerUid);
  await setDoc(memberRef, {
    displayName: ownerName,
    color: ownerColor ?? assignColor(ownerUid),
    cursorIndex: null,
    lastActive: serverTimestamp(),
    isTyping: false,
  });

  return roomRef.id;
}

export async function updateRoomState(roomId: string, state: SudokuSerializedState) {
  const { db } = getFirebase();
  const docRef = roomDoc(db, roomId);
  await updateDoc(docRef, {
    board: state.board,
    notes: state.notes,
    updatedAt: serverTimestamp(),
  });
}

export type ListenToRoomsOptions = {
  viewerUid: string;
  ownerUid?: string;
  limitTo?: number;
};

export function listenToRooms(
  options: ListenToRoomsOptions,
  callback: (rooms: RoomDocument[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const constraints: QueryConstraint[] = [];
  if (options.ownerUid) {
    constraints.push(where("ownerUid", "==", options.ownerUid));
  } else {
    constraints.push(where("allowedUids", "array-contains", options.viewerUid));
  }
  const baseQuery = constraints.length > 0 ? query(roomsCollection(db), ...constraints) : roomsCollection(db);

  return onSnapshot(
    baseQuery,
    (snapshot) => {
      const rooms = snapshot.docs.map(transformRoomSnapshot);
      rooms.sort((a, b) => {
        const aTime = a.updatedAt ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
      const limitedRooms = options.limitTo ? rooms.slice(0, options.limitTo) : rooms;
      callback(limitedRooms);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function listenToRoom(
  roomId: string,
  callback: (room: RoomDocument | null) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(
    roomDoc(db, roomId),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(transformRoomSnapshot(snapshot));
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function listenToRoomMembers(
  roomId: string,
  callback: (members: RoomMember[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const membersQuery = query(membersCollection(db, roomId), orderBy("displayName", "asc"));
  return onSnapshot(
    membersQuery,
    (snapshot) => {
      const members = snapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        ...(docSnap.data() as Omit<RoomMember, "uid">),
      }));
      callback(members);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function updatePresence(
  roomId: string,
  uid: string,
  data: Partial<Omit<RoomMember, "uid">>,
) {
  const { db } = getFirebase();
  const memberRef = doc(membersCollection(db, roomId), uid);
  const payload: Record<string, unknown> = {
    color: data.color ?? assignColor(uid),
    cursorIndex: data.cursorIndex ?? null,
    lastActive: serverTimestamp(),
  };
  if (data.displayName !== undefined) {
    payload.displayName = data.displayName;
  }
  if (data.isTyping !== undefined) {
    payload.isTyping = data.isTyping;
  }
  await setDoc(
    memberRef,
    payload,
    { merge: true },
  );
}

export type RoomEvent =
  | {
      id: string;
      type: "chat";
      text: string;
      createdAt: Timestamp | null;
      actorUid: string;
      actorName: string;
    }
  | {
      id: string;
      type: "system";
      text: string;
      createdAt: Timestamp | null;
      level?: "info" | "success" | "warning";
      actorUid?: string;
      actorName?: string;
    }
  | {
      id: string;
      type: "move";
      cellIndex: number;
      value: number | null;
      correct: boolean;
      actorUid: string;
      actorName: string;
      createdAt: Timestamp | null;
    };

function eventsCollection(db: Firestore, roomId: string) {
  return collection(roomDoc(db, roomId), "events");
}

export function listenToRoomEvents(
  roomId: string,
  callback: (events: RoomEvent[]) => void,
  options: { limitTo?: number } = {},
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (options.limitTo) {
    constraints.push(limit(options.limitTo));
  }
  const eventsQuery = query(eventsCollection(db, roomId), ...constraints);
  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      const nextEvents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return { id: docSnap.id, ...(data as Omit<RoomEvent, "id">) } as RoomEvent;
      });
      callback(nextEvents.reverse());
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function sendRoomMessage(roomId: string, data: { text: string; actorUid: string; actorName: string }) {
  const { db } = getFirebase();
  await addDoc(eventsCollection(db, roomId), {
    type: "chat",
    text: data.text,
    actorUid: data.actorUid,
    actorName: data.actorName,
    createdAt: serverTimestamp(),
  });
}

export async function sendRoomMove(
  roomId: string,
  data: { cellIndex: number; value: number | null; correct: boolean; actorUid: string; actorName: string },
) {
  const { db } = getFirebase();
  await addDoc(eventsCollection(db, roomId), {
    type: "move",
    cellIndex: data.cellIndex,
    value: data.value,
    correct: data.correct,
    actorUid: data.actorUid,
    actorName: data.actorName,
    createdAt: serverTimestamp(),
  });
}

export async function sendRoomSystemEvent(
  roomId: string,
  data: { text: string; level?: "info" | "success" | "warning"; actorUid?: string; actorName?: string },
) {
  const { db } = getFirebase();
  await addDoc(eventsCollection(db, roomId), {
    type: "system",
    text: data.text,
    level: data.level ?? "info",
    actorUid: data.actorUid ?? null,
    actorName: data.actorName ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function updateRoomStatus(roomId: string, status: RoomStatus) {
  const { db } = getFirebase();
  const docRef = roomDoc(db, roomId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function allowRoomParticipant(roomId: string, targetUid: string) {
  const { db } = getFirebase();
  const docRef = roomDoc(db, roomId);
  await updateDoc(docRef, {
    allowedUids: arrayUnion(targetUid),
    updatedAt: serverTimestamp(),
  });
}

export async function revokeRoomParticipant(roomId: string, targetUid: string) {
  const { db } = getFirebase();
  const docRef = roomDoc(db, roomId);
  await updateDoc(docRef, {
    allowedUids: arrayRemove(targetUid),
    updatedAt: serverTimestamp(),
  });
}

export async function startRoomRematch(
  roomId: string,
  difficulty: Difficulty,
  actorUid: string,
  actorName: string,
) {
  const { db } = getFirebase();
  const { puzzle, solution } = generateSudoku(difficulty, `${roomId}-${Date.now()}`);

  const docRef = roomDoc(db, roomId);
  await updateDoc(docRef, {
    puzzle,
    solution,
    board: puzzle,
    notes: {},
    status: "waiting" satisfies RoomStatus,
    updatedAt: serverTimestamp(),
  });

  await addDoc(eventsCollection(db, roomId), {
    type: "system",
    text: `${actorName} started a rematch! Fresh puzzle ready.`,
    level: "info",
    actorUid,
    actorName,
    createdAt: serverTimestamp(),
  });
}

function transformRoomSnapshot(snapshot: DocumentSnapshot): RoomDocument {
  const data = snapshot.data() as Omit<RoomDocument, "id"> | undefined;
  if (!data) {
    return {
      id: snapshot.id,
      name: "Untitled",
      ownerUid: "",
      ownerName: "",
      difficulty: "medium",
      status: "waiting",
      createdAt: null,
      updatedAt: null,
      puzzle: "".padEnd(81, "."),
      solution: "".padEnd(81, "1"),
      board: "".padEnd(81, "."),
      ownerColor: undefined,
      notes: {},
      allowedUids: [],
    } satisfies RoomDocument;
  }
  return {
    id: snapshot.id,
    ...data,
    ownerName: data.ownerName ?? "",
    ownerColor: data.ownerColor,
    allowedUids: data.allowedUids ?? [data.ownerUid],
  } satisfies RoomDocument;
}
