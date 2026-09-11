"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { BOARD, nodeById, roadSegments } from "@/lib/board/board-data";
import { useSettings } from "@/components/providers/settings-provider";
import { useGame } from "./game-provider";
import { NodeMarker } from "./node-marker";
import { MovePopover, type Anchor } from "./move-popover";

// k=1 (tx=ty=0) is the board's natural fit — the outer <svg> viewBox already
// scales the whole map to the container, so zooming out below 1 would just
// shrink it further inside its own frame instead of showing more of it.
const K_MIN = 1;
const K_MAX = 9;

/** perpendicular-offset a segment by `o` board units */
function off(ax: number, ay: number, bx: number, by: number, o: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * o;
  const ny = (dx / len) * o;
  return { x1: ax + nx, y1: ay + ny, x2: bx + nx, y2: by + ny };
}

/**
 * Keep the visible window inside the board's own edges — same idea as the
 * K_MIN zoom floor, just for pan. At k=1 the board already exactly fills the
 * viewport, so no pan is allowed at all; the higher k goes, the more slack
 * there is before an edge would show empty canvas.
 */
function clampPan(k: number, tx: number, ty: number) {
  const minTx = BOARD.width * (1 - k);
  const minTy = BOARD.height * (1 - k);
  return {
    tx: Math.min(0, Math.max(minTx, tx)),
    ty: Math.min(0, Math.max(minTy, ty)),
  };
}

export function BoardCanvas() {
  const { game, viewAs, vedhaVisible, lastKnown, legalDest, pending, chosenTransport, pickNode, myTurn } =
    useGame();
  const { reduceMotion } = useSettings();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  // true only for button zoom / fit, so those ease while wheel + drag stay 1:1
  const [smoothView, setSmoothView] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  // live transform — kept in sync so the once-registered native wheel listener
  // and the multi-touch handlers always read current values without re-binding
  const view = useRef({ k: 1, tx: 0, ty: 0 });
  useEffect(() => {
    view.current = { k, tx, ty };
  }, [k, tx, ty]);

  // every pointer currently on the board + the pinch gesture (two fingers)
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; k: number } | null>(null);

  // keep the move popover pinned to the tapped station as the board pans/zooms
  useLayoutEffect(() => {
    if (!pending || !svgRef.current || !wrapRef.current) {
      setAnchor(null);
      return;
    }
    const n = nodeById(pending.to);
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = n.x * k + tx;
    pt.y = n.y * k + ty;
    const scr = pt.matrixTransform(svg.getScreenCTM()!);
    const wrap = wrapRef.current.getBoundingClientRect();
    const ax = scr.x - wrap.left;
    const ay = scr.y - wrap.top;
    // flip against the visible viewport (the board pans/zooms freely, so a
    // node's board coords say nothing about where it sits on screen)
    setAnchor({
      x: ax,
      y: ay,
      flipX: ax > wrap.width - 300 && ax > 300,
      flipY: ay > wrap.height - 240,
    });
  }, [pending, k, tx, ty]);

  const toViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // zoom to `nextK`, keeping the board point under (clientX, clientY) fixed
  const zoomAt = useCallback(
    (nextK: number, clientX: number, clientY: number) => {
      const { k: curK, tx: curTx, ty: curTy } = view.current;
      const nk = Math.min(K_MAX, Math.max(K_MIN, nextK));
      const p = toViewBox(clientX, clientY);
      const bx = (p.x - curTx) / curK;
      const by = (p.y - curTy) / curK;
      const { tx: ntx, ty: nty } = clampPan(nk, p.x - bx * nk, p.y - by * nk);
      view.current = { k: nk, tx: ntx, ty: nty }; // sync so bursts compound
      setK(nk);
      setTx(ntx);
      setTy(nty);
    },
    [toViewBox],
  );

  // mouse wheel + trackpad pinch (which the browser reports as ctrl+wheel).
  // Native and non-passive so we can preventDefault and stop the whole page
  // zooming/scrolling when the cursor is over the board.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setSmoothView(false);
      // pinch sends ctrlKey + tiny deltas; a wheel sends big discrete ticks.
      // exp() keeps both smooth and exactly reversible.
      const rate = e.ctrlKey ? 0.015 : 0.0022;
      zoomAt(view.current.k * Math.exp(-e.deltaY * rate), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const twoFinger = () => {
    const pts = [...pointers.current.values()];
    return {
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      mx: (pts[0].x + pts[1].x) / 2,
      my: (pts[0].y + pts[1].y) / 2,
    };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      // capture on the actual tapped element, not the svg root — capturing
      // on an ancestor retargets the resulting click event to it, which
      // silently kills a plain tap on a node (no drag, no pinch involved)
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* already gone */
    }
    if (pointers.current.size === 2) {
      // second finger — switch from pan to pinch-zoom
      drag.current = null;
      moved.current = true;
      pinch.current = { dist: twoFinger().dist, k: view.current.k };
    } else if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY };
      moved.current = false;
      setGrabbing(true);
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (pinch.current && pointers.current.size >= 2) {
      if (smoothView) setSmoothView(false);
      const { dist, mx, my } = twoFinger();
      zoomAt(pinch.current.k * (dist / pinch.current.dist), mx, my);
      return;
    }

    if (!drag.current) return;
    if (smoothView) setSmoothView(false);
    const svg = svgRef.current!;
    const s = BOARD.width / svg.getBoundingClientRect().width;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    setTx((v) => clampPan(view.current.k, v + dx * s, 0).tx);
    setTy((v) => clampPan(view.current.k, 0, v + dy * s).ty);
    drag.current = { x: e.clientX, y: e.clientY };
  };

  const endPointer = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* fine */
    }
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      // one finger left after a pinch — carry on panning from where it is
      const [only] = [...pointers.current.values()];
      drag.current = { x: only.x, y: only.y };
    } else if (pointers.current.size === 0) {
      drag.current = null;
      setGrabbing(false);
    }
  };
  const fit = () => {
    setSmoothView(!reduceMotion);
    view.current = { k: 1, tx: 0, ty: 0 };
    setK(1);
    setTx(0);
    setTy(0);
  };
  const zoomBy = (factor: number) => {
    setSmoothView(!reduceMotion);
    const next = Math.min(K_MAX, Math.max(K_MIN, k * factor));
    const clamped = clampPan(next, tx, ty);
    view.current = { k: next, tx: clamped.tx, ty: clamped.ty };
    setK(next);
    setTx(clamped.tx);
    setTy(clamped.ty);
  };

  const detOf = useMemo(
    () => Object.values(game.pawns).filter((p) => p.role === "detective"),
    [game.pawns],
  );
  const roads = useMemo(() => roadSegments(), []);
  const busEdges = useMemo(() => BOARD.edges.filter((e) => e.mode === "bus"), []);
  const metroEdges = useMemo(() => BOARD.edges.filter((e) => e.mode === "metro"), []);
  const riverEdges = useMemo(() => BOARD.edges.filter((e) => e.mode === "river"), []);

  // Highlight the *actual* road path between the mover and the target — for a
  // bus/metro hop that's a multi-segment polyline along the streets, not a
  // straight line across the map. Follows whichever transport is being previewed.
  const pendingRoute = useMemo(() => {
    if (!pending) return null;
    const from = game.pawns[game.turn]?.node;
    if (from == null) return null;
    const to = pending.to;
    const opt =
      pending.options.find((o) => o.transport === chosenTransport) ?? pending.options[0];
    const edge = BOARD.edges.find(
      (e) =>
        e.mode === opt.via &&
        ((e.a === from && e.b === to) || (e.a === to && e.b === from)),
    );
    let ids: number[] = [from, to];
    if (edge?.path && edge.path.length >= 2) {
      ids = edge.path[0] === from ? edge.path : [...edge.path].reverse();
    }
    return ids.map((id) => {
      const n = nodeById(id);
      return `${n.x},${n.y}`;
    }).join(" ");
  }, [pending, game, chosenTransport]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-game-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerLeave={endPointer}
        onPointerCancel={endPointer}
        style={{ cursor: grabbing ? "grabbing" : "grab" }}
      >
        <defs>
          <radialGradient id="fv-ground" cx="42%" cy="34%" r="95%">
            <stop offset="0%" stopColor="#12141a" />
            <stop offset="60%" stopColor="#0d0f14" />
            <stop offset="100%" stopColor="#090a0e" />
          </radialGradient>
        </defs>

        <rect x={-3000} y={-3000} width={9000} height={9000} fill="#090a0e" />

        <g
          transform={`translate(${tx} ${ty}) scale(${k})`}
          style={{
            transition: smoothView
              ? "transform 220ms cubic-bezier(0.2,0.6,0.2,1)"
              : "none",
          }}
        >
          <rect x={0} y={0} width={BOARD.width} height={BOARD.height} fill="url(#fv-ground)" />

          {/* water — one calm desaturated blue-grey, a barely-there shoreline */}
          <path d={BOARD.coastPath} fill="var(--game-water)" />
          <path d={BOARD.coastPath} fill="none" stroke="#2b3d4b" strokeWidth={1.5} opacity={0.5} />
          {BOARD.riverPaths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--game-water)" strokeWidth={40} strokeLinecap="round" />
          ))}

          {/* parks — quiet green-grey, low contrast with the ground */}
          {BOARD.parks.map((d, i) => (
            <path key={i} d={d} fill="#151c17" stroke="#1d2620" strokeWidth={1.5} />
          ))}

          {/* block-interior texture — one flat neutral tone, kept near-invisible
               so it reads as ground grain, not detail */}
          <g opacity={0.12}>
            {BOARD.buildings.map((d, i) => (
              <path key={i} d={d} fill="#2c323c" />
            ))}
          </g>

          {/* ---- grey road network — one solid substrate every route rides ---- */}
          <g strokeLinecap="round">
            {roads.map((r, i) => {
              const a = nodeById(r.a);
              const b = nodeById(r.b);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#30353f" strokeWidth={13} />;
            })}
          </g>

          {/* ---- route stripes — muted hues, clean and readable; bright colour
               on the board is otherwise saved for the live pieces ---- */}
          {/* auto — every road, centred */}
          <g strokeLinecap="round" opacity={0.95}>
            {roads.map((r, i) => {
              const a = nodeById(r.a);
              const b = nodeById(r.b);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--t-auto)" strokeWidth={3.2} />;
            })}
          </g>
          {/* bus — rides the roads between stops, offset +5.5 */}
          <g strokeLinecap="round" opacity={0.95}>
            {busEdges.map((e, ei) => {
              const p = e.path ?? [e.a, e.b];
              return p.slice(1).map((_, si) => {
                const a = nodeById(p[si]);
                const b = nodeById(p[si + 1]);
                const s = off(a.x, a.y, b.x, b.y, 5.5);
                return <line key={`${ei}-${si}`} {...s} stroke="var(--t-bus)" strokeWidth={3} />;
              });
            })}
          </g>
          {/* metro — rides the roads between stations, offset -5.5, dashed */}
          <g strokeLinecap="round" opacity={0.95}>
            {metroEdges.map((e, ei) => {
              const p = e.path ?? [e.a, e.b];
              return p.slice(1).map((_, si) => {
                const a = nodeById(p[si]);
                const b = nodeById(p[si + 1]);
                const s = off(a.x, a.y, b.x, b.y, -5.5);
                return (
                  <line key={`${ei}-${si}`} {...s} stroke="var(--t-metro)" strokeWidth={3.2} strokeDasharray="3 6" />
                );
              });
            })}
          </g>
          {/* river / wildcard */}
          <g strokeLinecap="round" opacity={0.8}>
            {riverEdges.map((e, i) => {
              const a = nodeById(e.a);
              const b = nodeById(e.b);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--t-river)"
                  strokeWidth={3.6}
                  strokeDasharray="12 9"
                />
              );
            })}
          </g>

          {pendingRoute && (
            <g fill="none" stroke="var(--game-accent)" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={pendingRoute} strokeWidth={15} strokeOpacity={0.22} />
              <polyline points={pendingRoute} strokeWidth={6} />
            </g>
          )}

          {viewAs === "detective" && lastKnown != null && !vedhaVisible && (
            <g transform={`translate(${nodeById(lastKnown).x} ${nodeById(lastKnown).y})`}>
              <circle r={30} fill="none" stroke="var(--reveal)" strokeWidth={2} strokeDasharray="4 5" opacity={0.8} />
              <text y={-40} textAnchor="middle" fontSize={13} fontFamily="var(--font-mono)" fill="var(--reveal)">
                last seen
              </text>
            </g>
          )}

          {/* nodes */}
          {BOARD.nodes.map((n) => {
            const isPending = pending?.to === n.id;
            const isLegal = legalDest.has(n.id);
            return (
              <NodeMarker
                key={n.id}
                node={n}
                state={isPending ? "selected" : isLegal ? "legal" : "idle"}
                dim={myTurn}
                onClick={
                  isLegal
                    ? () => {
                        if (!moved.current) pickNode(n.id);
                      }
                    : undefined
                }
              />
            );
          })}

          {/* detective pins */}
          {detOf.map((p) => {
            const n = nodeById(p.node);
            return (
              <g
                key={p.id}
                transform={`translate(${n.x} ${n.y})`}
                style={{
                  transition: reduceMotion
                    ? undefined
                    : "transform 340ms cubic-bezier(0.2,0.6,0.2,1)",
                }}
              >
                {game.turn === p.id &&
                  game.status.kind === "playing" &&
                  !reduceMotion && <LocatorRings />}
                <line x1={0} y1={-2} x2={0} y2={-34} stroke={`var(${p.varName})`} strokeWidth={3} />
                <circle
                  cx={0}
                  cy={-44}
                  r={13}
                  fill={`var(${p.varName})`}
                  stroke="#dfe6ee"
                  strokeWidth={1.75}
                  opacity={p.stuck || p.abandoned ? 0.4 : 1}
                />
                <text
                  x={0}
                  y={-44}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                  fill="#0b0f14"
                >
                  {p.slot}
                </text>
              </g>
            );
          })}

          {/* Vedha pin */}
          {vedhaVisible && (
            <g
              transform={`translate(${nodeById(game.pawns.vedha.node).x} ${nodeById(game.pawns.vedha.node).y})`}
              style={{
                transition: reduceMotion
                  ? undefined
                  : "transform 340ms cubic-bezier(0.2,0.6,0.2,1)",
              }}
            >
              {game.turn === "vedha" &&
                game.status.kind === "playing" &&
                !reduceMotion && <LocatorRings />}
              <line x1={0} y1={-2} x2={0} y2={-36} stroke="var(--signal)" strokeWidth={3} />
              <circle cx={0} cy={-46} r={14} fill="var(--signal)" stroke="var(--reveal)" strokeWidth={3} />
              <text
                x={0}
                y={-46}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={800}
                fontFamily="var(--font-display)"
                fill="var(--signal-ink)"
              >
                V
              </text>
            </g>
          )}
        </g>
      </svg>

      {anchor && <MovePopover anchor={anchor} />}

      <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-md border border-line bg-surface/90 p-1 backdrop-blur">
        <button
          aria-label="Zoom in"
          onClick={() => zoomBy(1.25)}
          className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-surface-2 hover:text-text"
        >
          <Plus size={15} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / 1.25)}
          className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-surface-2 hover:text-text"
        >
          <Minus size={15} />
        </button>
        <button
          aria-label="Fit board"
          onClick={fit}
          className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-surface-2 hover:text-text"
        >
          <Crosshair size={15} />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-surface/90 px-3 py-2 text-[0.6875rem] text-muted backdrop-blur">
        <span className="text-faint">one road, layered:</span>
        <Legend swatch="var(--t-auto)" label="Auto" />
        <Legend swatch="var(--t-bus)" label="Bus" />
        <Legend swatch="var(--t-metro)" label="Metro" dashed />
        <Legend swatch="var(--t-river)" label="Wildcard" dashed />
      </div>
    </div>
  );
}

/** cyan "you are here" rings sweeping out from the pawn whose turn it is */
function LocatorRings() {
  return (
    <g aria-hidden>
      {[0, 0.63, 1.26].map((d) => (
        <circle
          key={d}
          className="fv-locate"
          cx={0}
          cy={0}
          r={12}
          fill="none"
          stroke="var(--game-accent)"
          strokeWidth={2.75}
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </g>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-4"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${swatch} 0 4px, transparent 4px 7px)`
            : swatch,
        }}
      />
      {label}
    </span>
  );
}
