"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedInput } from "@/components/ui/segmented-input";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  MOCK_FRIENDS,
  MOCK_RECENT_GAMES,
  MOCK_STATS,
} from "@/lib/mock";
import { cn } from "@/lib/cn";

export default function DashboardPage() {
  const router = useRouter();
  const { session, findRoom } = useAppState();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function tryJoin(value: string) {
    const room = findRoom(value);
    if (!room) {
      setError("No room matches that code.");
      return;
    }
    router.push(`/room/${room.code}`);
  }

  return (
    <div className="mx-auto max-w-[980px] px-6 py-8 md:px-10">
      <header className="mb-8">
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
          Ready when you are, {session?.username ?? "Player"}.
        </h1>
      </header>

      {/* play zone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between rounded-lg border border-line-strong bg-surface p-5">
          <div>
            <h2 className="font-display text-lg font-bold text-text">Create a room</h2>
            <p className="mt-1 text-sm text-muted">
              Get a private code and become the host.
            </p>
          </div>
          <Button
            variant="primary"
            className="mt-6 w-full"
            onClick={() => router.push("/rooms/new")}
          >
            <Plus size={16} />
            New room
          </Button>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-line bg-surface p-5">
          <div>
            <h2 className="font-display text-lg font-bold text-text">Join with a code</h2>
            <p className="mt-1 text-sm text-muted">
              Six characters from a friend&apos;s invite.
            </p>
          </div>
          <div className="mt-6">
            <SegmentedInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setError(null);
              }}
              onComplete={tryJoin}
              invalid={!!error}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className={cn("text-xs", error ? "text-danger" : "text-faint")}>
                {error ?? "Try VEDHA7 for a demo lobby."}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={code.length < 6}
                onClick={() => tryJoin(code)}
              >
                Join <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* archive + side column */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <h3 className="eyebrow mb-3">Recent games</h3>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-faint">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                  <th className="px-4 py-2.5 font-medium text-right">Players</th>
                  <th className="px-4 py-2.5 font-medium text-right">Rounds</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RECENT_GAMES.map((g, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{g.date}</td>
                    <td className="px-4 py-2.5 text-text">{g.role}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "font-mono text-xs",
                          g.result === "Won" ? "text-ok" : "text-faint",
                        )}
                      >
                        {g.result}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">{g.players}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">{g.rounds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <h3 className="eyebrow mb-3">Friends</h3>
            <ul className="space-y-1 rounded-lg border border-line bg-surface p-2">
              {MOCK_FRIENDS.map((f) => (
                <li key={f.name} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                  <Avatar name={f.name} size={28} />
                  <span className="flex-1 truncate text-sm text-text">{f.name}</span>
                  <span className="flex items-center gap-1.5 text-[0.6875rem] text-faint">
                    <Circle
                      size={7}
                      className={f.online ? "fill-ok text-ok" : "fill-faint text-faint"}
                    />
                    {f.activity}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="eyebrow mb-3">This season</h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Played" value={MOCK_STATS.played} />
              <Stat label="Win rate" value={`${MOCK_STATS.winRatePct}%`} />
              <Stat label="As Vedha" value={`${MOCK_STATS.asVedhaPct}%`} />
              <Stat label="As Tracker" value={`${MOCK_STATS.asTrackerPct}%`} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2.5">
      <div className="font-mono text-lg text-text">{value}</div>
      <div className="mt-0.5 text-[0.6875rem] text-faint">{label}</div>
    </div>
  );
}
