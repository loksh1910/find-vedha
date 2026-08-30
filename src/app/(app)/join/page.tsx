"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedInput } from "@/components/ui/segmented-input";
import { useAppState } from "@/components/providers/app-state-provider";

export default function JoinPage() {
  const router = useRouter();
  const { findRoom } = useAppState();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function tryJoin(value: string) {
    const clean = value.trim().toUpperCase();
    if (clean.length < 6) {
      setError("A code is six characters.");
      return;
    }
    const room = findRoom(clean);
    if (!room) {
      setError("That code doesn't match a room. Check it with your host.");
      return;
    }
    router.push(`/room/${room.code}`);
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-[440px] place-items-center px-6">
      <div className="w-full">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>

        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text">
          Join a room
        </h1>
        <p className="mt-1 text-sm text-muted">Enter the code your host shared.</p>

        <div className="mt-6 rounded-lg border border-line-strong bg-surface p-5">
          <SegmentedInput
            value={code}
            onChange={(v) => {
              setCode(v);
              setError(null);
            }}
            onComplete={tryJoin}
            invalid={!!error}
          />
          <p className={error ? "mt-3 text-xs text-danger" : "mt-3 text-xs text-faint"}>
            {error ?? "Demo code: VEDHA7"}
          </p>
          <Button
            variant="primary"
            className="mt-4 w-full"
            disabled={code.length < 6}
            onClick={() => tryJoin(code)}
          >
            Join lobby
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
