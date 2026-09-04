"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { BOARD, nodeById, roadSegments } from "@/lib/board/board-data";
import { useGame } from "./game-provider";
import { NodeMarker } from "./node-marker";
import { MovePopover, type Anchor } from "./move-popover";

const K_MIN = 0.25;
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

export function BoardCanvas() {
  const { game, viewAs, vedhaVisible, lastKnown, legalDest, pending, pickNode, myTurn } =
    useGame();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

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

  const onWheel = useCallback(
    (e: WheelEvent<SVGSVGElement>) => {
      const p = toViewBox(e.clientX, e.clientY);
      const cx = (p.x - tx) / k;
      const cy = (p.y - ty) / k;
      const next = Math.min(K_MAX, Math.max(K_MIN, k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      setK(next);
      setTx(p.x - cx * next);
      setTy(p.y - cy * next);
    },
    [k, tx, ty, toViewBox],
  );

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setGrabbing(true);
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const svg = svgRef.current!;
    const s = BOARD.width / svg.getBoundingClientRect().width;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    setTx((v) => v + dx * s);
    setTy((v) => v + dy * s);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const endDrag = () => {
    drag.current = null;
    setGrabbing(false);
  };
  const fit = () => {
    setK(1);
    setTx(0);
    setTy(0);
  };

  const detOf = useMemo(
    () => Object.values(game.pawns).filter((p) => p.role === "detective"),
    [game.pawns],
  );
  const roads = useMemo(() => roadSegments(), []);
  const busEdges = useMemo(() => BOARD.edges.filter((e) => e.mode === "bus"), []);
  const metroEdges = useMemo(() => BOARD.edges.filter((e) => e.mode === "metro"), []);
  const riverEdges = useMemo(() => BOARD.edges.filter((e) => e.mode === "river"), []);

  const pendingEdge = useMemo(() => {
    if (!pending) return null;
    const from = game.pawns[game.turn]?.node;
    if (from == null) return null;
    return { a: nodeById(from), b: nodeById(pending.to) };
  }, [pending, game]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-game-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{ cursor: grabbing ? "grabbing" : "grab" }}
      >
        <defs>
          <radialGradient id="fv-ground" cx="42%" cy="34%" r="95%">
            <stop offset="0%" stopColor="#131a24" />
            <stop offset="60%" stopColor="#0e141d" />
            <stop offset="100%" stopColor="#080b10" />
          </radialGradient>
        </defs>

        <rect x={-3000} y={-3000} width={9000} height={9000} fill="#080b10" />

        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          <rect x={0} y={0} width={BOARD.width} height={BOARD.height} fill="url(#fv-ground)" />

          {/* water */}
          <path d={BOARD.coastPath} fill="var(--game-water)" />
          <path d={BOARD.coastPath} fill="none" stroke="#3f7fb0" strokeWidth={2} opacity={0.45} />
          {BOARD.riverPaths.map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--game-water)" strokeWidth={40} strokeLinecap="round" />
              <path d={d} fill="none" stroke="#2f6c9a" strokeWidth={40} strokeLinecap="round" opacity={0.3} />
            </g>
          ))}

          {/* parks */}
          {BOARD.parks.map((d, i) => (
            <path key={i} d={d} fill="#15231b" stroke="#1f3529" strokeWidth={2} />
          ))}

          {/* decorative building footprints (block interiors, behind the roads) */}
          <path
            d={BOARD.buildings.join(" ")}
            fill="#1a2029"
            stroke="#252d39"
            strokeWidth={1.25}
            fillRule="evenodd"
          />

          {/* ---- grey road network (one substrate; every route rides these) ---- */}
          <g strokeLinecap="round">
            {roads.map((r, i) => {
              const a = nodeById(r.a);
              const b = nodeById(r.b);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3b434f" strokeWidth={16} />;
            })}
          </g>
          <g strokeLinecap="round">
            {roads.map((r, i) => {
              const a = nodeById(r.a);
              const b = nodeById(r.b);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4d5766" strokeWidth={11} />;
            })}
          </g>

          {/* ---- route stripes, all on the same roads ---- */}
          {/* faint glow */}
          <g strokeLinecap="round" opacity={0.22}>
            {roads.map((r, i) => {
              const a = nodeById(r.a);
              const b = nodeById(r.b);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--t-auto)" strokeWidth={7} />;
            })}
          </g>
          {/* auto — every road, centred */}
          <g strokeLinecap="round">
            {roads.map((r, i) => {
              const a = nodeById(r.a);
              const b = nodeById(r.b);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--t-auto)"
                  strokeWidth={2.6}
                  opacity={0.92}
                />
              );
            })}
          </g>
          {/* bus — rides the roads between stops, offset +4 */}
          <g strokeLinecap="round">
            {busEdges.map((e, ei) => {
              const p = e.path ?? [e.a, e.b];
              return p.slice(1).map((_, si) => {
                const a = nodeById(p[si]);
                const b = nodeById(p[si + 1]);
                const s = off(a.x, a.y, b.x, b.y, 4);
                return <line key={`${ei}-${si}`} {...s} stroke="var(--t-bus)" strokeWidth={2.8} />;
              });
            })}
          </g>
          {/* metro — rides the roads between stations, offset -4, dashed */}
          <g strokeLinecap="round">
            {metroEdges.map((e, ei) => {
              const p = e.path ?? [e.a, e.b];
              return p.slice(1).map((_, si) => {
                const a = nodeById(p[si]);
                const b = nodeById(p[si + 1]);
                const s = off(a.x, a.y, b.x, b.y, -4);
                return (
                  <line
                    key={`${ei}-${si}`}
                    {...s}
                    stroke="var(--t-metro)"
                    strokeWidth={2.8}
                    strokeDasharray="2 7"
                  />
                );
              });
            })}
          </g>
          {/* river / wildcard */}
          <g strokeLinecap="round">
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
                  strokeWidth={3.2}
                  strokeDasharray="12 9"
                />
              );
            })}
          </g>

          {pendingEdge && (
            <line
              x1={pendingEdge.a.x}
              y1={pendingEdge.a.y}
              x2={pendingEdge.b.x}
              y2={pendingEdge.b.y}
              stroke="var(--game-accent)"
              strokeWidth={6}
              strokeLinecap="round"
            />
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
              <g key={p.id} transform={`translate(${n.x} ${n.y})`}>
                <line x1={0} y1={-2} x2={0} y2={-34} stroke={`var(${p.varName})`} strokeWidth={3} />
                <circle
                  cx={0}
                  cy={-44}
                  r={13}
                  fill={`var(${p.varName})`}
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={p.stuck ? 0.4 : 1}
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
            <g transform={`translate(${nodeById(game.pawns.vedha.node).x} ${nodeById(game.pawns.vedha.node).y})`}>
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
          onClick={() => setK((v) => Math.min(K_MAX, v * 1.25))}
          className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-surface-2 hover:text-text"
        >
          <Plus size={15} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setK((v) => Math.max(K_MIN, v / 1.25))}
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
