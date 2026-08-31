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

type Pending = { to: number; options: Move[] } | null;

type GameCtx = {
  game: GameState;
  viewAs: Role;
  setViewAs: (r: Role) => void;
  autoDetectives: boolean;
  toggleAutoDetectives: () => void;

  activePawnId: string;
  /** viewer's side matches whose turn it is */
  myTurn: boolean;
  /** legal destination node ids for the active pawn, when it's the viewer's move */
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
};

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState>(() => createGame(20260831));
  const [viewAs, setViewAs] = useState<Role>("vedha");
  const [autoDetectives, setAutoDetectives] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [chosenTransport, setChosenTransport] = useState<MoveTransport | null>(null);
  const [revealFlash, setRevealFlash] = useState<GameCtx["revealFlash"]>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePawnId = game.turn;
  const turnSide: Role = activePawnId === "vedha" ? "vedha" : "detective";
  const myTurn = game.status.kind === "playing" && turnSide === viewAs;

  const legalDest = useMemo(() => {
    if (!myTurn) return new Set<number>();
    return new Set(legalMoves(game, activePawnId).map((m) => m.to));
  }, [game, activePawnId, myTurn]);

  const vedhaVisible = useMemo(() => {
    if (viewAs === "vedha") return true;
    if (game.status.kind === "over") return true;
    const last = game.log[game.log.length - 1];
    return !!last?.revealed;
  }, [viewAs, game]);

  const lastKnown = useMemo(() => lastKnownVedhaNode(game), [game]);
  const canDouble = useMemo(
    () => viewAs === "vedha" && canDoubleMove(game),
    [viewAs, game],
  );

  const applyAndFlash = useCallback((next: GameState, prev: GameState) => {
    if (
      next.lastRevealRound !== prev.lastRevealRound &&
      next.lastRevealRound != null
    ) {
      const revealed = [...next.log].reverse().find((e) => e.revealed);
      if (revealed) {
        setRevealFlash({ round: revealed.round, node: revealed.node });
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setRevealFlash(null), 2400);
      }
    }
    setGame(next);
  }, []);

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

  const confirm = useCallback(() => {
    if (!pending || !chosenTransport) return;
    const move = pending.options.find((m) => m.transport === chosenTransport);
    if (!move) return;
    const next = applyMove(game, move);
    cancel();
    applyAndFlash(next, game);
  }, [pending, chosenTransport, game, cancel, applyAndFlash]);

  const startDouble = useCallback(() => {
    if (!canDouble) return;
    setGame(declareDoubleMove(game));
  }, [canDouble, game]);

  const newGame = useCallback(() => {
    setGame(createGame(Date.now()));
    cancel();
    setRevealFlash(null);
  }, [cancel]);

  const toggleAutoDetectives = useCallback(
    () => setAutoDetectives((v) => !v),
    [],
  );

  // demo aid: auto-move detectives when it's their turn
  useEffect(() => {
    if (!autoDetectives) return;
    if (game.status.kind !== "playing") return;
    if (game.turn === "vedha") return;
    const t = setTimeout(() => {
      const m = autoDetectiveMove(game);
      setGame((cur) => {
        if (cur !== game) return cur; // stale
        return m ? applyMove(cur, m) : cur;
      });
    }, 650);
    return () => clearTimeout(t);
  }, [autoDetectives, game]);

  const value: GameCtx = {
    game,
    viewAs,
    setViewAs,
    autoDetectives,
    toggleAutoDetectives,
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
