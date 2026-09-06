-- Find Vedha — Phase 7: match archive.
-- Feeds the Results screen, profile match history, and player stats.
-- Idempotent. Paste into the Supabase SQL Editor and Run.
--
-- Online games are written here by /api/game/move the moment they end (the
-- `games` row itself is torn down when the room resets). Solo games aren't
-- recorded yet.

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid references public.rooms (id) on delete set null,
  code          text not null,
  mode          text not null default 'online' check (mode in ('online', 'solo')),
  seed          bigint,
  winner        text not null check (winner in ('vedha', 'detective')),
  reason        text not null default '',
  rounds        int  not null default 0,
  caught_at     int,
  caught_by     text,          -- pawn id "d1".."d5", or null if Vedha escaped
  caught_by_uid uuid,
  player_ids    uuid[] not null default '{}',   -- every human seat, for history lookups
  state         jsonb not null,                 -- final GameState (unredacted; game is over)
  seats         jsonb not null default '[]'::jsonb,
  ended_at      timestamptz not null default now()
);

create index if not exists matches_players_idx on public.matches using gin (player_ids);
create index if not exists matches_ended_idx   on public.matches (ended_at desc);
-- one archive row per game instance (seed is unique per createGame); guards the
-- record-on-game-over path against a double write. NULL room_id (solo, later)
-- stays non-unique, which is fine.
create unique index if not exists matches_room_seed_idx
  on public.matches (room_id, seed);

alter table public.matches enable row level security;
-- no policies — writes are service-role (the API route); reads go through the
-- SECURITY DEFINER functions below, which check participation.

-- ==================================================================
--  _match_role(seats, uid) -> 'vedha' | 'detective' | null
-- ==================================================================
create or replace function public._match_role(p_seats jsonb, p_uid uuid)
returns text language sql immutable as $$
  select case
    when p_uid is null then null
    when exists (
      select 1 from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s
      where (s->>'uid') = p_uid::text and (s->'pawns') ? 'vedha'
    ) then 'vedha'
    when exists (
      select 1 from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s
      where (s->>'uid') = p_uid::text
        and exists (
          select 1 from jsonb_array_elements_text(s->'pawns') p(id) where p.id <> 'vedha'
        )
    ) then 'detective'
    else null
  end;
$$;

-- ==================================================================
--  get_match(id) — one finished game, if the caller was in it
-- ==================================================================
create or replace function public.get_match(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.matches%rowtype;
begin
  select * into m from public.matches where id = p_id;
  if not found then return null; end if;
  if not (auth.uid() = any (m.player_ids)) then return null; end if;
  return jsonb_build_object(
    'id', m.id, 'code', m.code, 'mode', m.mode,
    'winner', m.winner, 'reason', m.reason, 'rounds', m.rounds,
    'caughtAt', m.caught_at, 'caughtBy', m.caught_by, 'caughtByUid', m.caught_by_uid,
    'state', m.state, 'seats', m.seats, 'endedAt', m.ended_at,
    'myRole', public._match_role(m.seats, auth.uid())
  );
end;
$$;
grant execute on function public.get_match(uuid) to authenticated;

-- ==================================================================
--  get_latest_match(code) — the newest finished game in a room that
--  the caller took part in. Used by the post-game Results screen,
--  which only knows the room code.
-- ==================================================================
create or replace function public.get_latest_match(p_code text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.matches%rowtype;
begin
  select * into m
  from public.matches
  where upper(code) = upper(p_code) and auth.uid() = any (player_ids)
  order by ended_at desc
  limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', m.id, 'code', m.code, 'mode', m.mode,
    'winner', m.winner, 'reason', m.reason, 'rounds', m.rounds,
    'caughtAt', m.caught_at, 'caughtBy', m.caught_by, 'caughtByUid', m.caught_by_uid,
    'state', m.state, 'seats', m.seats, 'endedAt', m.ended_at,
    'myRole', public._match_role(m.seats, auth.uid())
  );
end;
$$;
grant execute on function public.get_latest_match(text) to authenticated;

-- ==================================================================
--  get_my_matches(limit, before) — the caller's history, newest first
-- ==================================================================
create or replace function public.get_my_matches(
  p_limit int default 20,
  p_before timestamptz default null
)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x."endedAt" desc), '[]'::jsonb)
  from (
    select m.id,
           m.ended_at as "endedAt",
           m.mode,
           m.rounds,
           m.winner,
           jsonb_array_length(coalesce(m.seats, '[]'::jsonb)) as players,
           public._match_role(m.seats, auth.uid()) as "myRole",
           case when public._match_role(m.seats, auth.uid()) = m.winner then 'won' else 'lost' end as result
    from public.matches m
    where auth.uid() = any (m.player_ids)
      and (p_before is null or m.ended_at < p_before)
    order by m.ended_at desc
    limit greatest(1, least(p_limit, 100))
  ) x;
$$;
grant execute on function public.get_my_matches(int, timestamptz) to authenticated;

-- ==================================================================
--  get_player_stats(uid) — public aggregate for a profile page
--  (defaults to the caller). Stats are public; detailed history is not.
-- ==================================================================
create or replace function public.get_player_stats(p_uid uuid default null)
returns jsonb
language sql stable security definer set search_path = public as $$
  with who as (select coalesce(p_uid, auth.uid()) as uid),
  mine as (
    select m.*, public._match_role(m.seats, (select uid from who)) as role
    from public.matches m
    where (select uid from who) = any (m.player_ids)
  )
  select jsonb_build_object(
    'games',            count(*),
    'wins',             count(*) filter (where role = winner),
    'vedhaGames',       count(*) filter (where role = 'vedha'),
    'vedhaWins',        count(*) filter (where role = 'vedha' and winner = 'vedha'),
    'detGames',         count(*) filter (where role = 'detective'),
    'detWins',          count(*) filter (where role = 'detective' and winner = 'detective'),
    'catches',          count(*) filter (where caught_by_uid = (select uid from who)),
    'avgRoundsAsVedha', coalesce(round(avg(rounds) filter (where role = 'vedha'))::int, 0),
    'form',             coalesce((
      select jsonb_agg(f order by ord desc)
      from (
        select (case when role = winner then 'w' else 'l' end) as f,
               row_number() over (order by ended_at desc) as ord
        from mine order by ended_at desc limit 10
      ) z
    ), '[]'::jsonb)
  )
  from mine;
$$;
grant execute on function public.get_player_stats(uuid) to authenticated;
