import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import clsx from "clsx";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sudoku Together" },
    {
      name: "description",
      content:
        "Play Sudoku side-by-side with friends. Create rooms, invite teammates, and solve puzzles together in real time.",
    },
  ];
}

export default function Home() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (auth.status === "authenticated") {
      navigate("/lobby");
    } else {
      auth.signInWithGoogle().catch((error) => {
        console.error("Failed to sign in with Google", error);
      });
    }
  };

  return (
    <div className="space-y-24">
      <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            Collaborate in real time
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Solve Sudoku puzzles together with effortless coordination.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Sudoku Together brings co-op puzzle solving to life. Share rooms, see your partner&apos;s moves,
            and celebrate victories with confetti bursts, all from any device.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={handleGetStarted} icon={<ArrowRight className="h-4 w-4" />}>
              {auth.status === "authenticated" ? "Enter lobby" : "Sign in with Google"}
            </Button>
            <Link
              to="/about"
              className="group inline-flex h-12 items-center justify-center rounded-full border border-gray-300 px-6 text-base font-medium text-gray-800 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Learn more
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
        <HeroBoard />
      </section>

      <section className="grid gap-8 md:grid-cols-3">
        <FeatureCard
          title="Google-powered access"
          description="Sign in with Google to sync progress across devices and keep your games secure."
          icon={<Sparkles className="h-6 w-6 text-blue-500" aria-hidden="true" />}
        />
        <FeatureCard
          title="Rooms for every vibe"
          description="Create private rooms for date night or open tables so the community can hop in."
          icon={<Users className="h-6 w-6 text-purple-500" aria-hidden="true" />}
        />
        <FeatureCard
          title="Realtime validation"
          description="Instantly see your partner's inputs, notes, and hints with millisecond latency."
          icon={<ArrowRight className="h-6 w-6 text-emerald-500" aria-hidden="true" />}
        />
      </section>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
};

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/10 to-purple-500/10">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function HeroBoard() {
  const givenCells = new Map<number, number>([
    [0, 5],
    [1, 3],
    [4, 7],
    [9, 6],
    [12, 1],
    [13, 9],
    [19, 5],
    [27, 7],
    [30, 6],
    [31, 2],
    [35, 3],
    [45, 2],
    [49, 6],
    [53, 1],
    [60, 4],
    [61, 8],
    [66, 7],
    [67, 9],
  ]);

  const playerEntries = new Map<number, number>([
    [32, 9],
    [33, 5],
    [39, 8],
    [40, 4],
    [41, 1],
    [44, 7],
    [50, 5],
  ]);

  const noteCells = new Map<number, number[]>([
    [22, [1, 2, 4]],
    [23, [2, 4, 9]],
    [52, [3, 4, 6]],
    [58, [1, 2, 3, 6]],
  ]);

  const highlightIndex = 40;
  const highlightValue = playerEntries.get(highlightIndex) ?? givenCells.get(highlightIndex) ?? null;

  const collaborators = [
    { index: 40, label: "You", color: "#6366f1" },
    { index: 33, label: "Maya", color: "#f97316" },
  ];

  const presenceByCell = new Map<number, typeof collaborators>();
  collaborators.forEach((presence) => {
    const existing = presenceByCell.get(presence.index) ?? [];
    presenceByCell.set(presence.index, [...existing, presence]);
  });

  const energizedCells = new Set([33, 39, 40, 50]);

  return (
    <div className="relative flex items-center justify-center">
      <div className="relative w-full max-w-lg">
        <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-blue-500/25 via-fuchsia-500/20 to-amber-400/25 blur-3xl" />
        <div className="relative rounded-[32px] border border-white/40 bg-white/80 p-6 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="absolute -top-9 left-1/2 hidden -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 lg:flex">
            Combo x3 • Harmony meter +18%
          </div>
          <div className="relative grid grid-cols-9 gap-[2px] rounded-3xl bg-slate-200/70 p-[2px] dark:bg-slate-700/70">
            {Array.from({ length: 81 }).map((_, index) => {
              const row = Math.floor(index / 9);
              const col = index % 9;
              const isShaded = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0;
              const given = givenCells.get(index);
              const value = given ?? playerEntries.get(index) ?? null;
              const notes = noteCells.get(index);
              const isHighlight = index === highlightIndex;
              const sameValueHighlight =
                highlightValue !== null && value !== null && value === highlightValue && !isHighlight;
              const isRowOrColHighlight =
                !isHighlight &&
                (row === Math.floor(highlightIndex / 9) || col === highlightIndex % 9);
              const presence = presenceByCell.get(index);

              return (
                <div
                  key={index}
                  className={clsx(
                    "relative flex aspect-square items-center justify-center rounded-xl border border-white/30 text-lg font-medium transition",
                    isShaded ? "bg-white/95 dark:bg-slate-900/60" : "bg-slate-100/90 dark:bg-slate-900/40",
                    given ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-200",
                    isRowOrColHighlight ? "bg-blue-200/40 dark:bg-blue-500/10" : null,
                    sameValueHighlight ? "bg-emerald-200/30 dark:bg-emerald-500/10" : null,
                    isHighlight
                      ? "ring-2 ring-offset-2 ring-offset-white/70 ring-blue-400 shadow-lg dark:ring-offset-slate-950"
                      : "hover:shadow-md",
                  )}
                >
                  {value !== null ? (
                    <span
                      className={clsx(
                        "text-2xl leading-none",
                        given ? "font-semibold" : "font-semibold text-blue-600 dark:text-blue-300",
                      )}
                    >
                      {value}
                    </span>
                  ) : notes ? (
                    <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5 px-1 py-1 text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                      {Array.from({ length: 9 }, (_, digit) => (
                        <span key={digit} className="flex items-center justify-center">
                          {notes.includes(digit + 1) ? digit + 1 : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {energizedCells.has(index) && (
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 via-fuchsia-500/5 to-amber-400/10 opacity-0 transition duration-700 hover:opacity-100" />
                  )}

                  {presence?.length ? (
                    <div className="absolute -right-2 -top-2 flex items-center gap-1">
                      {presence.map((person) => (
                        <span
                          key={person.label}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm ring-1 ring-white/80 dark:ring-slate-900/60"
                          style={{ backgroundColor: person.color }}
                          title={person.label}
                        >
                          {person.label.slice(0, 1)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-300">
            <div className="inline-flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-blue-500 animate-ping" />
              <span>Live sync in 0.2s</span>
            </div>
            <div className="rounded-full bg-white/80 px-3 py-1 shadow-sm backdrop-blur dark:bg-slate-900/80">
              Notes shared • Partner typing…
            </div>
          </div>

          <div className="absolute -right-20 top-10 hidden w-40 rounded-2xl bg-white/85 p-4 text-xs font-medium text-slate-600 shadow-xl backdrop-blur dark:bg-slate-900/80 dark:text-slate-100 lg:block">
            <p className="text-sm font-semibold">Team Pulse</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
              2 players active • 5 cells locked in
            </p>
            <div className="mt-3 flex items-center gap-2">
              {collaborators.map((person) => (
                <span
                  key={person.label}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: person.color }}
                >
                  {person.label.slice(0, 1)}
                </span>
              ))}
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300">+ Spectators</span>
            </div>
          </div>

          <div className="absolute -left-20 bottom-12 hidden w-44 rounded-2xl bg-white/85 p-4 text-xs font-medium text-slate-600 shadow-xl backdrop-blur dark:bg-slate-900/80 dark:text-slate-100 lg:block">
            <p className="text-sm font-semibold">Smart hints</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
              Pencil marks auto-sync with your partner&apos;s notes.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px]">
              <span className="rounded-full bg-blue-500/15 px-2 py-1 text-blue-600 dark:text-blue-300">
                2 hints left
              </span>
              <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-600 dark:text-amber-300">
                Guardrails on
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
