"use client";

import { BookOpen, LogOut, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { ManualDialog } from "@/components/manual/manual-dialog";
import { useGame } from "./game-provider";
import { nextRevealRound, isRevealRound, TOTAL_ROUNDS } from "@/lib/game/types";
import { cn } from "@/lib/cn";

export function Hud() {
  const router = useRouter();
  const { game, viewAs, setViewAs, autoDetectives, toggleAutoDetectives, newGame } =
    useGame();

  const reveal = nextRevealRound(game.round);
  const queue = ["vedha", "d1", "d2", "d3", "d4", "d5"];

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
      {/* round + reveal strip */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-text">
          Round <span className="text-lg font-medium">{game.round}</span>
          <span className="text-faint"> / {TOTAL_ROUNDS}</span>
        </span>
        <svg width={168} height={14} aria-hidden>
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
            const r = i + 1;
            const x = 3 + i * 7;
            const rev = isRevealRound(r);
            const cur = r === game.round;
            return (
              <circle
                key={r}
                cx={x}
                cy={7}
                r={rev ? 3.5 : 1.8}
                fill={rev ? "var(--signal)" : "var(--line-strong)"}
                stroke={cur ? "var(--game-accent)" : "none"}
                strokeWidth={2}
              />
            );
          })}
        </svg>
        <span className="font-mono text-[0.6875rem] text-faint">
          {isRevealRound(game.round)
            ? "REVEAL THIS ROUND"
            : reveal
              ? `next reveal: round ${reveal}`
              : "no more reveals"}
        </span>
      </div>

      {/* turn queue */}
      <div className="flex items-center gap-1.5">
        {queue.map((id) => {
          const p = game.pawns[id];
          const active = game.turn === id && game.status.kind === "playing";
          return (
            <span
              key={id}
              title={p.label}
              className={cn(
                "grid h-6 w-6 place-items-center rounded-sm font-mono text-[0.625rem] font-bold",
                active ? "text-game-accent-ink" : "text-faint",
                p.stuck && "opacity-40 line-through",
              )}
              style={{
                background: active
                  ? id === "vedha"
                    ? "var(--signal)"
                    : "var(--game-accent)"
                  : "var(--surface-2)",
              }}
            >
              {id === "vedha" ? "V" : p.slot}
            </span>
          );
        })}
        <span className="ml-1 text-xs text-muted">
          {game.status.kind === "over"
            ? "game over"
            : game.turn === "vedha"
              ? game.double.active
                ? `Vedha — Double-Move (hop ${game.double.hopsDone + 1}/2)`
                : "Vedha to move"
              : `${game.pawns[game.turn].label} to move`}
        </span>
      </div>

      {/* right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-line-strong text-xs">
          {(["vedha", "detective"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setViewAs(r)}
              className={cn(
                "px-3 py-1.5 font-medium capitalize",
                viewAs === r
                  ? "bg-game-accent text-game-accent-ink"
                  : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              {r === "vedha" ? "View: Vedha" : "View: Detectives"}
            </button>
          ))}
        </div>

        <label className="hidden items-center gap-2 text-[0.6875rem] text-faint sm:flex">
          Auto Detectives
          <Switch
            checked={autoDetectives}
            onCheckedChange={toggleAutoDetectives}
            aria-label="Auto-play detectives (demo)"
          />
        </label>

        <button
          onClick={newGame}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-faint hover:bg-surface-2 hover:text-muted"
        >
          <RotateCcw size={13} /> New game
        </button>
        <ManualDialog
          trigger={
            <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
              <BookOpen size={15} /> Manual
            </button>
          }
        />
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-danger"
        >
          <LogOut size={15} /> Leave game
        </button>
      </div>
    </header>
  );
}
