import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { localStore, DEFAULT_SETTINGS } from '../lib/storage.js';
import { applyResult, emptyProgress } from '../lib/progress.js';
import { UNITS, completeUnit, roadmapProgress } from '../roadmap/index.js';
import { conceptsOf, getTemplate } from '../challenges/index.js';
import {
  HOLD,
  masteryOf,
  applyConceptResults,
  claimConcepts,
  computeLevel,
  conceptsAtOrBelow,
  emptyMastery,
  repairFailedConcepts,
  stepUp,
} from '../lib/level.js';

/**
 * Account, preferences and skill state.
 *
 * Guest mode is a first-class path, not a degraded one: everything works
 * against localStorage. Signing in switches the store to Supabase and carries
 * the guest's progress across.
 *
 * Two things are tracked per attempt:
 *   progress : per topic, for the familiar "what have I practised" view
 *   mastery  : per concept, which is what the level model actually reads
 * Both live in `user_progress`; concept rows are keyed `concept:<id>` so one
 * table serves both without a migration.
 */
export default function useProfile() {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(() => localStore.getProgress() || emptyProgress());
  const [mastery, setMastery] = useState(() => localStore.getMastery() || emptyMastery());
  const [settings, setSettingsState] = useState(() => localStore.getSettings());
  const [attempts, setAttempts] = useState(() => localStore.getAttempts());
  const [authError, setAuthError] = useState(null);
  const [busy, setBusy] = useState(false);

  /**
   * Roadmap position: the units finished, in order.
   *
   * The learner's standing now comes from how far along the curriculum they
   * are rather than from a coverage estimate over concepts. Mastery is still
   * tracked, because practice mode weights by it, but it no longer decides what
   * comes next.
   */
  const [completedUnits, setCompletedUnits] = useState(() => localStore.getRoadmap());
  const roadmap = useMemo(() => roadmapProgress(completedUnits || []), [completedUnits]);

  /**
   * First run on a profile that predates the roadmap.
   *
   * Everything whose concepts the learner already holds is marked done, so
   * somebody at level 2 lands part way into the curriculum rather than back at
   * the first LED. Runs once, then the stored list is the truth.
   */
  useEffect(() => {
    if (completedUnits !== null) return;
    const done = [];
    for (const unit of UNITS) {
      const concepts = conceptsOf(getTemplate(unit.templateId) || {});
      if (!concepts.length) break;
      if (!concepts.every((id) => masteryOf(mastery, id) >= HOLD)) break;
      done.push(unit.id);
    }
    setCompletedUnits(done);
    localStore.setRoadmap(done);
    // Mount only: this reads the mastery the profile arrived with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Mark a unit finished. A capstone finishes its whole block. */
  const completeRoadmapUnit = useCallback((unitId) => {
    setCompletedUnits((prev) => {
      const next = completeUnit(prev || [], unitId);
      localStore.setRoadmap(next);
      return next;
    });
  }, []);

  const level = useMemo(() => computeLevel(mastery), [mastery]);

  /**
   * One-time repair of failures caused by the net-label bug.
   *
   * Labels did not bind to the wire they were dropped on, so every challenge
   * that asks the learner to name a node rejected correct circuits, and each
   * rejection was written into concept mastery, which is what the level is
   * derived from. The profile was therefore describing someone who could not do
   * things they had in fact done correctly.
   *
   * Runs on mount against the locally stored mastery, once, and marks itself
   * done. Signed-in profiles load their mastery from the server afterwards and
   * are not covered: there are none yet, and a server-side repair would be a
   * migration rather than a flag.
   */
  useEffect(() => {
    if (settings.labelBugRepair) return;
    const repaired = repairFailedConcepts(mastery);
    setMastery(repaired);
    localStore.setMastery(repaired);
    setSettingsState((prev) => {
      const merged = { ...DEFAULT_SETTINGS, ...prev, labelBugRepair: true };
      localStore.setSettings(merged);
      return merged;
    });
    // Mount only: the stored mastery is what needs repairing, not whatever it
    // becomes afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- session ------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // --- load remote state once signed in -----------------------------------
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return undefined;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('topic, mastery, attempts, passes, fails, streak, last_result, last_attempted_at')
        .eq('user_id', user.id);
      if (error || cancelled) return;

      const remoteProgress = {};
      const remoteMastery = {};
      for (const row of data || []) {
        if (row.topic.startsWith('concept:')) {
          remoteMastery[row.topic.slice('concept:'.length)] = {
            value: Number(row.mastery) || 0,
            attempts: row.attempts || 0,
            passes: row.passes || 0,
            fails: row.fails || 0,
            lastAt: row.last_attempted_at,
          };
        } else {
          remoteProgress[row.topic] = {
            mastery: Number(row.mastery) || 0,
            attempts: row.attempts || 0,
            passes: row.passes || 0,
            fails: row.fails || 0,
            streak: row.streak || 0,
            lastResult: row.last_result,
            lastAttemptedAt: row.last_attempted_at,
          };
        }
      }
      setProgress(remoteProgress);
      setMastery(remoteMastery);

      const { data: rows } = await supabase
        .from('attempts')
        .select('id, challenge_template_id, seed, result, feedback, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled && rows) {
        setAttempts(
          rows.map((r) => ({
            id: r.id,
            templateId: r.challenge_template_id,
            seed: r.seed,
            passed: r.result === 'pass',
            feedback: r.feedback,
            createdAt: r.created_at,
          }))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Calibration: place the learner at a level in one action.
   *
   * Passing `conceptIds` records exactly what they ticked; passing only a level
   * claims everything at or below it. Claims are provisional, the first real
   * challenge converts or refutes them (see `applyConceptResults`).
   */
  const calibrate = useCallback(
    ({ level: startLevel = 1, conceptIds = null } = {}) => {
      const ids = conceptIds && conceptIds.length ? conceptIds : conceptsAtOrBelow(startLevel - 1);
      const next = claimConcepts(mastery, ids);
      setMastery(next);
      localStore.setMastery(next);
      setSettingsState((prev) => {
        const merged = { ...DEFAULT_SETTINGS, ...prev, onboarded: true };
        localStore.setSettings(merged);
        return merged;
      });
      return next;
    },
    [mastery]
  );

  /**
   * "Too easy", claim the current level and move up one band immediately.
   * Returns the level the claim actually produces, so the caller draws from the
   * band the learner has just been moved to rather than assuming one.
   */
  const skipUp = useCallback(() => {
    const next = stepUp(mastery, level.level);
    setMastery(next);
    localStore.setMastery(next);
    return { mastery: next, level: computeLevel(next) };
  }, [mastery, level.level]);

  const setSettings = useCallback((patch) => {
    setSettingsState((prev) => {
      const next = { ...DEFAULT_SETTINGS, ...prev, ...patch };
      localStore.setSettings(next);
      return next;
    });
  }, []);

  // --- recording an attempt ------------------------------------------------
  const recordAttempt = useCallback(
    async (challenge, doc, result) => {
      const nextProgress = applyResult(progress, challenge.topic, result.passed);
      const nextMastery = applyConceptResults(mastery, challenge.concepts || [], result.passed);
      setProgress(nextProgress);
      setMastery(nextMastery);

      const attempt = {
        id: `local-${Date.now()}`,
        templateId: challenge.templateId,
        seed: challenge.seed,
        title: challenge.title,
        passed: result.passed,
        feedback: { correct: result.correct, errors: result.errors, missing: result.missing },
        createdAt: new Date().toISOString(),
      };
      setAttempts((prev) => [attempt, ...prev].slice(0, 50));

      if (user && isSupabaseConfigured) {
        await supabase.from('attempts').insert({
          user_id: user.id,
          challenge_template_id: challenge.templateId,
          seed: challenge.seed,
          challenge_snapshot: { title: challenge.title, brief: challenge.brief, requirements: challenge.requirements },
          schematic_state: doc,
          result: result.passed ? 'pass' : 'fail',
          feedback: attempt.feedback,
        });

        const topicRow = nextProgress[challenge.topic];
        const rows = [
          {
            user_id: user.id,
            topic: challenge.topic,
            mastery: topicRow.mastery,
            attempts: topicRow.attempts,
            passes: topicRow.passes,
            fails: topicRow.fails,
            streak: topicRow.streak,
            last_result: topicRow.lastResult,
            last_attempted_at: topicRow.lastAttemptedAt,
          },
          ...(challenge.concepts || []).map((id) => {
            const m = nextMastery[id];
            return {
              user_id: user.id,
              topic: `concept:${id}`,
              mastery: m.value,
              attempts: m.attempts,
              passes: m.passes,
              fails: m.fails,
              streak: 0,
              last_result: result.passed ? 'pass' : 'fail',
              last_attempted_at: m.lastAt,
            };
          }),
        ];
        await supabase.from('user_progress').upsert(rows, { onConflict: 'user_id,topic' });
      } else {
        localStore.setProgress(nextProgress);
        localStore.setMastery(nextMastery);
        localStore.addAttempt(attempt);
      }
      return attempt;
    },
    [progress, mastery, user]
  );

  // --- auth actions --------------------------------------------------------
  const signUp = useCallback(async (email, password, { migrateGuestProgress = true } = {}) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
    setBusy(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    if (migrateGuestProgress && data.session?.user) {
      const snapshot = localStore.snapshot();
      const rows = [
        ...Object.entries(snapshot.progress).map(([topic, p]) => ({
          user_id: data.session.user.id,
          topic,
          mastery: p.mastery,
          attempts: p.attempts,
          passes: p.passes,
          fails: p.fails,
          streak: p.streak,
          last_result: p.lastResult,
          last_attempted_at: p.lastAttemptedAt,
        })),
        ...Object.entries(snapshot.mastery).map(([id, m]) => ({
          user_id: data.session.user.id,
          topic: `concept:${id}`,
          mastery: m.value,
          attempts: m.attempts,
          passes: m.passes,
          fails: m.fails,
          streak: 0,
          last_attempted_at: m.lastAt,
        })),
      ];
      if (rows.length) await supabase.from('user_progress').upsert(rows, { onConflict: 'user_id,topic' });
    }
    return { data };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
    setBusy(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    return { data };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUser(null);
    setProgress(localStore.getProgress() || emptyProgress());
    setMastery(localStore.getMastery() || emptyMastery());
    setAttempts(localStore.getAttempts());
  }, []);

  return {
    user,
    isGuest: !user,
    progress,
    mastery,
    level,
    settings,
    setSettings,
    attempts,
    recordAttempt,
    calibrate,
    skipUp,
    roadmap,
    completedUnits: completedUnits || [],
    completeRoadmapUnit,
    signIn,
    signUp,
    signOut,
    authError,
    busy,
    supabaseEnabled: isSupabaseConfigured,
  };
}
