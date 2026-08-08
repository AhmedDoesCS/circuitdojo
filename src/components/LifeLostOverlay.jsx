import React, { useEffect } from 'react';
import { HEART } from './LivesMeter.jsx';

/**
 * One life, lost, full screen.
 *
 * This plays *before* the results panel rather than alongside it. A failed
 * check produces two separate pieces of news: you spent an attempt, and here
 * is what is wrong, and delivering both in the same frame means the first one
 * is never read. Serialising them costs a second and makes the cost of the
 * attempt land before the diagnosis does.
 *
 * It is deliberately short and has no controls. Anything dismissable here is a
 * thing to click past on the way to the feedback, and it would be clicked past
 * every time.
 *
 * The heart is the same routed path as the meter in the dock, at ten times the
 * size, breaking the same way, so the big moment and the small counter are
 * unmistakably the same object.
 */

const BREAK_MS = 720; // .life-lost
const FALL_MS = 420; // .life-fall, which starts at 620ms
export const LIFE_LOST_MS = 1180;

export default function LifeLostOverlay({ remaining, total = 3, onDone }) {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // Reduced motion still needs the beat, just not the movement.
    const wait = reduced ? 260 : LIFE_LOST_MS;
    const timer = window.setTimeout(() => onDone?.(), wait);
    return () => window.clearTimeout(timer);
  }, [onDone, reduced]);

  const out = remaining === 0;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center overflow-hidden"
      role="alert"
      aria-live="assertive"
    >
      <div className="absolute inset-0 animate-fade-in bg-zinc-200/[0.92]" />

      <div className="relative flex flex-col items-center">
        <div className={reduced ? '' : 'life-fall'}>
          <svg
            width="132"
            height="121"
            viewBox="0 0 24 22"
            fill="none"
            aria-hidden="true"
            className={reduced ? '' : 'life-lost'}
          >
            <path d={HEART} fill="rgb(var(--bad))" fillOpacity="0.22" className={reduced ? '' : 'life-drain'} />
            <path
              d={HEART}
              stroke="rgb(var(--bad))"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="7.2" cy="7.2" r="1.5" fill="rgb(var(--bad))" fillOpacity="0.9" />
            <circle cx="16.8" cy="7.2" r="1.5" fill="rgb(var(--bad))" fillOpacity="0.9" />

            {/* The arc across the break, at the instant it opens. */}
            {!reduced && (
              <g className="life-arc" stroke="rgb(var(--warn))" strokeWidth="1.3" strokeLinecap="round">
                <path d="M10.6 19 L12 16.4 L13.4 19" fill="none" />
                <path d="M8.6 21.4 L10.2 18.2M15.4 21.4 L13.8 18.2" />
              </g>
            )}
          </svg>
        </div>

        <p
          className="animate-rise-in mt-1 text-[22px] font-semibold tracking-[-0.02em] text-zinc-900"
          style={{ animationDelay: '0.24s' }}
        >
          {out ? 'Out of attempts' : 'Attempt spent'}
        </p>
        <p
          className="animate-rise-in mt-1 font-mono text-[12px] uppercase tracking-[0.14em] text-zinc-500"
          style={{ animationDelay: '0.34s' }}
        >
          {out ? 'Showing the reference' : `${remaining} of ${total} left`}
        </p>
      </div>
    </div>
  );
}

export { BREAK_MS, FALL_MS };
