/*
  Chennai board — authored pass 2. 199 nodes.

  Model (matches real Scotland Yard):
  - ONE planar street network. Roads never cross.
  - Every road segment carries Auto. Some also carry Bus. A road segment is
    an edge between two ADJACENT nodes — bus always goes node-to-next-node.
  - Metro stations sit on the network; a Metro line is drawn along the
    roads between its stations, but a Metro *move* jumps station→station.
  - So an edge is (a, b, mode): the auto+bus edges share node pairs; metro
    edges carry a `path` (node-id polyline) for rendering along the roads.
  - Every node connects to >= 3 others. No isolated clusters.
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

export type BoardEdge = {
  a: number;
  b: number;
  mode: TransportMode;
  /** metro only: node-id polyline tracing the roads between the two stations */
  path?: number[];
};

export type Board = {
  nodes: BoardNode[];
  edges: BoardEdge[];
  width: number;
  height: number;
  startNodes: number[];
  riverPaths: string[];
  coastPath: string;
  parks: string[];
};

const W = 2200;
const H = 1500;
const TARGET = 199;

/* ---------- helpers ---------- */

function rngFactory(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand = rngFactory(90218);

type P = { x: number; y: number };
const dist2 = (a: P, b: P) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

function orient(a: P, b: P, c: P) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}
/** proper segment intersection (shared endpoints do NOT count as crossing) */
function segCross(p1: P, p2: P, p3: P, p4: P): boolean {
  const eq = (u: P, v: P) => u.x === v.x && u.y === v.y;
  if (eq(p1, p3) || eq(p1, p4) || eq(p2, p3) || eq(p2, p4)) return false;
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

const coastX = (y: number) => 1815 + 70 * Math.sin(y / 190) + 34 * Math.sin(y / 74 + 1);

function polyline(f: (t: number) => P, n: number): P[] {
  return Array.from({ length: n }, (_, i) => f(i / (n - 1)));
}
const RIVER_A = polyline(
  (t) => ({ x: -40 + t * 1900, y: 700 + 150 * Math.sin(t * 3.1) - 60 * Math.sin(t * 7 + 1) }),
  40,
);
const RIVER_B = polyline(
  (t) => ({ x: 250 + t * 1560, y: 1500 - t * 260 - 90 * Math.sin(t * 3.4) }),
  34,
);
const PARKS = [
  { cx: 300, cy: 300, rx: 210, ry: 150 },
  { cx: 1150, cy: 430, rx: 150, ry: 110 },
  { cx: 760, cy: 1180, rx: 170, ry: 120 },
  { cx: 1560, cy: 1120, rx: 140, ry: 105 },
];

function distToPolyline(p: P, poly: P[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}
function inLand(p: P): boolean {
  if (p.x < 46 || p.y < 46 || p.y > H - 46) return false;
  if (p.x > coastX(p.y) - 50) return false;
  if (distToPolyline(p, RIVER_A) < 48) return false;
  if (distToPolyline(p, RIVER_B) < 44) return false;
  for (const k of PARKS)
    if (((p.x - k.cx) / (k.rx + 14)) ** 2 + ((p.y - k.cy) / (k.ry + 14)) ** 2 < 1) return false;
  return true;
}
function bankOfA(p: P): number {
  let ny = 0;
  let bd = Infinity;
  for (const q of RIVER_A) {
    const d = dist2(p, q);
    if (d < bd) {
      bd = d;
      ny = q.y;
    }
  }
  return Math.sign(p.y - ny) || 1;
}

/* ---------- points ---------- */

function makePoints(): P[] {
  for (let spacing = 120; spacing > 72; spacing -= 3) {
    const pts: P[] = [];
    const rowH = spacing * 0.9;
    for (let row = 0, y = 60; y < H - 40; row++, y += rowH) {
      const off = row % 2 ? spacing / 2 : 0;
      for (let x = 60 + off; x < W - 40; x += spacing) {
        const p = {
          x: x + (rand() - 0.5) * spacing * 0.58,
          y: y + (rand() - 0.5) * rowH * 0.58,
        };
        if (inLand(p)) pts.push(p);
      }
    }
    if (pts.length < TARGET) continue;
    while (pts.length > TARGET) {
      let worst = 0;
      let worstD = Infinity;
      for (let i = 0; i < pts.length; i++) {
        let nd = Infinity;
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const d = dist2(pts[i], pts[j]);
          if (d < nd) nd = d;
        }
        if (nd < worstD) {
          worstD = nd;
          worst = i;
        }
      }
      pts.splice(worst, 1);
    }
    return pts;
  }
  throw new Error("could not place 199 nodes");
}

/* ---------- build ---------- */

function build(): Board {
  const nodes: BoardNode[] = makePoints().map((p, i) => ({
    id: i + 1,
    x: Math.round(p.x),
    y: Math.round(p.y),
    kind: "auto",
    isStart: false,
  }));
  const N = nodes.length;
  const XY = (id: number) => nodes[id - 1];

  const adj: Map<number, Set<number>> = new Map(nodes.map((n) => [n.id, new Set()]));
  const autoEdges: BoardEdge[] = [];
  const deg = (id: number) => adj.get(id)!.size;
  const crosses = (a: P, b: P) => autoEdges.some((e) => segCross(a, b, XY(e.a), XY(e.b)));
  const link = (a: number, b: number) => {
    if (a === b || adj.get(a)!.has(b)) return;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
    autoEdges.push({ a, b, mode: "auto" });
  };

  // candidate pairs, shortest first
  const cand: { a: number; b: number; d: number }[] = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) {
      const d = dist(nodes[i], nodes[j]);
      if (d <= 210) cand.push({ a: i + 1, b: j + 1, d });
    }
  cand.sort((x, y) => x.d - y.d);

  // union-find
  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  const find = (x: number): number => {
    while (parent.get(x)! !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };
  const union = (a: number, b: number) => parent.set(find(a), find(b));

  // 1) spanning + moderate proximity graph, planar, degree-capped
  for (const c of cand) {
    if (adj.get(c.a)!.has(c.b)) continue;
    const spanning = find(c.a) !== find(c.b);
    if (!spanning && (deg(c.a) >= 4 || deg(c.b) >= 4)) continue;
    if (!spanning && c.d > 165) continue;
    if (crosses(XY(c.a), XY(c.b))) continue;
    if (!spanning) {
      let shared = 0;
      for (const nb of adj.get(c.a)!) if (adj.get(c.b)!.has(nb)) shared++;
      if (shared >= 1 && rand() > 0.55) continue;
    }
    link(c.a, c.b);
    union(c.a, c.b);
  }

  // 2) merge any stray components into the main one (shortest non-crossing bridge)
  {
    let groups = new Map<number, number[]>();
    const regroup = () => {
      groups = new Map();
      for (const n of nodes) {
        const r = find(n.id);
        let g = groups.get(r);
        if (!g) {
          g = [];
          groups.set(r, g);
        }
        g.push(n.id);
      }
    };
    regroup();
    while (groups.size > 1) {
      const sorted = [...groups.values()].sort((a, b) => b.length - a.length);
      const main = sorted[0];
      const mainSet = new Set(main);
      const stray = sorted[1];
      let bestPair: [number, number] | null = null;
      let bestD = Infinity;
      let fallback: [number, number] = [stray[0], main[0]];
      let fallbackD = Infinity;
      for (const u of stray)
        for (const v of main) {
          const d = dist2(XY(u), XY(v));
          if (d > 320 * 320) continue;
          if (d < fallbackD) {
            fallbackD = d;
            fallback = [u, v];
          }
          if (d < bestD && !crosses(XY(u), XY(v))) {
            bestD = d;
            bestPair = [u, v];
          }
        }
      const [u, v] = bestPair ?? fallback;
      link(u, v);
      union(u, v);
      // pull in the rest of the stray group with cheap internal links if needed
      for (const s of stray) if (!mainSet.has(s)) union(s, u);
      regroup();
    }
  }

  // 3) every node >= 3 streets
  for (let pass = 0; pass < 3; pass++) {
    for (const n of nodes) {
      if (deg(n.id) >= 3) continue;
      const near = cand
        .filter((c) => (c.a === n.id || c.b === n.id))
        .map((c) => (c.a === n.id ? c.b : c.a));
      // widen search if this node is short on candidates
      const extra =
        near.length < 6
          ? nodes
              .map((m) => m.id)
              .filter((id) => id !== n.id)
              .sort((p, q) => dist2(XY(n.id), XY(p)) - dist2(XY(n.id), XY(q)))
              .slice(0, 12)
          : [];
      for (const other of [...near, ...extra]) {
        if (adj.get(n.id)!.has(other) || deg(other) >= 6) continue;
        if (crosses(XY(n.id), XY(other))) continue;
        link(n.id, other);
        if (deg(n.id) >= 3) break;
      }
    }
  }

  /* ----- shortest path on the street graph ----- */
  const roadPath = (src: number, dst: number): number[] => {
    const prev = new Map<number, number>();
    const seen = new Set([src]);
    let frontier = [src];
    while (frontier.length) {
      const next: number[] = [];
      for (const u of frontier) {
        if (u === dst) {
          const p = [dst];
          let c = dst;
          while (c !== src) {
            c = prev.get(c)!;
            p.unshift(c);
          }
          return p;
        }
        for (const v of adj.get(u)!)
          if (!seen.has(v)) {
            seen.add(v);
            prev.set(v, u);
            next.push(v);
          }
      }
      frontier = next;
    }
    return [src, dst];
  };

  /* ----- Bus: routes that walk node-to-next-node down the streets ----- */
  const busEdges: BoardEdge[] = [];
  const busPairs = new Set<string>();
  const addBus = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (busPairs.has(k)) return;
    busPairs.add(k);
    busEdges.push({ a, b, mode: "bus" });
  };
  const busSeeds = pickSpread(nodes, 7, 4102);
  for (const seed of busSeeds) {
    let prev = -1;
    let cur = seed;
    let heading = rand() * Math.PI * 2;
    for (let step = 0; step < 15; step++) {
      let best = -1;
      let bestScore = Infinity;
      for (const nb of adj.get(cur)!) {
        if (nb === prev) continue;
        const ang = Math.atan2(XY(nb).y - XY(cur).y, XY(nb).x - XY(cur).x);
        let turn = Math.abs(ang - heading);
        if (turn > Math.PI) turn = Math.PI * 2 - turn;
        const usedPenalty = busPairs.has(cur < nb ? `${cur}-${nb}` : `${nb}-${cur}`) ? 3 : 0;
        const score = turn + usedPenalty;
        if (score < bestScore) {
          bestScore = score;
          best = nb;
        }
      }
      if (best < 0 || bestScore > 2.4) break;
      addBus(cur, best);
      heading = Math.atan2(XY(best).y - XY(cur).y, XY(best).x - XY(cur).x);
      prev = cur;
      cur = best;
    }
  }

  /* ----- Metro: a few lines; stations far apart, line drawn along roads ----- */
  const metroStations = pickSpread(
    nodes.filter((n) => deg(n.id) >= 3),
    14,
    77,
  );
  const metroEdges: BoardEdge[] = [];
  const remaining = new Set(metroStations);
  while (remaining.size >= 2) {
    let cur = [...remaining][0];
    remaining.delete(cur);
    let hops = 0;
    while (remaining.size && hops < 5) {
      let best = -1;
      let bd = Infinity;
      for (const s of remaining) {
        const d = dist2(XY(cur), XY(s));
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (best < 0) break;
      metroEdges.push({ a: cur, b: best, mode: "metro", path: roadPath(cur, best) });
      remaining.delete(best);
      cur = best;
      hops++;
    }
  }

  /* ----- River (Wildcard-only) crossings ----- */
  const riverEdges: BoardEdge[] = [];
  const north = nodes.filter((n) => bankOfA(n) < 0);
  const south = nodes.filter((n) => bankOfA(n) > 0);
  for (let k = 0; k < 3; k++) {
    const fx = W * (0.24 + k * 0.28);
    const nn = north.slice().sort((a, b) => Math.abs(a.x - fx) - Math.abs(b.x - fx))[0];
    const sn = south.slice().sort((a, b) => Math.abs(a.x - fx) - Math.abs(b.x - fx))[0];
    if (nn && sn) riverEdges.push({ a: nn.id, b: sn.id, mode: "river" });
  }

  const edges = [...autoEdges, ...busEdges, ...metroEdges, ...riverEdges];

  // node kind from the edges touching it
  for (const e of edges)
    for (const id of [e.a, e.b]) {
      const n = nodes[id - 1];
      if (e.mode === "metro") n.kind = "autobusmetro";
      else if (e.mode === "bus" && n.kind === "auto") n.kind = "autobus";
    }
  // a station the metro line PASSES THROUGH is a metro node too
  for (const e of metroEdges)
    for (const id of e.path ?? [])
      if (nodes[id - 1].kind !== "autobusmetro")
        nodes[id - 1].kind = nodes[id - 1].kind === "autobus" ? "autobusmetro" : nodes[id - 1].kind;

  // start nodes — 20, well-connected, spread
  const startPool = nodes.filter((n) => deg(n.id) >= 3);
  const startNodes = pickSpread(startPool, 20, 555);
  for (const id of startNodes) nodes[id - 1].isStart = true;

  const toPath = (poly: P[]) =>
    poly.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(" ");

  return {
    nodes,
    edges,
    width: W,
    height: H,
    startNodes,
    riverPaths: [toPath(RIVER_A), toPath(RIVER_B)],
    coastPath: `M ${W} 0 L ${W} ${H} ${polyline((t) => ({ x: coastX(H * (1 - t)), y: H * (1 - t) }), 40)
      .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
      .join(" ")} L ${W} 0 Z`,
    parks: PARKS.map(
      (k) =>
        `M ${k.cx - k.rx} ${k.cy} a ${k.rx} ${k.ry} 0 1 0 ${k.rx * 2} 0 a ${k.rx} ${k.ry} 0 1 0 ${-k.rx * 2} 0 Z`,
    ),
  };

  /* farthest-point spread over a node list, returns ids */
  function pickSpread(list: BoardNode[], count: number, seed: number): number[] {
    if (list.length === 0) return [];
    const r = rngFactory(seed);
    const start = list[Math.floor(r() * list.length)].id;
    const picked = [start];
    while (picked.length < count && picked.length < list.length) {
      let best = -1;
      let bestD = -1;
      for (const n of list) {
        if (picked.includes(n.id)) continue;
        let nd = Infinity;
        for (const p of picked) {
          const d = dist2(n, XY(p));
          if (d < nd) nd = d;
        }
        if (nd > bestD) {
          bestD = nd;
          best = n.id;
        }
      }
      if (best < 0) break;
      picked.push(best);
    }
    return picked;
  }
}

export const BOARD: Board = build();

export function nodeById(id: number): BoardNode {
  return BOARD.nodes[id - 1];
}

let _nbr: Map<number, { to: number; mode: TransportMode }[]> | null = null;
export function neighbours(id: number): { to: number; mode: TransportMode }[] {
  if (!_nbr) {
    _nbr = new Map(BOARD.nodes.map((n) => [n.id, []]));
    for (const e of BOARD.edges) {
      _nbr.get(e.a)!.push({ to: e.b, mode: e.mode });
      _nbr.get(e.b)!.push({ to: e.a, mode: e.mode });
    }
  }
  return _nbr.get(id) ?? [];
}

/** Undirected road segments (auto adjacency) with the modes each carries. */
let _roads: { a: number; b: number; bus: boolean }[] | null = null;
export function roadSegments() {
  if (!_roads) {
    const busSet = new Set(
      BOARD.edges
        .filter((e) => e.mode === "bus")
        .map((e) => (e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`)),
    );
    _roads = BOARD.edges
      .filter((e) => e.mode === "auto")
      .map((e) => ({
        a: e.a,
        b: e.b,
        bus: busSet.has(e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`),
      }));
  }
  return _roads;
}
