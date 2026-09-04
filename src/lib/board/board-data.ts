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
  /** decorative building footprints (SVG path `d` strings) — no gameplay role */
  buildings: string[];
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
const RIVER_SEGS: [P, P][] = [];
for (const poly of [RIVER_A, RIVER_B])
  for (let i = 0; i + 1 < poly.length; i++) RIVER_SEGS.push([poly[i], poly[i + 1]]);
function crossesRiver(a: P, b: P): boolean {
  return RIVER_SEGS.some(([p, q]) => segCross(a, b, p, q));
}
function riverSide(p: P, poly: P[]): number {
  let ny = 0;
  let bd = Infinity;
  for (const q of poly) {
    const d = dist2(p, q);
    if (d < bd) {
      bd = d;
      ny = q.y;
    }
  }
  return Math.sign(p.y - ny) || 1;
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
  const raw = makePoints();
  // even out spacing: a few passes of pairwise repulsion, clamped to land
  const targetGap = Math.sqrt((W * H) / raw.length) * 0.62;
  for (let iter = 0; iter < 24; iter++) {
    for (let i = 0; i < raw.length; i++) {
      let mx = 0;
      let my = 0;
      for (let j = 0; j < raw.length; j++) {
        if (i === j) continue;
        const dx = raw[i].x - raw[j].x;
        const dy = raw[i].y - raw[j].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < targetGap) {
          const push = (targetGap - d) / d;
          mx += dx * push * 0.5;
          my += dy * push * 0.5;
        }
      }
      let nx = raw[i].x + mx;
      let ny = raw[i].y + my;
      if (!inLand({ x: nx, y: ny })) {
        nx = raw[i].x;
        ny = raw[i].y;
      }
      raw[i] = { x: nx, y: ny };
    }
  }

  const nodes: BoardNode[] = raw.map((p, i) => ({
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
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
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

  // A handful of nodes act as junctions and may carry 5–6 streets;
  // every other node is capped at 4.
  const junctions = new Set(pickSpread(nodes, 14, 909));
  const capOf = (id: number) => (junctions.has(id) ? 6 : 4);
  const sharedNbrs = (a: number, b: number) => {
    let s = 0;
    for (const nb of adj.get(a)!) if (adj.get(b)!.has(nb)) s++;
    return s;
  };

  // 1) spanning + moderate proximity graph, planar, degree-capped.
  //    Never let an ordinary street cross a river — the ONLY river
  //    crossings are the controlled bridge pass below. No edge that would
  //    be the diagonal of a quad (a,b sharing 2+ neighbours).
  for (const c of cand) {
    if (adj.get(c.a)!.has(c.b)) continue;
    if (crossesRiver(XY(c.a), XY(c.b))) continue;
    const spanning = find(c.a) !== find(c.b);
    if (!spanning && (deg(c.a) >= capOf(c.a) || deg(c.b) >= capOf(c.b))) continue;
    if (!spanning && c.d > 165) continue;
    if (crosses(XY(c.a), XY(c.b))) continue;
    const shared = sharedNbrs(c.a, c.b);
    if (shared >= 2) continue; // would be a diagonal
    if (!spanning && shared >= 1 && !junctions.has(c.a) && !junctions.has(c.b) && rand() > 0.35)
      continue;
    link(c.a, c.b);
    union(c.a, c.b);
  }

  // 1b) BRIDGES — one clean crossing per riverside node. Rivers here run
  //     roughly east-west, so match each north-bank node to the south-bank
  //     node most directly opposite (closest x). Best-aligned pairs first
  //     → parallel bridges, no "diagonal in a quadrilateral". A wide band
  //     + long span cap so nodes a couple of rows back (with a park in the
  //     way) still get bridged. A follow-up pass connects any node the
  //     matching left out to its nearest free partner across.
  const bridgeEdges: { a: number; b: number }[] = [];
  const bridged = new Set<number>(); // hard cap: one river crossing per node, anywhere
  const tryBridge = (a: number, b: number, maxLen: number) => {
    if (bridged.has(a) || bridged.has(b) || a === b || adj.get(a)!.has(b)) return false;
    if (dist(XY(a), XY(b)) > maxLen) return false;
    if (deg(a) >= capOf(a) || deg(b) >= capOf(b)) return false;
    if (sharedNbrs(a, b) >= 3) return false;
    if (crosses(XY(a), XY(b))) return false;
    if (bridgeEdges.some((e) => segCross(XY(a), XY(b), XY(e.a), XY(e.b)))) return false;
    link(a, b);
    union(a, b);
    bridgeEdges.push({ a, b });
    bridged.add(a);
    bridged.add(b);
    return true;
  };
  for (const river of [RIVER_A, RIVER_B]) {
    const band = 460;
    const north = nodes.filter((n) => distToPolyline(n, river) < band && riverSide(n, river) < 0);
    const south = nodes.filter((n) => distToPolyline(n, river) < band && riverSide(n, river) > 0);
    // pass 1: closest-x match, best-aligned first
    const matched = north
      .map((nn) => {
        let best: BoardNode | null = null;
        let bd = Infinity;
        for (const sn of south) {
          const dx = Math.abs(nn.x - sn.x);
          if (dx < bd) {
            bd = dx;
            best = sn;
          }
        }
        return best ? { a: nn.id, b: best.id, dx: bd } : null;
      })
      .filter((m): m is { a: number; b: number; dx: number } => m !== null)
      .sort((x, y) => x.dx - y.dx);
    for (const m of matched) tryBridge(m.a, m.b, 620);
    // pass 2: any still-unbridged bank node -> nearest free partner across
    for (const nn of north) {
      if (bridged.has(nn.id)) continue;
      const opts = south
        .filter((sn) => !bridged.has(sn.id))
        .sort((p, q) => dist2(nn, p) - dist2(nn, q));
      for (const sn of opts) if (tryBridge(nn.id, sn.id, 640)) break;
    }
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

  // 3) every node >= 3 streets. Prefer non-river, non-diagonal links; only
  //    on the final pass relax (river crossing / shared neighbours) for a
  //    node that is otherwise stuck.
  for (let pass = 0; pass < 4; pass++) {
    const lastResort = pass === 3;
    for (const n of nodes) {
      if (deg(n.id) >= 3) continue;
      const others = nodes
        .map((m) => m.id)
        .filter((id) => id !== n.id)
        .sort((p, q) => dist2(XY(n.id), XY(p)) - dist2(XY(n.id), XY(q)))
        .slice(0, 16);
      for (const other of others) {
        if (adj.get(n.id)!.has(other)) continue;
        if (deg(other) >= (lastResort ? 6 : capOf(other))) continue;
        const wouldCrossRiver = crossesRiver(XY(n.id), XY(other));
        // never give a node a 2nd river crossing
        if (wouldCrossRiver && (!lastResort || bridged.has(n.id) || bridged.has(other)))
          continue;
        if (!lastResort && sharedNbrs(n.id, other) >= 2) continue;
        if (crosses(XY(n.id), XY(other))) continue;
        if (
          wouldCrossRiver &&
          bridgeEdges.some((e) => segCross(XY(n.id), XY(other), XY(e.a), XY(e.b)))
        )
          continue;
        link(n.id, other);
        if (wouldCrossRiver) {
          bridgeEdges.push({ a: n.id, b: other });
          bridged.add(n.id);
          bridged.add(other);
        }
        if (deg(n.id) >= 3) break;
      }
    }
  }

  // 3a) hard floor — nobody below 3. Tiers: (0) non-river only, (1) one
  //     clean river crossing, (2) accept a 2nd river crossing for a node
  //     that is *still* stuck (degree wins over "one bridge per node").
  for (let tier = 0; tier < 3; tier++) {
    for (const n of nodes) {
      if (deg(n.id) >= 3) continue;
      const others = nodes
        .map((m) => m.id)
        .filter((id) => id !== n.id && !adj.get(n.id)!.has(id))
        .sort((p, q) => dist2(XY(n.id), XY(p)) - dist2(XY(n.id), XY(q)));
      for (const other of others) {
        if (deg(other) >= 7) continue;
        const rc = crossesRiver(XY(n.id), XY(other));
        if (rc && tier === 0) continue;
        if (rc && tier === 1 && (bridged.has(n.id) || bridged.has(other))) continue;
        if (crosses(XY(n.id), XY(other))) continue;
        if (bridgeEdges.some((e) => segCross(XY(n.id), XY(other), XY(e.a), XY(e.b)))) continue;
        link(n.id, other);
        if (rc) {
          bridgeEdges.push({ a: n.id, b: other });
          bridged.add(n.id);
          bridged.add(other);
        }
        if (deg(n.id) >= 3) break;
      }
    }
  }

  // 3b) drop any leftover diagonals — an edge whose endpoints still share
  //     2+ neighbours, when both endpoints stay at >= 3 without it.
  for (const e of [...autoEdges]) {
    if (sharedNbrs(e.a, e.b) < 2) continue;
    if (deg(e.a) <= 3 || deg(e.b) <= 3) continue;
    if (bridgeEdges.some((b) => key(b.a, b.b) === key(e.a, e.b))) continue;
    adj.get(e.a)!.delete(e.b);
    adj.get(e.b)!.delete(e.a);
    autoEdges.splice(autoEdges.indexOf(e), 1);
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

  const hopCount = (a: number, b: number) => roadPath(a, b).length - 1;

  const uf = (ids: number[]) => {
    const par = new Map(ids.map((i) => [i, i]));
    const f = (x: number): number => {
      while (par.get(x)! !== x) x = par.get(x)!;
      return x;
    };
    return { f, u: (a: number, b: number) => par.set(f(a), f(b)), par };
  };

  /* ----- Metro: exactly 15 stations, evenly spread, 3–8 street-hops apart.
     A metro MOVE jumps station→station; the line is drawn along the roads. ----- */
  const metroStations = pickSpread(nodes.filter((n) => deg(n.id) >= 3), 15, 77);
  const metroEdges: BoardEdge[] = [];
  const metroPairs = new Set<string>();
  const mUF = uf(metroStations);
  const addMetro = (a: number, b: number) => {
    if (a === b || metroPairs.has(key(a, b))) return;
    metroPairs.add(key(a, b));
    metroEdges.push({ a, b, mode: "metro", path: roadPath(a, b) });
    mUF.u(a, b);
  };
  for (const s of metroStations) {
    const others = metroStations
      .filter((o) => o !== s)
      .sort((p, q) => dist2(XY(s), XY(p)) - dist2(XY(s), XY(q)));
    let added = 0;
    for (const o of others) {
      if (added >= 2) break;
      if (metroPairs.has(key(s, o))) continue;
      const h = hopCount(s, o);
      if (h < 3) continue;
      if (h > 8 && added >= 1) continue;
      addMetro(s, o);
      added++;
    }
  }
  while (new Set(metroStations.map(mUF.f)).size > 1) {
    let bp: [number, number] | null = null;
    let bh = Infinity;
    for (const a of metroStations)
      for (const b of metroStations) {
        if (mUF.f(a) === mUF.f(b) || metroPairs.has(key(a, b))) continue;
        const h = hopCount(a, b);
        if (h >= 3 && h < bh) {
          bh = h;
          bp = [a, b];
        }
      }
    if (!bp) break;
    addMetro(bp[0], bp[1]);
  }

  /* ----- Bus: ~55 stops spread evenly over the WHOLE map (every region
     gets some; metro stations are always stops). A bus edge jumps
     stop→stop across ~2 plain taxi nodes (hop count 3), riding the roads
     in between. Denser than the metro. ----- */
  // Bus stops: seed with the metro stations, then repeatedly add the node
  // farthest from every current stop that is still >= 3 street-hops from
  // all of them (so every region gets covered AND there are always >= 2
  // plain taxi nodes between two bus stops).
  const busStops = [...metroStations];
  {
    const pool = nodes.filter((n) => deg(n.id) >= 3 && !busStops.includes(n.id));
    for (let guard = 0; guard < 60; guard++) {
      let best = -1;
      let bestD = -1;
      for (const n of pool) {
        if (busStops.includes(n.id)) continue;
        if (busStops.some((s) => hopCount(s, n.id) < 3)) continue;
        let nd = Infinity;
        for (const s of busStops) {
          const d = dist2(n, XY(s));
          if (d < nd) nd = d;
        }
        if (nd > bestD) {
          bestD = nd;
          best = n.id;
        }
      }
      if (best < 0) break;
      busStops.push(best);
    }
  }
  const busEdges: BoardEdge[] = [];
  const busPairs = new Set<string>();
  const bUF = uf(busStops);
  const addBus = (a: number, b: number) => {
    if (a === b || busPairs.has(key(a, b))) return;
    busPairs.add(key(a, b));
    busEdges.push({ a, b, mode: "bus", path: roadPath(a, b) });
    bUF.u(a, b);
  };
  for (const s of busStops) {
    const others = busStops
      .filter((o) => o !== s)
      .sort((p, q) => dist2(XY(s), XY(p)) - dist2(XY(s), XY(q)));
    let added = 0;
    for (const o of others) {
      if (added >= 3) break;
      if (busPairs.has(key(s, o))) continue;
      const h = hopCount(s, o);
      if (h < 3 || h > 4) continue; // >= 2 taxi nodes between two bus stops
      addBus(s, o);
      added++;
    }
  }
  while (new Set(busStops.map(bUF.f)).size > 1) {
    let bp: [number, number] | null = null;
    let bh = Infinity;
    for (const a of busStops)
      for (const b of busStops) {
        if (bUF.f(a) === bUF.f(b) || busPairs.has(key(a, b))) continue;
        const h = hopCount(a, b);
        if (h >= 3 && h <= 7 && h < bh) {
          bh = h;
          bp = [a, b];
        }
      }
    if (!bp) break;
    addBus(bp[0], bp[1]);
  }

  /* ----- River / Wildcard "ferry" routes: 2 long spans (bridges already
     carry the ordinary roads across). ----- */
  const riverEdges: BoardEdge[] = [];
  for (const river of [RIVER_A, RIVER_B]) {
    const near = (n: BoardNode) => distToPolyline(n, river) < 150;
    const sideOf = (n: BoardNode) => {
      let ny = 0;
      let bd = Infinity;
      for (const q of river) {
        const d = dist2(n, q);
        if (d < bd) {
          bd = d;
          ny = q.y;
        }
      }
      return Math.sign(n.y - ny) || 1;
    };
    const north = nodes.filter((n) => near(n) && sideOf(n) < 0);
    const south = nodes.filter((n) => near(n) && sideOf(n) > 0);
    const pairs: { a: number; b: number; d: number }[] = [];
    for (const nn of north)
      for (const sn of south) {
        const d = dist(nn, sn);
        if (d > 140 && d < 360) pairs.push({ a: nn.id, b: sn.id, d });
      }
    pairs.sort((x, y) => y.d - x.d); // longest first
    for (const p of pairs) {
      if (adj.get(p.a)!.has(p.b)) continue;
      if (crosses(XY(p.a), XY(p.b))) continue;
      if (riverEdges.some((e) => segCross(XY(p.a), XY(p.b), XY(e.a), XY(e.b)))) continue;
      riverEdges.push({ a: p.a, b: p.b, mode: "river" });
      break;
    }
  }

  const edges = [...autoEdges, ...busEdges, ...metroEdges, ...riverEdges];

  // node kind — green cap on the ~34 bus stops; red cap on the 15 metro stations
  for (const s of busStops) if (nodes[s - 1].kind === "auto") nodes[s - 1].kind = "autobus";
  for (const s of metroStations) nodes[s - 1].kind = "autobusmetro";

  // start nodes — 20, well-connected, spread
  const startPool = nodes.filter((n) => deg(n.id) >= 3);
  const startNodes = pickSpread(startPool, 20, 555);
  for (const id of startNodes) nodes[id - 1].isStart = true;

  const toPath = (poly: P[]) =>
    poly.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(" ");

  /* ----- decorative building footprints in the block interiors ----- */
  const roadSegList = autoEdges.map((e) => [XY(e.a), XY(e.b)] as [P, P]);
  const distToSeg = (p: P, a: P, b: P) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const rectPath = (cx: number, cy: number, w: number, h: number, ang: number) => {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const cs = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
    return `M ${cs.map((p, i) => `${i ? "L" : ""}${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join(" ")} Z`;
  };
  const brand = rngFactory(31337);
  const buildings: string[] = [];
  for (let gy = 40; gy < H - 30; gy += 44) {
    for (let gx = 40; gx < W - 30; gx += 44) {
      const p = { x: gx + (brand() - 0.5) * 30, y: gy + (brand() - 0.5) * 30 };
      if (p.x > coastX(p.y) - 24) continue;
      if (distToPolyline(p, RIVER_A) < 42 || distToPolyline(p, RIVER_B) < 40) continue;
      let skip = false;
      for (const k of PARKS)
        if (((p.x - k.cx) / (k.rx - 8)) ** 2 + ((p.y - k.cy) / (k.ry - 8)) ** 2 < 1) skip = true;
      if (skip) continue;
      // nearest road: distance + heading
      let rd = Infinity;
      let rang = 0;
      for (const [a, b] of roadSegList) {
        const d = distToSeg(p, a, b);
        if (d < rd) {
          rd = d;
          rang = Math.atan2(b.y - a.y, b.x - a.x);
        }
      }
      if (rd < 19 || rd > 60) continue; // block interior only
      let nearNode = false;
      for (const n of nodes) if (dist2(p, n) < 26 * 26) nearNode = true;
      if (nearNode) continue;

      const ang = rang + (brand() - 0.5) * 0.3;
      const w = 20 + brand() * 42;
      const h = 18 + brand() * 32;
      buildings.push(rectPath(p.x, p.y, w, h, ang));
      if (brand() > 0.5) {
        // an L / T wing
        const w2 = 12 + brand() * 22;
        const h2 = 12 + brand() * 22;
        const dir = brand() > 0.5 ? 1 : -1;
        buildings.push(
          rectPath(
            p.x + Math.cos(ang) * (w / 2) * dir + Math.cos(ang + Math.PI / 2) * (h / 4),
            p.y + Math.sin(ang) * (w / 2) * dir + Math.sin(ang + Math.PI / 2) * (h / 4),
            w2,
            h2,
            ang,
          ),
        );
      }
    }
  }

  return {
    nodes,
    edges,
    width: W,
    height: H,
    startNodes,
    buildings,
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

/** Undirected road segments — the grey street network (every road carries Auto). */
let _roads: { a: number; b: number }[] | null = null;
export function roadSegments() {
  if (!_roads) {
    _roads = BOARD.edges
      .filter((e) => e.mode === "auto")
      .map((e) => ({ a: e.a, b: e.b }));
  }
  return _roads;
}
