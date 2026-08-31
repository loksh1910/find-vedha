"use client";

import { useGame } from "./game-provider";
import { TicketChip } from "./bits";
import { cn } from "@/lib/cn";

const VEDHA_START = { auto: 4, bus: 3, metro: 3 };

export function TicketPanel() {
  const { game, viewAs } = useGame();

  if (viewAs === "vedha") {
    const w = game.pawns.vedha.wallet;
    const gained = Math.max(
      0,
      w.auto + w.bus + w.metro - (VEDHA_START.auto + VEDHA_START.bus + VEDHA_START.metro),
    );
    return (
      <div className="flex items-center gap-4 border-t border-line bg-surface px-4 py-2">
        <span className="eyebrow">Your tickets</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <TicketChip t="auto" n={w.auto} />
          <TicketChip t="bus" n={w.bus} />
          <TicketChip t="metro" n={w.metro} />
          <span className="mx-1 h-4 w-px bg-line" />
          <TicketChip t="wildcard" n={w.wildcard} />
          <TicketChip t="double" n={w.double} />
        </div>
        {gained > 0 && (
          <span className="font-mono text-[0.6875rem] text-ok">
            +{gained} from Detectives
          </span>
        )}
      </div>
    );
  }

  const dets = ["d1", "d2", "d3", "d4", "d5"].map((id) => game.pawns[id]);
  return (
    <div className="flex items-center gap-3 overflow-x-auto border-t border-line bg-surface px-4 py-2">
      <span className="eyebrow shrink-0">Detective tickets</span>
      {dets.map((p) => (
        <div
          key={p.id}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-sm border px-2 py-1",
            game.turn === p.id
              ? "border-game-accent"
              : "border-line",
            p.stuck && "opacity-40",
          )}
        >
          <span
            className="grid h-4 w-4 place-items-center rounded-sm font-mono text-[0.5625rem] font-bold text-[#0b0f14]"
            style={{ background: `var(${p.varName})` }}
          >
            {p.slot}
          </span>
          <span className="font-mono text-[0.6875rem] text-muted">
            {p.wallet.auto}·{p.wallet.bus}·{p.wallet.metro}
          </span>
          {p.stuck && (
            <span className="font-mono text-[0.5625rem] uppercase text-danger">
              stuck
            </span>
          )}
        </div>
      ))}
      <span className="shrink-0 font-mono text-[0.625rem] text-faint">
        A·B·M · spent tickets pass to Vedha
      </span>
    </div>
  );
}
