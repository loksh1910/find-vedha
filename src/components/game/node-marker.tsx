import type { BoardNode } from "@/lib/board/board-data";

/*
  The station marker — a plain circle, coloured in bands by mode, with the
  number set in a dark box on top for contrast (Auto is available everywhere).
    auto          → full yellow circle
    autobus       → top half green (bus), bottom half yellow (auto)
    autobusmetro  → three bands: green (bus) / yellow (auto) / red (metro)
*/

const R = 26;
const BOX_W = 32;
const BOX_H = 17;

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
  const bands: { y0: number; y1: number; fill: string }[] =
    node.kind === "autobusmetro"
      ? [
          { y0: -R, y1: -R / 3, fill: "var(--t-bus)" },
          { y0: -R / 3, y1: R / 3, fill: "var(--t-auto)" },
          { y0: R / 3, y1: R, fill: "var(--t-metro)" },
        ]
      : node.kind === "autobus"
        ? [
            { y0: -R, y1: 0, fill: "var(--t-bus)" },
            { y0: 0, y1: R, fill: "var(--t-auto)" },
          ]
        : [{ y0: -R, y1: R, fill: "var(--t-auto)" }];

  const clipId = `node-clip-${node.id}`;

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
      <circle r={R + 3} fill="var(--game-canvas)" opacity={0.9} />

      {(state === "legal" || state === "selected") && (
        <circle
          r={R + 4}
          fill="none"
          stroke="var(--game-accent)"
          strokeWidth={state === "selected" ? 3.5 : 2}
          opacity={state === "selected" ? 1 : 0.9}
        />
      )}

      <clipPath id={clipId}>
        <circle r={R} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {bands.map((b, i) => (
          <rect key={i} x={-R} y={b.y0} width={R * 2} height={b.y1 - b.y0} fill={b.fill} />
        ))}
      </g>
      <circle r={R} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={1} />

      <rect
        x={-BOX_W / 2}
        y={-BOX_H / 2}
        width={BOX_W}
        height={BOX_H}
        rx={5}
        fill="var(--bg-inset)"
      />
      <text
        x={0}
        y={0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={node.id >= 100 ? 9.5 : 13}
        fontWeight={700}
        fontFamily="var(--font-mono)"
        fill="var(--text)"
      >
        {node.id}
      </text>
    </g>
  );
}
