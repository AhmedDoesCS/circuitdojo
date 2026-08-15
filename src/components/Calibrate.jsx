import React, { useEffect, useMemo, useState } from 'react';
import MenuShell, { LogoMark, MenuOption, at } from './MenuShell.jsx';
import { CONCEPTS, DOMAINS } from '../challenges/concepts.js';
import { EXPERIENCE_TIERS, HOLD, LEVELS, conceptsAtOrBelow, masteryOf } from '../lib/level.js';
import { placementFor, unitTitle } from '../roadmap/index.js';

/**
 * Level placement: the answer to "I am not a beginner, do not waste my time".
 *
 * Why this shape rather than an admission test:
 *
 *  - A test costs the impatient expert exactly the thing they came for: time,
 *    and it tests the wrong thing anyway, because a placement circuit they fail
 *    for a silly reason drops them two levels.
 *  - So step one is a single click: pick the sentence that describes you. That
 *    *claims* every concept at or below that level, which unlocks the material
 *    immediately.
 *  - Claims are provisional. The first real challenge that touches a claimed
 *    concept settles it: a pass converts it to earned mastery, a failure hands
 *    it back and the level self-corrects. Being wrong costs one challenge, not a
 *    test.
 *  - Step two is optional and exists for people who are strong in one branch and
 *    new to another: tick the concepts you actually hold. Nobody is forced
 *    through it.
 *
 * ## Layout
 *
 * This is the first screen anyone sees, and it was the last one still built the
 * old way: oversized rows with growing leading rules, ad-hoc delays, no bands.
 * It now uses the same vocabulary as the home screen and the brief:
 *
 *  - **Header / body / footer bands**, the body on `min-h-0 flex-1`, so a short
 *    window compresses the middle instead of pushing content off-screen.
 *  - **Numbered options** from the shared `MenuOption`, with the digit keys
 *    wired to match: six tiers means `1`-`6` selects your level outright.
 *  - **One entrance beat** via the shared `at()`, counted in reading order.
 *  - The confirm step runs on the **brief's centred spine**, because by then
 *    there is one decision and no reason for a second column.
 */
export default function Calibrate({ mastery, completedUnits = [], onDone, onCancel, firstRun = false }) {
  const [step, setStep] = useState('tier');
  const [tier, setTier] = useState(null);
  const [ticked, setTicked] = useState(() => new Set());

  /**
   * What the chosen band would actually cost.
   *
   * Computed here rather than announced by the caller, because this screen is
   * where the promise is made and a promise it cannot see the terms of is how
   * the old version ended up lying: it said "the roadmap starts there" and then
   * moved nothing, because claiming concepts stopped meaning anything the day
   * selection became a cursor into the curriculum.
   */
  const placement = useMemo(
    () => (tier ? placementFor(tier.level, completedUnits) : null),
    [tier, completedUnits]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const concept of CONCEPTS) {
      if (!map.has(concept.domain)) map.set(concept.domain, []);
      map.get(concept.domain).push(concept);
    }
    return [...map.entries()];
  }, []);

  const chooseTier = (chosen) => {
    setTier(chosen);
    setTicked(new Set(conceptsAtOrBelow(chosen.level - 1)));
  };

  const finish = (conceptIds) => {
    onDone({ level: tier?.level ?? 1, conceptIds, placement });
  };

  /**
   * Digit keys pick an option, matching the badge on each row, the same model
   * the home screen uses. Only the two choosing steps are wired: the concept
   * list has 37 checkboxes and no sensible numbering.
   */
  useEffect(() => {
    if (step === 'concepts') return undefined;
    const onKey = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
      const digit = Number(event.key);
      if (!digit) return;

      if (step === 'tier' && digit <= EXPERIENCE_TIERS.length) {
        event.preventDefault();
        chooseTier(EXPERIENCE_TIERS[digit - 1]);
        setStep('confirm');
      } else if (step === 'confirm' && digit <= 3) {
        event.preventDefault();
        if (digit === 1) finish([...ticked]);
        else setStep(digit === 2 ? 'concepts' : 'tier');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, ticked, tier]);

  // ------------------------------------------------------------- step: tier
  if (step === 'tier') {
    return (
      <MenuShell>
        <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.9rem,2.6vh,2rem)]">
          <header className="flex shrink-0 items-center justify-between gap-3">
            <div className="panel-pill animate-enter-up flex h-11 items-center gap-2.5 px-4" style={at(0)}>
              <LogoMark />
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">CircuitDojo</span>
            </div>
            {!firstRun && (
              <button className="btn-ghost animate-enter-up text-[12px]" style={at(0.5)} onClick={onCancel}>
                Cancel
              </button>
            )}
          </header>

          {/*
            `items-center` rather than `content-center`, and every column capped
            at the row's height.

            The old version centred the grid *content* and let a column that did
            not fit bleed out of both ends: at 1280x720 this section was 74px
            taller than its row, so it hung 37px over the header and the eyebrow
            printed on top of the wordmark. A menu shell is `overflow-hidden`, so
            the overflow had nowhere to go and nothing to scroll: it simply drew
            on the furniture. Nothing here may be taller than the space it is in.
          */}
          <main
            className="grid min-h-0 flex-1 items-center gap-x-[clamp(1.75rem,4vw,4.5rem)] gap-y-[clamp(1rem,2.5vh,2rem)]
              lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]"
          >
            <section className="flex max-h-full min-h-0 min-w-0 flex-col justify-center">
              <p className="widget-title animate-enter-up shrink-0" style={at(1)}>
                {firstRun ? 'Before we start' : 'Placement'}
              </p>

              <h1
                className="animate-intro-title mt-1.5 shrink-0 font-semibold leading-[1] tracking-[-0.035em] text-zinc-900"
                style={{ fontSize: 'clamp(1.5rem, min(4vw, 5.9vh), 3rem)', ...at(1.5) }}
              >
                Where are you
                <br />
                <span className="text-zinc-400">starting from?</span>
              </h1>

              {/* Wider than it looks: at 44ch this wrapped to three lines and
                  cost 81px of a column that was already over budget. */}
              <p
                className="animate-enter-up mt-[clamp(0.35rem,1vh,0.75rem)] max-w-[62ch] shrink-0 text-zinc-600 [@media(max-height:700px)]:hidden"
                style={{ fontSize: 'clamp(0.8rem, min(1vw, 1.9vh), 0.95rem)', ...at(2.2) }}
              >
                Starting further along is earned by drawing one circuit rather than by saying so, and you are told
                exactly which one before you commit to anything.
              </p>

              {/* Six equal choices, so none is emphasised: this is a picker, not
                  a menu with a primary. The index doubles as the digit key.
                  This is the flexible part of the column: if anything has to
                  give at a short window, it is the list, and it scrolls rather
                  than pushing the last two options off the screen. */}
              <nav className="mt-[clamp(0.6rem,1.8vh,1.2rem)] flex w-full min-h-0 max-w-[34rem] flex-col gap-[clamp(0.3rem,0.85vh,0.5rem)] overflow-y-auto">
                {EXPERIENCE_TIERS.map((option, i) => (
                  <MenuOption
                    key={option.id}
                    index={i + 1}
                    label={option.label}
                    hint={option.blurb}
                    meta={`L${option.level}`}
                    compact
                    delay={at(3 + i * 0.55)}
                    onClick={() => {
                      chooseTier(option);
                      setStep('confirm');
                    }}
                  />
                ))}
              </nav>
            </section>

            <aside className="hidden max-h-full min-h-0 min-w-0 lg:flex lg:flex-col lg:justify-center">
              <div
                className="panel animate-enter-right min-h-0 overflow-y-auto p-[clamp(1rem,1.9vw,1.7rem)]"
                style={at(4)}
              >
                <p className="widget-title">How placement works</p>
                <ol className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-zinc-600">
                  <Explainer n="1" title="You pick where to start.">
                    The next screen names the stage that band lands you on, and how many units it would skip.
                  </Explainer>
                  <Explainer n="2" title="You draw one circuit.">
                    The hardest one you would be skipping over. You are shown which before you agree to it.
                  </Explainer>
                  <Explainer n="3" title="Passing moves you, for good.">
                    Everything before that stage is signed off and stays that way. Failing moves nothing, and the
                    circuit is explained rather than marked.
                  </Explainer>
                </ol>
                <p className="mt-4 rounded-control bg-zinc-900/[0.04] px-3 py-2 text-[11.5px] leading-relaxed text-zinc-600 [@media(max-height:700px)]:hidden">
                  A level handed over on request is a gap you find out about six stages later. This costs one circuit
                  and cannot leave one.
                </p>
              </div>
            </aside>
          </main>

          <footer className="shrink-0">
            <p className="animate-fade-in text-[11px] text-zinc-400 [@media(max-height:600px)]:hidden" style={at(7)}>
              1-{EXPERIENCE_TIERS.length} to choose · nothing here is permanent
            </p>
          </footer>
        </div>
      </MenuShell>
    );
  }

  // ---------------------------------------------------------- step: confirm
  // The brief's shape: one centred spine, because there is one decision left.
  if (step === 'confirm') {
    return (
      <MenuShell pad="tight">
        <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.6rem,1.8vh,1.4rem)]">
          <header className="flex shrink-0 items-center justify-between gap-3">
            <div className="panel-pill animate-enter-up flex h-10 items-center gap-2.5 px-3.5" style={at(0)}>
              <LogoMark size={17} />
              <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-zinc-900">Placement</span>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <div className="flex w-full min-w-0 max-w-[46rem] flex-col items-center">
              <div
                className="animate-enter-up flex w-full items-center justify-center gap-3 text-zinc-500"
                style={at(1)}
              >
                <span className="h-px max-w-[6rem] flex-1 bg-zinc-900/15" />
                <span className="shrink-0 font-mono text-[11px] font-semibold tracking-[0.14em] text-zinc-600">
                  LEVEL {String(tier.level).padStart(2, '0')}
                </span>
                <span className="h-px max-w-[6rem] flex-1 bg-zinc-900/15" />
              </div>

              <h1
                className="animate-intro-title mt-[clamp(0.4rem,1.2vh,0.9rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-zinc-900"
                style={{ fontSize: 'clamp(1.6rem, min(4.2vw, 6.5vh), 3.2rem)', ...at(1.6) }}
              >
                {tier.label}
              </h1>

              <p
                className="animate-enter-up mt-[clamp(0.5rem,1.4vh,1rem)] max-w-[54ch] leading-relaxed text-zinc-700"
                style={{ fontSize: 'clamp(0.86rem, min(1.2vw, 2.2vh), 1.08rem)', ...at(2.6) }}
              >
                {tier.blurb}
              </p>

              {/* The terms, before the button. Everything below is a statement
                  of what will actually happen, which is the whole difference
                  between this and the version that claimed and moved nothing. */}
              <PlacementTerms placement={placement} ticked={ticked.size} delay={at(3.1)} />

              <nav className="mt-[clamp(0.7rem,2.2vh,1.5rem)] flex w-full max-w-[32rem] flex-col gap-2">
                <MenuOption
                  index="1"
                  emphasis="primary"
                  label={
                    placement?.ahead
                      ? 'Sit the placement circuit'
                      : placement?.behind
                        ? `Move back to stage ${placement.targetStage}`
                        : 'Start designing'
                  }
                  hint={
                    placement?.ahead
                      ? `Pass it and stage ${placement.targetStage} is where you carry on from`
                      : placement?.behind
                        ? 'Gives up everything you have finished from there on'
                        : 'Go straight to the next thing on the roadmap'
                  }
                  delay={at(3.9)}
                  onClick={() => finish([...ticked])}
                />
                <MenuOption
                  index="2"
                  label="Tune it concept by concept"
                  hint="Strong in one branch, new to another? Tick exactly what you hold"
                  delay={at(4.6)}
                  onClick={() => setStep('concepts')}
                />
                <MenuOption
                  index="3"
                  label="Pick a different level"
                  hint="Back to the list"
                  delay={at(5.2)}
                  onClick={() => setStep('tier')}
                />
              </nav>
            </div>
          </main>

          <footer className="shrink-0 text-center">
            <p className="animate-fade-in text-[11px] text-zinc-400 [@media(max-height:600px)]:hidden" style={at(7)}>
              {placement?.ahead
                ? 'Fail it and nothing moves: you stay exactly where you are, and the circuit is explained'
                : 'Nothing here is permanent'}
            </p>
          </footer>
        </div>
      </MenuShell>
    );
  }

  // --------------------------------------------------------- step: concepts
  const toggle = (id) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <MenuShell pad="tight">
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.6rem,1.8vh,1.2rem)]">
        <header className="flex shrink-0 items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="widget-title animate-enter-up" style={at(0)}>
              Placement · tune
            </p>
            <h1
              className="animate-enter-up mt-1 font-semibold leading-[1.05] tracking-[-0.03em] text-zinc-900"
              style={{ fontSize: 'clamp(1.35rem, min(3vw, 5vh), 2.2rem)', ...at(0.6) }}
            >
              Tick what you already hold
            </h1>
          </div>
          <div className="animate-enter-up shrink-0 text-right" style={at(1.2)}>
            <div className="font-mono text-[13px] font-medium text-zinc-900">{ticked.size} selected</div>
            <div className="text-[11.5px] text-zinc-500">of {CONCEPTS.length}</div>
          </div>
        </header>

        {/* The only scrollable region in the whole menu system, and it is opt-in:
            a concept list is genuinely long, and hiding half of it would be worse. */}
        <div
          className="panel animate-enter-up min-h-0 flex-1 overflow-y-auto p-[clamp(0.8rem,1.6vw,1.4rem)]"
          style={at(1.8)}
        >
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {grouped.map(([domainId, concepts]) => (
              <section key={domainId}>
                <h2 className="widget-title mb-2">{DOMAINS[domainId] || domainId}</h2>
                <div className="space-y-1">
                  {concepts.map((concept) => {
                    const earned = masteryOf(mastery, concept.id) >= HOLD && !mastery[concept.id]?.self;
                    const on = ticked.has(concept.id) || earned;
                    return (
                      <button
                        key={concept.id}
                        onClick={() => !earned && toggle(concept.id)}
                        disabled={earned}
                        className={`flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left transition-colors ${
                          earned ? 'cursor-default opacity-60' : 'hover:bg-zinc-900/[0.05]'
                        }`}
                        title={concept.applies}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] transition-colors duration-200 ${
                            on ? 'bg-accent' : 'bg-zinc-900/[0.10]'
                          }`}
                        >
                          {on && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2.5 6.5L5 9l4.5-6"
                                stroke="rgb(var(--on-accent))"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-700">{concept.name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-zinc-400">L{concept.level}</span>
                        {earned && <span className="shrink-0 text-[10px] font-medium text-good">earned</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <footer className="animate-enter-up flex shrink-0 items-center gap-2" style={at(2.6)}>
          <button className="btn-primary h-11 rounded-control px-6 text-[14px]" onClick={() => finish([...ticked])}>
            Start designing
          </button>
          <button
            className="btn-quiet h-11 rounded-control px-5 text-[13px]"
            onClick={() => setTicked(new Set(CONCEPTS.map((c) => c.id)))}
          >
            Tick everything
          </button>
          <button className="btn-ghost h-11 rounded-control px-5 text-[13px]" onClick={() => setTicked(new Set())}>
            Clear
          </button>
          <span className="ml-auto max-w-[38ch] text-[11.5px] leading-relaxed text-zinc-500 [@media(max-height:620px)]:hidden">
            Anything you tick is provisional until a challenge proves it.
          </span>
        </footer>
      </div>
    </MenuShell>
  );
}

/**
 * What choosing this band actually does, said before the button that does it.
 *
 * Three outcomes, and the screen must not blur them:
 *
 *  - **Ahead.** There is material between here and there, so there is something
 *    to demonstrate. It names the circuit, so nobody agrees to an exam they have
 *    not been shown.
 *  - **Level.** The band is where they already are. No exam, no ceremony.
 *  - **Behind.** They have asked to go back, which is the only option here that
 *    destroys anything, so it says so in the plainest words available.
 */
function PlacementTerms({ placement, ticked, delay }) {
  if (!placement) return null;

  if (placement.behind) {
    return (
      <div
        className="animate-enter-up mt-[clamp(0.6rem,1.6vh,1.1rem)] w-full max-w-[38rem] rounded-control bg-warn/[0.10] px-4 py-3 text-left"
        style={delay}
      >
        <p className="text-[12.5px] font-medium text-zinc-900">This is behind where you are.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-700">
          Moving back to stage {placement.targetStage} gives up every unit you have finished from there on. Nothing
          asks you to do this: going over old ground is free from the Levels screen and costs you nothing.
        </p>
      </div>
    );
  }

  if (!placement.ahead) {
    return (
      <p
        className="animate-enter-up mt-[clamp(0.5rem,1.4vh,1rem)] max-w-[54ch] text-[12.5px] leading-relaxed text-zinc-500"
        style={delay}
      >
        That is where you already are, so there is nothing to skip. {ticked} concept{ticked === 1 ? '' : 's'} at or
        below it are treated as known when practice mode weights its projects.
      </p>
    );
  }

  return (
    <div
      className="animate-enter-up mt-[clamp(0.6rem,1.6vh,1.1rem)] w-full max-w-[38rem] rounded-control bg-zinc-900/[0.04] px-4 py-3.5 text-left"
      style={delay}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">One circuit stands in the way</p>
      <p className="mt-1.5 text-[14px] font-semibold tracking-[-0.015em] text-zinc-900">
        {unitTitle(placement.exam)}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600">
        The hardest thing you would be skipping over: the circuit stage {placement.exam.stage} ends its{' '}
        {placement.exam.blockName.toLowerCase()} block on. Draw it correctly and the{' '}
        <strong className="font-medium text-zinc-900">{placement.grants.length} units</strong> before stage{' '}
        {placement.targetStage} are signed off, and that is where you carry on from. Get it wrong and nothing moves.
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-500">
        Demonstrated rather than claimed, because a level you were simply given is a gap you find out about later.
      </p>
    </div>
  );
}

/** One numbered step in the explainer panel. */
function Explainer({ n, title, children }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-[0.15em] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-900/[0.06] font-mono text-[9px] text-zinc-500">
        {n}
      </span>
      <span>
        <span className="font-medium text-zinc-900">{title}</span> {children}
      </span>
    </li>
  );
}
