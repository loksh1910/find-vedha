"use client";

import * as RDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  // Hard-unmount when closed (don't rely on animate-out lifecycle).
  if (!open) return null;
  return (
    <RDialog.Root open onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <RDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-line-strong bg-surface shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)]",
            "max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <RDialog.Title className="font-display text-lg font-bold text-text">
                {title}
              </RDialog.Title>
              {description && (
                <RDialog.Description className="mt-1 text-sm text-muted">
                  {description}
                </RDialog.Description>
              )}
            </div>
            <RDialog.Close
              className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
              aria-label="Close"
            >
              <X size={16} />
            </RDialog.Close>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
