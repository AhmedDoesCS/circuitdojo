/**
 * Tests for the roadmap's non-drawing unit kinds.
 *
 * The load-bearing property is that an injected fault is a real fault: the
 * mutated schematic must actually fail the grader that passed the original.
 * Without that, a review exercise could ask the learner to find something that
 * is not wrong.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TEMPLATES, instantiate, solutionDoc } from '../src/challenges/index.js';
import { evaluateAttempt } from '../src/engine/evaluate.js';
import { injectFault, applicableFaults, FAULTS } from '../src/engine/mutate.js';
import { gradeAnalyse, gradeInspect, renderPrompt } from '../src/engine/answer.js';
import { UNITS } from '../src/roadmap/index.js';
import { instantiateUnit } from '../src/roadmap/instantiate.js';
import { formatValue } from '../src/schematic/units.js';

const SEEDS = [1, 7, 42, 1234, 555];

function solvedChallenges() {
  const out = [];
  for (const t of TEMPLATES) {
    const challenge = instantiate(t.id, 1);
    const doc = solutionDoc(challenge);
    if (doc) out.push({ challenge, doc });
  }
  return out;
}

test('there are reference solutions to build review exercises from', () => {
  assert.ok(solvedChallenges().length > 0);
});

test('every injected fault makes a passing circuit fail', () => {
  const survived = [];
  let injected = 0;

  for (const { challenge, doc } of solvedChallenges()) {
    assert.equal(evaluateAttempt(doc, challenge).passed, true, `${challenge.templateId} should start correct`);
    for (const seed of SEEDS) {
      const broken = injectFault(doc, seed, {
        verify: (candidate) => !evaluateAttempt(candidate, challenge).passed,
      });
      if (!broken) continue;
      injected += 1;
      if (evaluateAttempt(broken.doc, challenge).passed) {
        survived.push(`${challenge.templateId}#${seed} [${broken.fault.id}]`);
      }
    }
  }

  assert.ok(injected > 0, 'nothing was injected');
  assert.deepEqual(survived, [], `faults the grader did not notice:\n${survived.join('\n')}`);
});

test('a fault always leaves something on the sheet to point at', () => {
  for (const { doc } of solvedChallenges()) {
    for (const seed of SEEDS) {
      const broken = injectFault(doc, seed);
      if (!broken) continue;
      const ids = new Set([
        ...broken.doc.components.map((c) => c.id),
        ...broken.doc.wires.map((w) => w.id),
        ...broken.doc.labels.map((l) => l.id),
      ]);
      assert.ok(ids.has(broken.fault.itemId), `${broken.fault.id} points at nothing clickable`);
      assert.ok(broken.fault.what && broken.fault.consequence, `${broken.fault.id} has no explanation`);
    }
  }
});

test('injection is deterministic for a seed', () => {
  const { doc } = solvedChallenges()[0];
  const a = injectFault(doc, 99);
  const b = injectFault(doc, 99);
  assert.equal(a.fault.id, b.fault.id);
  assert.equal(a.fault.itemId, b.fault.itemId);
});

test('a specific fault can be requested by id', () => {
  for (const { doc } of solvedChallenges()) {
    for (const id of applicableFaults(doc)) {
      const broken = injectFault(doc, 3, { only: id });
      if (broken) assert.equal(broken.fault.id, id);
    }
  }
  assert.ok(FAULTS.length >= 6, 'the catalogue is worth having');
});

test('review grading accepts the culprit and rejects a healthy part', () => {
  const { doc } = solvedChallenges()[0];
  const broken = injectFault(doc, 5);
  assert.equal(gradeInspect(broken.fault, broken.fault.itemId).passed, true);
  assert.equal(gradeInspect(broken.fault, 'something-else').passed, false);
  assert.equal(gradeInspect(broken.fault, null).empty, true);
});

// ---------------------------------------------------------------------------
// Numeric answers
// ---------------------------------------------------------------------------

const OHMS_LAW = {
  prompt: 'A {r} resistor sits across {v}. What current flows?',
  params: () => ({ v: 5, r: 220 }),
  answer: (p) => p.v / p.r,
  unit: 'A',
  explain: (p) => `I = V/R = ${p.v}/${p.r}`,
};

test('a numeric answer is judged against a tolerance, not an exact match', () => {
  const p = OHMS_LAW.params();
  assert.equal(gradeAnalyse(OHMS_LAW, '0.0227', p).passed, true, 'three figures is enough');
  assert.equal(gradeAnalyse(OHMS_LAW, '22.7m', p).passed, true, 'engineering notation reads too');
  assert.equal(gradeAnalyse(OHMS_LAW, '0.05', p).passed, false);
});

test('a decade slip is named rather than just marked wrong', () => {
  const p = OHMS_LAW.params();
  const r = gradeAnalyse(OHMS_LAW, '0.227', p);
  assert.equal(r.passed, false);
  assert.match(r.errors[0].why, /ten times too big/);
});

test('an unreadable answer says so instead of counting as wrong', () => {
  const p = OHMS_LAW.params();
  assert.match(gradeAnalyse(OHMS_LAW, 'about a fifth', p).errors[0].label, /not a number/);
  assert.equal(gradeAnalyse(OHMS_LAW, '', p).empty, true);
});

test('prompts take this instance own numbers', () => {
  assert.equal(
    renderPrompt(OHMS_LAW.prompt, { v: 5, r: 220 }),
    'A 220 resistor sits across 5. What current flows?'
  );
});

// ---------------------------------------------------------------------------
// The authored roadmap content, held to the same standard as the schematics
// ---------------------------------------------------------------------------

const CONTENT_SEEDS = [1, 7, 42, 1234, 98765, 555, 31337, 2, 3, 4, 5, 6, 8, 9, 11, 13];

test('every roadmap unit can be sat', () => {
  const dead = [];
  for (const unit of UNITS) {
    for (const seed of CONTENT_SEEDS) {
      if (!instantiateUnit(unit, seed)) dead.push(`${unit.id}#${seed}`);
    }
  }
  assert.deepEqual(dead, [], `units that produce nothing to work on:\n${dead.join('\n')}`);
});

/**
 * An Analyse unit whose own answer it will not accept is worse than no unit:
 * it tells a learner who did the arithmetic correctly that they did not. The
 * answer function is the specification, so grade it against itself, formatted
 * the way a person would actually type it.
 */
test('every Analyse unit accepts its own answer', () => {
  const rejected = [];
  for (const unit of UNITS.filter((u) => u.kind === 'analyse')) {
    for (const seed of CONTENT_SEEDS) {
      const sat = instantiateUnit(unit, seed);
      const expected = unit.answer(sat.params);
      assert.ok(Number.isFinite(expected), `${unit.id}#${seed} has no finite answer`);
      // Three significant figures in engineering notation: what a person writes.
      const typed = formatValue(expected, '');
      if (!gradeAnalyse(unit, typed, sat.params).passed) {
        rejected.push(`${unit.id}#${seed}: answer ${expected}, typed as "${typed}"`);
      }
    }
  }
  assert.deepEqual(rejected, [], `Analyse units that reject their own answer:\n${rejected.join('\n')}`);
});

test('every Analyse prompt has its numbers filled in', () => {
  const unfilled = [];
  for (const unit of UNITS.filter((u) => u.kind === 'analyse')) {
    const sat = instantiateUnit(unit, 1);
    if (/\{\w+\}/.test(sat.prompt)) unfilled.push(`${unit.id}: ${sat.prompt}`);
    if (!unit.hint || !unit.explain) unfilled.push(`${unit.id}: no hint or no explanation`);
  }
  assert.deepEqual(unfilled, [], `prompts with a placeholder nothing filled:\n${unfilled.join('\n')}`);
});

test('every Inspect unit is built on a fault the grader confirms', () => {
  const unusable = [];
  for (const unit of UNITS.filter((u) => u.kind === 'inspect')) {
    const challenge = instantiate(unit.templateId, 1);
    for (const seed of CONTENT_SEEDS) {
      const sat = instantiateUnit(unit, seed);
      if (!sat) {
        unusable.push(`${unit.id}#${seed}: no fault could be injected`);
        continue;
      }
      if (evaluateAttempt(sat.doc, challenge).passed) {
        unusable.push(`${unit.id}#${seed}: the sheet still passes, so nothing is wrong with it`);
      }
      if (!gradeInspect(sat.fault, sat.fault.itemId).passed) {
        unusable.push(`${unit.id}#${seed}: pointing at the culprit is not accepted`);
      }
    }
  }
  assert.deepEqual(unusable, [], `Inspect units that cannot be sat:\n${unusable.join('\n')}`);
});
