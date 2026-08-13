/**
 * Roadmap tests: the curriculum's shape, and the rules that move a learner
 * through it. Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGES,
  UNITS,
  indexOfUnit,
  UNIT_COUNT,
  STAGE_COUNT,
  nextUnit,
  completeUnit,
  capstoneOf,
  skipTarget,
  roadmapProgress,
  unitTitle,
  unitStatus,
} from '../src/roadmap/index.js';
import { TEMPLATES, getTemplate } from '../src/challenges/index.js';
import { computeLevel, bandForStage } from '../src/lib/level.js';

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
  assert.equal(start.block, 1);
  assert.equal(indexOfUnit(start.id), 0);
});

test('a block interleaves the strands rather than stacking them', () => {
  const opener = UNITS.filter((u) => u.stage === 1 && u.block === 1);
  const strands = new Set(opener.map((u) => u.strand));
  assert.ok(strands.size > 1, 'a block that teaches one strand is a lecture, not a block');
  assert.equal(opener.at(-1).kind, 'inspect', 'the block ends by reviewing what it built');
  assert.equal(opener.filter((u) => u.capstone).length, 1, 'exactly one capstone');
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
  // The opening block has something ahead of the cursor to sit.
  const target = skipTarget([]);
  assert.ok(target && target.capstone, 'a multi-unit block offers its capstone');
  assert.equal(target.kind, 'build', 'skipping is demonstrated by drawing, not by answering');
  assert.notEqual(target.id, nextUnit([]).id, 'and it is ahead of where you are');

  // Standing on the capstone itself, there is nothing ahead to skip to: sitting
  // it is already the whole of what skipping would ask for. Stated as the rule
  // rather than as a block of a particular size, because block sizes change as
  // the curriculum is written and the rule does not.
  const capstone = UNITS.find((u) => u.capstone);
  const upToCapstone = UNITS.slice(0, indexOfUnit(capstone.id)).map((u) => u.id);
  assert.equal(nextUnit(upToCapstone).id, capstone.id, 'the cursor should be on the capstone');
  assert.equal(skipTarget(upToCapstone), null);
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

// ---------------------------------------------------------------------------
// The band the home screen reports
// ---------------------------------------------------------------------------

test('the reported level follows the roadmap, not the mastery model', () => {
  const throughEleven = UNITS.filter((u) => u.stage <= 11).map((u) => u.id);
  const late = computeLevel({}, roadmapProgress(throughEleven));

  // Empty mastery: on the old model this learner was a Newcomer at 0%.
  assert.ok(late.level > 1, 'someone in stage 12 is not a beginner');
  assert.ok(late.expertise > 50, 'nor are they 0% of the way there');

  const fresh = computeLevel({}, roadmapProgress([]));
  assert.equal(fresh.level, 1);
  assert.equal(fresh.expertise, 0);
});

test('the bands still span one to eight across the twelve stages', () => {
  const bands = STAGES.map((s) => bandForStage(s.stage, STAGE_COUNT));
  assert.equal(bands[0], 1, 'stage 1 is the first band');
  assert.equal(bands.at(-1), 8, 'the last stage reaches the last band');
  for (let i = 1; i < bands.length; i++) {
    assert.ok(bands[i] >= bands[i - 1], 'the mapping never goes backwards');
  }
});

test('without a roadmap the mastery model still answers', () => {
  const byMastery = computeLevel({});
  assert.equal(byMastery.level, 1);
  assert.ok(Number.isFinite(byMastery.expertise));
});

// ---------------------------------------------------------------------------
// What the map is allowed to offer
// ---------------------------------------------------------------------------

test('every unit has a title to show, whatever kind it is', () => {
  const nameless = UNITS.filter((u) => !unitTitle(u) || unitTitle(u) === u.templateId);
  assert.deepEqual(nameless, [], 'a unit with no title is a blank row on the map');
});

test('a unit is done, current, or ahead, and only the first two are reachable', () => {
  const done = UNITS.filter((u) => u.stage === 1).map((u) => u.id);
  const current = nextUnit(done);

  assert.equal(unitStatus(UNITS[0], done), 'done');
  assert.equal(unitStatus(current, done), 'current');

  // Everything after the cursor is ahead: the order is the curriculum, so the
  // map shows what is coming without offering a way around it.
  const later = UNITS[indexOfUnit(current.id) + 1];
  assert.equal(unitStatus(later, done), 'ahead');
});

test('replaying a completed unit takes nothing away', () => {
  const done = UNITS.filter((u) => u.stage <= 2).map((u) => u.id);
  const again = completeUnit(done, UNITS[0].id);
  assert.equal(again.length, done.length, 'sitting it again completes nothing new and loses nothing');
  assert.equal(nextUnit(again).id, nextUnit(done).id, 'and leaves the cursor where it was');
});
