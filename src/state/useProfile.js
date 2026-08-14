import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured, humanAuthError } from '../lib/supabase.js';
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
  /**
   * Every check, of every unit kind, for the history charts.
   *
   * Separate from `attempts`, which mirrors a server table keyed by challenge
   * template and therefore cannot hold a numeric question. This one is local
   * and lightweight, and is what makes a history worth drawing now that most
   * of the roadmap is not a drawing.
   */
  const [activity, setActivity] = useState(() => localStore.getActivity());
  const [identity, setIdentityState] = useState(() => localStore.getIdentity());
  const [authError, setAuthError] = useState(null);
  const [busy, setBusy] = useState(false);
  /**
   * An account created but not yet confirmed.
   *
   * Supabase returns a user and no session in that case, which is easy to read
   * as failure and is the opposite: the account exists and is one click away.
   * Holding the address lets the screen say so, and lets it offer to send the
   * email again without asking the learner to type it a second time.
   */
  const [pendingEmail, setPendingEmail] = useState(null);

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
  const completeRoadmapUnit = useCallback(
    (unitId) => {
      setCompletedUnits((prev) => {
        const next = completeUnit(prev || [], unitId);
        localStore.setRoadmap(next);

        /**
         * Signed in, the position goes to the server too.
         *
         * Written as one row per unit and as whatever is newly done rather than
         * the whole list, so two devices signed into the same account cannot
         * overwrite each other: a capstone completing four units at once inserts
         * four rows, and an insert that collides with a row already there is
         * ignored rather than failing.
         */
        if (user && isSupabaseConfigured) {
          const added = next.filter((id) => !(prev || []).includes(id));
          if (added.length) {
            supabase
              .from('user_roadmap')
              .upsert(
                added.map((id) => ({ user_id: user.id, unit_id: id })),
                { onConflict: 'user_id,unit_id', ignoreDuplicates: true }
              )
              .then(() => {});
          }
        }
        return next;
      });
    },
    [user]
  );

  const level = useMemo(() => computeLevel(mastery, roadmap), [mastery, roadmap]);

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

  /**
   * Arrived from the confirmation link.
   *
   * Supabase sends people back to the address we asked for with the tokens in
   * the URL fragment, the client library consumes them, and the app would
   * otherwise just be sitting there signed in with no explanation of what
   * happened. `?welcome=1` is our own marker on the redirect, and it is cleared
   * from the address bar immediately so a refresh does not replay the greeting.
   */
  const [justConfirmed, setJustConfirmed] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('welcome') !== '1') return;
    setJustConfirmed(true);
    url.searchParams.delete('welcome');
    window.history.replaceState({}, '', url.pathname + url.search);
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
      /**
       * An account with nothing in it yet adopts what this device has.
       *
       * Supabase projects confirm email by default, and a sign-up awaiting
       * confirmation returns no session, so the migration that runs at sign-up
       * is skipped and the first real sign-in happens against an empty account.
       * Replacing local state with that emptiness is how a learner loses
       * everything by making an account, which is the opposite of the offer.
       */
      const serverIsEmpty = !(data || []).length;
      if (serverIsEmpty) {
        const local = localStore.snapshot();
        const rows = [
          ...Object.entries(local.progress || {}).map(([topic, t]) => ({
            user_id: user.id,
            topic,
            mastery: t.mastery,
            attempts: t.attempts,
            passes: t.passes,
            fails: t.fails,
            streak: t.streak,
            last_result: t.lastResult,
            last_attempted_at: t.lastAttemptedAt,
          })),
          ...Object.entries(local.mastery || {}).map(([id, m]) => ({
            user_id: user.id,
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
      } else {
        setProgress(remoteProgress);
        setMastery(remoteMastery);
      }

      /**
       * Identity travels with the account.
       *
       * A name chosen on one machine should be the name on the next, and an
       * account that has never been given one adopts whatever this device is
       * already using rather than resetting to the email address.
       */
      const remoteIdentity = user.user_metadata?.circuitdojo;
      const localIdentity = localStore.getIdentity();
      if (remoteIdentity) {
        localStore.setIdentity(remoteIdentity);
        setIdentityState(remoteIdentity);
      } else if (localIdentity) {
        await supabase.auth.updateUser({ data: { circuitdojo: localIdentity } });
      }

      /**
       * The position, merged rather than replaced.
       *
       * Signing in on a new device should not undo the units sat as a guest on
       * that device a minute earlier, and signing in on the old one should not
       * lose what was done elsewhere. A union of the two is the only answer
       * that cannot take something away, and completed units never expire.
       */
      const { data: units } = await supabase
        .from('user_roadmap')
        .select('unit_id')
        .eq('user_id', user.id);
      if (cancelled) return;
      const merged = new Set([...(localStore.getRoadmap() || []), ...(units || []).map((u) => u.unit_id)]);
      const ordered = UNITS.filter((u) => merged.has(u.id)).map((u) => u.id);
      setCompletedUnits(ordered);
      localStore.setRoadmap(ordered);

      // Anything this device knew and the server did not now goes up.
      const remoteIds = new Set((units || []).map((u) => u.unit_id));
      const missing = ordered.filter((id) => !remoteIds.has(id));
      if (missing.length) {
        await supabase
          .from('user_roadmap')
          .upsert(
            missing.map((id) => ({ user_id: user.id, unit_id: id })),
            { onConflict: 'user_id,unit_id', ignoreDuplicates: true }
          );
      }

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
    // Mastery-only on purpose: this reports what claiming a band did to the
    // mastery model, and claiming a band does not move the roadmap cursor.
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

  /** One check, of any kind, for the record. */
  const recordActivity = useCallback((entry) => {
    setActivity(localStore.addActivity(entry));
  }, []);

  /**
   * Name, mark and description.
   *
   * Kept in Supabase's own user metadata rather than a table of our own: it is
   * a handful of short strings that belong to the account rather than to the
   * curriculum, and putting them there means no migration and no extra query on
   * every sign-in.
   */
  const setIdentity = useCallback(
    async (patch) => {
      const next = { ...(localStore.getIdentity() || {}), ...patch };
      localStore.setIdentity(next);
      setIdentityState(next);
      if (user && isSupabaseConfigured) {
        await supabase.auth.updateUser({ data: { circuitdojo: next } });
      }
      return next;
    },
    [user]
  );

  // --- auth actions --------------------------------------------------------
  const signUp = useCallback(async (email, password, { migrateGuestProgress = true } = {}) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
    setBusy(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      /**
       * Where the confirmation link lands.
       *
       * Left unset, Supabase sends people to whatever Site URL is configured in
       * a dashboard they have never seen, which on a misconfigured project is
       * localhost. Naming the current origin means the link always comes back
       * to the app they signed up from, including a preview deployment.
       */
      options: { emailRedirectTo: `${window.location.origin}/?welcome=1` },
    });
    setBusy(false);
    if (error) {
      const human = humanAuthError(error.message);
      setAuthError(human);
      return { error: human };
    }
    // A user with no session is an account awaiting its confirmation link.
    if (!data.session && data.user) {
      setPendingEmail(email);
      return { pending: true, data };
    }
    setPendingEmail(null);
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

      // The position matters more than the mastery it is carried beside: a
      // learner who signs up forty units in and lands back at the first LED
      // would be right to conclude the account cost them their work.
      const done = localStore.getRoadmap() || [];
      if (done.length) {
        await supabase
          .from('user_roadmap')
          .upsert(
            done.map((id) => ({ user_id: data.session.user.id, unit_id: id })),
            { onConflict: 'user_id,unit_id', ignoreDuplicates: true }
          );
      }
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
      const human = humanAuthError(error.message);
      setAuthError(human);
      return { error: human };
    }
    setPendingEmail(null);
    return { data };
  }, []);

  /**
   * Send the confirmation link again.
   *
   * The commonest reason an account never gets used is that the first email
   * went to spam or was closed by accident, and the only recovery on offer
   * elsewhere is to try to sign up again and be told the account already
   * exists. One button beats that.
   */
  const resendConfirmation = useCallback(async (email) => {
    if (!isSupabaseConfigured) return { error: 'Accounts are not set up on this deployment.' };
    setBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/?welcome=1` },
    });
    setBusy(false);
    if (error) {
      const human = humanAuthError(error.message);
      setAuthError(human);
      return { error: human };
    }
    return { ok: true };
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearPending = useCallback(() => setPendingEmail(null), []);
  const clearJustConfirmed = useCallback(() => setJustConfirmed(false), []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUser(null);
    setPendingEmail(null);
    setAuthError(null);
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
    activity,
    recordActivity,
    identity,
    setIdentity,
    calibrate,
    skipUp,
    roadmap,
    completedUnits: completedUnits || [],
    completeRoadmapUnit,
    signIn,
    signUp,
    signOut,
    resendConfirmation,
    pendingEmail,
    clearPending,
    justConfirmed,
    clearJustConfirmed,
    authError,
    clearAuthError,
    busy,
    supabaseEnabled: isSupabaseConfigured,
  };
}
