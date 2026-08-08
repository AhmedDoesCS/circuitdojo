/**
 * Challenge selection.
 *
 * There is no roadmap. The learner has a level; challenges are drawn at random
 * from a band around it, weighted toward concepts they have not yet held and
 * concepts they recently got wrong. Two people at the same level see different
 * challenges, and the same person never sees the same numbers twice.
 *
 * The one deliberate exception is the *throwback* option: when enabled, a
 * fraction of draws come from below the current level, so fundamentals keep
 * being re-applied instead of being left behind.
 */

import { TEMPLATES, instantiate } from './index.js';
import { makeRng, randomSeed } from './rng.js';
import { masteryOf, prereqsMet, HOLD } from '../lib/level.js';

/** How far above the current level a draw may reach. */
const STRETCH = 0.5;
/** How far below, in normal play, enough variety without feeling like revision. */
const RELAX = 1;
/** Probability a throwback draw is taken, when the option is on. */
const THROWBACK_CHANCE = 0.25;
/** How far below the level a throwback may go. */
const THROWBACK_DEPTH = 3;

export function templateLevel(template) {
  return template.level ?? template.tier ?? 1;
}

export function templateConcepts(template) {
  return template.concepts || [];
}

/**
 * Score a template for a learner: unheld concepts are the point of practising,
 * recently failed concepts matter more, and fully-held templates fade away
 * without ever disappearing entirely.
 */
function weightFor(template, { mastery, level, throwback }) {
  const concepts = templateConcepts(template);
  const tLevel = templateLevel(template);

  const low = throwback ? level - THROWBACK_DEPTH : level - RELAX;
  const high = level + STRETCH;
  if (tLevel < low || tLevel > high) return 0;

  // Prerequisites must be broadly in place, or the challenge is unfair.
  const ready = concepts.every((id) => prereqsMet(mastery, id));
  if (!ready && tLevel > level) return 0;

  let weight = 1;

  if (concepts.length) {
    const values = concepts.map((id) => masteryOf(mastery, id));
    const meanMastery = values.reduce((a, b) => a + b, 0) / values.length;
    weight += 3 * (1 - meanMastery); // unheld concepts are worth practising
    const anyFailed = concepts.some((id) => mastery[id]?.fails > (mastery[id]?.passes ?? 0));
    if (anyFailed) weight += 2.5;
    const anyUnseen = concepts.some((id) => !mastery[id]);
    if (anyUnseen) weight += 1.5;
    if (values.every((v) => v >= HOLD)) weight *= 0.35; // held: keep it rare, not absent
  } else {
    weight += 1;
  }

  // Prefer the frontier: challenges at the learner's own level.
  weight *= tLevel === level ? 1.35 : tLevel === level - 1 ? 1 : 0.8;
  return weight;
}

/**
 * Draw the next challenge.
 *
 * @param {object} mastery      concept mastery map
 * @param {object} opts.level   current level (1..8)
 * @param {boolean} opts.throwbacks  allow occasional easier draws
 * @param {string} opts.avoidTemplateId  do not repeat the challenge just finished
 */
export function selectChallenge(mastery, { level = 1, throwbacks = true, avoidTemplateId = null, rng = makeRng(randomSeed()) } = {}) {
  const takeThrowback = throwbacks && level > 1 && rng.next() < THROWBACK_CHANCE;

  let pool = TEMPLATES.filter((t) => t.id !== avoidTemplateId);
  let weighted = pool
    .map((t) => ({ template: t, weight: weightFor(t, { mastery, level, throwback: takeThrowback }) }))
    .filter((w) => w.weight > 0);

  // Widen the band rather than ever failing to produce a challenge.
  if (!weighted.length) {
    weighted = pool
      .map((t) => ({ template: t, weight: templateLevel(t) <= level + 1 ? 1 : 0.15 }))
      .filter((w) => w.weight > 0);
  }
  if (!weighted.length) weighted = TEMPLATES.map((t) => ({ template: t, weight: 1 }));

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng.next() * total;
  let chosen = weighted[weighted.length - 1].template;
  for (const { template, weight } of weighted) {
    roll -= weight;
    if (roll <= 0) {
      chosen = template;
      break;
    }
  }

  return instantiate(chosen.id, Math.floor(rng.next() * 2 ** 31));
}

/** Everything the learner could be shown right now, for the browser UI. */
export function availableTemplates(mastery, level, { throwbacks = true } = {}) {
  return TEMPLATES.filter(
    (t) => weightFor(t, { mastery, level, throwback: throwbacks }) > 0
  );
}

/**
 * Deterministic daily challenge: the same one for everybody, chosen from the
 * whole library so it is a genuine change of pace.
 */
export function dailyChallenge(date = new Date()) {
  const day = Math.floor(date.getTime() / 86400000);
  const rng = makeRng(day);
  const template = TEMPLATES[Math.floor(rng.next() * TEMPLATES.length)];
  return instantiate(template.id, day);
}
