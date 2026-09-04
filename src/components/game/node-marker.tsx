import type { BoardNode } from "@/lib/board/board-data";

/*
  The station marker — a vertical capsule: a rounded rectangle holding the
  number, capped by a semicircle above (Bus) and below (Metro).
  The body is always yellow (Auto is available everywhere).
    auto          → all yellow
    autobus       → top semicircle green
    autobusmetro  → top semicircle green + bottom semicircle red
*/

const W = 34;
const BODY_H = 17;
const R = W / 2;

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
  const top = node.kind === "auto" ? "var(--t-auto)" : "var(--t-bus)";
  const bottom =
    node.kind === "autobusmetro" ? "var(--t-metro)" : "var(--t-auto)";

  const topSemi = `M ${-R} ${-BODY_H / 2} A ${R} ${R} 0 0 1 ${R} ${-BODY_H / 2} Z`;
  const botSemi = `M ${-R} ${BODY_H / 2} A ${R} ${R} 0 0 0 ${R} ${BODY_H / 2} Z`;

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      onClick={onClick}
      style={{
        cursor: state === "legal" ? "pointer" : "default",
        opacity: dim && state === "idle" ? 0.5 : 1,
        transition: "opacity 140ms",
      }}
    >
      {/* separation halo from the route lines */}
      <rect
        x={-R - 3}
        y={-BODY_H / 2 - R - 3}
        width={W + 6}
        height={BODY_H + 2 * R + 6}
        rx={R + 3}
        fill="var(--game-canvas)"
        opacity={0.9}
      />

      {(state === "legal" || state === "selected") && (
        <rect
          x={-R - 4}
          y={-BODY_H / 2 - R - 4}
          width={W + 8}
          height={BODY_H + 2 * R + 8}
          rx={R + 4}
          fill="none"
          stroke="var(--game-accent)"
          strokeWidth={state === "selected" ? 3.5 : 2}
          opacity={state === "selected" ? 1 : 0.9}
        />
      )}

      <path d={topSemi} fill={top} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
      <path d={botSemi} fill={bottom} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
      <rect
        x={-R}
        y={-BODY_H / 2}
        width={W}
        height={BODY_H}
        rx={2.5}
        fill="var(--t-auto)"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={1}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={node.id >= 100 ? 8.5 : 11}
        fontWeight={700}
        fontFamily="var(--font-mono)"
        fill="var(--node-ink)"
      >
        {node.id}
      </text>
    </g>
  );
}
