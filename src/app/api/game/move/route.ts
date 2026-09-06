import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom } from "@/lib/game/server";
import { applyMove, legalMoves } from "@/lib/game/engine";
import { controlsPawn, type GameSeat } from "@/lib/game/seats";
import type { GameState } from "@/lib/game/types";

type MoveInput = { pawnId?: string; to?: number; transport?: string; via?: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    code?: unknown;
    move?: MoveInput;
  };
  const ctx = await roomContext(body.code);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { user, room } = ctx;
  const mv = body.move ?? {};
  if (typeof mv.pawnId !== "string" || typeof mv.to !== "number") {
    return NextResponse.json({ error: "bad-move" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "over" }, { status: 409 });
  }
  if (state.turn !== mv.pawnId) {
    return NextResponse.json({ error: "not-your-turn" }, { status: 409 });
  }
  if (!controlsPawn(seats, user.id, mv.pawnId)) {
    return NextResponse.json({ error: "not-your-pawn" }, { status: 403 });
  }

  const legal = legalMoves(state, mv.pawnId);
  const chosen = legal.find(
    (m) =>
      m.to === mv.to &&
      m.transport === mv.transport &&
      (mv.via === undefined || m.via === mv.via),
  );
  if (!chosen) {
    return NextResponse.json({ error: "illegal-move" }, { status: 422 });
  }

  const next = applyMove(state, chosen);
  const { error } = await admin
    .from("games")
    .update({ state: next, updated_at: new Date().toISOString() })
    .eq("room_id", room.id);
  if (error) {
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
  if (next.status.kind === "over") {
    await admin.from("rooms").update({ status: "over" }).eq("id", room.id);
    await recordMatch(admin, room.id, room.code, g.seed as number | null, next, seats);
  }
  await pingRoom(room.code);
  return NextResponse.json({ ok: true });
}

/** Archive a finished online game for the Results screen / history / stats. */
async function recordMatch(
  admin: ReturnType<typeof createAdminClient>,
  roomId: string,
  code: string,
  seed: number | null,
  state: GameState,
  seats: GameSeat[],
) {
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
