import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { allowRoomParticipant, revokeRoomParticipant } from "../../libs/rooms";
import {
  createRoomInvite,
  listenToRoomInvites,
  revokeRoomInvite,
  type RoomInvite,
} from "../../libs/invites";
import { findProfileByEmail } from "../../libs/profiles";
import { Button } from "../ui/button";

type RoomAccessPanelProps = {
  roomId: string;
  roomName: string;
  ownerUid: string;
  allowedUids: string[];
  currentUid: string;
};

type MessageState = {
  tone: "success" | "error" | "info";
  text: string;
};

function buildInviteUrl(roomId: string, inviteId: string) {
  if (typeof window === "undefined") return inviteId;
  return `${window.location.origin}/invite/${roomId}/${inviteId}`;
}

function formatTimestamp(ts: Date | null | undefined) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ts);
}

export function RoomAccessPanel({ roomId, roomName, ownerUid, allowedUids, currentUid }: RoomAccessPanelProps) {
  const [newUid, setNewUid] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "creating-link">("idle");
  const [message, setMessage] = useState<MessageState | null>(null);
  const [invites, setInvites] = useState<RoomInvite[]>([]);

  useEffect(() => {
    if (currentUid !== ownerUid) {
      setInvites([]);
      return () => {};
    }
    const unsubscribe = listenToRoomInvites(roomId, setInvites, {}, (error) => {
      if (error.code !== "permission-denied") {
        console.error("Failed to listen to invites", error);
      }
      setInvites([]);
    });
    return () => unsubscribe();
  }, [currentUid, ownerUid, roomId]);

  const normalizedAllowed = useMemo(() => {
    const unique = new Map<string, { uid: string; isOwner: boolean }>();
    for (const uid of allowedUids ?? []) {
      unique.set(uid, { uid, isOwner: uid === ownerUid });
    }
    if (!unique.has(ownerUid)) {
      unique.set(ownerUid, { uid: ownerUid, isOwner: true });
    }
    return Array.from(unique.values());
  }, [allowedUids, ownerUid]);

  const activeInvites = invites.filter((invite) => !invite.redeemedBy);
  const redeemedInvites = invites.filter(
    (invite) => invite.redeemedBy && !allowedUids.includes(invite.redeemedBy),
  );

  const showMessage = (update: MessageState) => {
    setMessage(update);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUidSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = newUid.trim();
    if (!candidate) {
      showMessage({ tone: "error", text: "Enter a user ID before inviting." });
      return;
    }
    if (candidate === ownerUid) {
      showMessage({ tone: "error", text: "You already own this room." });
      return;
    }
    setStatus("saving");
    try {
      await allowRoomParticipant(roomId, candidate);
      showMessage({ tone: "success", text: "User ID added. Share the room link with them." });
      setNewUid("");
    } catch (error) {
      console.error("Failed to grant access", error);
      showMessage({ tone: "error", text: "Couldn't add that user ID right now." });
    } finally {
      setStatus("idle");
    }
  };

  const handleInviteEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      showMessage({ tone: "error", text: "Enter an email address first." });
      return;
    }

    setStatus("saving");
    try {
      const profile = await findProfileByEmail(email);
      if (profile) {
        await allowRoomParticipant(roomId, profile.uid);
        showMessage({ tone: "success", text: `Access granted to ${profile.displayName ?? profile.email}.` });
      } else {
      const { id } = await createRoomInvite(roomId, ownerUid, {
        mode: "email",
        targetEmail: email,
        memo: `Email invite for ${email}`,
        roomName,
      });
        setLatestLink(buildInviteUrl(roomId, id));
        showMessage({
          tone: "info",
          text: "Invite created. Share the link below with your teammate so they can accept.",
        });
      }
      setInviteEmail("");
    } catch (error) {
      console.error("Failed to invite via email", error);
      showMessage({ tone: "error", text: "Couldn't send that invite right now." });
    } finally {
      setStatus("idle");
    }
  };

  const handleCreateLink = async () => {
    setStatus("creating-link");
    try {
      const { id } = await createRoomInvite(roomId, ownerUid, {
        mode: "link",
        memo: `Link invite for ${roomName}`,
        roomName,
      });
      const url = buildInviteUrl(roomId, id);
      setLatestLink(url);
      showMessage({ tone: "success", text: "New invite link ready to share." });
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showMessage({ tone: "success", text: "Invite link copied to clipboard." });
      }
    } catch (error) {
      console.error("Failed to create invite link", error);
      showMessage({ tone: "error", text: "Couldn't create an invite link right now." });
    } finally {
      setStatus("idle");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setStatus("saving");
    try {
      await revokeRoomInvite(roomId, inviteId);
      showMessage({ tone: "success", text: "Invite removed." });
    } catch (error) {
      console.error("Failed to remove invite", error);
      showMessage({ tone: "error", text: "Couldn't remove that invite." });
    } finally {
      setStatus("idle");
    }
  };

  const handleRevokeAccess = async (uid: string) => {
    if (uid === ownerUid) return;
    setStatus("saving");
    try {
      await revokeRoomParticipant(roomId, uid);
      showMessage({ tone: "success", text: "Access revoked." });
    } catch (error) {
      console.error("Failed to revoke access", error);
      showMessage({ tone: "error", text: "Couldn't revoke access right now." });
    } finally {
      setStatus("idle");
    }
  };

  const handleGrantFromInvite = async (invite: RoomInvite) => {
    if (!invite.redeemedBy) return;
    setStatus("saving");
    try {
      await allowRoomParticipant(roomId, invite.redeemedBy);
      await revokeRoomInvite(roomId, invite.id);
      showMessage({ tone: "success", text: "Access granted from invite." });
    } catch (error) {
      console.error("Failed to grant access from invite", error);
      showMessage({ tone: "error", text: "Couldn't grant access from that invite." });
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <header>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Room access</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Invite teammates using an email address or shareable link.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-gray-50 p-4 text-xs text-gray-600 dark:bg-slate-900 dark:text-gray-300">
        <p className="font-medium text-gray-700 dark:text-gray-200">Your user ID</p>
        <p className="break-all font-mono text-[11px] text-gray-800 dark:text-gray-200">{currentUid}</p>
        <p>Share this ID if someone prefers to be added manually.</p>
      </div>

      <form onSubmit={handleInviteEmail} className="space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="invite-email">
          Invite by email
        </label>
        <div className="flex gap-2">
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="teammate@example.com"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button type="submit" size="sm" disabled={status === "saving"}>
            {status === "saving" ? "Sending…" : "Invite"}
          </Button>
        </div>
      </form>

      <form onSubmit={handleUidSubmit} className="space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="invite-uid">
          Add by user ID
        </label>
        <div className="flex gap-2">
          <input
            id="invite-uid"
            type="text"
            value={newUid}
            onChange={(event) => setNewUid(event.target.value)}
            placeholder="Firebase UID"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button type="submit" size="sm" disabled={status === "saving"}>
            {status === "saving" ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Shareable invite link</p>
        <Button variant="outline" size="sm" onClick={handleCreateLink} disabled={status === "creating-link"}>
          {status === "creating-link" ? "Generating…" : "Create invite link"}
        </Button>
        {latestLink ? (
          <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-slate-900">
            <p className="font-medium text-gray-700 dark:text-gray-200">Latest link</p>
            <p className="mt-1 break-all font-mono text-[11px] text-gray-600 dark:text-gray-300">{latestLink}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs text-blue-600 hover:text-blue-500"
              onClick={async () => {
                if (navigator?.clipboard) {
                  await navigator.clipboard.writeText(latestLink);
                  showMessage({ tone: "success", text: "Link copied to clipboard." });
                }
              }}
            >
              Copy link
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">People with access</p>
        <ul className="space-y-1 text-xs">
          {normalizedAllowed.map(({ uid, isOwner }) => (
            <li key={uid} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-slate-900">
              <span className="truncate font-mono text-[11px] text-gray-700 dark:text-gray-200">{uid}</span>
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                    Owner
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-red-500 hover:text-red-600"
                    onClick={() => handleRevokeAccess(uid)}
                    disabled={status === "saving"}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Pending invites</p>
        {activeInvites.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-400 dark:bg-slate-900 dark:text-gray-500">
            No active invites.
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {activeInvites.map((invite) => (
              <li key={invite.id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                      {invite.mode === "email" && invite.targetEmail
                        ? `Email invite • ${invite.targetEmail}`
                        : "Link invite"}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Expires {formatTimestamp(invite.expiresAt?.toDate())}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
              onClick={async () => {
                const url = buildInviteUrl(roomId, invite.id);
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  await navigator.clipboard.writeText(url);
                  showMessage({ tone: "success", text: "Invite link copied." });
                }
              }}
            >
              Copy link
            </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-red-500 hover:text-red-600"
                      disabled={status === "saving"}
                      onClick={() => handleRevokeInvite(invite.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {redeemedInvites.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Redeemed invites awaiting approval</p>
          <ul className="space-y-2 text-xs">
            {redeemedInvites.map((invite) => (
              <li key={invite.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      {invite.targetEmail ? invite.targetEmail : invite.redeemedBy}
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Redeemed {invite.redeemedAt ? formatTimestamp(invite.redeemedAt.toDate()) : "recently"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="h-7 px-3 text-xs"
                      disabled={status === "saving"}
                      onClick={() => handleGrantFromInvite(invite)}
                    >
                      Grant access
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-red-500 hover:text-red-600"
                      disabled={status === "saving"}
                      onClick={() => handleRevokeInvite(invite.id)}
                    >
                      Remove invite
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? (
        <p
          className={clsx(
            "rounded-xl px-3 py-2 text-xs",
            message.tone === "error"
              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
              : message.tone === "success"
                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200"
                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
          )}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
