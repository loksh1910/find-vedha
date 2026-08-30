"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
  The Lobby → board bridge (SITEMAP.md §2.G). One orchestrated ~1.8s beat,
  then routes to the (placeholder) game screen.
*/

const LINES = [
  "M40 300 L200 300 L320 180 L520 180 L640 300 L960 300",
  "M120 60 L120 220 L280 380 L680 380 L800 240 L800 60",
  "M60 460 L260 460 L380 340 L620 340 L760 460 L940 460",
];

export function TransitionOverlay({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push(`/room/${code}/play`), 1800);
    return () => clearTimeout(t);
  }, [code, router]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg">
      <div className="relative w-full max-w-[720px] px-6 text-center">
        <svg viewBox="0 0 1000 520" className="mx-auto w-full" aria-hidden>
          <g fill="none" stroke="var(--line-strong)" strokeWidth="2">
            {LINES.map((d, i) => (
              <path
                key={i}
                d={d}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1000}
                strokeDasharray={1000}
                style={{
                  animation: `fv-sweep 900ms var(--ease) ${i * 120}ms both`,
                  ["--fv-len" as string]: 1000,
                }}
              />
            ))}
          </g>
          <circle
            cx="520"
            cy="180"
            r="10"
            fill="var(--signal)"
            style={{ transformOrigin: "520px 180px", animation: "fv-pulse 1.4s var(--ease) 600ms infinite" }}
          />
        </svg>
        <p
          className="mt-6 font-display text-xl font-bold text-text"
          style={{ animation: "fv-fade-up 500ms var(--ease) 700ms both" }}
        >
          Vedha has vanished into the city…
        </p>
        <p
          className="mt-1 font-mono text-xs text-faint"
          style={{ animation: "fv-fade-up 500ms var(--ease) 900ms both" }}
        >
          entering room {code}
        </p>
      </div>
    </div>
  );
}
