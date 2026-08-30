"use client";

import * as RSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <RSwitch.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-100",
        "border-line-strong bg-surface-2",
        "data-[state=checked]:bg-ok/25 data-[state=checked]:border-ok",
        "disabled:opacity-40 disabled:cursor-not-allowed",
      )}
    >
      <RSwitch.Thumb
        className={cn(
          "block h-4 w-4 translate-x-1 rounded-full bg-faint transition-transform duration-100",
          "data-[state=checked]:translate-x-6 data-[state=checked]:bg-ok",
        )}
      />
    </RSwitch.Root>
  );
}
