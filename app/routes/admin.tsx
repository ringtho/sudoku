import { Activity, BarChart3, Copy, Filter, PieChart, RefreshCw, Search, UserPlus, Users } from "lucide-react";
import { collection, getDocs, query } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { RequireAdmin } from "../components/layout/RequireAdmin";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
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
  const [profileQuery, setProfileQuery] = useState("");
  const [roomQuery, setRoomQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("all");
  const [copiedRooms, setCopiedRooms] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { db } = getFirebase();
      const [profilesSnap, roomsSnap] = await Promise.all([
        getDocs(query(collection(db, "profiles"))),
        getDocs(query(collection(db, "rooms"))),
      ]);

      const nextProfiles = profilesSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as UserProfile),
        }))
        .sort((a, b) => {
          const aMs = toMillis(a.updatedAt) ?? 0;
          const bMs = toMillis(b.updatedAt) ?? 0;
          return bMs - aMs;
        });

      const nextRooms = roomsSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<RoomDocument, "id">),
        }))
        .sort((a, b) => {
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

  const activeUsers24h = useMemo(() => {
    const lastDay = Date.now() - 24 * 60 * 60 * 1000;
    return profiles.filter((profile) => {
      const updated = toMillis(profile.updatedAt);
      return updated !== null && updated >= lastDay;
    }).length;
  }, [profiles]);

  const roomsLast7Days = useMemo(() => {
    const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return rooms.filter((room) => {
      const updated = toMillis(room.updatedAt);
      return updated !== null && updated >= lastWeek;
    }).length;
  }, [rooms]);

  const averageParticipants = useMemo(() => {
    if (rooms.length === 0) return 0;
    const totalParticipants = rooms.reduce((sum, room) => sum + (room.allowedUids?.length ?? 0), 0);
    return totalParticipants / rooms.length;
  }, [rooms]);

  const profileLookup = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const hostLeaderboard = useMemo(() => {
    const counts = new Map<string, { uid: string; count: number; lastActive: number | null }>();
    rooms.forEach((room) => {
      if (!room.ownerUid) return;
      const current = counts.get(room.ownerUid) ?? {
        uid: room.ownerUid,
        count: 0,
        lastActive: null,
      };
      current.count += 1;
      const updated = toMillis(room.updatedAt);
      if (updated && (!current.lastActive || updated > current.lastActive)) {
        current.lastActive = updated;
      }
      counts.set(room.ownerUid, current);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count || (b.lastActive ?? 0) - (a.lastActive ?? 0));
  }, [rooms]);

  const topHost = hostLeaderboard[0] ?? null;
  const topHostProfile = topHost ? profileLookup.get(topHost.uid) ?? null : null;

  const difficultyBreakdown = useMemo(() => {
    const initial = { easy: 0, medium: 0, hard: 0, expert: 0 };
    rooms.forEach((room) => {
      const level = room.difficulty ?? "medium";
      if (initial[level as keyof typeof initial] !== undefined) {
        initial[level as keyof typeof initial] += 1;
      }
    });
    return initial;
  }, [rooms]);

  const leadingDifficulty = useMemo(() => {
    return (Object.entries(difficultyBreakdown) as Array<[keyof typeof difficultyBreakdown, number]>)
      .sort((a, b) => b[1] - a[1])[0];
  }, [difficultyBreakdown]);

  const trimmedProfileQuery = profileQuery.trim().toLowerCase();
  const filteredProfiles = useMemo(() => {
    if (!trimmedProfileQuery) return profiles.slice(0, 30);
    return profiles
      .filter((profile) => {
        const name = profile.displayName?.toLowerCase() ?? "";
        const email = profile.email?.toLowerCase() ?? "";
        const uid = profile.id.toLowerCase();
        return name.includes(trimmedProfileQuery) || email.includes(trimmedProfileQuery) || uid.includes(trimmedProfileQuery);
      })
      .slice(0, 30);
  }, [profiles, trimmedProfileQuery]);

  const trimmedRoomQuery = roomQuery.trim().toLowerCase();
  const filteredRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        const searchString = `${room.name ?? ""} ${room.id} ${room.ownerUid}`.toLowerCase();
        const matchesQuery = trimmedRoomQuery ? searchString.includes(trimmedRoomQuery) : true;
        const matchesStatus = statusFilter === "all" ? true : room.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .slice(0, 30);
  }, [rooms, trimmedRoomQuery, statusFilter]);

  const recentRooms = useMemo(() => rooms.slice(0, 8), [rooms]);

  const handleCopyRoomIds = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const payload = rooms.map((room) => `${room.id},${room.name ?? "Untitled"},${room.status}`).join("\n");
    navigator.clipboard
      .writeText(payload)
      .then(() => {
        setCopiedRooms(true);
        window.setTimeout(() => setCopiedRooms(false), 1500);
      })
      .catch((err) => console.error("Failed to copy room ids", err));
  }, [rooms]);

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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin control center</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track growth, monitor rooms, and keep Sudoku Together healthy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={loadData}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Copy className="h-4 w-4" aria-hidden="true" />}
            onClick={handleCopyRoomIds}
          >
            {copiedRooms ? "Copied!" : "Copy room list"}
          </Button>
          {lastUpdated ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Updated at{" "}
              {new Intl.DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit",
              }).format(lastUpdated)}
            </p>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Total players"
          value={stats.totalUsers.toLocaleString()}
          helper={`${stats.newUsers24h.toLocaleString()} joined in the last 24h`}
        />
        <MetricCard
          icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
          label="Active players (24h)"
          value={activeUsers24h.toLocaleString()}
          helper="Based on the latest profile activity"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
          label="Rooms updated (7d)"
          value={roomsLast7Days.toLocaleString()}
          helper={`${stats.totalRooms.toLocaleString()} total rooms`}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          label="Avg participants"
          value={averageParticipants.toFixed(1)}
          helper="Per room across the entire platform"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <SectionHeader
              title="Player directory"
              description="Filter by name, email, or UID to find teammates quickly."
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={profileQuery}
                  onChange={(event) => setProfileQuery(event.target.value)}
                  placeholder="Search players…"
                  className="w-64 rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:ring-blue-400/30"
                />
              </div>
            </SectionHeader>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800/60">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                  <tr>
                    <HeaderCell>Name</HeaderCell>
                    <HeaderCell>Email</HeaderCell>
                    <HeaderCell align="right">Last active</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {filteredProfiles.length === 0 ? (
                    <tr>
                      <BodyCell colSpan={3} className="py-10 text-center text-gray-500 dark:text-gray-400">
                        No players matched your search.
                      </BodyCell>
                    </tr>
                  ) : (
                    filteredProfiles.map((profile) => {
                      const updatedAt = toMillis(profile.updatedAt);
                      return (
                        <tr key={profile.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                          <BodyCell>
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={profile.photoURL ?? undefined}
                                name={profile.displayName ?? profile.email ?? profile.id}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                                  {profile.displayName ?? "Unnamed player"}
                                </p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{profile.id}</p>
                              </div>
                            </div>
                          </BodyCell>
                          <BodyCell>{profile.email ?? "—"}</BodyCell>
                          <BodyCell align="right">{relativeTime(updatedAt)}</BodyCell>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <SectionHeader
              title="Rooms monitor"
              description="Use filters to slice by status or search by owner."
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={roomQuery}
                    onChange={(event) => setRoomQuery(event.target.value)}
                    placeholder="Search rooms or owners…"
                    className="w-60 rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:ring-blue-400/30"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Filter status</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((filterOption) => {
                    const isActive = statusFilter === filterOption.value;
                    return (
                      <button
                        key={filterOption.value}
                        type="button"
                        onClick={() => setStatusFilter(filterOption.value)}
                        className={clsx(
                          "rounded-full border px-3 py-1 text-xs font-medium transition",
                          isActive
                            ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-200"
                            : "border-transparent bg-gray-100 text-gray-600 hover:border-blue-300 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500/40 dark:hover:text-blue-300",
                        )}
                      >
                        {filterOption.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SectionHeader>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800/60">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                  <tr>
                    <HeaderCell>Room</HeaderCell>
                    <HeaderCell>Status</HeaderCell>
                    <HeaderCell>Difficulty</HeaderCell>
                    <HeaderCell align="right">Participants</HeaderCell>
                    <HeaderCell align="right">Updated</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <BodyCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">
                        No rooms matched your filters.
                      </BodyCell>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                        <BodyCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {room.name || "Untitled room"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{room.id}</span>
                          </div>
                        </BodyCell>
                        <BodyCell>
                          <StatusBadge status={room.status} />
                        </BodyCell>
                        <BodyCell>
                          <DifficultyBadge difficulty={room.difficulty} />
                        </BodyCell>
                        <BodyCell align="right">{room.allowedUids?.length ?? 0}</BodyCell>
                        <BodyCell align="right">{relativeTime(toMillis(room.updatedAt))}</BodyCell>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <SectionHeader
              title="Room health"
              description="Difficulty mix and host performance at a glance."
            />
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Difficulty distribution
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {Object.entries(difficultyBreakdown).map(([level, count]) => {
                    const percentage = stats.totalRooms > 0 ? Math.round((count / stats.totalRooms) * 100) : 0;
                    return (
                      <div key={level} className="flex items-center gap-3">
                        <DifficultyBadge difficulty={level as keyof typeof difficultyBreakdown} />
                        <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-2 rounded-full bg-blue-500/80 dark:bg-blue-400/80"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Leading host
                </p>
                {topHost ? (
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar
                      src={topHostProfile?.photoURL ?? undefined}
                      name={topHostProfile?.displayName ?? topHost.uid}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                        {topHostProfile?.displayName ?? topHost.uid}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {topHost.count} room{topHost.count === 1 ? "" : "s"} owned • {relativeTime(topHost.lastActive)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No host data yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Most played difficulty
                </p>
                {leadingDifficulty ? (
                  <div className="mt-3 flex items-center gap-3">
                    <PieChart className="h-5 w-5 text-blue-500" aria-hidden="true" />
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong className="capitalize">{leadingDifficulty[0]}</strong> rooms make up{" "}
                      {stats.totalRooms > 0
                        ? Math.round((leadingDifficulty[1] / stats.totalRooms) * 100)
                        : 0}
                      % of activity.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No rooms created yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <SectionHeader
              title="Recent updates"
              description="Latest rooms sorted by their last activity."
            />
            <ul className="mt-3 space-y-3 text-sm">
              {recentRooms.length === 0 ? (
                <li className="rounded-2xl bg-gray-50 p-4 text-center text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  No rooms yet. Share the app to create one!
                </li>
              ) : (
                recentRooms.map((room) => (
                  <li
                    key={room.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500/40"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                          {room.name || "Untitled room"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Owner: {room.ownerUid}
                        </p>
                      </div>
                      <StatusBadge status={room.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{DifficultyBadgeInline(room.difficulty)}</span>
                      <span>{relativeTime(toMillis(room.updatedAt))}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

type RoomStatusFilter = "all" | "waiting" | "active" | "completed";

const STATUS_FILTERS: Array<{ label: string; value: RoomStatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Waiting", value: "waiting" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  helper?: string;
};

function MetricCard({ icon, label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:from-slate-950 dark:to-slate-900">
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
          {icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      {helper ? <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{helper}</p> : null}
    </div>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

function SectionHeader({ title, description, children }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800/60 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {description ? <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

type StatusBadgeProps = {
  status: RoomRecord["status"];
};

function StatusBadge({ status }: StatusBadgeProps) {
  const tone =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-200"
      : status === "completed"
        ? "bg-purple-500/15 text-purple-600 dark:bg-purple-400/10 dark:text-purple-200"
        : "bg-amber-500/15 text-amber-600 dark:bg-amber-400/10 dark:text-amber-200";

  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize", tone)}>
      {status}
    </span>
  );
}

type DifficultyBadgeProps = {
  difficulty: RoomRecord["difficulty"];
};

function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold capitalize text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
      {difficulty ?? "unknown"}
    </span>
  );
}

function DifficultyBadgeInline(difficulty: RoomRecord["difficulty"]) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
      <span className="capitalize">{difficulty}</span>
    </span>
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
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300",
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

function relativeTime(ms: number | null): string {
  if (ms == null) return "—";
  const diff = Date.now() - ms;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "moments ago";
  if (diff < hour) {
    const mins = Math.round(diff / minute);
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.round(diff / day);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
