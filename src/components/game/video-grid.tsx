"use client";

import { useMedia } from "@/components/providers/media-provider";
import { SelfTile, PeerTile } from "@/components/media/video-tile";
import { useGame } from "./game-provider";

const NAMES: Record<string, string> = {
  vedha: "Arjun",
  d1: "Karthik",
  d2: "Divya",
  d3: "Ashwin",
  d4: "Priya",
  d5: "Vetri",
};

/** 2×3 video tiles for the top of the right rail — your live tile + the table. */
export function VideoGrid() {
  const { game } = useGame();
  const { stream, camOn, micOn, toggleCam, toggleMic } = useMedia();

  const speaking = (id: string) => game.turn === id && game.status.kind === "playing";

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line px-3 py-1.5 text-[0.625rem] text-faint">
        Table voice · everyone hears everyone
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <SelfTile
            name="You"
            colorVar={game.pawns.vedha.varName}
            speaking={speaking("vedha")}
            stream={stream}
            camOn={camOn}
            micOn={micOn}
            onToggleCam={toggleCam}
            onToggleMic={toggleMic}
          />
          {["d1", "d2", "d3", "d4", "d5"].map((id) => (
            <PeerTile
              key={id}
              name={NAMES[id]}
              colorVar={game.pawns[id].varName}
              speaking={speaking(id)}
              micOn={id !== "d4"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
