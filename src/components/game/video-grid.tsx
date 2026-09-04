"use client";

import { Mic, MicOff, Video } from "lucide-react";
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

/** 2×3 video tiles for the top of the right rail. */
export function VideoGrid() {
  const { game } = useGame();

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line px-3 py-1.5 text-[0.625rem] text-faint">
        Table voice · everyone hears everyone
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {["vedha", "d1", "d2", "d3", "d4", "d5"].map((id) => {
            const p = game.pawns[id];
            const speaking = game.turn === id && game.status.kind === "playing";
            return (
              <div
                key={id}
                className={cn(
                  "relative flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border bg-bg-inset",
                  speaking ? "border-game-accent" : "border-line",
                )}
              >
                <Avatar name={NAMES[id]} size={26} />
                <span className="text-[0.625rem] text-muted">{NAMES[id]}</span>
                <span
                  className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full"
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
      </div>
    </div>
  );
}
