"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Copy, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Blade } from "@/components/ui/blade";
import { useAppState, type MockRoom } from "@/components/providers/app-state-provider";

export default function CreateRoomPage() {
  const router = useRouter();
  const { createRoom } = useAppState();

  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [room, setRoom] = useState<MockRoom | null>(null);
  const [copied, setCopied] = useState(false);

  function create() {
    setRoom(createRoom(name, maxPlayers));
  }

  function copy() {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto max-w-[560px] px-6 py-8 md:px-10">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft size={15} />
        Dashboard
      </button>

      {!room ? (
        <>
          <p className="eyebrow">New room</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
            Set it up
          </h1>

          <div className="mt-6 space-y-5 rounded-lg border border-line-strong bg-surface p-5">
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Room name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sunday night chase"
                className="h-10 w-full rounded-md border border-line-strong bg-bg-inset px-3 text-sm text-text placeholder:text-faint focus:border-signal"
              />
            </label>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text">Max players</div>
                <div className="text-xs text-faint">1 Vedha + up to 5 Detectives</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  aria-label="Fewer players"
                  onClick={() => setMaxPlayers((n) => Math.max(2, n - 1))}
                  className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:text-text disabled:opacity-40"
                  disabled={maxPlayers <= 2}
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center font-mono text-lg text-text">{maxPlayers}</span>
                <button
                  aria-label="More players"
                  onClick={() => setMaxPlayers((n) => Math.min(6, n + 1))}
                  className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:text-text disabled:opacity-40"
                  disabled={maxPlayers >= 6}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between opacity-70">
              <div>
                <div className="flex items-center gap-2 text-sm text-text">
                  Fill empty Detective slots with AI
                  <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-faint">
                    Soon
                  </span>
                </div>
                <div className="text-xs text-faint">
                  For now, empty slots go to human players.
                </div>
              </div>
              <Switch checked={false} disabled aria-label="Fill empty Detective slots with AI (coming soon)" />
            </div>

            <p className="border-t border-line pt-4 text-xs text-faint">
              Standard game — 24 rounds, reveals on 3, 8, 13, 18, 24. One board:
              Chennai, 199 stops.
            </p>
          </div>

          <Button variant="primary" className="mt-5 w-full" onClick={create}>
            Create room
            <ArrowRight size={16} />
          </Button>
        </>
      ) : (
        <>
          <p className="eyebrow">Room ready</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
            {room.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Share this code. Only people with it can join.
          </p>

          {/* ticket-style code card */}
          <div className="mt-6 overflow-hidden rounded-lg border border-line-strong bg-surface">
            <div className="flex items-stretch">
              <div aria-hidden className="w-1.5 bg-signal" />
              <div className="flex-1 px-5 py-6">
                <div className="eyebrow">Invite code</div>
                <div className="mt-2 font-mono text-4xl tracking-[0.2em] text-text">
                  {room.code}
                </div>
              </div>
              <button
                onClick={copy}
                className="flex w-14 shrink-0 items-center justify-center border-l border-dashed border-line text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Copy code"
              >
                {copied ? <Check size={16} className="text-ok" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="mt-3">
            <Blade
              colorVar="--line-strong"
              label="Link"
              value={`find-vedha.local/room/${room.code}`}
            />
          </div>

          <Button
            variant="primary"
            className="mt-6 w-full"
            onClick={() => router.push(`/room/${room.code}`)}
          >
            Go to lobby
            <ArrowRight size={16} />
          </Button>
        </>
      )}
    </div>
  );
}
