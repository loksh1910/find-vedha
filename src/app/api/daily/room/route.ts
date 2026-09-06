import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API = "https://api.daily.co/v1";

/**
 * Per-room video access. Verifies the caller is a signed-in member of the
 * room, ensures a matching Daily room exists, and mints a short-lived
 * meeting token scoped to it. The Daily API key stays server-side.
 */
export async function POST(req: Request) {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "video-not-configured" }, { status: 501 });
  }

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
  if (!/^[A-Z0-9]{4,10}$/.test(code)) {
    return NextResponse.json({ error: "bad-code" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: "no-room" }, { status: 404 });

  const { data: member } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "not-a-member" }, { status: 403 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  const username = profile?.username || "Player";

  const roomName = `fv-${code.toLowerCase()}`;
  const H = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const now = Math.floor(Date.now() / 1000);

  // ensure the Daily room exists
  let r = await fetch(`${API}/rooms/${roomName}`, { headers: H });
  if (r.status === 404) {
    r = await fetch(`${API}/rooms`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: now + 60 * 60 * 6, // auto-clean after 6h
          max_participants: 8,
          enable_prejoin_ui: false,
          enable_screenshare: false,
          start_audio_off: true,
          start_video_off: true,
        },
      }),
    });
  }
  if (!r.ok) {
    return NextResponse.json({ error: "daily-room" }, { status: 502 });
  }
  const dailyRoom = (await r.json()) as { url: string };

  const tr = await fetch(`${API}/meeting-tokens`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: username,
        user_id: user.id,
        exp: now + 60 * 60 * 2,
      },
    }),
  });
  if (!tr.ok) {
    return NextResponse.json({ error: "daily-token" }, { status: 502 });
  }
  const { token } = (await tr.json()) as { token: string };

  return NextResponse.json({ url: dailyRoom.url, token });
}
