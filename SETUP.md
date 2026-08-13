# Using CircuitDojo for real

Everything needed to go from "it is deployed" to "I use this, and other people
can too". Written in the order you should do it.

The short version: **you can use it right now, today, with nothing set up.**
Steps 3 onward are only about accounts and syncing across devices.

---

## 1. Use it today (nothing to do)

Open <https://circuitdojo.vercel.app/> and press **Start designing**.

The first time, it asks where you are starting from. That claim marks everything
below it as already known, so pick honestly: aiming too high means the first
challenge that catches you out has already skipped the thing that would have
taught you.

Then it just works. No account, no setup. This is **guest mode**, and it is a
first-class path rather than a trial: everything is available, nothing is
withheld, no feature asks you to sign in.

### Where your progress actually lives

In `localStorage`, in that browser, on that machine.

That has one consequence worth understanding properly, because it will otherwise
look like a bug:

> Browser storage is scoped to an **origin**, which is scheme + host + **port**.

So these are three completely separate profiles, each with its own progress:

| Origin | What it is |
| --- | --- |
| `https://circuitdojo.vercel.app` | The deployed app |
| `http://localhost:5173` | `npm run dev` on your machine |
| `http://localhost:4173` | `npm run preview` on your machine |

Nothing is lost when you switch between them; they simply cannot see each other.
Pick one and stay in it. For actually learning, use the Vercel URL: it is the
same on every machine you own and it survives you deleting the repo.

Guest progress also disappears if you clear site data, use private browsing, or
your browser evicts storage under pressure. Which is what step 2 is for.

---

## 2. Protect your guest progress (2 minutes, do this now)

**Profile → Account → Back up this profile → Download.**

You get a JSON file containing your roadmap position, concept mastery, attempt
history and settings. Restoring it on any origin puts all of that back.

Do this now, and again whenever you have put in real work. It is the only escape
hatch that does not need a server, and it is the reason guest mode is a real
option rather than a demo.

> The backup carries your roadmap position as of version 2 of the format. If you
> have a file from before that, restoring it will bring back your mastery and
> settings and deliberately leave your curriculum position untouched rather than
> resetting it.

---

## 3. Accounts: create a Supabase project

Everything from here is optional. Do it when you want progress that follows you
across devices, or when you want other people to have their own accounts rather
than their own browser.

CircuitDojo has no server of its own. Accounts, if you enable them, are Supabase:
a hosted Postgres with authentication in front of it. The free tier is far more
than this needs.

1. Sign up at <https://supabase.com> and create a **New project**.
2. Name it whatever you like. Choose the region closest to you.
3. Set a database password and save it somewhere. You will not need it for this,
   but you will be annoyed later if you have lost it.
4. Wait for it to finish provisioning (a minute or two).

### Create the tables

Open **SQL Editor** in the project sidebar, then run the two migration files from
this repository **in order**:

1. `supabase/migrations/0001_init.sql` — the challenge catalogue, per-topic
   progress, and attempt history.
2. `supabase/migrations/0002_roadmap.sql` — which roadmap units you have
   completed. This is the one that stores your actual position in the
   curriculum, so do not skip it.

Paste each file's contents into a new query and press Run. Both are written to
be safe to run more than once.

Row-level security is switched on for every table by those files, so one
account can never read another's progress. That is not something you have to
configure; it is in the migration.

### Decide about email confirmation

**Authentication → Providers → Email → Confirm email.**

- **On** (the Supabase default): signing up sends a confirmation email, and the
  account does not work until the link is clicked. Right if strangers will be
  signing up.
- **Off**: sign-up is instant. Right if it is you and a few people you know.

If you leave it on, also set **Authentication → URL Configuration → Site URL** to
`https://circuitdojo.vercel.app`, or the confirmation link will try to send
people back to `localhost`.

### Copy the two keys

**Project Settings → API**. You need:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon / public key** — a long string beginning `eyJ...`

The anon key is meant to be public and ships in the browser bundle. That is
safe *because* row-level security is on. The **service role** key on the same
page is not safe to expose: it bypasses every policy. Do not put it in Vercel,
and do not put it in this project.

---

## 4. Give the keys to Vercel and redeploy

In your Vercel project: **Settings → Environment Variables**. Add two, for all
environments (Production, Preview, Development):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |

Then **redeploy**. This part matters and catches people out:

> Anything prefixed `VITE_` is read at **build** time and baked into the
> JavaScript bundle. Adding an environment variable does nothing to the site that
> is already deployed. You must trigger a new build.

Easiest way: **Deployments → the most recent one → ⋯ → Redeploy**. Or push any
commit, which builds automatically.

To run it locally with accounts too, copy `.env.example` to `.env`, fill in the
same two values, and restart `npm run dev`.

---

## 5. Verify it worked

Open the site and go to **Profile → Account**.

- **"Running in guest mode… Not configured"** means the environment variables did
  not reach the build. Check the spelling, check they are enabled for Production,
  and check you redeployed after adding them.
- An **email and password form** means it is connected.

Now test the thing that actually matters, in this order:

1. As a guest, complete two or three units, so you have something to lose.
2. **Create account** with your email and a password of at least 6 characters.
3. If confirmation is on, click the link in the email, then sign in.
4. Check that your position is intact: the home screen should still say the
   stage you were on, and **The roadmap** should still show your completed units
   ticked.
5. Open the site in a different browser or a private window, sign in, and check
   the same thing appears there.

Step 5 is the whole point of the exercise. If it works, you are done.

---

## What other people will experience

Share `https://circuitdojo.vercel.app/` with anyone. Nothing else is needed.

**Without Supabase configured**, every visitor gets a full working app with their
own private progress in their own browser. Nobody can see anybody else's
anything, because there is no server holding it.

**With Supabase configured**, they can additionally create an account and have
their progress follow them. Row-level security means each account sees strictly
its own rows.

If you would rather not have strangers signing up, either leave accounts off
entirely, or turn on email confirmation and keep the URL among people you have
given it to. There is no invite system.

---

## What an account does and does not cover

| Carried across devices | Not carried |
| --- | --- |
| Roadmap position (units completed) | The sheet you have open right now |
| Concept mastery | Theme, accent and other preferences |
| Attempt history (last 50) | |

The open sheet is deliberately local: it is scratch work, and syncing a
half-finished drawing between devices would create conflicts nobody asked for.
Preferences are per-device on purpose too, since the machine you use in the dark
may not be the one you use at a desk.

Signing in **merges** rather than replaces. If you have done units as a guest on
a device and then sign in, the two sets are combined; nothing is taken away, and
anything that device knew and the server did not gets pushed up.

---

## Optional extras

**Populate the challenge catalogue table.** Nothing in the app needs it — the
client generates every challenge from its own templates — but it is useful if you
ever want to query the content from SQL:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-challenges.mjs
```

Run it from your own machine, never from a deployed environment: it needs the
service role key.

**Your own domain.** Vercel: Settings → Domains → add the domain and follow the
DNS instructions. Remember to update the Supabase **Site URL** afterwards if you
have email confirmation on. Note also that changing the domain changes the
origin, so any guest progress on the old address will not follow: back it up and
restore it, or sign in.

**Keep the tests honest.** `npm test` before you push. Vercel deploys whatever is
on GitHub and only the build succeeding gates it; the GitHub Action runs the
suite alongside but cannot block the deploy.
