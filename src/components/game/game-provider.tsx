"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  applyMove,
  autoDetectiveMove,
  canDoubleMove,
  createGame,
  declareDoubleMove,
  lastKnownVedhaNode,
  legalMoves,
  type Move,
} from "@/lib/game/engine";
import type { GameState, MoveTransport, Role } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";
import { myPawns, type GameSeat } from "@/lib/game/seats";
import { useSfx } from "@/lib/use-sfx";
import {
  useRoomChat,
  type ChatMsg,
  type ChatScope,
} from "@/lib/realtime/use-room-chat";

type Pending = { to: number; options: Move[] } | null;

type GameCtx = {
  game: GameState;
  viewAs: Role;
  setViewAs: (r: Role) => void;
  autoDetectives: boolean;
  toggleAutoDetectives: () => void;
  /** false for a networked game (each detective is a real player) */
  soloTools: boolean;
  /** networked: [{ uid, name, pawns }] — who controls which pawn */
  seats: GameSeat[];

  /** display name for this viewer's chat messages */
  chatName: string;
  /** this viewer may use the Detectives-only chat channel */
  chatDet: boolean;
  /** live room chat (public + — for Detectives — det); ephemeral, no history */
  chat: ChatMsg[];
  sendChat: (text: string, scope?: ChatScope) => void;

  activePawnId: string;
  myTurn: boolean;
  legalDest: Set<number>;
  vedhaVisible: boolean;
  lastKnown: number | null;

  pending: Pending;
  pickNode: (id: number) => void;
  pickTransport: (t: MoveTransport) => void;
  chosenTransport: MoveTransport | null;
  confirm: () => void;
  cancel: () => void;

  canDouble: boolean;
  startDouble: () => void;
  doubleActive: boolean;

  revealFlash: { round: number; node: number } | null;
  newGame: () => void;
  /** transient "not your turn" / network problems, networked play only */
  moveError: string | null;

  /* ---- networked: disconnect / abandonment ---- */
  /** pawn ids with no present controller (from the game presence channel) */
  awayPawns: Set<string>;
  /** Vedha's controller has dropped and the game is still playing */
  vedhaAway: boolean;
  /** claim an abandoned Detective pawn */
  takeOver: (pawnId: string) => void;
  /** end a stalled game because Vedha left (Detectives win) */
  concede: () => void;
  /** leave the game — Vedha ⇒ Detectives win, Detective ⇒ pawn abandoned */
  leaveGame: () => void;
};

const Ctx = createContext<GameCtx | null>(null);

const SOLO_SEED = 20260831;

export function GameProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ code: string }>();
  const code = (
    Array.isArray(params.code) ? params.code[0] : (params.code ?? "")
  ).toUpperCase();

  const [solo] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(`fv:solo:${code}`) === "1";
    } catch {
      return false;
    }
  });

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const sfx = useSfx();

  const [game, setGame] = useState<GameState>(() => createGame(SOLO_SEED));
  const [seats, setSeats] = useState<GameSeat[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [controlsVedha, setControlsVedha] = useState(true);
  const [viewAs, setViewAsLocal] = useState<Role>("vedha");
  const [autoDetectives, setAutoDetectives] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [chosenTransport, setChosenTransport] = useState<MoveTransport | null>(null);
  const [revealFlash, setRevealFlash] = useState<GameCtx["revealFlash"]>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soloRecordedRef = useRef(false);
  const sfxRef = useRef<{
    turn: string;
    round: number;
    reveal: number | null;
    over: boolean;
  } | null>(null);

  const flashOn = useCallback((next: GameState, prevRevealRound: number | null) => {
    if (
      next.lastRevealRound !== prevRevealRound &&
      next.lastRevealRound != null
    ) {
      const revealed = [...next.log].reverse().find((e) => e.revealed);
      if (revealed && revealed.node >= 1) {
        setRevealFlash({ round: revealed.round, node: revealed.node });
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setRevealFlash(null), 2400);
      }
    }
  }, []);

  /* ---------------- networked game: load + subscribe ---------------- */
  const prevRevealRef = useRef<number | null>(null);
  const fetchGame = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_game", { p_code: code });
    if (error || !data) return false;
    const payload = data as {
      state: GameState;
      seats: GameSeat[];
      controlsVedha: boolean;
    };
    setSeats(payload.seats ?? []);
    setControlsVedha(payload.controlsVedha);
    setViewAsLocal(payload.controlsVedha ? "vedha" : "detective");
    flashOn(payload.state, prevRevealRef.current);
    prevRevealRef.current = payload.state.lastRevealRound;
    setGame(payload.state);
    return true;
  }, [supabase, code, flashOn]);

  useEffect(() => {
    if (solo) return;
    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (alive) setUid(data.user?.id ?? null);
    });

    // the row is created by the host as the lobby ends — retry briefly
    let tries = 0;
    const load = async () => {
      const ok = await fetchGame();
      if (!ok && alive && tries++ < 12) setTimeout(load, 700);
    };
    void load();

    const chan = supabase
      .channel(`room:${code}`)
      .on("broadcast", { event: "game" }, () => void fetchGame())
      .subscribe();

    const onFocus = () => void fetchGame();
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(chan);
    };
  }, [solo, supabase, code, fetchGame]);

  const mine = useMemo(
    () => (solo ? null : myPawns(seats, uid)),
    [solo, seats, uid],
  );

  /* ---- game presence: who's actually here ---- */
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [presSynced, setPresSynced] = useState(false);
  const gamePresRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mineKey = (mine ?? []).join(",");

  useEffect(() => {
    if (solo || !uid) return;
    const chan = supabase.channel(`game:${code}`, {
      config: { presence: { key: uid } },
    });
    const sync = () => {
      const state = chan.presenceState<{ pawns: string[] }>();
      const here = new Set<string>();
      for (const metas of Object.values(state)) {
        for (const m of metas as { pawns?: string[] }[]) {
          for (const p of m.pawns ?? []) here.add(p);
        }
      }
      setPresent(here);
      setPresSynced(true);
    };
    chan
      .on("presence", { event: "sync" }, sync)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") void chan.track({ pawns: mine ?? [] });
      });
    gamePresRef.current = chan;
    return () => {
      void supabase.removeChannel(chan);
      gamePresRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo, supabase, code, uid]);

  useEffect(() => {
    const chan = gamePresRef.current;
    if (chan) void chan.track({ pawns: mine ?? [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineKey]);

  const playing = game.status.kind === "playing";
  const awayPawns = useMemo(() => {
    const away = new Set<string>();
    if (solo || !playing) return away;
    for (const id of ["vedha", "d1", "d2", "d3", "d4", "d5"]) {
      const abandoned = game.pawns[id]?.abandoned;
      if (abandoned || (presSynced && !present.has(id))) away.add(id);
    }
    return away;
  }, [solo, playing, presSynced, present, game]);
  const vedhaAway = awayPawns.has("vedha");

  const chatName = useMemo(() => {
    if (solo) return viewAs === "vedha" ? "You (Vedha)" : "You (Detective)";
    return seats.find((s) => s.uid === uid)?.name ?? "Player";
  }, [solo, viewAs, seats, uid]);

  const chatDet = useMemo(() => {
    if (solo) return viewAs === "detective";
    return (mine ?? []).some((p) => p !== "vedha");
  }, [solo, viewAs, mine]);

  const chatMe = useMemo(() => ({ name: chatName }), [chatName]);
  const { messages: chat, send: sendChat } = useRoomChat(
    solo ? "" : code,
    chatMe,
    { det: chatDet },
  );

  const activePawnId = game.turn;
  const myTurn = solo
    ? game.status.kind === "playing" &&
      (game.turn === "vedha" ? viewAs === "vedha" : viewAs === "detective")
    : game.status.kind === "playing" && !!mine?.includes(game.turn);

  const legalDest = useMemo(() => {
    if (!myTurn) return new Set<number>();
    return new Set(legalMoves(game, activePawnId).map((m) => m.to));
  }, [game, activePawnId, myTurn]);

  const vedhaVisible = useMemo(() => {
    if (solo && viewAs === "vedha") return true;
    if (!solo && controlsVedha) return true;
    if (game.status.kind === "over") return true;
    const last = game.log[game.log.length - 1];
    return !!last?.revealed;
  }, [solo, viewAs, controlsVedha, game]);

  const lastKnown = useMemo(() => lastKnownVedhaNode(game), [game]);

  const canDouble = useMemo(() => {
    const asVedha = solo ? viewAs === "vedha" : controlsVedha;
    return asVedha && canDoubleMove(game);
  }, [solo, viewAs, controlsVedha, game]);

  /* ------------------------- move flow ------------------------- */
  const pickNode = useCallback(
    (id: number) => {
      if (!myTurn) return;
      const options = legalMoves(game, activePawnId).filter((m) => m.to === id);
      if (options.length === 0) return;
      setPending({ to: id, options });
      setChosenTransport(options.length === 1 ? options[0].transport : null);
    },
    [game, activePawnId, myTurn],
  );

  const pickTransport = useCallback((t: MoveTransport) => setChosenTransport(t), []);

  const cancel = useCallback(() => {
    setPending(null);
    setChosenTransport(null);
  }, []);

  const flash = useCallback(
    (msg: string) => {
      setMoveError(msg);
      if (errTimer.current) clearTimeout(errTimer.current);
      errTimer.current = setTimeout(() => setMoveError(null), 3000);
    },
    [],
  );

  const confirm = useCallback(() => {
    if (!pending || !chosenTransport) return;
    const move = pending.options.find((m) => m.transport === chosenTransport);
    if (!move) return;

    if (solo) {
      const prevReveal = game.lastRevealRound;
      const next = applyMove(game, move);
      cancel();
      flashOn(next, prevReveal);
      setGame(next);
      return;
    }

    cancel();
    void fetch("/api/game/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        move: { pawnId: move.pawnId, to: move.to, transport: move.transport, via: move.via },
      }),
    }).then(async (res) => {
      if (res.ok) {
        void fetchGame();
      } else {
        const { error } = await res.json().catch(() => ({ error: "failed" }));
        flash(
          error === "not-your-turn"
            ? "It's not your turn."
            : error === "illegal-move"
              ? "That move isn't legal."
              : "Couldn't send that move.",
        );
        void fetchGame();
      }
    });
  }, [pending, chosenTransport, solo, game, code, cancel, flashOn, fetchGame, flash]);

  const post = useCallback(
    (path: string, extra: Record<string, unknown> = {}) =>
      fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...extra }),
      }),
    [code],
  );

  const takeOver = useCallback(
    (pawnId: string) => {
      void post("/api/game/takeover", { pawnId }).then((r) => {
        if (r.ok) void fetchGame();
        else flash("Couldn't take that pawn.");
      });
    },
    [post, fetchGame, flash],
  );

  const concede = useCallback(() => {
    void post("/api/game/concede").then((r) => {
      if (r.ok) void fetchGame();
      else flash("Couldn't end the game.");
    });
  }, [post, fetchGame, flash]);

  const leaveGame = useCallback(() => {
    if (solo) {
      router.push("/dashboard");
      return;
    }
    void post("/api/game/leave").finally(() => router.push("/dashboard"));
  }, [solo, post, router]);

  const startDouble = useCallback(() => {
    if (!canDouble) return;
    if (solo) {
      setGame(declareDoubleMove(game));
      return;
    }
    void fetch("/api/game/double", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).then((res) => {
      if (res.ok) void fetchGame();
      else flash("Couldn't start the Double-Move.");
    });
  }, [canDouble, solo, game, code, fetchGame, flash]);

  const newGame = useCallback(() => {
    if (solo) {
      setGame(createGame(Date.now()));
      cancel();
      setRevealFlash(null);
      prevRevealRef.current = null;
      soloRecordedRef.current = false;
      return;
    }
    void fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, force: true }),
    }).then((res) => {
      if (res.ok) void fetchGame();
      else flash("Only the host can start a new game.");
    });
  }, [solo, code, cancel, fetchGame, flash]);

  const toggleAutoDetectives = useCallback(
    () => setAutoDetectives((v) => !v),
    [],
  );
  const setViewAs = useCallback(
    (r: Role) => {
      if (solo) setViewAsLocal(r);
    },
    [solo],
  );

  // solo demo aid: auto-move detectives on their turn
  useEffect(() => {
    if (!solo || !autoDetectives) return;
    if (game.status.kind !== "playing") return;
    if (game.turn === "vedha") return;
    const t = setTimeout(() => {
      const m = autoDetectiveMove(game);
      setGame((cur) => (cur !== game ? cur : m ? applyMove(cur, m) : cur));
    }, 650);
    return () => clearTimeout(t);
  }, [solo, autoDetectives, game]);

  // sound cues off state transitions (gated by Settings → Sound)
  useEffect(() => {
    const prev = sfxRef.current;
    const now = {
      turn: game.turn,
      round: game.round,
      reveal: game.lastRevealRound,
      over: game.status.kind === "over",
    };
    sfxRef.current = now;
    if (!prev) return; // first render — don't sound the initial state

    if (now.over && !prev.over) {
      sfx(game.status.kind === "over" && game.status.winner === "detective" ? "catch" : "win");
    } else if (now.turn !== prev.turn || now.round !== prev.round) {
      sfx("move");
    }
    if (now.reveal !== prev.reveal && now.reveal != null) {
      setTimeout(() => sfx("reveal"), 120);
    }
  }, [game, sfx]);

  // solo: archive the finished game so it shows in history / the Results screen
  useEffect(() => {
    if (!solo || game.status.kind !== "over" || soloRecordedRef.current) return;
    soloRecordedRef.current = true;
    const finalState = game;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const meId = data.user?.id;
      if (!meId) return;
      type Stashed = { id: string; name: string; isMe?: boolean; pawns: string[] };
      let stashed: Stashed[] = [];
      try {
        stashed = JSON.parse(sessionStorage.getItem(`fv:seats:${code}`) ?? "[]");
      } catch {
        /* fall back to viewAs */
      }
      const mine = stashed.find((s) => s.isMe)?.pawns ?? (viewAs === "vedha" ? ["vedha"] : []);
      const allPawns = ["vedha", "d1", "d2", "d3", "d4", "d5"];
      const seats = [
        { uid: meId, name: stashed.find((s) => s.isMe)?.name ?? "You", pawns: mine },
        {
          uid: "00000000-0000-0000-0000-000000000000",
          name: "Computer",
          pawns: allPawns.filter((p) => !mine.includes(p)),
        },
      ];
      await supabase.rpc("record_match", {
        p_code: code,
        p_seed: null,
        p_state: finalState,
        p_seats: seats,
      });
    })();
  }, [solo, game, code, viewAs, supabase]);

  const value: GameCtx = {
    game,
    viewAs,
    setViewAs,
    autoDetectives,
    toggleAutoDetectives,
    soloTools: solo,
    seats,
    chatName,
    chatDet,
    chat,
    sendChat,
    activePawnId,
    myTurn,
    legalDest,
    vedhaVisible,
    lastKnown,
    pending,
    pickNode,
    pickTransport,
    chosenTransport,
    confirm,
    cancel,
    canDouble,
    startDouble,
    doubleActive: game.double.active,
    revealFlash,
    newGame,
    moveError,
    awayPawns,
    vedhaAway,
    takeOver,
    concede,
    leaveGame,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
