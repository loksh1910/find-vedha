-- Find Vedha — Phase 2 schema: profiles, rooms, room membership.
-- Idempotent: safe to run again if something failed partway.
-- Paste the whole file into the Supabase dashboard SQL Editor and Run.

-- ==================================================================
--  profiles  (one row per auth user)
-- ==================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null,
  avatar_id  text not null default 'tile-1',
  created_at timestamptz not null default now()
);

-- usernames are unique case-insensitively ("Arjun" == "arjun")
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ==================================================================
--  rooms
-- ==================================================================
create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  host_id         uuid not null references auth.users (id) on delete cascade,
  max_players     int  not null default 6 check (max_players between 2 and 6),
  status          text not null default 'roster'
                  check (status in ('roster','selecting','locked','ready','countdown','starting','playing','over')),
  claims          jsonb  not null default '{}'::jsonb,  -- { "vedha": "<uid>", "d1": "<uid>", ... }
  ready           uuid[] not null default '{}',         -- user ids marked ready
  select_deadline timestamptz,                          -- 10s role-claim clock
  start_deadline  timestamptz,                          -- 5s auto-start countdown
  created_at      timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);

-- ==================================================================
--  room_members
-- ==================================================================
create table if not exists public.room_members (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.rooms (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists room_members_room_idx on public.room_members (room_id);

-- ==================================================================
--  helper functions — SECURITY DEFINER so RLS policies can call them
--  without recursing on the table they protect.
-- ==================================================================
create or replace function public.is_room_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_room_host(p_room_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rooms
    where id = p_room_id and host_id = auth.uid()
  );
$$;

-- Look up a room by its invite code before joining (you aren't a member yet,
-- so the "members read their room" policy wouldn't let you). Returns only
-- non-sensitive fields.
create or replace function public.room_by_code(p_code text)
returns table (id uuid, name text, status text, max_players int, member_count bigint)
language sql stable security definer set search_path = public as $$
  select r.id, r.name, r.status, r.max_players,
         (select count(*) from public.room_members m where m.room_id = r.id)
  from public.rooms r
  where r.code = upper(p_code);
$$;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_host(uuid)   to authenticated;
grant execute on function public.room_by_code(text)   to authenticated;

-- ==================================================================
--  new auth user  ->  profile row
--  username / avatar_id come from the sign-up metadata.
-- ==================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''),
             'player_' || substr(replace(new.id::text, '-', ''), 1, 8)),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_id', ''), 'tile-1')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==================================================================
--  Row Level Security
-- ==================================================================
alter table public.profiles     enable row level security;
alter table public.rooms        enable row level security;
alter table public.room_members enable row level security;

-- profiles --------------------------------------------------------
drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- rooms ---------------------------------------------------------
-- Host is included explicitly: `insert ... returning` re-reads the new row,
-- and the host's membership row is written in a separate statement just after,
-- so at insert time only `host_id = auth.uid()` can match.
drop policy if exists "members read their room" on public.rooms;
create policy "members read their room"
  on public.rooms for select to authenticated
  using (public.is_room_member(id) or host_id = auth.uid());

drop policy if exists "host creates room" on public.rooms;
create policy "host creates room"
  on public.rooms for insert to authenticated with check (host_id = auth.uid());

-- Permissive on purpose for the MVP: any member may advance the room's
-- status / claims / ready set / deadlines, because the lobby's countdowns
-- fire from whichever client happens to be open. The security-critical
-- hidden-information rules land in Phase 5 on the game-state tables.
drop policy if exists "members update their room" on public.rooms;
create policy "members update their room"
  on public.rooms for update to authenticated
  using (public.is_room_member(id)) with check (public.is_room_member(id));

drop policy if exists "host deletes room" on public.rooms;
create policy "host deletes room"
  on public.rooms for delete to authenticated using (host_id = auth.uid());

-- room_members ------------------------------------------------
drop policy if exists "members see co-members" on public.room_members;
create policy "members see co-members"
  on public.room_members for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "add self to room" on public.room_members;
create policy "add self to room"
  on public.room_members for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own membership" on public.room_members;
create policy "update own membership"
  on public.room_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "leave or be kicked" on public.room_members;
create policy "leave or be kicked"
  on public.room_members for delete to authenticated
  using (user_id = auth.uid() or public.is_room_host(room_id));

-- ==================================================================
--  Realtime — let clients subscribe to room + roster changes
-- ==================================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_members') then
    alter publication supabase_realtime add table public.room_members;
  end if;
end $$;
