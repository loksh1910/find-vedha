"use client";

import { GameProvider } from "./game-provider";
import { Hud } from "./hud";
import { VideoStrip } from "./video-strip";
import { BoardCanvas } from "./board-canvas";
import { RevealOverlay } from "./reveal-overlay";
import { TicketPanel } from "./ticket-panel";
import { MoveControls } from "./move-controls";
import { RightRail } from "./right-rail";
import { GameOverOverlay } from "./game-over-overlay";

export function GameScreen() {
  return (
    <GameProvider>
      <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden">
        <Hud />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-[360px] flex-1 flex-col">
            <VideoStrip />
            <div className="relative min-h-0 flex-1">
              <BoardCanvas />
              <RevealOverlay />
            </div>
            <TicketPanel />
            <MoveControls />
          </div>
          <RightRail />
        </div>
        <GameOverOverlay />
      </div>
    </GameProvider>
  );
}
