import type { Route } from "./+types/room.$roomId";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router";
import { RequireAuth } from "../components/layout/RequireAuth";
import { useSudokuGame, type NotesRecord, type SudokuSerializedState } from "../hooks/useSudokuGame";
import { SudokuGamePanel } from "../components/sudoku/GamePanel";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Share2 } from "lucide-react";
import { useRoomRealtime } from "../hooks/useRoomRealtime";
import {
  updateRoomState,
  updatePresence,
  type RoomDocument,
  type RoomMember,
} from "../libs/rooms";
import { boardToString } from "../libs/sudoku";
import type { User } from "firebase/auth";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Room ${params.roomId ?? ""} – Sudoku Together` },
    { name: "robots", content: "noindex" },
  ];
}

export default function Room() {
  const params = useParams();

  if (!params.roomId) {
    return (
      <RequireAuth>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          Invalid room identifier.
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <RoomLoader roomId={params.roomId} />
    </RequireAuth>
  );
}

function RoomLoader({ roomId }: { roomId: string }) {
  const auth = useAuth();
  const { room, members, loading } = useRoomRealtime(roomId);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading room data...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
        This room no longer exists or you don&apos;t have access.
      </div>
    );
  }

  const currentUser = auth.status === "authenticated" ? auth.user : null;

  return (
    <RoomContent room={room} members={members} roomId={roomId} currentUser={currentUser} />
  );
}

type RoomContentProps = {
  room: RoomDocument;
  members: RoomMember[];
  roomId: string;
  currentUser: User | null;
};

function RoomContent({ room, members, roomId, currentUser }: RoomContentProps) {
  const [copied, setCopied] = useState(false);
  const pendingState = useRef<SudokuSerializedState | null>(null);
  const debounceHandle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStatePersist = useCallback(
    (state: SudokuSerializedState) => {
      pendingState.current = state;
      if (debounceHandle.current) return;
      debounceHandle.current = setTimeout(() => {
        if (pendingState.current) {
          updateRoomState(roomId, pendingState.current).catch((error) =>
            console.error("Failed to sync board", error),
          );
          pendingState.current = null;
        }
        if (debounceHandle.current) {
          clearTimeout(debounceHandle.current);
          debounceHandle.current = null;
        }
      }, 150);
    },
    [roomId],
  );

  useEffect(() => {
    return () => {
      if (debounceHandle.current) {
        clearTimeout(debounceHandle.current);
        debounceHandle.current = null;
      }
      if (pendingState.current) {
        updateRoomState(roomId, pendingState.current).catch((error) =>
          console.error("Failed to flush board state", error),
        );
      }
    };
  }, [roomId]);

  const game = useSudokuGame({
    puzzle: room.puzzle,
    solution: room.solution,
    initialState: { board: room.board, notes: room.notes ?? {} },
    onChange: handleStatePersist,
  });

  const localBoardString = useMemo(() => boardToString(game.board), [game.board]);

  useEffect(() => {
    if (!room) return;
    const remoteNotes = room.notes ?? {};
    if (room.board === localBoardString && notesEqual(remoteNotes, game.notes)) return;
    game.actions.applyRemoteState({ board: room.board, notes: remoteNotes, updatedAt: Date.now() });
  }, [room, game.actions, game.notes, localBoardString]);

  useEffect(() => {
    if (!currentUser) return;
    updatePresence(roomId, currentUser.uid, {
      displayName: currentUser.displayName ?? currentUser.email ?? "Player",
      cursorIndex: game.selectedIndex,
    }).catch((error) => console.error("Failed to update presence", error));
  }, [currentUser, game.selectedIndex, roomId]);

  useEffect(() => {
    if (!currentUser) return;
    return () => {
      updatePresence(roomId, currentUser.uid, { cursorIndex: null }).catch((error) =>
        console.error("Failed to clear presence", error),
      );
    };
  }, [currentUser, roomId]);

  const peers = members.map((member) => ({
    id: member.uid,
    name: member.displayName,
    color: member.color,
    cellIndex: member.cursorIndex,
  }));

  const roomShareUrl =
    typeof window !== "undefined" ? window.location.href : `https://sudoku.local/room/${roomId}`;

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Join my Sudoku room (${roomId})`, url: roomShareUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(roomShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomId, roomShareUrl]);

  return (
    <div className="space-y-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Room code</p>
          <h1 className="text-3xl font-semibold tracking-tight">#{roomId}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Share this room with your partner and solve the puzzle together in real time.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
            Difficulty: {capitalize(room.difficulty)}
          </span>
          <Button
            variant="outline"
            icon={<Share2 className="h-4 w-4" aria-hidden="true" />}
            onClick={handleShare}
          >
            {copied ? "Link copied!" : "Share invite"}
          </Button>
        </div>
      </header>

      <SudokuGamePanel game={game} peers={peers} />

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Game timeline</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Chat, move history, and celebratory effects will appear here once real-time sync is connected.
        </p>
      </section>
    </div>
  );
}

function notesEqual(a: NotesRecord, b: NotesRecord) {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    const key = Number(keysA[i]);
    const arrA = (a as NotesRecord)[key] ?? [];
    const arrB = (b as NotesRecord)[key] ?? [];
    if (arrA.length !== arrB.length) return false;
    for (let j = 0; j < arrA.length; j++) {
      if (arrA[j] !== arrB[j]) return false;
    }
  }
  return true;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
