import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomEvent, RoomMember } from "../../libs/rooms";
import { Button } from "../ui/button";
import clsx from "clsx";

type RoomChatProps = {
  events: RoomEvent[];
  members: RoomMember[];
  currentUserId: string | null;
  onSend: (message: string) => Promise<void>;
};

export function RoomChat({ events, members, currentUserId, onSend }: RoomChatProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const memberById = useMemo(() => {
    const map = new Map<string, RoomMember>();
    members.forEach((member) => map.set(member.uid, member));
    return map;
  }, [members]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    setSending(true);
    try {
      await onSend(text);
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 64;
    if (isAtBottom) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      setShowScrollHint(false);
    } else {
      setShowScrollHint(true);
    }
  }, [events]);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
        <span>Room chat</span>
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-300">
          Live
        </span>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full space-y-4 overflow-y-auto px-4 py-5 text-sm"
        >
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
              Waiting for the first hello…
            </div>
          ) : (
            events.map((event) => {
              if (event.type === "system") {
                return (
                  <div
                    key={event.id}
                    className="text-center text-xs text-gray-400 dark:text-gray-500"
                  >
                    {event.text}
                  </div>
                );
              }

              const isSelf = currentUserId === event.actorUid;
              const member = memberById.get(event.actorUid);
              const initials = member?.displayName
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={event.id}
                  className={clsx("flex items-start gap-3", isSelf ? "flex-row-reverse text-right" : "")}
                >
                  <div
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm",
                      member?.color ? "ring-2 ring-white dark:ring-gray-900" : "bg-slate-400",
                    )}
                    style={member?.color ? { backgroundColor: member.color } : undefined}
                  >
                    {initials ?? member?.displayName?.charAt(0) ?? "?"}
                  </div>
                  <div
                    className={clsx(
                      "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                      isSelf
                        ? "rounded-tr-sm bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
                        : "rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
                    )}
                  >
                    <div className="text-xs font-semibold opacity-80">
                      {isSelf ? "You" : member?.displayName ?? event.actorName}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{event.text}</p>
                    {event.createdAt ? (
                      <time className="mt-2 block text-[10px] uppercase tracking-wide opacity-70">
                        {event.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {showScrollHint ? (
          <button
            type="button"
            className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-gray-900/80 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-gray-900 dark:bg-white/20"
            onClick={() => {
              const container = scrollRef.current;
              if (!container) return;
              container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
              setShowScrollHint(false);
            }}
          >
            New messages
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-100 p-4 dark:border-gray-800">
        <div className="flex items-end gap-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Say something nice…"
            rows={2}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!message.trim() || sending}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
