-- Find Vedha — Phase 7: record solo (vs computer) games into the match archive.
-- Idempotent. Paste into the Supabase SQL Editor and Run.
--
-- Online games are written by /api/game/move (service role). Solo games never
-- hit the server, so the solo client calls this RPC when the game ends.

create or replace function public.record_match(
  p_code  text,
  p_seed  bigint,
  p_state jsonb,
  p_seats jsonb
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me      uuid := auth.uid();
  st      jsonb := p_state;
  w       text;
  cx      int;
  cby     text;
  cby_uid uuid;
  new_id  uuid;
begin
  if me is null then return null; end if;
  if (st #>> '{status,kind}') <> 'over' then return null; end if;

  w := st #>> '{status,winner}';
  if w not in ('vedha', 'detective') then return null; end if;

  cx := nullif(st #>> '{status,caughtAt}', '')::int;
  if cx is not null then
    select key into cby
    from jsonb_each(st->'pawns')
    where (value->>'role') = 'detective' and (value->>'node')::int = cx
    limit 1;

    if cby is not null then
      select nullif((s->>'uid'), '00000000-0000-0000-0000-000000000000')::uuid
        into cby_uid
      from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s
      where (s->'pawns') ? cby
      limit 1;
    end if;
  end if;

  insert into public.matches (
    room_id, code, mode, seed, winner, reason, rounds,
    caught_at, caught_by, caught_by_uid, player_ids, state, seats
  )
  values (
    null, upper(coalesce(p_code, 'SOLO')), 'solo', p_seed, w,
    coalesce(st #>> '{status,reason}', ''),
    coalesce((st #>> '{status,round}')::int, (st->>'round')::int, 0),
    cx, cby, cby_uid, array[me], st, coalesce(p_seats, '[]'::jsonb)
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.record_match(text, bigint, jsonb, jsonb) to authenticated;
