"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { Send, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAppState } from "@/components/providers/app-state-provider";
import { createClient } from "@/lib/supabase/client";

type Friend = { uid: string; username: string; avatarId: string; since: string | null };
type Request = { id: string; uid: string; username: string; avatarId: string; createdAt: string };
type Recent = { uid: string; username: string; avatarId: string; lastPlayed: string };

const ADD_RESULT: Record<string, string> = {
  sent: "Request sent.",
  accepted: "You're now friends.",
  pending: "You've already sent them a request.",
  "already-friends": "You're already friends.",
  "not-found": "No player goes by that name.",
  self: "That's you.",
  error: "Couldn't send the request.",
};

const ago = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export function FriendsScreen() {
  const { hydrated, userId } = useAppState();
  const supabase = useMemo(() => createClient(), []);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [f, r, p] = await Promise.all([
      supabase.rpc("list_friends"),
      supabase.rpc("list_friend_requests"),
      supabase.rpc("list_recent_players", { p_limit: 12 }),
    ]);
    if (Array.isArray(f.data)) setFriends(f.data as Friend[]);
    if (Array.isArray(r.data)) setRequests(r.data as Request[]);
    if (Array.isArray(p.data)) setRecent(p.data as Recent[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load on mount; `load` only setStates after an await
    void load();
  }, [hydrated, userId, load]);

  const add = useCallback(
    async (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      setBusy(`add:${clean}`);
      const { data } = await supabase.rpc("send_friend_request", { p_username: clean });
      setBusy(null);
      setNote(ADD_RESULT[data as string] ?? "Couldn't send the request.");
      setInput("");
      void load();
    },
    [supabase, load],
  );

  const respond = useCallback(
    async (id: string, accept: boolean) => {
      setBusy(`req:${id}`);
      await supabase.rpc("respond_friend_request", { p_id: id, p_accept: accept });
      setBusy(null);
      void load();
    },
    [supabase, load],
  );

  const remove = useCallback(
    async (uid: string) => {
      setBusy(`rm:${uid}`);
      await supabase.rpc("remove_friend", { p_other: uid });
      setBusy(null);
      void load();
    },
    [supabase, load],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void add(input);
  };

  const online = 0; // presence isn't wired yet

  return (
    <div className="mx-auto max-w-[820px] px-6 py-8 md:px-10">
      <header className="mb-5">
        <p className="eyebrow">Friends</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
          {loading
            ? "Friends"
            : `${friends.length} ${friends.length === 1 ? "friend" : "friends"}`}
          {online > 0 && (
            <span className="ml-2 font-mono text-sm font-normal text-ok">
              {online} online
            </span>
          )}
        </h1>
      </header>

      {/* add */}
      <form
        onSubmit={onSubmit}
        className="mb-6 rounded-lg border border-line bg-surface p-4"
      >
        <p className="mb-2.5 font-mono text-xs text-faint">Add a friend</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setNote(null);
            }}
            placeholder="Their username"
            aria-label="Friend's username"
            className="h-9 flex-1 rounded-md border border-line-strong bg-bg-inset px-3 text-sm text-text placeholder:text-faint focus:border-signal focus:outline-none"
          />
          <Button variant="primary" type="submit" disabled={!input.trim() || !!busy}>
            <Send size={14} />
            Send request
          </Button>
        </div>
        <p className="mt-2 font-mono text-[0.7rem] text-faint">
          {note ?? "They'll see it next time they open Find Vedha."}
        </p>
      </form>

      {/* requests */}
      {requests.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 font-mono text-xs text-faint">
            Requests · {requests.length}
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={r.username} avatarId={r.avatarId} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text">{r.username}</div>
                  <span className="font-mono text-[0.66rem] text-faint">
                    sent {ago(r.createdAt)}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy === `req:${r.id}`}
                    onClick={() => respond(r.id, true)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === `req:${r.id}`}
                    onClick={() => respond(r.id, false)}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* friends */}
      <section className="mb-6">
        <p className="mb-2 font-mono text-xs text-faint">All friends</p>
        {loading ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-8 text-center font-mono text-xs text-faint">
            Loading…
          </p>
        ) : friends.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface px-4 py-8 text-center">
            <p className="text-sm text-muted">No friends yet.</p>
            <p className="mt-1 text-xs text-faint">
              Add someone by username, or from a game you played together.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {friends.map((f) => (
              <li key={f.uid} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={f.username} avatarId={f.avatarId} size={32} />
                <Link
                  href={`/u/${encodeURIComponent(f.username)}`}
                  className="min-w-0 flex-1 truncate text-sm text-text hover:text-signal"
                >
                  {f.username}
                </Link>
                <button
                  onClick={() => remove(f.uid)}
                  disabled={busy === `rm:${f.uid}`}
                  aria-label={`Remove ${f.username}`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[0.7rem] text-faint hover:bg-surface-2 hover:text-danger disabled:opacity-40"
                >
                  <X size={12} />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* recent players */}
      {recent.length > 0 && (
        <section>
          <p className="mb-2 font-mono text-xs text-faint">
            Recent players · not friends yet
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {recent.map((p) => (
              <li key={p.uid} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={p.username} avatarId={p.avatarId} size={32} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${encodeURIComponent(p.username)}`}
                    className="truncate text-sm text-text hover:text-signal"
                  >
                    {p.username}
                  </Link>
                  <span className="ml-2 font-mono text-[0.66rem] text-faint">
                    played {ago(p.lastPlayed)}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={busy === `add:${p.username}`}
                  onClick={() => add(p.username)}
                >
                  <UserPlus size={13} />
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 font-mono text-[0.7rem] text-faint">
        Online status and invite-to-lobby need a presence channel — coming with
        the next pass.
      </p>
    </div>
  );
}
