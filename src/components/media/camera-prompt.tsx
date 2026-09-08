"use client";

import { useState } from "react";
import { Check, Mic, Video } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMedia, VIDEO_UI } from "@/components/providers/media-provider";
import { cn } from "@/lib/cn";

type Pick = { cam: boolean; mic: boolean };

const OPTIONS: { pick: Pick; icon: typeof Video; label: string; sub: string }[] = [
  { pick: { cam: true, mic: true }, icon: Video, label: "Camera and mic", sub: "They see you and hear you" },
  { pick: { cam: false, mic: true }, icon: Mic, label: "Mic only", sub: "Talk without being on camera" },
  { pick: { cam: true, mic: false }, icon: Video, label: "Camera only", sub: "Be seen, join muted" },
];

/** Shown once on entering the lobby — pick an option, then Confirm to apply it. */
export function CameraPrompt() {
  const { answered, phase, error, choose, skip } = useMedia();
  const [pick, setPick] = useState<Pick | null>(null);
  if (!VIDEO_UI) return null;
  if (answered && phase !== "error") return null;

  const busy = phase === "acquiring";
  const isPick = (p: Pick) => pick != null && pick.cam === p.cam && pick.mic === p.mic;

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

        {OPTIONS.map(({ pick: p, icon: Icon, label, sub }) => {
          const on = isPick(p);
          return (
            <button
              key={label}
              type="button"
              onClick={() => setPick(p)}
              disabled={busy}
              aria-pressed={on}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors disabled:opacity-50",
                on ? "border-signal bg-signal/10" : "border-line hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                  on ? "bg-signal/20 text-signal" : "bg-surface-2 text-muted",
                )}
              >
                <Icon size={17} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-text">{label}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
              {on && <Check size={16} className="text-signal" />}
            </button>
          );
        })}

        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button variant="ghost" size="sm" onClick={skip} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => pick && choose(pick)}
            disabled={!pick || busy}
          >
            {busy ? "Starting…" : "Confirm"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
