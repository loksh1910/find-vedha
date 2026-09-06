"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

type Bubble = {
  id: number;
  x: number;
  y: number;
  w: number;
  from: string;
  color: string;
  text: string;
};

const LINES: [string, string, string][] = [
  ["Karthik", "--tr-1", "Vedha used a Bus"],
  ["Divya", "--tr-3", "Metro from the north"],
  ["Ashwin", "--tr-4", "he crossed the river"],
  ["Priya", "--tr-2", "cut the Auto lines"],
  ["Vetri", "--tr-5", "last seen near #128"],
  ["Karthik", "--tr-1", "double-move — he's gone"],
  ["Divya", "--tr-3", "boxed in by the coast"],
  ["Ashwin", "--tr-4", "reveal round — there!"],
  ["Priya", "--tr-2", "I've got the bridge"],
  ["Vetri", "--tr-5", "Auto #45 → #52"],
];

const BUBBLE_H = 64;

function rectsOf(sel: string) {
  return [...document.querySelectorAll(sel)]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
}

const hits = (x: number, y: number, w: number, rects: DOMRect[], pad: number) => {
  const l = x - pad;
  const t = y - pad;
  const r = x + w + pad;
  const b = y + BUBBLE_H + pad;
  return rects.some((a) => !(a.right < l || a.left > r || a.bottom < t || a.top > b));
};

/**
 * A spot anywhere on screen — left, right, top or bottom — that clears the
 * map's sea and the hero text. Pass 1 also keeps clear of the header / CTA /
 * strip; if the viewport is too tight, pass 2 only protects "Find Vedha" and
 * the copy beside it.
 */
function findSpot(): Omit<Bubble, "id" | "from" | "color" | "text"> | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(150, Math.min(212, Math.round(vw * 0.4)));

  const scale = Math.max(vw / 2200, vh / 1500);
  const sea = 1885 * scale - (2200 * scale - vw) / 2; // px from left where the sea begins
  const rightLimit = Math.min(vw - 8, sea - 4);
  const maxLeft = rightLimit - w;
  const maxY = vh - BUBBLE_H - 10;
  if (maxLeft < 8 || maxY < 8) return null;

  const all = rectsOf("[data-chatter-avoid]");
  const core = rectsOf("[data-chatter-core]");

  for (const [rects, pad, tries] of [
    [all, 8, 55],
    [core, 6, 40],
  ] as const) {
    for (let i = 0; i < tries; i++) {
      // bimodal so bubbles hug the left OR the right, not only mid-left
      const t = Math.random();
      const x =
        Math.random() < 0.5
          ? 8 + t * (maxLeft - 8) * 0.5
          : 8 + (0.5 + t * 0.5) * (maxLeft - 8);
      const y = 8 + Math.random() * (maxY - 8);
      if (!hits(x, y, w, rects, pad)) return { x, y, w };
    }
  }
  return null;
}

/** Ambient: detective chat lines pop around the map, hinting at in-game chat. */
export function MapChatter() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const pop = () => {
      if (!alive) return;
      const spot = findSpot();
      if (spot) {
        const [from, color, text] = LINES[Math.floor(Math.random() * LINES.length)];
        const id = ++n;
        setBubbles((b) => [...b.slice(-1), { id, from, color, text, ...spot }]);
        timers.push(setTimeout(() => setBubbles((b) => b.filter((z) => z.id !== id)), 4400));
      }
      timers.push(setTimeout(pop, 3000 + Math.random() * 3400));
    };
    timers.push(setTimeout(pop, 1200));

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute flex items-start gap-2.5 rounded-xl border border-line-strong bg-surface-2/95 px-3 py-2.5 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.7)] backdrop-blur-sm"
          style={{ left: b.x, top: b.y, width: b.w, animation: "fv-fade-up 420ms var(--ease) both" }}
        >
          <span
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
            style={{ background: `color-mix(in oklab, var(${b.color}) 22%, transparent)` }}
          >
            <MapPin size={13} style={{ color: `var(${b.color})` }} />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[0.6875rem] text-faint">{b.from}</span>
            <span className="block text-sm text-text">{b.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
