"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LeftRail } from "@/components/shell/left-rail";
import { useAppState } from "@/components/providers/app-state-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { hydrated, isSignedIn } = useAppState();
  const router = useRouter();

  useEffect(() => {
    // "/" (not "/login") so this agrees with the sign-out button's own
    // navigation — otherwise the two can race and land on different pages.
    if (hydrated && !isSignedIn) router.replace("/");
  }, [hydrated, isSignedIn, router]);

  if (!hydrated || !isSignedIn) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="font-mono text-xs text-faint">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <LeftRail />
      <div className="flex-1 pt-14 pb-16 md:pt-0 md:pb-0">{children}</div>
    </div>
  );
}
