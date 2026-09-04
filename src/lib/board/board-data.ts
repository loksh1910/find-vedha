/*
  Chennai board — first authored pass. 199 nodes.
  - Points: jittered hex lattice inside a land silhouette (coastline on the
    east, two rivers), trimmed to exactly 199.
  - Auto network: a planar, street-like proximity graph (MST for
    connectivity + greedy no-crossing proximity edges). No mesh, no
    crossing lines.
  - Bus: routes that run ALONG the street network (rendered as a polyline
    through the underlying path) so they never introduce crossings.
  - Metro: a few long lines between hub stations (drawn over the top —
    "underground").
  - River: a handful of Wildcard-only crossings.
  A node's kind is derived from the edges that touch it.
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
  /** node-id polyline for bus routes that trace the streets (render only) */
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

/* ---------- geometry helpers ---------- */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand = rng(4041973);

const dist2 = (ax: number, ay: number, bx: number, by: number) =>
  (ax - bx) ** 2 + (ay - by) ** 2;

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  return (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
}
function segIntersect(
  p1: P, p2: P, p3: P, p4: P,
): boolean {
  // proper intersection only (shared endpoints don't count)
  if (
    (p1.x === p3.x && p1.y === p3.y) ||
    (p1.x === p4.x && p1.y === p4.y) ||
    (p2.x === p3.x && p2.y === p3.y) ||
    (p2.x === p4.x && p2.y === p4.y)
  )
    return false;
  const d1 = orient(p3.x, p3.y, p4.x, p4.y, p1.x, p1.y);
  const d2 = orient(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y);
  const d3 = orient(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  const d4 = orient(p1.x, p1.y, p2.x, p2.y, p4.x, p4.y);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

type P = { x: number; y: number };

/* ---------- city silhouette ---------- */

// coastline: land is everything left of this x for a given y
const coastX = (y: number) => 1815 + 70 * Math.sin(y / 190) + 34 * Math.sin(y / 74 + 1);

// two rivers as centre-lines (poly-points); land points must keep clear of the band
const RIVER_A: P[] = sample(
  (t) => ({
    x: -40 + t * 1900,
    y: 690 + 150 * Math.sin(t * 3.1) - 60 * Math.sin(t * 7 + 1),
  }),
  40,
);
const RIVER_B: P[] = sample(
  (t) => ({
    x: 250 + t * 1560,
    y: 1500 - t * 260 - 90 * Math.sin(t * 3.4),
  }),
  34,
);
const PARKS: { cx: number; cy: number; rx: number; ry: number }[] = [
  { cx: 300, cy: 300, rx: 210, ry: 150 },
  { cx: 1150, cy: 430, rx: 150, ry: 110 },
  { cx: 760, cy: 1180, rx: 170, ry: 120 },
  { cx: 1560, cy: 1120, rx: 130, ry: 100 },
];

function sample(f: (t: number) => P, n: number): P[] {
  return Array.from({ length: n }, (_, i) => f(i / (n - 1)));
}
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
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (d < best) best = d;
  }
  return best;
}
function inLand(p: P): boolean {
  if (p.x < 40 || p.y < 40 || p.y > H - 40) return false;
  if (p.x > coastX(p.y) - 46) return false;
  if (distToPolyline(p, RIVER_A) < 46) return false;
  if (distToPolyline(p, RIVER_B) < 42) return false;
  for (const k of PARKS) {
    if (((p.x - k.cx) / (k.rx + 12)) ** 2 + ((p.y - k.cy) / (k.ry + 12)) ** 2 < 1)
      return false;
  }
  return true;
}
function riverSideA(p: P): number {
  // which bank of river A (sign)
  let nearest = RIVER_A[0];
  let bd = Infinity;
  for (const q of RIVER_A) {
    const d = dist2(p.x, p.y, q.x, q.y);
    if (d < bd) {
      bd = d;
      nearest = q;
    }
  }
  return Math.sign(p.y - nearest.y) || 1;
}

/* ---------- point set ---------- */

function makePoints(): P[] {
  for (let spacing = 118; spacing > 70; spacing -= 4) {
    const pts: P[] = [];
    const rowH = spacing * 0.9;
    for (let row = 0, y = 60; y < H - 40; row++, y += rowH) {
      const off = row % 2 ? spacing / 2 : 0;
      for (let x = 60 + off; x < W - 40; x += spacing) {
        const p = {
          x: x + (rand() - 0.5) * spacing * 0.62,
          y: y + (rand() - 0.5) * rowH * 0.62,
        };
        if (inLand(p)) pts.push(p);
      }
    }
    if (pts.length < TARGET) continue;
    // trim to TARGET: repeatedly drop the point closest to any neighbour
    while (pts.length > TARGET) {
      let worst = 0;
      let worstD = Infinity;
      for (let i = 0; i < pts.length; i++) {
        let nd = Infinity;
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const d = dist2(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
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
  const pts = makePoints();
  const nodes: BoardNode[] = pts.map((p, i) => ({
    id: i + 1,
    x: Math.round(p.x),
    y: Math.round(p.y),
    kind: "auto",
    isStart: false,
  }));
  const N = nodes.length;
  const XY = (id: number) => nodes[id - 1];

  // candidate auto edges: pairs within a proximity radius
  const cand: { a: number; b: number; d: number }[] = [];
  const R = 175;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d <= R) cand.push({ a: i + 1, b: j + 1, d });
    }
  }
  cand.sort((x, y) => x.d - y.d);

  const adj: Map<number, Set<number>> = new Map(
    nodes.map((n) => [n.id, new Set<number>()]),
  );
  const autoEdges: BoardEdge[] = [];
  const deg = (id: number) => adj.get(id)!.size;
  const crosses = (a: number, b: number) => {
    const A = XY(a);
    const B = XY(b);
    for (const e of autoEdges) {
      if (segIntersect(A, B, XY(e.a), XY(e.b))) return true;
    }
    return false;
  };
  const link = (a: number, b: number) => {
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
    autoEdges.push({ a, b, mode: "auto" });
  };

  // 1) union-find spanning pass on shortest candidates (connectivity, planar by construction)
  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  const find = (x: number): number => {
    while (parent.get(x)! !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };
  for (const c of cand) {
    if (find(c.a) === find(c.b)) continue;
    if (crosses(c.a, c.b)) continue;
    if (deg(c.a) >= 5 || deg(c.b) >= 5) continue;
    parent.set(find(c.a), find(c.b));
    link(c.a, c.b);
  }
  // patch any nodes the degree-cap left stranded
  for (const c of cand) {
    if (find(c.a) === find(c.b)) continue;
    if (crosses(c.a, c.b)) continue;
    parent.set(find(c.a), find(c.b));
    link(c.a, c.b);
  }

  // 2) add extra proximity edges for a fuller street feel (still planar, capped degree)
  for (const c of cand) {
    if (adj.get(c.a)!.has(c.b)) continue;
    if (deg(c.a) >= 5 || deg(c.b) >= 5) continue;
    if (c.d > 168) continue;
    if (crosses(c.a, c.b)) continue;
    // don't create tiny triangles everywhere
    let shared = 0;
    for (const nb of adj.get(c.a)!) if (adj.get(c.b)!.has(nb)) shared++;
    if (shared >= 1 && rand() > 0.5) continue;
    link(c.a, c.b);
  }

  // 3) guarantee every node has at least 2 streets (no forced single moves)
  for (let pass = 0; pass < 2; pass++) {
    const need = pass === 0 ? 2 : 3;
    for (const n of nodes) {
      if (deg(n.id) >= need) continue;
      for (const c of cand) {
        const other = c.a === n.id ? c.b : c.b === n.id ? c.a : 0;
        if (!other || adj.get(n.id)!.has(other)) continue;
        if (deg(other) >= 6) continue;
        if (crosses(c.a, c.b)) continue;
        link(c.a, c.b);
        if (deg(n.id) >= need) break;
      }
    }
  }

  /* ----- shortest path on the auto graph (for bus routes) ----- */
  const autoPath = (src: number, dst: number): number[] => {
    const prev = new Map<number, number>();
    const seen = new Set<number>([src]);
    let frontier = [src];
    while (frontier.length) {
      const next: number[] = [];
      for (const u of frontier) {
        if (u === dst) {
          const path = [dst];
          let cur = dst;
          while (cur !== src) {
            cur = prev.get(cur)!;
            path.unshift(cur);
          }
          return path;
        }
        for (const v of adj.get(u)!) {
          if (!seen.has(v)) {
            seen.add(v);
            prev.set(v, u);
            next.push(v);
          }
        }
      }
      frontier = next;
    }
    return [src, dst];
  };

  /* ----- bus network: routes that ride the streets ----- */
  const busStops = [...nodes]
    .filter((n) => deg(n.id) >= 3)
    .sort((a, b) => deg(b.id) - deg(a.id))
    .slice(0, 46)
    .map((n) => n.id);

  const busEdges: BoardEdge[] = [];
  const usedBus = new Set<string>();
  const addBus = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (usedBus.has(key) || a === b) return;
    usedBus.add(key);
    busEdges.push({ a, b, mode: "bus", path: autoPath(a, b) });
  };
  // greedy near-linear lines through the bus stops
  const remaining = new Set(busStops);
  while (remaining.size > 4) {
    let cur = [...remaining][Math.floor(rand() * remaining.size)];
    remaining.delete(cur);
    let heading = rand() * Math.PI * 2;
    for (let step = 0; step < 7; step++) {
      let best = -1;
      let bestScore = Infinity;
      for (const s of remaining) {
        const dx = XY(s).x - XY(cur).x;
        const dy = XY(s).y - XY(cur).y;
        const d = Math.hypot(dx, dy);
        if (d < 120 || d > 520) continue;
        const ang = Math.atan2(dy, dx);
        let turn = Math.abs(ang - heading);
        if (turn > Math.PI) turn = Math.PI * 2 - turn;
        const score = d * (0.4 + turn);
        if (score < bestScore) {
          bestScore = score;
          best = s;
        }
      }
      if (best < 0) break;
      addBus(cur, best);
      heading = Math.atan2(XY(best).y - XY(cur).y, XY(best).x - XY(cur).x);
      remaining.delete(best);
      cur = best;
    }
  }

  /* ----- metro: long lines between hubs ----- */
  const hubs = [...nodes]
    .filter((n) => busStops.includes(n.id))
    .sort((a, b) => deg(b.id) - deg(a.id))
    .slice(0, 16)
    .map((n) => n.id);
  // order hubs into 3 rough lines by angle from centre
  const cx = W / 2;
  const cy = H / 2;
  const byAngle = [...hubs].sort(
    (a, b) =>
      Math.atan2(XY(a).y - cy, XY(a).x - cx) -
      Math.atan2(XY(b).y - cy, XY(b).x - cx),
  );
  const metroEdges: BoardEdge[] = [];
  const metroLine = (ids: number[]) => {
    for (let i = 0; i + 1 < ids.length; i++)
      metroEdges.push({ a: ids[i], b: ids[i + 1], mode: "metro" });
  };
  metroLine(byAngle.filter((_, i) => i % 2 === 0));
  metroLine(byAngle.filter((_, i) => i % 2 === 1));
  metroLine([byAngle[0], byAngle[4] ?? byAngle[0], byAngle[8] ?? byAngle[0], byAngle[12] ?? byAngle[0]]);

  /* ----- river (Wildcard-only) crossings ----- */
  const riverEdges: BoardEdge[] = [];
  const northOfA = nodes.filter((n) => riverSideA(n) < 0);
  const southOfA = nodes.filter((n) => riverSideA(n) > 0);
  for (let k = 0; k < 3; k++) {
    const frac = 0.25 + k * 0.28;
    const nn = northOfA
      .slice()
      .sort((a, b) => Math.abs(a.x - W * frac) - Math.abs(b.x - W * frac))[0];
    const sn = southOfA
      .slice()
      .sort((a, b) => Math.abs(a.x - W * frac) - Math.abs(b.x - W * frac))[0];
    if (nn && sn) riverEdges.push({ a: nn.id, b: sn.id, mode: "river" });
  }

  const edges = [...autoEdges, ...busEdges, ...metroEdges, ...riverEdges];

  // derive kind
  for (const e of edges) {
    for (const id of [e.a, e.b]) {
      const n = nodes[id - 1];
      if (e.mode === "metro") n.kind = "autobusmetro";
      else if (e.mode === "bus" && n.kind === "auto") n.kind = "autobus";
    }
  }

  // start nodes: farthest-point sampling among well-connected nodes, 20
  const startPool = nodes.filter((n) => adj.get(n.id)!.size >= 3);
  const starts: number[] = [
    (startPool[0] ?? nodes[0]).id,
  ];
  while (starts.length < 20 && starts.length < startPool.length) {
    let best = -1;
    let bestD = -1;
    for (const n of startPool) {
      if (starts.includes(n.id)) continue;
      let nd = Infinity;
      for (const s of starts) {
        const d = dist2(n.x, n.y, XY(s).x, XY(s).y);
        if (d < nd) nd = d;
      }
      if (nd > bestD) {
        bestD = nd;
        best = n.id;
      }
    }
    starts.push(best);
  }
  for (const id of starts) nodes[id - 1].isStart = true;

  const toPath = (poly: P[]) =>
    poly.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(" ");

  return {
    nodes,
    edges,
    width: W,
    height: H,
    startNodes: starts,
    riverPaths: [toPath(RIVER_A), toPath(RIVER_B)],
    coastPath: `M ${W} 0 L ${W} ${H} L ${coastX(H).toFixed(0)} ${H} ${sample(
      (t) => ({ x: coastX(H * (1 - t)), y: H * (1 - t) }),
      40,
    )
      .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
      .join(" ")} L ${W} 0 Z`,
    parks: PARKS.map(
      (k) =>
        `M ${k.cx - k.rx} ${k.cy} a ${k.rx} ${k.ry} 0 1 0 ${k.rx * 2} 0 a ${k.rx} ${k.ry} 0 1 0 ${-k.rx * 2} 0 Z`,
    ),
  };
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
