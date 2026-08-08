import React, { useEffect, useRef, useState } from 'react';
import MenuShell, { LogoMark, at } from './MenuShell.jsx';
import { TOPICS } from '../challenges/index.js';
import { LEVELS } from '../lib/level.js';

/**
 * The challenge brief, as a full-screen title card.
 *
 * ## One axis, not two
 *
 * This screen used to be a two-column split: title and goal on the left,
 * requirements on the right. That is the layout of a documentation page, and it
 * forces the eye to start over halfway through: you read a heading, then jump
 * sideways to find out what it actually asks for.
 *
 * A mission briefing in a game runs top to bottom on a single centred axis, and
 * that is what this is now: classification, then title, then the objective,
 * then the numbered requirements, then how to start. Each element is a band on
 * one spine, so there is exactly one reading order and no second column
 * competing for the entry point.
 *
 * Things carrying the game-brief feel, all of them structural rather than
 * decorative:
 *
 *  - **A rule-flanked classification line** above the title, centred, the
 *    level and topic read as a mission tag rather than as metadata chips.
 *  - **Numbered objectives.** `01 02 03` in mono, in a single narrow panel.
 *    Games number objectives; numbering also gives the eye a left edge to run
 *    down, which centred text otherwise lacks.
 *  - **A HUD strip** of given formulas along the bottom of the card.
 *  - **Edge-hugging chrome.** The shell runs on its `tight` safe area, so the
 *    frame comes in close and the margin around the centred column does the
 *    breathing instead.
 *
 * ## Rules it still obeys
 *
 *  - **Nothing moves.** The viewport is locked and every size is clamped
 *    against both axes, so the brief *fits* rather than scrolls. A brief you
 *    have to scroll is a document; this is a title card.
 *  - **It waits for you.** No timer. Click, Enter, Space or Esc dismisses it.
 *  - **It is introductive, not instructional.** Goal, requirements and the
 *    formulas you are given, never a list of steps, because working out the
 *    topology is the exercise.
 *
 * If a brief carries more requirements than the panel can hold, the overflow is
 * summarised as a count and the full list stays in the brief widget,
 * deliberately preferred over a scrollbar.
 */

const MAX_SPEC_LINES = 6;
const MAX_FORMULAS = 3;

export default function ChallengeIntro({ challenge, onDone, onTooEasy }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (reduced) {
      onDone();
      return;
    }
    setLeaving(true);
    setTimeout(onDone, 420);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (['Escape', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  const band = LEVELS.find((l) => l.level === challenge.level);
  const spec = challenge.brief.spec || [];
  const shownSpec = spec.slice(0, MAX_SPEC_LINES);
  const hiddenSpec = spec.length - shownSpec.length;
  const formulas = (challenge.theory || []).flatMap((t) => (t.formulas || []).map((f) => ({ ...f, from: t.name })));
  const shownFormulas = formulas.slice(0, MAX_FORMULAS);

  return (
    <div
      className={`fixed inset-0 z-[60] cursor-pointer ${leaving ? 'animate-intro-out' : 'animate-fade-in'}`}
      onClick={finish}
      role="button"
      tabIndex={0}
      aria-label="Challenge brief, click to continue"
    >
      <MenuShell className="!z-0" pad="tight">
        <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.6rem,1.8vh,1.4rem)]">
          {/* Chrome hugs the edges; the brief itself stays on the centre line. */}
          <header className="flex shrink-0 items-center justify-between gap-3">
            <div className="panel-pill animate-enter-up flex h-10 items-center gap-2.5 px-3.5" style={at(0)}>
              <LogoMark size={17} />
              <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-zinc-900">New challenge</span>
            </div>
            {onTooEasy && (
              <button
                className="panel-pill animate-enter-up h-10 px-3.5 text-[12px] font-medium text-zinc-700 transition-transform duration-200 ease-smooth hover:scale-[1.02]"
                style={at(0.5)}
                onClick={(e) => {
                  e.stopPropagation();
                  onTooEasy();
                }}
                title="Claim this level and jump to a harder challenge"
              >
                Too easy, go harder
              </button>
            )}
          </header>

          {/* ------------------------------------------------------- the spine */}
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <div className="flex w-full max-w-[52rem] min-w-0 flex-col items-center">
              {/* Classification line: rule: level · topic: rule */}
              <div
                className="animate-enter-up flex w-full items-center justify-center gap-3 text-zinc-500"
                style={at(1)}
              >
                <span className="h-px max-w-[6rem] flex-1 bg-zinc-900/15" />
                <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-zinc-600">
                    LEVEL {String(challenge.level).padStart(2, '0')}
                  </span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-[11px] uppercase tracking-[0.14em]">
                    {TOPICS[challenge.topic] || challenge.topic}
                  </span>
                </span>
                <span className="h-px max-w-[6rem] flex-1 bg-zinc-900/15" />
              </div>

              <h1
                className="animate-intro-title mt-[clamp(0.4rem,1.2vh,0.9rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-zinc-900"
                style={{ fontSize: 'clamp(1.6rem, min(4.4vw, 7vh), 3.4rem)', ...at(1.6) }}
              >
                {challenge.title}
              </h1>

              {band && (
                <p
                  className="animate-enter-up mt-[clamp(0.25rem,0.7vh,0.5rem)] text-[11.5px] text-zinc-500 [@media(max-height:620px)]:hidden"
                  style={at(2.4)}
                >
                  {band.name}
                </p>
              )}

              <p
                className="animate-enter-up mt-[clamp(0.5rem,1.4vh,1rem)] max-w-[52ch] leading-relaxed text-zinc-700"
                style={{ fontSize: 'clamp(0.88rem, min(1.25vw, 2.3vh), 1.12rem)', ...at(3) }}
              >
                {challenge.brief.goal}
              </p>

              {challenge.brief.notes && (
                <p
                  className="animate-enter-up mt-[clamp(0.4rem,1.1vh,0.8rem)] max-w-[56ch] italic leading-relaxed text-zinc-600 [@media(max-height:700px)]:hidden"
                  style={{ fontSize: 'clamp(0.75rem, min(0.95vw, 1.8vh), 0.9rem)', ...at(3.8) }}
                >
                  {challenge.brief.notes}
                </p>
              )}

              {/* Objectives. Centred as a block, left-aligned inside: centred
                  body text is unreadable past a couple of words, and the numbers
                  give the eye the left edge the centring takes away. */}
              <div
                className="panel animate-enter-up mt-[clamp(0.7rem,2vh,1.5rem)] w-full max-w-[42rem] p-[clamp(0.8rem,1.6vw,1.4rem)] text-left"
                style={at(4.6)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="widget-title">Objectives</h2>
                  <span className="font-mono text-[10.5px] text-zinc-400">
                    {String(shownSpec.length).padStart(2, '0')}
                    {hiddenSpec > 0 ? `+${hiddenSpec}` : ''}
                  </span>
                </div>

                <ol className="mt-2 space-y-[clamp(0.25rem,0.7vh,0.5rem)]">
                  {shownSpec.map((line, i) => (
                    <li
                      key={i}
                      className="flex animate-intro-line items-baseline gap-3 leading-snug text-zinc-700"
                      style={{ fontSize: 'clamp(0.74rem, min(0.98vw, 1.9vh), 0.9rem)', ...at(5.6 + i * 0.7) }}
                    >
                      {/* zinc-500, not 400: these numbers are the left edge the
                          eye runs down, so they have to be legible, not faint. */}
                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-zinc-500">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="line-clamp-2 min-w-0">{line}</span>
                    </li>
                  ))}
                </ol>

                {hiddenSpec > 0 && (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    + {hiddenSpec} more, listed in the brief panel once you start.
                  </p>
                )}

                {/* HUD strip: the maths you are handed, along the bottom edge. */}
                {shownFormulas.length > 0 && (
                  <div className="mt-[clamp(0.5rem,1.3vh,0.9rem)] flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-900/10 pt-[clamp(0.45rem,1.1vh,0.8rem)] [@media(max-height:600px)]:hidden">
                    <span className="widget-title shrink-0">Given</span>
                    {shownFormulas.map((f, i) => (
                      <span
                        key={i}
                        className="truncate font-mono text-zinc-800"
                        style={{ fontSize: 'clamp(0.7rem, min(0.9vw, 1.7vh), 0.82rem)' }}
                        title={f.note}
                      >
                        {f.expr}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {challenge.firmware && (
                <p
                  className="animate-fade-in mt-[clamp(0.4rem,1vh,0.7rem)] max-w-[52ch] rounded-control bg-warn/[0.10] px-3 py-2 text-[11px] leading-relaxed text-zinc-700 [@media(max-height:660px)]:hidden"
                  style={at(9.5)}
                >
                  This one comes with a firmware contract: the software's behaviour is a hardware requirement. Check
                  the Firmware tab.
                </p>
              )}
            </div>
          </main>

          <footer className="shrink-0 text-center">
            <p
              className="animate-fade-in inline-flex items-center gap-2 text-[11.5px] text-zinc-500"
              style={at(11)}
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
              Click anywhere, or press Enter, to start drawing
            </p>
          </footer>
        </div>
      </MenuShell>
    </div>
  );
}
