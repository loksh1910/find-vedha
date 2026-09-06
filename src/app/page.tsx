"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { MagnifyMap } from "@/components/landing/magnify-map";
import { GameModeDialog } from "@/components/landing/game-mode-dialog";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { ManualDialog } from "@/components/manual/manual-dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAppState } from "@/components/providers/app-state-provider";

const STEPS = [
  {
    n: "01",
    title: "Make a private room",
    body: "One tap gives you a six-character code. Share it with friends — no one else can get in.",
  },
  {
    n: "02",
    title: "One of you is Vedha",
    body: "Claim a role in the lobby against a ten-second clock. Whatever's left is dealt at random.",
  },
  {
    n: "03",
    title: "The Detectives hunt the map",
    body: "Vedha moves in secret across Auto, Bus and Metro lines. Surface on rounds 3, 8, 13, 18 and 24.",
  },
];

const REVEALS = [3, 8, 13, 18, 24];

export default function LandingPage() {
  const router = useRouter();
  const { hydrated, isSignedIn, session, signOut } = useAppState();
  const [authOpen, setAuthOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const onPlay = () => {
    if (!hydrated) return;
    if (isSignedIn) setModeOpen(true);
    else setAuthOpen(true);
  };

  return (
    <main className="relative min-h-dvh">
      <MagnifyMap />
      {/* keep the copy readable over the map */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-bg/75 via-bg/45 to-bg/90" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1100px] flex-col px-6 md:px-10">
        <header className="flex items-center justify-between py-5">
          <Logo />
          <nav className="flex items-center gap-1">
            <ManualDialog />
            {hydrated && isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button size="sm">Go to dashboard</Button>
                </Link>
                <button
                  onClick={signOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="ml-1 rounded-full ring-1 ring-line-strong transition hover:ring-signal"
                >
                  <Avatar name={session?.username ?? "You"} avatarId={session?.avatarId} size={32} />
                </button>
              </>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>
                Sign in
              </Button>
            )}
          </nav>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="eyebrow">A hidden-chase game on the Chennai transit map</p>
          <h1 className="mt-4 font-display text-7xl font-extrabold leading-[0.95] tracking-tight text-text sm:text-8xl">
            Find Vedha
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg text-muted">
            One player slips into the city and moves in secret. The rest give
            chase across the transit map — twenty-four rounds to close in.
          </p>

          <div className="mt-9">
            <Button size="lg" variant="primary" onClick={onPlay}>
              Play game
              <ArrowRight size={17} />
            </Button>
          </div>

          {/* transit-line strip: the reveal schedule */}
          <div className="mt-14 w-full max-w-[520px]">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow">Vedha surfaces on</span>
              <span className="font-mono text-xs text-faint">round 1 → 24</span>
            </div>
            <svg viewBox="0 0 520 40" className="w-full" role="img" aria-label="Reveal rounds: 3, 8, 13, 18, 24">
              <line x1="10" y1="20" x2="510" y2="20" stroke="var(--line-strong)" strokeWidth="2" />
              {Array.from({ length: 24 }).map((_, i) => {
                const x = 10 + (i * 500) / 23;
                const reveal = REVEALS.includes(i + 1);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={20}
                    r={reveal ? 6 : 2.5}
                    fill={reveal ? "var(--signal)" : "var(--bg)"}
                    stroke={reveal ? "var(--signal)" : "var(--line-strong)"}
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </section>

        <section className="border-t border-line py-14">
          <h2 className="font-display text-xl font-bold text-text">How a game goes</h2>
          <ol className="mt-6 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n}>
                <div className="font-mono text-sm text-signal">{s.n}</div>
                <div className="mt-2 font-display text-base font-semibold text-text">
                  {s.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="flex flex-col gap-2 border-t border-line py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>An original game. Not affiliated with any existing product.</span>
          <ManualDialog
            trigger={<button className="text-faint underline-offset-2 hover:text-muted hover:underline">How to play</button>}
          />
        </footer>
      </div>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthed={() => {
          setAuthOpen(false);
          router.push("/dashboard");
        }}
      />
      <GameModeDialog open={modeOpen} onOpenChange={setModeOpen} />
    </main>
  );
}
