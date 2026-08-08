# Database schema

CircuitDojo stores three things: **what can be practised** (challenge templates),
**how each learner is doing** (progress), and **what they actually drew** (attempts).
Everything else: symbols, rules, generated challenges: lives in code, because it is
logic, not data.

The migration is [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

If you have never designed a schema before, the short version is: each table below is a
spreadsheet, `primary key` is the column combination that makes a row unique, and
`references` means "this column must point at a real row in that other table".

---

## `challenges` - the catalogue of templates

| column | type | meaning |
| --- | --- | --- |
| `id` | uuid, PK | surrogate key |
| `template_id` | text, unique | matches the `id` of a template in `src/challenges/templates/` |
| `topic` | text | `passives`, `pull_resistors`, `power_supply`, `digital_logic`, `op_amp`, `sensors`, `comms`, `timing`, `mixed_signal` |
| `difficulty_tier` | int 1-8 | the curriculum tier |
| `title` | text | shown in the browser |
| `concept` | text | the one-line teaching point |
| `brief` | jsonb | `{goal, spec[], notes}` of a *sample* generated instance |
| `requirements_schema` | jsonb | structured checks of that sample instance |
| `is_template` | bool | always true today; kept for one-off hand-authored challenges later |
| `template_params` | jsonb | the randomised parameters of the sample |

### Why templates and not challenges

A playable challenge is a `(template_id, seed)` pair. The template hand-authors the
topology and the pedagogy; the seed randomises the numbers (supply rail, LED colour and
forward voltage, target current, cutoff frequency...). `instantiate(templateId, seed)`
rebuilds the exact same brief and requirement schema every time, so:

- the pool is effectively unlimited without storing a single generated row,
- an attempt from six months ago replays perfectly from two small columns,
- and no generator can ever emit an incoherent circuit, because the topology was
  written by hand.

`brief` and `requirements_schema` are stored anyway (from `seed = 1`) so the catalogue is
readable in SQL without running the JavaScript.

---

## `user_progress` - one row per (user, skill)

> **Skill keys.** The `topic` column holds one of two kinds of key:
> a plain topic (`pull_resistors`, `power_supply`, ...) for the familiar
> "what have I practised" view, or `concept:<id>` (`concept:ohms_law`,
> `concept:i2c_bus`, ...) for per-concept mastery, which is what the level model
> actually reads. One table serves both, so adding the concept model needed no
> migration. Concept ids come from `src/challenges/concepts.js`.


| column | type | meaning |
| --- | --- | --- |
| `user_id` | uuid → `auth.users` | PK part 1 |
| `topic` | text | PK part 2 |
| `mastery` | numeric 0-1 | see below |
| `attempts` / `passes` / `fails` | int | counters |
| `streak` | int | consecutive passes on the topic |
| `last_result` | `'pass'` / `'fail'` | most recent outcome |
| `last_attempted_at` | timestamptz | for recency-based selection |

Mastery moves a third of the way to 1 on a pass and drops on a fail
(`src/lib/progress.js`). A tier unlocks when the tier below averages ≥ 0.6, and weak
topics are weighted up when picking the next challenge, the spaced-repetition behaviour
the brief asked for.

The topic (not the template) is the unit of mastery: understanding pull resistors should
count regardless of which pull-resistor challenge produced the evidence.

---

## `attempts` - one row per Run Check

| column | type | meaning |
| --- | --- | --- |
| `id` | uuid, PK | |
| `user_id` | uuid, nullable → `auth.users` | null is reserved for guests; see below |
| `challenge_template_id` | text → `challenges.template_id` | which template |
| `seed` | bigint | which instance |
| `challenge_snapshot` | jsonb | the brief and requirements exactly as presented |
| `schematic_state` | jsonb | the serialized document: components, wires, junctions, labels |
| `result` | `'pass'` / `'fail'` | |
| `feedback` | jsonb | `{correct[], errors[], missing[]}` from the validation engine |
| `created_at` | timestamptz | |

`challenge_snapshot` is deliberate redundancy: if a template is later reworded or
retuned, old attempts still show what was actually asked at the time.

`schematic_state` is the same JSON the editor uses in memory, so an attempt can be
loaded straight back into the canvas for review.

---

## Row level security

RLS is on for all three tables.

- **`challenges`**: readable by everyone (including anonymous visitors), writable only
  with the service role key (`scripts/sync-challenges.mjs`).
- **`user_progress`** and **`attempts`**: a user can only read and write rows where
  `auth.uid() = user_id`. There is no cross-user visibility of any kind.

### Guests

Guest mode is a real, supported path: progress and attempts go to `localStorage`
(`src/lib/storage.js`) and nothing is sent anywhere. On sign-up the guest snapshot is
upserted into `user_progress`, so nobody loses their work by making an account.

That is why there is **no** anonymous-insert policy on `attempts` even though `user_id`
is nullable: an anon-writable table is an open spam target and buys nothing here. If you
later want telemetry from signed-out users, enable Supabase anonymous sign-in (which
still produces a real `auth.uid()`) rather than relaxing the policy.

---

## Deviations from the starting schema in the spec

| Spec | Here | Why |
| --- | --- | --- |
| `challenges.id` referenced by `attempts.challenge_id` | `attempts.challenge_template_id` + `seed` | a challenge instance is a template plus a seed, and storing the pair replays it exactly |
| `mastery_level` | `mastery` plus `attempts`/`passes`/`fails`/`streak` | selection needs "how often did they fail this recently", not just a level |
|: | `challenge_snapshot` | keeps old attempts meaningful after a template is edited |
|: | `concept`, `updated_at`, indexes | display and housekeeping |

---

## Setting it up

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Optional: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-challenges.mjs`
   to populate the catalogue table.

Skip all of it to stay in guest mode: the app is fully playable with no backend at all.
