/**
 * Reference solutions must pass their own challenge.
 *
 * These are shown to a learner who has just failed three times: by definition
 * someone who cannot tell whether the answer is right. A reference circuit that
 * does not satisfy its own brief is worse than none: it teaches a wrong circuit
 * with the app's authority behind it. So every declared solution is graded by
 * the real checker, across many seeds, and any failure fails the build.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TEMPLATES, instantiate, solutionDoc } from '../src/challenges/index.js';
import { evaluateAttempt } from '../src/engine/evaluate.js';
import { componentPins } from '../src/schematic/model.js';

const SEEDS = [1, 7, 42, 1234, 98765, 555, 31337, 2, 3, 4, 5, 6, 8, 9, 11, 13];

test('every template declares a reference solution', () => {
  const bare = TEMPLATES.filter((t) => !instantiate(t.id, 1).solution).map((t) => t.id);
  assert.deepEqual(
    bare,
    [],
    `templates with no reference answer:\n${bare.join('\n')}\n` +
      'Every challenge needs one: it is what the third failed attempt reveals, ' +
      'and it is what the Inspect units inject their faults into.'
  );
});

test('every reference solution passes its own grader', () => {
  const failures = [];
  let graded = 0;

  for (const template of TEMPLATES) {
    for (const seed of SEEDS) {
      const challenge = instantiate(template.id, seed);
      const doc = solutionDoc(challenge);
      if (!doc) break; // reported by the test above; do not fail twice for it
      graded += 1;
      const result = evaluateAttempt(doc, challenge);
      if (!result.passed) {
        failures.push(
          `${template.id}#${seed}: ` +
            [...result.errors, ...result.missing].map((e) => e.label).join(' | ')
        );
      }
    }
  }

  assert.ok(graded > 0, 'nothing was graded: the solutions are not reaching the checker');
  assert.deepEqual(failures, [], `reference solutions that fail their own brief:\n${failures.join('\n')}`);
});

/**
 * A reference answer is also a drawing, and it is shown to someone who cannot
 * yet tell a good sheet from a bad one. Two wires crossing means nothing
 * electrically, but a learner reading a crossing has no way to know that, so
 * the reference drawings are held to the stricter standard: no wire may pass
 * over a pin it is not connecting to.
 */
test('no reference solution runs a wire across a pin it does not connect', () => {
  const offences = [];

  for (const template of TEMPLATES) {
    const doc = solutionDoc(instantiate(template.id, 1));
    if (!doc) continue;

    const pins = doc.components.flatMap((c) => componentPins(c).map((p) => ({ ...p, ref: c.ref })));
    for (const w of doc.wires) {
      for (const pin of pins) {
        if (!onSegmentInterior(pin, w)) continue;
        offences.push(`${template.id}: a wire passes through ${pin.ref} pin ${pin.num} (${pin.x}, ${pin.y})`);
      }
    }
  }

  assert.deepEqual(offences, [], `wires drawn over pins:\n${offences.join('\n')}`);
});

/** Strictly inside an axis-aligned segment, endpoints excluded. */
function onSegmentInterior(p, w) {
  const between = (v, a, b) => v > Math.min(a, b) && v < Math.max(a, b);
  if (w.x1 === w.x2) return p.x === w.x1 && between(p.y, w.y1, w.y2);
  if (w.y1 === w.y2) return p.y === w.y1 && between(p.x, w.x1, w.x2);
  return false;
}
