"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMedia } from "@/components/providers/media-provider";
import { SelfTile, PeerTile } from "@/components/media/video-tile";
import { useGame } from "./game-provider";

type Seat = { name: string; isMe: boolean; pawns: string[] };

/** Used when the lobby roster isn't in sessionStorage (e.g. direct link). */
const FALLBACK: Seat[] = [
  { name: "You", isMe: true, pawns: ["vedha"] },
  { name: "Karthik", isMe: false, pawns: ["d1"] },
  { name: "Divya", isMe: false, pawns: ["d2"] },
  { name: "Ashwin", isMe: false, pawns: ["d3"] },
  { name: "Priya", isMe: false, pawns: ["d4"] },
  { name: "Vetri", isMe: false, pawns: ["d5"] },
];

/** One video tile per player at the table — your live tile plus the rest. */
export function VideoGrid() {
  const { game } = useGame();
  const { stream, camOn, micOn, toggleCam, toggleMic } = useMedia();
  const params = useParams<{ code: string }>();
  const code = (Array.isArray(params.code) ? params.code[0] : params.code ?? "").toUpperCase();

  const [seats, setSeats] = useState<Seat[]>(FALLBACK);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`fv:seats:${code}`);
      const parsed = raw ? (JSON.parse(raw) as Seat[]) : null;
      if (Array.isArray(parsed) && parsed.length) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the lobby roster */
        setSeats(parsed);
      }
    } catch {
      /* keep the fallback table */
    }
  }, [code]);

  const me = seats.find((s) => s.isMe) ?? seats[0];
  const peers = seats.filter((s) => s !== me);
  const speaking = (s: Seat) =>
    game.status.kind === "playing" && s.pawns.includes(game.turn);
  const colorOf = (s: Seat) => game.pawns[s.pawns[0]]?.varName;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line px-3 py-1.5 text-[0.625rem] text-faint">
        Table voice · everyone hears everyone
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <SelfTile
            name="You"
            colorVar={colorOf(me)}
            speaking={speaking(me)}
            stream={stream}
            camOn={camOn}
            micOn={micOn}
            onToggleCam={toggleCam}
            onToggleMic={toggleMic}
          />
          {peers.map((s, i) => (
            <PeerTile
              key={`${s.name}-${i}`}
              name={s.name}
              colorVar={colorOf(s)}
              speaking={speaking(s)}
              micOn
            />
          ))}
        </div>
      </div>
    </div>
  );
}
