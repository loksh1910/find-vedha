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
 *  App state — real Supabase auth + rooms (Phase 2).
 *
 *  `session` keeps its Phase-1 shape ({ username, avatarId }) so every
 *  screen that reads `session?.username` keeps working unchanged; it's
 *  now sourced from the `profiles` table. Rooms are real DB rows; the
 *  in-lobby claim/ready machine is still local until the next step.
 * ------------------------------------------------------------------ */

export type Session = {
  username: string;
  avatarId: string;
};

export type Room = {
  id: string;
  code: string;
  name: string;
  maxPlayers: number;
  hostId: string;
  hostName: string;
  status: string;
  createdAt: number;
};

type AuthResult = { error: string | null };
type CreateResult = { room: Room | null; error: string | null };
type JoinResult =
  | { ok: true; room: Room }
  | {
      ok: false;
      reason: "invalid" | "not-found" | "full" | "started" | "error";
      message: string;
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
  createRoom: (name: string, maxPlayers: number) => Promise<CreateResult>;
  /** join by code — adds the caller to the room; carries the failure reason */
  joinRoom: (code: string) => Promise<JoinResult>;
  /** read a room the caller already belongs to (lobby display) */
  findRoom: (code: string) => Promise<Room | null>;
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

type RoomRow = {
  id: string;
  code: string;
  name: string;
  max_players: number;
  host_id: string;
  status: string;
  created_at: string;
};

function toRoom(r: RoomRow, hostName: string): Room {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    maxPlayers: r.max_players,
    hostId: r.host_id,
    hostName,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
  };
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

  const findRoom = useCallback(
    async (code: string): Promise<Room | null> => {
      const clean = code.trim().toUpperCase();
      if (!clean) return null;
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", clean)
        .maybeSingle();
      if (error || !data) return null;
      const { data: host } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", (data as RoomRow).host_id)
        .maybeSingle();
      return toRoom(data as RoomRow, host?.username ?? "Host");
    },
    [supabase],
  );

  const createRoom = useCallback(
    async (name: string, maxPlayers: number): Promise<CreateResult> => {
      if (!userId) return { room: null, error: "Sign in to make a room." };
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await supabase
          .from("rooms")
          .insert({
            code: makeCode(),
            name: name.trim() || `${profile?.username ?? "New"}'s room`,
            host_id: userId,
            max_players: maxPlayers,
          })
          .select("*")
          .single();
        if (error) {
          if (error.code === "23505") continue; // code collision — try another
          return { room: null, error: "Couldn't create the room. Try again." };
        }
        await supabase
          .from("room_members")
          .insert({ room_id: (data as RoomRow).id, user_id: userId });
        return {
          room: toRoom(data as RoomRow, profile?.username ?? "You"),
          error: null,
        };
      }
      return { room: null, error: "Couldn't get a free code. Try again." };
    },
    [supabase, userId, profile],
  );

  const joinRoom = useCallback(
    async (code: string): Promise<JoinResult> => {
      if (!userId)
        return { ok: false, reason: "error", message: "Sign in to join a room." };
      const clean = code.trim().toUpperCase();
      if (clean.length < 6)
        return { ok: false, reason: "invalid", message: "A code is six characters." };

      const { data: rows, error } = await supabase.rpc("room_by_code", {
        p_code: clean,
      });
      if (error)
        return { ok: false, reason: "error", message: "Couldn't reach the server." };
      const found = (rows as { id: string; status: string; max_players: number; member_count: number }[] | null)?.[0];
      if (!found)
        return {
          ok: false,
          reason: "not-found",
          message: "That code doesn't match a room. Check it with your host.",
        };
      if (found.status !== "roster" && found.status !== "selecting")
        return {
          ok: false,
          reason: "started",
          message: "That game has already started.",
        };
      if (Number(found.member_count) >= found.max_players)
        return { ok: false, reason: "full", message: "That room is full." };

      const { error: joinErr } = await supabase
        .from("room_members")
        .upsert(
          { room_id: found.id, user_id: userId },
          { onConflict: "room_id,user_id", ignoreDuplicates: true },
        );
      if (joinErr)
        return { ok: false, reason: "error", message: "Couldn't join. Try again." };

      const room = await findRoom(clean);
      if (!room)
        return { ok: false, reason: "error", message: "Couldn't load the room." };
      return { ok: true, room };
    },
    [supabase, userId, findRoom],
  );

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
      joinRoom,
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
      joinRoom,
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
