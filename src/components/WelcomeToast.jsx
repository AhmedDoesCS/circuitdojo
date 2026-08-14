import React, { useEffect, useState } from 'react';
import Avatar, { displayName } from './Avatar.jsx';

/**
 * "That worked", said once, on arriving back from the confirmation email.
 *
 * Without it, clicking a link in an email drops you onto a menu that looks
 * exactly like the one you left, with no indication that anything happened. The
 * only way to find out whether the account exists is to go and look for it,
 * which is a poor reward for having done what you were asked.
 *
 * A toast rather than a modal, because the learner was on their way somewhere
 * and this is confirmation, not an event. It leaves on its own.
 */
const LIFETIME_MS = 6000;

export default function WelcomeToast({ user, identity, onDone }) {
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
      <div className="panel panel-float pointer-events-auto flex max-w-md items-center gap-3 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-good/15 text-good">
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M4 9.4 L7.4 12.8 L14 5.6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-zinc-900">
            {user ? `You are all set, ${displayName(user, identity)}` : 'Email confirmed'}
          </p>
          <p className="truncate text-[12px] text-zinc-600">
            {user
              ? 'Your progress is saved to this account from now on.'
              : 'Sign in and your progress will follow you from here.'}
          </p>
        </div>
        {user && <Avatar user={user} identity={identity} size={30} className="ml-1" />}
        <button
          onClick={onDone}
          aria-label="Dismiss"
          className="ml-1 shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
