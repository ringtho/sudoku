import type { Route } from "./+types/about";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "About – Sudoku Together" },
    {
      name: "description",
      content:
        "Learn about the vision behind Sudoku Together and see what's next on the roadmap.",
    },
  ];
}

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">About Sudoku Together</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          A co-op Sudoku platform designed for date nights, friendly rivalries, and puzzle communities.
        </p>
      </header>
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-semibold">Why we built this</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Sudoku Together makes collaborative puzzle solving effortless. Share a single board, see your
          partner&apos;s moves in real time, and celebrate wins with delightful animations and soundscapes.
          The experience is tuned for laptops, tablets, and phones so you can play wherever inspiration strikes.
        </p>
      </section>
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-semibold">Roadmap</h2>
        <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <li>✓ Google authentication and lobby scaffolding.</li>
          <li>• Multiplayer Sudoku board with shared notes and hints.</li>
          <li>• Real-time chat, reactions, and celebratory animations.</li>
          <li>• Mobile-first layout tuning and accessibility improvements.</li>
        </ul>
      </section>
    </div>
  );
}
