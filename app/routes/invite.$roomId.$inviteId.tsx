import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { RequireAuth } from "../components/layout/RequireAuth";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { getRoomInvite, redeemRoomInvite, type RoomInvite } from "../libs/invites";

export default function InviteRoute() {
  return (
    <RequireAuth>
      <InviteContent />
    </RequireAuth>
  );
}

function InviteContent() {
  const params = useParams<{ roomId: string; inviteId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const currentUser = auth.status === "authenticated" ? auth.user : null;

  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "redeeming" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roomId = params.roomId;
  const inviteId = params.inviteId;

  useEffect(() => {
    let mounted = true;
    if (!roomId || !inviteId) {
      setErrorMessage("Invalid invite URL.");
      setStatus("error");
      return;
    }

    (async () => {
      try {
        const result = await getRoomInvite(roomId, inviteId);
        if (!mounted) return;
        if (!result) {
          setErrorMessage("This invite no longer exists.");
          setStatus("error");
          return;
        }
        setInvite(result);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load invite", error);
        if (!mounted) return;
        setErrorMessage("We couldn't load this invite right now.");
        setStatus("error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [roomId, inviteId]);

  const actionMessage = useMemo(() => {
    if (!invite) return "";
    if (invite.redeemedBy) {
      return "This invite has already been redeemed.";
    }
    if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
      return "This invite has expired.";
    }
    return "Accept this invite to join the room.";
  }, [invite]);

  const roomLabel = invite?.roomName ?? roomId ?? "this room";

  const handleRedeem = async () => {
    if (!invite || !roomId || !inviteId || !currentUser) return;
    if (invite.redeemedBy) {
      setErrorMessage("This invite was already used.");
      setStatus("error");
      return;
    }
    setStatus("redeeming");
    setErrorMessage(null);
    try {
      await redeemRoomInvite(roomId, inviteId, currentUser.uid, currentUser.email);
      setStatus("success");
      setTimeout(() => navigate(`/room/${roomId}`), 1200);
    } catch (error) {
      console.error("Failed to redeem invite", error);
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "We couldn't redeem this invite.");
    }
  };

  return (
    <main className="mx-auto mt-16 max-w-xl space-y-6 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-gray-200">
      {status === "loading" ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p>Checking your invite…</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Join {roomLabel}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{actionMessage}</p>
          {invite?.targetEmail ? (
            <p className="rounded-xl bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              This invite was created for <strong>{invite.targetEmail}</strong>. Sign in with that email to continue.
            </p>
          ) : null}
          {status === "error" && errorMessage ? (
            <p className="rounded-xl bg-red-100 px-4 py-2 text-xs text-red-700 dark:bg-red-500/20 dark:text-red-200">
              {errorMessage}
            </p>
          ) : null}
          {status === "success" ? (
            <p className="rounded-xl bg-green-100 px-4 py-2 text-xs text-green-700 dark:bg-green-500/20 dark:text-green-200">
              Success! Redirecting you to the room…
            </p>
          ) : null}
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRedeem}
              disabled={status === "redeeming" || status === "success" || !invite || invite.redeemedBy != null}
            >
              {status === "redeeming" ? "Joining…" : invite?.redeemedBy ? "Invite used" : "Join room"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
