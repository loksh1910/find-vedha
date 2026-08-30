import { cn } from "@/lib/cn";

/** Wordmark with a route-node glyph — an amber station on a hairline. */
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
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <path d="M2 14h6l3-8h7" stroke="var(--line-strong)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="14" r="2.4" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="1.5" />
        <circle cx="11" cy="6" r="3" fill="var(--signal)" />
      </svg>
      {showText && (
        <span className="font-display text-[0.95rem] font-extrabold tracking-tight text-text">
          Find&nbsp;Vedha
        </span>
      )}
    </span>
  );
}
