"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 *  Mock, client-only app state. No backend (Phase 1).
 *  Session + created rooms live in localStorage so the flow survives
 *  reloads and Join can validate a code that Create just generated.
 * ------------------------------------------------------------------ */

export type Session = {
  username: string;
  avatarId: string;
};

export type MockRoom = {
  code: string;
  name: string;
  maxPlayers: number;
  hostName: string;
  createdAt: number;
};

const SESSION_KEY = "fv.session";
const ROOMS_KEY = "fv.rooms";

/** Always-valid demo code so Join can be tried without creating a room first. */
export const DEMO_ROOM: MockRoom = {
  code: "VEDHA7",
  name: "Sunday night chase",
  maxPlayers: 6,
  hostName: "Karthik",
  createdAt: 0,
};

type AppState = {
  hydrated: boolean;
  session: Session | null;
  isSignedIn: boolean;
  signIn: (username: string, avatarId?: string) => void;
  signOut: () => void;
  createRoom: (name: string, maxPlayers: number) => MockRoom;
  findRoom: (code: string) => MockRoom | null;
};

const Ctx = createContext<AppState | null>(null);

function readRooms(): MockRoom[] {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    const list = raw ? (JSON.parse(raw) as MockRoom[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function makeCode(): string {
  // 6 chars, no ambiguous 0/O/1/I
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // One-time hydration from localStorage on mount. A lazy useState initializer
    // can't be used here (no localStorage during SSR → hydration mismatch).
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* ignore */
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const signIn = useCallback((username: string, avatarId = "tile-1") => {
    const next: Session = { username: username.trim() || "Player", avatarId };
    setSession(next);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const createRoom = useCallback(
    (name: string, maxPlayers: number): MockRoom => {
      const room: MockRoom = {
        code: makeCode(),
        name: name.trim() || `${session?.username ?? "New"}'s room`,
        maxPlayers,
        hostName: session?.username ?? "You",
        createdAt: Date.now(),
      };
      try {
        const list = readRooms();
        list.push(room);
        localStorage.setItem(ROOMS_KEY, JSON.stringify(list.slice(-20)));
      } catch {
        /* ignore */
      }
      return room;
    },
    [session],
  );

  const findRoom = useCallback((code: string): MockRoom | null => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    if (clean === DEMO_ROOM.code) return DEMO_ROOM;
    return readRooms().find((r) => r.code === clean) ?? null;
  }, []);

  const value = useMemo<AppState>(
    () => ({
      hydrated,
      session,
      isSignedIn: !!session,
      signIn,
      signOut,
      createRoom,
      findRoom,
    }),
    [hydrated, session, signIn, signOut, createRoom, findRoom],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
