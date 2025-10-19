import { useEffect, useRef, useState } from "react";
import type { RoomEvent } from "../libs/rooms";

type ChatEvent = Extract<RoomEvent, { type: "chat" }>;

export function useUnreadChat(
  chatEvents: ChatEvent[],
  chatOpen: boolean,
  currentUserId: string | null,
  roomId: string,
) {
  const previousCountRef = useRef(chatEvents.length);
  const lastRoomRef = useRef(roomId);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (lastRoomRef.current !== roomId) {
      lastRoomRef.current = roomId;
      previousCountRef.current = chatEvents.length;
      setUnread(0);
      return;
    }
    if (chatEvents.length < previousCountRef.current) {
      previousCountRef.current = chatEvents.length;
    }
  }, [chatEvents.length, roomId]);

  useEffect(() => {
    previousCountRef.current = chatEvents.length;
    setUnread(0);
  }, [currentUserId]);

  useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      previousCountRef.current = chatEvents.length;
      return;
    }
    if (chatEvents.length > previousCountRef.current) {
      const newEvents = chatEvents.slice(previousCountRef.current);
      const additional = newEvents.filter((event) => event.actorUid !== currentUserId).length;
      if (additional > 0) {
        setUnread((count) => count + additional);
      }
      previousCountRef.current = chatEvents.length;
    }
  }, [chatEvents, chatOpen, currentUserId]);

  return unread;
}
