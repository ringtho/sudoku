import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import type { RoomEvent, RoomMember } from "../../libs/rooms";
import { Button } from "../ui/button";

type ChatEvent = Extract<RoomEvent, { type: "chat" }>;

type RoomChatProps = {
  events: ChatEvent[];
  members: RoomMember[];
  currentUserId: string | null;
  onSend: (message: string) => Promise<void>;
  onTypingChange?: (typing: boolean) => void;
  className?: string;
  maxHeight?: string;
  showTypingIndicators?: boolean;
  variant?: "card" | "sheet";
};

const DEFAULT_CARD_HEIGHT = "h-[520px] md:h-[560px] lg:h-[600px]";

export function RoomChat({
  events,
  members,
  currentUserId,
  onSend,
  onTypingChange,
  className,
  maxHeight,
  showTypingIndicators = true,
  variant = "card",
}: RoomChatProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<number | null>(null);
  const initialScrollRef = useRef(true);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const [composerHeight, setComposerHeight] = useState(0);

  const chatEvents = events;

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

  useLayoutEffect(() => {
    const updateHeight = () => {
      setComposerHeight(composerRef.current?.offsetHeight ?? 0);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && composerRef.current) {
      observer = new ResizeObserver(updateHeight);
      observer.observe(composerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeight);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollToBottom = (behavior: ScrollBehavior) => {
      const target = container.scrollHeight - container.clientHeight;
      const run = () =>
        container.scrollTo({
          top: target > 0 ? target : 0,
          behavior,
        });
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(run);
      } else {
        run();
      }
    };

    if (chatEvents.length === 0) {
      setShowScrollHint(false);
      initialScrollRef.current = true;
      return;
    }

    if (initialScrollRef.current) {
      initialScrollRef.current = false;
      scrollToBottom("auto");
      setShowScrollHint(false);
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const threshold = variant === "card" ? 96 : Math.max(composerHeight + 48, 160);
    const isAtBottom = distanceFromBottom <= threshold;

    if (isAtBottom) {
      scrollToBottom(chatEvents.length <= 1 ? "auto" : "smooth");
      setShowScrollHint(false);
    } else {
      setShowScrollHint(true);
    }
  }, [chatEvents, composerHeight, variant]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        window.clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      onTypingChange?.(false);
    };
  }, [onTypingChange]);

  const isCard = variant === "card";

  const outerClasses = clsx(
    "flex min-h-0 w-full flex-col",
    isCard
      ? "overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
      : "flex-1 bg-white dark:bg-slate-900 sm:-mx-4",
    !className && isCard ? DEFAULT_CARD_HEIGHT : null,
    className,
  );

  const messagePaddingBottom = !isCard
    ? composerHeight > 0
      ? `calc(${composerHeight}px + env(safe-area-inset-bottom, 0px) + 0.75rem)`
      : "calc(env(safe-area-inset-bottom, 0px) + 1.75rem)"
    : undefined;

  const scrollHintBottom = !isCard
    ? composerHeight > 0
      ? `calc(${composerHeight}px + env(safe-area-inset-bottom, 0px) + 0.5rem)`
      : "calc(env(safe-area-inset-bottom, 0px) + 2rem)"
    : undefined;

  return (
    <div className={outerClasses} style={maxHeight ? { maxHeight } : undefined}>
      {isCard ? (
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
          <span>Room chat</span>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-300">
            Live
          </span>
        </header>
      ) : null}

      <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className={clsx(
            "flex-1 min-h-0 overflow-y-auto px-4 text-sm space-y-3",
            isCard ? "py-4" : "pt-2",
          )}
          style={!isCard ? { paddingBottom: messagePaddingBottom } : undefined}
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
                <div key={event.id} className={clsx("flex items-start gap-2", isSelf ? "flex-row-reverse text-right" : "")}>
                  <div
                    className={clsx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm",
                      member?.color ? "ring-2 ring-white dark:ring-gray-900" : "bg-slate-400",
                    )}
                    style={member ? { backgroundColor: member.color } : undefined}
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
                      <div className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-300">
                        {member?.displayName ?? event.actorName}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{event.text}</p>
                    {event.createdAt ? (
                      <time
                        className={clsx(
                          "mt-1 block text-[10px] tracking-wide",
                          isSelf ? "text-white/70" : "text-gray-500 dark:text-gray-400",
                        )}
                      >
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
            className={clsx(
              "absolute left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              isCard ? "bottom-24 bg-gray-900/80 text-white backdrop-blur hover:bg-gray-900 dark:bg-white/20" : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white/20",
            )}
            style={
              !isCard
                ? {
                    bottom: scrollHintBottom,
                    zIndex: 30,
                  }
                : { zIndex: 30 }
            }
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
      <form
        ref={composerRef}
        onSubmit={handleSubmit}
        className={clsx(
          isCard
            ? "border-t border-gray-100 p-3 dark:border-gray-800"
            : "border-t border-transparent bg-transparent px-4 pb-4 pt-4",
        )}
        style={
          !isCard
            ? {
                paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 1rem)`,
              }
            : undefined
        }
      >
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
            className={clsx(
              "flex-1 resize-none rounded-2xl border px-3 py-2 text-sm text-gray-800 outline-none ring-blue-500 focus:ring-2",
              isCard
                ? "border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                : "border-gray-200 bg-white shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            )}
          />
          <Button type="submit" variant="primary" size="sm" disabled={!message.trim() || sending}>
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
