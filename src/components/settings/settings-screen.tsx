"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  useSettings,
  type Motion,
  type Contrast,
} from "@/components/providers/settings-provider";
import { cn } from "@/lib/cn";

const TILES = Array.from({ length: 8 }, (_, i) => `tile-${i + 1}`);
const VOL_STEPS = [
  { label: "Quiet", v: 35 },
  { label: "Medium", v: 70 },
  { label: "Loud", v: 100 },
];

export function SettingsScreen() {
  const router = useRouter();
  const { session, isGuest, signOut, updateProfile } = useAppState();
  const s = useSettings();

  return (
    <div className="mx-auto max-w-[680px] px-6 py-8 md:px-10">
      <header className="mb-6">
        <p className="eyebrow">Settings</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
          Settings
        </h1>
      </header>

      <div className="space-y-7">
        {/* appearance */}
        <Section title="Appearance">
          <Row label="Motion" hint="How much the board and screens animate.">
            <Segmented<Motion>
              value={s.motion}
              onChange={(v) => s.set("motion", v)}
              options={[
                ["full", "Full"],
                ["reduced", "Reduced"],
                ["off", "Off"],
              ]}
            />
          </Row>
          <Row label="Board contrast" hint="Bump the map's lines and ground.">
            <Segmented<Contrast>
              value={s.contrast}
              onChange={(v) => s.set("contrast", v)}
              options={[
                ["normal", "Normal"],
                ["high", "High"],
              ]}
            />
          </Row>
          <p className="px-4 pb-3 font-mono text-[0.7rem] text-faint">
            Find Vedha is dark only — there&apos;s no light theme.
          </p>
        </Section>

        {/* sound */}
        <Section title="Sound">
          <Row label="Sound effects" hint="Move, reveal and catch cues.">
            <Switch
              checked={s.sfx}
              onCheckedChange={(v) => s.set("sfx", v)}
              aria-label="Sound effects"
            />
          </Row>
          <Row label="Volume">
            <Segmented<number>
              value={VOL_STEPS.reduce((a, x) => (Math.abs(x.v - s.sfxVol) < Math.abs(a - s.sfxVol) ? x.v : a), 70)}
              onChange={(v) => s.set("sfxVol", v)}
              options={VOL_STEPS.map((x) => [x.v, x.label] as [number, string])}
              disabled={!s.sfx}
            />
          </Row>
          <p className="px-4 pb-3 font-mono text-[0.7rem] text-faint">
            Music comes with the sound pass.
          </p>
        </Section>

        {/* account */}
        <Section title="Account">
          {isGuest ? (
            <p className="px-4 py-4 text-sm text-muted">
              You&apos;re playing as a guest. Create an account to keep a
              username, avatar and stats.
            </p>
          ) : (
            <>
              <AvatarRow
                current={session?.avatarId ?? "tile-1"}
                name={session?.username ?? "You"}
                onPick={(id) => void updateProfile({ avatarId: id })}
              />
              <UsernameRow
                current={session?.username ?? ""}
                onSave={(u) => updateProfile({ username: u })}
              />
            </>
          )}
          <Row label="Sign out">
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              <LogOut size={13} />
              Sign out
            </Button>
          </Row>
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="eyebrow mb-2.5">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-text">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-md border border-line-strong",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn(
            "px-2.5 py-1 font-mono text-xs transition-colors",
            value === v
              ? "bg-surface-2 text-text"
              : "text-muted hover:text-text",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AvatarRow({
  current,
  name,
  onPick,
}: {
  current: string;
  name: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-sm text-text">Avatar</div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {TILES.map((id) => (
          <button
            key={id}
            onClick={() => onPick(id)}
            aria-label={`Avatar ${id}`}
            aria-pressed={current === id}
            className={cn(
              "rounded-md ring-2 ring-offset-2 ring-offset-surface transition-shadow",
              current === id ? "ring-signal" : "ring-transparent hover:ring-line-strong",
            )}
          >
            <Avatar name={name} avatarId={id} size={34} />
          </button>
        ))}
      </div>
    </div>
  );
}

function UsernameRow({
  current,
  onSave,
}: {
  current: string;
  onSave: (u: string) => Promise<{ error: string | null }>;
}) {
  const [value, setValue] = useState(current);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = value.trim() !== current && value.trim().length >= 3;

  return (
    <div className="px-4 py-3">
      <div className="text-sm text-text">Username</div>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNote(null);
          }}
          maxLength={16}
          className="h-9 flex-1 rounded-md border border-line-strong bg-bg-inset px-3 text-sm text-text focus:border-signal focus:outline-none"
        />
        <Button
          size="sm"
          variant="primary"
          disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            const { error } = await onSave(value.trim());
            setBusy(false);
            setNote(error ?? "Saved.");
          }}
        >
          {busy ? "Saving…" : <Check size={13} />}
          {busy ? null : "Save"}
        </Button>
      </div>
      {note && (
        <p
          className={cn(
            "mt-1.5 font-mono text-[0.7rem]",
            note === "Saved." ? "text-ok" : "text-danger",
          )}
        >
          {note}
        </p>
      )}
    </div>
  );
}
