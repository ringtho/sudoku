import { useEffect, useState } from "react";
import { listenToRoom, listenToRoomMembers, type RoomDocument, type RoomMember } from "../libs/rooms";

export function useRoomRealtime(roomId: string) {
  const [room, setRoom] = useState<RoomDocument | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
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
    return () => {
      unsubscribeRoom();
      unsubscribeMembers();
    };
  }, [roomId]);

  return { room, members, loading } as const;
}
