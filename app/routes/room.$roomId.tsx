import type { Route } from "./+types/room.$roomId";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { RequireAuth } from "../components/layout/RequireAuth";
import { useSudokuGame, type NotesRecord, type SudokuSerializedState, indexToRowColumn } from "../hooks/useSudokuGame";
import { SudokuGamePanel } from "../components/sudoku/GamePanel";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Share2, X, MessageCircle } from "lucide-react";
import { useRoomRealtime } from "../hooks/useRoomRealtime";
import {
  updateRoomState,
  updatePresence,
  sendRoomMessage,
  sendRoomMove,
  sendRoomSystemEvent,
  updateRoomStatus,
  saveRoomMatchSummary,
  startRoomRematch,
  type RoomDocument,
  type RoomMember,
  type RoomEvent,
  type RoomStatus,
  type RoomMatchSummaryInput,
} from "../libs/rooms";
import { boardToString } from "../libs/sudoku";
import type { User } from "firebase/auth";
import { RoomChat } from "../components/chat/RoomChat";
import { RoomAccessPanel } from "../components/room/RoomAccessPanel";
import { MatchTimeline } from "../components/timeline/MatchTimeline";
import { ConfettiBurst } from "../components/effects/ConfettiBurst";
import { usePreferences } from "../contexts/PreferencesContext";
import { useUnreadChat } from "../hooks/useUnreadChat";

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
  const { room, members, events, loading, error } = useRoomRealtime(roomId);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading room data...</p>
      </div>
    );
  }

  if (error && error.code === "permission-denied") {
    const currentUser = auth.status === "authenticated" ? auth.user : null;
    return <RoomAccessDenied currentUser={currentUser} />;
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
    <RoomContent
      room={room}
      members={members}
      events={events}
      roomId={roomId}
      currentUser={currentUser}
    />
  );
}

type RoomContentProps = {
  room: RoomDocument;
  members: RoomMember[];
  events: RoomEvent[];
  roomId: string;
  currentUser: User | null;
};

type ChatEvent = Extract<RoomEvent, { type: "chat" }>;

function RoomContent({ room, members, events, roomId, currentUser }: RoomContentProps) {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileTimeline, setShowMobileTimeline] = useState(false);
  const [rematchStatus, setRematchStatus] = useState<"idle" | "starting" | "error">("idle");
  const { preferences } = usePreferences();
  const currentUserId = currentUser?.uid ?? null;
  const allowedUids = room.allowedUids ?? [];
  const isOwner = currentUserId === room.ownerUid;
  const isAllowed = Boolean(currentUserId && (isOwner || allowedUids.includes(currentUserId)));

  if (!isAllowed) {
    return <RoomAccessDenied currentUser={currentUser} />;
  }
  const pendingState = useRef<SudokuSerializedState | null>(null);
  const debounceHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimeout = useRef<number | null>(null);
  const hasCelebrated = useRef(false);
  const lastMoveActor = useRef<string | null>(null);
  const lastMoveActorName = useRef<string | null>(null);
  const lastMoveIndex = useRef<number | null>(null);
  const lastMoveWasCorrect = useRef(false);
  const hintActionRef = useRef(false);
  const hasActivated = useRef(room.status !== "waiting");
  const statusRef = useRef<RoomStatus>(room.status);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const totalCorrectRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const idleNotifiedRef = useRef(false);
  const joinAnnouncedRef = useRef(false);
  const sharedCellNotificationRef = useRef<Map<number, number>>(new Map());
  const startTimeRef = useRef<number>(Date.now());
  const completedDurationRef = useRef<number | null>(null);
  const previousRoomIdRef = useRef<string>(roomId);
  const previousStatusRef = useRef<RoomStatus>(room.status);
  const [matchSummary, setMatchSummary] = useState<RoomMatchSummaryInput | null>(() => {
    const summary = room.matchSummary;
    if (!summary) return null;
    return {
      durationMs: summary.durationMs ?? null,
      correctMoves: typeof summary.correctMoves === "number" ? summary.correctMoves : 0,
      bestStreak: typeof summary.bestStreak === "number" ? summary.bestStreak : 0,
      hintsUsed: typeof summary.hintsUsed === "number" ? summary.hintsUsed : null,
    };
  });
  const hasPersistedSummaryRef = useRef(Boolean(room.matchSummary));
  const persistSummaryInFlightRef = useRef(false);

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

  useEffect(() => {
    const summary = room.matchSummary;
    hasPersistedSummaryRef.current = Boolean(summary);
    if (!summary) {
      setMatchSummary((previous) => (previous === null ? previous : null));
      return;
    }
    const normalized: RoomMatchSummaryInput = {
      durationMs: summary.durationMs ?? null,
      correctMoves: typeof summary.correctMoves === "number" ? summary.correctMoves : 0,
      bestStreak: typeof summary.bestStreak === "number" ? summary.bestStreak : 0,
      hintsUsed: typeof summary.hintsUsed === "number" ? summary.hintsUsed : null,
    };
    setMatchSummary((previous) => {
      if (
        previous &&
        previous.durationMs === normalized.durationMs &&
        previous.correctMoves === normalized.correctMoves &&
        previous.bestStreak === normalized.bestStreak &&
        previous.hintsUsed === normalized.hintsUsed
      ) {
        return previous;
      }
      return normalized;
    });
  }, [room.matchSummary]);

  useEffect(() => {
    if (!matchSummary) return;
    if (room.matchSummary) return;
    if (hasPersistedSummaryRef.current || persistSummaryInFlightRef.current) return;
    persistSummaryInFlightRef.current = true;
    (async () => {
      try {
        await saveRoomMatchSummary(roomId, matchSummary);
        hasPersistedSummaryRef.current = true;
      } catch (error) {
        console.error("Failed to persist match summary", error);
      } finally {
        persistSummaryInFlightRef.current = false;
      }
    })();
  }, [matchSummary, room.matchSummary, roomId]);

  const game = useSudokuGame({
    puzzle: room.puzzle,
    solution: room.solution,
    initialState: { board: room.board, notes: room.notes ?? {} },
    onChange: handleStatePersist,
    onMove: ({ index, previousValue, nextValue }) => {
      if (!currentUser) return;
      const wasHint = hintActionRef.current;
      hintActionRef.current = false;
      const expectedChar = room.solution[index];
      const expectedValue = Number.parseInt(expectedChar ?? "", 10);
      const correct = nextValue !== null && Number.isInteger(expectedValue) && expectedValue === nextValue;
      sendRoomMove(roomId, {
        cellIndex: index,
        value: nextValue,
        correct,
        actorUid: currentUser.uid,
        actorName: currentUser.displayName ?? currentUser.email ?? "Player",
      }).catch((error) => {
        console.error("Failed to log move", error);
      });

      lastActivityRef.current = Date.now();
      idleNotifiedRef.current = false;

      if (!hasActivated.current && nextValue !== null) {
        hasActivated.current = true;
        startTimeRef.current = Date.now();
        streakRef.current = 0;
        bestStreakRef.current = 0;
        totalCorrectRef.current = 0;
        if (statusRef.current !== "active") {
          statusRef.current = "active";
          updateRoomStatus(roomId, "active").catch((error) =>
            console.error("Failed to mark room active", error),
          );
        }
      }

      lastMoveActor.current = currentUser.uid;
      lastMoveActorName.current = currentUser.displayName ?? currentUser.email ?? "Player";
      lastMoveIndex.current = index;
      lastMoveWasCorrect.current = correct && nextValue !== null;

      if (previousValue !== null && nextValue === null) {
        const { row, column } = indexToRowColumn(index);
        sendRoomSystemEvent(roomId, {
          text: `${lastMoveActorName.current ?? "Someone"} cleared r${row}c${column}.`,
          level: "info",
          actorUid: currentUser.uid,
          actorName: lastMoveActorName.current ?? "Player",
        }).catch((error) => console.error("Failed to log clear event", error));
        streakRef.current = 0;
      } else if (nextValue !== null) {
        if (correct) {
          if (!wasHint) {
            streakRef.current += 1;
            totalCorrectRef.current += 1;
            bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
            if ([3, 5, 10].includes(streakRef.current)) {
              const { row, column } = indexToRowColumn(index);
              sendRoomSystemEvent(roomId, {
                text: `${lastMoveActorName.current ?? "Your team"} hit a ${streakRef.current}-move streak (latest r${row}c${column})!`,
                level: "success",
                actorUid: currentUser.uid,
                actorName: lastMoveActorName.current ?? "Player",
              }).catch((error) => console.error("Failed to log streak event", error));
            }
          }
        } else {
          streakRef.current = 0;
        }
      }
    },
  });

  const peers = members.map((member) => ({
    id: member.uid,
    name: member.displayName,
    color: member.color,
    cellIndex: member.cursorIndex,
  }));

  const chatEvents = useMemo(
    () => events.filter((event): event is ChatEvent => event.type === "chat") as ChatEvent[],
    [events],
  );
  const unreadChatCount = useUnreadChat(chatEvents, showMobileChat, currentUserId, roomId);
  const currentMember = members.find((member) => member.uid === currentUserId) ?? null;
  const currentMemberColor = currentMember?.color;

  const localBoardString = useMemo(() => boardToString(game.board), [game.board]);

  useEffect(() => {
    if (!room) return;
    const remoteNotes = room.notes ?? {};
    if (room.board === localBoardString && notesEqual(remoteNotes, game.notes)) return;
    game.actions.applyRemoteState({ board: room.board, notes: remoteNotes, updatedAt: Date.now() });
  }, [room, game.actions, game.notes, localBoardString]);

  useEffect(() => {
    if (!currentUser) return;
    const payload: Partial<Omit<RoomMember, "uid">> = {
      displayName: currentUser.displayName ?? currentUser.email ?? "Player",
      cursorIndex: game.selectedIndex,
      isTyping: false,
    };
    if (currentMemberColor) {
      payload.color = currentMemberColor;
    }
    updatePresence(roomId, currentUser.uid, payload).catch((error) =>
      console.error("Failed to update presence", error),
    );
  }, [currentMemberColor, currentUser, game.selectedIndex, roomId]);

  useEffect(() => {
    if (!currentUser) return;
    return () => {
      const payload: Partial<Omit<RoomMember, "uid">> = { cursorIndex: null, isTyping: false };
      if (currentMemberColor) {
        payload.color = currentMemberColor;
      }
      updatePresence(roomId, currentUser.uid, payload).catch((error) =>
        console.error("Failed to clear presence", error),
      );
    };
  }, [currentMemberColor, currentUser, roomId]);

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

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!currentUser) return;
      await sendRoomMessage(roomId, {
        text,
        actorUid: currentUser.uid,
        actorName: currentUser.displayName ?? currentUser.email ?? "Player",
      });
    },
    [currentUser, roomId],
  );

  const handleRequestHint = useCallback(() => {
    if (!preferences.allowHints) return;
    if (hintsRemaining <= 0) return;
    hintActionRef.current = true;
    let targetIndex = game.selectedIndex;
    if (game.selectedIndex === null) {
      const nextIndex = game.board.findIndex((value, index) => value === null && !game.givenMap[index]);
      if (nextIndex !== -1) {
        game.actions.selectCell(nextIndex);
        targetIndex = nextIndex;
      } else {
        hintActionRef.current = false;
        return;
      }
    }
    const result = game.actions.requestHint();
    if (result !== null) {
      setHintsRemaining((prev) => Math.max(prev - 1, 0));
      if (currentUser && targetIndex !== null) {
        const { row, column } = indexToRowColumn(targetIndex);
        sendRoomSystemEvent(roomId, {
          text: `${currentUser.displayName ?? currentUser.email ?? "A teammate"} used a hint at r${row}c${column}.`,
          level: "warning",
          actorUid: currentUser.uid,
          actorName: currentUser.displayName ?? currentUser.email ?? "Player",
        }).catch((error) => console.error("Failed to log hint system event", error));
      }
    }
    hintActionRef.current = false;
  }, [currentUser, game.actions, game.board, game.givenMap, game.selectedIndex, hintsRemaining, preferences.allowHints, roomId]);

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      if (!currentUser) return;
      const payload: Partial<Omit<RoomMember, "uid">> = {
        displayName: currentUser.displayName ?? currentUser.email ?? "Player",
        cursorIndex: game.selectedIndex,
        isTyping,
      };
      if (currentMemberColor) {
        payload.color = currentMemberColor;
      }
      updatePresence(roomId, currentUser.uid, payload).catch((error) =>
        console.error("Failed to update typing presence", error),
      );
    },
    [currentMemberColor, currentUser, game.selectedIndex, roomId],
  );

  useEffect(() => {
    if (!currentUser) return;
    handleTypingChange(false);
  }, [currentUser, handleTypingChange]);

  const handleRematch = useCallback(async () => {
    if (!currentUser) return;
    setRematchStatus("starting");
    try {
      await startRoomRematch(
        roomId,
        room.difficulty,
        currentUser.uid,
        currentUser.displayName ?? currentUser.email ?? "Player",
      );
      setRematchStatus("idle");
      setShowMobileChat(false);
      setShowMobileTimeline(false);
      setHintsRemaining(3);
      hasCelebrated.current = false;
      streakRef.current = 0;
      bestStreakRef.current = 0;
      totalCorrectRef.current = 0;
      startTimeRef.current = Date.now();
      completedDurationRef.current = null;
      lastActivityRef.current = Date.now();
      idleNotifiedRef.current = false;
      statusRef.current = "waiting";
      hasActivated.current = false;
      setMatchSummary(null);
    } catch (error) {
      console.error("Failed to start rematch", error);
      setRematchStatus("error");
    }
  }, [currentUser, room.difficulty, roomId]);

  useEffect(() => {
    const previousRoomId = previousRoomIdRef.current;
    const previousStatus = previousStatusRef.current;
    const roomChanged = roomId !== previousRoomId;
    const statusChanged = room.status !== previousStatus;
    const shouldReset = roomChanged || (statusChanged && room.status !== "completed");

    previousRoomIdRef.current = roomId;
    previousStatusRef.current = room.status;
    statusRef.current = room.status;

    if (!shouldReset) {
      return;
    }

    hasPersistedSummaryRef.current = Boolean(room.matchSummary);
    setHintsRemaining(3);
    hasCelebrated.current = false;
    lastMoveActor.current = null;
    lastMoveActorName.current = null;
    lastMoveIndex.current = null;
    lastMoveWasCorrect.current = false;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    totalCorrectRef.current = 0;
    lastActivityRef.current = Date.now();
    idleNotifiedRef.current = false;
    joinAnnouncedRef.current = false;
    sharedCellNotificationRef.current.clear();
    startTimeRef.current = Date.now();
    completedDurationRef.current = null;
    setMatchSummary(null);
  }, [roomId, room.status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (game.isComplete && !hasCelebrated.current) {
      hasCelebrated.current = true;
      if (
        currentUser &&
        lastMoveActor.current === currentUser.uid &&
        lastMoveWasCorrect.current &&
        lastMoveIndex.current !== null
      ) {
        const { row, column } = indexToRowColumn(lastMoveIndex.current);
        sendRoomSystemEvent(roomId, {
          text: `${lastMoveActorName.current ?? "Your team"} completed the puzzle at r${row}c${column}!`,
          level: "success",
          actorUid: currentUser.uid,
          actorName: lastMoveActorName.current ?? "Player",
        }).catch((error) => console.error("Failed to record completion event", error));
      }
      if (room.status !== "completed") {
        updateRoomStatus(roomId, "completed").catch((error) =>
          console.error("Failed to update room status to completed", error),
        );
      }
      if (!completedDurationRef.current) {
        completedDurationRef.current = Date.now() - startTimeRef.current;
      }
      const hintsUsedValue = preferences.allowHints ? Math.max(0, 3 - hintsRemaining) : null;
      const summaryPayload: RoomMatchSummaryInput = {
        durationMs: completedDurationRef.current,
        correctMoves: totalCorrectRef.current,
        bestStreak: bestStreakRef.current,
        hintsUsed: hintsUsedValue,
      };
      setMatchSummary(summaryPayload);
      setShowConfetti(true);
      celebrationTimeout.current = window.setTimeout(() => {
        setShowConfetti(false);
        celebrationTimeout.current = null;
      }, 3500);
    } else if (!game.isComplete) {
      hasCelebrated.current = false;
    }
  }, [currentUser, game.isComplete, roomId]);

  useEffect(() => {
    if (!currentUser || joinAnnouncedRef.current) return;
    joinAnnouncedRef.current = true;
    sendRoomSystemEvent(roomId, {
      text: `${currentUser.displayName ?? currentUser.email ?? "Someone"} joined the room.`,
      level: "info",
      actorUid: currentUser.uid,
      actorName: currentUser.displayName ?? currentUser.email ?? "Player",
    }).catch((error) => console.error("Failed to log join event", error));
    return () => {
      sendRoomSystemEvent(roomId, {
        text: `${currentUser.displayName ?? currentUser.email ?? "Someone"} left the room.`,
        level: "info",
        actorUid: currentUser.uid,
        actorName: currentUser.displayName ?? currentUser.email ?? "Player",
      }).catch((error) => console.error("Failed to log leave event", error));
    };
  }, [currentUser, roomId]);

  useEffect(() => {
    window.clearInterval(idleTimerRef.current ?? undefined);
    idleTimerRef.current = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= 5 * 60 * 1000 && !idleNotifiedRef.current) {
        idleNotifiedRef.current = true;
        sendRoomSystemEvent(roomId, {
          text: "No moves for 5 minutes—take a breather or try a new approach!",
          level: "info",
        }).catch((error) => console.error("Failed to log idle reminder", error));
      }
    }, 60 * 1000);
    return () => {
      window.clearInterval(idleTimerRef.current ?? undefined);
    };
  }, [roomId]);

  useEffect(() => {
    const sharedCells = peers.reduce<Map<number, { count: number; names: string[] }>>((map, peer) => {
      if (peer.cellIndex === null) return map;
      const entry = map.get(peer.cellIndex) ?? { count: 0, names: [] };
      entry.count += 1;
      entry.names.push(peer.name ?? "Someone");
      map.set(peer.cellIndex, entry);
      return map;
    }, new Map());

    sharedCells.forEach((info, cellIndex) => {
      if (info.count >= 2) {
        const lastNotified = sharedCellNotificationRef.current.get(cellIndex) ?? 0;
        if (Date.now() - lastNotified > 60 * 1000) {
          const { row, column } = indexToRowColumn(cellIndex);
          sendRoomSystemEvent(roomId, {
            text: `${info.names.slice(0, 2).join(" & ")} are both focused on r${row}c${column}. Coordinate your move!`,
            level: "warning",
          }).catch((error) => console.error("Failed to log shared cell event", error));
          sharedCellNotificationRef.current.set(cellIndex, Date.now());
        }
      } else {
        sharedCellNotificationRef.current.delete(cellIndex);
      }
    });
  }, [peers, roomId]);

  useEffect(() => {
    if (game.isComplete && statusRef.current !== "completed") {
      statusRef.current = "completed";
      updateRoomStatus(roomId, "completed").catch((error) =>
        console.error("Failed to update room status to completed", error),
      );
      return;
    }
    if (!game.isComplete) {
      const hasProgress = game.board.some((value, index) => !game.givenMap[index] && value !== null);
      if (hasProgress && statusRef.current !== "active") {
        statusRef.current = "active";
        updateRoomStatus(roomId, "active").catch((error) =>
          console.error("Failed to update room status to active", error),
        );
      }
    }
  }, [game.board, game.givenMap, game.isComplete, roomId]);

  useEffect(() => {
    return () => {
      if (celebrationTimeout.current) {
        window.clearTimeout(celebrationTimeout.current);
        celebrationTimeout.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-10">
      {showConfetti ? <ConfettiBurst /> : null}
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

      <section className="hidden gap-6 items-start lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SudokuGamePanel
            game={game}
            peers={peers}
            onHint={handleRequestHint}
            hintsLeft={hintsRemaining}
            highlightColor={preferences.highlightColor}
            showPresenceBadges={preferences.showPresenceBadges}
            allowHints={preferences.allowHints}
          />
          <MatchTimeline events={events} members={members} />
        </div>
        <div className="space-y-6">
          <RoomChat
            events={chatEvents}
            members={members}
            currentUserId={currentUserId}
            onSend={handleSendMessage}
            onTypingChange={handleTypingChange}
            showTypingIndicators={preferences.showPresenceBadges}
          />
          {isOwner ? (
            <RoomAccessPanel
              roomId={roomId}
              roomName={room.name}
              ownerUid={room.ownerUid}
              allowedUids={allowedUids}
              currentUid={currentUserId ?? ""}
            />
          ) : null}
        </div>
      </section>

      <div className="space-y-4 lg:hidden">
        <SudokuGamePanel
          game={game}
          peers={peers}
          onHint={handleRequestHint}
          hintsLeft={hintsRemaining}
          highlightColor={preferences.highlightColor}
          showPresenceBadges={preferences.showPresenceBadges}
          allowHints={preferences.allowHints}
        />
        <div className="flex gap-3">
          <Button className="flex-1" variant="outline" onClick={() => setShowMobileTimeline(true)}>
            View timeline
          </Button>
        </div>
        {isOwner ? (
          <RoomAccessPanel
            roomId={roomId}
            roomName={room.name}
            ownerUid={room.ownerUid}
            allowedUids={allowedUids}
            currentUid={currentUserId ?? ""}
          />
        ) : null}
      </div>

      {matchSummary ? (
        <MatchSummary
          durationMs={matchSummary.durationMs}
          correctMoves={matchSummary.correctMoves}
          bestStreak={matchSummary.bestStreak}
          hintsUsed={matchSummary.hintsUsed}
          onRematch={handleRematch}
          rematchStatus={rematchStatus}
        />
      ) : null}

      {showMobileChat ? (
        <MobileSheet title="Room chat" onClose={() => setShowMobileChat(false)}>
          <RoomChat
            events={chatEvents}
            members={members}
            currentUserId={currentUserId}
            onSend={handleSendMessage}
            onTypingChange={handleTypingChange}
            showTypingIndicators={preferences.showPresenceBadges}
            variant="sheet"
            className="flex-1 max-h-[70vh]"
          />
        </MobileSheet>
      ) : null}

      {showMobileTimeline ? (
        <MobileSheet title="Match timeline" onClose={() => setShowMobileTimeline(false)}>
          <MatchTimeline events={events} members={members} />
        </MobileSheet>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setShowMobileChat(true);
        }}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 lg:hidden"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
        {unreadChatCount > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
            {unreadChatCount > 99 ? "99+" : unreadChatCount}
          </span>
        ) : null}
      </button>
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

type MobileSheetProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

function MobileSheet({ title, children, onClose }: MobileSheetProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 px-4 pb-4 pt-12 lg:hidden" role="dialog" aria-modal="true">
      <div className="mb-4 flex justify-center">
        <span className="h-1.5 w-16 rounded-full bg-white/70" />
      </div>
      <div className="relative mt-auto flex h-full w-full max-h-[80vh] min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-100"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="flex h-full min-h-0 flex-col">
          {children}
        </div>
      </div>
      <button className="absolute inset-0 -z-10" type="button" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

function RoomAccessDenied({ currentUser }: { currentUser: User | null }) {
  const uid = currentUser?.uid ?? "Sign in to view your UID";
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      <div>
        <h2 className="text-lg font-semibold">Access required</h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
          Only the host can grant access to this private room. Share your user ID with them so they can add you.
        </p>
      </div>
      <div className="space-y-2 rounded-2xl bg-white p-4 text-xs text-gray-600 shadow-sm dark:bg-slate-900 dark:text-gray-300">
        <p className="font-medium text-gray-700 dark:text-gray-200">Your user ID</p>
        <p className="break-all font-mono text-[11px]">{uid}</p>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={async () => {
            try {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(uid);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            } catch (error) {
              console.error("Failed to copy UID", error);
            }
          }}
        >
          {copied ? "Copied" : "Copy ID"}
        </Button>
      </div>
      <p className="text-xs text-amber-800 dark:text-amber-200">
        Already added? Reload the page once the host confirms they&apos;ve granted you access.
      </p>
    </div>
  );
}

type MatchSummaryProps = {
  durationMs: number | null;
  correctMoves: number;
  bestStreak: number;
  hintsUsed: number | null;
  onRematch: () => void;
  rematchStatus: "idle" | "starting" | "error";
};

function MatchSummary({ durationMs, correctMoves, bestStreak, hintsUsed, onRematch, rematchStatus }: MatchSummaryProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Match summary</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review the highlights from this puzzle.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onRematch}
            disabled={rematchStatus === "starting"}
          >
            {rematchStatus === "starting" ? "Starting…" : "Rematch"}
          </Button>
        </div>
      </header>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Duration" value={formatDuration(durationMs)} />
        <SummaryCard label="Correct moves" value={`${correctMoves}`} />
        <SummaryCard label="Best streak" value={`${bestStreak}`} />
        <SummaryCard label="Hints used" value={hintsUsed === null ? "—" : `${hintsUsed}`} />
      </div>
      {rematchStatus === "error" ? (
        <p className="mt-3 text-xs text-rose-500">We couldn’t start a rematch. Try again in a moment.</p>
      ) : null}
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function formatDuration(durationMs: number | null) {
  if (!durationMs || durationMs < 1000) return "—";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}
