"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Catches any render-time crash that slips past a page's own guards (Next's
 * error boundary contract: client component, {error, reset} props). Without
 * this, an uncaught error shows the host's generic, unstyled fallback —
 * this instead gives people something recoverable and on-brand.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="w-[min(92vw,420px)] rounded-lg border border-line-strong bg-surface p-6">
        <AlertTriangle size={22} className="mx-auto text-faint" />
        <h1 className="mt-3 font-display text-xl font-bold text-text">
          Something went wrong
        </h1>
        <p className="mt-1 text-sm text-muted">
          This page hit a snag loading its data. Try again, or head back to the dashboard.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
