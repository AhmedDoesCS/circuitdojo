/**
 * Grading for the units that are not drawings.
 *
 * A Build unit is graded by the netlist. These are graded by comparing an
 * answer, which makes them cheap to write and quick to sit, and lets the
 * roadmap teach the three things drawing alone cannot: the arithmetic, the
 * parts, and the discipline of reviewing somebody else's work.
 *
 * The result shape matches `evaluateAttempt` closely enough that the existing
 * results panel can render either without special cases.
 */

import { parseValue, formatValue } from '../schematic/units.js';

/**
 * A numeric answer, judged against a tolerance rather than an exact match.
 *
 * Engineering answers are rounded, so the question has to accept the rounding.
 * The default of 2% is tight enough to catch a decade slip or a reciprocal
 * error, loose enough that working to three significant figures always passes.
 */
export function gradeAnalyse(unit, raw, params) {
  const expected = unit.answer(params);
  const given = parseValue(raw);
  const unitLabel = unit.unit || '';

  if (given === null) {
    return {
      passed: false,
      empty: String(raw ?? '').trim() === '',
      correct: [],
      errors: [
        {
          source: 'answer',
          label: 'That is not a number this can read',
          detail: 'Write it the way an engineer would: 220, 4k7, 100n, 0.5, 1M.',
        },
      ],
      missing: [],
      warnings: [],
    };
  }

  const tolerance = unit.tolerance ?? 0.02;
  const within = Math.abs(given - expected) <= Math.abs(expected) * tolerance;

  if (within) {
    return {
      passed: true,
      empty: false,
      correct: [
        {
          label: `${formatValue(given, unitLabel)} is right`,
          detail: unit.explain ? unit.explain(params) : '',
        },
      ],
      errors: [],
      missing: [],
      warnings: [],
    };
  }

  // Naming the *kind* of error teaches more than naming the right number, so
  // the two mistakes that actually happen get called out by name.
  const ratio = expected === 0 ? Infinity : given / expected;
  let diagnosis = '';
  if (ratio > 8 && ratio < 12) diagnosis = ' That is ten times too big: check a prefix.';
  else if (ratio > 0.08 && ratio < 0.12) diagnosis = ' That is ten times too small: check a prefix.';
  else if (Math.abs(ratio - 1 / (expected * expected || 1)) < 0.01) diagnosis = '';
  else if (expected !== 0 && Math.abs(given * expected - 1) < 0.02) {
    diagnosis = ' That is the reciprocal: the formula is the other way up.';
  }

  return {
    passed: false,
    empty: false,
    correct: [],
    errors: [
      {
        source: 'answer',
        label: 'Not the value this circuit produces',
        why: `You answered ${formatValue(given, unitLabel)}.${diagnosis}`,
        detail: unit.hint || 'Work it through again from the quantities the question gives you.',
      },
    ],
    missing: [],
    warnings: [],
  };
}

/**
 * A review finding: did the learner point at the thing that is actually wrong?
 *
 * Selecting nothing is not counted as an answer, for the same reason an empty
 * sheet does not spend an attempt.
 */
export function gradeInspect(fault, selectedId) {
  if (!selectedId) {
    return {
      passed: false,
      empty: true,
      correct: [],
      errors: [],
      missing: [
        {
          label: 'Nothing selected yet',
          detail: 'Click the item on the sheet that you believe is wrong, then check.',
        },
      ],
      warnings: [],
    };
  }

  if (fault.accepts.includes(selectedId)) {
    return {
      passed: true,
      empty: false,
      correct: [
        { label: 'Found it', detail: fault.what },
        { label: 'What it would do', detail: fault.consequence },
      ],
      errors: [],
      missing: [],
      warnings: [],
    };
  }

  return {
    passed: false,
    empty: false,
    correct: [],
    errors: [
      {
        source: 'review',
        label: 'That part of the sheet is correct',
        why: 'Something else is wrong.',
        detail: fault.prompt,
      },
    ],
    missing: [],
    warnings: [],
  };
}

/** The question text with this instance's numbers filled in. */
export function renderPrompt(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (whole, key) => {
    const value = params[key];
    if (value === undefined) return whole;
    return typeof value === 'number' ? formatValue(value, '') : String(value);
  });
}
