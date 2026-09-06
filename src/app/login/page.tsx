"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, Field, inputClass } from "@/components/shell/auth-shell";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/components/providers/app-state-provider";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signInWithPassword, signInAsGuest } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = params.get("next") || "/dashboard";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await signInWithPassword(email, password);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    router.push(next);
  }

  async function guest() {
    setErr(null);
    setBusy(true);
    const res = await signInAsGuest();
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    router.push(next);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <input
          className={inputClass}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoFocus
        />
      </Field>
      <Field label="Password">
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>

      {err && <p className="text-xs text-danger">{err}</p>}

      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
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
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-signal hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-[220px]" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
