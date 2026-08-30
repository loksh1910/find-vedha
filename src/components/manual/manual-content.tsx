import { Car, Bus, TrainFront } from "lucide-react";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-0 first:pt-0">
      <h3 className="eyebrow mb-2">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-muted [&_b]:font-medium [&_b]:text-text">
        {children}
      </div>
    </section>
  );
}

function Ticket({
  colorVar,
  icon,
  name,
  detail,
}: {
  colorVar: string;
  icon: ReactNode;
  name: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-line bg-surface px-3 py-2">
      <span
        className="grid h-7 w-7 place-items-center rounded-sm"
        style={{ background: `color-mix(in oklab, var(${colorVar}) 22%, transparent)`, color: `var(${colorVar})` }}
      >
        {icon}
      </span>
      <div className="text-sm">
        <div className="text-text">{name}</div>
        <div className="font-mono text-[0.6875rem] text-faint">{detail}</div>
      </div>
    </div>
  );
}

export function ManualContent() {
  return (
    <div className="space-y-5">
      <Section title="The idea">
        <p>
          One player is <b>Vedha</b>, hidden somewhere on the Chennai map. Everyone
          else runs the <b>Detectives</b> — five pawns trying to land on
          Vedha&apos;s exact stop before <b>round 24</b>.
        </p>
        <p>
          Everyone knows <i>who</i> Vedha is. Nobody except Vedha knows <i>where</i>{" "}
          Vedha is — until a reveal round.
        </p>
      </Section>

      <Section title="Moving">
        <p>
          Every stop is connected by one or more transport lines. Spend a matching
          ticket to move one stop along a line. You <b>must</b> move on your turn —
          no staying put.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Ticket colorVar="--t-auto" icon={<Car size={15} />} name="Auto" detail="yellow lines" />
          <Ticket colorVar="--t-bus" icon={<Bus size={15} />} name="Bus" detail="green lines" />
          <Ticket colorVar="--t-metro" icon={<TrainFront size={15} />} name="Metro" detail="red lines" />
        </div>
        <p>
          A few long <b>river crossings</b> (dashed lines) connect distant stops —
          only Vedha can take them, and only with a Wildcard.
        </p>
      </Section>

      <Section title="Tickets to start">
        <p>
          <b>Each Detective pawn:</b> 10 Auto · 8 Bus · 4 Metro.
        </p>
        <p>
          <b>Vedha:</b> 4 Auto · 3 Bus · 3 Metro · 5 Wildcard · 2 Double-Move.
        </p>
        <p>
          <b>Wildcard</b> — works on any line, hides which line was used from the
          Detectives, and is the only way across a river crossing.{" "}
          <b>Double-Move</b> — take two stops in a row before the Detectives
          respond.
        </p>
        <p>
          Every ticket a Detective spends is handed to Vedha — so Vedha&apos;s
          Auto, Bus and Metro supply grows as the game goes on. (Wildcards and
          Double-Moves are not.)
        </p>
      </Section>

      <Section title="Hidden movement & reveals">
        <p>
          Vedha&apos;s stop is never shown. After each Vedha move the Detectives
          see only the transport type used (or nothing, on a Wildcard).
        </p>
        <p>
          On rounds <b>3, 8, 13, 18 and 24</b> Vedha&apos;s exact stop is shown to
          everyone, then hidden again on Vedha&apos;s next move.
        </p>
      </Section>

      <Section title="Turns">
        <p>
          Vedha moves first each round, then the Detectives move one at a time. A
          Detective can&apos;t move onto a stop another Detective is on. A
          Detective with no usable ticket is <b>stuck</b> for the rest of the game
          and is skipped.
        </p>
      </Section>

      <Section title="Winning">
        <p>
          <b>Detectives win</b> the moment any Detective lands on Vedha&apos;s
          exact stop.
        </p>
        <p>
          <b>Vedha wins</b> by surviving through round 24 — or if every Detective
          gets stuck first.
        </p>
      </Section>
    </div>
  );
}
