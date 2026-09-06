import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomContext, pingRoom } from "@/lib/game/server";

/**
 * Host-only: tear the finished game down and return the room to a fresh
 * lobby (roster) so the same players can re-pick roles and play again.
 * Called by "Exit game" on the game-over screen.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const ctx = await roomContext(body.code);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { user, room } = ctx;
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: "not-host" }, { status: 403 });
  }

  const admin = createAdminClient();
  await admin.from("games").delete().eq("room_id", room.id);
  const { error } = await admin
    .from("rooms")
    .update({
      status: "roster",
      claims: {},
      ready: [],
      select_deadline: null,
      start_deadline: null,
    })
    .eq("id", room.id);
  if (error) {
    return NextResponse.json({ error: "write-failed" }, { status: 500 });
  }
  await pingRoom(room.code);
  return NextResponse.json({ ok: true });
}
