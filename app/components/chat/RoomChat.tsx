import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomEvent, RoomMember } from "../../libs/rooms";
import { Button } from "../ui/button";
import clsx from "clsx";

type RoomChatProps = {
  events: RoomEvent[];
  members: RoomMember[];
  currentUserId: string | null;
  onSend: (message: string) => Promise<void>;
  onTypingChange?: (typing: boolean) => void;
  className?: string;
  maxHeight?: string;
  showTypingIndicators?: boolean;
};

export function RoomChat({
  events,
  members,
  currentUserId,
  onSend,
  onTypingChange,
  className,
  maxHeight,
  showTypingIndicators = true,
}: RoomChatProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<number | null>(null);

  const chatEvents = useMemo(
    () => events.filter((event) => event.type === "chat"),
    [events],
  );

  const memberById = useMemo(() => {
    const map = new Map<string, RoomMember>();
    members.forEach((member) => map.set(member.uid, member));
    return map;
  }, [members]);

  const typingMembers = useMemo(
    () => members.filter((member) => member.isTyping && member.uid !== currentUserId),
    [members, currentUserId],
  );

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const text = message.trim();
    if (!text) return;

    setSending(true);
    try {
      await onSend(text);
      setMessage("");
      onTypingChange?.(false);
      if (typingTimeout.current) {
        window.clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom < 96;

    if (isAtBottom) {
      const scrollToBottom = () =>
        container.scrollTo({
          top: container.scrollHeight,
          behavior: chatEvents.length <= 1 ? "auto" : "smooth",
        });
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(scrollToBottom);
      } else {
        scrollToBottom();
      }
      setShowScrollHint(false);
    } else {
      setShowScrollHint(true);
    }
  }, [chatEvents]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        window.clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      onTypingChange?.(false);
    };
  }, [onTypingChange]);

  return (
    <div
      className={clsx(
        "flex h-full flex-col rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950",
        className ?? "max-h-[360px] md:max-h-[540px]",
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
        <span>Room chat</span>
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-300">
          Live
        </span>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex h-full flex-col space-y-3 overflow-y-auto px-4 py-4 text-sm"
        >
          {chatEvents.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
              Waiting for the first hello…
            </div>
          ) : (
            chatEvents.map((event) => {
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
                  className={clsx("flex items-start gap-2", isSelf ? "flex-row-reverse text-right" : "")}
                >
                  <div
                    className={clsx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm",
                      member?.color ? "ring-2 ring-white dark:ring-gray-900" : "bg-slate-400",
                    )}
                    style={member?.color ? { backgroundColor: member.color } : undefined}
                  >
                    {initials ?? member?.displayName?.charAt(0) ?? "?"}
                  </div>
                  <div
                    className={clsx(
                      "max-w-[70%] rounded-2xl px-3 py-2 shadow-sm",
                      isSelf
                        ? "rounded-tr-sm bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
                        : "rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
                    )}
                  >
                    {isSelf ? null : (
                      <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">
                        {member?.displayName ?? event.actorName}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{event.text}</p>
                    {event.createdAt ? (
                      <time className={clsx(
                        "mt-1 block text-[10px] tracking-wide",
                        isSelf ? "text-white/70" : "text-gray-500 dark:text-gray-400",
                      )}>
                        {event.createdAt.toDate().toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
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
      <form onSubmit={handleSubmit} className="border-t border-gray-100 p-3 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              const nextValue = event.target.value;
              if (!nextValue.trim()) {
                onTypingChange?.(false);
                if (typingTimeout.current) {
                  window.clearTimeout(typingTimeout.current);
                  typingTimeout.current = null;
                }
                return;
              }
              onTypingChange?.(true);
              if (typingTimeout.current) {
                window.clearTimeout(typingTimeout.current);
              }
              typingTimeout.current = window.setTimeout(() => {
                onTypingChange?.(false);
                typingTimeout.current = null;
              }, 2000);
            }}
            onBlur={() => {
              onTypingChange?.(false);
              if (typingTimeout.current) {
                window.clearTimeout(typingTimeout.current);
                typingTimeout.current = null;
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Say something nice…"
            rows={2}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
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
        {showTypingIndicators && typingMembers.length ? (
          <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
            {typingMembers
              .map((member) => member.displayName ?? "Someone")
              .slice(0, 2)
              .join(", ")}
            {typingMembers.length > 2 ? " and others" : ""} typing…
          </p>
        ) : null}
      </form>
    </div>
  );
}
