"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-provider";

/**
 * Blocking overlay when Vedha's controller has dropped. Any Detective can end
 * the game (Detectives win); it clears itself if Vedha comes back.
 */
export function DisconnectOverlay() {
  const { vedhaAway, viewAs, concede, game } = useGame();
  const [armed, setArmed] = useState(false);

  const show = vedhaAway && viewAs !== "vedha" && game.status.kind === "playing";

  // small delay so a brief presence blip doesn't flash the overlay
  useEffect(() => {
    if (!show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the arm timer when Vedha is back
      setArmed(false);
      return;
    }
    const t = setTimeout(() => setArmed(true), 3500);
    return () => clearTimeout(t);
  }, [show]);

  if (!show || !armed) return null;

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-bg/85 backdrop-blur-sm">
      <div className="w-[min(92vw,420px)] rounded-lg border border-line-strong bg-surface p-6 text-center">
        <WifiOff size={22} className="mx-auto text-faint" />
        <h2 className="mt-3 font-display text-xl font-bold text-text">
          Vedha has disconnected
        </h2>
        <p className="mt-1 text-sm text-muted">
          Waiting for them to come back. The game is paused.
        </p>
        <Button variant="primary" className="mt-5" onClick={concede}>
          End game — Detectives win
        </Button>
      </div>
    </div>
  );
}
