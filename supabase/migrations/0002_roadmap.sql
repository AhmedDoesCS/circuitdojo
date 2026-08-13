-- CircuitDojo: roadmap progress
--
-- Run after 0001_init.sql, from the SQL editor in the Supabase dashboard or:
--   supabase db execute --file supabase/migrations/0002_roadmap.sql
--
-- Why this exists as its own table rather than more rows in user_progress.
--
-- `user_progress` answers "how well does this person know topic X", as a number
-- between nought and one that moves up and down. The roadmap answers something
-- with a different shape entirely: an ordered list of units, each of which has
-- either been completed or has not. Squeezing a set of completed ids into a
-- mastery table would mean storing a boolean as a numeric and a position as a
-- topic name, and every query against it would have to know that trick.
--
-- One row per unit per user, rather than one array per user, so that finishing
-- a unit is an insert that cannot lose a concurrent one. Two devices signed in
-- at once each add their own row; neither overwrites the other's.

create table if not exists public.user_roadmap (
  user_id      uuid not null references auth.users (id) on delete cascade,
  unit_id      text not null,                  -- matches the id in src/roadmap/index.js
  completed_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

comment on table public.user_roadmap is
  'Roadmap units this user has completed. The cursor is derived: the first unit of the ordered curriculum that has no row here.';
comment on column public.user_roadmap.unit_id is
  'Unit id such as s3b1-button_pullup. Deliberately not a foreign key: the curriculum lives in the client, and a unit being renamed should cost a learner one repeated exercise rather than a failed insert.';

create index if not exists user_roadmap_user_idx on public.user_roadmap (user_id);

-- ---------------------------------------------------------------------------
-- Row level security: strictly own rows, as everywhere else
-- ---------------------------------------------------------------------------
alter table public.user_roadmap enable row level security;

drop policy if exists "read own roadmap" on public.user_roadmap;
create policy "read own roadmap"
  on public.user_roadmap for select
  using (auth.uid() = user_id);

drop policy if exists "insert own roadmap" on public.user_roadmap;
create policy "insert own roadmap"
  on public.user_roadmap for insert
  with check (auth.uid() = user_id);

-- Deleting is how "reset my progress" would be implemented, and it is the
-- learner's own to do.
drop policy if exists "delete own roadmap" on public.user_roadmap;
create policy "delete own roadmap"
  on public.user_roadmap for delete
  using (auth.uid() = user_id);
