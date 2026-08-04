-- RubiksClock — schema for the accounts milestone.
-- Run once against a fresh Supabase project: see docs/ROADMAP.md.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Session',
  created_at timestamptz not null default now()
);

-- Postgres has no CREATE TYPE IF NOT EXISTS, and every other statement here
-- is re-runnable, so guard this one to match.
do $$
begin
  create type public.penalty as enum ('none', 'plus2', 'dnf');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.solves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  -- Deliberately unconstrained: widening to 2x2/4x4/... is roadmap section 3,
  -- and an enum here would need a migration for every new event.
  puzzle text not null default '3x3',
  scramble text not null,
  raw_ms integer not null check (raw_ms > 0),
  inspection_ms integer not null check (inspection_ms >= 0),
  penalty public.penalty not null default 'none',
  created_at timestamptz not null default now()
);

create index if not exists solves_user_created_idx
  on public.solves (user_id, created_at desc);

-- The comparable time for a solve: null for a DNF, +2000 ms for a plus2.
create or replace function public.effective_ms(raw_ms integer, penalty public.penalty)
returns integer
language sql
immutable
as $$
  select case penalty
    when 'dnf' then null
    when 'plus2' then raw_ms + 2000
    else raw_ms
  end
$$;

create or replace view public.leaderboard as
  select
    p.id as user_id,
    p.display_name,
    s.puzzle,
    min(public.effective_ms(s.raw_ms, s.penalty)) as best_ms,
    count(*) as solve_count
  from public.solves s
  join public.profiles p on p.id = s.user_id
  group by p.id, p.display_name, s.puzzle;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.solves enable row level security;

-- Profiles are public (the leaderboard shows display names); everything else
-- is private to its owner.
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "a user manages their own profile"
  on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "a user manages their own sessions"
  on public.sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "a user manages their own solves"
  on public.solves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
