import { BOARD, neighbours, type TransportMode } from "@/lib/board/board-data";
import { DETECTIVE_SLOTS, VEDHA_SLOT } from "@/lib/roles";
import {
  isRevealRound,
  TOTAL_ROUNDS,
  type GameState,
  type LogEntry,
  type MoveTransport,
  type Pawn,
  type Wallet,
} from "./types";

export type Move = {
  pawnId: string;
  to: number;
  /** The ticket spent. "wildcard" only for Vedha. */
  transport: MoveTransport;
  /** The underlying edge mode (for wildcard moves + the travel log). */
  via: TransportMode;
};

const VEDHA_WALLET: Wallet = { auto: 4, bus: 3, metro: 3, wildcard: 5, double: 2 };
const DET_WALLET: Wallet = { auto: 10, bus: 8, metro: 4, wildcard: 0, double: 0 };

function seededShuffle<T>(arr: T[], seed: number): T[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(seed = Date.now()): GameState {
  const starts = seededShuffle(BOARD.startNodes, seed).slice(0, 6);
  const pawns: Record<string, Pawn> = {};

  pawns.vedha = {
    id: "vedha",
    role: "vedha",
    slot: 0,
    label: "Vedha",
    colour: VEDHA_SLOT.colour,
    varName: "--signal",
    node: starts[0],
    wallet: { ...VEDHA_WALLET },
    stuck: false,
  };

  DETECTIVE_SLOTS.forEach((slot, i) => {
    pawns[`d${i + 1}`] = {
      id: `d${i + 1}`,
      role: "detective",
      slot: i + 1,
      label: `D${i + 1}`,
      colour: slot.colour,
      varName: slot.varName,
      node: starts[i + 1],
      wallet: { ...DET_WALLET },
      stuck: false,
    };
  });

  return {
    round: 1,
    turn: "vedha",
    turnOrder: ["vedha", "d1", "d2", "d3", "d4", "d5"],
    pawns,
    log: [],
    status: { kind: "playing" },
    double: { active: false, hopsDone: 0 },
    lastRevealRound: null,
  };
}

const modeToTicket: Record<TransportMode, MoveTransport | null> = {
  auto: "auto",
  bus: "bus",
  metro: "metro",
  river: null, // wildcard only
};

/** Every legal move for a pawn from its current node. */
export function legalMoves(state: GameState, pawnId: string): Move[] {
  const pawn = state.pawns[pawnId];
  if (!pawn) return [];
  const occupiedByDetective = new Set(
    Object.values(state.pawns)
      .filter((p) => p.role === "detective" && p.id !== pawnId)
      .map((p) => p.node),
  );
  const out: Move[] = [];
  const seen = new Set<string>();
  const push = (m: Move) => {
    const k = `${m.to}:${m.transport}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(m);
  };

  for (const { to, mode } of neighbours(pawn.node)) {
    if (pawn.role === "detective" && occupiedByDetective.has(to)) continue;

    const ticket = modeToTicket[mode];
    if (ticket && pawn.wallet[ticket] > 0) {
      push({ pawnId, to, transport: ticket, via: mode });
    }
    // Vedha can Wildcard any edge (and it's the only way over a river edge)
    if (pawn.role === "vedha" && pawn.wallet.wildcard > 0) {
      push({ pawnId, to, transport: "wildcard", via: mode });
    }
  }
  return out;
}

export function canDoubleMove(state: GameState): boolean {
  return (
    state.status.kind === "playing" &&
    state.turn === "vedha" &&
    !state.double.active &&
    state.pawns.vedha.wallet.double > 0 &&
    legalMoves(state, "vedha").length > 0
  );
}

/** Detectives with no legal move become stuck; returns the updated list of ids still able to act. */
function refreshStuck(state: GameState) {
  for (const id of ["d1", "d2", "d3", "d4", "d5"]) {
    if (legalMoves(state, id).length === 0) state.pawns[id].stuck = true;
  }
}

function endIf(state: GameState) {
  if (state.status.kind !== "playing") return true;
  const vedhaNode = state.pawns.vedha.node;
  const caught = Object.values(state.pawns).some(
    (p) => p.role === "detective" && p.node === vedhaNode,
  );
  if (caught) {
    state.status = {
      kind: "over",
      winner: "detective",
      reason: `Vedha caught at #${vedhaNode}`,
      round: state.round,
      caughtAt: vedhaNode,
    };
    return true;
  }
  const allStuck = ["d1", "d2", "d3", "d4", "d5"].every(
    (id) => state.pawns[id].stuck || state.pawns[id].abandoned,
  );
  if (allStuck) {
    state.status = {
      kind: "over",
      winner: "vedha",
      reason: "Every Detective is stuck",
      round: state.round,
    };
    return true;
  }
  return false;
}

/** Apply a move. Returns a new state (caller passes a structuredClone). */
export function applyMove(prev: GameState, move: Move): GameState {
  const state: GameState = structuredClone(prev);
  if (state.status.kind !== "playing") return state;
  const pawn = state.pawns[move.pawnId];
  if (!pawn || state.turn !== move.pawnId) return state;

  // spend the ticket
  if (pawn.role === "detective") {
    const t = move.transport as "auto" | "bus" | "metro";
    pawn.wallet[t] -= 1;
    state.pawns.vedha.wallet[t] += 1; // ticket handoff
  } else if (move.transport === "wildcard") {
    pawn.wallet.wildcard -= 1;
  } else {
    pawn.wallet[move.transport] -= 1;
  }
  pawn.node = move.to;

  if (pawn.role === "vedha") {
    const isSecondHop = state.double.active && state.double.hopsDone === 1;
    const revealed = isRevealRound(state.round) && !isSecondHop;
    const entry: LogEntry = {
      round: state.round,
      transport: move.transport,
      node: move.to,
      revealed,
      double: state.double.active,
    };
    state.log.push(entry);
    if (revealed) state.lastRevealRound = state.round;
  }

  if (endIf(state)) return state;

  // advance turn
  if (pawn.role === "vedha") {
    if (state.double.active && state.double.hopsDone === 0) {
      state.double.hopsDone = 1; // Vedha moves again
    } else {
      state.double = { active: false, hopsDone: 0 };
      state.turn = "d1";
      advancePastStuck(state);
    }
  } else {
    const order = ["d1", "d2", "d3", "d4", "d5"];
    const idx = order.indexOf(pawn.id);
    if (idx === order.length - 1) {
      // round complete
      if (state.round >= TOTAL_ROUNDS) {
        state.status = {
          kind: "over",
          winner: "vedha",
          reason: "Vedha survived all 24 rounds",
          round: state.round,
        };
        return state;
      }
      state.round += 1;
      state.turn = "vedha";
    } else {
      state.turn = order[idx + 1];
      advancePastStuck(state);
    }
  }

  refreshStuck(state);
  endIf(state);
  return state;
}

/** Skip any leading stuck / abandoned detectives in the current turn slot. */
function advancePastStuck(state: GameState) {
  const order = ["d1", "d2", "d3", "d4", "d5"];
  let guard = 0;
  while (state.turn !== "vedha" && guard++ < 6) {
    const id = state.turn;
    if (!state.pawns[id].abandoned && legalMoves(state, id).length > 0) break;
    if (!state.pawns[id].abandoned) state.pawns[id].stuck = true;
    const idx = order.indexOf(id);
    if (idx === order.length - 1) {
      if (state.round >= TOTAL_ROUNDS) {
        state.status = {
          kind: "over",
          winner: "vedha",
          reason: "Vedha survived all 24 rounds",
          round: state.round,
        };
        return;
      }
      state.round += 1;
      state.turn = "vedha";
    } else {
      state.turn = order[idx + 1];
    }
  }
}

/**
 * After a pawn is marked `abandoned` (or un-abandoned on takeover), settle the
 * turn: skip past any leading abandoned/stuck detective, and end the game if
 * that leaves every Detective unable to act.
 */
export function resolveAbandoned(prev: GameState): GameState {
  const state: GameState = structuredClone(prev);
  if (state.status.kind !== "playing") return state;
  if (state.turn !== "vedha") advancePastStuck(state);
  endIf(state);
  return state;
}

export function declareDoubleMove(prev: GameState): GameState {
  const state: GameState = structuredClone(prev);
  if (!canDoubleMove(state)) return state;
  state.pawns.vedha.wallet.double -= 1;
  state.double = { active: true, hopsDone: 0 };
  return state;
}

/** Node last shown to Detectives (most recent revealed hop), or null. */
export function lastKnownVedhaNode(state: GameState): number | null {
  for (let i = state.log.length - 1; i >= 0; i--) {
    if (state.log[i].revealed) return state.log[i].node;
  }
  return null;
}

/**
 * A dumb demo AI for the Detectives — NOT the real game.
 * It only knows what a Detective would know: converge on the last REVEALED
 * node; with nothing revealed yet, just wander. It never peeks at Vedha's
 * real position.
 */
export function autoDetectiveMove(state: GameState): Move | null {
  const id = state.turn;
  if (id === "vedha") return null;
  const moves = legalMoves(state, id);
  if (moves.length === 0) return null;

  const target = lastKnownVedhaNode(state);
  if (target == null) {
    // wander — prefer a node we haven't just come from
    return moves[Math.floor(Math.random() * moves.length)];
  }
  const tn = BOARD.nodes[target - 1];
  let best = moves[0];
  let bestD = Infinity;
  for (const m of moves) {
    const n = BOARD.nodes[m.to - 1];
    const d = (n.x - tn.x) ** 2 + (n.y - tn.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}
