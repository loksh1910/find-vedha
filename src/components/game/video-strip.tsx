"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mic, MicOff, Video } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useGame } from "./game-provider";
import { cn } from "@/lib/cn";

const NAMES: Record<string, string> = {
  vedha: "Arjun",
  d1: "Karthik",
  d2: "Divya",
  d3: "Ashwin",
  d4: "Priya",
  d5: "Vetri",
};

export function VideoStrip() {
  const { game } = useGame();
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-line bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1 text-[0.6875rem] text-faint hover:text-muted"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Table voice — everyone hears everyone
      </button>
      {open && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2">
          {["vedha", "d1", "d2", "d3", "d4", "d5"].map((id) => {
            const p = game.pawns[id];
            const speaking = game.turn === id && game.status.kind === "playing";
            return (
              <div
                key={id}
                className={cn(
                  "relative flex h-14 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md border bg-bg-inset",
                  speaking ? "border-game-accent" : "border-line",
                )}
              >
                <Avatar name={NAMES[id]} size={22} />
                <span className="text-[0.625rem] text-muted">{NAMES[id]}</span>
                <span
                  className="absolute left-1 top-1 h-2 w-2 rounded-full"
                  style={{ background: `var(${p.varName})` }}
                />
                <div className="absolute bottom-1 right-1 flex gap-0.5 text-faint">
                  {id === "d4" ? <MicOff size={9} /> : <Mic size={9} />}
                  <Video size={9} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
