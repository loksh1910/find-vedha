"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { usePresence } from "@/components/providers/presence-provider";
import { nodeById } from "@/lib/board/board-data";
import { REVEAL_ROUNDS, TOTAL_ROUNDS, type GameState } from "@/lib/game/types";
import type { GameSeat } from "@/lib/game/seats";
import { cn } from "@/lib/cn";

type MatchView = {
  id: string;
  code: string;
  mode: "online" | "solo";
  winner: "vedha" | "detective";
  reason: string;
  rounds: number;
  caughtAt: number | null;
  caughtBy: string | null;
  caughtByUid: string | null;
  state: GameState;
  seats: GameSeat[];
  endedAt: string;
  myRole: "vedha" | "detective" | null;
};

const fmtWhen = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export function ResultsScreen() {
  const router = useRouter();
  const params = useParams<{ code?: string; id?: string }>();
  const routeCode = (
    Array.isArray(params.code) ? params.code[0] : (params.code ?? "")
  ).toUpperCase();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const searchParams = useSearchParams();
  const matchId = routeId ?? searchParams.get("m");

  const { inviteToCode } = usePresence();
  const supabase = useMemo(() => createClient(), []);
  const [match, setMatch] = useState<MatchView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = matchId
        ? await supabase.rpc("get_match", { p_id: matchId })
        : await supabase.rpc("get_latest_match", { p_code: routeCode });
      if (!alive) return;
      if (data) {
        setMatch(data as MatchView);
        setState("ready");
      } else {
        setState("missing");
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, routeCode, matchId]);

  // the room these actions target — the just-finished room, whichever way we got here
  const code = (match?.code ?? routeCode).toUpperCase();

  const rematch = useCallback(async () => {
    if (!match) return;
    setBusy("rematch");
    const res = await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, force: true, fromMatch: match.id }),
    });
    setBusy(null);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "" }));
      setNote(
        error === "game-in-progress"
          ? "That game is still going."
          : "Couldn't start the rematch.",
      );
      return;
    }
    // pull the other players in
    const others = match.seats
      .map((s) => s.uid)
      .filter((u) => u && u !== "00000000-0000-0000-0000-000000000000");
    inviteToCode(others, code);
    router.push(`/room/${code}/play`);
  }, [match, code, router, inviteToCode]);

  const toLobby = useCallback(async () => {
    setBusy("lobby");
    await fetch("/api/game/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
    router.push(`/room/${code}`);
  }, [code, router]);

  if (state === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="font-mono text-xs text-faint">Loading the result…</p>
      </main>
    );
  }

  if (state === "missing" || !match) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-lg font-bold text-text">
            No result to show
          </p>
          <p className="mt-1 text-sm text-muted">
            This game hasn&apos;t finished, or you weren&apos;t in it.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </Button>
        </div>
      </main>
    );
  }

  return <Loaded match={match} onRematch={rematch} onLobby={toLobby} busy={busy} note={note} />;
}

/* ------------------------------------------------------------------ */

function Loaded({
  match,
  onRematch,
  onLobby,
  busy,
  note,
}: {
  match: MatchView;
  onRematch: () => void;
  onLobby: () => void;
  busy: string | null;
  note: string | null;
}) {
  const router = useRouter();
  const g = match.state;
  const players = g.pawns;

  const headline =
    match.winner === "detective"
      ? "Detectives win"
      : match.reason.toLowerCase().includes("surviv")
        ? "Vedha escapes"
        : "Vedha wins";

  const vedhaSeat = match.seats.find((s) => s.pawns.includes("vedha"));
  const catcherSeat =
    match.caughtBy != null
      ? match.seats.find((s) => s.pawns.includes(match.caughtBy!))
      : undefined;

  // detective seats in slot order
  const detSeats = [...match.seats]
    .filter((s) => !s.pawns.includes("vedha"))
    .sort((a, b) => (a.pawns[0] ?? "").localeCompare(b.pawns[0] ?? ""));

  const route = g.log.map((e) => e.node);
  const board = useRouteBoard(route, match.caughtAt);

  return (
    <main className="mx-auto max-w-[980px] px-6 py-8 md:px-10">
      {/* outcome */}
      <div className="rounded-lg border border-line-strong bg-surface p-5 md:p-6">
        <p className="font-mono text-xs text-muted">
          Round {match.rounds} of {TOTAL_ROUNDS}
          {match.mode === "solo" && " · solo"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text">
          {headline}
        </h1>
        <p className="mt-1 text-sm text-muted">{match.reason || "Game over"}.</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-faint">
          <span>
            <span className="text-muted">Vedha</span> {vedhaSeat?.name ?? "—"}
          </span>
          {catcherSeat && (
            <span>
              <span className="text-muted">Caught by</span> {catcherSeat.name}
            </span>
          )}
          <span>
            <span className="text-muted">Players</span> {match.seats.length}
          </span>
          <span>
            <span className="text-muted">Ended</span> {fmtWhen(match.endedAt)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_1fr]">
        {/* route */}
        <section className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-3 font-mono text-xs text-faint">Vedha&apos;s path</p>
          <svg
            viewBox="0 0 360 220"
            className="block w-full rounded-md border border-line"
            style={{ background: "var(--game-canvas)" }}
            role="img"
            aria-label="Vedha's route across the board this game."
          >
            {board.segments.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="var(--reveal)"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}
            {board.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === 0 ? 4.5 : 3}
                fill="var(--game-canvas)"
                stroke={i === 0 ? "var(--faint)" : "var(--line-strong)"}
                strokeWidth={1.5}
              />
            ))}
            {board.caught && (
              <>
                <circle
                  cx={board.caught.x}
                  cy={board.caught.y}
                  r={7}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth={2}
                />
                <circle cx={board.caught.x} cy={board.caught.y} r={3.5} fill="var(--danger)" />
              </>
            )}
          </svg>
          <p className="mt-3 font-mono text-[0.72rem] leading-loose text-muted">
            {g.log.map((e, i) => (
              <span key={i}>
                {i > 0 && <span className="text-faint"> · </span>}
                <TicketTag t={e.transport} />{" "}
                <span
                  className={cn(
                    "text-text",
                    match.caughtAt === e.node && i === g.log.length - 1 && "text-danger",
                  )}
                >
                  #{e.node}
                </span>
              </span>
            ))}
          </p>
        </section>

        {/* the chase */}
        <section className="overflow-hidden rounded-lg border border-line bg-surface">
          <p className="border-b border-line px-4 py-2.5 font-mono text-xs text-faint">
            The chase
          </p>
          <ul className="divide-y divide-line">
            <PlayerRow
              name={vedhaSeat?.name ?? "Vedha"}
              chip="Vedha"
              varName="--reveal"
              line={
                match.winner === "vedha"
                  ? `escaped — lasted ${match.rounds} rounds`
                  : `caught on round ${match.rounds}`
              }
            />
            {detSeats.map((s) => {
              const pid = s.pawns[0];
              const p = players[pid];
              const madeCatch =
                match.caughtByUid === s.uid ||
                (match.caughtBy != null && s.pawns.includes(match.caughtBy));
              const line = madeCatch
                ? "made the catch"
                : s.pawns.some((x) => players[x]?.stuck)
                  ? "ran out of moves"
                  : "in the chase";
              return (
                <PlayerRow
                  key={s.uid || pid}
                  name={s.name}
                  chip={p?.label ?? pid.toUpperCase()}
                  varName={p?.varName ?? "--muted"}
                  line={line}
                  ok={madeCatch}
                />
              );
            })}
          </ul>
        </section>
      </div>

      {/* reveal strip */}
      <section className="mt-4 rounded-lg border border-line bg-surface p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-mono text-xs text-faint">Reveal rounds</p>
          <span className="font-mono text-[0.7rem] text-faint">
            {REVEAL_ROUNDS.join(" · ")}
          </span>
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
            const r = i + 1;
            const played = r <= match.rounds;
            const reveal = (REVEAL_ROUNDS as readonly number[]).includes(r);
            const end = r === match.rounds;
            return (
              <span
                key={r}
                title={`Round ${r}${reveal ? " · reveal" : ""}`}
                className="h-5 flex-1 rounded-[2px]"
                style={{
                  background: end
                    ? "var(--danger)"
                    : reveal && played
                      ? "var(--reveal)"
                      : played
                        ? "var(--line-strong)"
                        : "var(--bg-inset)",
                }}
              />
            );
          })}
        </div>
      </section>

      {/* actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {match.mode === "solo" ? (
          <Button
            variant="primary"
            onClick={() => router.push("/room/SOLO?solo=1")}
          >
            <RotateCcw size={14} />
            Play again
          </Button>
        ) : (
          <>
            <Button variant="primary" onClick={onRematch} disabled={busy != null}>
              <RotateCcw size={14} />
              {busy === "rematch" ? "Starting…" : "Rematch — same players"}
            </Button>
            <Button variant="default" onClick={onLobby} disabled={busy != null}>
              Back to lobby
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          <LogOut size={14} />
          Dashboard
        </Button>
        {note && <span className="font-mono text-xs text-danger">{note}</span>}
      </div>
    </main>
  );
}

function PlayerRow({
  name,
  chip,
  varName,
  line,
  ok,
}: {
  name: string;
  chip: string;
  varName: string;
  line: string;
  ok?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Avatar name={name} size={30} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-text">{name}</span>
          <span
            className="rounded-full border px-1.5 py-0.5 font-mono text-[0.6rem]"
            style={{
              color: `var(${varName})`,
              borderColor: `color-mix(in srgb, var(${varName}) 45%, transparent)`,
            }}
          >
            {chip}
          </span>
        </div>
        <span
          className={cn(
            "font-mono text-[0.68rem]",
            ok ? "text-ok" : "text-faint",
          )}
        >
          {line}
        </span>
      </div>
    </li>
  );
}

function TicketTag({ t }: { t: string }) {
  const map: Record<string, string> = {
    auto: "--t-auto",
    bus: "--t-bus",
    metro: "--t-metro",
    wildcard: "--t-river",
  };
  const v = map[t] ?? "--faint";
  return (
    <span
      className="rounded-[3px] border px-1 py-px text-[0.6rem]"
      style={{
        color: `var(${v})`,
        borderColor: `color-mix(in srgb, var(${v}) 50%, transparent)`,
      }}
    >
      {t === "wildcard" ? "wild" : t}
    </span>
  );
}

/** Fit Vedha's visited nodes into the small results SVG. */
function useRouteBoard(route: number[], caughtAt: number | null) {
  return useMemo(() => {
    const ids = route.length ? route : [1];
    const pts = ids.map((id) => {
      const n = nodeById(id);
      return { x: n.x, y: n.y };
    });
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const W = 360;
    const H = 220;
    const pad = 24;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    const ox = (W - spanX * scale) / 2;
    const oy = (H - spanY * scale) / 2;
    const map = (p: { x: number; y: number }) => ({
      x: ox + (p.x - minX) * scale,
      y: oy + (p.y - minY) * scale,
    });
    const points = pts.map(map);
    const segments = points.slice(1).map((p, i) => ({
      x1: points[i].x,
      y1: points[i].y,
      x2: p.x,
      y2: p.y,
    }));
    const caught =
      caughtAt != null && ids[ids.length - 1] === caughtAt
        ? points[points.length - 1]
        : null;
    return { points, segments, caught };
  }, [route, caughtAt]);
}
