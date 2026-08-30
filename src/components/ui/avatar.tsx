import { cn } from "@/lib/cn";

/* Asset-free "station tile" avatar: a monogram on a hashed muted fill. */

const TILE_FILLS = [
  "#2b3a4a",
  "#3a2f4a",
  "#243f3a",
  "#42342a",
  "#2a3450",
  "#432c3a",
  "#33403a",
  "#3d3a2a",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

export function Avatar({
  name,
  size = 32,
  className,
  ring,
  avatarId,
}: {
  name: string;
  size?: number;
  className?: string;
  /** CSS var name for a 2px ring, e.g. "--signal". */
  ring?: string;
  /** "tile-N" to force a fill; otherwise the fill is hashed from `name`. */
  avatarId?: string;
}) {
  const forced = avatarId?.startsWith("tile-")
    ? Number(avatarId.slice(5)) - 1
    : undefined;
  const idx =
    forced != null && Number.isFinite(forced)
      ? ((forced % TILE_FILLS.length) + TILE_FILLS.length) % TILE_FILLS.length
      : hash(name) % TILE_FILLS.length;
  const fill = TILE_FILLS[idx];
  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-md font-mono font-medium text-text/90 select-none shrink-0",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: fill,
        fontSize: Math.round(size * 0.36),
        boxShadow: ring ? `0 0 0 2px var(${ring})` : "inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
      aria-hidden
    >
      {monogram(name)}
    </span>
  );
}
