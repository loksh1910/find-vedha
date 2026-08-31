"use client";

import { useGame } from "./game-provider";
import { TransportIcon, TransportLabel } from "./bits";
import { isRevealRound, TOTAL_ROUNDS } from "@/lib/game/types";
import { cn } from "@/lib/cn";

export function TravelLog() {
  const { game, viewAs } = useGame();
  const showNumbers = viewAs === "vedha";

  // group log entries by round (a Double-Move puts two in one round)
  const byRound = new Map<number, typeof game.log>();
  for (const e of game.log) {
    const list = byRound.get(e.round) ?? [];
    list.push(e);
    byRound.set(e.round, list);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <h3 className="eyebrow">
          {showNumbers ? "Vedha's travel record" : "Vedha's transport cards"}
        </h3>
        <p className="mt-0.5 text-[0.6875rem] text-faint">
          {showNumbers
            ? "every round — card + station"
            : "card only; station shown on reveal rounds"}
        </p>
      </div>
      <ol className="flex-1 divide-y divide-line/60 overflow-y-auto text-sm">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
          const r = i + 1;
          const entries = byRound.get(r);
          const reveal = isRevealRound(r);
          return (
            <li
              key={r}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5",
                reveal && "border-l-2 border-l-signal",
                !entries && "opacity-40",
              )}
            >
              <span className="w-8 shrink-0 font-mono text-[0.6875rem] text-faint">
                R{r}
              </span>
              {!entries ? (
                <span className="font-mono text-xs text-faint">—</span>
              ) : (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {entries.map((e, j) => {
                    const hideType = !showNumbers && e.transport === "wildcard";
                    return (
                      <span key={j} className="inline-flex items-center gap-1.5">
                        <TransportIcon t={e.transport} hideWildcardType={hideType} />
                        <span className="text-xs text-text/85">
                          {hideType ? "Wildcard" : TransportLabel(e.transport)}
                        </span>
                        {e.double && (
                          <span className="rounded-sm bg-surface-2 px-1 font-mono text-[0.5625rem] text-faint">
                            2×
                          </span>
                        )}
                        {(showNumbers || e.revealed) && (
                          <span className="font-mono text-xs text-game-accent">
                            #{e.node}
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {reveal && (
                    <span className="font-mono text-[0.5625rem] uppercase tracking-wide text-signal">
                      reveal
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
