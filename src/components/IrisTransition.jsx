import React, { useEffect, useRef, useState } from 'react';

/**
 * Iris wipe between challenges.
 *
 * The aperture closes over the whole screen, the new challenge is swapped in
 * while nothing is visible, then it opens again.
 *
 * Four things this component is careful about, because all four were bugs:
 *
 *  1. **It must actually animate.** The wipe is a keyframe animation, not a
 *     transition on a `clip-path: circle(var(--iris))`. A var-substituted value
 *     does not interpolate, so the transition version jumped straight to the end
 *     state and the wipe was invisible. An animation also starts on the frame the
 *     element first paints, which is why this version feels immediate.
 *  2. **It must not restart.** A `busy` ref keeps the sequence re-entrant-safe,
 *     so double-clicking "Next challenge" cannot overlap two wipes.
 *  3. **It must survive the swap.** The component is mounted once, above the
 *     view switch, so changing view at the midpoint cannot remount it and
 *     replay the close.
 *  4. **It must take precedence.** Top of the stacking order, and it swallows
 *     pointer and key input for its whole duration.
 *
 * Pacing: 700ms in, 140ms held, 560ms out. Slow enough to read as a deliberate
 * scene change, short enough that it never becomes the thing you are waiting for.
 *
 * The hold and the opening are deliberately tight. The incoming screen mounts at
 * the midpoint and starts its own entrance choreography, so every millisecond
 * the cover stays shut is choreography nobody sees. OPEN_MS is duplicated in
 * `.iris-opening` in index.css; change both.
 */

const CLOSE_MS = 700;
const HOLD_MS = 140;
const OPEN_MS = 560;

export default function IrisTransition({ run, onMidpoint, onComplete }) {
  const [phase, setPhase] = useState('closing'); // closing → covered → opening
  const busy = useRef(false);
  const timers = useRef([]);

  useEffect(() => {
    if (!run) return undefined;
    if (busy.current) return undefined; // already playing: ignore the re-trigger
    busy.current = true;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      onMidpoint?.();
      onComplete?.();
      busy.current = false;
      return undefined;
    }

    setPhase('closing');
    const at = (ms, fn) => timers.current.push(window.setTimeout(fn, ms));

    at(CLOSE_MS, () => {
      setPhase('covered');
      onMidpoint?.();
    });
    at(CLOSE_MS + HOLD_MS, () => setPhase('opening'));
    at(CLOSE_MS + HOLD_MS + OPEN_MS, () => {
      busy.current = false;
      onComplete?.();
    });

    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      busy.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // While the wipe plays, nothing else may receive keyboard input either.
  useEffect(() => {
    if (!run) return undefined;
    const swallow = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', swallow, true);
    return () => window.removeEventListener('keydown', swallow, true);
  }, [run]);

  if (!run) return null;

  return (
    <div className={`iris iris-${phase}`} aria-hidden="true">
      <div
        className={`flex h-full w-full items-center justify-center transition-all duration-300 ease-smooth ${
          phase === 'covered' ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <svg width="52" height="52" viewBox="0 0 18 18" fill="none">
          <path
            d="M1.5 12.5h3.5V6h4v6.5h3.5"
            stroke="var(--sch-wire)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="6" r="2.1" fill="var(--sch-body)" />
        </svg>
      </div>
    </div>
  );
}
