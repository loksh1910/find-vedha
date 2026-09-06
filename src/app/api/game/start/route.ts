import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom } from "@/lib/game/server";
import { createGame } from "@/lib/game/engine";
import { seatsFromClaims } from "@/lib/game/seats";

/** Host-only: create (or, with force, re-create) the room's game row. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    code?: unknown;
    force?: unknown;
  };
  const ctx = await roomContext(body.code);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { user, room } = ctx;
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: "not-host" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("games")
    .select("room_id")
    .eq("room_id", room.id)
    .maybeSingle();
  if (existing && !body.force) {
    return NextResponse.json({ ok: true, already: true });
  }

  const claims = (room.claims ?? {}) as Record<string, string>;
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
