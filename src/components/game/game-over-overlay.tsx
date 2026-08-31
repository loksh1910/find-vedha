"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-provider";

export function GameOverOverlay() {
  const router = useRouter();
  const { game, newGame } = useGame();
  if (game.status.kind !== "over") return null;
  const s = game.status;

  const headline =
    s.winner === "detective"
      ? "Detectives win"
      : s.reason.includes("survived")
        ? "Vedha escapes"
        : "Vedha wins";

  const route = game.log.map((e) => e.node);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-bg/85 backdrop-blur-sm">
      <div className="w-[min(92vw,440px)] rounded-lg border border-line-strong bg-surface p-6 text-center">
        <p className="eyebrow">Round {s.round}</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
          {headline}
        </h2>
        <p className="mt-1 text-sm text-muted">{s.reason}.</p>

        <div className="mt-4 rounded-md border border-line bg-bg-inset p-3 text-left">
          <div className="eyebrow mb-1">Vedha&apos;s route</div>
          <div className="font-mono text-xs leading-relaxed text-muted">
            {route.length ? route.map((n) => `#${n}`).join("  →  ") : "no moves"}
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={newGame}>
            New game
          </Button>
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
