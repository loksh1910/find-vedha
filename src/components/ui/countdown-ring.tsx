import { cn } from "@/lib/cn";

/**
 * A functional countdown ring. `progress` is 1 → 0 (full → empty).
 * Colour is the signal amber by default; pass a token name to override.
 */
export function CountdownRing({
  progress,
  value,
  label,
  size = 96,
  stroke = 6,
  colorVar = "--signal",
  className,
}: {
  progress: number;
  value: string | number;
  label?: string;
  size?: number;
  stroke?: number;
  colorVar?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={label ? `${label}: ${value}` : `${value}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`var(${colorVar})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-mono text-2xl font-medium tabular-nums text-text">
          {value}
        </span>
      </div>
    </div>
  );
}
