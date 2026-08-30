import { cn } from "@/lib/cn";

/*
  Ambient background: an abstract transit route diagram.
  Purely decorative. Lines bend only at 45°/90° like a real transit map.
  The single amber node is the "Vedha signal". Frozen under reduced motion (globals.css).
*/

const LINES: string[] = [
  "M60 120 L260 120 L360 220 L360 460 L520 620",
  "M120 700 L120 420 L300 240 L640 240 L760 360 L1140 360",
  "M980 80 L980 300 L820 460 L820 700",
  "M40 520 L240 520 L380 660 L720 660",
  "M1160 640 L940 640 L820 520 L820 300 L700 180 L520 180",
];

const NODES: { x: number; y: number; r?: number }[] = [
  { x: 260, y: 120 },
  { x: 360, y: 220 },
  { x: 360, y: 460 },
  { x: 300, y: 240 },
  { x: 640, y: 240 },
  { x: 760, y: 360 },
  { x: 980, y: 300 },
  { x: 820, y: 460 },
  { x: 240, y: 520 },
  { x: 380, y: 660 },
  { x: 820, y: 300 },
  { x: 700, y: 180 },
  { x: 520, y: 180 },
];

const SIGNAL = { x: 520, y: 620 };

export function RouteDiagram({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        style={{ animation: "fv-drift 22s var(--ease) infinite" }}
      >
        <g stroke="var(--line)" strokeWidth="2" fill="none" opacity="0.6">
          {LINES.map((d, i) => (
            <path key={i} d={d} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
        <g fill="var(--bg)" stroke="var(--line-strong)" strokeWidth="2">
          {NODES.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r ?? 5} />
          ))}
        </g>
        <circle
          cx={SIGNAL.x}
          cy={SIGNAL.y}
          r="7"
          fill="var(--signal)"
          style={{ transformOrigin: `${SIGNAL.x}px ${SIGNAL.y}px`, animation: "fv-pulse 4s var(--ease) infinite" }}
        />
      </svg>
    </div>
  );
}
