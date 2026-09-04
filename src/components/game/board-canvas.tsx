"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { BOARD, nodeById, type BoardEdge } from "@/lib/board/board-data";
import { useGame } from "./game-provider";
import { NodeMarker } from "./node-marker";
import { cn } from "@/lib/cn";

const K_MIN = 0.25;
const K_MAX = 8;

function edgePoints(e: BoardEdge): [number, number][] {
  const ids = e.path && e.path.length > 1 ? e.path : [e.a, e.b];
  return ids.map((id) => {
    const n = nodeById(id);
    return [n.x, n.y];
  });
}
function toPoly(pts: [number, number][]) {
  return pts.map((p) => p.join(",")).join(" ");
}

export function BoardCanvas() {
  const { game, viewAs, vedhaVisible, lastKnown, legalDest, pending, pickNode, myTurn } =
    useGame();
  const svgRef = useRef<SVGSVGElement>(null);
  const [k, setK] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

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
    (e.target as Element).setPointerCapture?.(e.pointerId);
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
  const autoEdges = useMemo(() => BOARD.edges.filter((e) => e.mode === "auto"), []);
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
    <div className="relative h-full w-full overflow-hidden bg-game-canvas">
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
          <radialGradient id="fv-ground" cx="42%" cy="34%" r="90%">
            <stop offset="0%" stopColor="#141b26" />
            <stop offset="55%" stopColor="#0f1520" />
            <stop offset="100%" stopColor="#090c12" />
          </radialGradient>
        </defs>

        <rect x={-3000} y={-3000} width={9000} height={9000} fill="#090c12" />

        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          <rect x={0} y={0} width={BOARD.width} height={BOARD.height} fill="url(#fv-ground)" />

          {/* water — bay + rivers */}
          <path d={BOARD.coastPath} fill="var(--game-water)" />
          <path
            d={BOARD.coastPath}
            fill="none"
            stroke="#3f7fb0"
            strokeWidth={2}
            opacity={0.5}
          />
          {BOARD.riverPaths.map((d, i) => (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke="var(--game-water)"
                strokeWidth={40}
                strokeLinecap="round"
              />
              <path
                d={d}
                fill="none"
                stroke="#2f6c9a"
                strokeWidth={40}
                strokeLinecap="round"
                opacity={0.35}
              />
            </g>
          ))}

          {/* parks */}
          {BOARD.parks.map((d, i) => (
            <path key={i} d={d} fill="#16241c" stroke="#20362a" strokeWidth={2} />
          ))}

          {/* faint street underlay for a city texture */}
          <g stroke="#3a4658" strokeWidth={5} strokeLinecap="round" opacity={0.22}>
            {autoEdges.map((e, i) => {
              const [a, b] = [nodeById(e.a), nodeById(e.b)];
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
          </g>

          {/* glow bloom under the lit routes */}
          <g strokeLinecap="round" opacity={0.28}>
            {autoEdges.map((e, i) => {
              const [a, b] = [nodeById(e.a), nodeById(e.b)];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--t-auto)"
                  strokeWidth={9}
                />
              );
            })}
            {busEdges.map((e, i) => (
              <polyline
                key={i}
                points={toPoly(edgePoints(e))}
                fill="none"
                stroke="var(--t-bus)"
                strokeWidth={13}
              />
            ))}
            {metroEdges.map((e, i) => {
              const [a, b] = [nodeById(e.a), nodeById(e.b)];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--t-metro)"
                  strokeWidth={11}
                />
              );
            })}
          </g>

          {/* crisp lit routes */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {autoEdges.map((e, i) => {
              const [a, b] = [nodeById(e.a), nodeById(e.b)];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--t-auto)"
                  strokeWidth={2.4}
                  opacity={0.9}
                />
              );
            })}
            {busEdges.map((e, i) => (
              <polyline
                key={i}
                points={toPoly(edgePoints(e))}
                fill="none"
                stroke="var(--t-bus)"
                strokeWidth={4.5}
              />
            ))}
            {metroEdges.map((e, i) => {
              const [a, b] = [nodeById(e.a), nodeById(e.b)];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--t-metro)"
                  strokeWidth={3.6}
                  strokeDasharray="2 8"
                />
              );
            })}
            {riverEdges.map((e, i) => {
              const [a, b] = [nodeById(e.a), nodeById(e.b)];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--t-river)"
                  strokeWidth={3.4}
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
              <circle
                r={30}
                fill="none"
                stroke="var(--reveal)"
                strokeWidth={2}
                strokeDasharray="4 5"
                opacity={0.8}
              />
              <text
                y={-40}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-mono)"
                fill="var(--reveal)"
              >
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
              <circle
                cx={0}
                cy={-46}
                r={14}
                fill="var(--signal)"
                stroke="var(--reveal)"
                strokeWidth={3}
              />
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

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-line bg-surface/90 px-3 py-2 text-[0.6875rem] text-muted backdrop-blur">
        <Legend swatch="var(--t-auto)" label="Auto" />
        <Legend swatch="var(--t-bus)" label="Bus" />
        <Legend swatch="var(--t-metro)" label="Metro" dashed />
        <Legend swatch="var(--t-river)" label="River · Wildcard" dashed />
      </div>
    </div>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn("inline-block h-0.5 w-4", dashed && "opacity-90")}
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
