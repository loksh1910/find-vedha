import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { RouteDiagram } from "./route-diagram";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-10">
      <RouteDiagram className="opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/60 to-bg" />

      <div className="relative w-full max-w-[420px]">
        <Link href="/" className="mb-6 inline-flex" aria-label="Find Vedha — home">
          <Logo />
        </Link>
        <div className="rounded-lg border border-line-strong bg-surface p-6">
          <h1 className="font-display text-xl font-bold text-text">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-4 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-line-strong bg-bg-inset px-3 text-sm text-text placeholder:text-faint focus:border-signal";
