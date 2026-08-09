/**
 * Turning a roadmap unit into something to sit.
 *
 * One entry point for every kind, so the app asks "what is next" and gets back
 * a thing it can render, without knowing which of the five kinds it is until it
 * looks. A seed makes every instance reproducible, the same contract Build
 * units have always had.
 */

import { instantiate, solutionDoc } from '../challenges/index.js';
import { evaluateAttempt } from '../engine/evaluate.js';
import { injectFault } from '../engine/mutate.js';
import { renderPrompt } from '../engine/answer.js';
import { makeRng, randomSeed } from '../challenges/rng.js';

export function instantiateUnit(unit, seed = randomSeed()) {
  if (!unit) return null;

  if (unit.kind === 'analyse') {
    const params = unit.params ? unit.params(makeRng(seed)) : {};
    return {
      kind: 'analyse',
      unitId: unit.id,
      seed,
      unit,
      params,
      title: unit.title,
      prompt: renderPrompt(unit.prompt, params),
      answerUnit: unit.unit || '',
      // An Analyse unit may put a worked circuit on screen to read from.
      doc: unit.templateId ? solutionDoc(instantiate(unit.templateId, seed)) : null,
    };
  }

  if (unit.kind === 'inspect') {
    const challenge = instantiate(unit.templateId, seed);
    const reference = solutionDoc(challenge);
    if (!reference) return null;
    // The grader decides whether the mutation is a real fault, so a review
    // exercise can never ask the learner to find something that is not wrong.
    const broken = injectFault(reference, seed, {
      only: unit.fault || null,
      verify: (candidate) => !evaluateAttempt(candidate, challenge).passed,
    });
    if (!broken) return null;
    return {
      kind: 'inspect',
      unitId: unit.id,
      seed,
      unit,
      title: unit.title || `Review: ${challenge.title}`,
      prompt: unit.prompt || broken.fault.prompt,
      doc: broken.doc,
      fault: broken.fault,
      reference,
    };
  }

  // Build, which is the app's original path and stays exactly as it was.
  const challenge = instantiate(unit.templateId, seed);
  return { kind: 'build', unitId: unit.id, seed, unit, challenge };
}
