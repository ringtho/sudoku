import type * as React from "react";
import type { Route } from "./+types/rooms.new";
import { useMemo, useState } from "react";
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
  const [roomInfo, setRoomInfo] = useState<{ id: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(hostColors[0]);

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
        ownerColor: selectedColor,
        ownerPhotoURL: currentUser.photoURL ?? null,
      });
      const link = typeof window !== "undefined" ? `${window.location.origin}/room/${roomId}` : `/room/${roomId}`;
      setRoomInfo({ id: roomId, link });
      setStatus("idle");
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard
          .writeText(link)
          .then(() => setCopied(true))
          .catch(() => setCopied(false));
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("We couldn\'t create the room. Please try again.");
    }
  };

  const shareLink = useMemo(() => {
    if (!roomInfo) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/room/${roomInfo.id}`;
    }
    return roomInfo.link;
  }, [roomInfo]);

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

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Color vibe</p>
            <div className="flex flex-wrap gap-3">
              {hostColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    selectedColor === color ? "ring-2 ring-blue-500" : "ring-1 ring-transparent"
                  }`}
                  style={{ background: color }}
                  aria-label={`Select color ${color}`}
                >
                  {selectedColor === color ? <span className="text-white">✓</span> : null}
                </button>
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

        {roomInfo ? (
          <InviteOverlay
            roomLink={shareLink}
            copied={copied}
            setCopied={setCopied}
            difficulty={difficultyOptions.find((opt) => opt.value === difficulty)}
            onClose={() => navigate(`/room/${roomInfo.id}`)}
          />
        ) : null}
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

const hostColors = ["#6366f1", "#ec4899", "#22d3ee", "#34d399", "#f97316", "#a855f7"];

type InviteOverlayProps = {
  roomLink: string;
  copied: boolean;
  setCopied: (value: boolean) => void;
  difficulty?: { value: Difficulty; label: string; description: string };
  onClose: () => void;
};

function InviteOverlay({ roomLink, copied, setCopied, difficulty, onClose }: InviteOverlayProps) {
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(roomLink)
        .then(() => setCopied(true))
        .catch(() => setCopied(false));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/95">
        <header className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Room ready to share</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We copied the invite link for you. Send it to your teammate and jump in together.
          </p>
        </header>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-200">Difficulty</span>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
              {difficulty?.label ?? "Custom"}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{difficulty?.description}</p>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Invite link
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="block flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
              {roomLink}
            </span>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleCopy}>
            Copy again
          </Button>
          <Button onClick={onClose}>Enter room</Button>
        </div>
      </div>
    </div>
  );
}
