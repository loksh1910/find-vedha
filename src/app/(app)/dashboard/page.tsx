"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Plus, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedInput } from "@/components/ui/segmented-input";
import { ComputerArt } from "@/components/game/mode-art";
import { useAppState } from "@/components/providers/app-state-provider";
import { IntroCard } from "@/components/shell/intro-card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type RecentGame = {
  id: string;
  endedAt: string;
  mode: "online" | "solo";
  rounds: number;
  players: number;
  myRole: "vedha" | "detective" | null;
  result: "won" | "lost";
};
type FriendRow = { uid: string; username: string; avatarId: string };
type SeasonStats = {
  games: number;
  wins: number;
  vedhaGames: number;
  vedhaWins: number;
  detGames: number;
  detWins: number;
};

const pctOf = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");
const shortDay = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, joinRoom, userId, hydrated } = useAppState();
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [recent, setRecent] = useState<RecentGame[] | null>(null);
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [gameTab, setGameTab] = useState<"friends" | "computer">("friends");

  useEffect(() => {
    if (!hydrated || !userId) return;
    let alive = true;
    (async () => {
      const [g, f, s] = await Promise.all([
        supabase.rpc("get_my_matches", { p_limit: 24 }),
        supabase.rpc("list_friends"),
        supabase.rpc("get_player_stats"),
      ]);
      if (!alive) return;
      setRecent(Array.isArray(g.data) ? (g.data as RecentGame[]) : []);
      setFriends(Array.isArray(f.data) ? (f.data as FriendRow[]) : []);
      if (s.data) setStats(s.data as SeasonStats);
    })();
    return () => {
      alive = false;
    };
  }, [supabase, hydrated, userId]);

  async function tryJoin(value: string) {
    setError(null);
    setBusy(true);
    const res = await joinRoom(value);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push(`/room/${res.room.code}`);
  }

  const visibleGames = (recent ?? [])
    .filter((g) => (gameTab === "friends" ? g.mode === "online" : g.mode === "solo"))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-[980px] px-6 py-8 md:px-10">
      <header className="mb-6">
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
          Ready when you are, {session?.username ?? "Player"}.
        </h1>
      </header>

      <IntroCard />

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
                {error ?? "Six characters from a friend's invite."}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={code.length < 6 || busy}
                onClick={() => tryJoin(code)}
              >
                {busy ? "Joining…" : "Join"} <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 sm:col-span-2 sm:flex-row sm:items-center">
          <div className="w-full shrink-0 sm:w-[200px]">
            <ComputerArt />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text">
              <Bot size={17} className="text-signal" />
              Play with computer
            </h2>
            <p className="mt-1 text-sm text-muted">
              No setup — pick Vedha or a Detective and the computer takes every
              other role.
            </p>
          </div>
          <Button
            variant="default"
            className="shrink-0"
            onClick={() => router.push("/room/SOLO?solo=1")}
          >
            Start <ArrowRight size={15} />
          </Button>
        </div>
      </div>

      {/* archive + side column */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <h3 className="eyebrow mb-3">Recent games</h3>
          <div className="mb-3 inline-flex rounded-md border border-line-strong p-0.5">
            {(["friends", "computer"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setGameTab(t)}
                className={cn(
                  "rounded px-3 py-1 font-mono text-xs transition-colors",
                  gameTab === t
                    ? "bg-surface-2 text-text"
                    : "text-muted hover:text-text",
                )}
              >
                {t === "friends" ? "With friends" : "With computer"}
              </button>
            ))}
          </div>
          {recent && visibleGames.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
              {gameTab === "friends"
                ? "No games with friends yet."
                : "No games with the computer yet."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[0.6875rem] text-faint">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Result</th>
                    <th className="px-4 py-2.5 font-medium text-right">Players</th>
                    <th className="px-4 py-2.5 font-medium text-right">Rounds</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent ? visibleGames : Array.from({ length: 4 })).map((g, i) =>
                    g ? (
                      <tr
                        key={(g as RecentGame).id}
                        onClick={() => router.push(`/m/${(g as RecentGame).id}`)}
                        className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-surface-2/50"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-muted">
                          {shortDay((g as RecentGame).endedAt)}
                        </td>
                        <td className="px-4 py-2.5 text-text">
                          {(g as RecentGame).myRole === "vedha" ? "Vedha" : "Detective"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "font-mono text-xs",
                              (g as RecentGame).result === "won" ? "text-ok" : "text-faint",
                            )}
                          >
                            {(g as RecentGame).result === "won" ? "Won" : "Lost"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                          {(g as RecentGame).players}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                          {(g as RecentGame).rounds}
                        </td>
                      </tr>
                    ) : (
                      <tr key={i} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-3.5" colSpan={5}>
                          <span className="block h-2 w-full max-w-[220px] rounded bg-surface-2" />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section>
            <h3 className="eyebrow mb-3">Friends</h3>
            {friends && friends.length === 0 ? (
              <div className="rounded-lg border border-line bg-surface px-3 py-6 text-center text-sm text-muted">
                No friends yet.
              </div>
            ) : (
              <ul className="space-y-0.5 rounded-lg border border-line bg-surface p-2">
                {(friends ?? Array.from({ length: 3 })).slice(0, 8).map((f, i) =>
                  f ? (
                    <li key={(f as FriendRow).uid}>
                      <Link
                        href={`/u/${encodeURIComponent((f as FriendRow).username)}`}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2"
                      >
                        <Avatar
                          name={(f as FriendRow).username}
                          avatarId={(f as FriendRow).avatarId}
                          size={28}
                        />
                        <span className="flex-1 truncate text-sm text-text">
                          {(f as FriendRow).username}
                        </span>
                      </Link>
                    </li>
                  ) : (
                    <li key={i} className="flex items-center gap-3 px-2 py-1.5">
                      <span className="h-7 w-7 shrink-0 rounded bg-surface-2" />
                      <span className="h-2 w-24 rounded bg-surface-2" />
                    </li>
                  ),
                )}
              </ul>
            )}
            <Button
              variant="default"
              size="sm"
              className="mt-2 w-full"
              onClick={() => router.push("/friends")}
            >
              <Plus size={13} />
              Add friends
            </Button>
          </section>

          <section>
            <h3 className="eyebrow mb-3">This season</h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Played" value={stats ? stats.games : "—"} />
              <Stat
                label="Win rate"
                value={stats ? pctOf(stats.wins, stats.games) : "—"}
              />
              <Stat
                label="As Vedha"
                value={stats ? pctOf(stats.vedhaWins, stats.vedhaGames) : "—"}
              />
              <Stat
                label="As Detective"
                value={stats ? pctOf(stats.detWins, stats.detGames) : "—"}
              />
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
