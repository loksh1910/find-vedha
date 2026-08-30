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
  const { signIn } = useAppState();
  const [name, setName] = useState("");

  const next = params.get("next") || "/dashboard";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    signIn(name || "Player");
    router.push(next);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Username or email">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="you@example.com"
          autoFocus
        />
      </Field>
      <Field label="Password">
        <input className={inputClass} type="password" placeholder="••••••••" />
      </Field>
      <Button type="submit" variant="primary" className="w-full">
        Log in
      </Button>
      <button
        type="button"
        onClick={() => {
          signIn("Guest");
          router.push(next);
        }}
        className="w-full text-center text-xs text-faint hover:text-muted"
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
      subtitle="Mock sign-in for now — any name gets you in."
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
