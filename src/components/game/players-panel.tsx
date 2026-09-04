"use client";

import type { ReactNode } from "react";
import { Layers2 } from "lucide-react";
import { useGame } from "./game-provider";
import { TransportIcon } from "./bits";
import { cn } from "@/lib/cn";

/** one ticket type: icon + count, no label */
function Tk({ icon, n }: { icon: ReactNode; n: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-[0.6875rem] tabular-nums",
        n === 0 ? "text-faint opacity-40" : "text-muted",
      )}
    >
      {icon}
      {n}
    </span>
  );
}

export function PlayersPanel() {
  const { game, viewAs, vedhaVisible } = useGame();
  const rows = ["vedha", "d1", "d2", "d3", "d4", "d5"].map((id) => game.pawns[id]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <h3 className="eyebrow">Players</h3>
      </div>
      <ul className="flex-1 divide-y divide-line/60 overflow-y-auto">
        {rows.map((p) => {
          const isVedha = p.id === "vedha";
          const showNode = isVedha ? viewAs === "vedha" || vedhaVisible : true;
          const w = p.wallet;
          return (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-sm font-mono text-[0.625rem] font-bold text-[#0b0f14]"
                style={{ background: `var(${p.varName})` }}
              >
                {isVedha ? "V" : p.slot}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-text">
                  {p.label}
                  {game.turn === p.id && game.status.kind === "playing" && (
                    <span className="font-mono text-[0.5625rem] text-game-accent">
                      to move
                    </span>
                  )}
                  {p.stuck && (
                    <span className="font-mono text-[0.5625rem] text-danger">
                      stuck
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[0.6875rem] text-faint">
                    {showNode ? `#${p.node}` : "#?"}
                  </span>
                  <span className="h-3 w-px bg-line" />
                  <Tk icon={<TransportIcon t="auto" size={13} />} n={w.auto} />
                  <Tk icon={<TransportIcon t="bus" size={13} />} n={w.bus} />
                  <Tk icon={<TransportIcon t="metro" size={13} />} n={w.metro} />
                  {isVedha && (
                    <>
                      <Tk
                        icon={<TransportIcon t="wildcard" size={13} />}
                        n={w.wildcard}
                      />
                      <Tk
                        icon={<Layers2 size={13} className="text-signal" />}
                        n={w.double}
                      />
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
