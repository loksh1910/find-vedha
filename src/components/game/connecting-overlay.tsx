"use client";

import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-provider";

/**
 * Blocks the board while the real networked game is still loading, and
 * shows a real error (with a retry) if it never comes through — instead of
 * silently sitting on the local placeholder game, which looks like a normal
 * fresh board but will never accept anyone's move.
 */
export function ConnectingOverlay() {
  const { connecting, connectError, retryConnect } = useGame();

  if (!connecting && !connectError) return null;

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-bg/90 backdrop-blur-sm">
      <div className="w-[min(92vw,420px)] rounded-lg border border-line-strong bg-surface p-6 text-center">
        {connectError ? (
          <>
            <WifiOff size={22} className="mx-auto text-faint" />
            <h2 className="mt-3 font-display text-xl font-bold text-text">
              Couldn&apos;t load this game
            </h2>
            <p className="mt-1 text-sm text-muted">
              The connection didn&apos;t come through. Check your network and try again.
            </p>
            <Button variant="primary" className="mt-5" onClick={retryConnect}>
              Retry
            </Button>
          </>
        ) : (
          <>
            <Loader2 size={22} className="mx-auto animate-spin text-faint" />
            <h2 className="mt-3 font-display text-xl font-bold text-text">
              Joining the game…
            </h2>
            <p className="mt-1 text-sm text-muted">Loading the board and your seat.</p>
          </>
        )}
      </div>
    </div>
  );
}
