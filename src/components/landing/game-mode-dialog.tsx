"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { FriendsArt, ComputerArt } from "@/components/game/mode-art";

/** Signed-in "Play game" picker: friends → dashboard, computer → solo lobby. */
export function GameModeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="How do you want to play?"
      description="Set up a room for your friends, or take on the computer solo."
      className="sm:max-w-[620px]"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="group flex flex-col rounded-lg border border-line-strong bg-surface-2 p-4 text-left transition-colors hover:border-signal"
        >
          <FriendsArt />
          <span className="mt-3 flex items-center gap-1.5 font-display text-base font-bold text-text">
            Play with friends
            <ArrowRight size={15} className="text-signal transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 text-xs text-muted">
            Make a private room and share the code. 2–6 players.
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/room/SOLO?solo=1")}
          className="group flex flex-col rounded-lg border border-line-strong bg-surface-2 p-4 text-left transition-colors hover:border-signal"
        >
          <ComputerArt />
          <span className="mt-3 flex items-center gap-1.5 font-display text-base font-bold text-text">
            Play with computer
            <ArrowRight size={15} className="text-signal transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 text-xs text-muted">
            Pick a side — the computer takes every other role.
          </span>
        </button>
      </div>
    </Dialog>
  );
}
