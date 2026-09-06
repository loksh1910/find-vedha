"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { MagnifyMap } from "@/components/landing/magnify-map";
import { MapChatter } from "@/components/landing/map-chatter";
import { CardRing } from "@/components/landing/card-ring";
import { GameModeDialog } from "@/components/landing/game-mode-dialog";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { ManualDialog } from "@/components/manual/manual-dialog";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/components/providers/app-state-provider";

const REVEALS = [3, 8, 13, 18, 24];

/** Desktop + motion-OK: the landing runs the pinned rotating card ring. */
function useInteractive() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    );
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return on;
}

export default function LandingPage() {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAppState();
  const interactive = useInteractive();
  const [authOpen, setAuthOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const onPlay = () => {
    if (!hydrated) return;
    if (isSignedIn) setModeOpen(true);
    else setAuthOpen(true);
  };

  return (
    <main className="relative">
      <MagnifyMap />
      {/* keep the copy readable over the map */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-bg/75 via-bg/45 to-bg/90" />
      <MapChatter />

      <div
        className={`relative z-10 mx-auto flex max-w-[1100px] flex-col px-6 md:px-10 ${
          interactive ? "h-dvh overflow-hidden" : "min-h-dvh"
        }`}
      >
        <header className="flex items-center justify-between py-5">
          <span data-chatter-avoid>
            <Logo />
          </span>
          <nav data-chatter-avoid className="flex items-center gap-1">
            <ManualDialog />
            {hydrated && isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button size="sm">Go to dashboard</Button>
                </Link>
                <ProfileMenu />
              </>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>
                Sign in
              </Button>
            )}
          </nav>
        </header>

        <section
          className={`flex flex-1 flex-col justify-center py-16 ${
            interactive
              ? "items-center text-center lg:max-w-[560px] lg:items-start lg:text-left"
              : "items-center text-center"
          }`}
        >
          <p data-chatter-avoid data-chatter-core className="eyebrow">
            A hidden-chase game on the Chennai transit map
          </p>
          <h1
            data-chatter-avoid
            data-chatter-core
            className="mt-4 font-display text-7xl font-extrabold leading-[0.95] tracking-tight text-text sm:text-8xl"
          >
            Find Vedha
          </h1>
          <p
            data-chatter-avoid
            data-chatter-core
            className="mt-6 max-w-[52ch] text-lg text-muted"
          >
            One player slips into the city and moves in secret. The rest give
            chase across the transit map — twenty-four rounds to close in.
          </p>

          <div data-chatter-avoid className="mt-9">
            <Button size="lg" variant="primary" onClick={onPlay}>
              Play game
              <ArrowRight size={17} />
            </Button>
          </div>

          {/* transit-line strip: the reveal schedule */}
          <div data-chatter-avoid className="mt-14 w-full max-w-[520px]">
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
      </div>

      <CardRing interactive={interactive} />

      <footer
        className={
          interactive
            ? "fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-line bg-bg/70 px-6 py-2.5 text-xs text-faint backdrop-blur-sm md:px-10"
            : "relative z-10 mx-auto flex max-w-[1100px] flex-col gap-2 border-t border-line px-6 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between md:px-10"
        }
      >
        <span>An original game. Not affiliated with any existing product.</span>
        <ManualDialog
          trigger={<button className="text-faint underline-offset-2 hover:text-muted hover:underline">How to play</button>}
        />
      </footer>

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
