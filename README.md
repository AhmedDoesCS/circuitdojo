# CircuitDojo

Practice electronics design by **designing circuits**, not by watching videos or answering multiple choice.

Every challenge is a blank schematic sheet and a specification. You place real, industry-accurate symbols, wire
real nets, and press **Run Check**. The app grades what you drew the way a professor grades a problem set: what is
correct, what is electrically wrong, and what the brief asked for that you never addressed.

```bash
npm install
npm run dev      # http://localhost:5173
```

No backend needed to start: guest mode stores everything locally.

---

## What is in the box

| | |
| --- | --- |
| **Schematic editor** | SVG, grid-snapped, explicit junctions, multi-unit ICs with real power units, rotation/mirroring, undo/redo, zoom/pan. |
| **Validation engine** | An ERC pass (shorts, floating pins/inputs, unpowered chips, output conflicts) and a requirements pass against a structured schema. |
| **Challenge library** | 36 hand-authored recipes across 13 topics, each parameterised by a seed so the numbers change every time, and each shipping a reference schematic graded by the real checker. |
| **Concept model** | 37 concepts from Ohm's law to mixed-signal partitioning, each with formulas, application notes, professional standards and further reading. |
| **Symbol library** | 59 symbols: passives, discretes, 74HC logic, op-amps, comparators, MCUs, sensors, motor drivers, protection parts. |
| **Roadmap** | Twelve stages of interleaved blocks, each ending in a capstone you can pass cold to skip the rest of it. |
| **Guided hints** | Three-step escalation after a failed check: where to look → the principle → the fix. |

---

## The workspace

The canvas owns the whole window. Everything else floats above it as a dismissible glass widget:

- **Brief**: goal, requirements, theory (formulas always given) and, for MCU challenges, the firmware contract.
- **Components**: searchable palette; multi-unit parts expand into their units, including the power unit.
- **Properties**: reference designator and value for the selection.
- **Results**: feedback, hints and the extracted netlist.
- **Reference**: on-demand quick reference, never auto-popped.

**Focus** clears the screen down to canvas, parts and tools; the toggles stay live so the brief is always one click
away.

### Keyboard (KiCad bindings)

| | |
| --- | --- |
| `A` / `P` | Add component / power symbol |
| `W` `J` `L` `Q` | Wire, junction, net label, no-connect |
| `M` `R` `X` `Y` | Move, rotate, mirror horizontally/vertically |
| `V` `U` `E` | Edit value, reference, properties |
| `Ctrl+D` / `Del` | Duplicate / delete |
| `F` | Zoom to fit |
| `Ctrl+Enter` | Run check |
| `?` | Full shortcut sheet |

---

## How grading works

1. **Netlist extraction** (`src/schematic/netlist.js`) turns the drawing into electrical nets with union-find.
   Wires crossing without a junction dot are *not* connected, a real and deliberately preserved trap.
2. **ERC** (`src/engine/erc.js`) checks validity independent of intent, and explains consequences rather than codes.
3. **Requirements** (`src/engine/checks.js`) evaluate a declarative JSON schema against the netlist, classifying
   each failure as *wrong* (present but incorrect) or *missing* (never addressed).

Both passes always run: a circuit can be electrically clean and still fail the brief, and vice versa.

---

## The roadmap

Twelve stages, from one closed loop to designing for production. A stage is a handful of **blocks**, and a block is a
short arc of units around one idea, taken through analysis, real components, the canonical recipe and professional
practice in the order that idea is actually learned. Progression is linear in sequence and deliberately not linear in
subject.

Not every unit is a drawing. A **Build** unit is a blank sheet and a specification; an **Analyse** unit asks for a
number; an **Inspect** unit hands you somebody else's schematic with one fault in it and asks you to find it. The
faults are injected into the reference answers by seeded mutation, so what is wrong is known by construction.

Each block ends in a **capstone** Build unit. Pass it cold and the whole block is complete, which is how you skip
material you already know: by examination rather than by claim, so it cannot leave a silent gap.

Mastery still exists underneath, per concept, and still moves on every pass and fail. It no longer decides what you
see next; it is what practice mode will weight its projects by.

A challenge instance is a `(templateId, seed)` pair: the template hand-authors the topology so it always makes
engineering sense, the seed randomises the numbers.

Design notes and what is still to come: [PLAN.md](PLAN.md).

---

## Microcontroller challenges without programming

MCU templates ship a **firmware contract**: the software behaviour stated as a hardware requirement: which pins
are driven, which are read, and what state each holds during reset. You design hardware that supports it (an
external pull-up because the contract says the internal one is off; a pull-down on an enable pin because every pin
is high-impedance until firmware runs) without writing any code.

---

## The Manual

`docs/` is a nine-chapter companion that teaches the entire stack from zero: written so that someone who has never
used JavaScript can reach the point of building an application of this complexity unaided.

```bash
npm run docs      # opens the manual locally at /docs/index.html
```

It is published with the app rather than left behind in the repository: the
build copies it to `dist/docs`, so a deployed site serves it at `/docs/`.

| Chapter | Covers |
| --- | --- |
| 01 Foundations | How the web works, HTML, CSS, terminal, Node, npm, git, project anatomy |
| 02 JavaScript | Values, functions, closures, objects, arrays, modules, async, immutability, errors |
| 03 React | JSX, props, hooks in depth, reducers, refs, overlays, events, performance |
| 04 Tooling | Vite, Tailwind, DevTools debugging, `node:test`, git workflow, deployment |
| 05 Backend & data | Client/server model, relational design, SQL, auth, row-level security |
| 06 Design | Type scales, spacing rhythm, colour discipline, Liquid Glass anatomy, motion, game-menu layout, accessibility |
| 07 Architecture | Engine/UI split, union-find netlists, the rules DSL, overlay state machines |
| 08 Recipes | 15 copy-paste patterns with the reasoning attached |

Every chapter teaches from this codebase's real source, including the bugs and what they taught. The manual is
updated with the app, see the changelog on its front page.

---

## Optional: accounts and cloud progress

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Optional: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-challenges.mjs` to populate the
   challenge catalogue table.

Schema and design decisions: [SCHEMA.md](SCHEMA.md). Guest progress migrates to the account on sign-up.

---

## Tests

```bash
npm test
```

- `tests/engine.test.js`: netlist semantics, ERC behaviour, a complete correct solution and deliberate mistakes.
- `tests/symbols.test.js`: the library audit: on-grid pins, valid electrical types, and that every symbol id, tag
  and pin name referenced by a challenge actually exists.
- `tests/editor.test.js`: the document operations behind the canvas gestures, and the level model.
- `tests/solutions.test.js`: every reference answer, graded by the real checker across sixteen seeds each, and checked
  as a *drawing*: no wire may cross a pin it does not connect to.

The audit matters: a typo in a pin name would otherwise ship as an unsolvable challenge. It has already caught two
real geometry bugs.

---

## Deployment

`npm run build` produces a static `dist/`, containing the app and the manual at
`dist/docs`. There is no server to run.

### Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). Vite is detected
automatically: `npm run build`, output `dist`, served from the root. No
configuration file is needed and `BASE_PATH` stays unset.

If you are using accounts, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
under Settings, Environment Variables, then redeploy so they are baked into the
bundle.

### Anywhere else

Netlify and Cloudflare Pages serve `dist/` unchanged. GitHub Pages works too,
but a project site is served from `/<repository>/` rather than the root, so the
build needs `BASE_PATH=/<repository>/` for asset URLs to resolve.

`.github/workflows/test.yml` runs the tests and a build on every push. It does
not deploy: the host does that.

### Moving your progress between sites

Progress lives in `localStorage`, which browsers scope to the **origin**: scheme,
host and port. So `localhost:5173` and a deployed site are two different stores,
and opening the deployed site gives you an empty profile even though nothing was
lost.

Carry it across by hand:

1. On the site that has your progress, open **Profile > Account > Back up this
   profile** and download the JSON.
2. On the other site, open the same panel and restore that file.

Signing in removes the problem entirely, since progress then lives in the
database rather than in one browser.

---

## Project layout

```
src/
  schematic/     geometry, symbol library, document model, editing ops, netlist extraction
  engine/        ERC, requirement checks, component graph, hints, evaluation
  challenges/    concepts, templates, seeded instantiation, level-based selection
  components/    canvas, widgets, overlays
  state/         useSchematic (reducer + undo), useProfile (auth, settings, mastery)
  lib/           level model, storage, shortcuts, Supabase client
supabase/        SQL migration with RLS policies
docs/            the engineering companion site
tests/           engine and symbol-library tests
```
