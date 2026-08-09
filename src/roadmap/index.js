/**
 * The roadmap.
 *
 * An ordered curriculum from a single loop of current to a finished product.
 * Twelve stages, each a handful of blocks, each block a short arc around one
 * idea. Progression is linear in sequence and deliberately not linear in
 * subject: a block moves through analysis, components, recipes and professional
 * practice as that idea is actually learned.
 *
 * This file holds the structure and the ordering. It does not hold the content:
 * a unit points at a challenge template, and everything about what the learner
 * reads and is graded on still lives with that template.
 *
 * Selection used to be a weighted random draw. It is now a cursor into this
 * array, which is both a better curriculum and a faster lookup.
 */

import { getTemplate } from '../challenges/index.js';

/**
 * Every block ends in a capstone: the Build unit that demonstrates the block's
 * idea end to end. Passing a capstone cold completes the whole block, which is
 * how a learner skips material they already know. It is an examination rather
 * than a claim, so it cannot leave a silent gap.
 */
export const STAGES = [
  {
    stage: 1,
    name: 'One closed loop',
    blurb: 'Current only flows in a complete circuit, and something has to limit it.',
    blocks: [
      {
        block: 1,
        name: 'Current, voltage and a resistor',
        units: [
          {
            kind: 'analyse',
            slug: 'ohms-law-current',
            title: 'How much current flows',
            prompt:
              'A {r} resistor is connected straight across a {v} V supply. What current flows through it?',
            params: (rng) => ({ v: rng.pick([3.3, 5, 9, 12]), r: rng.pick([220, 470, 1000, 2200]) }),
            answer: (p) => p.v / p.r,
            unit: 'A',
            hint: "Ohm's law, rearranged for current.",
            explain: (p) => `I = V / R = ${p.v} / ${p.r}`,
          },
          {
            kind: 'analyse',
            slug: 'led-resistor-value',
            title: 'Sizing the resistor',
            prompt:
              'An LED dropping {vf} V is to run at {ma} mA from a {v} V rail. What resistance goes in series with it?',
            params: (rng) => ({
              v: rng.pick([5, 9, 12]),
              vf: rng.pick([1.8, 2.1, 3.2]),
              ma: rng.pick([5, 10, 20]),
            }),
            answer: (p) => (p.v - p.vf) / (p.ma / 1000),
            unit: 'ohm',
            hint: 'The resistor drops whatever the LED does not.',
            explain: (p) =>
              `V across the resistor is ${p.v} - ${p.vf} = ${(p.v - p.vf).toFixed(1)} V, and R = V / I.`,
          },
          'led_current_limit',
          {
            kind: 'inspect',
            slug: 'led-review',
            templateId: 'led_current_limit',
            title: 'Review: an LED indicator',
            prompt:
              'This sheet came back from a colleague. It does not work. Find the one thing that is wrong with it.',
          },
        ],
      },
      { block: 2, name: 'Interrupting the loop', units: ['switched_led'] },
    ],
  },
  {
    stage: 2,
    name: 'Resistance in combination',
    blurb: 'Branches, ratios and the values you can actually buy.',
    blocks: [
      { block: 1, name: 'Branches that do not interfere', units: ['two_led_indicators', 'led_bar_indicators'] },
      { block: 2, name: 'Dividing a voltage', units: ['voltage_divider'] },
      { block: 3, name: 'More than one tap', units: ['divider_ladder'] },
    ],
  },
  {
    stage: 3,
    name: 'Switches and defined levels',
    blurb: 'A node with nothing holding it is not low. It is undefined.',
    blocks: [
      { block: 1, name: 'Pulling a node', units: ['button_pulldown', 'button_pullup'] },
      { block: 2, name: 'Changeover and shared lines', units: ['spdt_level_select', 'wired_or_buttons'] },
    ],
  },
  {
    stage: 4,
    name: 'Charge, capacitors and time',
    blurb: 'Storing energy locally, and what that buys you.',
    blocks: [
      { block: 1, name: 'Holding a rail up', units: ['rail_bypass_pair'] },
      { block: 2, name: 'RC and time', units: ['rc_lowpass'] },
    ],
  },
  {
    stage: 5,
    name: 'Parts that only work one way',
    blurb: 'Diodes, clamping and polarity discipline.',
    blocks: [{ block: 1, name: 'Clamping a rail', units: ['zener_shunt_reference'] }],
  },
  {
    stage: 6,
    name: 'Logic gates and real chips',
    blurb: 'A gate is one unit of a package that needs feeding.',
    blocks: [
      { block: 1, name: 'A gate is part of a chip', units: ['and_two_buttons'] },
      { block: 2, name: 'Making a gate do another job', units: ['nand_as_inverter', 'active_low_inverter'] },
      { block: 3, name: 'Comparing two inputs', units: ['xor_difference_detector'] },
      { block: 4, name: 'Cleaning up a real signal', units: ['rc_debounce'] },
    ],
  },
  {
    stage: 7,
    name: 'Transistors as switches',
    blurb: 'A logic pin cannot drive a load. Something has to multiply its current.',
    blocks: [{ block: 1, name: 'Driving a real load', units: ['transistor_load_switch'] }],
  },
  {
    stage: 8,
    name: 'Powering a board',
    blurb: 'Getting a clean rail to every part that needs one.',
    blocks: [
      { block: 1, name: 'Power entry', units: ['mcu_power_entry'] },
      { block: 2, name: 'Regulating a rail', units: ['linear_regulator'] },
      { block: 3, name: 'A quiet rail for analogue parts', units: ['ldo_analog_rail'] },
    ],
  },
  {
    stage: 9,
    name: 'Operational amplifiers',
    blurb: 'Feedback sets the behaviour, not the part.',
    blocks: [
      { block: 1, name: 'Buffering a signal', units: ['voltage_follower'] },
      { block: 2, name: 'Setting a gain', units: ['noninverting_amp', 'inverting_amp'] },
      { block: 3, name: 'Deciding, with hysteresis', units: ['comparator_hysteresis'] },
    ],
  },
  {
    stage: 10,
    name: 'Sensing the physical world',
    blurb: 'Turning a physical quantity into a voltage something can read.',
    blocks: [
      { block: 1, name: 'Resistive sensors', units: ['thermistor_adc'] },
      { block: 2, name: 'Sensors that output a voltage', units: ['tmp36_buffer'] },
    ],
  },
  {
    stage: 11,
    name: 'Digital interfaces and buses',
    blurb: 'Hardware that honours a contract the firmware depends on.',
    blocks: [
      { block: 1, name: 'The microcontroller contract', units: ['mcu_gpio_contract'] },
      { block: 2, name: 'A shared bus', units: ['i2c_pullups'] },
      { block: 3, name: 'Expanding the pin count', units: ['shift_register_outputs'] },
    ],
  },
  {
    stage: 12,
    name: 'Switching power, motion and production',
    blurb: 'The parts that bite, and designing so they do not.',
    blocks: [
      { block: 1, name: 'Making a clock', units: ['astable_555'] },
      { block: 2, name: 'Driving motion', units: ['mcu_motor_contract'] },
      { block: 3, name: 'Switching supplies', units: ['buck_feedback_divider'] },
      { block: 4, name: 'Protecting the product', units: ['supply_input_protection'] },
      { block: 5, name: 'A whole product', units: ['light_threshold_alarm'] },
    ],
  },
];

/** Practice mode opens once this stage is complete. */
export const PRACTICE_UNLOCK_STAGE = 6;

/**
 * The flat, ordered list the cursor indexes into.
 *
 * Built once at module load. Everything downstream is an array read, which is
 * what keeps pressing Start Designing as immediate as it was when selection was
 * random.
 */
/** Which strand a kind serves when the unit does not say. */
const DEFAULT_STRAND = {
  build: 'R',
  analyse: 'A',
  inspect: 'P',
  choose: 'C',
  trace: 'A',
};

function lastBuildIndex(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (typeof e === 'string' || (e.kind || 'build') === 'build') return i;
  }
  return -1;
}

export const UNITS = STAGES.flatMap((stage) =>
  stage.blocks.flatMap((block) =>
    block.units.map((entry, i) => {
      // A bare string is the shorthand for a Build unit, which is all the
      // roadmap contains today. Everything else is written out, so Analyse,
      // Inspect, Choose and Trace units drop in beside these without the
      // structure changing.
      const spec = typeof entry === 'string' ? { kind: 'build', templateId: entry } : entry;
      const kind = spec.kind || 'build';
      return {
        ...spec,
        kind,
        // The slug wins: a review unit names the same template as the Build
        // unit it reviews, and the two must not collide.
        id: spec.id || `s${stage.stage}b${block.block}-${spec.slug || spec.templateId}`,
        stage: stage.stage,
        block: block.block,
        blockName: block.name,
        stageName: stage.name,
        strand: spec.strand || DEFAULT_STRAND[kind],
        // The last Build unit in a block is what a learner passes to skip it.
        // Only a Build unit can be a capstone: skipping has to be demonstrated
        // by drawing the circuit, not by answering a question about it.
        capstone: kind === 'build' && i === lastBuildIndex(block.units),
      };
    })
  )
);

const BY_ID = new Map(UNITS.map((u) => [u.id, u]));
const INDEX_OF = new Map(UNITS.map((u, i) => [u.id, i]));

export const UNIT_COUNT = UNITS.length;
export const STAGE_COUNT = STAGES.length;

export function unitById(id) {
  return BY_ID.get(id) || null;
}

export function indexOfUnit(id) {
  return INDEX_OF.has(id) ? INDEX_OF.get(id) : -1;
}

/** The title shown for a unit, taken from the template so it cannot drift. */
export function unitTitle(unit) {
  return getTemplate(unit.templateId)?.title || unit.templateId;
}

/**
 * The next unit to work on: the first one not yet completed.
 *
 * A plain scan of an array of a few hundred entries. Ordering is the curriculum,
 * so there is nothing to weight and nothing to randomise.
 */
export function nextUnit(completed = []) {
  const done = completed instanceof Set ? completed : new Set(completed);
  return UNITS.find((u) => !done.has(u.id)) || null;
}

/** Every unit of the block a given unit belongs to. */
export function unitsInBlock(stage, block) {
  return UNITS.filter((u) => u.stage === stage && u.block === block);
}

/** The capstone of a block, which is the unit that can be passed to skip it. */
export function capstoneOf(stage, block) {
  return unitsInBlock(stage, block).find((u) => u.capstone) || null;
}

/**
 * The unit that skipping the current block would put the learner in front of.
 * Null when the current block has only one unit, since passing that unit is
 * already the whole block and there is nothing to skip.
 */
export function skipTarget(completed = []) {
  const current = nextUnit(completed);
  if (!current) return null;
  const capstone = capstoneOf(current.stage, current.block);
  if (!capstone || capstone.id === current.id) return null;
  return capstone;
}

/**
 * Completing a unit. Passing a capstone completes its whole block, which is what
 * makes skipping ahead an examination rather than a claim.
 */
export function completeUnit(completed, unitId) {
  const unit = unitById(unitId);
  const done = new Set(completed);
  if (!unit) return [...done];
  done.add(unit.id);
  if (unit.capstone) {
    for (const sibling of unitsInBlock(unit.stage, unit.block)) done.add(sibling.id);
  }
  return UNITS.filter((u) => done.has(u.id)).map((u) => u.id);
}

/** Where the learner stands, for the menu and the profile. */
export function roadmapProgress(completed = []) {
  const done = completed instanceof Set ? completed : new Set(completed);
  const current = nextUnit(done);
  const stageNumber = current ? current.stage : STAGE_COUNT;
  const stage = STAGES.find((s) => s.stage === stageNumber) || STAGES[STAGE_COUNT - 1];
  const stageUnits = UNITS.filter((u) => u.stage === stageNumber);
  const stageDone = stageUnits.filter((u) => done.has(u.id)).length;
  const stagesCleared = STAGES.filter((s) =>
    UNITS.filter((u) => u.stage === s.stage).every((u) => done.has(u.id))
  ).length;

  return {
    current,
    stage: stageNumber,
    stageName: stage.name,
    stageBlurb: stage.blurb,
    blockName: current ? current.blockName : 'Complete',
    stagesCleared,
    stageCount: STAGE_COUNT,
    unitsDone: done.size,
    unitCount: UNIT_COUNT,
    stageUnitsDone: stageDone,
    stageUnitCount: stageUnits.length,
    /** Fraction through the current stage, for the menu's progress bar. */
    stageProgress: stageUnits.length ? stageDone / stageUnits.length : 1,
    /** Distance travelled toward industry practice, as a percentage. */
    expertise: Math.round((done.size / UNIT_COUNT) * 100),
    practiceUnlocked: stagesCleared >= PRACTICE_UNLOCK_STAGE,
    finished: !current,
  };
}
