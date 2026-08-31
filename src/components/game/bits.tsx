import { Car, Bus, TrainFront, Sparkles, HelpCircle } from "lucide-react";
import type { MoveTransport } from "@/lib/game/types";
import { cn } from "@/lib/cn";

export function TransportIcon({
  t,
  size = 14,
  hideWildcardType = false,
}: {
  t: MoveTransport;
  size?: number;
  hideWildcardType?: boolean;
}) {
  if (t === "wildcard")
    return hideWildcardType ? (
      <HelpCircle size={size} style={{ color: "var(--text-muted)" }} />
    ) : (
      <Sparkles size={size} style={{ color: "var(--signal)" }} />
    );
  if (t === "auto") return <Car size={size} style={{ color: "var(--t-auto)" }} />;
  if (t === "bus") return <Bus size={size} style={{ color: "var(--t-bus)" }} />;
  return <TrainFront size={size} style={{ color: "var(--t-metro)" }} />;
}

export function TransportLabel(t: MoveTransport): string {
  return t === "wildcard"
    ? "Wildcard"
    : t.charAt(0).toUpperCase() + t.slice(1);
}

export function TicketChip({
  t,
  n,
  active,
  hideWildcardType,
}: {
  t: MoveTransport | "double";
  n: number;
  active?: boolean;
  hideWildcardType?: boolean;
}) {
  const isDouble = t === "double";
  const label = isDouble ? "Double" : TransportLabel(t as MoveTransport);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-xs",
        n === 0
          ? "border-line text-faint opacity-50"
          : active
            ? "border-game-accent text-text"
            : "border-line text-muted",
      )}
    >
      {isDouble ? (
        <span className="font-bold text-signal">2×</span>
      ) : (
        <TransportIcon t={t as MoveTransport} hideWildcardType={hideWildcardType} />
      )}
      <span className="text-text/80">{label}</span>
      <span className="tabular-nums text-faint">{n}</span>
    </span>
  );
}
