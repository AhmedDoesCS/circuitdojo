/**
 * Mastery tracking.
 *
 * Mastery is a 0..1 number per topic. Passing moves it a third of the way to 1
 * (so roughly three clean solves master a topic), while failing knocks it back
 *, which is what feeds the spaced-repetition-ish selection in
 * `selectNextChallenge`: weak topics resurface before new ones.
 */

export const MASTERY_THRESHOLD = 0.6;

export function emptyProgress() {
  return {};
}

export function applyResult(progress, topic, passed, at = new Date()) {
  const previous = progress[topic] || {
    mastery: 0,
    attempts: 0,
    passes: 0,
    fails: 0,
    streak: 0,
    lastResult: null,
    lastAttemptedAt: null,
  };

  const mastery = passed
    ? Math.min(1, previous.mastery + (1 - previous.mastery) * 0.34)
    : Math.max(0, previous.mastery * 0.75 - 0.05);

  return {
    ...progress,
    [topic]: {
      mastery: Number(mastery.toFixed(3)),
      attempts: previous.attempts + 1,
      passes: previous.passes + (passed ? 1 : 0),
      fails: previous.fails + (passed ? 0 : 1),
      streak: passed ? previous.streak + 1 : 0,
      lastResult: passed ? 'pass' : 'fail',
      lastAttemptedAt: at.toISOString(),
    },
  };
}

export function masteryLabel(mastery) {
  if (mastery >= 0.85) return 'Solid';
  if (mastery >= MASTERY_THRESHOLD) return 'Getting there';
  if (mastery > 0) return 'Shaky';
  return 'Untouched';
}

/** Topics with attempts but low mastery: what the learner should work on. */
export function weakTopics(progress) {
  return Object.entries(progress)
    .filter(([, p]) => p.attempts > 0 && p.mastery < MASTERY_THRESHOLD)
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .map(([topic]) => topic);
}

export function totalSolved(progress) {
  return Object.values(progress).reduce((sum, p) => sum + (p.passes || 0), 0);
}
