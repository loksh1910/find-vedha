"use client";

import { Video } from "lucide-react";
import { useMedia } from "@/components/providers/media-provider";
import { SelfTile, PeerTile } from "@/components/media/video-tile";
import { Button } from "@/components/ui/button";

type Peer = { id: string; name: string; avatarId?: string };

/** Lobby video strip — your live tile plus the rest of the table. */
export function LobbyVideo({ peers }: { peers: Peer[] }) {
  const { stream, camOn, micOn, phase, toggleCam, toggleMic, choose } = useMedia();
  const off = phase === "skipped" || phase === "error";

  return (
    <div className="border-b border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow">Table</h2>
        <span className="font-mono text-[0.625rem] text-faint">
          {off ? "you're off camera" : "everyone sees everyone"}
        </span>
      </div>

      {off ? (
        <button
          onClick={() => choose({ cam: true, mic: true })}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-4 text-sm text-muted hover:border-signal hover:text-text"
        >
          <Video size={15} />
          Turn on camera and mic
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <SelfTile
            name="You"
            stream={stream}
            camOn={camOn}
            micOn={micOn}
            onToggleCam={toggleCam}
            onToggleMic={toggleMic}
          />
          {peers.map((p) => (
            <PeerTile key={p.id} name={p.name} />
          ))}
        </div>
      )}

      {!off && (
        <div className="mt-2 flex gap-2">
          <Button
            variant={micOn ? "default" : "danger"}
            size="sm"
            className="flex-1"
            onClick={toggleMic}
          >
            {micOn ? "Mic on" : "Mic off"}
          </Button>
          <Button
            variant={camOn ? "default" : "danger"}
            size="sm"
            className="flex-1"
            onClick={toggleCam}
          >
            {camOn ? "Camera on" : "Camera off"}
          </Button>
        </div>
      )}
    </div>
  );
}
