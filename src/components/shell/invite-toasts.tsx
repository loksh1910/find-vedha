"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invite } from "@/components/providers/presence-provider";

export function InviteToasts({
  invites,
  onDismiss,
}: {
  invites: Invite[];
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();
  if (invites.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,320px)] flex-col gap-2">
      {invites.map((i) => (
        <div
          key={i.id}
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-line-strong bg-surface p-3 shadow-lg"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text">
              <span className="font-medium">{i.fromName}</span> invited you to a
              room
            </p>
            <p className="mt-0.5 font-mono text-[0.7rem] text-faint">
              code {i.code}
            </p>
            <div className="mt-2 flex gap-1.5">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onDismiss(i.id);
                  router.push(`/room/${i.code}`);
                }}
              >
                Join
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDismiss(i.id)}>
                Later
              </Button>
            </div>
          </div>
          <button
            onClick={() => onDismiss(i.id)}
            aria-label="Dismiss"
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-faint hover:bg-surface-2 hover:text-text"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
