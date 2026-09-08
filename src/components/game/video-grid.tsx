"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMedia, VIDEO_MOCK } from "@/components/providers/media-provider";
import { SelfTile, PeerTile } from "@/components/media/video-tile";
import { useGame } from "./game-provider";

type Seat = { id?: string; name: string; isMe: boolean; pawns: string[] };

/** Used when the lobby roster isn't in sessionStorage (e.g. a direct link). */
const FALLBACK: Seat[] = [{ name: "You", isMe: true, pawns: ["vedha"] }];

/** One video tile per player at the table — your tile plus everyone else. */
export function VideoGrid() {
  const { game } = useGame();
  const { stream, camOn, micOn, toggleCam, toggleMic, peers: onCall } = useMedia();
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
      /* keep the fallback */
    }
  }, [code]);

  const me = seats.find((s) => s.isMe) ?? seats[0];
  // one tile per real player — the computer opponent isn't a person on a call
  const peers = seats.filter(
    (s) => s !== me && s.id !== "cpu" && s.name !== "Computer",
  );

  const speaking = (pawns: string[]) =>
    game.status.kind === "playing" && pawns.includes(game.turn);
  const colorOf = (pawns: string[]) => game.pawns[pawns[0]]?.varName;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line px-3 py-1.5 text-[0.625rem] text-faint">
        Table voice · everyone hears everyone
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <SelfTile
            name="You"
            colorVar={colorOf(me?.pawns ?? [])}
            speaking={speaking(me?.pawns ?? [])}
            stream={stream}
            camOn={camOn}
            micOn={micOn}
            mock={VIDEO_MOCK}
            onToggleCam={toggleCam}
            onToggleMic={toggleMic}
          />
          {peers.map((s, i) => {
            const c = s.id ? onCall.find((p) => p.id === s.id) : undefined;
            return (
              <PeerTile
                key={s.id ?? `${s.name}-${i}`}
                name={s.name}
                colorVar={colorOf(s.pawns)}
                speaking={speaking(s.pawns) || !!c?.speaking}
                stream={c?.stream ?? null}
                mock={VIDEO_MOCK}
                camOn={c?.camOn ?? VIDEO_MOCK}
                micOn={c?.micOn ?? true}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
