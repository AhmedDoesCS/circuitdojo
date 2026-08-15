import React, { useEffect, useState } from 'react';

/**
 * Something happened that has no screen of its own.
 *
 * A toast rather than a modal, because the learner was on their way somewhere
 * and these are confirmations, not events. It leaves on its own.
 *
 * The refused placement is the case this exists for. A placement that fails
 * changes nothing by design, and "nothing changed" is indistinguishable from
 * "the app ignored you" unless somebody says which it was.
 */
const LIFETIME_MS = 7000;

const TONE = {
  good: 'bg-good/15 text-good',
  warn: 'bg-warn/15 text-warn',
};

export default function Toast({ title, body, tone = 'good', onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), LIFETIME_MS);
    const done = setTimeout(onDone, LIFETIME_MS + 400);
    return () => {
      clearTimeout(out);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-6 transition-all duration-300 ease-smooth ${
        leaving ? 'translate-y-3 opacity-0' : 'animate-rise-in'
      }`}
      role="status"
    >
      <div className="panel panel-float pointer-events-auto flex max-w-md items-start gap-3 px-4 py-3">
        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${TONE[tone] || TONE.good}`}>
          {tone === 'warn' ? <AlertGlyph /> : <TickGlyph />}
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-zinc-900">{title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-600">{body}</p>
        </div>
        <button
          onClick={onDone}
          aria-label="Dismiss"
          className="ml-1 mt-0.5 shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TickGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 9.4 L7.4 12.8 L14 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 5.4 V9.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="12.6" r="1" fill="currentColor" />
    </svg>
  );
}
