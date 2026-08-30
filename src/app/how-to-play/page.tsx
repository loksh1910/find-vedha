import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { ManualContent } from "@/components/manual/manual-content";

export const metadata = { title: "How to play — Find Vedha" };

export default function HowToPlayPage() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" aria-label="Find Vedha — home">
          <Logo />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-text">
        How to play
      </h1>
      <p className="mt-2 text-sm text-muted">
        The full ruleset. In a game you can reopen this any time from the lobby.
      </p>
      <div className="mt-8">
        <ManualContent />
      </div>
    </main>
  );
}
