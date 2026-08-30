"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AuthShell, Field, inputClass } from "@/components/shell/auth-shell";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAppState } from "@/components/providers/app-state-provider";
import { cn } from "@/lib/cn";

const AVATARS = ["tile-1", "tile-2", "tile-3", "tile-4", "tile-5", "tile-6"];

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAppState();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState(AVATARS[0]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    signIn(name || "Player", avatarId);
    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Pick a name and a tile — that's your identity across games."
      footer={
        <>
          Already have one?{" "}
          <Link href="/login" className="text-signal hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input className={inputClass} type="email" placeholder="you@example.com" />
        </Field>
        <Field label="Username" hint="Shown to other players. 3–16 characters.">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. arjun_r"
            autoFocus
          />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" placeholder="••••••••" />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm text-muted">Avatar</span>
          <div className="flex gap-2">
            {AVATARS.map((id) => {
              const selected = id === avatarId;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Avatar ${id.slice(5)}`}
                  onClick={() => setAvatarId(id)}
                  className={cn(
                    "relative rounded-md p-0.5",
                    selected ? "ring-2 ring-signal" : "ring-1 ring-line hover:ring-line-strong",
                  )}
                >
                  <Avatar name={name || "You"} avatarId={id} size={38} />
                  {selected && (
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-signal text-signal-ink">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-faint">
          <input type="checkbox" className="mt-0.5 accent-[var(--signal)]" defaultChecked />
          <span>I agree to the (placeholder) terms and privacy notice.</span>
        </label>

        <Button type="submit" variant="primary" className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
