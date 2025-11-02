import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import type { RoomEvent, RoomMember } from "../../libs/rooms";
import { Button } from "../ui/button";
import { Smile } from "lucide-react";

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

const EMOJI_GROUPS: Array<{ label: string; emojis: string[] }> = [
  {
    label: "Celebration",
    emojis: ["🎉", "🥳", "🏆", "⭐️", "👏", "🔥", "💯", "🎊", "🥂", "🌟"],
  },
  {
    label: "Positivity",
    emojis: ["😀", "😄", "😊", "😍", "😎", "🤩", "😁", "😇", "🤗", "🥰", "❤️", "💖", "💗"],
  },
  {
    label: "Teamwork",
    emojis: ["👍", "🙌", "🤝", "💪", "🙏", "🤗", "✨", "🤜", "🤛", "🧠"],
  },
  {
    label: "Gaming",
    emojis: ["🎯", "🧩", "🕹️", "📈", "🧠", "🪄", "🛡️", "⚡️", "🌀", "🧿"],
  },
  {
    label: "Expressions",
    emojis: ["🤔", "😅", "🤓", "🥲", "😴", "🤠", "🤭", "😤", "🤡", "🙃"],
  },
];

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  const updateComposerValue = useCallback(
    (value: string) => {
      setMessage(value);
      const trimmed = value.trim();
      if (!trimmed) {
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
    },
    [onTypingChange],
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

  const insertEmoji = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current;
      if (textarea) {
        const selectionStart = textarea.selectionStart ?? message.length;
        const selectionEnd = textarea.selectionEnd ?? message.length;
        const nextValue = `${message.slice(0, selectionStart)}${emoji}${message.slice(selectionEnd)}`;
        updateComposerValue(nextValue);
        requestAnimationFrame(() => {
          const node = textareaRef.current;
          if (!node) return;
          node.focus();
          const cursor = selectionStart + emoji.length;
          node.setSelectionRange(cursor, cursor);
        });
      } else {
        updateComposerValue(`${message}${emoji}`);
      }
      setShowEmojiPicker(false);
    },
    [message, updateComposerValue],
  );

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

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        emojiPickerRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target)
      ) {
        return;
      }
      setShowEmojiPicker(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEmojiPicker]);

  const isCard = variant === "card";

  const outerClasses = clsx(
    "flex min-h-0 w-full flex-col",
    isCard
      ? "rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
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

      <div className="relative flex flex-1 min-h-0 flex-col overflow-visible">
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
              const avatarUrl = member?.photoURL ?? null;

              return (
                <div key={event.id} className={clsx("flex items-start gap-2", isSelf ? "flex-row-reverse text-right" : "")}>
                  <div
                    className={clsx(
                      "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold text-white shadow-sm",
                      member?.color ? "ring-2 ring-white dark:ring-gray-900" : "bg-slate-400",
                    )}
                    style={!avatarUrl && member?.color ? { backgroundColor: member.color } : undefined}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={member?.displayName ?? event.actorName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      initials ?? member?.displayName?.charAt(0) ?? "?"
                    )}
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
            ref={textareaRef}
            value={message}
            onChange={(event) => {
              updateComposerValue(event.target.value);
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
          <div className="relative">
            <button
              type="button"
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker((open) => !open)}
              aria-label="Insert emoji"
              aria-expanded={showEmojiPicker}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-blue-500",
                isCard
                  ? "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                  : "border-gray-200 bg-white hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
              )}
            >
              <Smile className="h-5 w-5 text-gray-500 dark:text-gray-300" aria-hidden="true" />
            </button>
            {showEmojiPicker ? (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-11 right-0 z-40 w-64 max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-xl transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
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
