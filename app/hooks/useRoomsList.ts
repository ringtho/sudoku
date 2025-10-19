import { useEffect, useState } from "react";
import { listenToRooms, type ListenToRoomsOptions, type RoomDocument } from "../libs/rooms";

type Options = {
  viewerUid?: string | null;
  ownerUid?: string;
  limitTo?: number;
};

export function useRoomsList(options: Options = {}) {
  const [rooms, setRooms] = useState<RoomDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!options.viewerUid) {
      setRooms([]);
      setLoading(true);
      return;
    }

    setLoading(true);
    const { viewerUid, ownerUid, limitTo } = options;
    const subscriptionOptions: ListenToRoomsOptions = {
      viewerUid,
      ownerUid,
      limitTo,
    };
    const unsubscribe = listenToRooms(
      subscriptionOptions,
      (nextRooms) => {
        setRooms(nextRooms);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load rooms", error);
        setRooms([]);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [options.viewerUid, options.ownerUid, options.limitTo]);

  return { rooms, loading } as const;
}
