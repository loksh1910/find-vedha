"use client";

import { Video } from "lucide-react";
import { useMedia } from "@/components/providers/media-provider";
import { SelfTile, PeerTile } from "@/components/media/video-tile";

type Peer = { id: string; name: string; avatarId?: string };

const TILE = "w-[128px] shrink-0";

/** Horizontal table strip under the lobby header — your live tile + the table. */
export function LobbyVideo({ peers }: { peers: Peer[] }) {
  const { stream, camOn, micOn, phase, toggleCam, toggleMic, choose } = useMedia();
  const off = phase === "skipped" || phase === "error";

  return (
    <div className="-mx-4 -mt-4 mb-6 flex shrink-0 items-center gap-4 border-b border-line bg-surface px-4 py-3 md:-mx-8 md:-mt-8 md:px-6">
      <div className="shrink-0">
        <span className="eyebrow block">Table</span>
        <span className="font-mono text-[0.625rem] text-faint">
          {off ? "you're off camera" : "everyone sees everyone"}
        </span>
      </div>

      {off ? (
        <button
          onClick={() => choose({ cam: true, mic: true })}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2 text-sm text-muted hover:border-signal hover:text-text"
        >
          <Video size={15} />
          Turn on camera and mic
        </button>
      ) : (
        <div className="flex flex-1 gap-2 overflow-x-auto">
          <SelfTile
            className={TILE}
            name="You"
            stream={stream}
            camOn={camOn}
            micOn={micOn}
            onToggleCam={toggleCam}
            onToggleMic={toggleMic}
          />
          {peers.map((p) => (
            <PeerTile key={p.id} className={TILE} name={p.name} />
          ))}
        </div>
      )}
    </div>
  );
}
