"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PanelRightClose, Video, VideoOff } from "lucide-react";
import { TravelLog } from "./travel-log";
import { PlayersPanel } from "./players-panel";
import { ChatPanel } from "./chat-panel";
import { VideoGrid } from "./video-grid";
import { VIDEO_UI } from "@/components/providers/media-provider";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "log", label: "Log" },
  { id: "players", label: "Players" },
  { id: "chat", label: "Chat" },
] as const;

export function RightRail({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("log");
  const [videoOn, setVideoOn] = useState(true);

  const params = useParams<{ code: string }>();
  const code = (Array.isArray(params.code) ? params.code[0] : params.code ?? "").toUpperCase();
  // start unknown so the video panel never flashes in a solo game before the
  // flag is read (solo = you vs the computer, no call)
  const [solo, setSolo] = useState<boolean | null>(null);
  useEffect(() => {
    let s = false;
    try {
      s = sessionStorage.getItem(`fv:solo:${code}`) === "1";
    } catch {
      /* no sessionStorage — treat as networked */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the solo flag
    setSolo(s);
  }, [code]);

  const videoAllowed = VIDEO_UI && solo === false;
  const showVideo = videoAllowed && videoOn;

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-line bg-surface xl:w-[360px]">
      <div className="flex items-stretch border-b border-line">
        <button
          onClick={onClose}
          aria-label="Hide side panel"
          className="grid w-8 shrink-0 place-items-center border-r border-line text-muted hover:bg-surface-2 hover:text-text"
        >
          <PanelRightClose size={15} />
        </button>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 px-1.5 py-2 text-[0.8125rem] font-medium",
              tab === t.id
                ? "border-b-2 border-game-accent text-text"
                : "text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
        {videoAllowed && (
          <button
            onClick={() => setVideoOn((v) => !v)}
            aria-label={videoOn ? "Hide video" : "Show video"}
            aria-pressed={videoOn}
            title={videoOn ? "Hide video" : "Show video"}
            className={cn(
              "grid w-8 shrink-0 place-items-center border-l border-line hover:bg-surface-2",
              videoOn ? "text-game-accent" : "text-faint hover:text-text",
            )}
          >
            {videoOn ? <Video size={15} /> : <VideoOff size={15} />}
          </button>
        )}
      </div>

      {showVideo && (
        <div className="min-h-[128px] max-h-[340px] shrink-0 grow-0 basis-[38%] overflow-hidden border-b border-line">
          <VideoGrid />
        </div>
      )}

      <div className="min-h-0 flex-1">
        {tab === "log" && <TravelLog />}
        {tab === "players" && <PlayersPanel />}
        {tab === "chat" && <ChatPanel />}
      </div>
    </aside>
  );
}
