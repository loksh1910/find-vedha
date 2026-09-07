import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom } from "@/lib/game/server";
import { resolveAbandoned } from "@/lib/game/engine";
import { type GameSeat } from "@/lib/game/seats";
import type { GameState } from "@/lib/game/types";

/** Any remaining player claims an abandoned Detective pawn (keeps its node + tickets). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    code?: unknown;
    pawnId?: unknown;
  };
  const pawnId = typeof body.pawnId === "string" ? body.pawnId : "";
  if (!/^d[1-5]$/.test(pawnId)) {
    return NextResponse.json({ error: "bad-pawn" }, { status: 400 });
  }
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

  let state = g.state as GameState;
  const seats = (g.seats ?? []) as GameSeat[];
  if (state.status.kind !== "playing") {
    return NextResponse.json({ error: "over" }, { status: 409 });
  }
  if (!state.pawns[pawnId]?.abandoned) {
    return NextResponse.json({ error: "not-abandoned" }, { status: 409 });
  }

  // reassign the pawn to the caller's seat
  const nextSeats: GameSeat[] = seats.map((s) => ({
    ...s,
    pawns: s.pawns.filter((p) => p !== pawnId),
  }));
  let mine = nextSeats.find((s) => s.uid === user.id);
  if (!mine) {
    const nameRow = await admin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    mine = { uid: user.id, name: nameRow.data?.username ?? "Player", pawns: [] };
    nextSeats.push(mine);
  }
  mine.pawns.push(pawnId);

  state = structuredClone(state);
  state.pawns[pawnId].abandoned = false;
  state = resolveAbandoned(state); // no-op unless it was mid-skip

  const { error } = await admin
    .from("games")
    .update({ state, seats: nextSeats, updated_at: new Date().toISOString() })
    .eq("room_id", room.id);
  if (error) {
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
  await pingRoom(room.code);
  return NextResponse.json({ ok: true });
}
