import { useEffect, useState } from "react";
import {
  listenToRoom,
  listenToRoomMembers,
  listenToRoomEvents,
  type RoomDocument,
  type RoomMember,
  type RoomEvent,
} from "../libs/rooms";
import type { FirestoreError } from "firebase/firestore";

export function useRoomRealtime(roomId: string) {
  const [room, setRoom] = useState<RoomDocument | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribeRoom = listenToRoom(
      roomId,
      (nextRoom) => {
        setRoom(nextRoom);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setRoom(null);
        setError(snapshotError);
        setLoading(false);
      },
    );
    const unsubscribeMembers = listenToRoomMembers(
      roomId,
      (nextMembers) => {
        setMembers(nextMembers);
      },
      () => {
        setMembers([]);
      },
    );
    const unsubscribeEvents = listenToRoomEvents(
      roomId,
      (nextEvents) => {
        setEvents(nextEvents);
      },
      { limitTo: 120 },
      () => {
        setEvents([]);
      },
    );
    return () => {
      unsubscribeRoom();
      unsubscribeMembers();
      unsubscribeEvents();
    };
  }, [roomId]);

  return { room, members, events, loading, error } as const;
}
