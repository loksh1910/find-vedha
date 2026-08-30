import { Blade } from "@/components/ui/blade";

export function PlaceholderScreen({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children: string;
}) {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-10 md:px-10">
      <p className="eyebrow">{title}</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
        {title}
      </h1>
      <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-muted">{children}</p>
      <div className="mt-5">
        <Blade colorVar="--line-strong" label="Build" value={phase} />
      </div>
    </div>
  );
}
