import type { Route } from "./+types/rooms";
import { Link } from "react-router";
import { RequireAuth } from "../components/layout/RequireAuth";
import { useAuth } from "../contexts/AuthContext";
import { useRoomsList } from "../hooks/useRoomsList";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { Loader2, Plus, RefreshCw, Search, Clock, Share2, Users as UsersIcon, Filter, PieChart } from "lucide-react";
import clsx from "clsx";
import { useMemo, useState } from "react";

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<RoomDifficultyFilter>("all");

  const trimmedQuery = query.trim().toLowerCase();
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesQuery = !trimmedQuery
        ? true
        : `${room.name ?? ""} ${room.id} ${room.ownerName ?? ""}`.toLowerCase().includes(trimmedQuery);
      const matchesStatus = statusFilter === "all" ? true : room.status === statusFilter;
      const matchesDifficulty = difficultyFilter === "all" ? true : room.difficulty === difficultyFilter;
      return matchesQuery && matchesStatus && matchesDifficulty;
    });
  }, [rooms, trimmedQuery, statusFilter, difficultyFilter]);

  const activeCount = filteredRooms.filter((room) => room.status === "active").length;
  const completedCount = filteredRooms.filter((room) => room.status === "completed").length;

  return (
    <RequireAuth>
      <div className="space-y-8">
        <header className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[1.6fr_1fr] lg:items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">My rooms</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage ongoing games, revisit finished puzzles, or spin up a fresh challenge.
            </p>
            <dl className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-blue-500" aria-hidden="true" />
                <span>
                  {filteredRooms.length} room{filteredRooms.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <span>{activeCount} active</span>
              </div>
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-purple-500" aria-hidden="true" />
                <span>{completedCount} completed</span>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button asChild variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
              <Link to=".">Refresh</Link>
            </Button>
            <Button asChild size="sm" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              <Link to="/rooms/new">New room</Link>
            </Button>
          </div>
        </header>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search your rooms…"
                  className="w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-blue-500/30 dark:focus:border-blue-500 dark:focus:ring-blue-400/30"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                Filters
              </span>
              <FilterGroup
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTERS}
              />
              <FilterGroup
                label="Difficulty"
                value={difficultyFilter}
                onChange={setDifficultyFilter}
                options={DIFFICULTY_FILTERS}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" aria-hidden="true" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState />
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nothing matches your filters. Adjust your search or create a new room.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}

type RoomStatusFilter = "all" | "waiting" | "active" | "completed";
type RoomDifficultyFilter = "all" | "easy" | "medium" | "hard" | "expert";

const STATUS_FILTERS: Array<{ label: string; value: RoomStatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Waiting", value: "waiting" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

const DIFFICULTY_FILTERS: Array<{ label: string; value: RoomDifficultyFilter }> = [
  { label: "All", value: "all" },
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
  { label: "Expert", value: "expert" },
];

type FilterGroupProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
};

function FilterGroup<T extends string>({ value, onChange, options }: FilterGroupProps<T>) {
  return (
    <div className="flex gap-2">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              isActive
                ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-200"
                : "border-transparent bg-gray-100 text-gray-600 hover:border-blue-300 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500/40 dark:hover:text-blue-300",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type RoomCardProps = {
  room: ReturnType<typeof useRoomsList>["rooms"][number];
};

function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="group flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-400/60 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30">
      <div className="flex items-start gap-3">
        <Avatar
          src={room.ownerPhotoURL ?? undefined}
          name={room.ownerName || room.ownerUid}
          size="sm"
          fallbackColor={room.ownerColor ?? "#6366f1"}
          className="shadow ring-2 ring-white dark:ring-slate-900"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
              {room.name || "Untitled room"}
            </h2>
            <StatusBadge status={room.status} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Created {formatRelativeTime(room.createdAt?.toDate() ?? new Date())}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2 rounded-2xl bg-blue-500/10 px-3 py-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="capitalize">{room.difficulty}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <UsersIcon className="h-4 w-4 text-gray-500 dark:text-gray-300" aria-hidden="true" />
              <span>{room.allowedUids?.length ?? 0} players</span>
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Updated {formatRelativeTime(room.updatedAt?.toDate() ?? new Date())}</span>
            </div>
          </dl>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Share2 className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
          <span className="truncate">{room.id}</span>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={`/room/${room.id}`}>Enter room</Link>
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof useRoomsList>["rooms"][number]["status"] }) {
  const tone =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-200"
      : status === "completed"
        ? "bg-purple-500/15 text-purple-600 dark:bg-purple-400/10 dark:text-purple-200"
        : "bg-amber-500/15 text-amber-600 dark:bg-amber-400/10 dark:text-amber-200";

  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-gradient-to-br from-white via-gray-50 to-gray-100 p-12 text-center dark:border-gray-700 dark:from-slate-950 dark:via-slate-950/60 dark:to-slate-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
        <Plus className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">You haven&apos;t hosted a room yet</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Create your first room and invite a friend. Your rooms will appear here for quick access and management.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          <Link to="/rooms/new">Create a room</Link>
        </Button>
        <Button asChild variant="outline" icon={<Search className="h-4 w-4" aria-hidden="true" />}>
          <Link to="/lobby">Browse lobby</Link>
        </Button>
      </div>
    </div>
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
