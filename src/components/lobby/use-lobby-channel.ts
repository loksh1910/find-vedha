"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRoomChat } from "@/lib/realtime/use-room-chat";
export type { ChatMsg } from "@/lib/realtime/use-room-chat";

export type RoomRow = {
  id: string;
  code: string;
  name: string;
  host_id: string;
  max_players: number;
  status: string;
  claims: Record<string, string>;
  ready: string[];
  select_deadline: string | null;
  start_deadline: string | null;
};

export type MemberRow = {
  userId: string;
  joinedAt: string;
  username: string;
  avatarId: string;
};

/**
 * Mirrors the `rooms` row and the roster live over a postgres_changes channel,
 * and exposes the writes the lobby needs. Lobby chat is delegated to the shared
 * {@link useRoomChat} hook. No-ops until `roomId` is known (and stays off for
 * the solo flow, which never passes one).
 */
export function useLobbyChannel(
  roomId: string | null,
  code: string,
  me: { id: string; name: string } | null,
) {
  const supabase = useMemo(() => createClient(), []);
  const [roomRow, setRoomRow] = useState<RoomRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const { messages: chat, send: sendRoomChat } = useRoomChat(
    roomId ? code : "",
    me,
  );

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    const loadRoom = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      if (alive && data) setRoomRow(data as RoomRow);
    };

    const loadMembers = async () => {
      const { data } = await supabase
        .from("room_members")
        .select("user_id, joined_at")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (!alive || !data) return;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_id")
        .in(
          "id",
          data.map((m) => m.user_id),
        );
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
      setMembers(
        data.map((m) => ({
          userId: m.user_id,
          joinedAt: m.joined_at,
          username: pmap.get(m.user_id)?.username ?? "Player",
          avatarId: pmap.get(m.user_id)?.avatar_id ?? "tile-1",
        })),
      );
    };

    void loadRoom();
    void loadMembers();

    // realtime can miss a message across a tab switch / sleep — reconcile on focus
    const onFocus = () => {
      void loadRoom();
      void loadMembers();
    };
    window.addEventListener("focus", onFocus);

    // room state (row + roster) — postgres_changes
    const roomChan = supabase
      .channel(`lobby:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length) {
            setRoomRow(payload.new as RoomRow);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${roomId}`,
        },
        () => void loadMembers(),
      )
      .subscribe();

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(roomChan);
    };
  }, [supabase, roomId, code]);

  const patchRoom = useCallback(
    async (fields: Partial<RoomRow>) => {
      if (!roomId) return;
      // optimistic — the actor shouldn't wait for the realtime echo
      setRoomRow((r) => (r ? { ...r, ...fields } : r));
      await supabase.from("rooms").update(fields).eq("id", roomId);
    },
    [supabase, roomId],
  );

  const sendChat = useCallback(
    (text: string) => sendRoomChat(text, "public"),
    [sendRoomChat],
  );

  const kick = useCallback(
    async (userId: string) => {
      if (!roomId) return;
      await supabase
        .from("room_members")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId);
    },
    [supabase, roomId],
  );

  const leave = useCallback(async () => {
    if (!roomId || !me) return;
    await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", me.id);
  }, [supabase, roomId, me]);

  return { roomRow, members, chat, patchRoom, sendChat, kick, leave };
}
