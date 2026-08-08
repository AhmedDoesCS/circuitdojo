/**
 * Local persistence for guest mode.
 *
 * Everything needed to resume: the current challenge, the work in progress,
 * concept mastery and preferences: lives here. On sign-up this snapshot is
 * what gets pushed to Supabase, so a guest never loses their progress.
 */

const KEYS = {
  progress: 'circuitdojo.progress.v1',
  mastery: 'circuitdojo.mastery.v1',
  session: 'circuitdojo.session.v1',
  attempts: 'circuitdojo.attempts.v1',
  settings: 'circuitdojo.settings.v1',
};

export const DEFAULT_SETTINGS = {
  /** Has the learner been placed at a level yet? Drives the first-run flow. */
  onboarded: false,
  /** Appearance. 'light' | 'dark' | 'system'. See lib/theme.js. */
  theme: 'light',
  /** Accent hue id. Vibrant by default now that filled buttons carry it;
   *  'graphite' is still there for anyone who wants the neutral look. */
  accent: 'cobalt',
  /** Occasionally draw a challenge below the current level to keep fundamentals live. */
  throwbacks: true,
  /** Show the full-screen brief when a challenge starts. */
  introAnimation: true,
  /** Offer progressive hints after a failed check. */
  hints: true,
  /**
   * Has this profile had its mastery repaired after the net-label bug?
   *
   * Labels did not bind to the wire they sat on, so correct circuits were
   * failed and the failures were recorded against the learner's concepts. The
   * repair runs once per profile and this is how it knows.
   */
  labelBugRepair: false,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: guest progress is best-effort */
  }
}

export const localStore = {
  getProgress: () => read(KEYS.progress, {}),
  setProgress: (progress) => write(KEYS.progress, progress),

  /** Per-concept mastery, the input to the level model. */
  getMastery: () => read(KEYS.mastery, {}),
  setMastery: (mastery) => write(KEYS.mastery, mastery),

  getSettings: () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }),
  setSettings: (settings) => write(KEYS.settings, settings),

  /** { challengeId, doc }: the sheet the learner had open. */
  getSession: () => read(KEYS.session, null),
  setSession: (session) => write(KEYS.session, session),
  clearSession: () => write(KEYS.session, null),

  getAttempts: () => read(KEYS.attempts, []),
  addAttempt: (attempt) => {
    const list = read(KEYS.attempts, []);
    list.unshift(attempt);
    write(KEYS.attempts, list.slice(0, 100));
    return attempt;
  },

  /** Everything a guest has accumulated, for migration on sign-up. */
  snapshot: () => ({
    progress: read(KEYS.progress, {}),
    mastery: read(KEYS.mastery, {}),
    attempts: read(KEYS.attempts, []),
  }),

  /**
   * A complete, portable profile.
   *
   * Browser storage is scoped to an origin and can be cleared by the browser
   * without warning, so guest mode needs an escape hatch that does not require
   * an account. This is that file: everything except the open sheet, which is
   * scratch work rather than progress.
   */
  exportProfile: () => ({
    format: 'circuitdojo.profile',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: read(KEYS.progress, {}),
    mastery: read(KEYS.mastery, {}),
    attempts: read(KEYS.attempts, []),
    settings: read(KEYS.settings, {}),
  }),

  /**
   * Restore a profile file. Returns `{ ok, error }` rather than throwing:
   * the caller is a click handler on a file the user picked, and a corrupt or
   * unrelated JSON file is an ordinary outcome, not an exception.
   *
   * Merges settings over the defaults so a file written by an older version
   * does not wipe preferences it had never heard of.
   */
  importProfile: (data) => {
    if (!data || data.format !== 'circuitdojo.profile') {
      return { ok: false, error: 'That file is not a CircuitDojo profile.' };
    }
    if (typeof data.progress !== 'object' || typeof data.mastery !== 'object') {
      return { ok: false, error: 'That profile file is missing its progress data.' };
    }
    write(KEYS.progress, data.progress || {});
    write(KEYS.mastery, data.mastery || {});
    write(KEYS.attempts, Array.isArray(data.attempts) ? data.attempts.slice(0, 100) : []);
    write(KEYS.settings, { ...DEFAULT_SETTINGS, ...(data.settings || {}) });
    return { ok: true };
  },

  clearAll: () => {
    for (const key of Object.values(KEYS)) write(key, null);
  },
};
