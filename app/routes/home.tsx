import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight, Sparkles, Users } from "lucide-react";

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
        <div className="relative flex items-center justify-center">
          <div className="aspect-square w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl ring-1 ring-blue-100/50 dark:border-gray-800 dark:bg-gray-900 dark:ring-blue-500/10">
            <div className="grid grid-cols-9 gap-1">
              {Array.from({ length: 81 }).map((_, index) => (
                <div
                  key={index}
                  className="flex h-8 items-center justify-center rounded-lg bg-gray-50 text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300"
                >
                  {(index + (index % 9 === 0 ? 1 : 0)) % 9 === 0 ? "7" : ""}
                </div>
              ))}
            </div>
            <div className="absolute -right-12 top-1/2 hidden w-32 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-lg dark:bg-gray-900 lg:block">
              <p className="text-sm font-medium">Live presence</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">See moves &amp; notes instantly.</p>
            </div>
            <div className="absolute -left-16 bottom-8 hidden w-36 rounded-2xl bg-white p-4 shadow-lg dark:bg-gray-900 lg:block">
              <p className="text-sm font-medium">Smart hints</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Optional guardrails keep games fair.</p>
            </div>
          </div>
        </div>
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
