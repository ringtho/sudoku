import { RefreshCw } from "lucide-react";
import { collection, getDocs, query } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { RequireAdmin } from "../components/layout/RequireAdmin";
import { Button } from "../components/ui/button";
import { getFirebase } from "../libs/firebase";
import type { UserProfile } from "../libs/profiles";
import type { RoomDocument } from "../libs/rooms";
import clsx from "clsx";

type ProfileRecord = (UserProfile & { id: string }) & { createdAt?: unknown; updatedAt: unknown };
type RoomRecord = Pick<
  RoomDocument,
  "id" | "name" | "ownerUid" | "status" | "difficulty" | "allowedUids" | "createdAt" | "updatedAt"
>;

type AdminStats = {
  totalUsers: number;
  newUsers24h: number;
  totalRooms: number;
  waitingRooms: number;
  activeRooms: number;
  completedRooms: number;
  uniqueHosts: number;
};

export function meta() {
  return [
    { title: "Admin Dashboard – Sudoku Together" },
    { name: "robots", content: "noindex" },
  ];
}

export default function AdminRoute() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}

function AdminDashboard() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { db } = getFirebase();
      const [profilesSnap, roomsSnap] = await Promise.all([
        getDocs(query(collection(db, "profiles"))),
        getDocs(query(collection(db, "rooms"))),
      ]);

      const nextProfiles = profilesSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as UserProfile),
      }));

      nextProfiles.sort((a, b) => {
        const aMs = toMillis(a.updatedAt) ?? 0;
        const bMs = toMillis(b.updatedAt) ?? 0;
        return bMs - aMs;
      });

      const nextRooms = roomsSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<RoomDocument, "id">),
      }));

      nextRooms.sort((a, b) => {
        const aMs = toMillis(a.updatedAt) ?? 0;
        const bMs = toMillis(b.updatedAt) ?? 0;
        return bMs - aMs;
      });

      setProfiles(nextProfiles);
      setRooms(nextRooms);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load admin data", err);
      setError("We couldn’t load data right now. Try refreshing in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo<AdminStats>(() => {
    const now = Date.now();
    const lastDay = now - 24 * 60 * 60 * 1000;
    const newUsers24h = profiles.filter((profile) => {
      const created = toMillis(profile.createdAt) ?? toMillis(profile.updatedAt);
      return created !== null && created >= lastDay;
    }).length;

    const waitingRooms = rooms.filter((room) => room.status === "waiting").length;
    const activeRooms = rooms.filter((room) => room.status === "active").length;
    const completedRooms = rooms.filter((room) => room.status === "completed").length;
    const uniqueHosts = new Set(rooms.map((room) => room.ownerUid)).size;

    return {
      totalUsers: profiles.length,
      newUsers24h,
      totalRooms: rooms.length,
      waitingRooms,
      activeRooms,
      completedRooms,
      uniqueHosts,
    };
  }, [profiles, rooms]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading admin dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-5 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={loadData}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin dashboard</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Review user accounts, room activity, and key health metrics.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={loadData}
          >
            Refresh data
          </Button>
          {lastUpdated ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated {new Intl.DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit",
              }).format(lastUpdated)}
            </p>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total users" value={stats.totalUsers} tone="primary" />
        <SummaryCard label="New users (24h)" value={stats.newUsers24h} tone="emerald" />
        <SummaryCard label="Total rooms" value={stats.totalRooms} tone="purple" />
        <SummaryCard label="Unique hosts" value={stats.uniqueHosts} tone="amber" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Waiting rooms" value={stats.waitingRooms} tone="blue" />
        <SummaryCard label="Active rooms" value={stats.activeRooms} tone="emerald" />
        <SummaryCard label="Completed rooms" value={stats.completedRooms} tone="slate" />
      </section>

      <section className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">People</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Recent users sorted by most recent activity.
            </p>
          </div>
        </header>
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <HeaderCell>Name</HeaderCell>
                <HeaderCell>Email</HeaderCell>
                <HeaderCell align="right">Created</HeaderCell>
                <HeaderCell align="right">Updated</HeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {profiles.slice(0, 20).map((profile) => {
                const createdAt = formatDate(toMillis(profile.createdAt));
                const updatedAt = formatDate(toMillis(profile.updatedAt));
                return (
                  <tr key={profile.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                    <BodyCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {profile.displayName ?? "Unnamed user"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{profile.uid}</span>
                      </div>
                    </BodyCell>
                    <BodyCell>{profile.email ?? "—"}</BodyCell>
                    <BodyCell align="right">{createdAt ?? "—"}</BodyCell>
                    <BodyCell align="right">{updatedAt ?? "—"}</BodyCell>
                  </tr>
                );
              })}
              {profiles.length === 0 ? (
                <tr>
                  <BodyCell colSpan={4} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    No profiles found.
                  </BodyCell>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Rooms</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Snapshot of the 20 most recently updated rooms.
            </p>
          </div>
        </header>
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <HeaderCell>Name</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Difficulty</HeaderCell>
                <HeaderCell align="right">Participants</HeaderCell>
                <HeaderCell align="right">Updated</HeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rooms.slice(0, 20).map((room) => (
                <tr key={room.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                  <BodyCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {room.name || "Untitled room"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{room.id}</span>
                    </div>
                  </BodyCell>
                  <BodyCell className="capitalize">{room.status}</BodyCell>
                  <BodyCell className="capitalize">{room.difficulty}</BodyCell>
                  <BodyCell align="right">{room.allowedUids?.length ?? 0}</BodyCell>
                  <BodyCell align="right">{formatDate(toMillis(room.updatedAt)) ?? "—"}</BodyCell>
                </tr>
              ))}
              {rooms.length === 0 ? (
                <tr>
                  <BodyCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    No rooms available.
                  </BodyCell>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type SummaryCardTone = "primary" | "emerald" | "purple" | "amber" | "blue" | "slate";

const toneStyles: Record<SummaryCardTone, string> = {
  primary: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  blue: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

type SummaryCardProps = {
  label: string;
  value: number;
  tone: SummaryCardTone;
};

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${toneStyles[tone]}`}>{value}</p>
    </div>
  );
}

type HeaderCellProps = {
  children: ReactNode;
  align?: "left" | "right";
};

function HeaderCell({ children, align = "left" }: HeaderCellProps) {
  return (
    <th
      scope="col"
      className={clsx(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

type BodyCellProps = {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  colSpan?: number;
};

function BodyCell({ children, align = "left", className = "", colSpan }: BodyCellProps) {
  return (
    <td
      className={clsx(
        "px-4 py-3 text-sm text-gray-700 dark:text-gray-200",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && "toMillis" in (value as Record<string, unknown>)) {
    try {
      return typeof (value as { toMillis: () => number }).toMillis === "function"
        ? (value as { toMillis: () => number }).toMillis()
        : null;
    } catch (error) {
      console.error("Failed to convert timestamp", error);
      return null;
    }
  }
  return null;
}

function formatDate(ms: number | null): string | null {
  if (ms == null) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}
