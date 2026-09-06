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
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ *
 *  App state — real Supabase auth (Phase 2), rooms still mock.
 *
 *  `session` keeps its Phase-1 shape ({ username, avatarId }) so every
 *  screen that reads `session?.username` keeps working unchanged; it's
 *  now sourced from the `profiles` table instead of localStorage.
 *  Room create / join are still localStorage until the next step.
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

type AuthResult = { error: string | null };

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
  userId: string | null;
  isSignedIn: boolean;
  isGuest: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (args: {
    email: string;
    password: string;
    username: string;
    avatarId: string;
  }) => Promise<AuthResult>;
  signInAsGuest: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** true when the username is free (and long enough) */
  checkUsername: (username: string) => Promise<boolean>;
  createRoom: (name: string, maxPlayers: number) => MockRoom;
  findRoom: (code: string) => MockRoom | null;
};

const Ctx = createContext<AppState | null>(null);

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with that email already exists — sign in instead.";
  if (m.includes("email not confirmed"))
    return "Confirm your email first — check your inbox.";
  if (m.includes("anonymous")) return "Guest access isn't enabled on the server yet.";
  if (m.includes("password")) return message; // keep length/strength hints verbatim
  return message;
}

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
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<Session | null>(null);

  const loadProfile = useCallback(
    async (uid: string, meta?: Record<string, unknown>) => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_id")
        .eq("id", uid)
        .maybeSingle();
      setProfile(
        data
          ? { username: data.username, avatarId: data.avatar_id }
          : {
              username: (meta?.username as string) || "Player",
              avatarId: (meta?.avatar_id as string) || "tile-1",
            },
      );
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      const user = session?.user;
      if (user) {
        setUserId(user.id);
        setIsGuest(user.is_anonymous ?? false);
        await loadProfile(user.id, user.user_metadata);
      }
      setHydrated(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setUserId(user.id);
        setIsGuest(user.is_anonymous ?? false);
        void loadProfile(user.id, user.user_metadata);
      } else {
        setUserId(null);
        setIsGuest(false);
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const checkUsername = useCallback(
    async (username: string): Promise<boolean> => {
      const u = username.trim();
      if (u.length < 3) return false;
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", u)
        .maybeSingle();
      return !data;
    },
    [supabase],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error ? friendlyAuthError(error.message) : null };
    },
    [supabase],
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      username,
      avatarId,
    }: {
      email: string;
      password: string;
      username: string;
      avatarId: string;
    }): Promise<AuthResult> => {
      const u = username.trim();
      if (u.length < 3 || u.length > 16)
        return { error: "Username must be 3–16 characters." };
      if (!(await checkUsername(u))) return { error: "That username is taken." };
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: u, avatar_id: avatarId } },
      });
      return { error: error ? friendlyAuthError(error.message) : null };
    },
    [supabase, checkUsername],
  );

  const signInAsGuest = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInAnonymously();
    return {
      error: error ? "Guest access isn't enabled on the server yet." : null,
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const createRoom = useCallback(
    (name: string, maxPlayers: number): MockRoom => {
      const room: MockRoom = {
        code: makeCode(),
        name: name.trim() || `${profile?.username ?? "New"}'s room`,
        maxPlayers,
        hostName: profile?.username ?? "You",
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
    [profile],
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
      session: profile,
      userId,
      isSignedIn: !!userId,
      isGuest,
      signInWithPassword,
      signUp,
      signInAsGuest,
      signOut,
      checkUsername,
      createRoom,
      findRoom,
    }),
    [
      hydrated,
      profile,
      userId,
      isGuest,
      signInWithPassword,
      signUp,
      signInAsGuest,
      signOut,
      checkUsername,
      createRoom,
      findRoom,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
