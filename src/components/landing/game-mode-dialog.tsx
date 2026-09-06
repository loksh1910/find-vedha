"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

/** Signed-in "Play game" picker: friends → dashboard, computer → solo lobby. */
export function GameModeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="How do you want to play?"
      description="Set up a room for your friends, or take on the computer solo."
      className="sm:max-w-[620px]"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="group flex flex-col rounded-lg border border-line-strong bg-surface-2 p-4 text-left transition-colors hover:border-signal"
        >
          <FriendsArt />
          <span className="mt-3 flex items-center gap-1.5 font-display text-base font-bold text-text">
            Play with friends
            <ArrowRight size={15} className="text-signal transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 text-xs text-muted">
            Make a private room and share the code. 2–6 players.
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/room/SOLO?solo=1")}
          className="group flex flex-col rounded-lg border border-line-strong bg-surface-2 p-4 text-left transition-colors hover:border-signal"
        >
          <ComputerArt />
          <span className="mt-3 flex items-center gap-1.5 font-display text-base font-bold text-text">
            Play with computer
            <ArrowRight size={15} className="text-signal transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 text-xs text-muted">
            Pick a side — the computer takes every other role.
          </span>
        </button>
      </div>
    </Dialog>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 220 120" className="w-full rounded-md" role="img" aria-hidden>
      <rect x="0" y="0" width="220" height="120" rx="8" fill="var(--bg-inset)" />
      <path
        d="M18 92 L64 60 L110 78 L150 40 L202 58"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {children}
    </svg>
  );
}

function FriendsArt() {
  const seats: [number, number, string][] = [
    [64, 60, "--tr-1"],
    [110, 78, "--tr-3"],
    [150, 40, "--signal"],
  ];
  return (
    <Card>
      {seats.map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill={`var(${c})`} opacity="0.18" />
          <circle cx={x} cy={y - 3} r="4.5" fill={`var(${c})`} />
          <path d={`M${x - 7} ${y + 8} q7 -9 14 0`} fill={`var(${c})`} />
        </g>
      ))}
    </Card>
  );
}

function ComputerArt() {
  return (
    <Card>
      <rect x="78" y="34" width="64" height="46" rx="6" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="2" />
      <rect x="88" y="44" width="44" height="26" rx="3" fill="var(--bg)" />
      <circle cx="110" cy="57" r="7" fill="none" stroke="var(--signal)" strokeWidth="2.5" />
      <line x1="115" y1="62" x2="122" y2="69" stroke="var(--signal)" strokeWidth="3" strokeLinecap="round" />
      {[92, 100, 108, 116, 124].map((x) => (
        <line key={x} x1={x} y1="84" x2={x} y2="90" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
      ))}
      <circle cx="150" cy="40" r="4" fill="var(--reveal)" />
    </Card>
  );
}
