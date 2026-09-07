"use client";

import { BookOpen, Bot, LogOut, RotateCcw, Search, VenetianMask } from "lucide-react";
import { ManualDialog } from "@/components/manual/manual-dialog";
import { useGame } from "./game-provider";
import { nextRevealRound, isRevealRound, TOTAL_ROUNDS } from "@/lib/game/types";
import { cn } from "@/lib/cn";

export function Hud() {
  const {
    game,
    viewAs,
    setViewAs,
    autoDetectives,
    toggleAutoDetectives,
    newGame,
    soloTools,
    leaveGame,
  } = useGame();

  const reveal = nextRevealRound(game.round);
  const queue = ["vedha", "d1", "d2", "d3", "d4", "d5"];
  const turnLabel =
    game.status.kind === "over"
      ? "game over"
      : game.turn === "vedha"
        ? game.double.active
          ? `Vedha — Double-Move (hop ${game.double.hopsDone + 1}/2)`
          : "Vedha to move"
        : `${game.pawns[game.turn].label} to move`;

  return (
    <header className="flex h-12 items-center gap-2.5 overflow-x-auto border-b border-line bg-surface px-4">
      {/* round + reveal track */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="whitespace-nowrap font-mono text-sm text-text">
          Round <span className="text-base font-medium">{game.round}</span>
          <span className="text-faint">/{TOTAL_ROUNDS}</span>
        </span>
        <svg width={110} height={12} aria-hidden className="shrink-0">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
            const r = i + 1;
            const x = 3 + i * 4.5;
            const rev = isRevealRound(r);
            const cur = r === game.round;
            return (
              <circle
                key={r}
                cx={x}
                cy={6}
                r={rev ? 3 : 1.6}
                fill={rev ? "var(--signal)" : "var(--line-strong)"}
                stroke={cur ? "var(--game-accent)" : "none"}
                strokeWidth={1.8}
              />
            );
          })}
        </svg>
        <span className="hidden whitespace-nowrap font-mono text-[0.625rem] text-faint lg:inline">
          {isRevealRound(game.round)
            ? "reveal now"
            : reveal
              ? `next reveal · r${reveal}`
              : "no more reveals"}
        </span>
      </div>

      <span className="h-5 w-px shrink-0 bg-line" />

      {/* turn queue */}
      <div className="flex shrink-0 items-center gap-1.5">
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
        <span className="ml-1 hidden whitespace-nowrap text-xs text-muted md:inline">
          {turnLabel}
        </span>
      </div>

      {/* right cluster — all icon-only */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {soloTools && (
          <>
            {/* dev aid: view-as toggle */}
            <div className="flex overflow-hidden rounded-md border border-line-strong">
              {(
                [
                  ["vedha", VenetianMask, "View as Vedha"],
                  ["detective", Search, "View as Detectives"],
                ] as const
              ).map(([r, Icon, label]) => (
                <button
                  key={r}
                  onClick={() => setViewAs(r)}
                  title={label}
                  aria-label={label}
                  aria-pressed={viewAs === r}
                  className={cn(
                    "grid h-8 w-8 place-items-center transition-colors",
                    viewAs === r
                      ? "bg-game-accent text-game-accent-ink"
                      : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>

            {/* dev aid: auto-play detectives */}
            <button
              onClick={toggleAutoDetectives}
              title="Auto-play Detectives (demo)"
              aria-label="Auto-play Detectives (demo)"
              aria-pressed={autoDetectives}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md border transition-colors",
                autoDetectives
                  ? "border-game-accent bg-game-accent/10 text-game-accent"
                  : "border-line-strong text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Bot size={15} />
            </button>

            {/* dev aid: new game */}
            <button
              onClick={newGame}
              title="New game"
              aria-label="New game"
              className="grid h-8 w-8 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-muted"
            >
              <RotateCcw size={14} />
            </button>

            <span className="mx-1 h-5 w-px bg-line" />
          </>
        )}

        <ManualDialog
          trigger={
            <button
              title="Manual"
              aria-label="Manual"
              className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
            >
              <BookOpen size={15} />
            </button>
          }
        />
        <button
          onClick={leaveGame}
          title="Leave game"
          aria-label="Leave game"
          className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-danger"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
