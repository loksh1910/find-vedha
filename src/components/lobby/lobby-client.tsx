"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  Copy,
  Crown,
  LogOut,
  Minus,
  Plus,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { CountdownRing } from "@/components/ui/countdown-ring";
import { ManualDialog } from "@/components/manual/manual-dialog";
import { SlotCard } from "./slot-card";
import { TransitionOverlay } from "./transition-overlay";
import { LobbyVideo } from "./lobby-video";
import { CameraPrompt } from "@/components/media/camera-prompt";
import { useLobbyChannel } from "./use-lobby-channel";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  ALL_SLOTS,
  assignmentsFor,
  autoFill,
  slotDef,
  type SlotId,
} from "@/lib/roles";
import { cn } from "@/lib/cn";

type Phase = "roster" | "selecting" | "locked" | "ready" | "countdown" | "starting";
type Player = {
  id: string;
  name: string;
  avatarId?: string;
  isHost?: boolean;
  isMe?: boolean;
};
type Claims = Partial<Record<SlotId, string>>;

const SELECT_MS = 10_000;
const COUNTDOWN_MS = 5_000;
const SOLO_COUNTDOWN_MS = 10_000;
const ME = "me";
const CPU = "cpu";

/** the states the lobby UI knows how to render; anything else means the game is on */
const LOBBY_PHASES: Phase[] = [
  "roster",
  "selecting",
  "locked",
  "ready",
  "countdown",
];

/** the caller's id for claim / ready checks — "me" in solo, the real uid otherwise */
function nextClaims(prev: Claims, slotId: SlotId, myId: string): Claims {
  const held = prev[slotId];
  if (held && held !== myId) return prev; // someone else has it
  if (held === myId) {
    const next = { ...prev };
    delete next[slotId];
    return next;
  }
  const mine = (Object.keys(prev) as SlotId[]).filter((k) => prev[k] === myId);
  const iHoldVedha = mine.some((k) => slotDef(k).kind === "vedha");
  if (slotDef(slotId).kind === "vedha") {
    const next: Claims = {};
    for (const k of Object.keys(prev) as SlotId[]) {
      if (prev[k] !== myId) next[k] = prev[k];
    }
    next[slotId] = myId;
    return next;
  }
  if (iHoldVedha) return prev; // the Vedha player can't also be a Detective
  return { ...prev, [slotId]: myId }; // Detectives can be shared
}

export function LobbyClient({ code, solo = false }: { code: string; solo?: boolean }) {
  const router = useRouter();
  const { hydrated, session, userId, findRoom, joinRoom } = useAppState();
  const cdMs = solo ? SOLO_COUNTDOWN_MS : COUNTDOWN_MS;

  const fallbackRoom = useMemo(
    () => ({
      id: "",
      code,
      name: `Room ${code}`,
      maxPlayers: 6,
      hostId: "",
      hostName: session?.username ?? "You",
      status: "roster",
      createdAt: 0,
    }),
    [code, session?.username],
  );

  // the room row (id, name, host, max) — loaded once after auth hydrates
  const [meta, setMeta] = useState(fallbackRoom);
  useEffect(() => {
    if (!hydrated || solo) return;
    let ok = true;
    findRoom(code).then(async (r) => {
      if (!ok) return;
      if (r) {
        setMeta(r);
        return;
      }
      // reached by a shared link without going through Join — try to join now
      const res = await joinRoom(code);
      if (!ok) return;
      if (res.ok) setMeta(res.room);
      else router.replace("/dashboard");
    });
    return () => {
      ok = false;
    };
  }, [hydrated, solo, findRoom, joinRoom, code, router]);

  const me =
    !solo && userId && session ? { id: userId, name: session.username } : null;
  const lobby = useLobbyChannel(solo ? null : meta.id || null, code, me);
  const myId = solo ? ME : (userId ?? ME);

  // ---- shared lobby state; for multiplayer it mirrors the realtime room ----
  const [phase, setPhase] = useState<Phase>(solo ? "selecting" : "roster");
  const [claims, setClaims] = useState<Claims>({});
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(0); // start_deadline (5s countdown)
  const [selectDeadline, setSelectDeadline] = useState(0); // 10s claim clock
  const [now, setNow] = useState(() => Date.now());
  const [soloCap, setSoloCap] = useState(6);
  const [chatLocal, setChatLocal] = useState<{ from: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  // host-only: when on, roles are dealt at random instead of players picking.
  // Off by default. Host-local (it only matters at the moment roles lock in).
  const [autoRoles, setAutoRoles] = useState(false);

  // mirror the realtime room row into local state
  useEffect(() => {
    if (solo || !lobby.roomRow) return;
    const r = lobby.roomRow;
    /* eslint-disable react-hooks/set-state-in-effect -- sync external row → local */
    // `rooms.status` goes "starting" → "playing" as the host creates the game
    // row. Neither is a lobby Phase: hold the "starting" beat so its overlay
    // routes everyone to /play instead of unmounting itself mid-transition.
    // Any other unknown status (e.g. a finished "over") drops back to "roster".
    if (r.status === "starting" || r.status === "playing") {
      setPhase("starting");
      setClaims((r.claims ?? {}) as Claims);
      return;
    }
    setPhase(
      LOBBY_PHASES.includes(r.status as Phase) ? (r.status as Phase) : "roster",
    );
    setClaims((r.claims ?? {}) as Claims);
    setReadyIds(r.ready ?? []);
    setSelectDeadline(r.select_deadline ? Date.parse(r.select_deadline) : 0);
    setDeadline(r.start_deadline ? Date.parse(r.start_deadline) : 0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [solo, lobby.roomRow]);

  const roomReady = solo || !!lobby.roomRow;
  const room = solo
    ? meta
    : {
        ...meta,
        name: lobby.roomRow?.name ?? meta.name,
        maxPlayers: lobby.roomRow?.max_players ?? meta.maxPlayers,
        hostId: lobby.roomRow?.host_id ?? meta.hostId,
        status: lobby.roomRow?.status ?? meta.status,
      };
  const isHost = !solo && !!userId && room.hostId === userId;
  const cap = solo ? soloCap : room.maxPlayers;

  const players = useMemo<Player[]>(() => {
    if (solo) {
      return [
        {
          id: ME,
          name: session?.username ?? "You",
          avatarId: session?.avatarId,
          isHost: true,
          isMe: true,
        },
        { id: CPU, name: "Computer", avatarId: "tile-6" },
      ];
    }
    return lobby.members.map((m) => ({
      id: m.userId,
      name: m.username,
      avatarId: m.avatarId,
      isHost: m.userId === room.hostId,
      isMe: m.userId === userId,
    }));
  }, [solo, session?.username, session?.avatarId, lobby.members, room.hostId, userId]);

  const playerById = useCallback(
    (id?: string) => players.find((p) => p.id === id),
    [players],
  );

  const chat = solo ? chatLocal : lobby.chat;

  /* ---- tick a clock while a deadline is live ---- */
  useEffect(() => {
    if (phase !== "selecting" && phase !== "countdown") return;
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, [phase]);

  /* ----------------------------------------------------------------
     Phase machine (multiplayer). The host normally drives the timed
     transitions; every other player is a safety net that steps in a
     couple of seconds later, so a closed / backgrounded host tab can't
     wedge the lobby. Advancement uses a local `setTimeout` clamped to
     the phase's own duration — never a raw `Date.now() >= deadline`
     against a timestamp another machine wrote, so two players' clocks
     drifting apart can't stall it.
  ---------------------------------------------------------------- */
  const patchRoom = lobby.patchRoom;
  const claimsRef = useRef(claims);
  const playersRef = useRef(players);
  useEffect(() => {
    claimsRef.current = claims;
    playersRef.current = players;
  });
  const clamp = (ms: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, ms));

  useEffect(() => {
    if (solo) return;
    const backup = isHost ? 0 : 2200; // non-hosts wait a beat before driving

    if (phase === "selecting") {
      const wait = clamp(selectDeadline - Date.now(), 500, SELECT_MS + 1500) + backup;
      const t = setTimeout(() => {
        void patchRoom({
          claims: autoFill(
            playersRef.current.map((p) => p.id),
            claimsRef.current,
          ) as Record<string, string>,
          status: "locked",
          select_deadline: null,
        });
      }, wait);
      return () => clearTimeout(t);
    }

    if (phase === "locked") {
      const t = setTimeout(() => void patchRoom({ status: "ready" }), 1400 + backup);
      return () => clearTimeout(t);
    }

    if (phase === "countdown") {
      const wait = clamp(deadline - Date.now(), 500, COUNTDOWN_MS + 1500) + backup;
      const t = setTimeout(() => void patchRoom({ status: "starting" }), wait);
      return () => clearTimeout(t);
    }
  }, [solo, isHost, phase, selectDeadline, deadline, patchRoom]);

  /* ---- ready → countdown once everyone has readied up ---- */
  useEffect(() => {
    if (solo || phase !== "ready") return;
    if (players.length >= 2 && players.every((p) => readyIds.includes(p.id))) {
      void patchRoom({
        status: "countdown",
        start_deadline: new Date(Date.now() + COUNTDOWN_MS).toISOString(),
      });
    }
  }, [solo, phase, players, readyIds, patchRoom]);

  /* ---- host migration: if the host has left, the earliest joiner takes over ---- */
  useEffect(() => {
    if (solo || !lobby.roomRow || lobby.members.length === 0) return;
    const hostHere = lobby.members.some(
      (m) => m.userId === lobby.roomRow!.host_id,
    );
    if (hostHere) return;
    if (lobby.members[0]?.userId === userId) {
      void patchRoom({ host_id: userId! });
    }
  }, [solo, lobby.roomRow, lobby.members, patchRoom, userId]);

  /* ---- solo countdown clock ---- */
  useEffect(() => {
    if (!solo || phase !== "countdown") return;
    const iv = setInterval(() => {
      setNow(Date.now());
      if (deadline - Date.now() <= 0) {
        clearInterval(iv);
        setPhase("starting");
      }
    }, 100);
    return () => clearInterval(iv);
  }, [solo, phase, deadline]);

  /* ---- lobby is done: stash the roster, and (host) create the game row ---- */
  const startFiredRef = useRef(false);
  useEffect(() => {
    if (phase !== "starting") return;
    try {
      const seats = players.map((p) => ({
        id: p.id,
        name: p.name,
        isMe: !!p.isMe,
        pawns: ALL_SLOTS.filter((s) => claims[s.id] === p.id).map((s) =>
          s.id === "vedha" ? "vedha" : `d${s.id.slice(1)}`,
        ),
      }));
      sessionStorage.setItem(`fv:seats:${code}`, JSON.stringify(seats));
      if (solo) sessionStorage.setItem(`fv:solo:${code}`, "1");
      else sessionStorage.removeItem(`fv:solo:${code}`);
    } catch {
      /* sessionStorage unavailable — game falls back to a full table */
    }
    if (!solo && isHost && !startFiredRef.current) {
      startFiredRef.current = true;
      void fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).then((res) => {
        if (!res.ok) startFiredRef.current = false; // let a retry through
      });
    }
  }, [phase, players, claims, code, solo, isHost]);

  const remaining = Math.max(
    0,
    (phase === "selecting" ? selectDeadline : deadline) - now,
  );

  const applyClaims = useCallback(
    (next: Claims) => {
      if (solo) setClaims(next);
      else void lobby.patchRoom({ claims: next as Record<string, string> });
    },
    [solo, lobby],
  );

  const onSlotClick = useCallback(
    (slotId: SlotId) => applyClaims(nextClaims(claims, slotId, myId)),
    [applyClaims, claims, myId],
  );

  const toggleMyReady = useCallback(() => {
    const has = readyIds.includes(myId);
    const next = has ? readyIds.filter((x) => x !== myId) : [...readyIds, myId];
    if (solo) {
      setReadyIds(next);
      if (phase === "countdown") setPhase("ready");
      return;
    }
    void lobby.patchRoom(
      phase === "countdown"
        ? { ready: next, status: "ready", start_deadline: null }
        : { ready: next },
    );
  }, [readyIds, myId, solo, phase, lobby]);

  function sendChat(e: FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (solo) setChatLocal((c) => [...c, { from: session?.username ?? "You", text }]);
    else lobby.sendChat(text);
    setChatInput("");
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function lockRoster() {
    if (autoRoles) {
      // skip the claim window entirely — deal every role at random right now
      void lobby.patchRoom({
        claims: autoFill(players.map((p) => p.id), {}) as Record<string, string>,
        status: "locked",
        select_deadline: null,
      });
      return;
    }
    void lobby.patchRoom({
      status: "selecting",
      select_deadline: new Date(Date.now() + SELECT_MS).toISOString(),
    });
  }

  function setMax(n: number) {
    if (solo) setSoloCap(n);
    else void lobby.patchRoom({ max_players: n });
  }

  async function leave() {
    if (!solo) await lobby.leave();
    router.push("/dashboard");
  }

  function restartSolo() {
    setPhase("selecting");
    setClaims({});
    setReadyIds([]);
    setChatLocal([]);
    setDeadline(0);
  }

  function startSolo() {
    setClaims((prev) => {
      let base: Claims = prev;
      // auto-assign: deal the human one random slot, the computer takes the rest
      if (autoRoles && !(Object.values(prev) as string[]).includes(ME)) {
        const slot = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
        base = { [slot.id]: ME } as Claims;
      }
      const filled: Claims = { ...base };
      for (const s of ALL_SLOTS) if (!filled[s.id]) filled[s.id] = CPU;
      return filled;
    });
    setNow(Date.now());
    setDeadline(Date.now() + SOLO_COUNTDOWN_MS);
    setPhase("countdown");
  }

  const assignments = assignmentsFor(claims);
  const readyCount = players.filter((p) => readyIds.includes(p.id)).length;
  const myClaim = (Object.values(claims) as string[]).includes(myId);
  const showBoardInteractive = phase === "selecting" && !autoRoles;
  const showAssignments =
    phase === "locked" || phase === "ready" || phase === "countdown";

  if (hydrated && !solo && !session) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-lg font-bold text-text">Sign in to join this room</p>
          <p className="mt-1 text-sm text-muted">Room {code} is waiting.</p>
          <Button variant="primary" className="mt-4" onClick={() => router.push(`/login?next=/room/${code}`)}>
            Log in
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col">
      {/* header strip */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 md:px-6">
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold text-text">{room.name}</div>
          <div className="font-mono text-[0.6875rem] text-faint">Private lobby</div>
        </div>

        <button
          onClick={copyCode}
          className="group inline-flex items-stretch overflow-hidden rounded-sm border border-line bg-surface"
          aria-label={`Copy invite code ${code}`}
        >
          <span aria-hidden className="w-1 bg-signal" />
          <span className="flex items-center gap-2 px-2.5 py-1.5">
            <span className="font-mono text-sm tracking-[0.15em] text-text">{code}</span>
            {copied ? (
              <Check size={13} className="text-ok" />
            ) : (
              <Copy size={13} className="text-faint group-hover:text-muted" />
            )}
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {solo && (
            <button
              onClick={restartSolo}
              title="Start this solo lobby over"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-faint hover:bg-surface-2 hover:text-muted"
            >
              <RotateCcw size={13} />
              Restart
            </button>
          )}
          <ManualDialog
            trigger={
              <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
                <BookOpen size={15} />
                Manual
              </button>
            }
          />
          <button
            onClick={leave}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-danger"
          >
            <LogOut size={15} />
            Leave
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_320px]">
        {/* centre */}
        <section className="flex min-w-0 flex-col p-4 md:p-8">
          {!solo && <LobbyVideo peers={players.filter((p) => !p.isMe)} />}

          {/* phase heading */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">
                {solo ? "Solo — vs the computer" : phase === "roster" && "Step 1 — roster"}
                {!solo && phase === "selecting" && "Step 2 — claim a role"}
                {phase === "locked" && "Step 3 — roles set"}
                {(phase === "ready" || phase === "countdown") &&
                  (solo ? "Get set" : "Step 4 — ready up")}
                {phase === "starting" && "Starting"}
              </p>
              <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight text-text">
                {phase === "roster" && "Waiting for the host to start"}
                {phase === "selecting" &&
                  (autoRoles
                    ? "The computer deals the roles"
                    : solo
                      ? "Pick your side"
                      : "Pick Vedha or a Detective")}
                {phase === "locked" && "Here's who's who"}
                {phase === "ready" && "Mark ready when you are"}
                {phase === "countdown" &&
                  (solo ? "The computer takes the rest" : "Everyone's ready")}
                {phase === "starting" && "…"}
              </h1>
            </div>
            {phase === "selecting" && !solo && (
              <CountdownRing
                progress={remaining / SELECT_MS}
                value={Math.ceil(remaining / 1000)}
                label="Seconds to choose"
                size={84}
              />
            )}
          </div>

          {/* selection board */}
          {!showAssignments && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ALL_SLOTS.map((slot) => {
                const holder = playerById(claims[slot.id]);
                return (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    holder={holder ? { name: holder.name, avatarId: holder.avatarId } : undefined}
                    isMe={claims[slot.id] === myId}
                    interactive={showBoardInteractive}
                    onClick={() => onSlotClick(slot.id)}
                  />
                );
              })}
            </div>
          )}

          {/* assignment display */}
          {showAssignments && (
            <div className="rounded-lg border border-line bg-surface p-4">
              <div className="space-y-1.5">
                {assignments.map(({ slot, playerId }) => {
                  const p = playerById(playerId);
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 rounded-md px-2 py-2"
                    >
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-[3px]"
                        style={{ background: `var(${slot.varName})` }}
                      />
                      <span
                        className={cn(
                          "w-24 shrink-0 font-mono text-[0.6875rem]",
                          slot.kind === "vedha" ? "text-signal" : "text-muted",
                        )}
                      >
                        {slot.label}
                      </span>
                      {p ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={p.name} avatarId={p.avatarId} size={22} />
                          <span className="text-sm text-text">{p.name}</span>
                          {p.isMe && (
                            <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[0.625rem] text-faint">
                              you
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-faint">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 border-t border-line pt-3 font-mono text-[0.6875rem] text-faint">
                Everyone can see who Vedha is. Where Vedha goes on the board stays
                hidden once the game starts.
              </p>
            </div>
          )}
        </section>

        {/* right rail: players + chat */}
        <aside className="flex flex-col border-t border-line lg:border-l lg:border-t-0">
          <div className="border-b border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="eyebrow">Players</h2>
              <span className="font-mono text-xs text-faint">
                {players.length}/{room.maxPlayers}
              </span>
            </div>
            <ul className="space-y-0.5">
              {players.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
                  <span className="w-5 font-mono text-[0.6875rem] text-faint">#{i + 1}</span>
                  <Avatar name={p.name} avatarId={p.avatarId} size={26} />
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{p.name}</span>
                  {p.isHost && <Crown size={13} className="text-signal" aria-label="Host" />}
                  {(phase === "ready" || phase === "countdown") && (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        readyIds.includes(p.id) ? "bg-ok" : "bg-line-strong",
                      )}
                      aria-label={readyIds.includes(p.id) ? "Ready" : "Not ready"}
                    />
                  )}
                  {isHost && !p.isMe && phase === "roster" && (
                    <button
                      onClick={() => lobby.kick(p.id)}
                      aria-label={`Remove ${p.name}`}
                      className="text-faint hover:text-danger"
                    >
                      <X size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <h2 className="eyebrow mb-3 shrink-0">Lobby chat</h2>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
              {chat.length === 0 && (
                <li className="text-xs text-faint">No messages yet.</li>
              )}
              {chat.map((m, i) => (
                <li key={i}>
                  <span className="font-mono text-[0.6875rem] text-faint">{m.from}</span>
                  <div className="text-text">{m.text}</div>
                </li>
              ))}
            </ul>
            <form onSubmit={sendChat} className="mt-3 flex shrink-0 gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message…"
                className="h-9 flex-1 rounded-md border border-line-strong bg-bg-inset px-3 text-sm text-text placeholder:text-faint focus:border-signal"
              />
              <Button size="icon" type="submit" aria-label="Send">
                <Send size={14} />
              </Button>
            </form>
          </div>
        </aside>
      </div>

      {/* bottom bar */}
      <footer className="border-t border-line px-4 py-3 md:px-6">
        {phase === "roster" &&
          (isHost ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">Max players</span>
                <button
                  aria-label="Fewer players"
                  onClick={() => setMax(Math.max(2, cap - 1))}
                  disabled={cap <= 2 || !roomReady}
                  className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:text-text disabled:opacity-40"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center font-mono text-text">{cap}</span>
                <button
                  aria-label="More players"
                  onClick={() => setMax(Math.min(6, cap + 1))}
                  disabled={cap >= 6 || !roomReady}
                  className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:text-text disabled:opacity-40"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <span className="text-sm text-muted">AI Detectives</span>
                <Switch checked={false} disabled aria-label="Fill empty slots with AI (coming soon)" />
                <span className="font-mono text-[0.625rem] text-faint">soon</span>
              </div>
              <label className="flex items-center gap-2">
                <span className="text-sm text-muted">Computer assigns roles</span>
                <Switch
                  checked={autoRoles}
                  onCheckedChange={setAutoRoles}
                  aria-label="Let the computer assign roles at random"
                />
              </label>
              <Button
                variant="primary"
                className="ml-auto"
                onClick={lockRoster}
                disabled={players.length < 2 || !roomReady}
              >
                {autoRoles
                  ? "Deal roles & continue"
                  : "Lock roster & start role selection"}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted">
              Waiting for the host to start role selection…
            </p>
          ))}

        {phase === "selecting" && !solo && (
          <p className="text-center text-sm text-muted">
            Claim a role — or let the clock decide.{" "}
            <span className="text-faint">Anything unclaimed is dealt at random.</span>
          </p>
        )}

        {phase === "selecting" && solo && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <label className="flex items-center gap-2">
              <Switch
                checked={autoRoles}
                onCheckedChange={setAutoRoles}
                aria-label="Let the computer pick my side"
              />
              <span className="text-sm text-muted">Let the computer pick my side</span>
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted">
                {autoRoles
                  ? "The computer deals you a side at random."
                  : myClaim
                    ? "Locked in — the computer plays every other role."
                    : "Tap Vedha or a Detective slot to choose your side."}
              </span>
              <Button
                variant="primary"
                disabled={!myClaim && !autoRoles}
                onClick={startSolo}
              >
                Ready — start game
              </Button>
            </div>
          </div>
        )}

        {phase === "locked" && (
          <p className="text-center font-mono text-xs text-faint">Locking roles…</p>
        )}

        {phase === "ready" && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-xs text-faint">
              {readyCount}/{players.length} ready
            </span>
            <label className="flex items-center gap-3">
              <span className="text-sm text-text">
                {readyIds.includes(myId) ? "You're ready" : "Mark yourself ready"}
              </span>
              <Switch checked={readyIds.includes(myId)} onCheckedChange={toggleMyReady} aria-label="Ready" />
            </label>
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex items-center gap-4">
            <span className="shrink-0 font-display text-sm font-bold text-text">
              Starting in {Math.ceil(remaining / 1000)}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-signal"
                style={{ width: `${(remaining / cdMs) * 100}%`, transition: "width 100ms linear" }}
              />
            </div>
            <button
              onClick={() => (solo ? setPhase("selecting") : toggleMyReady())}
              className="shrink-0 text-xs text-faint hover:text-muted"
            >
              Cancel
            </button>
          </div>
        )}
      </footer>

      {phase === "starting" && <TransitionOverlay code={code} />}
      {!solo && <CameraPrompt />}
    </main>
  );
}
