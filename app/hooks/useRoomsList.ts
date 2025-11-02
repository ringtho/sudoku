import { useEffect, useMemo, useState } from "react";
import { listenToRooms, type ListenToRoomsOptions, type RoomDocument } from "../libs/rooms";
import { getProfilesByUids } from "../libs/profiles";

type Options = {
  viewerUid?: string | null;
  ownerUid?: string;
  limitTo?: number;
};

export function useRoomsList(options: Options = {}) {
  const [rawRooms, setRawRooms] = useState<RoomDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerPhotoMap, setOwnerPhotoMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setOwnerPhotoMap((previous) => {
      let changed = false;
      const next = { ...previous };
      rawRooms.forEach((room) => {
        if (room.ownerPhotoURL && next[room.ownerUid] !== room.ownerPhotoURL) {
          next[room.ownerUid] = room.ownerPhotoURL;
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, [rawRooms]);

  useEffect(() => {
    if (!options.viewerUid) {
      setRawRooms([]);
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
        setRawRooms(nextRooms);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load rooms", error);
        setRawRooms([]);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [options.viewerUid, options.ownerUid, options.limitTo]);

  useEffect(() => {
    const missingOwners = rawRooms
      .map((room) => room.ownerUid)
      .filter((uid) => uid && ownerPhotoMap[uid] === undefined && !rawRooms.some((room) => room.ownerUid === uid && room.ownerPhotoURL));
    const uniqueMissing = Array.from(new Set(missingOwners));
    if (uniqueMissing.length === 0) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profileMap = await getProfilesByUids(uniqueMissing);
        if (cancelled) return;
        setOwnerPhotoMap((previous) => {
          const next = { ...previous };
          uniqueMissing.forEach((uid) => {
            const profile = profileMap.get(uid);
            next[uid] = profile?.photoURL ?? null;
          });
          return next;
        });
      } catch (error) {
        console.error("Failed to fetch owner profile photos", error);
        if (cancelled) return;
        setOwnerPhotoMap((previous) => {
          const next = { ...previous };
          uniqueMissing.forEach((uid) => {
            if (next[uid] === undefined) {
              next[uid] = null;
            }
          });
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawRooms, ownerPhotoMap]);

  const rooms = useMemo(
    () =>
      rawRooms.map((room) => ({
        ...room,
        ownerPhotoURL: room.ownerPhotoURL ?? ownerPhotoMap[room.ownerUid] ?? null,
      })),
    [rawRooms, ownerPhotoMap],
  );

  return { rooms, loading } as const;
}
