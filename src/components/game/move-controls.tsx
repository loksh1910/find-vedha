"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-provider";
import { TransportIcon, TransportLabel } from "./bits";
import type { MoveTransport } from "@/lib/game/types";

export function MoveControls() {
  const {
    game,
    viewAs,
    setViewAs,
    myTurn,
    activePawnId,
    autoDetectives,
    pending,
    chosenTransport,
    pickTransport,
    confirm,
    cancel,
    canDouble,
    startDouble,
    doubleActive,
  } = useGame();

  if (game.status.kind === "over") return null;

  const active = game.pawns[activePawnId];
  const other = viewAs === "vedha" ? "detective" : "vedha";

  return (
    <div className="border-t border-line bg-surface px-4 py-2.5">
      {doubleActive && game.turn === "vedha" && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-sm border border-signal/50 bg-signal/10 px-2 py-1 font-mono text-[0.6875rem] text-signal">
          Double-Move — hop {game.double.hopsDone + 1} of 2
        </div>
      )}

      {!myTurn ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {autoDetectives && game.turn !== "vedha"
              ? "Detectives are moving…"
              : `Waiting for ${active.label}.`}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setViewAs(other)}>
            Switch to {other === "vedha" ? "Vedha" : "Detective"} view
            <ArrowRight size={13} />
          </Button>
        </div>
      ) : !pending ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text">
            Your move — tap a highlighted station.
          </span>
          {viewAs === "vedha" && canDouble && (
            <Button size="sm" variant="default" onClick={startDouble}>
              Start Double-Move
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-text">
            {active.label}: #{active.node} <ArrowRight size={12} className="inline" />{" "}
            #{pending.to}
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from(new Set(pending.options.map((o) => o.transport))).map((t) => (
              <button
                key={t}
                onClick={() => pickTransport(t)}
                className={
                  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs " +
                  (chosenTransport === t
                    ? "border-game-accent text-text"
                    : "border-line text-muted hover:text-text")
                }
              >
                <TransportIcon t={t} />
                {TransportLabel(t)}
              </button>
            ))}
          </div>
          <span className="font-mono text-[0.6875rem] text-faint">
            {viewAs === "vedha"
              ? `Detectives see: ${
                  chosenTransport === "wildcard"
                    ? "WILDCARD (type hidden)"
                    : chosenTransport
                      ? (chosenTransport as MoveTransport).toUpperCase()
                      : "…"
                }`
              : "this ticket goes to Vedha"}
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!chosenTransport}
              onClick={confirm}
            >
              Confirm move
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
