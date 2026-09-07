"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";

const KEY = "fv:seen-intro";

const STEPS = [
  "Make a room or join with a code. In the lobby everyone claims Vedha or a Detective.",
  "Vedha moves in secret. The Detectives compare notes and close in over 24 rounds.",
  "Vedha's exact spot shows on rounds 3, 8, 13, 18 and 24 — then hides again.",
];

export function IntroCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a dismissal flag
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      /* keep hidden */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* session-only is fine */
    }
    setShow(false);
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-lg border border-line-strong bg-surface p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-text"
      >
        <X size={15} />
      </button>

      <p className="eyebrow">New here</p>
      <h2 className="mt-1 font-display text-lg font-bold text-text">
        How Find Vedha works
      </h2>

      <ol className="mt-3 space-y-2">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-muted">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border border-line-strong font-mono text-[0.7rem] text-signal">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center gap-3">
        <Link
          href="/how-to-play"
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 py-1.5 text-sm text-text hover:border-faint"
        >
          <BookOpen size={14} />
          Open the manual
        </Link>
        <button
          onClick={dismiss}
          className="text-sm text-muted hover:text-text"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
