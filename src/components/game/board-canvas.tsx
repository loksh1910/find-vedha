"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { BOARD, nodeById, type BoardEdge } from "@/lib/board/board-data";
import { useGame } from "./game-provider";
import { NodeMarker } from "./node-marker";
import { cn } from "@/lib/cn";

const EDGE_STYLE: Record<
  BoardEdge["mode"],
  { stroke: string; width: number; dash?: string; opacity: number }
> = {
  auto: { stroke: "var(--t-auto)", width: 2.5, opacity: 0.5 },
  bus: { stroke: "var(--t-bus)", width: 5, opacity: 0.85 },
  metro: { stroke: "var(--t-metro)", width: 4, dash: "2 7", opacity: 0.95 },
  river: { stroke: "var(--t-river)", width: 3.5, dash: "11 8", opacity: 0.9 },
};

export function BoardCanvas() {
  const { game, viewAs, vedhaVisible, lastKnown, legalDest, pending, pickNode, myTurn } =
    useGame();
  const svgRef = useRef<SVGSVGElement>(null);
  const [k, setK] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

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
      const next = Math.min(3.6, Math.max(0.6, k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      setK(next);
      setTx(p.x - cx * next);
      setTy(p.y - cy * next);
    },
    [k, tx, ty, toViewBox],
  );

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    setGrabbing(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const svg = svgRef.current!;
    const s = BOARD.width / svg.getBoundingClientRect().width;
    setTx((v) => v + (e.clientX - drag.current!.x) * s);
    setTy((v) => v + (e.clientY - drag.current!.y) * s);
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

  // edge from the active pawn to the pending node, to highlight the chosen route
  const pendingEdge = useMemo(() => {
    if (!pending) return null;
    const from = game.pawns[game.turn]?.node;
    if (from == null) return null;
    const a = nodeById(from);
    const b = nodeById(pending.to);
    return { a, b };
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
        <rect x={-2000} y={-2000} width={6000} height={6000} fill="var(--game-canvas)" />
        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          {/* river band */}
          <path
            d={BOARD.riverPath}
            fill="none"
            stroke="var(--game-water)"
            strokeWidth={46}
            strokeLinecap="round"
            opacity={0.9}
          />

          {/* edges, painted auto → bus → river → metro */}
          {(["auto", "bus", "river", "metro"] as const).map((mode) => (
            <g key={mode}>
              {BOARD.edges
                .filter((e) => e.mode === mode)
                .map((e, i) => {
                  const a = nodeById(e.a);
                  const b = nodeById(e.b);
                  const st = EDGE_STYLE[mode];
                  return (
                    <line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={st.stroke}
                      strokeWidth={st.width}
                      strokeDasharray={st.dash}
                      strokeLinecap="round"
                      opacity={st.opacity}
                    />
                  );
                })}
            </g>
          ))}

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

          {/* last-known Vedha marker (Detective view) */}
          {viewAs === "detective" && lastKnown != null && !vedhaVisible && (
            <g transform={`translate(${nodeById(lastKnown).x} ${nodeById(lastKnown).y})`}>
              <circle
                r={26}
                fill="none"
                stroke="var(--reveal)"
                strokeWidth={2}
                strokeDasharray="4 5"
                opacity={0.8}
              />
              <text
                y={-34}
                textAnchor="middle"
                fontSize={11}
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
                onClick={isLegal ? () => pickNode(n.id) : undefined}
              />
            );
          })}

          {/* detective pins */}
          {detOf.map((p) => {
            const n = nodeById(p.node);
            return (
              <g key={p.id} transform={`translate(${n.x} ${n.y})`}>
                <line x1={0} y1={-2} x2={0} y2={-30} stroke={`var(${p.varName})`} strokeWidth={2.5} />
                <circle
                  cx={0}
                  cy={-38}
                  r={12}
                  fill={`var(${p.varName})`}
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={p.stuck ? 0.4 : 1}
                />
                <text
                  x={0}
                  y={-38}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
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
              <line x1={0} y1={-2} x2={0} y2={-32} stroke="var(--signal)" strokeWidth={2.5} />
              <circle
                cx={0}
                cy={-42}
                r={13}
                fill="var(--signal)"
                stroke="var(--reveal)"
                strokeWidth={3}
              />
              <text
                x={0}
                y={-42}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
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

      {/* zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-md border border-line bg-surface/90 p-1 backdrop-blur">
        <button
          aria-label="Zoom in"
          onClick={() => setK((v) => Math.min(3.6, v * 1.2))}
          className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-surface-2 hover:text-text"
        >
          <Plus size={15} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setK((v) => Math.max(0.6, v / 1.2))}
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

      {/* legend */}
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
