import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The signature component: a destination-blade.
 * A 4px colour bar on the left edge, a mono label, an optional value on the right.
 * Used for the transport legend, Tracker slot tags, section eyebrows, the invite code.
 */
export function Blade({
  colorVar,
  label,
  value,
  className,
  size = "md",
}: {
  /** CSS custom-property name, e.g. "--tr-1". Falls back to --line-strong. */
  colorVar?: string;
  label: ReactNode;
  value?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const bar = `var(${colorVar ?? "--line-strong"})`;
  return (
    <span
      style={{ "--blade-bar": bar } as CSSProperties}
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-sm bg-surface border border-line",
        className,
      )}
    >
      <span
        aria-hidden
        className="w-1 shrink-0"
        style={{ background: "var(--blade-bar)" }}
      />
      <span
        className={cn(
          "flex items-center gap-2 font-mono uppercase tracking-[0.12em] text-muted",
          size === "sm" ? "px-2 py-1 text-[0.6875rem]" : "px-2.5 py-1.5 text-xs",
        )}
      >
        <span className="text-text/90">{label}</span>
        {value != null && (
          <span className="text-faint normal-case tracking-normal">{value}</span>
        )}
      </span>
    </span>
  );
}
