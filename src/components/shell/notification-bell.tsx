"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { usePresence } from "@/components/providers/presence-provider";

export function NotificationBell() {
  const router = useRouter();
  const {
    invites,
    dismissInvite,
    friendRequests,
    respondFriendRequest,
    notifCount,
  } = usePresence();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const empty = invites.length === 0 && friendRequests.length === 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-line-strong text-muted hover:bg-surface-2 hover:text-text"
      >
        <Bell size={16} />
        {notifCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-signal px-1 text-[0.625rem] font-bold text-signal-ink">
            {notifCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,320px)] overflow-hidden rounded-lg border border-line-strong bg-surface shadow-lg">
          <div className="border-b border-line px-3 py-2">
            <p className="eyebrow">Notifications</p>
          </div>

          {empty ? (
            <p className="px-3 py-6 text-center text-sm text-faint">
              Nothing new.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {invites.map((i) => (
                <li key={i.id} className="px-3 py-2.5">
                  <p className="text-sm text-text">
                    <span className="font-medium">{i.fromName}</span> invited you
                    to a room
                  </p>
                  <p className="mt-0.5 font-mono text-[0.66rem] text-faint">
                    code {i.code}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        dismissInvite(i.id);
                        setOpen(false);
                        router.push(`/room/${i.code}`);
                      }}
                    >
                      Join
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissInvite(i.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}

              {friendRequests.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 px-3 py-2.5">
                  <Avatar name={r.username} avatarId={r.avatarId} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{r.username}</p>
                    <p className="font-mono text-[0.66rem] text-faint">
                      wants to be friends
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => void respondFriendRequest(r.id, true)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void respondFriendRequest(r.id, false)}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
