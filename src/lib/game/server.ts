import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { GameState } from "@/lib/game/types";
import type { GameSeat } from "@/lib/game/seats";

type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  status: string;
  claims: Record<string, string>;
};

type Ctx =
  | { error: string; status: number }
  | {
      user: { id: string };
      room: RoomRow;
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

/** Auth + room membership gate shared by the /api/game/* routes. */
export async function roomContext(codeRaw: unknown): Promise<Ctx> {
  const code = typeof codeRaw === "string" ? codeRaw.toUpperCase() : "";
  if (!/^[A-Z0-9]{4,10}$/.test(code)) return { error: "bad-code", status: 400 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized", status: 401 };

  const { data: room } = await supabase
    .from("rooms")
    .select("id, code, host_id, status, claims")
    .eq("code", code)
    .maybeSingle();
  if (!room) return { error: "no-room", status: 404 };

  const { data: member } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "not-a-member", status: 403 };

  return { user: { id: user.id }, room: room as RoomRow, supabase };
}

/** Contentless nudge on room:<code> — clients re-fetch via get_game(). */
export async function pingRoom(code: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `room:${code.toUpperCase()}`,
            event: "game",
            payload: { t: Date.now() },
            private: false,
          },
        ],
      }),
    });
  } catch {
    /* the client also polls on focus, so a missed ping self-heals */
  }
}

/** Archive a finished online game for the Results screen / history / stats. */
export async function recordMatch(
  admin: ReturnType<typeof createAdminClient>,
  roomId: string,
  code: string,
  seed: number | null,
  state: GameState,
  seats: GameSeat[],
): Promise<void> {
  if (state.status.kind !== "over") return;
  const { winner, reason, round, caughtAt } = state.status;

  let caughtBy: string | null = null;
  if (typeof caughtAt === "number") {
    const hit = Object.values(state.pawns).find(
      (p) => p.role === "detective" && p.node === caughtAt,
    );
    caughtBy = hit?.id ?? null;
  }
  const caughtByUid =
    (caughtBy && seats.find((s) => s.pawns.includes(caughtBy!))?.uid) || null;
  const playerIds = [...new Set(seats.map((s) => s.uid).filter(Boolean))];

  await admin.from("matches").upsert(
    {
      room_id: roomId,
      code,
      mode: "online",
      seed,
      winner,
      reason,
      rounds: round,
      caught_at: caughtAt ?? null,
      caught_by: caughtBy,
      caught_by_uid: caughtByUid,
      player_ids: playerIds,
      state,
      seats,
    },
    { onConflict: "room_id,seed", ignoreDuplicates: true },
  );
}
