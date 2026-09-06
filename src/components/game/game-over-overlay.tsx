"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, LogOut, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-provider";

export function GameOverOverlay() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (
    Array.isArray(params.code) ? params.code[0] : (params.code ?? "")
  ).toUpperCase();
  const { game, newGame, soloTools } = useGame();
  // key the "dismissed" flag to this particular result, so a new game (or a
  // different ending) always shows the full result again with no effect.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  if (game.status.kind !== "over") return null;
  const s = game.status;

  const headline =
    s.winner === "detective"
      ? "Detectives win"
      : s.reason.includes("survived")
        ? "Vedha escapes"
        : "Vedha wins";

  const resultKey = `${s.round}·${s.winner}·${s.reason}·${game.log.length}`;
  const reviewing = dismissedKey === resultKey;
  const dismiss = () => setDismissedKey(resultKey);

  const route = game.log.map((e) => e.node);

  const exitToLobby = () => {
    if (!code) {
      router.push("/dashboard");
      return;
    }
    let solo = false;
    try {
      solo = sessionStorage.getItem(`fv:solo:${code}`) === "1";
    } catch {
      /* sessionStorage unavailable */
    }
    if (!solo) {
      // host-only server-side; a non-host's call 403s and is ignored. Resets
      // the room to a fresh roster so the same players can pick roles again.
      void fetch("/api/game/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    }
    router.push(solo ? `/room/${code}?solo=1` : `/room/${code}`);
  };

  /* dismissed — the board is left visible to look over; a slim bar keeps the
     result and an exit within reach. */
  if (reviewing) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line-strong bg-surface/95 py-1.5 pl-3.5 pr-1.5 shadow-lg backdrop-blur">
          <span className="font-mono text-[0.6875rem] text-faint">
            Game over · {headline} — reviewing the board
          </span>
          <button
            onClick={() => setDismissedKey(null)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium text-muted hover:bg-surface-2 hover:text-text"
          >
            <Eye size={12} />
            Result
          </button>
          <button
            onClick={exitToLobby}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium text-muted hover:bg-surface-2 hover:text-danger"
          >
            <LogOut size={12} />
            Exit game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-bg/85 backdrop-blur-sm">
      <div className="relative w-[min(92vw,440px)] rounded-lg border border-line-strong bg-surface p-6 text-center">
        <button
          onClick={dismiss}
          aria-label="Close and look over the board"
          className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-text"
        >
          <X size={15} />
        </button>

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

        <button
          onClick={dismiss}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-2 hover:text-text hover:underline"
        >
          <Eye size={13} />
          Look over the final board
        </button>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!soloTools && (
            <Button
              variant="primary"
              onClick={() => router.push(`/room/${code}/results`)}
            >
              View results
            </Button>
          )}
          <Button variant={soloTools ? "primary" : "default"} onClick={newGame}>
            <RotateCcw size={14} />
            {soloTools ? "New game" : "Rematch"}
          </Button>
          <Button variant="ghost" onClick={exitToLobby}>
            <LogOut size={14} />
            Exit game
          </Button>
        </div>
      </div>
    </div>
  );
}
