import { cn } from "@/lib/cn";

/**
 * Wordmark with a "V" glyph — two converging chase lines meeting a pulsing
 * signal node, the same locator-ring language the board uses to mark whoever's
 * turn it is. "Vedha" in the wordmark carries the signal colour too.
 */
export function Logo({
  className,
  showText = true,
  size = 20,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <circle cx="50" cy="68" r="20" stroke="var(--signal)" strokeWidth="2" opacity="0.16" />
        <circle cx="50" cy="68" r="14" stroke="var(--signal)" strokeWidth="2.4" opacity="0.32" />
        <path
          d="M17 14 L50 68 L83 14"
          stroke="var(--text)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="68" r="7.5" fill="var(--signal)" stroke="var(--bg-inset)" strokeWidth="1.6" />
      </svg>
      {showText && (
        <span className="font-display text-[0.95rem] font-extrabold tracking-tight">
          <span className="text-text">Find&nbsp;</span>
          <span className="text-signal">Vedha</span>
        </span>
      )}
    </span>
  );
}
