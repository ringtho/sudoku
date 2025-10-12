import type * as React from "react";
import type { Route } from "./+types/rooms.new";
import { useState } from "react";
import { useNavigate } from "react-router";
import { RequireAuth } from "../components/layout/RequireAuth";
import { Button } from "../components/ui/button";
import { createRoom } from "../libs/rooms";
import { useAuth } from "../contexts/AuthContext";
import type { Difficulty } from "../libs/sudoku";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create Room – Sudoku Together" },
    { name: "robots", content: "noindex" },
  ];
}

export default function CreateRoom() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Game night");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.status === "authenticated" ? auth.user : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;
    setStatus("creating");
    setError(null);
    try {
      const roomId = await createRoom({
        name,
        difficulty,
        ownerUid: currentUser.uid,
        ownerName: currentUser.displayName ?? currentUser.email ?? "Player",
      });
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("We couldn\'t create the room. Please try again.");
    }
  };

  return (
    <RequireAuth>
      <div className="max-w-xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold">Create a new room</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Pick a vibe, name your table, and send out the invite link.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="room-name">
              Room name
            </label>
            <input
              id="room-name"
              type="text"
              required
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Difficulty</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {difficultyOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition hover:border-blue-500 hover:shadow-sm ${
                    difficulty === option.value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={option.value}
                    checked={difficulty === option.value}
                    onChange={() => setDifficulty(option.value)}
                    className="hidden"
                  />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{option.description}</span>
                </label>
              ))}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === "creating"}>
              {status === "creating" ? "Creating..." : "Create room"}
            </Button>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
}

const difficultyOptions: { value: Difficulty; label: string; description: string }[] = [
  { value: "easy", label: "Easy", description: "Straightforward puzzles for a quick warm up." },
  { value: "medium", label: "Medium", description: "Balanced challenge with a few tricky spots." },
  { value: "hard", label: "Hard", description: "Requires teamwork and smart note-taking." },
  { value: "expert", label: "Expert", description: "Brutal grids for puzzle purists." },
];
