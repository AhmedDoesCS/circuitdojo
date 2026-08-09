import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SchematicCanvas from './components/SchematicCanvas.jsx';
import Palette from './components/Palette.jsx';
import ToolDock from './components/ToolDock.jsx';
import ViewBar from './components/ViewBar.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import BriefWidget from './components/BriefWidget.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import ReferencePanel from './components/ReferencePanel.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import ChallengeBrowser from './components/ChallengeBrowser.jsx';
import ChallengeIntro from './components/ChallengeIntro.jsx';
import SuccessOverlay from './components/SuccessOverlay.jsx';
import SolutionOverlay from './components/SolutionOverlay.jsx';
import LifeLostOverlay from './components/LifeLostOverlay.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import Calibrate from './components/Calibrate.jsx';
import IrisTransition from './components/IrisTransition.jsx';
import { LogoMark } from './components/MenuShell.jsx';

import useSchematic from './state/useSchematic.js';
import useProfile from './state/useProfile.js';
import { evaluateAttempt } from './engine/evaluate.js';
import { instantiate, instantiateFromId, RECIPE_COUNT } from './challenges/index.js';
import { localStore } from './lib/storage.js';
import { applyAppearance, watchSystemTheme } from './lib/theme.js';
import { createDocument, isEmptyDocument } from './schematic/model.js';
import { getSymbol } from './schematic/symbols/index.js';
import { randomSeed } from './challenges/rng.js';
import { skipTarget } from './roadmap/index.js';
import { instantiateUnit } from './roadmap/instantiate.js';
import UnitView from './components/UnitView.jsx';
import { gradeAnalyse, gradeInspect } from './engine/answer.js';

/**
 * Requirement "types" are either a symbol id ("D_LED") or a tag ("resistor").
 * Both need to read as a part name in the UI and as something the parts search
 * will actually find.
 */
function partLabel(type) {
  const symbol = getSymbol(type);
  if (symbol) return symbol.name;
  return type.replace(/_/g, ' ');
}

function partQuery(type) {
  const symbol = getSymbol(type);
  return symbol ? symbol.name : type.replace(/_/g, ' ');
}

/**
 * CircuitDojo shell.
 *
 * Three views: placement, home menu and workspace, plus a single set of
 * overlays mounted *above* the view switch. That last detail matters: the iris
 * wipe swaps the view at its midpoint, so if the transition lived inside a view
 * branch it would unmount and replay itself mid-wipe.
 */

const DEFAULT_WIDGETS = { brief: true, palette: true, properties: true, reference: false, status: true };

/**
 * Attempts before the reference answer is offered.
 *
 * Three is where another hint stops teaching and starts grinding: enough to
 * make a real attempt, notice a mistake and correct it, and not so many that
 * the learner is guessing. Seeing the answer never overwrites their sheet, and
 * it never ends the challenge: the counter resets so they can rebuild it.
 */
const MAX_TRIES = 3;

export default function App() {
  const profile = useProfile();

  const savedSession = useMemo(() => localStore.getSession(), []);
  const [view, setView] = useState(() => (profile.settings.onboarded ? 'home' : 'calibrate'));

  const [challenge, setChallenge] = useState(() => {
    if (savedSession?.challengeId) {
      try {
        return instantiateFromId(savedSession.challengeId);
      } catch {
        /* template renamed or removed: fall through to a fresh one */
      }
    }
    return instantiate('led_current_limit', randomSeed());
  });

  const schematic = useSchematic(savedSession?.doc || createDocument());
  const [tool, setTool] = useState('select');
  const [placing, setPlacingState] = useState(null);
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [focus, setFocus] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('progress');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [status, setStatus] = useState({ x: 0, y: 0, zoom: 1.6, nets: 0 });
  const [introFor, setIntroFor] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
  const [iris, setIris] = useState(null); // { next, toView }
  const [openHints, setOpenHints] = useState(false);
  /** The active roadmap unit when it is not a drawing. Null for Build units. */
  const [work, setWork] = useState(null);
  const [tries, setTries] = useState(() => savedSession?.tries || 0);
  // A failed check is two pieces of news. The verdict is held back until the
  // life has visibly been spent, so the cost lands before the diagnosis.
  const [pendingResult, setPendingResult] = useState(null);
  const [lifeLost, setLifeLost] = useState(null);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solutionSeen, setSolutionSeen] = useState(() => Boolean(savedSession?.solutionSeen));
  const [paletteFilter, setPaletteFilter] = useState(null);
  const highlightTimer = useRef(null);
  const restoreWidgets = useRef(DEFAULT_WIDGETS);

  // First run places the learner before anything else happens.
  useEffect(() => {
    if (!profile.settings.onboarded) setView('calibrate');
  }, [profile.settings.onboarded]);

  /**
   * Appearance. index.html has already applied the saved theme before the first
   * paint; this keeps <html> in step when the setting changes, and follows the
   * OS while the choice is "system".
   */
  const { theme, accent } = profile.settings;
  useEffect(() => {
    applyAppearance({ theme, accent });
    return watchSystemTheme(theme, () => applyAppearance({ theme, accent }));
  }, [theme, accent]);

  const toggleWidget = useCallback((name) => {
    setWidgets((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  /**
   * Focus view is a preset, not a lock: entering it clears the screen down to
   * canvas, parts and tools, and leaving it restores what was open. The toggles
   * stay live throughout, so the brief is always one click away.
   */
  const toggleFocus = useCallback(() => {
    setFocus((wasFocused) => {
      if (wasFocused) setWidgets(restoreWidgets.current);
      else {
        restoreWidgets.current = widgets;
        setWidgets({ brief: false, palette: true, properties: true, reference: false, status: false });
      }
      return !wasFocused;
    });
  }, [widgets]);

  const setPlacing = useCallback((next) => {
    setPlacingState(next);
    if (next) setTool('place');
  }, []);

  // Persist the working sheet so a refresh never loses the learner's work.
  useEffect(() => {
    if (view !== 'workspace') return;
    localStore.setSession({ challengeId: challenge.id, doc: schematic.doc, tries, solutionSeen });
  }, [challenge.id, schematic.doc, view, tries, solutionSeen]);

  // Editing invalidates the markers from the previous check.
  useEffect(() => {
    setHighlights([]);
  }, [schematic.doc]);

  const runCheck = useCallback(async () => {
    setChecking(true);
    // Yield to the event loop so the button repaints before the (synchronous)
    // evaluation runs. A timeout rather than rAF, because rAF is throttled to a
    // standstill in a background tab and the check would appear to hang.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const evaluation = evaluateAttempt(schematic.doc, challenge);
    setOpenHints(false);
    setChecking(false);
    if (!evaluation.empty) profile.recordAttempt(challenge, schematic.doc, evaluation);
    /**
     * Unmet requirements get marked too, not just electrical faults: a
     * requirement failure is the one most likely to leave the learner hunting.
     *
     * They are marked *differently*, though. A red "!" on a part means that
     * part is wrong. A requirement that has simply not been addressed yet says
     * nothing about the parts near it, and branding a correct switch and
     * resistor as faults while the panel reports "0 problems with what you
     * built" is the app contradicting itself on screen.
     */
    setHighlights([
      ...evaluation.errors.flatMap((e) => (e.points || []).map((p) => ({ ...p, tone: 'bad' }))),
      ...evaluation.missing.flatMap((e) => (e.points || []).map((p) => ({ ...p, tone: 'warn' }))),
    ].slice(0, 14));
    if (evaluation.passed) {
      setResult(evaluation);
      setCelebrating(true);
      // Advancing the curriculum is the only thing a pass has to do that a
      // random draw never did.
      if (challenge.unitId) profile.completeRoadmapUnit(challenge.unitId);
      return;
    }
    // An empty sheet is not an attempt: it is someone pressing the button
    // before starting, and spending a try on it would be a punishment for
    // curiosity.
    if (evaluation.empty) {
      setResult(evaluation);
      return;
    }
    // Counted and acted on outside the updater. Queuing setState from inside
    // another setter's updater is a render-phase side effect: React is free to
    // replay the updater, and the reveal was being dropped on the floor.
    const used = tries + 1;
    setTries(used);
    // The verdict is held until the life has visibly been spent. A failed check
    // is two pieces of news: you spent an attempt, and here is what is wrong,
    // and delivered in the same frame the first one is never read.
    setPendingResult(evaluation);
    setLifeLost({ remaining: Math.max(0, MAX_TRIES - used), used });
  }, [schematic.doc, challenge, profile, tries]);

  /**
   * Checking an Analyse or Inspect unit.
   *
   * Deliberately the same shape as `runCheck`: it produces a result, spends a
   * life on a genuine wrong answer, and leaves an unanswered question costing
   * nothing. The learner should not be able to feel which engine graded them.
   */
  const checkUnit = useCallback(
    async (answer) => {
      if (!work) return;
      setChecking(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const evaluation =
        work.kind === 'analyse'
          ? gradeAnalyse(work.unit, answer, work.params)
          : gradeInspect(work.fault, answer);
      setChecking(false);

      if (evaluation.passed) {
        setResult(evaluation);
        setCelebrating(true);
        profile.completeRoadmapUnit(work.unitId);
        return;
      }
      if (evaluation.empty) {
        setResult(evaluation);
        return;
      }
      const used = tries + 1;
      setTries(used);
      setPendingResult(evaluation);
      setLifeLost({ remaining: Math.max(0, MAX_TRIES - used), used });
    },
    [work, profile, tries]
  );

  /**
   * The loss has played. Now show what is actually wrong.
   *
   * Every value read here is written once, before the overlay mounts, so this
   * callback keeps a stable identity for the whole animation, which matters,
   * because the overlay's dismissal timer is keyed on it and a new identity
   * would restart the countdown.
   */
  const finishLifeLost = useCallback(() => {
    const outOfLives = lifeLost && lifeLost.used >= MAX_TRIES;
    setLifeLost(null);
    setResult(pendingResult);
    setPendingResult(null);
    if (outOfLives && !solutionSeen) {
      setSolutionOpen(true);
      setSolutionSeen(true);
    }
  }, [lifeLost, pendingResult, solutionSeen]);

  /** Run a transition. The iris covers the screen before anything changes. */
  const beginTransition = useCallback((payload) => {
    setCelebrating(false);
    setIris(payload);
  }, []);

  /** Applied at the midpoint of the wipe, while the screen is fully covered. */
  const applyTransition = useCallback(() => {
    if (!iris) return;
    if (iris.work) {
      setWork(iris.work);
      setResult(null);
      setTries(0);
      setSolutionOpen(false);
      setSolutionSeen(false);
      setLifeLost(null);
      setPendingResult(null);
    }
    if (iris.next) {
      setWork(null);
      setChallenge(iris.next);
      setResult(null);
      setHighlights([]);
      setTries(0);
      setSolutionOpen(false);
      setSolutionSeen(false);
      setLifeLost(null);
      setPendingResult(null);
      setPlacingState(null);
      setTool('select');
      schematic.clear();
      setWidgets((prev) => ({ ...prev, brief: true }));
      setIntroFor(profile.settings.introAnimation ? iris.next.id : null);
    }
    if (iris.toView) setView(iris.toView);
    else if (iris.next) setView('workspace');
  }, [iris, schematic, profile.settings.introAnimation]);

  /**
   * The next thing to build.
   *
   * A read of the roadmap cursor, not a weighted draw. Nothing is computed
   * here beyond instantiating the template, so pressing Start Designing costs
   * what it always did: the iris, and the brief behind it.
   */
  const openUnit = useCallback(
    (unit) => {
      if (!unit) return;
      const built = instantiateUnit(unit, randomSeed());
      if (!built) return;
      if (built.kind === 'build') {
        beginTransition({ next: { ...built.challenge, unitId: unit.id }, toView: 'workspace' });
        return;
      }
      beginTransition({ work: built, toView: 'workspace' });
    },
    [beginTransition]
  );

  const startNext = useCallback(() => {
    openUnit(profile.roadmap.current);
  }, [openUnit, profile.roadmap.current]);

  const nextChallenge = startNext;

  /**
   * "Too easy": claim the current level, then immediately draw from the band
   * above. The impatient expert's escape hatch, no test required.
   */
  /**
   * "This is too easy" now sets an examination rather than accepting a claim.
   *
   * It jumps to the block's capstone: pass that cold and the whole block is
   * marked done. Claiming a level on the learner's word is how silent gaps
   * formed, and a gap in a curriculum is worse than a gap in a shuffler.
   */
  const skipBlock = useCallback(() => {
    openUnit(skipTarget(profile.completedUnits));
  }, [openUnit, profile.completedUnits]);

  const highlight = useCallback((points) => {
    clearTimeout(highlightTimer.current);
    setHighlights(points);
    highlightTimer.current = setTimeout(() => setHighlights([]), 8000);
  }, []);

  const openProfile = useCallback((tab = 'progress') => {
    setProfileTab(tab);
    setProfileOpen(true);
  }, []);

  /** Canvas shortcuts that belong to the app rather than the sheet. */
  const handleAppAction = useCallback(
    (action) => {
      switch (action) {
        case 'add_component':
          setWidgets((w) => ({ ...w, palette: true }));
          setPaletteFilter({ query: '', at: Date.now() });
          break;
        case 'add_power':
          setWidgets((w) => ({ ...w, palette: true }));
          setPaletteFilter({ query: 'power', at: Date.now() });
          break;
        case 'edit_properties':
        case 'edit_value':
        case 'edit_reference':
          setWidgets((w) => ({ ...w, properties: true }));
          window.setTimeout(() => {
            const field = action === 'edit_reference' ? 'reference' : 'value';
            document.querySelector(`[data-prop-field="${field}"]`)?.focus();
          }, 60);
          break;
        case 'run_check':
          runCheck();
          break;
        case 'toggle_brief':
          toggleWidget('brief');
          break;
        case 'toggle_hints':
          if (result && !result.passed) {
            setOpenHints(true);
            setResult((r) => ({ ...r }));
          }
          break;
        case 'toggle_shortcuts':
          openProfile('shortcuts');
          break;
        default:
          break;
      }
    },
    [runCheck, toggleWidget, result, openProfile]
  );

  const unresolved = result && !result.passed ? result.errors.length + result.missing.length : 0;
  /**
   * Is there a sheet worth going back to?
   *
   * Read from the live document, not from the session snapshot taken at mount.
   * The snapshot never changes while the app is open, so drawing something and
   * returning to the menu left the menu still offering "Start designing" as if
   * nothing existed, and the editor is restored from that same snapshot, so
   * the live document covers the reloaded case too.
   */
  const hasSession = !isEmptyDocument(schematic.doc);

  /**
   * Parts the brief asks for that are not on the sheet.
   *
   * Every other failure can be ringed where it is. This one cannot: the mark
   * belongs where the component isn't, so it gets its own standing list, and
   * each entry opens the palette on the part it is asking for.
   */
  const wantedParts = useMemo(() => {
    if (!result || result.passed) return [];
    const seen = new Set();
    return [...result.missing, ...result.errors]
      .map((e) => e.want)
      .filter((want) => {
        if (!want || seen.has(want.type)) return false;
        seen.add(want.type);
        return true;
      });
  }, [result]);

  // ------------------------------------------------------------------ views
  let body = null;

  if (view === 'calibrate') {
    body = (
      <Calibrate
        mastery={profile.mastery}
        firstRun={!profile.settings.onboarded}
        onCancel={() => beginTransition({ toView: 'home' })}
        onDone={({ level, conceptIds }) => {
          profile.calibrate({ level, conceptIds });
          // First run has no menu behind it to wipe from, so it lands directly.
          if (profile.settings.onboarded) beginTransition({ toView: 'home' });
          else setView('home');
        }}
      />
    );
  } else if (view === 'home') {
    body = (
      // The home screen's system menu opens the profile on a chosen tab, so it
      // takes the opener itself rather than one pre-bound entry point.
      <HomeScreen
        onStart={startNext}
        onBrowse={() => setBrowserOpen(true)}
        // Every other route into the workspace wipes. Resume used to snap, and
        // the sheet appearing without warning read as a glitch rather than a
        // return: the transition is what says "you are back where you were".
        onResume={() => beginTransition({ toView: 'workspace' })}
        onCalibrate={() => beginTransition({ toView: 'calibrate' })}
        onOpenProfile={openProfile}
        hasSession={hasSession}
        roadmap={profile.roadmap}
        level={profile.level}
        mastery={profile.mastery}
        solved={profile.attempts.filter((a) => a.passed).length}
        recipeCount={RECIPE_COUNT}
      />
    );
  } else if (work) {
    // A roadmap unit that is not a drawing. It gets the menu shell rather than
    // the workspace chrome: there is no canvas to give the window to, and the
    // dock, palette and properties panel are furniture for tools that do not
    // apply to reading a schematic or answering a question about one.
    body = (
      <UnitView
        unit={work}
        tries={tries}
        maxTries={MAX_TRIES}
        checking={checking}
        result={result}
        onCheck={checkUnit}
        onBack={() => beginTransition({ toView: 'home' })}
      />
    );
  } else {
    body = (
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0">
          <SchematicCanvas
            schematic={schematic}
            tool={tool}
            setTool={setTool}
            placing={placing}
            setPlacing={setPlacingState}
            highlights={highlights}
            onStatus={setStatus}
            onAppAction={handleAppAction}
          />
        </div>

        {/* Top-left: wordmark + brief + parts */}
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-h-[calc(100vh-2rem)] flex-col items-start gap-3">
          {!focus && (
            <button
              onClick={() => beginTransition({ toView: 'home' })}
              className="panel-pill pointer-events-auto flex h-11 animate-widget-in items-center gap-2 px-4 transition-transform duration-200 ease-smooth hover:scale-[1.02]"
              title="Back to the menu"
            >
              <LogoMark size={18} />
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">CircuitDojo</span>
            </button>
          )}

          {widgets.brief && (
            <BriefWidget
              challenge={challenge}
              unresolved={unresolved}
              onClose={() => toggleWidget('brief')}
              onReplayIntro={() => setIntroFor(challenge.id)}
              onBrowse={() => setBrowserOpen(true)}
              onNewChallenge={nextChallenge}
              onTooEasy={skipBlock}
            />
          )}

          {widgets.palette && (
            <Palette
              placing={placing}
              filter={paletteFilter}
              onPick={(symbolId, unitId) => setPlacing({ symbolId, unitId })}
              onClose={() => toggleWidget('palette')}
            />
          )}
        </div>

        {/* Top-right: view switchboard, properties, reference */}
        <div className="pointer-events-none absolute right-4 top-4 z-20 flex max-h-[calc(100vh-2rem)] flex-col items-end gap-3">
          <ViewBar
            widgets={widgets}
            toggle={toggleWidget}
            focus={focus}
            onToggleFocus={toggleFocus}
            onOpenProfile={() => openProfile('progress')}
            guestLabel={profile.user ? profile.user.email?.split('@')[0] || 'Account' : 'Guest'}
          />

          {widgets.properties && (
            <div className="pointer-events-auto">
              <PropertiesPanel schematic={schematic} onClose={() => toggleWidget('properties')} />
            </div>
          )}

          {widgets.reference && (
            <div className="pointer-events-auto min-h-0">
              <ReferencePanel onClose={() => toggleWidget('reference')} />
            </div>
          )}
        </div>

        {/* Bottom-centre: results above the dock */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-3 px-4">
          {result && !celebrating && (
            <div className="pointer-events-auto w-full max-w-[58rem]">
              <ResultsPanel
                result={result}
                challenge={challenge}
                doc={schematic.doc}
                hintsEnabled={profile.settings.hints}
                openHints={openHints}
                tries={tries}
                maxTries={MAX_TRIES}
                onShowSolution={() => setSolutionOpen(true)}
                onRetry={() => setResult(null)}
                onClose={() => setResult(null)}
                onHighlight={highlight}
              />
            </div>
          )}

          <ToolDock
            tool={tool}
            setTool={(t) => {
              setTool(t);
              if (t !== 'place') setPlacingState(null);
            }}
            schematic={schematic}
            onRunCheck={runCheck}
            checking={checking}
            hasSelection={schematic.selection.length > 0}
            tries={tries}
            maxTries={MAX_TRIES}
            compact={focus}
          />
        </div>

        {/* Bottom-left: unresolved reminder + status readout */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col items-start gap-2">
          {unresolved > 0 && !celebrating && (
            <button
              onClick={() => {
                setOpenHints(true);
                setResult((r) => (r ? { ...r } : r));
              }}
              className="panel-pill pointer-events-auto flex animate-alert-pulse items-center gap-2 px-3.5 py-2 text-[12px] font-medium text-bad"
              title="Show hints for what is still unresolved"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-bad text-[10px] font-bold text-on-solid">
                !
              </span>
              {unresolved} unresolved, need a hint?
            </button>
          )}

          {wantedParts.length > 0 && !celebrating && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
              {wantedParts.map((want) => (
                <button
                  key={want.type}
                  onClick={() => {
                    setWidgets((w) => ({ ...w, palette: true }));
                    setPaletteFilter({ query: partQuery(want.type), at: Date.now() });
                  }}
                  className="panel-pill flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-warn"
                  title={`The brief needs ${want.need}, click to find it in the parts list`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                  Missing {want.need - want.have} × {partLabel(want.type)}
                </button>
              ))}
            </div>
          )}

          {/* The reference stays one click away once it has been earned. */}
          {solutionSeen && !celebrating && !solutionOpen && (
            <button
              onClick={() => setSolutionOpen(true)}
              className="panel-pill pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium text-accent"
              title="Show the reference circuit again"
            >
              Reference circuit
            </button>
          )}
          {widgets.status && (
            <div className="panel-pill px-3.5 py-2 font-mono text-[11px] text-zinc-600">
              x {status.x} · y {status.y} &nbsp; {status.zoom.toFixed(2)}× &nbsp; {status.nets} nets &nbsp;{' '}
              {schematic.doc.components.length} parts
              {schematic.selection.length > 0 && <> &nbsp; {schematic.selection.length} selected</>}
              {status.hoverNet && (
                <>
                  {' '}
                  &nbsp;{' '}
                  <span className="text-accent">
                    {status.hoverNet.name} · {status.hoverNet.pins} pin
                    {status.hoverNet.pins === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {body}

      {/* Overlays live above the view switch so a transition cannot remount them. */}
      {view === 'workspace' && introFor === challenge.id && (
        <ChallengeIntro challenge={challenge} onDone={() => setIntroFor(null)} onTooEasy={skipBlock} />
      )}

      {view === 'workspace' && celebrating && result?.passed && (
        <SuccessOverlay
          result={result}
          challenge={work ? { title: work.title } : challenge}
          onNext={nextChallenge}
          onStay={() => setCelebrating(false)}
        />
      )}

      {view === 'workspace' && lifeLost && (
        <LifeLostOverlay remaining={lifeLost.remaining} total={MAX_TRIES} onDone={finishLifeLost} />
      )}

      {view === 'workspace' && solutionOpen && (
        <SolutionOverlay
          challenge={challenge}
          doc={schematic.doc}
          result={result}
          onClose={() => setSolutionOpen(false)}
          onNext={nextChallenge}
          // Rebuilding is a fresh run at it: the counter goes back to zero, but
          // the reveal does not fire again on its own: it is one click away in
          // the corner instead.
          onRetry={() => {
            setSolutionOpen(false);
            setResult(null);
            setTries(0);
          }}
        />
      )}

      <ProfileModal
        open={profileOpen}
        initialTab={profileTab}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onRecalibrate={() => {
          setProfileOpen(false);
          beginTransition({ toView: 'calibrate' });
        }}
      />

      <ChallengeBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        mastery={profile.mastery}
        level={profile.level}
        currentTemplateId={challenge.templateId}
        onPick={(templateId) => {
          setBrowserOpen(false);
          beginTransition({ next: instantiate(templateId, randomSeed()), toView: 'workspace' });
        }}
      />

      <IrisTransition run={Boolean(iris)} onMidpoint={applyTransition} onComplete={() => setIris(null)} />
    </div>
  );
}
