"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/** 6-cell monospace code entry, paste-aware. Value is kept uppercased. */
export function SegmentedInput({
  value,
  onChange,
  length = 6,
  invalid,
  onComplete,
  "aria-label": ariaLabel = "Invite code",
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  invalid?: boolean;
  onComplete?: (v: string) => void;
  "aria-label"?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.toUpperCase().slice(0, length).split("");

  const setChar = (i: number, ch: string) => {
    const next = value.toUpperCase().split("");
    next[i] = ch;
    const joined = next.join("").slice(0, length).replace(/[^A-Z0-9]/g, "");
    onChange(joined);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
    if (joined.length === length) onComplete?.(joined);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, length);
    onChange(text);
    if (text.length === length) onComplete?.(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2" role="group" aria-label={ariaLabel}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={chars[i] ?? ""}
          inputMode="text"
          autoCapitalize="characters"
          maxLength={1}
          aria-label={`${ariaLabel} character ${i + 1}`}
          onChange={(e) => setChar(i, e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className={cn(
            "h-12 w-11 rounded-md border bg-bg-inset text-center font-mono text-lg text-text",
            "focus:border-signal",
            invalid ? "border-danger" : "border-line-strong",
          )}
        />
      ))}
    </div>
  );
}
