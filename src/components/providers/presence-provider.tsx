"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "./app-state-provider";
import { InviteToasts } from "@/components/shell/invite-toasts";

export type PresenceStatus = "offline" | "online" | "in-lobby" | "in-game";

type Meta = { status: Exclude<PresenceStatus, "offline">; code?: string; at: number };

export type Invite = {
  id: string;
  fromUid: string;
  fromName: string;
  code: string;
  at: number;
};

type Ctx = {
  /** current status of a user by id (from the global presence channel) */
  statusOf: (uid: string) => { status: PresenceStatus; code?: string };
  /** the room code the viewer is currently in a lobby for, else null */
  myLobbyCode: string | null;
  /** send a lobby invite to a friend (only lands if the viewer is in a lobby) */
  invite: (toUid: string) => void;
  /** inbound invites not yet acted on */
  invites: Invite[];
  dismissInvite: (id: string) => void;
};

const PresenceCtx = createContext<Ctx | null>(null);

const RANK: Record<Meta["status"], number> = { online: 1, "in-lobby": 2, "in-game": 3 };

/** derive what the viewer is doing from the route */
function statusFromPath(path: string | null): Meta {
  const m = path?.match(/^\/room\/([^/]+)(\/play)?/);
  if (!m) return { status: "online", at: Date.now() };
  const code = decodeURIComponent(m[1]).toUpperCase();
  return { status: m[2] ? "in-game" : "in-lobby", code, at: Date.now() };
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { userId, session } = useAppState();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [peers, setPeers] = useState<Record<string, Meta[]>>({});
  const [invites, setInvites] = useState<Invite[]>([]);
  const chanRef = useRef<RealtimeChannel | null>(null);
  const userChanRef = useRef<RealtimeChannel | null>(null);
  const meta = statusFromPath(pathname);
  const metaKey = `${meta.status}:${meta.code ?? ""}`;

  // global presence channel
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const chan = supabase.channel("presence:global", {
      config: { presence: { key: userId } },
    });
    chan
      .on("presence", { event: "sync" }, () => {
        if (!alive) return;
        const state = chan.presenceState<Meta>();
        const next: Record<string, Meta[]> = {};
        for (const [k, metas] of Object.entries(state)) next[k] = metas as Meta[];
        setPeers(next);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void chan.track(statusFromPath(pathname));
        }
      });
    chanRef.current = chan;
    return () => {
      alive = false;
      void supabase.removeChannel(chan);
      chanRef.current = null;
    };
    // re-join only when the user changes; status updates go through the next effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId]);

  // push status updates as the route changes
  useEffect(() => {
    const chan = chanRef.current;
    if (!chan || !userId) return;
    void chan.track(meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaKey, userId]);

  // personal channel for inbound invites
  useEffect(() => {
    if (!userId) return;
    const chan = supabase
      .channel(`user:${userId}`)
      .on("broadcast", { event: "invite" }, ({ payload }) => {
        const p = payload as { fromUid: string; fromName: string; code: string };
        setInvites((cur) => {
          if (cur.some((i) => i.fromUid === p.fromUid && i.code === p.code)) return cur;
          return [
            ...cur,
            {
              id:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${Date.now()}`,
              fromUid: p.fromUid,
              fromName: p.fromName,
              code: p.code,
              at: Date.now(),
            },
          ].slice(-4);
        });
      })
      .subscribe();
    userChanRef.current = chan;
    return () => {
      void supabase.removeChannel(chan);
      userChanRef.current = null;
    };
  }, [supabase, userId]);

  // expire invites after 90s
  useEffect(() => {
    if (invites.length === 0) return;
    const t = setInterval(() => {
      setInvites((cur) => cur.filter((i) => Date.now() - i.at < 90_000));
    }, 5_000);
    return () => clearInterval(t);
  }, [invites.length]);

  const statusOf = useCallback(
    (uid: string): { status: PresenceStatus; code?: string } => {
      const metas = peers[uid];
      if (!metas || metas.length === 0) return { status: "offline" };
      const best = metas.reduce((a, b) => (RANK[b.status] > RANK[a.status] ? b : a));
      return { status: best.status, code: best.code };
    },
    [peers],
  );

  const myLobbyCode = meta.status === "in-lobby" ? (meta.code ?? null) : null;

  const invite = useCallback(
    (toUid: string) => {
      if (!userId || !myLobbyCode) return;
      void supabase.channel(`user:${toUid}`).send({
        type: "broadcast",
        event: "invite",
        payload: {
          fromUid: userId,
          fromName: session?.username ?? "A friend",
          code: myLobbyCode,
        },
      });
    },
    [supabase, userId, session?.username, myLobbyCode],
  );

  const dismissInvite = useCallback(
    (id: string) => setInvites((cur) => cur.filter((i) => i.id !== id)),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({ statusOf, myLobbyCode, invite, invites, dismissInvite }),
    [statusOf, myLobbyCode, invite, invites, dismissInvite],
  );

  return (
    <PresenceCtx.Provider value={value}>
      {children}
      <InviteToasts invites={invites} onDismiss={dismissInvite} />
    </PresenceCtx.Provider>
  );
}

export function usePresence(): Ctx {
  const ctx = useContext(PresenceCtx);
  if (!ctx) throw new Error("usePresence must be used inside <PresenceProvider>");
  return ctx;
}

/** short label + colour token for a status */
export function presenceLabel(
  status: PresenceStatus,
  code?: string,
): { text: string; tone: "ok" | "signal" | "reveal" | "faint" } | null {
  switch (status) {
    case "in-lobby":
      return { text: code ? `In a lobby · ${code}` : "In a lobby", tone: "signal" };
    case "in-game":
      return { text: "In a game", tone: "reveal" };
    case "online":
      return { text: "Online", tone: "ok" };
    default:
      return null;
  }
}
