import { useEffect, useRef, useState } from "react";
import type { RoomEvent } from "../libs/rooms";

export function useUnreadChat(events: RoomEvent[], chatOpen: boolean, currentUserId: string | null) {
  const previousCountRef = useRef(events.length);
  const [unread, setUnread] = useState(0);

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
