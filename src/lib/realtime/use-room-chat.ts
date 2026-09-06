"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type ChatScope = "public" | "det";

export type ChatMsg = {
  id: string;
  scope: ChatScope;
  from: string;
  text: string;
  createdAt?: string;
};

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const byTime = (a: ChatMsg, b: ChatMsg) =>
  (a.createdAt ?? "").localeCompare(b.createdAt ?? "");

/**
 * Room chat, shared by the lobby and the in-game side panel.
 *
 * - Live delivery rides Supabase Realtime broadcast: `chat:<CODE>` for
 *   `public`, `chat:<CODE>:det` for Detectives (only clients passing
 *   `det: true` ever join it, so the Vedha player's browser never receives
 *   those).
 * - History + backfill comes from `get_chat` / `post_chat` (durable, and the
 *   DB — not just channel choice — withholds `det` rows from non-Detectives).
 *   So a reload / late join still shows the conversation.
 */
export function useRoomChat(
  code: string,
  me: { name: string } | null,
  opts: { det?: boolean } = {},
) {
  const det = !!opts.det;
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const pubRef = useRef<RealtimeChannel | null>(null);
  const detRef = useRef<RealtimeChannel | null>(null);

  const push = useCallback((m: ChatMsg) => {
    setMessages((c) => {
      if (c.some((x) => x.id === m.id)) return c;
      return [...c, m].sort(byTime).slice(-120);
    });
  }, []);

  const merge = useCallback((rows: ChatMsg[]) => {
    setMessages((c) => {
      const seen = new Set(c.map((x) => x.id));
      const add = rows.filter((r) => !seen.has(r.id));
      if (!add.length) return c;
      return [...c, ...add].sort(byTime).slice(-120);
    });
  }, []);

  // history + backfill
  useEffect(() => {
    if (!code) return;
    let alive = true;
    const load = async () => {
      try {
        const { data } = await supabase.rpc("get_chat", {
          p_code: code,
          p_limit: 60,
        });
        if (alive && Array.isArray(data)) merge(data as ChatMsg[]);
      } catch {
        /* offline / RPC not deployed yet — broadcast still carries live chat */
      }
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [supabase, code, det, merge]);

  // live broadcast
  useEffect(() => {
    if (!code) return;
    let alive = true;

    const join = (topic: string) => {
      const ch = supabase
        .channel(topic, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "msg" }, ({ payload }) =>
          push(payload as ChatMsg),
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setTimeout(() => {
              if (alive) ch.subscribe();
            }, 1000);
          }
        });
      return ch;
    };

    pubRef.current = join(`chat:${code}`);
    if (det) detRef.current = join(`chat:${code}:det`);

    return () => {
      alive = false;
      if (pubRef.current) void supabase.removeChannel(pubRef.current);
      if (detRef.current) void supabase.removeChannel(detRef.current);
      pubRef.current = null;
      detRef.current = null;
    };
  }, [supabase, code, det, push]);

  const send = useCallback(
    (text: string, scope: ChatScope = "public") => {
      const t = text.trim();
      if (!t || !me || !code) return;
      const useDet = scope === "det" && det;
      const msg: ChatMsg = {
        id: newId(),
        scope: useDet ? "det" : "public",
        from: me.name,
        text: t,
        createdAt: new Date().toISOString(),
      };
      push(msg); // show my own straight away (channels use self:false)
      const ch = useDet ? detRef.current : pubRef.current;
      // realtime-js falls back to an HTTP POST when the socket isn't joined yet,
      // so this still delivers during a reconnect.
      void ch?.send({ type: "broadcast", event: "msg", payload: msg });
      // durable copy — same id so it dedupes against the broadcast on reload
      supabase
        .rpc("post_chat", {
          p_code: code,
          p_scope: msg.scope,
          p_body: msg.text,
          p_id: msg.id,
        })
        .then(
          () => {},
          () => {},
        );
    },
    [me, det, code, push, supabase],
  );

  return { messages, send };
}
