/**
 * Roadmap tests: the curriculum's shape, and the rules that move a learner
 * through it. Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGES,
  UNITS,
  UNIT_COUNT,
  STAGE_COUNT,
  nextUnit,
  completeUnit,
  capstoneOf,
  skipTarget,
  roadmapProgress,
  unitTitle,
} from '../src/roadmap/index.js';
import { TEMPLATES, getTemplate } from '../src/challenges/index.js';

test('every unit points at a template that exists', () => {
  const bad = UNITS.filter((u) => u.kind === 'build' && !getTemplate(u.templateId));
  assert.deepEqual(bad, [], 'a typo here ships a stage nobody can start');
});

test('every template has a place in the curriculum', () => {
  const placed = new Set(UNITS.map((u) => u.templateId));
  const orphans = TEMPLATES.filter((t) => !placed.has(t.id)).map((t) => t.id);
  assert.deepEqual(orphans, [], 'content that is not on the roadmap is unreachable');
});

test('unit ids are unique and stage numbers run 1 to 12', () => {
  assert.equal(new Set(UNITS.map((u) => u.id)).size, UNIT_COUNT);
  assert.equal(STAGE_COUNT, 12);
  assert.deepEqual(
    STAGES.map((s) => s.stage),
    Array.from({ length: 12 }, (_, i) => i + 1)
  );
});

test('the order never puts a unit before the stage that teaches it', () => {
  let previous = 0;
  for (const unit of UNITS) {
    assert.ok(unit.stage >= previous, `${unit.id} goes backwards`);
    previous = unit.stage;
  }
});

test('a fresh learner starts at the first unit of stage 1', () => {
  const start = nextUnit([]);
  assert.equal(start.stage, 1);
  assert.equal(start.templateId, 'led_current_limit');
  assert.ok(unitTitle(start).length > 0);
});

test('finishing a unit moves the cursor on by one', () => {
  const first = nextUnit([]);
  const after = completeUnit([], first.id);
  assert.notEqual(nextUnit(after).id, first.id);
});

test('passing a capstone completes the whole block it ends', () => {
  const block = STAGES[1].blocks[0]; // two units, so there is something to skip
  assert.ok(block.units.length > 1);
  const capstone = capstoneOf(2, 1);
  const after = completeUnit([], capstone.id);
  for (const unit of UNITS.filter((u) => u.stage === 2 && u.block === 1)) {
    assert.ok(after.includes(unit.id), `${unit.id} should have been carried`);
  }
});

test('skipping offers the capstone, and nothing when the block is one unit', () => {
  // Stage 1 block 1 is a single unit: it is already its own capstone.
  assert.equal(skipTarget([]), null);

  // Reach a block that has more than one unit.
  let done = [];
  while (nextUnit(done) && !(nextUnit(done).stage === 2 && nextUnit(done).block === 1)) {
    done = completeUnit(done, nextUnit(done).id);
  }
  const target = skipTarget(done);
  assert.ok(target && target.capstone, 'a multi-unit block offers its capstone');
  assert.notEqual(target.id, nextUnit(done).id, 'and it is ahead of where you are');
});

test('progress reports the stage the learner is actually in', () => {
  const fresh = roadmapProgress([]);
  assert.equal(fresh.stage, 1);
  assert.equal(fresh.expertise, 0);
  assert.equal(fresh.practiceUnlocked, false);

  const finished = roadmapProgress(UNITS.map((u) => u.id));
  assert.equal(finished.finished, true);
  assert.equal(finished.expertise, 100);
  assert.equal(finished.stagesCleared, STAGE_COUNT);
  assert.equal(finished.practiceUnlocked, true);
});

test('practice mode stays shut until six stages are cleared', () => {
  const throughFive = UNITS.filter((u) => u.stage <= 5).map((u) => u.id);
  assert.equal(roadmapProgress(throughFive).practiceUnlocked, false);
  const throughSix = UNITS.filter((u) => u.stage <= 6).map((u) => u.id);
  assert.equal(roadmapProgress(throughSix).practiceUnlocked, true);
});
