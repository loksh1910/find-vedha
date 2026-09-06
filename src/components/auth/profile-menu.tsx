"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/components/providers/app-state-provider";

/** Avatar → dropdown → "Log out" → confirm dialog → actually sign out. */
export function ProfileMenu() {
  const { session, signOut } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div ref={wrapRef} className="relative ml-1">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={menuOpen}
        className="block rounded-full ring-1 ring-line-strong transition hover:ring-signal"
      >
        <Avatar name={session?.username ?? "You"} avatarId={session?.avatarId} size={32} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-md border border-line-strong bg-surface shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)]">
          <div className="border-b border-line px-3 py-2">
            <div className="truncate text-sm text-text">{session?.username ?? "You"}</div>
            <div className="font-mono text-[0.625rem] text-faint">Signed in</div>
          </div>
          <button
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-danger"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Log out?"
        description="You'll need to sign in again to start or join a game."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setConfirmOpen(false);
              signOut();
            }}
          >
            <LogOut size={14} />
            Confirm logout
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
