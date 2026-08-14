# Roadmap and Practice Mode

A plan for replacing weighted random selection with a designed curriculum, and
for moving random generation to where it belongs: project work after the
fundamentals are in place.

---

## 1. Why the current model does not work early on

Selection today draws a template at random from a band around the learner's
level, weighted toward concepts they have not held or recently failed. That is a
reasonable model for revision. It is a poor model for teaching, for three
reasons.

**Nothing builds.** Two consecutive draws can be a pull-up and a 555 oscillator.
Each is fine alone, neither prepares you for the other, and the learner never
feels the sense that today's circuit was made possible by yesterday's.

**Prerequisites are a filter, not a curriculum.** `prereqsMet` can stop an unfair
draw. It cannot decide that the right thing to learn next is what a capacitor
actually does, because nothing in the system has an opinion about order.

**Three of the four skills are unteachable by drawing alone.** Analysis,
component knowledge and professional practice are being smuggled into
schematic-capture exercises. "Draw a divider" does not teach loading, does not
teach why you cannot buy a 3.147k resistor, and does not teach that a real design
states a tolerance.

Random generation is not wrong. It is aimed at the wrong stage.

---

## 2. The four strands

The roadmap is built from four kinds of knowledge, interleaved rather than
stacked.

| Strand | Code | What it teaches | Question it answers |
| --- | --- | --- | --- |
| Analysis | **A** | Circuit theory and the arithmetic that goes with it | What will this circuit do? |
| Components | **C** | Real parts, their behaviour, ratings, packages, datasheets | What can I actually buy, and what will it stand? |
| Practice | **P** | Industry convention, review discipline, design margin | Would this pass a design review? |
| Recipes | **R** | The canonical blocks professionals reach for | What is the standard way to do this? |

### The interleaving rule

Progression is linear in sequence but never linear in strand. The unit of design
is a **block**: a short arc of four to six units that takes one idea through all
four strands, in the order that idea is actually learned.

A block for "dividing a voltage" looks like this:

1. **A** Work out the output of a two-resistor divider from the supply and the ratio.
2. **A** Predict what happens to that output when a 10k load hangs off the midpoint.
3. **C** Resistor reality: E24 values, tolerance, power rating, why 3.147k does not exist.
4. **R** Build a divider to a stated output voltage, choosing real values.
5. **R** Build the same divider as a thermistor front end, where the ratio moves.
6. **P** State the worst-case output across tolerance, and say whether it still meets the spec.

Six units, one idea, four strands, and each unit is only possible because of the
one before. That is the pattern the whole roadmap repeats. A stage is three to
five blocks; the roadmap is twelve stages.

---

## 3. Not every unit is a drawing

This is the change that makes the content volume affordable and, separately,
makes the four strands teachable at all.

| Kind | The learner does | Graded by | Strands served |
| --- | --- | --- | --- |
| **Build** | Draws a schematic to a spec. What exists today. | The current engine, unchanged | R, P |
| **Analyse** | Reads a given schematic and enters numbers | Numeric answer with tolerance | A |
| **Inspect** | Finds the fault in a schematic under review | Selecting the offending item on the sheet | P, C |
| **Choose** | Picks a part or value from a shortlist with datasheet extracts | Selection, with a required reason | C, P |
| **Trace** | Marks the current path, or the node that must be one net | Selecting wires and nodes | A, R |

Four points about this.

**Inspect units are nearly free to author.** A reference solution already exists
for a growing number of templates, and every one is proven correct by
`tests/solutions.test.js`. Apply a seeded mutation to it (delete a wire, reverse
a polarised part, move a decoupling capacitor two nodes away, change a value by
a decade) and the fault is known by construction. The learner has to find what
the grader already knows. This is also the single most job-relevant exercise in
the whole app: reviewing someone else's schematic is what an engineer does far
more often than drawing from scratch.

**Analyse units cost minutes to write.** A parameterised question, an expected
value, a tolerance. They carry the entire Analysis strand and they seed the
Build units that follow with numbers the learner has already computed.

**They keep the session moving.** A stage of nothing but full schematic captures
is heavy. Mixing in units that take forty seconds changes the rhythm without
lowering the standard.

**They reuse everything.** Analyse and Trace units render with `SolutionView`,
which already exists. Inspect uses the existing canvas in a read-only selection
mode. No new rendering stack.

---

## 4. The roadmap

Twelve stages. Naming keeps the existing eight-band expertise ladder as the
outer shell so nothing already earned is thrown away; stages map onto bands.

| Stage | Title | Blocks | The learner can, by the end |
| --- | --- | --- | --- |
| 1 | Current, voltage and a closed loop | 3 | Reason about a single loop; light an LED without destroying it |
| 2 | Resistance in combination | 4 | Series, parallel, dividers, loading; pick real values |
| 3 | Switches and defined levels | 3 | Never leave a node floating; pull resistors; contact bounce |
| 4 | Charge, capacitors and time | 4 | RC behaviour; decoupling as a local energy store, not a ritual |
| 5 | Diodes and the parts that only work one way | 3 | Rectification, clamping, flyback, polarity discipline |
| 6 | Transistors as switches | 4 | Drive a real load from a logic pin; saturation, gate charge |
| 7 | Powering a board | 4 | Linear regulation, bulk versus bypass, rail sequencing, thermal |
| 8 | Operational amplifiers | 5 | Feedback, the standard configurations, rails and input range |
| 9 | Sensing the physical world | 4 | Front ends, references, ADC input requirements, noise |
| 10 | Digital interfaces | 4 | Logic families, level shifting, I2C and SPI at circuit level |
| 11 | Switching power and motion | 4 | Buck topology, H-bridge, isolation, current sensing |
| 12 | Designing for production | 4 | Worst case, derating, protection, EMC, design review |

Roughly 46 blocks, roughly 14 units per stage, **about 165 units total**.

The 36 existing templates all survive as Build units, redistributed across
stages. Around 130 units are new, of which the majority are the cheaper kinds.

### Practice mode unlocks after stage 6

By then the learner can analyse a loop, choose real parts, drive a load, and hold
a node at a defined level. That is the minimum set for a project to be a design
exercise rather than a guessing game. Everything after stage 6 widens what
practice mode is allowed to compose.

---

## 5. Practice mode

A ranked mode, in the sense the term is used in games: a persistent rating, a
visible tier, matched difficulty, and results that count.

### What a project is

A brief that requires two or more roadmap recipes composed into one working
circuit, with the constraints stated the way a specification states them rather
than the way a lesson states them. Generated, not hand-authored, from:

- **the roadmap's own recipes**, which is the guarantee of fairness. A project may
  only require blocks the learner has completed.
- **an interview bank**: constrained design questions of the kind actually asked.
  The recurring shapes are a specification handed over with gain, load, supply
  and bandwidth and a request for a topology plus hand calculations; equivalent
  resistance and Thevenin reductions; RC and RLC response; MOSFET switching;
  op-amp configurations from requirements. Sources listed at the end.
- **an application bank**: product contexts that hobbyists and firms genuinely
  build. H-bridges for robotics, power windows, wipers and inverters; level
  shifters between a 3.3V microcontroller and 5V peripherals or across an I2C
  bus; buck converters in phones, laptops, battery packs and quadcopters; sensor
  front ends for RTDs, strain gauges, gas detection and pH.

### Rating and tiers

A single rating that moves on each attempt, weighted by project difficulty and
by whether the reference was consulted. Tiers are named for where the work would
be trusted, which keeps the metaphor inside the subject:

Breadboard, Prototype, Pilot Run, Production, Qualified.

Placement is five projects on unlock. Rank decays only if the learner disappears
for a long time, and never below the floor of its tier.

### How a ranked attempt differs from a roadmap unit

| | Roadmap | Ranked project |
| --- | --- | --- |
| Attempts | Three, then the reference | Two, and the reference costs rating |
| Hints | Full escalation | Nudge only, and it is recorded |
| Brief | States the requirements | States the goal; some requirements are implied |
| Failure | Costs nothing but time | Costs rating |
| Selection | The next unit | Drawn from what the roadmap has unlocked, weighted to the rating |

The implied-requirements point is the real difficulty ramp. A roadmap brief says
"fit a 100nF decoupling capacitor". A ranked brief says "this runs from a 5V rail
and switches at 8MHz" and expects the learner to know that decoupling is now their
problem. The grader does not change; only how much the brief gives away.

---

## 6. Data model

### New

```
src/roadmap/index.js      ordered units, stage and block structure, lookup by id
src/roadmap/units/*.js    the content, one file per stage
src/practice/generate.js  project composition from unlocked recipes plus banks
src/practice/banks.js     interview shapes and application contexts
src/engine/answer.js      grading for Analyse, Choose and Trace units
src/engine/mutate.js      seeded fault injection for Inspect units
```

A unit:

```js
{
  id: 'r2b1-divider-loaded',
  stage: 2, block: 1, strand: 'A', kind: 'analyse',
  title: 'What the load does to a divider',
  requires: ['r2b1-divider-ratio'],
  // kind-specific payload: templateId for build, question for analyse, ...
}
```

### Changed

- `useProfile` gains `roadmap: { cursor, completed[] }` and `practice: { rating, tier, played }`.
- `computeLevel` derives the band from stage rather than from mastery coverage.
  Mastery survives, because practice mode still uses it for weighting.
- `selectChallenge` is no longer the entry point. It becomes practice mode's
  generator input.

### Migration

Existing profiles have mastery but no cursor. On first load, place the cursor at
the first unit whose concepts are not already held, and mark everything before it
complete. A learner at level 2 today lands part-way into stage 3 rather than back
at the beginning. Same one-time flag mechanism already used for the label repair.

---

## 7. Keeping it snappy

The requirement is that pressing Start Designing puts you in a brief, with no
menu of levels in between. That is achievable and in fact gets cheaper.

- **The next unit is a cursor read.** `roadmap[profile.roadmap.cursor]`. No
  weighting pass over 36 templates, no RNG. Strictly faster than today.
- **The roadmap is a static import**, resolved at build time. No fetch, no
  loading state, no code splitting on the critical path.
- **The brief flow is unchanged.** Iris closes, unit instantiates at the midpoint,
  brief appears. Identical to the current transition.
- **Continue Designing is unchanged.** It resumes the open sheet, exactly as now.
- **The roadmap map is a destination, not a gate.** It lives behind its own menu
  option for people who want to see where they are. Nobody is made to walk
  through it to start work.
- **Non-Build units mount lighter.** An Analyse unit is a static schematic and a
  number field. It should appear faster than a Build unit does today.

Budget to hold: click to brief visible in under the current 1.4s transition, and
no added main-thread work at the midpoint.

---

## 8. Priorities

Ordered so that the app behaves the new way as early as possible, and every phase
ships something usable.

**P0. Make the shift real with existing content.**
Roadmap model, cursor, migration, Start Designing follows the roadmap, the 36
existing templates ordered into stages 1 to 8. No new content, no new unit kinds.
After this the app is a roadmap, not a shuffler.

**P1. The cheap unit kinds.**
Analyse and Inspect: grading, rendering, results. These unlock the Analysis and
Practice strands and make the remaining content affordable. Inspect depends on
reference solutions, so it also motivates finishing those.

**Done.** `src/engine/answer.js` grades Analyse; `src/engine/mutate.js` injects
Inspect faults and verifies each one against the real grader before offering it.
All thirty-six templates now ship a reference schematic, so every one of them
can carry an Inspect unit. That was the gate on P2 and P4, and it is open.

**P2. Content for stages 1 to 4.**
The learner's current position. Roughly 55 units, mostly Analyse and Inspect
around the Build units that already exist.

**Done.** Forty-two units across the four stages.

**P3. Practice mode.**
Generator, banks, rating, tiers, unlock at stage 6.

**P4. Content for stages 5 to 12.**
The long tail, roughly 110 units. Sequenced so each stage ships complete.

**Done.** Ninety-five units across the eight stages, for a roadmap of 137: 70
Analyse, 36 Build, 31 Inspect. Every one of the twenty-one blocks that already
had a circuit now has the arithmetic in front of it and a review of it behind.

Two things fell out of writing it. The reported expertise band was still derived
from concept mastery, and most units on the roadmap do not move mastery at all,
so a learner in stage 12 was shown as a Newcomer at 0%: the band now follows the
roadmap and mastery keeps the job it is still needed for. And the number
formatter used for component values was being used for the quantities inside a
question, where a 0.6 V diode drop came out as "600m V".

**P5. The roadmap map screen.**
A view of where you are and what is ahead. Deliberately last: it is the part
people imagine first and need least.

**Done.** `src/components/LevelsScreen.jsx`, behind its own menu option, entered
through the iris like every other screen. A completed unit can be sat again from
here, which costs nothing and un-completes nothing; what is ahead is shown but
not offered, because the order is the curriculum.

It was moved ahead of P3 once the roadmap reached 137 units: a curriculum that
large is not legible one unit at a time, and P3 is a large enough piece that
leaving it half-built would be worse than not starting it.

**Rebuilt as Levels.** The first version was a modal of twelve collapsible
sections. Everything in it was true and none of it was inspiring: it read as a
checklist of things already learned, and a checklist looks backwards, which is
the one direction a map should not. The rebuild takes the metaphor the app
already owns and applies it to the curriculum itself: **the roadmap is a circuit
being energised.** Cleared work is live copper with current running it, the
frontier is the live edge, and what is ahead is an unpopulated footprint, drawn
on the board and waiting. Twelve stages ride one supply rail across the top, and
each block taps off it. A capstone is a diamond, because a capstone is the test
point at the end of a run.

Selecting is separated from starting, which is what buys the "look into the
future" the screen exists for: a locked unit is not a dead row, it says what
kind of work it is, what that work involves and exactly how far away it is. It
also stays off the critical path: Continue Challenge and Start Designing both
still go straight to work without coming through here.

### Where the remaining session goes

P0 is the piece that changes the product, and it is self-contained. If there is
time after it, P1 first, since it is what makes P2 onwards cheap. Content
authoring is the long pole and should not start until the model underneath it is
settled, or it gets written twice.

---

## 9. Decisions

**Twelve stages.** More room per idea, and the learner holds each one longer
before the next arrives. The existing eight expertise bands become a display
mapping over the twelve, so the percentage still means something.

**Skipping is by examination, not by claim.** Each block ends in a Build unit
marked as its capstone. Pass that cold and the whole block is complete. This
replaces the current "too easy" button, which claimed a band on the learner's
word. A claim creates gaps silently; a capstone cannot.

**A ranked loss never touches roadmap progress.** The two systems record
different things. The roadmap records what you have been taught; the rating
records how you are performing right now. A bad afternoon in ranked play does
not un-teach anything, and taking progress away for it would make the mode
something to avoid rather than something to test yourself against.

**A ranked loss is a recommendation, not a penalty.** The rating moves, and that
is the whole of the cost. What the failure produces instead is a reading list:
the failed requirements map back to the roadmap blocks that taught them, and the
result screen offers those blocks by name, to replay. Revisiting is free, does
not reset anything, and completed blocks stay completed.

This makes ranked play diagnostic. The mode's job is to tell you what you have
not really internalised, and then point at the exact lesson that covers it.

---

## Sources for the practice banks

- [Hardware Engineer Interview Questions, analog set](https://github.com/mikinty/Hardware-Engineer-Interview-Questions/blob/master/questions/analog-questions.md)
- [Top interview questions for analog design engineers](https://www.learnelectronicsindia.com/post/top-30-interview-questions-answers-for-analog-design-engineer)
- [H-bridge motor control, topologies and applications](https://www.wevolver.com/article/h-bridge-motor-control-a-complete-guide-for-engineers-2025)
- [Level shifter circuits, design basics and applications](https://www.renesas.com/en/document/whp/level-shifter-circuits-design-basics-and-applications)
- [Buck converters and their applications](https://www.allaboutcircuits.com/technical-articles/buck-converters-and-their-cool-applications/)
- [The evolution of sensor analog front ends](https://www.electronicdesign.com/technologies/analog/article/21798144/the-evolution-of-sensor-analog-front-ends)
