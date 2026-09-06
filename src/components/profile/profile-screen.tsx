"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAppState } from "@/components/providers/app-state-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Profile = {
  id: string;
  username: string;
  avatarId: string;
  createdAt: string;
};

type Stats = {
  games: number;
  wins: number;
  vedhaGames: number;
  vedhaWins: number;
  detGames: number;
  detWins: number;
  catches: number;
  avgRoundsAsVedha: number;
  form: ("w" | "l")[];
};

type MatchRow = {
  id: string;
  endedAt: string;
  mode: "online" | "solo";
  rounds: number;
  winner: "vedha" | "detective";
  players: number;
  myRole: "vedha" | "detective" | null;
  result: "won" | "lost";
};

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");
const joined = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};
const day = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
};

export function ProfileScreen({ username }: { username?: string }) {
  const router = useRouter();
  const { session, userId, hydrated } = useAppState();
  const wanted = (username ?? session?.username ?? "").trim();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!hydrated || !wanted) return;
    let alive = true;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, avatar_id, created_at")
        .ilike("username", wanted)
        .maybeSingle();
      if (!alive) return;
      if (!p || p.username.toLowerCase() !== wanted.toLowerCase()) {
        setPhase("missing");
        return;
      }
      const prof: Profile = {
        id: p.id,
        username: p.username,
        avatarId: p.avatar_id,
        createdAt: p.created_at,
      };
      setProfile(prof);

      const { data: s } = await supabase.rpc("get_player_stats", { p_uid: prof.id });
      if (alive && s) setStats(s as Stats);

      if (prof.id === userId) {
        const { data: h } = await supabase.rpc("get_my_matches", { p_limit: 25 });
        if (alive && Array.isArray(h)) setMatches(h as MatchRow[]);
      }
      if (alive) setPhase("ready");
    })();
    return () => {
      alive = false;
    };
  }, [supabase, wanted, userId, hydrated]);

  if (phase === "loading") {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <p className="font-mono text-xs text-faint">Loading…</p>
      </main>
    );
  }

  if (phase === "missing" || !profile) {
    return (
      <main className="mx-auto max-w-[980px] px-6 py-16 text-center md:px-10">
        <p className="font-display text-lg font-bold text-text">No such player</p>
        <p className="mt-1 text-sm text-muted">
          Nobody here goes by &ldquo;{wanted}&rdquo;.
        </p>
        <Button variant="primary" className="mt-4" onClick={() => router.push("/dashboard")}>
          Dashboard
        </Button>
      </main>
    );
  }

  const isMe = profile.id === userId;
  const st = stats;

  return (
    <div className="mx-auto max-w-[980px] px-6 py-8 md:px-10">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={profile.username} avatarId={profile.avatarId} size={60} />
          <div>
            <p className="eyebrow">Profile</p>
            <h1 className="mt-0.5 font-display text-2xl font-extrabold tracking-tight text-text">
              {profile.username}
            </h1>
            <p className="mt-0.5 font-mono text-xs text-faint">
              joined {joined(profile.createdAt)}
              {st ? ` · ${st.games} ${st.games === 1 ? "game" : "games"}` : ""}
            </p>
          </div>
        </div>
        {isMe && (
          <Button size="sm" onClick={() => router.push("/settings")}>
            Edit profile
          </Button>
        )}
      </div>

      {/* stat band */}
      <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-lg border border-line-strong bg-surface sm:grid-cols-4 sm:divide-y-0">
        <Stat k="Games" v={st ? String(st.games) : "0"} />
        <Stat
          k="Win rate"
          v={pct(st?.wins ?? 0, st?.games ?? 0)}
          sub={st && st.games > 0 ? `${st.wins}–${st.games - st.wins}` : undefined}
        />
        <Stat
          k="As Vedha"
          v={pct(st?.vedhaWins ?? 0, st?.vedhaGames ?? 0)}
          sub={
            st && st.vedhaGames > 0
              ? `avg ${st.avgRoundsAsVedha} rounds`
              : "no games"
          }
        />
        <Stat
          k="As Detective"
          v={pct(st?.detWins ?? 0, st?.detGames ?? 0)}
          sub={
            st && st.detGames > 0
              ? `${st.catches} ${st.catches === 1 ? "catch" : "catches"}`
              : "no games"
          }
        />
      </div>

      {/* form */}
      {st && st.form.length > 0 && (
        <>
          <div className="mb-2 mt-5 flex items-center justify-between">
            <p className="font-mono text-xs text-faint">Last {st.form.length}</p>
            <span className="font-mono text-[0.7rem] text-faint">most recent →</span>
          </div>
          <div className="flex gap-1">
            {st.form.map((f, i) => (
              <span
                key={i}
                title={f === "w" ? "Won" : "Lost"}
                className="h-4 w-4 rounded-[3px]"
                style={{
                  background:
                    f === "w"
                      ? "color-mix(in srgb, var(--ok) 75%, transparent)"
                      : "color-mix(in srgb, var(--danger) 65%, transparent)",
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* history — own profile only */}
      {isMe && (
        <section className="mt-7">
          <p className="mb-2.5 font-mono text-xs text-faint">Match history</p>
          {matches && matches.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left font-mono text-[0.66rem] text-faint">
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Mode</th>
                      <th className="px-4 py-2.5 font-medium">Role</th>
                      <th className="px-4 py-2.5 font-medium">Result</th>
                      <th className="px-4 py-2.5 text-right font-medium">Rounds</th>
                      <th className="px-4 py-2.5 text-right font-medium">Players</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => router.push(`/m/${m.id}`)}
                        className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-surface-2/50"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-muted">
                          {day(m.endedAt)}
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {m.mode === "solo" ? "Solo" : "Online"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[0.7rem] text-muted">
                            {m.myRole === "vedha" ? "Vedha" : "Detective"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "font-mono text-[0.72rem]",
                              m.result === "won" ? "text-ok" : "text-danger",
                            )}
                          >
                            {m.result === "won" ? "Won" : "Lost"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                          {m.rounds}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                          {m.players}
                        </td>
                        <td className="px-2 text-faint">
                          <ChevronRight size={14} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-surface px-4 py-8 text-center">
              <p className="text-sm text-muted">No games yet.</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => router.push("/dashboard")}
              >
                Start one
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="px-4 py-3.5">
      <div className="font-mono text-[0.66rem] text-faint">{k}</div>
      <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-text">
        {v}
        {sub && (
          <span className="ml-1.5 font-mono text-[0.7rem] font-normal text-muted">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
