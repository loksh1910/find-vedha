"use client";

import { Mic, Video, VideoOff } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMedia } from "@/components/providers/media-provider";

/** Shown once on entering the lobby — camera / mic / both / skip. */
export function CameraPrompt() {
  const { answered, phase, error, choose, skip } = useMedia();
  if (answered && phase !== "error") return null;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) skip();
      }}
      title="Join with camera and mic?"
      description="Everyone at the table sees and hears each other. You can change this any time from your tile."
    >
      <div className="space-y-2.5">
        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error} — you can still join without them.
          </p>
        )}
        <button
          onClick={() => choose({ cam: true, mic: true })}
          disabled={phase === "acquiring"}
          className="flex w-full items-center gap-3 rounded-md border border-line-strong bg-surface-2 px-3 py-3 text-left transition-colors hover:border-signal disabled:opacity-50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-signal/15 text-signal">
            <Video size={17} />
          </span>
          <span>
            <span className="block text-sm font-medium text-text">Camera and mic</span>
            <span className="block text-xs text-muted">They see you and hear you</span>
          </span>
        </button>

        <button
          onClick={() => choose({ cam: false, mic: true })}
          disabled={phase === "acquiring"}
          className="flex w-full items-center gap-3 rounded-md border border-line px-3 py-3 text-left transition-colors hover:border-signal disabled:opacity-50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-2 text-muted">
            <Mic size={17} />
          </span>
          <span>
            <span className="block text-sm font-medium text-text">Mic only</span>
            <span className="block text-xs text-muted">Talk without being on camera</span>
          </span>
        </button>

        <button
          onClick={() => choose({ cam: true, mic: false })}
          disabled={phase === "acquiring"}
          className="flex w-full items-center gap-3 rounded-md border border-line px-3 py-3 text-left transition-colors hover:border-signal disabled:opacity-50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-2 text-muted">
            <Video size={17} />
          </span>
          <span>
            <span className="block text-sm font-medium text-text">Camera only</span>
            <span className="block text-xs text-muted">Be seen, join muted</span>
          </span>
        </button>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={skip} disabled={phase === "acquiring"}>
            <VideoOff size={14} />
            Not now
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
