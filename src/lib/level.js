/**
 * Expertise model.
 *
 * The learner does not walk a fixed roadmap. They hold a *level*, an estimate
 * of how close their demonstrated skill is to industry practice, and
 * challenges are generated randomly around it. Level comes from per-concept
 * mastery, so it rises because specific things were actually built correctly,
 * never because a counter went up.
 */

import { CONCEPTS, conceptsByLevel, getConcept } from '../challenges/concepts.js';

export const LEVELS = [
  {
    level: 1,
    name: 'Newcomer',
    blurb: 'First principles: voltage, current, a resistor and an LED that survives being switched on.',
  },
  { level: 2, name: 'Tinkerer', blurb: 'Dividers, pulls and capacitors: nodes that hold a defined voltage.' },
  { level: 3, name: 'Technician', blurb: 'Real logic ICs, filters and switching: circuits with parts that need power.' },
  { level: 4, name: 'Junior Design Engineer', blurb: 'Regulation, feedback and protection: designing for the datasheet.' },
  { level: 5, name: 'Design Engineer', blurb: 'Sensing and conversion: signal chains that survive being measured.' },
  { level: 6, name: 'Senior Design Engineer', blurb: 'Buses, clocking and MCU hardware contracts across a whole board.' },
  { level: 7, name: 'Staff Engineer', blurb: 'Power conversion, motors, isolation and EMC: the parts that bite.' },
  { level: 8, name: 'Principal Engineer', blurb: 'Mixed-signal partitioning, worst case and protection: products, not prototypes.' },
];

/** A concept is "held" once mastery clears this. */
export const HOLD = 0.6;
/** A level is cleared when this fraction of its concepts is held. */
export const CLEAR_FRACTION = 0.6;

export function emptyMastery() {
  return {};
}

/**
 * Mastery moves a third of the way to 1 on a pass, and takes a real knock on a
 * failure: a concept you just got wrong is not one you hold.
 *
 * Claimed concepts (`self: true`, set by calibration) are treated as held for
 * selection purposes but are *unverified*. The first attempt settles the claim:
 * a pass converts it to earned mastery, a failure drops it well below the hold
 * threshold. That is what makes a wrong self-assessment self-correct in one
 * challenge instead of needing a placement test.
 */
export function applyConceptResults(mastery, conceptIds, passed, at = new Date()) {
  const next = { ...mastery };
  for (const id of conceptIds) {
    const prev = next[id] || { value: 0, attempts: 0, passes: 0, fails: 0, lastAt: null, self: false };
    let value;
    if (passed) {
      value = Math.min(1, prev.value + (1 - prev.value) * 0.34);
    } else if (prev.self) {
      // A claim that did not survive contact with a real circuit.
      value = 0.2;
    } else {
      value = Math.max(0, prev.value * 0.7 - 0.05);
    }
    next[id] = {
      value: Number(value.toFixed(3)),
      attempts: prev.attempts + 1,
      passes: prev.passes + (passed ? 1 : 0),
      fails: prev.fails + (passed ? 0 : 1),
      lastAt: at.toISOString(),
      self: false, // either way, the concept has now been observed
    };
  }
  return next;
}

/**
 * Experience tiers offered at first run.
 *
 * One click sets a starting level. No test, no waiting: being wrong is cheap
 * because the first real challenge corrects it.
 */
export const EXPERIENCE_TIERS = [
  {
    id: 'none',
    label: 'Never touched electronics',
    blurb: 'Start at the very beginning: voltage, current, one resistor and one LED.',
    level: 1,
  },
  {
    id: 'some',
    label: 'I know the parts, never designed',
    blurb: 'You can name a resistor and a capacitor. Dividers and pull-ups are next.',
    level: 2,
  },
  {
    id: 'hobby',
    label: 'Hobbyist: I build from other people\'s schematics',
    blurb: 'Straight into real ICs: power units, decoupling and defined logic levels.',
    level: 3,
  },
  {
    id: 'studied',
    label: 'I studied this formally',
    blurb: 'Skip the fundamentals. Regulation, feedback and protection from the start.',
    level: 4,
  },
  {
    id: 'working',
    label: 'I design circuits at work',
    blurb: 'Signal chains, converters and buses: the parts that actually bite.',
    level: 6,
  },
  {
    id: 'senior',
    label: 'Senior engineer: surprise me',
    blurb: 'Mixed-signal partitioning, worst case and protection. Products, not prototypes.',
    level: 7,
  },
];

/**
 * Mark concepts as claimed rather than earned.
 * Value sits just above the hold threshold: high enough to unlock the level,
 * low enough that one pass or fail moves it decisively.
 *
 * `override` is for the deliberate "this is too easy" claim. Calibration must
 * not overwrite earned evidence: the learner is guessing about themselves at
 * that point. Skipping up is not a guess: they have seen the level and said it
 * is beneath them, which is an assertion that outranks an old failure. The
 * attempt history is kept, and `self: true` means the very next check settles
 * the claim either way.
 */
export function claimConcepts(mastery, conceptIds, at = new Date(), { override = false } = {}) {
  const next = { ...mastery };
  for (const id of conceptIds) {
    const prev = next[id];
    if (!override && prev?.attempts > 0) continue; // never overwrite earned evidence
    next[id] = {
      value: HOLD + 0.05,
      attempts: prev?.attempts ?? 0,
      passes: prev?.passes ?? 0,
      fails: prev?.fails ?? 0,
      lastAt: at.toISOString(),
      self: true,
    };
  }
  return next;
}

/** Every concept at or below a level, the default claim for an experience tier. */
export function conceptsAtOrBelow(level) {
  return CONCEPTS.filter((c) => c.level <= level).map((c) => c.id);
}

/**
 * "This is too easy", claim everything at the current level and step up.
 * Gives an impatient expert a one-click ladder without inventing a test.
 *
 * The claim must *override* attempt history, or the button lies. Level is
 * derived from mastery, and a single concept the learner had already tried and
 * got wrong was enough to hold coverage below the clear threshold, so the
 * level snapped straight back and the next draw came from the band they had
 * just rejected. Skipping up now clears the band it says it clears.
 */
export function stepUp(mastery, currentLevel) {
  return claimConcepts(mastery, conceptsAtOrBelow(currentLevel), new Date(), { override: true });
}

/**
 * Undo recorded failures.
 *
 * Net labels did not bind to the wire they were dropped on, so every challenge
 * that asks the learner to name a node rejected correct circuits. Those
 * failures are not evidence of anything, and mastery is the one place they
 * persist: a level derived from them is wrong about the person.
 *
 * A concept with passes is rebuilt from those passes alone, applying the same
 * curve `applyConceptResults` uses. A concept with none goes back to a
 * *provisional claim* rather than to zero: the learner was working at that
 * level, nothing was ever demonstrated either way, and the model already has a
 * mechanism for exactly that state, one real check settles it.
 *
 * The attempt history is deliberately left alone. It is a log of what happened,
 * and what happened is what it says.
 */
export function repairFailedConcepts(mastery, at = new Date()) {
  const next = {};
  for (const [id, m] of Object.entries(mastery)) {
    if (!m || !m.fails) {
      next[id] = m;
      continue;
    }
    const passes = m.passes || 0;
    if (passes > 0) {
      let value = 0;
      for (let i = 0; i < passes; i++) value += (1 - value) * 0.34;
      next[id] = {
        ...m,
        value: Number(value.toFixed(3)),
        attempts: passes,
        fails: 0,
        self: false,
      };
    } else {
      next[id] = {
        value: HOLD + 0.05,
        attempts: 0,
        passes: 0,
        fails: 0,
        lastAt: at.toISOString(),
        self: true,
      };
    }
  }
  return next;
}

/** How much of the learner's standing is claimed rather than demonstrated. */
export function claimedCount(mastery) {
  return Object.values(mastery).filter((m) => m.self).length;
}

export function masteryOf(mastery, conceptId) {
  return mastery[conceptId]?.value ?? 0;
}

/** Fraction of a level's concepts the learner holds (0..1). */
export function levelCoverage(mastery, level) {
  const concepts = conceptsByLevel(level);
  if (!concepts.length) return 1;
  const held = concepts.filter((c) => masteryOf(mastery, c.id) >= HOLD).length;
  return held / concepts.length;
}

/**
 * Current level: the highest band whose predecessors are all cleared.
 * Progress is how far into the *next* band they are, which is what the home
 * screen shows as a bar.
 */
export function computeLevel(mastery, roadmap = null) {
  /**
   * The roadmap is the progression, so it is what the band reports.
   *
   * Mastery used to be the only answer to "what level am I", back when
   * selection was a weighted draw over concepts. It is now one of two systems
   * and the quieter one: most units on the roadmap are not drawings and do not
   * move a concept's mastery at all, so a learner three quarters of the way
   * through could stand on the home screen and be told they were a Newcomer at
   * 0%. Mastery still exists, still records what has been demonstrated, and is
   * what practice mode weights its projects by. It is no longer the headline.
   */
  if (roadmap && roadmap.stageCount) {
    const level = bandForStage(roadmap.stage, roadmap.stageCount);
    const info = LEVELS.find((l) => l.level === level) || LEVELS[0];
    return {
      level,
      index: level - 1,
      count: LEVELS.length,
      name: info.name,
      blurb: info.blurb,
      progress: roadmap.stageProgress,
      /** 0-100 "distance travelled toward industry practice". */
      expertise: roadmap.expertise,
    };
  }

  let level = 1;
  for (const band of LEVELS) {
    if (levelCoverage(mastery, band.level) >= CLEAR_FRACTION) level = Math.min(LEVELS.length, band.level + 1);
    else break;
  }
  const progress = Math.min(1, levelCoverage(mastery, level) / CLEAR_FRACTION);
  const info = LEVELS.find((l) => l.level === level) || LEVELS[0];
  return {
    level,
    index: level - 1,
    count: LEVELS.length,
    name: info.name,
    blurb: info.blurb,
    progress,
    expertise: Math.round(((level - 1 + progress) / LEVELS.length) * 100),
  };
}

/**
 * Which of the eight expertise bands a roadmap stage sits in.
 *
 * The bands predate the roadmap and are kept because they name something the
 * stages do not: how far along a career the work would be recognised from.
 * Spreading twelve stages evenly over eight bands keeps both readings honest
 * without either having to be renumbered.
 */
export function bandForStage(stage, stageCount) {
  const band = Math.ceil((stage * LEVELS.length) / stageCount);
  return Math.min(LEVELS.length, Math.max(1, band));
}

/**
 * The inverse: the first stage that reads as a given band.
 *
 * Placement asks "put me at Junior Design Engineer", and a band spans one or two
 * stages, so the honest answer is the *earliest* of them. Landing someone in the
 * middle of a band would skip material they never claimed to know.
 *
 * Solved by scanning rather than by algebra, because `bandForStage` clamps at
 * both ends and an inverted formula would disagree with it at the edges. Twelve
 * stages is not a loop worth optimising.
 */
export function firstStageForBand(band, stageCount) {
  const want = Math.min(LEVELS.length, Math.max(1, band));
  for (let stage = 1; stage <= stageCount; stage++) {
    if (bandForStage(stage, stageCount) >= want) return stage;
  }
  return stageCount;
}

/** Concepts the learner is actively shaky on, the hint and selection targets. */
export function shakyConcepts(mastery, limit = 6) {
  return Object.entries(mastery)
    .filter(([, m]) => m.attempts > 0 && m.value < HOLD)
    .sort((a, b) => a[1].value - b[1].value)
    .slice(0, limit)
    .map(([id]) => id);
}

/** Concepts at or below the level that have never been attempted. */
export function unseenConcepts(mastery, level) {
  return CONCEPTS.filter((c) => c.level <= level && !mastery[c.id]).map((c) => c.id);
}

/** True when every prerequisite of a concept is held, used to gate generation. */
export function prereqsMet(mastery, conceptId) {
  const concept = getConcept(conceptId);
  if (!concept) return true;
  return (concept.prereq || []).every((p) => masteryOf(mastery, p) >= HOLD * 0.7);
}

export function totalConceptsHeld(mastery) {
  return Object.values(mastery).filter((m) => m.value >= HOLD).length;
}
