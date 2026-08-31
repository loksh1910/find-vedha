/*
  PLACEHOLDER board graph for the in-game interface mock.
  NOT the authored 199-node Chennai board — that's Phase 3.
  9 × 7 lattice (63 nodes) with a triangulated Auto mesh, a few Bus and
  Metro lines, and two Wildcard-only river crossings. A node's kind is
  derived from the edges that touch it (Auto everywhere is the base).
*/

export type TransportMode = "auto" | "bus" | "metro" | "river";
export type NodeKind = "auto" | "autobus" | "autobusmetro";

export type BoardNode = {
  id: number;
  x: number;
  y: number;
  kind: NodeKind;
  isStart: boolean;
};

export type BoardEdge = { a: number; b: number; mode: TransportMode };

export type Board = {
  nodes: BoardNode[];
  edges: BoardEdge[];
  /** SVG path for the decorative river. */
  riverPath: string;
  width: number;
  height: number;
  startNodes: number[];
};

const COLS = 9;
const ROWS = 7;
const GAP_X = 116;
const GAP_Y = 116;
const MARGIN_X = 96;
const MARGIN_Y = 84;

// tiny seeded RNG so the jittered layout is stable across renders
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function idAt(r: number, c: number) {
  return r * COLS + c + 1;
}

/** Bus lines, as id sequences (edges join consecutive ids). */
const BUS_LINES: number[][] = [
  [1, 3, 5, 7, 9],
  [10, 20, 30, 40, 50, 60],
  [18, 26, 34, 42],
  [28, 30, 32, 34, 36],
  [2, 20, 38, 56],
  [46, 48, 50, 52, 54],
];

/** Metro lines — long hops between spread-out hub nodes. */
const METRO_LINES: number[][] = [
  [3, 15, 32, 47, 61],
  [7, 24, 41, 59],
  [41, 55],
  [32, 41],
];

/** Wildcard-only river crossings (long, cross the river band). */
const RIVER_EDGES: [number, number][] = [
  [40, 59],
  [43, 60],
];

const START_NODES = [1, 7, 13, 19, 26, 32, 37, 43, 46, 52, 55, 61];

function build(): Board {
  const rand = rng(20260831);
  const nodeById = new Map<number, BoardNode>();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = idAt(r, c);
      nodeById.set(id, {
        id,
        x: MARGIN_X + c * GAP_X + (rand() - 0.5) * 46,
        y: MARGIN_Y + r * GAP_Y + (rand() - 0.5) * 46,
        kind: "auto",
        isStart: START_NODES.includes(id),
      });
    }
  }

  const edgeKey = (a: number, b: number, m: string) =>
    `${Math.min(a, b)}-${Math.max(a, b)}-${m}`;
  const seen = new Set<string>();
  const edges: BoardEdge[] = [];
  const add = (a: number, b: number, mode: TransportMode) => {
    if (a === b || !nodeById.has(a) || !nodeById.has(b)) return;
    const k = edgeKey(a, b, mode);
    if (seen.has(k)) return;
    seen.add(k);
    edges.push({ a, b, mode });
  };

  // Auto mesh: right, down, and both diagonals (triangulated)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = idAt(r, c);
      if (c + 1 < COLS) add(id, idAt(r, c + 1), "auto");
      if (r + 1 < ROWS) add(id, idAt(r + 1, c), "auto");
      if (r + 1 < ROWS && c + 1 < COLS) add(id, idAt(r + 1, c + 1), "auto");
      if (r + 1 < ROWS && c - 1 >= 0 && rand() > 0.35)
        add(id, idAt(r + 1, c - 1), "auto");
    }
  }

  for (const line of BUS_LINES)
    for (let i = 0; i + 1 < line.length; i++) add(line[i], line[i + 1], "bus");
  for (const line of METRO_LINES)
    for (let i = 0; i + 1 < line.length; i++) add(line[i], line[i + 1], "metro");
  for (const [a, b] of RIVER_EDGES) add(a, b, "river");

  // derive kind from touching edges
  for (const e of edges) {
    for (const nid of [e.a, e.b]) {
      const n = nodeById.get(nid)!;
      if (e.mode === "metro") n.kind = "autobusmetro";
      else if (e.mode === "bus" && n.kind === "auto") n.kind = "autobus";
    }
  }

  const width = MARGIN_X * 2 + (COLS - 1) * GAP_X;
  const height = MARGIN_Y * 2 + (ROWS - 1) * GAP_Y;

  return {
    nodes: [...nodeById.values()].sort((a, b) => a.id - b.id),
    edges,
    riverPath: `M -40 ${height * 0.66} C ${width * 0.25} ${height * 0.5}, ${
      width * 0.5
    } ${height * 0.86}, ${width * 0.72} ${height * 0.7} S ${width + 60} ${
      height * 0.6
    }, ${width + 80} ${height * 0.72}`,
    width,
    height,
    startNodes: START_NODES,
  };
}

export const BOARD: Board = build();

export function nodeById(id: number): BoardNode {
  return BOARD.nodes[id - 1];
}

export function neighbours(
  id: number,
): { to: number; mode: TransportMode }[] {
  const out: { to: number; mode: TransportMode }[] = [];
  for (const e of BOARD.edges) {
    if (e.a === id) out.push({ to: e.b, mode: e.mode });
    else if (e.b === id) out.push({ to: e.a, mode: e.mode });
  }
  return out;
}
