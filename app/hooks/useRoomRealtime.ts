import { useEffect, useState } from "react";
import {
  listenToRoom,
  listenToRoomMembers,
  listenToRoomEvents,
  type RoomDocument,
  type RoomMember,
  type RoomEvent,
} from "../libs/rooms";

export function useRoomRealtime(roomId: string) {
  const [room, setRoom] = useState<RoomDocument | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribeRoom = listenToRoom(roomId, (nextRoom) => {
      setRoom(nextRoom);
      setLoading(false);
    });
    const unsubscribeMembers = listenToRoomMembers(roomId, (nextMembers) => {
      setMembers(nextMembers);
    });
    const unsubscribeEvents = listenToRoomEvents(roomId, (nextEvents) => {
      setEvents(nextEvents);
    }, { limitTo: 120 });
    return () => {
      unsubscribeRoom();
      unsubscribeMembers();
      unsubscribeEvents();
    };
  }, [roomId]);

  return { room, members, events, loading } as const;
}
