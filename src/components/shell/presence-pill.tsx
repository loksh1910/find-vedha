"use client";

import {
  usePresence,
  presenceLabel,
} from "@/components/providers/presence-provider";
import { cn } from "@/lib/cn";

/** Live "Online / In a lobby / In a game" dot+label for a user id. */
export function PresencePill({ uid, className }: { uid: string; className?: string }) {
  const { statusOf } = usePresence();
  const { status, code } = statusOf(uid);
  const label = presenceLabel(status, code);
  if (!label) return null;
  const tone =
    label.tone === "ok"
      ? "text-ok"
      : label.tone === "signal"
        ? "text-signal"
        : label.tone === "reveal"
          ? "text-reveal"
          : "text-faint";
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 font-mono text-[0.66rem]",
        tone,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label.text}
    </span>
  );
}
