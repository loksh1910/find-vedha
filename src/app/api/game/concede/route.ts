import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom, recordMatch } from "@/lib/game/server";
import { type GameSeat } from "@/lib/game/seats";
import type { GameState } from "@/lib/game/types";

/**
 * End a stalled game because Vedha has dropped — any Detective in the room can
 * call it from the "Vedha disconnected" overlay. Vedha's own controller can't
 * (they'd use /api/game/leave instead).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const ctx = await roomContext(body.code);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { user, room } = ctx;

  const admin = createAdminClient();
  const { data: g } = await admin
    .from("games")
    .select("state, seats, seed")
    .eq("room_id", room.id)
    .maybeSingle();
  if (!g) return NextResponse.json({ error: "no-game" }, { status: 404 });

  const state = g.state as GameState;
  const seats = (g.seats ?? []) as GameSeat[];
  if (state.status.kind !== "playing") {
    return NextResponse.json({ ok: true, alreadyOver: true });
  }
  const mine = seats.find((s) => s.uid === user.id)?.pawns ?? [];
  if (mine.includes("vedha")) {
    return NextResponse.json({ error: "vedha-cannot-concede" }, { status: 403 });
  }

  const next: GameState = {
    ...state,
    status: {
      kind: "over",
      winner: "detective",
      reason: "Vedha left the game",
      round: state.round,
    },
  };

  const { error } = await admin
    .from("games")
    .update({ state: next, updated_at: new Date().toISOString() })
    .eq("room_id", room.id);
  if (error) {
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
  await admin.from("rooms").update({ status: "over" }).eq("id", room.id);
  await recordMatch(admin, room.id, room.code, g.seed as number | null, next, seats);
  await pingRoom(room.code);
  return NextResponse.json({ ok: true });
}
