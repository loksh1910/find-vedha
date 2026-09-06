"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/shell/auth-shell";
import { useAppState } from "@/components/providers/app-state-provider";
import { cn } from "@/lib/cn";

/** Sign in / create account overlay. Mock auth — any name gets you in. */
export function AuthDialog({
  open,
  onOpenChange,
  onAuthed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAuthed: () => void;
}) {
  const { signIn } = useAppState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");

  if (!open) return null;

  const go = (username: string) => {
    signIn(username || "Player");
    onAuthed();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(name);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "in" ? "Sign in to play" : "Create your account"}
      description="Mock auth for now — any name gets you in."
    >
      <div className="mb-4 flex gap-1 rounded-md border border-line p-1 text-sm">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-[5px] px-3 py-1.5 transition-colors",
              mode === m ? "bg-surface-2 text-text" : "text-muted hover:text-text",
            )}
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          className={inputClass}
          placeholder="you@example.com"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input className={inputClass} type="password" placeholder="••••••••" />
        <Button type="submit" variant="primary" className="w-full">
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
        <button
          type="button"
          onClick={() => go("Guest")}
          className="w-full text-center text-xs text-faint hover:text-muted"
        >
          Skip — continue as a guest
        </button>
      </form>
    </Dialog>
  );
}
