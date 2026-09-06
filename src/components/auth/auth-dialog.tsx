"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/shell/auth-shell";
import { useAppState } from "@/components/providers/app-state-provider";
import { cn } from "@/lib/cn";

/** Sign in / create account overlay. */
export function AuthDialog({
  open,
  onOpenChange,
  onAuthed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAuthed: () => void;
}) {
  const { signInWithPassword, signUp, signInAsGuest } = useAppState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const finish = (res: { error: string | null }) => {
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    onAuthed();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    finish(
      mode === "in"
        ? await signInWithPassword(email, password)
        : await signUp({ email, password, username, avatarId: "tile-1" }),
    );
  };

  const guest = async () => {
    setErr(null);
    setBusy(true);
    finish(await signInAsGuest());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "in" ? "Sign in to play" : "Create your account"}
      description={
        mode === "in"
          ? "Your rooms and games are saved to your account."
          : "Pick a username — it's how other players see you."
      }
    >
      <div className="mb-4 flex gap-1 rounded-md border border-line p-1 text-sm">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setErr(null);
            }}
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
          type="email"
          placeholder="you@example.com"
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode === "up" && (
          <input
            className={inputClass}
            placeholder="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          className={inputClass}
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <p className="text-xs text-danger">{err}</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy
            ? mode === "in"
              ? "Signing in…"
              : "Creating…"
            : mode === "in"
              ? "Sign in"
              : "Create account"}
        </Button>
        <button
          type="button"
          onClick={guest}
          disabled={busy}
          className="w-full text-center text-xs text-faint hover:text-muted disabled:opacity-50"
        >
          Skip — continue as a guest
        </button>
      </form>
    </Dialog>
  );
}
