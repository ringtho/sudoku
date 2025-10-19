import { useEffect, useRef, useState } from "react";
import type { RoomEvent } from "../libs/rooms";

export function useUnreadChat(
  events: RoomEvent[],
  chatOpen: boolean,
  currentUserId: string | null,
  roomId: string,
) {
  const previousCountRef = useRef(events.length);
  const lastRoomRef = useRef(roomId);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (lastRoomRef.current !== roomId) {
      lastRoomRef.current = roomId;
      previousCountRef.current = events.length;
      setUnread(0);
      return;
    }
    if (events.length < previousCountRef.current) {
      previousCountRef.current = events.length;
    }
  }, [events.length, roomId]);

  useEffect(() => {
    previousCountRef.current = events.length;
    setUnread(0);
  }, [currentUserId]);

  useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      previousCountRef.current = events.length;
      return;
    }
    if (events.length > previousCountRef.current) {
      const newEvents = events.slice(previousCountRef.current);
      const additional = newEvents.filter(
        (event) => event.type === "chat" && event.actorUid !== currentUserId,
      ).length;
      if (additional > 0) {
        setUnread((count) => count + additional);
      }
      previousCountRef.current = events.length;
    }
  }, [events, chatOpen, currentUserId]);

  return unread;
}
