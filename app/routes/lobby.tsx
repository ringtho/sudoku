import type { Route } from "./+types/lobby";
import { Link } from "react-router";
import { RequireAuth } from "../components/layout/RequireAuth";
import { Button } from "../components/ui/button";
import { useRoomsList } from "../hooks/useRoomsList";
import { useAuth } from "../contexts/AuthContext";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Lobby – Sudoku Together" },
    { name: "description", content: "Browse or create Sudoku rooms to play with friends." },
  ];
}

export default function Lobby() {
  const auth = useAuth();
  const { rooms, loading } = useRoomsList();
  const currentUser = auth.status === "authenticated" ? auth.user : null;

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
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {rooms.map((room) => (
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Host: {room.ownerUid === currentUser?.uid ? "You" : truncateId(room.ownerUid)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Updated {formatRelativeTime(room.updatedAt?.toDate() ?? new Date())}
                  </p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Status: {room.status}
                  </p>
                </div>
                <Button asChild className="mt-6 justify-center">
                  <Link to={`/room/${room.id}`}>Join room</Link>
                </Button>
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
