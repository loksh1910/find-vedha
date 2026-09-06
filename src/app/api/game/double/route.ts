import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom } from "@/lib/game/server";
import { canDoubleMove, declareDoubleMove } from "@/lib/game/engine";
import { controlsPawn, type GameSeat } from "@/lib/game/seats";
import type { GameState } from "@/lib/game/types";

/** Vedha's controller declares a Double-Move before their next hop. */
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
    .select("state, seats")
    .eq("room_id", room.id)
    .maybeSingle();
  if (!g) return NextResponse.json({ error: "no-game" }, { status: 404 });

  const state = g.state as GameState;
  const seats = (g.seats ?? []) as GameSeat[];

  if (!controlsPawn(seats, user.id, "vedha")) {
    return NextResponse.json({ error: "not-vedha" }, { status: 403 });
  }
  if (!canDoubleMove(state)) {
    return NextResponse.json({ error: "cant-double" }, { status: 409 });
  }

  const next = declareDoubleMove(state);
  const { error } = await admin
    .from("games")
    .update({ state: next, updated_at: new Date().toISOString() })
    .eq("room_id", room.id);
  if (error) {
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
  await pingRoom(room.code);
  return NextResponse.json({ ok: true });
}
