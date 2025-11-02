import type { Route } from "./+types/lobby";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  Clock,
  Filter,
  Loader2,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Users as UsersIcon,
} from "lucide-react";
import clsx from "clsx";
import { RequireAuth } from "../components/layout/RequireAuth";
import { Button } from "../components/ui/button";
import { useRoomsList } from "../hooks/useRoomsList";
import { useAuth } from "../contexts/AuthContext";
import type { Difficulty } from "../libs/sudoku";
import { Avatar } from "../components/ui/avatar";

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<RoomDifficultyFilter>("all");
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

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

  const stats = useMemo(() => {
    const waitingRooms = filteredRooms.filter((room) => room.status === "waiting").length;
    const activeRooms = filteredRooms.filter((room) => room.status === "active").length;
    const completedRooms = filteredRooms.filter((room) => room.status === "completed").length;
    const uniqueHosts = new Set(filteredRooms.map((room) => room.ownerUid)).size;
    const averageParticipants =
      filteredRooms.length === 0
        ? 0
        : filteredRooms.reduce((sum, room) => sum + (room.allowedUids?.length ?? 0), 0) / filteredRooms.length;
    return { waitingRooms, activeRooms, completedRooms, uniqueHosts, averageParticipants };
  }, [filteredRooms]);

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
        <header className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[1.7fr_1fr] lg:items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Game lobby</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Jump into a live Sudoku session or host your own table in seconds.
            </p>
            <dl className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-blue-500" aria-hidden="true" />
                <span>{filteredRooms.length} public room{filteredRooms.length === 1 ? "" : "s"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <span>{stats.activeRooms} active match{stats.activeRooms === 1 ? "" : "es"}</span>
              </div>
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-purple-500" aria-hidden="true" />
                <span>{stats.waitingRooms} waiting for players</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span>Avg {stats.averageParticipants.toFixed(1)} players per room</span>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
              Refresh
            </Button>
            <Button asChild size="sm" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              <Link to="/rooms/new">Create room</Link>
            </Button>
          </div>
        </header>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search rooms or hosts…"
                className="w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-blue-500/30 dark:focus:border-blue-500 dark:focus:ring-blue-400/30"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                Filters
              </span>
              <FilterGroup
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTERS}
              />
              <FilterGroup
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
          <EmptyState variant="empty" />
        ) : filteredRooms.length === 0 ? (
          <EmptyState variant="filtered" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onCopy={handleCopy}
                copied={copiedRoomId === room.id}
                isOwnRoom={room.ownerUid === currentUser?.uid}
              />
            ))}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}

type RoomStatusFilter = "all" | "waiting" | "active" | "completed";
type RoomDifficultyFilter = "all" | Difficulty;

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

function FilterGroup<T extends RoomStatusFilter | RoomDifficultyFilter>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
}) {
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
  onCopy: (roomId: string) => void;
  copied: boolean;
  isOwnRoom: boolean;
};

function RoomCard({ room, onCopy, copied, isOwnRoom }: RoomCardProps) {
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
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
              {room.name || "Untitled room"}
            </h2>
            <StatusBadge status={room.status} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Host: {isOwnRoom ? "You" : room.ownerName ?? truncateId(room.ownerUid)}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
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
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 break-all">
          <Share2 className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
          <span className="truncate">{room.id}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to={`/room/${room.id}`}>Join</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCopy(room.id)}
            className="flex items-center gap-1 text-xs w-full sm:w-auto"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
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

function EmptyState({ variant }: { variant: "empty" | "filtered" }) {
  if (variant === "filtered") {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-gradient-to-br from-white via-gray-50 to-gray-100 p-12 text-center dark:border-gray-700 dark:from-slate-950 dark:via-slate-950/60 dark:to-slate-900">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">No rooms match your filters</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Adjust the status or difficulty to explore more rooms.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-gradient-to-br from-white via-gray-50 to-gray-100 p-12 text-center dark:border-gray-700 dark:from-slate-950 dark:via-slate-950/60 dark:to-slate-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
        <Plus className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">It&apos;s quiet… for now</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Be the first to create a room and invite someone special to play.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          <Link to="/rooms/new">Create a room</Link>
        </Button>
        <Button asChild variant="outline" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
          <Link to=".">Refresh</Link>
        </Button>
      </div>
    </div>
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
