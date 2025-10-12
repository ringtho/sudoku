import { useEffect, useState } from "react";
import { listenToRooms, type RoomDocument } from "../libs/rooms";

type Options = {
  ownerUid?: string;
  limitTo?: number;
};

export function useRoomsList(options: Options = {}) {
  const [rooms, setRooms] = useState<RoomDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToRooms(options, (nextRooms) => {
      setRooms(nextRooms);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [options.ownerUid, options.limitTo]);

  return { rooms, loading } as const;
}
