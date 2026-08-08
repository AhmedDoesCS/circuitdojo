-- CircuitDojo schema (Supabase / Postgres)
--
-- Run this once against a fresh Supabase project:
--   supabase db execute --file supabase/migrations/0001_init.sql
-- or paste it into the SQL editor in the Supabase dashboard.
--
-- Design notes live in SCHEMA.md. Short version: three tables, one row per
-- topic per user for progress, one row per check for attempts, and a catalogue
-- of challenge TEMPLATES (the concrete instances are (template, seed) pairs
-- generated in the client, so the pool costs no storage).

-- ---------------------------------------------------------------------------
-- challenges: the authored template catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.challenges (
  id                  uuid primary key default gen_random_uuid(),
  template_id         text not null unique,          -- matches the id in src/challenges/templates/*
  topic               text not null,
  difficulty_tier     int  not null check (difficulty_tier between 1 and 8),
  title               text not null,
  concept             text,                          -- the teaching point, one line
  brief               jsonb not null default '{}'::jsonb,   -- {goal, spec[], notes} of a sample instance
  requirements_schema jsonb not null default '{}'::jsonb,   -- structured checks of a sample instance
  is_template         boolean not null default true,
  template_params     jsonb not null default '{}'::jsonb,   -- the randomised parameters of the sample
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.challenges is
  'Catalogue of challenge templates. A playable challenge is (template_id, seed); the client regenerates the brief and requirements deterministically from the seed.';
comment on column public.challenges.requirements_schema is
  'Structured requirement checks (see src/engine/checks.js). Stored for reference, analytics and future server-side validation.';

create index if not exists challenges_tier_idx on public.challenges (difficulty_tier);
create index if not exists challenges_topic_idx on public.challenges (topic);

-- ---------------------------------------------------------------------------
-- user_progress: one row per (user, topic)
-- ---------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id           uuid not null references auth.users (id) on delete cascade,
  topic             text not null,
  mastery           numeric(4,3) not null default 0 check (mastery >= 0 and mastery <= 1),
  attempts          int not null default 0,
  passes            int not null default 0,
  fails             int not null default 0,
  streak            int not null default 0,
  last_result       text check (last_result in ('pass', 'fail')),
  last_attempted_at timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (user_id, topic)
);

comment on table public.user_progress is
  'Mastery per topic, 0..1. Drives challenge selection: weak topics resurface before new material.';

-- ---------------------------------------------------------------------------
-- attempts: one row per Run Check
-- ---------------------------------------------------------------------------
create table if not exists public.attempts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users (id) on delete cascade,  -- null = guest (see SCHEMA.md)
  challenge_template_id  text not null references public.challenges (template_id) on update cascade,
  seed                   bigint not null,
  challenge_snapshot     jsonb,        -- brief + requirements exactly as the learner saw them
  schematic_state        jsonb not null,  -- serialized document: components, wires, junctions, labels
  result                 text not null check (result in ('pass', 'fail')),
  feedback               jsonb not null default '{}'::jsonb,  -- {correct[], errors[], missing[]}
  created_at             timestamptz not null default now()
);

comment on table public.attempts is
  'History of checks. schematic_state replays the exact sheet; challenge_snapshot preserves what was asked even if a template is later edited.';

create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index if not exists attempts_template_idx on public.attempts (challenge_template_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.challenges    enable row level security;
alter table public.user_progress enable row level security;
alter table public.attempts      enable row level security;

-- The challenge catalogue is public reference data: anyone may read it, nobody
-- may write it through the API (use the service role key / sync script).
drop policy if exists "challenges are readable by everyone" on public.challenges;
create policy "challenges are readable by everyone"
  on public.challenges for select
  using (true);

-- Progress: strictly own rows.
drop policy if exists "read own progress" on public.user_progress;
create policy "read own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

drop policy if exists "write own progress" on public.user_progress;
create policy "write own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own progress" on public.user_progress;
create policy "update own progress"
  on public.user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Attempts: strictly own rows.
drop policy if exists "read own attempts" on public.attempts;
create policy "read own attempts"
  on public.attempts for select
  using (auth.uid() = user_id);

drop policy if exists "insert own attempts" on public.attempts;
create policy "insert own attempts"
  on public.attempts for insert
  with check (auth.uid() = user_id);

-- Guest attempts are deliberately NOT insertable by anonymous clients: an
-- anon-writable table with a null user_id is an open spam target and buys
-- nothing, since guest progress lives in localStorage until sign-up. If you
-- later want anonymous telemetry, prefer Supabase anonymous sign-in (which
-- still yields a real auth.uid()) over relaxing this policy.

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists challenges_touch on public.challenges;
create trigger challenges_touch
  before update on public.challenges
  for each row execute function public.touch_updated_at();

drop trigger if exists user_progress_touch on public.user_progress;
create trigger user_progress_touch
  before update on public.user_progress
  for each row execute function public.touch_updated_at();
