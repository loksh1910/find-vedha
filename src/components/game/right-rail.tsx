"use client";

import { useState } from "react";
import { PanelRightClose } from "lucide-react";
import { TravelLog } from "./travel-log";
import { PlayersPanel } from "./players-panel";
import { ChatPanel } from "./chat-panel";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "log", label: "Log" },
  { id: "players", label: "Players" },
  { id: "chat", label: "Chat" },
] as const;

export function RightRail({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("log");
  return (
    <aside className="flex w-[290px] shrink-0 flex-col border-l border-line bg-surface xl:w-[350px]">
      <div className="flex items-stretch border-b border-line">
        <button
          onClick={onClose}
          aria-label="Hide side panel"
          className="grid w-9 shrink-0 place-items-center border-r border-line text-muted hover:bg-surface-2 hover:text-text"
        >
          <PanelRightClose size={15} />
        </button>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 px-2 py-2 text-sm font-medium",
              tab === t.id
                ? "border-b-2 border-game-accent text-text"
                : "text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "log" && <TravelLog />}
        {tab === "players" && <PlayersPanel />}
        {tab === "chat" && <ChatPanel />}
      </div>
    </aside>
  );
}
