import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom, recordMatch } from "@/lib/game/server";
import { resolveAbandoned } from "@/lib/game/engine";
import { type GameSeat } from "@/lib/game/seats";
import type { GameState } from "@/lib/game/types";

/**
 * A player leaves a networked game.
 *  - Vedha's controller  → game over, Detectives win ("Vedha left the game").
 *  - a Detective's controller → their pawn(s) go `abandoned`: skipped in the
 *    rotation, count as stuck for win checks, and can be taken over by anyone.
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
  if (!g) return NextResponse.json({ ok: true, noGame: true });

  let state = g.state as GameState;
  const seats = (g.seats ?? []) as GameSeat[];
  if (state.status.kind !== "playing") {
    return NextResponse.json({ ok: true, alreadyOver: true });
  }

  const mine = seats.find((s) => s.uid === user.id)?.pawns ?? [];
  if (mine.length === 0) return NextResponse.json({ ok: true, notPlaying: true });

  if (mine.includes("vedha")) {
    state = {
      ...state,
      status: {
        kind: "over",
        winner: "detective",
        reason: "Vedha left the game",
        round: state.round,
      },
    };
  } else {
    state = structuredClone(state);
    for (const pid of mine) {
      if (state.pawns[pid]) state.pawns[pid].abandoned = true;
    }
    state = resolveAbandoned(state);
  }

  const over = state.status.kind === "over";
  const { error } = await admin
    .from("games")
    .update({ state, updated_at: new Date().toISOString() })
    .eq("room_id", room.id);
  if (error) {
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
  if (over) {
    await admin.from("rooms").update({ status: "over" }).eq("id", room.id);
    await recordMatch(admin, room.id, room.code, g.seed as number | null, state, seats);
  }
  await pingRoom(room.code);
  return NextResponse.json({ ok: true, over });
}
