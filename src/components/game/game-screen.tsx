"use client";

import { useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { GameProvider } from "./game-provider";
import { Hud } from "./hud";
import { BoardCanvas } from "./board-canvas";
import { RevealOverlay } from "./reveal-overlay";
import { TicketPanel } from "./ticket-panel";
import { RightRail } from "./right-rail";
import { GameOverOverlay } from "./game-over-overlay";
import { DisconnectOverlay } from "./disconnect-overlay";

export function GameScreen() {
  const [railOpen, setRailOpen] = useState(true);
  return (
    <GameProvider>
      <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden">
        <Hud />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-[320px] flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <BoardCanvas />
              <RevealOverlay />
            </div>
            <TicketPanel />
          </div>
          {railOpen ? (
            <RightRail onClose={() => setRailOpen(false)} />
          ) : (
            <button
              onClick={() => setRailOpen(true)}
              aria-label="Show side panel"
              className="flex w-9 shrink-0 items-center justify-center border-l border-line bg-surface text-muted hover:bg-surface-2 hover:text-text"
            >
              <PanelRightOpen size={16} />
            </button>
          )}
        </div>
        <GameOverOverlay />
        <DisconnectOverlay />
      </div>
    </GameProvider>
  );
}
