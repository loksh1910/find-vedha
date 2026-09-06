"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

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

export type ChatMsg = { id: string; from: string; text: string };

/**
 * One Supabase Realtime channel per room. Mirrors the `rooms` row and the
 * roster live, carries lobby chat as ephemeral broadcast, and exposes the
 * writes the lobby needs. No-ops until `roomId` is known (and stays off for
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
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const chanRef = useRef<RealtimeChannel | null>(null);

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

    const chan = supabase
      .channel(`lobby:${code}`, { config: { broadcast: { self: false } } })
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
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChat((c) => [...c.slice(-49), payload as ChatMsg]);
      })
      .subscribe();

    chanRef.current = chan;

    return () => {
      alive = false;
      void supabase.removeChannel(chan);
      chanRef.current = null;
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
    (text: string) => {
      const t = text.trim();
      if (!t || !chanRef.current || !me) return;
      const msg: ChatMsg = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        from: me.name,
        text: t,
      };
      void chanRef.current.send({ type: "broadcast", event: "chat", payload: msg });
      setChat((c) => [...c.slice(-49), msg]); // echo my own straight away
    },
    [me],
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
