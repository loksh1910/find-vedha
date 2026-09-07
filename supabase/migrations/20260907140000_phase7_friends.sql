-- Find Vedha — Phase 7: friends (add / accept / decline / remove + recent players).
-- Idempotent. Paste into the Supabase SQL Editor and Run.
--
-- One row per relationship (either direction), status 'pending' | 'accepted'.
-- A symmetric unique index stops A->B and B->A both existing; the RPC turns a
-- reciprocal request into an accept.

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id) where status = 'pending';

alter table public.friendships enable row level security;
-- no policies — all access via the SECURITY DEFINER functions below.

-- ==================================================================
--  send_friend_request(username) -> 'sent' | 'accepted' (reciprocal)
--    | 'pending' | 'already-friends' | 'not-found' | 'self' | 'error'
-- ==================================================================
create or replace function public.send_friend_request(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target uuid;
  ex public.friendships%rowtype;
begin
  if me is null then return 'error'; end if;
  select id into target from public.profiles
   where lower(username) = lower(btrim(coalesce(p_username, '')));
  if target is null then return 'not-found'; end if;
  if target = me then return 'self'; end if;

  select * into ex from public.friendships
   where (requester_id = me and addressee_id = target)
      or (requester_id = target and addressee_id = me)
   limit 1;

  if found then
    if ex.status = 'accepted' then return 'already-friends'; end if;
    if ex.addressee_id = me then
      update public.friendships set status = 'accepted', responded_at = now() where id = ex.id;
      return 'accepted';
    end if;
    return 'pending';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, target);
  return 'sent';
end;
$$;
grant execute on function public.send_friend_request(text) to authenticated;

-- ==================================================================
--  respond_friend_request(id, accept) — caller must be the addressee
-- ==================================================================
create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.friendships%rowtype;
begin
  select * into r from public.friendships where id = p_id;
  if not found or r.addressee_id <> me or r.status <> 'pending' then return 'error'; end if;
  if coalesce(p_accept, false) then
    update public.friendships set status = 'accepted', responded_at = now() where id = p_id;
    return 'accepted';
  end if;
  delete from public.friendships where id = p_id;
  return 'declined';
end;
$$;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- ==================================================================
--  remove_friend(other) — drops the relationship either direction
-- ==================================================================
create or replace function public.remove_friend(p_other uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'error'; end if;
  delete from public.friendships
   where (requester_id = me and addressee_id = p_other)
      or (requester_id = p_other and addressee_id = me);
  return 'removed';
end;
$$;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ==================================================================
--  list_friends() — accepted, other person's profile, A→Z
-- ==================================================================
create or replace function public.list_friends()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by lower(x.username)), '[]'::jsonb)
  from (
    select p.id as uid,
           p.username,
           p.avatar_id as "avatarId",
           f.responded_at as "since"
    from public.friendships f
    join public.profiles p
      on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    where f.status = 'accepted'
      and auth.uid() in (f.requester_id, f.addressee_id)
  ) x;
$$;
grant execute on function public.list_friends() to authenticated;

-- ==================================================================
--  list_friend_requests() — incoming pending, newest first
-- ==================================================================
create or replace function public.list_friend_requests()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x."createdAt" desc), '[]'::jsonb)
  from (
    select f.id,
           p.id as uid,
           p.username,
           p.avatar_id as "avatarId",
           f.created_at as "createdAt"
    from public.friendships f
    join public.profiles p on p.id = f.requester_id
    where f.status = 'pending' and f.addressee_id = auth.uid()
  ) x;
$$;
grant execute on function public.list_friend_requests() to authenticated;

-- ==================================================================
--  list_recent_players(limit) — people the caller has been in a
--  match with, who aren't friends and have no pending request
-- ==================================================================
create or replace function public.list_recent_players(p_limit int default 12)
returns jsonb language sql stable security definer set search_path = public as $$
  with played as (
    select (s->>'uid')::uuid as uid, max(m.ended_at) as last_played
    from public.matches m
    cross join lateral jsonb_array_elements(coalesce(m.seats, '[]'::jsonb)) s
    where auth.uid() = any (m.player_ids)
      and (s->>'uid') is not null
      and (s->>'uid') <> auth.uid()::text
    group by 1
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x."lastPlayed" desc), '[]'::jsonb)
  from (
    select pl.uid,
           p.username,
           p.avatar_id as "avatarId",
           pl.last_played as "lastPlayed"
    from played pl
    join public.profiles p on p.id = pl.uid
    where not exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = pl.uid)
         or (f.requester_id = pl.uid and f.addressee_id = auth.uid())
    )
    order by pl.last_played desc
    limit greatest(1, least(p_limit, 50))
  ) x;
$$;
grant execute on function public.list_recent_players(int) to authenticated;
