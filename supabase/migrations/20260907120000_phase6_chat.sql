-- Find Vedha — Phase 6: persistent room chat (history + Detective-only privacy).
-- Idempotent. Paste into the Supabase SQL Editor and Run.
--
-- Live chat still rides Realtime broadcast (instant, ephemeral). This adds a
-- durable log so a reload / late join still shows the conversation, and so the
-- Detectives-only scope is enforced by the database, not just by which channel
-- a client happens to join.

-- ==================================================================
--  room_chat  (one row per message; all access via the RPCs below —
--  RLS on with no policies, same pattern as `games`)
-- ==================================================================
create table if not exists public.room_chat (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  scope      text not null default 'public' check (scope in ('public', 'det')),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists room_chat_room_created_idx
  on public.room_chat (room_id, created_at);

alter table public.room_chat enable row level security;
-- (no policies on purpose — deny all; reads/writes go through the
--  SECURITY DEFINER functions below, which enforce membership + scope)

-- ==================================================================
--  is_room_detective(room) — does the caller control a Detective in
--  this room's current game? Used to gate the 'det' scope.
-- ==================================================================
create or replace function public.is_room_detective(p_room_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.games g
    cross join lateral jsonb_array_elements(coalesce(g.seats, '[]'::jsonb)) seat
    where g.room_id = p_room_id
      and (seat->>'uid') = auth.uid()::text
      and exists (
        select 1 from jsonb_array_elements_text(seat->'pawns') p(id)
        where p.id <> 'vedha'
      )
  );
$$;

grant execute on function public.is_room_detective(uuid) to authenticated;

-- ==================================================================
--  get_chat(code, limit) — the newest `limit` messages, oldest-first.
--  Detectives-only rows are withheld from everyone else.
-- ==================================================================
create or replace function public.get_chat(p_code text, p_limit int default 60)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r public.rooms%rowtype;
  is_det boolean;
begin
  select * into r from public.rooms where code = upper(p_code);
  if not found then return '[]'::jsonb; end if;
  if not public.is_room_member(r.id) then return '[]'::jsonb; end if;

  is_det := public.is_room_detective(r.id);

  return coalesce((
    select jsonb_agg(x.msg order by x.created_at asc)
    from (
      select c.created_at,
             jsonb_build_object(
               'id', c.id,
               'scope', c.scope,
               'from', coalesce(p.username, 'Player'),
               'text', c.body,
               'createdAt', c.created_at
             ) as msg
      from public.room_chat c
      left join public.profiles p on p.id = c.user_id
      where c.room_id = r.id
        and (c.scope = 'public' or is_det)
      order by c.created_at desc
      limit greatest(1, least(p_limit, 200))
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_chat(text, int) to authenticated;

-- ==================================================================
--  post_chat(code, scope, body, id) — append a message. `id` is the
--  client's message id so the live broadcast and this stored row
--  dedupe exactly. A 'det' post from a non-Detective is stored as
--  'public'.
-- ==================================================================
create or replace function public.post_chat(
  p_code text,
  p_scope text,
  p_body text,
  p_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms%rowtype;
  v_scope text;
  v_body text;
  new_id uuid;
begin
  select * into r from public.rooms where code = upper(p_code);
  if not found then return null; end if;
  if not public.is_room_member(r.id) then return null; end if;

  v_body := nullif(btrim(p_body), '');
  if v_body is null then return null; end if;
  v_body := left(v_body, 2000);

  v_scope := case
    when p_scope = 'det' and public.is_room_detective(r.id) then 'det'
    else 'public'
  end;

  insert into public.room_chat (id, room_id, user_id, scope, body)
  values (coalesce(p_id, gen_random_uuid()), r.id, auth.uid(), v_scope, v_body)
  on conflict (id) do nothing
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.post_chat(text, text, text, uuid) to authenticated;
