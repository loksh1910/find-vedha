import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Blade } from "@/components/ui/blade";

export default async function PlayPage({ params }: PageProps<"/room/[code]/play">) {
  const { code } = await params;
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-[440px] text-center">
        <p className="eyebrow">Room {code.toUpperCase()}</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-text">
          The board begins here.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          You&apos;ve reached the end of the current build — the full flow from the
          landing page through the lobby is done. The in-game engine (board,
          movement, tickets, hidden Vedha, reveals) is Phase 4.
        </p>
        <div className="mt-5 flex justify-center">
          <Blade colorVar="--signal" label="Next" value="Phase 4 — in-game engine" />
        </div>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
