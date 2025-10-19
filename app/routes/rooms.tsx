import type { Route } from "./+types/rooms";
import { Link } from "react-router";
import { RequireAuth } from "../components/layout/RequireAuth";
import { useAuth } from "../contexts/AuthContext";
import { useRoomsList } from "../hooks/useRoomsList";
import { Button } from "../components/ui/button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Rooms – Sudoku Together" },
    { name: "robots", content: "noindex" },
  ];
}

export default function Rooms() {
  const auth = useAuth();
  const currentUser = auth.status === "authenticated" ? auth.user : null;
  const { rooms, loading } = useRoomsList({
    viewerUid: currentUser?.uid,
    ownerUid: currentUser?.uid,
  });

  return (
    <RequireAuth>
      <div className="space-y-8">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold">My game rooms</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage rooms you&apos;ve created or revisit ongoing puzzles.
            </p>
          </div>
          <Button asChild>
            <Link to="/rooms/new">Create another room</Link>
          </Button>
        </header>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/40 p-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You haven&apos;t hosted any rooms yet. <Link to="/lobby" className="font-medium text-blue-600 hover:underline dark:text-blue-400">Open the lobby</Link> to start one now.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="text-lg font-semibold">{room.name || "Untitled room"}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Difficulty: {room.difficulty} · Last updated {formatRelativeTime(room.updatedAt?.toDate() ?? new Date())}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline">
                    <Link to={`/room/${room.id}`}>Enter</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RequireAuth>
  );
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
