export type Role = "vedha" | "detective";

/** What Vedha actually spends / what a Detective spends. */
export type MoveTransport = "auto" | "bus" | "metro" | "wildcard";

export type Wallet = {
  auto: number;
  bus: number;
  metro: number;
  wildcard: number;
  double: number;
};

export type Pawn = {
  id: string; // "vedha" | "d1".."d5"
  role: Role;
  slot: number; // 0 = Vedha, 1..5 = Detective slot
  label: string; // "Vedha" | "D1" …
  colour: string; // colour name
  varName: string; // CSS var for the colour
  node: number;
  wallet: Wallet;
  stuck: boolean;
  /** networked: controller left / dropped. Skipped in rotation, counts as
   *  stuck for win checks, and can be taken over by any remaining player. */
  abandoned?: boolean;
};

export type LogEntry = {
  round: number;
  transport: MoveTransport; // the real card Vedha used
  node: number; // Vedha's node after this hop
  revealed: boolean; // reveal round → node visible to Detectives
  double: boolean; // this hop was part of a Double-Move
};

export type GameStatus =
  | { kind: "playing" }
  | {
      kind: "over";
      winner: Role;
      reason: string;
      round: number;
      caughtAt?: number;
    };

export type GameState = {
  round: number; // 1..24
  turn: string; // pawn id to move ("vedha" first each round)
  turnOrder: string[]; // ["vedha", "d1", … "d5"]
  pawns: Record<string, Pawn>;
  log: LogEntry[];
  status: GameStatus;
  double: { active: boolean; hopsDone: number }; // Vedha Double-Move in progress
  lastRevealRound: number | null; // drives the reveal flash
};

export const REVEAL_ROUNDS = [3, 8, 13, 18, 24] as const;
export const TOTAL_ROUNDS = 24;

export function isRevealRound(r: number): boolean {
  return (REVEAL_ROUNDS as readonly number[]).includes(r);
}

export function nextRevealRound(r: number): number | null {
  return REVEAL_ROUNDS.find((x) => x >= r) ?? null;
}
