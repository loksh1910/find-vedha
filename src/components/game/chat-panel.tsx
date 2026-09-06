"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatScope } from "@/lib/realtime/use-room-chat";
import { useGame } from "./game-provider";
import { cn } from "@/lib/cn";

export function ChatPanel() {
  const { soloTools } = useGame();
  return soloTools ? <SoloChat /> : <LiveChat />;
}

/* ------------------------------------------------------------------ *
 *  Live chat — real players, over Supabase Realtime broadcast.
 *  `public` reaches everyone; `det` only reaches Detective clients
 *  (the Vedha player's browser never joins that channel).
 * ------------------------------------------------------------------ */
function LiveChat() {
  const { chatDet, chat: messages, sendChat: send } = useGame();

  const [scope, setScope] = useState<ChatScope>("public");
  const [input, setInput] = useState("");
  const activeScope: ChatScope = chatDet ? scope : "public";
  const shown = useMemo(
    () => messages.filter((m) => m.scope === activeScope),
    [messages, activeScope],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    send(text, activeScope);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <h3 className="eyebrow mb-2">Chat</h3>
        {chatDet ? (
          <div className="flex overflow-hidden rounded-sm border border-line text-xs">
            {(["public", "det"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "flex-1 px-2 py-1 font-medium",
                  scope === s
                    ? "bg-surface-2 text-text"
                    : "text-muted hover:text-text",
                )}
              >
                {s === "public" ? "Public" : "Detectives only"}
              </button>
            ))}
          </div>
        ) : (
          <span className="font-mono text-[0.625rem] text-faint">
            Public — Vedha + Detectives
          </span>
        )}
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
        {shown.length === 0 && (
          <li className="text-xs text-faint">No messages here yet.</li>
        )}
        {shown.map((m) => (
          <li key={m.id}>
            <span className="font-mono text-[0.625rem] text-faint">{m.from}</span>
            <div className="text-text/90">{m.text}</div>
          </li>
        ))}
      </ul>

      {activeScope === "det" && (
        <p className="border-t border-line px-3 py-1 font-mono text-[0.5625rem] text-danger/80">
          Vedha can&apos;t see this tab
        </p>
      )}
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-line p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            activeScope === "det"
              ? "Message the Detectives…"
              : "Message everyone…"
          }
          className="h-8 flex-1 rounded-md border border-line-strong bg-bg-inset px-2 text-sm text-text placeholder:text-faint focus:border-game-accent"
        />
        <Button size="icon" type="submit" aria-label="Send">
          <Send size={13} />
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Solo — a scripted demo so the panel isn't empty vs. the computer.
 * ------------------------------------------------------------------ */
type DemoMsg = { scope: ChatScope; from: string; text: string };

const SEED: DemoMsg[] = [
  { scope: "public", from: "Vedha", text: "good luck finding me" },
  { scope: "det", from: "D2", text: "he used Bus last round — covering the north lines" },
  { scope: "det", from: "D4", text: "i'll sit on the metro hub" },
];

const BOT_REPLIES = [
  "on it",
  "moving now",
  "he's boxed in on the east side",
  "watch the river crossing",
  "nice",
];

function SoloChat() {
  const { viewAs } = useGame();
  const [scope, setScope] = useState<ChatScope>("public");
  const [msgs, setMsgs] = useState<DemoMsg[]>(SEED);
  const [input, setInput] = useState("");

  const activeScope = viewAs === "vedha" ? "public" : scope;
  const shown = useMemo(
    () => msgs.filter((m) => m.scope === activeScope),
    [msgs, activeScope],
  );

  function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const from = viewAs === "vedha" ? "You (Vedha)" : "You (D1)";
    setMsgs((m) => [...m, { scope: activeScope, from, text }]);
    setInput("");
    if (activeScope === "det") {
      const reply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
      setTimeout(
        () => setMsgs((m) => [...m, { scope: "det", from: "D3", text: reply }]),
        900,
      );
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <h3 className="eyebrow mb-2">Chat</h3>
        {viewAs === "detective" ? (
          <div className="flex overflow-hidden rounded-sm border border-line text-xs">
            {(["public", "det"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "flex-1 px-2 py-1 font-medium",
                  scope === s
                    ? "bg-surface-2 text-text"
                    : "text-muted hover:text-text",
                )}
              >
                {s === "public" ? "Public" : "Detectives only"}
              </button>
            ))}
          </div>
        ) : (
          <span className="font-mono text-[0.625rem] text-faint">
            Public — Vedha + Detectives
          </span>
        )}
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
        {shown.length === 0 && (
          <li className="text-xs text-faint">No messages here yet.</li>
        )}
        {shown.map((m, i) => (
          <li key={i}>
            <span className="font-mono text-[0.625rem] text-faint">{m.from}</span>
            <div className="text-text/90">{m.text}</div>
          </li>
        ))}
      </ul>

      {activeScope === "det" && (
        <p className="border-t border-line px-3 py-1 font-mono text-[0.5625rem] text-danger/80">
          Vedha can&apos;t see this tab
        </p>
      )}
      <form onSubmit={send} className="flex gap-2 border-t border-line p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={activeScope === "det" ? "Message the Detectives…" : "Message everyone…"}
          className="h-8 flex-1 rounded-md border border-line-strong bg-bg-inset px-2 text-sm text-text placeholder:text-faint focus:border-game-accent"
        />
        <Button size="icon" type="submit" aria-label="Send">
          <Send size={13} />
        </Button>
      </form>
    </div>
  );
}
