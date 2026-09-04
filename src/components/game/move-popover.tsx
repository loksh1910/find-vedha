"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-provider";
import { TransportIcon, TransportLabel } from "./bits";
import type { MoveTransport } from "@/lib/game/types";
import { cn } from "@/lib/cn";

export type Anchor = { x: number; y: number; flipX: boolean; flipY: boolean };

/** Floating move-confirm card, anchored next to the tapped station. */
export function MovePopover({ anchor }: { anchor: Anchor }) {
  const { game, viewAs, activePawnId, pending, chosenTransport, pickTransport, confirm, cancel } =
    useGame();
  if (!pending) return null;

  const active = game.pawns[activePawnId];
  const options = Array.from(new Set(pending.options.map((o) => o.transport)));

  const tx = anchor.flipX ? "calc(-100% - 14px)" : "14px";
  const ty = anchor.flipY ? "calc(-100% - 12px)" : "-50%";

  return (
    <div
      className="pointer-events-auto absolute z-20"
      style={{ left: anchor.x, top: anchor.y, transform: `translate(${tx}, ${ty})` }}
    >
      {/* pointer toward the node */}
      <span
        aria-hidden
        className={cn(
          "absolute h-2.5 w-2.5 rotate-45 border-line-strong bg-surface-2",
          anchor.flipX
            ? "right-[-5px] border-r border-t"
            : "left-[-5px] border-b border-l",
          anchor.flipY ? "bottom-4" : "top-1/2 -translate-y-1/2",
        )}
      />
      <div
        className="w-[250px] rounded-lg border border-line-strong bg-surface-2 p-3 shadow-[0_14px_36px_-10px_rgba(0,0,0,0.65)]"
        style={{ animation: "fv-pop 130ms var(--ease) both" }}
      >
        <div className="flex items-center gap-2 font-mono text-sm text-text">
          <span className="text-muted">{active.label}</span>
          <span className="text-faint">#{active.node}</span>
          <ArrowRight size={13} className="text-faint" />
          <span className="text-game-accent">#{pending.to}</span>
        </div>

        <div className="mt-2.5 flex gap-2">
          {options.map((t) => {
            const on = chosenTransport === t;
            return (
              <button
                key={t}
                onClick={() => pickTransport(t)}
                aria-pressed={on}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-2 transition-colors",
                  on
                    ? "border-game-accent bg-game-accent/10 text-text"
                    : "border-line text-muted hover:border-line-strong hover:text-text",
                )}
              >
                <TransportIcon t={t} size={20} />
                <span className="text-xs font-medium">{TransportLabel(t)}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-2 font-mono text-[0.625rem] text-faint">
          {viewAs === "vedha"
            ? `Detectives see: ${
                chosenTransport === "wildcard"
                  ? "WILDCARD (hidden)"
                  : chosenTransport
                    ? (chosenTransport as MoveTransport).toUpperCase()
                    : "…"
              }`
            : "This ticket goes to Vedha"}
        </p>

        <div className="mt-2.5 flex gap-2">
          <Button size="sm" variant="ghost" className="flex-1" onClick={cancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            disabled={!chosenTransport}
            onClick={confirm}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
