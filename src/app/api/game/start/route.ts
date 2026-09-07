import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom } from "@/lib/game/server";
import { createGame } from "@/lib/game/engine";
import { seatsFromClaims, type GameSeat } from "@/lib/game/seats";
import type { GameState } from "@/lib/game/types";

const slotOf = (pawn: string) => (pawn === "vedha" ? "vedha" : `t${pawn.slice(1)}`);

/**
 * Create the room's game row.
 *  - lobby start (no `force`) → host only, and no-ops if a game already exists.
 *  - `force` (rematch / new game) → any member, as long as no game is in
 *    progress. `fromMatch` re-deals the exact roster of a finished match
 *    (re-adding anyone who had left the room).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    code?: unknown;
    force?: unknown;
    fromMatch?: unknown;
  };
  const force = !!body.force || typeof body.fromMatch === "string";
  const ctx = await roomContext(body.code);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { user, room } = ctx;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("games")
    .select("room_id, state")
    .eq("room_id", room.id)
    .maybeSingle();
  const existingOver =
    !existing || (existing.state as GameState).status.kind === "over";

  if (!force) {
    if (room.host_id !== user.id) {
      return NextResponse.json({ error: "not-host" }, { status: 403 });
    }
    if (existing) return NextResponse.json({ ok: true, already: true });
  } else if (room.host_id !== user.id && !existingOver) {
    // a non-host can only rematch once the current game has finished
    return NextResponse.json({ error: "game-in-progress" }, { status: 409 });
  }

  // ---- work out the roster ----
  let claims: Record<string, string>;
  if (typeof body.fromMatch === "string") {
    const { data: m } = await admin
      .from("matches")
      .select("seats, player_ids")
      .eq("id", body.fromMatch)
      .maybeSingle();
    if (!m || !(m.player_ids as string[]).includes(user.id)) {
      return NextResponse.json({ error: "bad-match" }, { status: 404 });
    }
    const seats = (m.seats ?? []) as GameSeat[];
    claims = {};
    for (const s of seats) {
      if (!s.uid) continue;
      for (const p of s.pawns) claims[slotOf(p)] = s.uid;
    }
    // re-add anyone who had left the room
    const memberRows = seats
      .filter((s) => s.uid && s.uid !== "00000000-0000-0000-0000-000000000000")
      .map((s) => ({ room_id: room.id, user_id: s.uid }));
    if (memberRows.length) {
      await admin
        .from("room_members")
        .upsert(memberRows, { onConflict: "room_id,user_id", ignoreDuplicates: true });
    }
    await admin.from("rooms").update({ claims }).eq("id", room.id);
  } else {
    claims = (room.claims ?? {}) as Record<string, string>;
  }

  const uids = [...new Set(Object.values(claims).filter(Boolean))];
  const { data: profs } = await admin
    .from("profiles")
    .select("id, username")
    .in("id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
  const names = Object.fromEntries(
    (profs ?? []).map((p) => [p.id, p.username as string]),
  );
  const seats = seatsFromClaims(claims, names);

  const seed = Date.now();
  const state = createGame(seed);

  const { error } = await admin
    .from("games")
    .upsert({ room_id: room.id, seed, state, seats, updated_at: new Date().toISOString() });
  if (error) {
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
  await admin.from("rooms").update({ status: "playing" }).eq("id", room.id);
  await pingRoom(room.code);
  return NextResponse.json({ ok: true });
}
