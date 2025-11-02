import { useMemo } from "react";
import type { RoomEvent, RoomMember } from "../../libs/rooms";
import { CheckCircle2, History, Target, TrendingUp, XCircle, Lightbulb, Trophy } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "../ui/avatar";

type MatchTimelineProps = {
  events: RoomEvent[];
  members: RoomMember[];
};

type Streak = {
  best: number;
  current: number;
};

export function MatchTimeline({ events, members }: MatchTimelineProps) {
  const timelineEvents = useMemo(
    () => events.filter((event) => event.type === "move" || event.type === "system"),
    [events],
  );
  const moveEvents = useMemo(
    () =>
      timelineEvents.filter((event): event is Extract<RoomEvent, { type: "move" }> => event.type === "move"),
    [timelineEvents],
  );

  const memberById = useMemo(() => {
    const map = new Map<string, RoomMember>();
    members.forEach((member) => map.set(member.uid, member));
    return map;
  }, [members]);

  const stats = useMemo(() => {
    const solvedCells = new Set<string>();
    const streaks = new Map<string, Streak>();
    const totals = { moves: 0, correct: 0, mistakes: 0 };

    moveEvents.forEach((event) => {
      if (event.value === null) {
        return;
      }

      totals.moves += 1;
      if (event.correct) {
        totals.correct += 1;
        solvedCells.add(String(event.cellIndex));
      } else {
        totals.mistakes += 1;
      }

      const streak = streaks.get(event.actorUid) ?? { best: 0, current: 0 };
      if (event.correct && event.value !== null) {
        streak.current += 1;
        streak.best = Math.max(streak.best, streak.current);
      } else if (event.value !== null) {
        streak.current = 0;
      }
      streaks.set(event.actorUid, streak);
    });

    return {
      totals,
      streaks,
      solved: solvedCells.size,
    };
  }, [moveEvents]);

  const hasMoveEvents = moveEvents.length > 0;

  if (!hasMoveEvents && timelineEvents.filter((event) => event.type === "system").length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:from-gray-950 dark:to-gray-900 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-blue-500" aria-hidden="true" />
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Timeline warming up</p>
            <p>Once moves start rolling in, your team&apos;s momentum and streaks appear here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-100">Match timeline</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Track momentum, streaks, and clutch solves in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-300">
          <Target className="h-4 w-4" aria-hidden="true" />
          {stats.totals.correct} / {stats.totals.moves} accurate moves
        </div>
      </header>

      {hasMoveEvents ? (
        <section className="grid gap-3 rounded-2xl bg-gray-50/70 p-4 dark:bg-gray-900/50">
          <StatPill
            icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            label="Solved together"
            value={`${stats.solved}`}
          />
          <StatPill
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
            label="Team accuracy"
            value={`${Math.round((stats.totals.correct / Math.max(stats.totals.moves, 1)) * 100)}%`}
          />
          <StatPill
            icon={<XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />}
            label="Corrections"
            value={`${stats.totals.mistakes}`}
          />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-300">
        {members.map((member) => {
          const streak = stats.streaks.get(member.uid);
          const displayName = member.displayName || "Player";
          return (
            <div
              key={member.uid}
              className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-900"
            >
              <Avatar
                src={member.photoURL ?? undefined}
                name={displayName}
                size="sm"
                fallbackColor={member.color}
                className="h-6 w-6 text-[10px] font-semibold shadow ring-2 ring-white dark:ring-slate-900"
              />
              <span>
                streak&nbsp;
                <strong>{streak?.current ?? 0}</strong>
                {streak ? ` • best ${streak.best}` : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="max-h-[320px] overflow-y-auto md:max-h-[420px]">
        <ol className="space-y-4 text-sm">
          {timelineEvents.map((event) => {
            if (event.type === "system") {
              const badgeClasses =
                event.level === "success"
                  ? "bg-emerald-500 text-white"
                  : event.level === "warning"
                    ? "bg-amber-500 text-white"
                    : "bg-blue-500 text-white";
              const containerClasses =
                event.level === "success"
                  ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : event.level === "warning"
                    ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                    : "bg-blue-500/10 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200";
              return (
                <li key={event.id} className={clsx("flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-medium", containerClasses)}>
                  <span className={clsx("inline-flex h-6 w-6 items-center justify-center rounded-full", badgeClasses)}>
                    {event.level === "success" ? (
                      <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : event.level === "warning" ? (
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <History className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <span>{event.text}</span>
                  {event.createdAt ? (
                    <time className="ml-auto text-[10px] uppercase tracking-wide text-blue-400 dark:text-blue-300">
                      {event.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  ) : null}
                </li>
              );
            }

            const member = memberById.get(event.actorUid);
            const row = Math.floor(event.cellIndex / 9) + 1;
            const col = (event.cellIndex % 9) + 1;
            const isClear = event.value === null;
            const badgeName = member?.displayName ?? event.actorName;
            const badgeColor = member?.color ?? "#6366f1";
            return (
              <li key={event.id} className="relative pl-6">
                <span
                  className={clsx(
                    "absolute left-0 top-1 h-3 w-3 rounded-full border",
                    event.correct && !isClear
                      ? "border-emerald-400 bg-emerald-500"
                      : isClear
                        ? "border-blue-400 bg-blue-500"
                        : "border-rose-400 bg-rose-500",
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar
                    src={member?.photoURL ?? undefined}
                    name={badgeName}
                    size="sm"
                    fallbackColor={badgeColor}
                    className="h-6 w-6 text-[10px] font-semibold shadow ring-2 ring-white dark:ring-slate-900"
                  />
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{badgeName}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                    r{row} · c{col}
                  </span>
                  {event.value !== null ? (
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        event.correct
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-300",
                      )}
                    >
                      {event.correct ? "Locked in" : "Needs attention"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                      Cleared
                    </span>
                  )}
                  {event.createdAt ? (
                    <time className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {event.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  ) : null}
                </div>
                {!isClear && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Entered <span className="font-semibold text-gray-700 dark:text-gray-200">{event.value}</span>{" "}
                    {event.correct ? "and unlocked a cell" : "but hit a guardrail"}
                  </p>
                )}
                {isClear && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Reset the cell to try a new path.</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

type StatPillProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function StatPill({ icon, label, value }: StatPillProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-sm dark:bg-gray-950 dark:text-gray-300">
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {icon}
        {label}
      </span>
      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}
