-- Find Vedha — Phase 5: server-authoritative game state + hidden info.
-- Idempotent. Paste into the Supabase SQL Editor and Run.

-- ==================================================================
--  games  (one row per room; the state is written only by the API
--  route via the service role — no client policies, so clients can
--  neither read the raw row nor write it)
-- ==================================================================
create table if not exists public.games (
  room_id    uuid primary key references public.rooms (id) on delete cascade,
  seed       bigint not null,
  state      jsonb  not null,   -- the full GameState (authoritative)
  seats      jsonb  not null default '[]'::jsonb,  -- [{ uid, name, pawns:[...] }]
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;
-- (no policies on purpose — deny all for anon/authenticated; the service
--  role bypasses RLS, and reads go through get_game() below)

-- NOTE: `games` is deliberately NOT added to the realtime publication.
-- A row-change payload would carry the full unredacted state. Clients get
-- a contentless "game" broadcast on room:<code> from the API route and
-- then re-fetch through get_game().

-- ==================================================================
--  get_game(code) — the only read path. SECURITY DEFINER; redacts
--  Vedha's node + trail for Detective viewers unless it's a reveal
--  round or the game is over.
-- ==================================================================
create or replace function public.get_game(p_code text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r public.rooms%rowtype;
  g public.games%rowtype;
  st jsonb;
  controls_vedha boolean;
  last_revealed boolean;
  visible boolean;
begin
  select * into r from public.rooms where code = upper(p_code);
  if not found then return null; end if;

  if not exists (
    select 1 from public.room_members m
    where m.room_id = r.id and m.user_id = auth.uid()
  ) then
    return null;
  end if;

  select * into g from public.games where room_id = r.id;
  if not found then return null; end if;

  st := g.state;

  select coalesce(bool_or(
           (seat->>'uid') = auth.uid()::text
           and (seat->'pawns') ? 'vedha'
         ), false)
    into controls_vedha
  from jsonb_array_elements(coalesce(g.seats, '[]'::jsonb)) seat;

  last_revealed := coalesce(
    ((st->'log') -> (jsonb_array_length(st->'log') - 1) ->> 'revealed')::boolean,
    false
  );
  visible := controls_vedha
             or (st #>> '{status,kind}') = 'over'
             or last_revealed;

  if not visible then
    st := jsonb_set(st, '{pawns,vedha,node}', '-1'::jsonb, false);
    st := jsonb_set(st, '{log}', coalesce((
      select jsonb_agg(
        case when (e->>'revealed')::boolean
             then e
             else jsonb_set(e, '{node}', '-1'::jsonb, false)
        end
      )
      from jsonb_array_elements(st->'log') e
    ), '[]'::jsonb), false);
  end if;

  return jsonb_build_object(
    'state', st,
    'seats', g.seats,
    'seed', g.seed,
    'updatedAt', g.updated_at,
    'controlsVedha', controls_vedha
  );
end;
$$;

grant execute on function public.get_game(text) to authenticated;
