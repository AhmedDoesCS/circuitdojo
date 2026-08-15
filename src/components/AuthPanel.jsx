import React, { useEffect, useState } from 'react';
import Avatar, { displayName } from './Avatar.jsx';

/**
 * Signing in, wherever it happens.
 *
 * One component for the first-run offer, the profile panel and anywhere else,
 * because an account form that looks different depending on where you found it
 * makes the same act feel like two different commitments.
 *
 * It states what an account is *for* before asking for anything. The honest
 * answer here is narrow: your progress follows you to another machine. It is
 * not a social network, there is nothing to share, and pretending otherwise to
 * pad the value would be the sort of thing that makes people not sign up.
 */
export default function AuthPanel({ profile, onDone, compact = false }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Seeded from whatever this browser already calls them, so a guest who has
  // named themselves is not asked a second time.
  const [name, setName] = useState(() => profile.identity?.name || '');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [resent, setResent] = useState(false);
  /**
   * Which fields the person has actually finished with.
   *
   * Validation shown before somebody has typed anything is an accusation. Each
   * rule only speaks once its field has been left, or once the form has been
   * submitted, which is the same rule every serious sign-up form follows.
   */
  const [touched, setTouched] = useState({});
  const [capsLock, setCapsLock] = useState(false);
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const { user, supabaseEnabled, authError, busy, pendingEmail } = profile;

  /**
   * A failure belongs to the attempt that caused it, not to the panel.
   *
   * The error lives in the profile so every mount of this form can show it, and
   * that meant opening the account tab an hour later greeted you with a
   * connection error from a previous session.
   */
  const { clearAuthError } = profile;
  useEffect(() => {
    clearAuthError?.();
  }, [clearAuthError]);

  // ---------------------------------------------------------------- signed in
  if (user) {
    return (
      <div className={compact ? '' : 'mx-auto max-w-sm'}>
        <div className="flex items-center gap-3 rounded-control bg-zinc-900/[0.04] p-4">
          <Avatar user={user} identity={profile.identity} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-zinc-900">{displayName(user, profile.identity)}</p>
            <p className="truncate text-[12px] text-zinc-500">{user.email}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-good">
          <SyncedIcon />
          Progress is saved to this account
        </p>
        <button className="btn-quiet mt-3 w-full" onClick={profile.signOut} disabled={busy}>
          Sign out
        </button>
      </div>
    );
  }

  // ------------------------------------------------------- not set up at all
  if (!supabaseEnabled) {
    return (
      <div className={`rounded-control bg-zinc-900/[0.04] p-4 ${compact ? '' : 'mx-auto max-w-sm'}`}>
        <p className="text-[13px] font-medium text-zinc-900">Accounts are not switched on here</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600">
          Everything works, and your progress is saved in this browser. Back it up from the Progress tab so a
          cleared cache cannot take it.
        </p>
      </div>
    );
  }

  /**
   * Account made, link not clicked yet.
   *
   * This used to be a sentence beginning "If your project requires email
   * confirmation", which asks a learner to know how the deployment was set up
   * and reads like a note the developer forgot to delete. The app knows the
   * answer: Supabase returned a user and no session, so the email went out.
   */
  if (pendingEmail) {
    return (
      <div className={compact ? '' : 'mx-auto max-w-sm text-center'}>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/12 text-accent">
          <MailIcon />
        </div>
        <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-zinc-900">Check your email</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
          We sent a link to <span className="font-medium text-zinc-900">{pendingEmail}</span>. Click it to finish
          setting up your account, then come back.
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
          Nothing is lost while you wait: carry on where you left off and sign in whenever you like.
        </p>

        <div className="mt-5 space-y-2">
          <button
            className="btn-quiet w-full"
            disabled={busy || resent}
            onClick={async () => {
              const { ok } = await profile.resendConfirmation(pendingEmail);
              if (ok) setResent(true);
            }}
          >
            {resent ? 'Sent again' : 'Send it again'}
          </button>
          <button
            className="btn-ghost w-full text-[12.5px]"
            onClick={() => {
              profile.clearPending();
              setMode('signin');
            }}
          >
            Use a different email
          </button>
        </div>
        {authError && <p className="mt-3 text-[12px] text-bad">{authError}</p>}
      </div>
    );
  }

  // ------------------------------------------------------------- the form
  const signup = mode === 'signup';
  const rules = passwordRules(password);
  const strong = rules.every((r) => r.ok);
  const emailLooksReal = EMAIL.test(email.trim());
  const matches = password.length > 0 && password === confirm;
  /**
   * Everything that has to be true before the button does anything.
   *
   * Checked here rather than left to the server, because the round trip for
   * "password should be at least 6 characters" costs a second and comes back as
   * a sentence written by somebody else's API.
   */
  const ready = signup ? Boolean(name.trim()) && emailLooksReal && strong && matches : Boolean(email && password);

  const submit = async (event) => {
    event.preventDefault();
    if (signup && !ready) {
      setTouched({ name: true, email: true, password: true, confirm: true });
      return;
    }
    const result = signup
      ? await profile.signUp(email.trim(), password, { name })
      : await profile.signIn(email.trim(), password);
    setPassword('');
    setConfirm('');
    // A pending confirmation is not a finish: the panel switches to telling
    // them to go and read their email, and the caller stays where it is.
    if (!result.error && !result.pending) onDone?.();
  };

  return (
    <form className={compact ? 'space-y-3' : 'mx-auto max-w-sm space-y-3'} onSubmit={submit}>
      {!compact && (
        <p className="text-[13px] leading-relaxed text-zinc-600">
          {mode === 'signup'
            ? 'An account keeps your place in the roadmap and everything you have solved, on every machine you sign in from.'
            : 'Welcome back.'}
        </p>
      )}

      {/* Asked first, and asked at all, because the alternative is calling
          somebody by the left half of their email address for the rest of the
          time they use the app. One field, before the credentials, so it reads
          as an introduction rather than as another thing to fill in. */}
      {signup && (
        <Field label="What should we call you?" error={touched.name && !name.trim() ? 'Tell us a name to use.' : null}>
          <input
            className="field w-full"
            type="text"
            autoComplete="nickname"
            maxLength={32}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => touch('name')}
          />
        </Field>
      )}

      <Field
        label="Email"
        error={signup && touched.email && email && !emailLooksReal ? 'That does not look like an email address.' : null}
      >
        <input
          className="field w-full"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            profile.clearAuthError?.();
          }}
          onBlur={() => touch('email')}
          required
        />
      </Field>

      <Field label="Password">
        <div className="relative">
          <input
            className="field w-full pr-16"
            type={show ? 'text' : 'password'}
            autoComplete={signup ? 'new-password' : 'current-password'}
            placeholder={signup ? 'at least 8 characters' : 'your password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              profile.clearAuthError?.();
            }}
            onBlur={() => touch('password')}
            // Caps lock is the single commonest cause of "my password is
            // right and it will not let me in", and the field hides the
            // evidence by design.
            onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') || false)}
            required
          />
          {/* Typing a password you cannot see, into a field that will reject it
              for a rule you were told once, is a bad enough experience on a
              phone that every serious sign-up form now offers this. */}
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control px-2 py-1 text-[11.5px] font-medium text-zinc-500 hover:text-zinc-900"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </Field>

      {capsLock && (
        <p className="-mt-1 flex items-center gap-1.5 text-[11.5px] text-warn">
          <AlertIcon />
          Caps lock is on.
        </p>
      )}

      {/* The requirements, live, rather than a rejection after the fact. Shown
          only while it matters: once every rule is met the list collapses to a
          single line instead of sitting there being satisfied at you. */}
      {signup && password.length > 0 && (
        <div className="rounded-control bg-zinc-900/[0.04] px-3 py-2">
          {strong ? (
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-good">
              <TickIcon />
              Strong enough.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-[11px] ${rule.ok ? 'text-good' : 'text-zinc-500'}`}
                >
                  {rule.ok ? <TickIcon /> : <DotIcon />}
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {signup && (
        <Field
          label="Confirm password"
          error={touched.confirm && confirm && !matches ? 'The two passwords do not match.' : null}
        >
          <input
            className="field w-full"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="type it again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => touch('confirm')}
            required
          />
        </Field>
      )}

      {authError && (
        <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-bad">
          <AlertIcon />
          <span>{authError}</span>
        </p>
      )}

      {/* Disabled rather than allowed-and-rejected: everything it is waiting on
          is on screen and already marked, so a dead button is never a mystery. */}
      <button className="btn-primary w-full" disabled={busy || (signup && !ready)}>
        {busy ? 'Just a moment...' : signup ? 'Create account' : 'Sign in'}
      </button>

      <button
        type="button"
        className="btn-ghost w-full text-[12.5px]"
        onClick={() => {
          setMode(signup ? 'signin' : 'signup');
          setTouched({});
          setConfirm('');
          profile.clearAuthError?.();
        }}
      >
        {signup ? 'Already have an account? Sign in' : 'No account yet? Create one'}
      </button>
    </form>
  );
}

/**
 * Deliberately stricter than Supabase's own six-character floor.
 *
 * Not a character-class obstacle course: length is what actually resists a
 * guess, and rules demanding a symbol mostly produce "Password1!". Eight
 * characters, something that is not a letter, and a check against the handful
 * of strings that turn up at the top of every breach list.
 */
const COMMON = ['password', '12345678', 'qwerty', 'letmein', 'iloveyou', 'admin123', 'circuitdojo', '11111111'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function passwordRules(password) {
  const lower = password.toLowerCase();
  return [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'A letter', ok: /[a-z]/i.test(password) },
    { label: 'A number or symbol', ok: /[^a-z]/i.test(password) },
    { label: 'Not a common password', ok: password.length > 0 && !COMMON.some((c) => lower.includes(c)) },
  ];
}

/** A labelled field with room for one message underneath it. */
function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-zinc-500">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11.5px] text-bad">{error}</span>}
    </label>
  );
}

function TickIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M2.5 6.4 L4.8 8.7 L9.5 3.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotIcon() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900/20" aria-hidden="true" />;
}

function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 7 L12 13 L20.2 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SyncedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.4 7.2 L6.2 9 L9.6 5.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="mt-[2px] shrink-0">
      <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4.2 V7.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="9.8" r="0.8" fill="currentColor" />
    </svg>
  );
}
