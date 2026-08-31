"use client";

import { useGame } from "./game-provider";

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
          const total = isVedha
            ? w.auto + w.bus + w.metro + w.wildcard + w.double
            : w.auto + w.bus + w.metro;
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
                    <span className="font-mono text-[0.5625rem] uppercase text-game-accent">
                      to move
                    </span>
                  )}
                  {p.stuck && (
                    <span className="font-mono text-[0.5625rem] uppercase text-danger">
                      stuck
                    </span>
                  )}
                </div>
                <div className="font-mono text-[0.6875rem] text-faint">
                  {showNode ? `#${p.node}` : "#?"} · {total} tickets
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
