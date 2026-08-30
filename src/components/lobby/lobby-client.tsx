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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { CountdownRing } from "@/components/ui/countdown-ring";
import { ManualDialog } from "@/components/manual/manual-dialog";
import { SlotCard } from "./slot-card";
import { TransitionOverlay } from "./transition-overlay";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  ALL_SLOTS,
  assignmentsFor,
  autoFill,
  slotDef,
  type SlotId,
} from "@/lib/roles";
import { BOT_CLAIM_SCRIPT, LOBBY_BOTS, LOBBY_CHAT_SEED } from "@/lib/mock";
import { cn } from "@/lib/cn";

type Phase = "roster" | "selecting" | "locked" | "ready" | "countdown" | "starting";
type Player = {
  id: string;
  name: string;
  avatarId?: string;
  isHost?: boolean;
  isMe?: boolean;
};

const SELECT_MS = 10_000;
const COUNTDOWN_MS = 5_000;
const ME = "me";

export function LobbyClient({ code }: { code: string }) {
  const router = useRouter();
  const { hydrated, session, findRoom } = useAppState();

  const fallbackRoom = useMemo(
    () => ({
      code,
      name: `Room ${code}`,
      maxPlayers: 6,
      hostName: session?.username ?? "You",
      createdAt: 0,
    }),
    [code, session?.username],
  );
  // Resolve the real room only after hydration — findRoom reads localStorage,
  // which isn't available during SSR / first client render.
  const room = useMemo(
    () => (hydrated ? (findRoom(code) ?? fallbackRoom) : fallbackRoom),
    [hydrated, findRoom, code, fallbackRoom],
  );

  const allPlayers = useMemo<Player[]>(() => {
    const me: Player = {
      id: ME,
      name: session?.username ?? "You",
      avatarId: session?.avatarId,
      isHost: true,
      isMe: true,
    };
    return [me, ...LOBBY_BOTS.map((b) => ({ id: b.id, name: b.name, avatarId: b.avatarId }))];
  }, [session?.username, session?.avatarId]);

  const [cap, setCap] = useState(() => Math.min(room.maxPlayers, 6));
  const players = useMemo(() => allPlayers.slice(0, cap), [allPlayers, cap]);
  const playerById = useCallback(
    (id?: string) => players.find((p) => p.id === id),
    [players],
  );

  const [phase, setPhase] = useState<Phase>("roster");
  const [claims, setClaims] = useState<Partial<Record<SlotId, string>>>({});
  const claimsRef = useRef(claims);
  useEffect(() => {
    claimsRef.current = claims;
  }, [claims]);

  const [now, setNow] = useState(() => Date.now());
  const [deadline, setDeadline] = useState(0);

  const [feed, setFeed] = useState<string[]>([]);
  const [chat, setChat] = useState<{ from: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [ready, setReady] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  /* ---- selecting: 10s clock + scripted bot claims + seeded chat ---- */
  useEffect(() => {
    if (phase !== "selecting") return;
    const ids = players.map((p) => p.id);

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const { at, botId, slot } of BOT_CLAIM_SCRIPT) {
      if (!ids.includes(botId)) continue;
      timers.push(
        setTimeout(() => {
          setClaims((prev) => (prev[slot] ? prev : { ...prev, [slot]: botId }));
          const bot = LOBBY_BOTS.find((b) => b.id === botId);
          setFeed((f) => [`${bot?.name} claimed ${slotDef(slot).label}`, ...f]);
        }, at),
      );
    }
    for (const { at, from, text } of LOBBY_CHAT_SEED) {
      timers.push(setTimeout(() => setChat((c) => [...c, { from, text }]), at));
    }

    const iv = setInterval(() => {
      setNow(Date.now());
      if (deadline - Date.now() <= 0) {
        clearInterval(iv);
        setClaims(autoFill(ids, claimsRef.current));
        setFeed((f) => ["The clock filled the open slots", ...f]);
        setPhase("locked");
      }
    }, 200);

    return () => {
      clearInterval(iv);
      timers.forEach(clearTimeout);
    };
  }, [phase, players, deadline]);

  /* ---- locked: brief "roles are set" beat ---- */
  useEffect(() => {
    if (phase !== "locked") return;
    const t = setTimeout(() => setPhase("ready"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  /* ---- ready: bots ready up on a stagger ---- */
  useEffect(() => {
    if (phase !== "ready") return;
    const timers = players
      .filter((p) => !p.isMe)
      .map((p, i) =>
        setTimeout(() => setReady((r) => new Set(r).add(p.id)), 800 + i * 600),
      );
    return () => timers.forEach(clearTimeout);
  }, [phase, players]);

  /* ---- everyone ready -> 5s countdown ----
     Deliberate synchronous phase advance: readiness is driven by external
     timers (bots) and the Ready toggle, so an effect is the join point. */
  useEffect(() => {
    if (phase === "ready" && players.every((p) => ready.has(p.id))) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setNow(Date.now());
      setDeadline(Date.now() + COUNTDOWN_MS);
      setPhase("countdown");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [phase, ready, players]);

  /* ---- countdown: 5s, cancellable by un-readying ---- */
  useEffect(() => {
    if (phase !== "countdown") return;
    const iv = setInterval(() => {
      setNow(Date.now());
      if (deadline - Date.now() <= 0) {
        clearInterval(iv);
        setPhase("starting");
      }
    }, 100);
    return () => clearInterval(iv);
  }, [phase, deadline]);

  const remaining = Math.max(0, deadline - now);

  const onSlotClick = useCallback((slotId: SlotId) => {
    setClaims((prev) => {
      const held = prev[slotId];
      if (held && held !== ME) return prev;
      const next: Partial<Record<SlotId, string>> = {};
      for (const k of Object.keys(prev) as SlotId[]) {
        if (prev[k] !== ME) next[k] = prev[k];
      }
      if (held !== ME) next[slotId] = ME;
      return next;
    });
  }, []);

  function toggleMyReady() {
    setReady((r) => {
      const next = new Set(r);
      if (next.has(ME)) next.delete(ME);
      else next.add(ME);
      return next;
    });
    if (phase === "countdown") setPhase("ready");
  }

  function sendChat(e: FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChat((c) => [...c, { from: session?.username ?? "You", text }]);
    setChatInput("");
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function restart() {
    setPhase("roster");
    setClaims({});
    setReady(new Set());
    setFeed([]);
    setChat([]);
    setDeadline(0);
  }

  const assignments = assignmentsFor(claims);
  const readyCount = players.filter((p) => ready.has(p.id)).length;
  const showBoardInteractive = phase === "selecting";
  const showAssignments = phase === "locked" || phase === "ready" || phase === "countdown";

  if (hydrated && !session) {
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
          <button
            onClick={restart}
            title="Restart the mock flow"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-faint hover:bg-surface-2 hover:text-muted"
          >
            <RotateCcw size={13} />
            Restart demo
          </button>
          <ManualDialog
            trigger={
              <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
                <BookOpen size={15} />
                Manual
              </button>
            }
          />
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-danger"
          >
            <LogOut size={15} />
            Leave
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_320px]">
        {/* centre */}
        <section className="flex flex-col p-4 md:p-8">
          {/* phase heading */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">
                {phase === "roster" && "Step 1 — roster"}
                {phase === "selecting" && "Step 2 — claim a role"}
                {phase === "locked" && "Step 3 — roles set"}
                {(phase === "ready" || phase === "countdown") && "Step 4 — ready up"}
                {phase === "starting" && "Starting"}
              </p>
              <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight text-text">
                {phase === "roster" && "Waiting for the host to start"}
                {phase === "selecting" && "Pick Vedha or a Tracker"}
                {phase === "locked" && "Here's who's who"}
                {phase === "ready" && "Mark ready when you are"}
                {phase === "countdown" && "Everyone's ready"}
                {phase === "starting" && "…"}
              </h1>
            </div>
            {phase === "selecting" && (
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
                    isMe={claims[slot.id] === ME}
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
                          "w-24 shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.12em]",
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
                            <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[0.625rem] uppercase text-faint">
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

          {/* selection feed */}
          {phase === "selecting" && feed.length > 0 && (
            <ul className="mt-4 space-y-1 font-mono text-xs text-faint">
              {feed.slice(0, 4).map((line, i) => (
                <li key={i}>— {line}</li>
              ))}
            </ul>
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
                        ready.has(p.id) ? "bg-ok" : "bg-line-strong",
                      )}
                      aria-label={ready.has(p.id) ? "Ready" : "Not ready"}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <h2 className="eyebrow mb-3">Lobby chat</h2>
            <ul className="flex-1 space-y-2 overflow-y-auto text-sm" style={{ maxHeight: 220 }}>
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
            <form onSubmit={sendChat} className="mt-3 flex gap-2">
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
        {phase === "roster" && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Max players</span>
              <button
                aria-label="Fewer players"
                onClick={() => setCap((n) => Math.max(2, n - 1))}
                disabled={cap <= 2}
                className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:text-text disabled:opacity-40"
              >
                <Minus size={13} />
              </button>
              <span className="w-5 text-center font-mono text-text">{cap}</span>
              <button
                aria-label="More players"
                onClick={() => setCap((n) => Math.min(6, n + 1))}
                disabled={cap >= 6}
                className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:text-text disabled:opacity-40"
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span className="text-sm text-muted">AI Trackers</span>
              <Switch checked={false} disabled aria-label="Fill empty slots with AI (coming soon)" />
              <span className="font-mono text-[0.625rem] uppercase text-faint">soon</span>
            </div>
            <Button
              variant="primary"
              className="ml-auto"
              onClick={() => {
                setFeed([]);
                setNow(Date.now());
                setDeadline(Date.now() + SELECT_MS);
                setPhase("selecting");
              }}
              disabled={players.length < 2}
            >
              Lock roster &amp; start role selection
            </Button>
          </div>
        )}

        {phase === "selecting" && (
          <p className="text-center text-sm text-muted">
            Claim a role — or let the clock decide.{" "}
            <span className="text-faint">Anything unclaimed is dealt at random.</span>
          </p>
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
                {ready.has(ME) ? "You're ready" : "Mark yourself ready"}
              </span>
              <Switch checked={ready.has(ME)} onCheckedChange={toggleMyReady} aria-label="Ready" />
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
                style={{ width: `${(remaining / COUNTDOWN_MS) * 100}%`, transition: "width 100ms linear" }}
              />
            </div>
            <button
              onClick={toggleMyReady}
              className="shrink-0 text-xs text-faint hover:text-muted"
            >
              Cancel
            </button>
          </div>
        )}
      </footer>

      {phase === "starting" && <TransitionOverlay code={code} />}
    </main>
  );
}
