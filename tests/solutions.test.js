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

const SEEDS = [1, 7, 42, 1234, 98765, 555, 31337, 2, 3, 4, 5, 6, 8, 9, 11, 13];

test('some templates declare a reference solution', () => {
  const declared = TEMPLATES.filter((t) => {
    const challenge = instantiate(t.id, 1);
    return Boolean(challenge.solution);
  });
  assert.ok(declared.length > 0, 'at least one template must ship a reference answer');
});

test('every declared reference solution passes its own grader', () => {
  const failures = [];
  let graded = 0;

  for (const template of TEMPLATES) {
    for (const seed of SEEDS) {
      const challenge = instantiate(template.id, seed);
      const doc = solutionDoc(challenge);
      if (!doc) break; // this template has no solution; move to the next one
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
