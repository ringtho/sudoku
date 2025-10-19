import type { Route } from "./+types/lobby";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { RequireAuth } from "../components/layout/RequireAuth";
import { Button } from "../components/ui/button";
import { useRoomsList } from "../hooks/useRoomsList";
import { useAuth } from "../contexts/AuthContext";
import type { Difficulty } from "../libs/sudoku";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Lobby – Sudoku Together" },
    { name: "description", content: "Browse or create Sudoku rooms to play with friends." },
  ];
}

export default function Lobby() {
  const auth = useAuth();
  const currentUser = auth.status === "authenticated" ? auth.user : null;
  const { rooms, loading } = useRoomsList({ viewerUid: currentUser?.uid });
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "active" | "completed">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "all">("all");
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const statusMatches = statusFilter === "all" ? true : room.status === statusFilter;
      const difficultyMatches = difficultyFilter === "all" ? true : room.difficulty === difficultyFilter;
      return statusMatches && difficultyMatches;
    });
  }, [rooms, statusFilter, difficultyFilter]);

  const handleCopy = async (roomId: string) => {
    const link =
      typeof window !== "undefined" ? `${window.location.origin}/room/${roomId}` : `/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedRoomId(roomId);
      window.setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (error) {
      console.error("Failed to copy link", error);
    }
  };

  return (
    <RequireAuth>
      <div className="space-y-10">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Game lobby</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Join an open table or spin up a fresh puzzle with your favorite difficulty.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/rooms/new">Create room</Link>
          </Button>
        </header>

        <section className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Status
            </span>
            {statusFilters.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Difficulty
            </span>
            {difficultyFilters.map((option) => (
              <Button
                key={option.value}
                variant={difficultyFilter === option.value ? "primary" : "outline"}
                size="sm"
                onClick={() => setDifficultyFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/40 p-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
            <h2 className="text-xl font-semibold">It&apos;s quiet... for now.</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Be the first to create a room and invite someone special.
            </p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/40 p-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
            <h2 className="text-xl font-semibold">No rooms match your filters.</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Try adjusting status or difficulty.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredRooms.map((room) => (
              <article
                key={room.id}
                className="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{room.name || "Untitled room"}</h2>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                      {room.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow"
                      style={{ background: room.ownerColor ?? "#6366f1" }}
                    >
                      {(room.ownerName || truncateId(room.ownerUid))
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        {room.ownerUid === currentUser?.uid
                          ? "You"
                          : room.ownerName || truncateId(room.ownerUid)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Updated {formatRelativeTime(room.updatedAt?.toDate() ?? new Date())}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Room code: {room.id.slice(0, 6).toUpperCase()}
                  </p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Status: {room.status}
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="flex-1 justify-center">
                    <Link to={`/room/${room.id}`}>Join room</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center justify-center gap-2"
                    onClick={() => handleCopy(room.id)}
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    {copiedRoomId === room.id ? "Copied" : "Copy link"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}

function truncateId(uid: string) {
  return `${uid.slice(0, 6)}…`;
}

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

const statusFilters = [
  { value: "all" as const, label: "All" },
  { value: "waiting" as const, label: "Waiting" },
  { value: "active" as const, label: "Active" },
  { value: "completed" as const, label: "Completed" },
];

const difficultyFilters = [
  { value: "all" as const, label: "All" },
  { value: "easy" as const, label: "Easy" },
  { value: "medium" as const, label: "Medium" },
  { value: "hard" as const, label: "Hard" },
  { value: "expert" as const, label: "Expert" },
];
