import type { BoardNode } from "@/lib/board/board-data";

/*
  The station marker — kept small so the line network stays the picture. A
  quiet disc holds the number; a thin ringed outline says which transports
  call here:
    auto          → full ochre ring
    autobus       → half sage (bus) + half ochre (auto)
    autobusmetro  → three arcs: sage (bus) / ochre (auto) / brick (metro)
  Bright colour on the board is otherwise reserved for signal — legal move,
  selected, reveal.
*/

const R = 16; // disc radius — deliberately small
const RING_R = R + 1.5; // the type outline sits just outside the disc
const C = 2 * Math.PI * RING_R;
const GAP = 6; // blank board-units between adjacent arcs

export function NodeMarker({
  node,
  state = "idle",
  dim = false,
  onClick,
}: {
  node: BoardNode;
  state?: "idle" | "legal" | "selected";
  dim?: boolean;
  onClick?: () => void;
}) {
  const segs: string[] =
    node.kind === "autobusmetro"
      ? ["var(--t-bus)", "var(--t-auto)", "var(--t-metro)"]
      : node.kind === "autobus"
        ? ["var(--t-bus)", "var(--t-auto)"]
        : ["var(--t-auto)"];

  const live = state === "legal" || state === "selected";
  const seg = C / segs.length;

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      onClick={onClick}
      style={{
        cursor: state === "legal" ? "pointer" : "default",
        opacity: dim && state === "idle" ? 0.42 : 1,
        transition: "opacity 140ms",
      }}
    >
      {/* the disc — drawn over the lines, so route ends are clipped cleanly */}
      <circle r={R} fill="#161922" stroke="rgba(231,237,244,0.07)" strokeWidth={1} />

      {/* transport outline — 1 / 2 / 3 muted arcs around the disc */}
      {segs.length === 1 ? (
        <circle r={RING_R} fill="none" stroke={segs[0]} strokeWidth={2.75} />
      ) : (
        segs.map((stroke, i) => (
          <circle
            key={i}
            r={RING_R}
            fill="none"
            stroke={stroke}
            strokeWidth={2.75}
            strokeLinecap="butt"
            strokeDasharray={`${seg - GAP} ${C - seg + GAP}`}
            strokeDashoffset={-i * seg}
            transform="rotate(-90)"
          />
        ))
      )}

      {/* live-state ring — the only bright thing on an idle board */}
      {live && (
        <circle
          r={RING_R + 4}
          fill="none"
          stroke="var(--game-accent)"
          strokeWidth={state === "selected" ? 3.5 : 2}
          opacity={state === "selected" ? 1 : 0.9}
        />
      )}

      {/* number — straight on the disc */}
      <text
        x={0}
        y={0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={node.id >= 100 ? 9 : 12}
        fontWeight={600}
        fontFamily="var(--font-mono)"
        fill="var(--text)"
      >
        {node.id}
      </text>
    </g>
  );
}
