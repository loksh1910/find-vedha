"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Link2, VenetianMask, Search, ShieldX, TicketCheck, Video } from "lucide-react";

/* ------------------------------------------------------------------ *
 *  Animated spot diagrams — small looping SVGs, one per card.
 * ------------------------------------------------------------------ */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 260 148" className="block w-full" role="img" aria-hidden>
      <rect x="0" y="0" width="260" height="148" fill="var(--bg-inset)" />
      <path
        d="M12 118 L70 78 L128 96 L176 52 L248 74"
        fill="none"
        stroke="var(--line)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {children}
    </svg>
  );
}

function RoomArt() {
  const chars = ["V", "3", "D", "H", "7", "K"];
  return (
    <Frame>
      {chars.map((ch, i) => (
        <g key={i} transform={`translate(${42 + i * 30} 66)`}>
          <rect x="-12" y="-17" width="24" height="34" rx="4" fill="var(--surface-2)" stroke="var(--line-strong)" />
          <text
            textAnchor="middle"
            dy="6"
            fontFamily="var(--font-mono)"
            fontSize="16"
            fill="var(--text)"
          >
            {ch}
            <animate
              attributeName="opacity"
              values="0;0;1;1;0"
              keyTimes={`0;${(i * 0.08).toFixed(2)};${(i * 0.08 + 0.12).toFixed(2)};0.85;1`}
              dur="4s"
              repeatCount="indefinite"
            />
          </text>
        </g>
      ))}
      <circle cx="130" cy="118" r="9" fill="none" stroke="var(--signal)" strokeWidth="2" />
      <path d="M130 118 v7" stroke="var(--signal)" strokeWidth="2" />
    </Frame>
  );
}

function VedhaArt() {
  return (
    <Frame>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const isV = i === 2;
        return (
          <g key={i} transform={`translate(${34 + i * 38} 74)`}>
            {isV && (
              <circle r="13" fill="none" stroke="var(--signal)" strokeWidth="2">
                <animate attributeName="r" values="13;24;13" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="2.2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r="13" fill={isV ? "var(--signal)" : "var(--line-strong)"} />
            <text
              textAnchor="middle"
              dy="4"
              fontFamily="var(--font-display)"
              fontWeight="800"
              fontSize="11"
              fill={isV ? "var(--signal-ink)" : "var(--faint)"}
            >
              {isV ? "V" : "D"}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

function HuntArt() {
  const N = (x: number, y: number) => (
    <circle cx={x} cy={y} r="4" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="2" />
  );
  return (
    <Frame>
      <path
        d="M24 34 H120 M120 34 V112 M120 34 L214 66 M60 112 H214 M214 34 V112"
        stroke="var(--line-strong)"
        strokeWidth="2"
        fill="none"
      />
      {N(24, 34)}
      {N(120, 34)}
      {N(214, 34)}
      {N(120, 112)}
      {N(60, 112)}
      {N(214, 112)}
      <circle cx="150" cy="78" r="17" fill="none" stroke="var(--reveal)" strokeWidth="2" strokeDasharray="3 4">
        <animate attributeName="opacity" values="0.35;1;0.35" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle r="7" fill="var(--tr-1)">
        <animate attributeName="cx" values="24;120;120;150" keyTimes="0;0.4;0.7;1" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="34;34;80;78" keyTimes="0;0.4;0.7;1" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle r="7" fill="var(--tr-3)">
        <animate attributeName="cx" values="214;214;150" keyTimes="0;0.55;1" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="112;78;78" keyTimes="0;0.55;1" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle r="7" fill="var(--tr-4)">
        <animate attributeName="cx" values="60;120;150" keyTimes="0;0.5;1" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="112;112;78" keyTimes="0;0.5;1" dur="4s" repeatCount="indefinite" />
      </circle>
    </Frame>
  );
}

function CaughtArt() {
  return (
    <Frame>
      <line x1="36" y1="74" x2="224" y2="74" stroke="var(--line-strong)" strokeWidth="2" />
      <circle cx="36" cy="74" r="4" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="2" />
      <circle cx="150" cy="74" r="16" fill="var(--signal)" />
      <text x="150" y="79" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13" fill="var(--signal-ink)">
        V
      </text>
      <circle r="11" fill="var(--tr-1)">
        <animate attributeName="cx" values="36;36;150;150;36" keyTimes="0;0.12;0.5;0.86;1" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="cy" values="74;74;74;74;74" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="74" r="16" fill="none" stroke="var(--danger)" strokeWidth="3">
        <animate attributeName="r" values="16;16;36;16" keyTimes="0;0.5;0.66;1" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.5;0.52;0.72" dur="3.6s" repeatCount="indefinite" />
      </circle>
    </Frame>
  );
}

function TicketArt() {
  const stop = (x: number) => <circle cx={x} cy="46" r="4.5" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="2" />;
  const chip = (x: number, color: string, label: string) => (
    <g transform={`translate(${x} 104)`}>
      <rect x="-24" y="-13" width="48" height="26" rx="5" fill="var(--surface-2)" stroke="var(--line-strong)" />
      <circle cx="-13" cy="0" r="4" fill={color} />
      <text x="4" y="4" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--muted)">
        {label}
      </text>
    </g>
  );
  return (
    <Frame>
      <line x1="30" y1="46" x2="90" y2="46" stroke="var(--t-auto)" strokeWidth="3" />
      <line x1="90" y1="46" x2="165" y2="46" stroke="var(--t-bus)" strokeWidth="3" />
      <line x1="165" y1="46" x2="232" y2="46" stroke="var(--t-metro)" strokeWidth="3" />
      {stop(30)}
      {stop(90)}
      {stop(165)}
      {stop(232)}
      <circle r="8" fill="var(--signal)">
        <animate
          attributeName="cx"
          values="30;90;90;165;165;232;232;30"
          keyTimes="0;0.22;0.34;0.56;0.68;0.9;0.96;1"
          dur="5s"
          repeatCount="indefinite"
        />
        <animate attributeName="cy" values="46" dur="5s" repeatCount="indefinite" />
      </circle>
      {chip(52, "var(--t-auto)", "Auto")}
      {chip(130, "var(--t-bus)", "Bus")}
      {chip(208, "var(--t-metro)", "Metro")}
    </Frame>
  );
}

function VideoArt() {
  const tiles: [number, number][] = [
    [66, 44],
    [154, 44],
    [66, 104],
    [154, 104],
  ];
  return (
    <Frame>
      {tiles.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-36" y="-26" width="72" height="52" rx="8" fill="var(--bg)" stroke="var(--line-strong)" />
          <circle cy="-3" r="11" fill={`var(--tr-${i + 1})`} />
          <path d={`M-12 18 q12 -15 24 0`} fill={`var(--tr-${i + 1})`} />
          <rect x="-36" y="-26" width="72" height="52" rx="8" fill="none" stroke="var(--signal)" strokeWidth="2.5">
            <animate
              attributeName="opacity"
              values="0;0;1;1;0;0"
              keyTimes={`0;${(i * 0.25).toFixed(2)};${(i * 0.25 + 0.03).toFixed(2)};${(i * 0.25 + 0.18).toFixed(2)};${(i * 0.25 + 0.21).toFixed(2)};1`}
              dur="5s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */

const CARDS = [
  {
    n: "01",
    kicker: "The room",
    title: "Make a private room",
    body: "One tap gives you a six-character code. Share it with friends — no one else can get in.",
    icon: Link2,
    art: <RoomArt />,
  },
  {
    n: "02",
    kicker: "The roles",
    title: "One of you is Vedha",
    body: "Claim a role in the lobby against a ten-second clock. Whatever's left is dealt at random — everyone knows who Vedha is, not where.",
    icon: VenetianMask,
    art: <VedhaArt />,
  },
  {
    n: "03",
    kicker: "The chase",
    title: "The Detectives hunt the map",
    body: "Vedha moves in secret across the transit map. The exact node only shows on rounds 3, 8, 13, 18 and 24 — then hides again.",
    icon: Search,
    art: <HuntArt />,
  },
  {
    n: "04",
    kicker: "The catch",
    title: "How Vedha gets caught",
    body: "A Detective landing on Vedha's exact node ends it — so does Vedha being forced onto an occupied node, or having no legal move left.",
    icon: ShieldX,
    art: <CaughtArt />,
  },
  {
    n: "05",
    kicker: "The moves",
    title: "Every hop spends a ticket",
    body: "Auto (yellow), Bus (green) or Metro (red) — one stop per ticket. Vedha also holds Wildcards that hide the transport, and two Double-Moves.",
    icon: TicketCheck,
    art: <TicketArt />,
  },
  {
    n: "06",
    kicker: "The table",
    title: "Play face to face",
    body: "Everyone's on video and voice around the table. Read the room, bluff out loud, and watch who flinches on a reveal round.",
    icon: Video,
    art: <VideoArt />,
  },
];

const N = CARDS.length;
const STEP = 360 / N; // degrees between neighbouring cards on the ring

/* wheel travel → ring rotation. The ring is on screen from the first paint
   and loops through the six cards forever. */
const DEG_PER_PX = 0.16;

/* ring geometry, inside the fixed right-hand rail */
const RAIL_W = 620;
const CX = 560; // ring centre X, from the rail's left edge
const R = 282; // ring radius
const CARD_W = 300;
const CARD_H = 372; // every card is locked to this box

function CardFace({ c }: { c: (typeof CARDS)[number] }) {
  return (
    <>
      <div className="shrink-0 border-b border-line">{c.art}</div>
      <div className="flex min-h-0 flex-col p-5">
        <div className="flex items-center gap-2 font-mono text-[11px] text-signal">
          <c.icon size={12} />
          {c.n} · {c.kicker}
        </div>
        <h3 className="mt-1.5 font-display text-[17px] font-bold leading-tight text-text">{c.title}</h3>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-muted">{c.body}</p>
      </div>
    </>
  );
}

export function CardRing({ interactive }: { interactive: boolean }) {
  // ring rotation, in DEGREES — unbounded, so the ring loops through the six
  // cards forever in both directions. Kept in degrees (not wheel px) so that
  // snapped/jumped values are exact multiples of STEP and `active` never
  // drifts off by a float rounding error.
  const [rot, setRot] = useState(0);

  useEffect(() => {
    if (!interactive) return;

    let snapId = 0;

    const busy = () => !!document.querySelector('[role="dialog"]');
    // once scrolling stops, ease to the nearest card so the ring always rests
    // dead-centre — and the front-card glow is therefore always identical.
    const advance = (px: number) => {
      setRot((r) => Math.max(-1e7, Math.min(1e7, r + px * DEG_PER_PX)));
      clearTimeout(snapId);
      snapId = window.setTimeout(
        () => setRot((r) => Math.round(r / STEP) * STEP),
        160,
      );
    };
    const onWheel = (e: WheelEvent) => {
      if (busy()) return;
      e.preventDefault();
      advance(e.deltaY);
    };
    const onKey = (e: KeyboardEvent) => {
      if (busy()) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const map: Record<string, number> = {
        ArrowDown: 120,
        PageDown: 320,
        ArrowUp: -120,
        PageUp: -320,
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      advance(map[e.key]);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      clearTimeout(snapId);
      html.style.overflow = prevOverflow;
    };
  }, [interactive]);

  const active = ((Math.round(rot / STEP) % N) + N) % N;

  // rotate the shortest way round to bring card `i` to the front
  const jump = (i: number) => {
    setRot((r) => {
      const target = i * STEP;
      const turns = Math.round((r - target) / 360);
      return turns * 360 + target;
    });
  };

  /* ---- reduced-motion / small screens: a plain, static grid ---- */
  if (!interactive) {
    return (
      <section className="relative z-10 mx-auto max-w-[1100px] px-6 py-16 md:px-10">
        <p className="eyebrow">How a game goes</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {CARDS.map((c) => (
            <div key={c.n} className="flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface">
              <CardFace c={c} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* ---- desktop: a rotating ring pinned to the right edge ---- */
  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-0 z-10 hidden lg:block"
      style={{ width: RAIL_W }}
      aria-hidden
    >
      <p className="eyebrow absolute right-10 top-24 text-right">How a game goes</p>

      <div className="absolute top-1/2" style={{ left: CX }}>
        {/* soft blue bloom parked at the front slot */}
        <div
          aria-hidden
          className="absolute left-0 top-0 rounded-[28px]"
          style={{
            width: CARD_W,
            height: CARD_H,
            transform: `translate(calc(-50% + ${(-R).toFixed(1)}px), -50%)`,
            background: "var(--signal)",
            filter: "blur(40px)",
            opacity: 0.16,
            zIndex: 0,
          }}
        />
        {CARDS.map((c, i) => {
          const raw = i * STEP - rot;
          const rel = (((raw % 360) + 540) % 360) - 180; // -180..180, 0 = front
          const ad = Math.abs(rel);
          const rad = ((180 + rel) * Math.PI) / 180;
          const x = R * Math.cos(rad);
          const y = R * Math.sin(rad);
          const scale = Math.max(0.5, 1 - ad * 0.0075);
          const opacity = Math.max(0, Math.min(1, 1.1 - ad / 95));
          const front = ad < 6;
          // exactly one card carries the glow — the one nearest the front —
          // at full strength, so every card glows identically. The 350ms
          // box-shadow/border transition cross-fades it during a spin.
          const glow = i === active ? 1 : 0;
          const baseShadow = "0 36px 90px -30px rgba(0,0,0,0.9)";
          const style: CSSProperties = {
            width: CARD_W,
            height: CARD_H,
            transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${scale.toFixed(3)})`,
            opacity: opacity.toFixed(3),
            zIndex: 200 - Math.round(ad),
            borderColor: `color-mix(in oklab, var(--signal) ${(glow * 100).toFixed(0)}%, var(--line-strong))`,
            filter: front
              ? undefined
              : `blur(${Math.min(1.8, ad * 0.02).toFixed(2)}px) brightness(${Math.max(0.66, 1 - ad * 0.003).toFixed(2)})`,
            boxShadow:
              glow > 0.01
                ? `${baseShadow}, 0 0 0 1px color-mix(in oklab, var(--signal) ${(glow * 85).toFixed(0)}%, transparent), 0 0 ${(20 * glow).toFixed(0)}px ${(2 * glow).toFixed(1)}px color-mix(in oklab, var(--signal) ${(glow * 62).toFixed(0)}%, transparent), 0 0 ${(60 * glow).toFixed(0)}px ${(10 * glow).toFixed(0)}px color-mix(in oklab, var(--signal) ${(glow * 30).toFixed(0)}%, transparent)`
                : baseShadow,
            transition:
              "transform 500ms var(--ease), opacity 380ms linear, filter 300ms linear, box-shadow 360ms linear, border-color 360ms linear",
          };
          return (
            <article
              key={c.n}
              style={style}
              className="absolute left-0 top-0 flex flex-col overflow-hidden rounded-2xl border bg-surface will-change-transform"
            >
              <CardFace c={c} />
            </article>
          );
        })}
      </div>

      {/* progress rail — vertical, centre-right; click a dot to spin to that card */}
      <div className="pointer-events-auto absolute right-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2.5">
        {CARDS.map((c, i) => (
          <button
            key={c.n}
            onClick={() => jump(i)}
            aria-label={`Go to “${c.title}”`}
            className="w-2 rounded-full transition-all duration-300"
            style={{
              height: i === active ? 26 : 8,
              background: i === active ? "var(--signal)" : "var(--line-strong)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
