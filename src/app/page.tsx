import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { RouteDiagram } from "@/components/shell/route-diagram";
import { ManualDialog } from "@/components/manual/manual-dialog";
import { Button } from "@/components/ui/button";

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
    title: "The Trackers hunt the map",
    body: "Vedha moves in secret across Auto, Bus and Metro lines. Surface on rounds 3, 8, 13, 18 and 24.",
  },
];

const REVEALS = [3, 8, 13, 18, 24];

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <RouteDiagram className="opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/80 to-bg" />

      <div className="relative mx-auto flex min-h-dvh max-w-[1100px] flex-col px-6 md:px-10">
        <header className="flex items-center justify-between py-5">
          <Logo />
          <nav className="flex items-center gap-1">
            <ManualDialog />
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </nav>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <p className="eyebrow">A hidden-chase game · Chennai board · play over video</p>
          <h1 className="mt-4 max-w-[16ch] font-display text-[2.6rem] font-extrabold leading-[1.03] tracking-tight text-text sm:text-6xl">
            Someone in this room is Vedha.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg text-muted">
            A private game for 2–6 friends. One of you slips into the city and
            moves in secret. The rest give chase across the transit map — and have
            twenty-four rounds to close in.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <Button size="lg" variant="primary">
                Create a free account
                <ArrowRight size={17} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost">
                I have an account
              </Button>
            </Link>
          </div>

          {/* transit-line strip: the reveal schedule */}
          <div className="mt-14 max-w-[520px]">
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
    </main>
  );
}
