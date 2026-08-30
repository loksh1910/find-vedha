"use client";

import { useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ManualContent } from "./manual-content";
import { cn } from "@/lib/cn";

/** "Manual" trigger + the rules dialog. Used on the Landing nav and in the Lobby. */
export function ManualDialog({
  trigger,
  className,
}: {
  trigger?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className={cn("contents", className)}>
          {trigger}
        </span>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text",
            className,
          )}
        >
          <BookOpen size={15} />
          Manual
        </button>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="How to play"
        description="Everything you need — you can reopen this any time from the lobby."
      >
        <ManualContent />
      </Dialog>
    </>
  );
}
