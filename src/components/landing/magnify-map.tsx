"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD, nodeById, roadSegments } from "@/lib/board/board-data";

/* one-time geometry — BOARD is built deterministically at module load */
const ROADS_D = roadSegments()
  .map(({ a, b }) => {
    const A = nodeById(a);
    const B = nodeById(b);
    return `M${A.x} ${A.y}L${B.x} ${B.y}`;
  })
  .join("");
const BUILDINGS_D = BOARD.buildings.join(" ");
const VW = BOARD.width;
const VH = BOARD.height;
/** the quarry, hidden out on the map — pops when the glass finds it */
const VEDHA = { x: Math.round(VW * 0.665), y: Math.round(VH * 0.4) };

const R = 96; // lens radius, px
const Z = 2.35; // magnification

function MapArt({ lens = false }: { lens?: boolean }) {
  return (
    <g>
      <rect x={0} y={0} width={VW} height={VH} fill="#151b26" />
      <path d={BOARD.coastPath} fill="#1c3c56" />
      {BOARD.riverPaths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#1c3c56"
          strokeWidth={44}
          strokeLinecap="round"
        />
      ))}
      <path d={BUILDINGS_D} fill="#26304180" stroke="#3a4863" strokeWidth={1.1} />
      <path d={ROADS_D} fill="none" stroke="#4b586a" strokeWidth={7} strokeLinecap="round" />
      <path
        d={ROADS_D}
        fill="none"
        stroke="#f4cf3a"
        strokeWidth={1.7}
        strokeLinecap="round"
        opacity={0.55}
      />
      <g transform={`translate(${VEDHA.x} ${VEDHA.y})`}>
        {lens && (
          <circle
            r={26}
            fill="none"
            stroke="var(--reveal)"
            strokeWidth={3}
            style={{ animation: "fv-pulse 2.4s var(--ease) infinite" }}
          />
        )}
        <circle r={lens ? 11 : 5} fill="var(--reveal)" opacity={lens ? 1 : 0.45} />
        {lens && (
          <text
            x={0}
            y={1}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fontWeight={800}
            fontFamily="var(--font-display)"
            fill="#180a10"
          >
            V
          </text>
        )}
      </g>
    </g>
  );
}

/** Dark city-map backdrop + a magnifying-glass cursor that zooms the map. */
export function MagnifyMap() {
  const [enabled, setEnabled] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [overUI, setOverUI] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const lensRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<SVGSVGElement>(null);
  const raf = useRef(0);
  const pos = useRef({ x: -999, y: -999 });

  const suppressed = overUI || modalOpen;

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- read the pointer capability once */
    setEnabled(fine);
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // pause the glass whenever a dialog is on screen
  useEffect(() => {
    const mo = new MutationObserver(() =>
      setModalOpen(!!document.querySelector('[role="dialog"]')),
    );
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // hide the OS cursor while the glass is active (restore over UI / dialogs)
  useEffect(() => {
    document.documentElement.style.cursor = enabled && !suppressed ? "none" : "";
    return () => {
      document.documentElement.style.cursor = "";
    };
  }, [enabled, suppressed]);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      const t = e.target as HTMLElement | null;
      const ui = !!t?.closest("a,button,input,textarea,label,select,[role='button']");
      setOverUI((prev) => (prev === ui ? prev : ui));
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        const { x, y } = pos.current;
        if (lensRef.current) lensRef.current.style.transform = `translate(${x - R}px, ${y - R}px)`;
        if (innerRef.current) {
          innerRef.current.style.left = `${R - x * Z}px`;
          innerRef.current.style.top = `${R - y * Z}px`;
        }
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [enabled]);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-bg">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-[0.32]"
        >
          <MapArt />
        </svg>
      </div>

      {enabled && !modalOpen && (
        <div
          ref={lensRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[60] transition-opacity duration-200"
          style={{
            width: R * 2,
            height: R * 2,
            opacity: suppressed ? 0 : 1,
            transform: "translate(-600px, -600px)",
            willChange: "transform",
          }}
        >
          <div
            className="relative overflow-hidden rounded-full"
            style={{
              width: R * 2,
              height: R * 2,
              border: "3px solid rgba(69,207,224,0.9)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.5)",
            }}
          >
            <svg
              ref={innerRef}
              viewBox={`0 0 ${VW} ${VH}`}
              preserveAspectRatio="xMidYMid slice"
              className="absolute"
              style={{ width: size.w * Z, height: size.h * Z, left: R, top: R }}
            >
              <MapArt lens />
            </svg>
          </div>
          {/* handle — pokes out from the lower-right of the lens */}
          <span
            className="absolute rounded-full"
            style={{
              width: 13,
              height: 74,
              left: R + R * 0.62,
              top: R + R * 0.62,
              transformOrigin: "top left",
              transform: "rotate(45deg)",
              background: "linear-gradient(var(--signal-hover), var(--signal))",
              boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
            }}
          />
        </div>
      )}
    </>
  );
}
