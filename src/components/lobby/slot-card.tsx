import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { SlotDef } from "@/lib/roles";
import { cn } from "@/lib/cn";

export type Holder = { name: string; avatarId?: string };

export function SlotCard({
  slot,
  holder,
  isMe,
  interactive,
  locked,
  onClick,
}: {
  slot: SlotDef;
  holder?: Holder;
  isMe?: boolean;
  interactive?: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  const colour = `var(${slot.varName})`;
  const isVedha = slot.kind === "vedha";

  const body = (
    <div
      style={{ "--slot": colour } as CSSProperties}
      className={cn(
        "flex h-full flex-col rounded-md border bg-surface p-3 text-left transition-colors",
        holder ? "border-line" : "border-dashed border-line-strong",
        interactive && !holder && "hover:border-[var(--slot)] hover:bg-surface-2",
        interactive && isMe && "border-[var(--slot)]",
        locked && "border-line",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-[3px]"
          style={{ background: colour }}
        />
        <span
          className={cn(
            "font-mono text-[0.6875rem] uppercase tracking-[0.12em]",
            isVedha ? "text-signal" : "text-muted",
          )}
        >
          {slot.label}
        </span>
      </div>

      <div className="mt-1 font-display text-sm font-semibold text-text">
        {isVedha ? "Vedha" : slot.colour}
      </div>

      <div className="mt-auto pt-3">
        {holder ? (
          <div className="flex items-center gap-2">
            <Avatar name={holder.name} avatarId={holder.avatarId} size={24} />
            <span className="truncate text-sm text-text">{holder.name}</span>
            {isMe && (
              <span className="ml-auto rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[0.625rem] uppercase text-faint">
                you
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-faint">
            {interactive ? "Tap to claim" : "Open"}
          </span>
        )}
      </div>
    </div>
  );

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isMe}
        aria-label={
          holder
            ? `${slot.label}, held by ${holder.name}${isMe ? " (you)" : ""}`
            : `${slot.label}, open — claim`
        }
        className={cn(
          "block h-full min-h-[132px] rounded-md focus-visible:outline-2",
          !isMe && holder && "cursor-not-allowed opacity-90",
        )}
        disabled={!!holder && !isMe}
      >
        {body}
      </button>
    );
  }

  return <div className="h-full min-h-[132px]">{body}</div>;
}
