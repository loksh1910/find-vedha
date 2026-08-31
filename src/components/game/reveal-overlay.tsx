"use client";

import { useGame } from "./game-provider";

export function RevealOverlay() {
  const { revealFlash } = useGame();
  if (!revealFlash) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
      <div
        className="rounded-md border-2 border-reveal bg-bg-inset/95 px-5 py-3 text-center shadow-lg"
        style={{ animation: "fv-fade-up 260ms var(--ease) both" }}
      >
        <div className="font-display text-lg font-extrabold tracking-tight text-reveal">
          Vedha surfaced
        </div>
        <div className="mt-0.5 font-mono text-sm text-text">
          station #{revealFlash.node} · round {revealFlash.round}
        </div>
      </div>
    </div>
  );
}
