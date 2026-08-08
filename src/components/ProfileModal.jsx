import React, { useEffect, useRef, useState } from 'react';
import { CONCEPTS, DOMAINS } from '../challenges/concepts.js';
import { LEVELS, HOLD, masteryOf } from '../lib/level.js';
import { totalSolved } from '../lib/progress.js';
import { SHORTCUT_GROUPS } from '../lib/shortcuts.js';
import { supabaseStatus } from '../lib/supabase.js';
import { localStore } from '../lib/storage.js';
import { THEMES, ACCENTS, resolveTheme } from '../lib/theme.js';
import { RECIPE_COUNT } from '../challenges/index.js';
import { CloseIcon } from './Widget.jsx';

/**
 * Profile: level, skills, settings, shortcuts and account.
 *
 * The shortcut sheet lives here rather than on the canvas: discoverable when
 * wanted, invisible while working.
 */
export default function ProfileModal({ open, onClose, profile, initialTab = 'progress', onRecalibrate }) {
  const [tab, setTab] = useState(initialTab);

  // The component stays mounted and renders null when closed, so useState's
  // initial value would stick forever. Re-sync on every open instead, or the
  // "?" shortcut would land on whichever tab was opened first.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);

  if (!open) return null;

  const { user, mastery, level, progress, attempts, settings, setSettings, supabaseEnabled, authError, busy } =
    profile;

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    const action = mode === 'signin' ? profile.signIn : profile.signUp;
    const { error } = await action(email, password);
    if (!error) {
      setMessage(
        mode === 'signup'
          ? 'Account created. If your project requires email confirmation, check your inbox before signing in.'
          : 'Signed in.'
      );
      setPassword('');
    }
  };

  const tabs = [
    { id: 'progress', label: 'Progress' },
    { id: 'settings', label: 'Settings' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'account', label: 'Account' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-zinc-900/25 p-6"
      onClick={onClose}
    >
      <div
        className="panel max-h-full w-full max-w-3xl animate-widget-in overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-950/10 surface-2 px-5 py-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">Your profile</h2>
          <div className="ml-2 flex rounded-control bg-zinc-900/[0.05] p-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-chip px-3 py-1 text-[12px] font-medium transition-all duration-200 ease-smooth ${
                  tab === t.id ? 'surface-solid text-accent shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button className="icon-btn ml-auto" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="p-5">
          {tab === 'progress' && (
            <ProgressTab mastery={mastery} level={level} progress={progress} attempts={attempts} />
          )}
          {tab === 'settings' && (
            <SettingsTab settings={settings} setSettings={setSettings} onRecalibrate={onRecalibrate} />
          )}
          {tab === 'shortcuts' && <ShortcutsTab />}
          {tab === 'account' && (
            <AccountTab
              user={user}
              supabaseEnabled={supabaseEnabled}
              mode={mode}
              setMode={setMode}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              submit={submit}
              authError={authError}
              message={message}
              busy={busy}
              onSignOut={profile.signOut}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressTab({ mastery, level, progress, attempts }) {
  const held = CONCEPTS.filter((c) => masteryOf(mastery, c.id) >= HOLD).length;

  return (
    <div className="space-y-6">
      <section className="rounded-control bg-zinc-900/[0.04] p-4">
        <div className="flex items-baseline gap-2">
          <span className="widget-title">Level {level.level}</span>
          <span className="text-[15px] font-semibold text-zinc-900">{level.name}</span>
          <span className="ml-auto text-[12px] text-zinc-500">{level.expertise}% toward industry practice</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">{level.blurb}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-900/[0.08]">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700 ease-smooth"
            style={{ width: `${Math.round(level.progress * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-zinc-600">
          <span>{held} of {CONCEPTS.length} concepts held</span>
          <span className="text-zinc-300">·</span>
          <span>{totalSolved(progress)} challenges solved</span>
          <span className="text-zinc-300">·</span>
          <span>{RECIPE_COUNT} recipes in the library</span>
        </div>
      </section>

      <section>
        <h3 className="widget-title mb-2">Skills</h3>
        <div className="space-y-4">
          {Object.entries(DOMAINS).map(([domainId, domainName]) => {
            const concepts = CONCEPTS.filter((c) => c.domain === domainId);
            if (!concepts.length) return null;
            return (
              <div key={domainId}>
                <p className="mb-1.5 text-[12px] font-medium text-zinc-700">{domainName}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {concepts.map((c) => {
                    const value = masteryOf(mastery, c.id);
                    return (
                      <div key={c.id} className="flex items-center gap-2" title={c.applies}>
                        <span className="w-4 shrink-0 text-[10px] text-zinc-400">L{c.level}</span>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">{c.name}</span>
                        <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-900/[0.08]">
                          <span
                            className={`block h-full rounded-full transition-all duration-500 ${
                              value >= HOLD ? 'bg-good' : value > 0 ? 'bg-warn' : 'bg-transparent'
                            }`}
                            style={{ width: `${Math.round(value * 100)}%` }}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="widget-title mb-2">Levels</h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {LEVELS.map((band) => (
            <div
              key={band.level}
              className={`rounded-control px-3 py-2 ${
                band.level === level.level ? 'bg-accent text-on-accent' : 'bg-zinc-900/[0.04]'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-[11px] ${band.level === level.level ? 'text-on-accent/70' : 'text-zinc-500'}`}>
                  L{band.level}
                </span>
                <span className="text-[12.5px] font-medium">{band.name}</span>
              </div>
              <p className={`mt-0.5 text-[11px] leading-relaxed ${band.level === level.level ? 'text-on-accent/70' : 'text-zinc-500'}`}>
                {band.blurb}
              </p>
            </div>
          ))}
        </div>
      </section>

      {attempts.length > 0 && (
        <section>
          <h3 className="widget-title mb-1.5">Recent attempts</h3>
          <ul className="space-y-1">
            {attempts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-[12.5px]">
                <span className={a.passed ? 'text-good' : 'text-bad'}>{a.passed ? '✓' : '✕'}</span>
                <span className="truncate text-zinc-700">{a.title || a.templateId}</span>
                <span className="ml-auto shrink-0 text-zinc-400">
                  {new Date(a.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Appearance: theme and accent, the two axes described in lib/theme.js.
 *
 * Both apply the instant they are chosen, no save button, no preview pane.
 * The theme buttons carry a miniature of the thing they produce (a ground, a
 * pane of panel, a wire) so the choice is legible before you make it.
 */
function Appearance({ settings, setSettings }) {
  const dark = resolveTheme(settings.theme) === 'dark';

  return (
    <div className="rounded-control bg-zinc-900/[0.04] px-4 py-3.5">
      <span className="widget-title">Appearance</span>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const active = settings.theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSettings({ theme: t.id })}
              title={t.blurb}
              aria-pressed={active}
              className={`group rounded-control border p-2 text-left transition-all duration-200 ease-smooth active:scale-[0.98] ${
                active ? 'border-accent/60 bg-accent/[0.08]' : 'border-zinc-950/10 hover:bg-zinc-900/[0.04]'
              }`}
            >
              <ThemeSwatch id={t.id} />
              <span
                className={`mt-1.5 block text-[12px] font-medium ${active ? 'text-zinc-900' : 'text-zinc-600'}`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[12px] text-zinc-600">Accent</span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {ACCENTS.map((a) => {
            const active = (settings.accent || 'graphite') === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSettings({ accent: a.id })}
                title={a.label}
                aria-label={a.label}
                aria-pressed={active}
                className={`h-6 w-6 rounded-full border transition-all duration-200 ease-smooth active:scale-90 ${
                  active ? 'border-zinc-900 ring-2 ring-zinc-900/25' : 'border-zinc-950/10 hover:scale-110'
                }`}
                style={{ backgroundColor: dark ? a.darkSwatch : a.swatch }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A three-line miniature of a theme: ground, panel pane, wire. */
function ThemeSwatch({ id }) {
  const system = id === 'system';
  const paint = (variant) => (
    <span
      className="relative block h-8 flex-1 overflow-hidden rounded-[5px] border border-zinc-950/10"
      style={{ backgroundColor: variant === 'dark' ? '#14161a' : '#e4e4e7' }}
    >
      <span
        className="absolute left-1 right-1 top-1 block h-2.5 rounded-[3px]"
        style={{
          backgroundColor: variant === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)',
        }}
      />
      <span
        className="absolute bottom-1.5 left-1 block h-[2px] w-4 rounded-full"
        style={{ backgroundColor: variant === 'dark' ? '#3ecf7d' : '#0f7a3d' }}
      />
    </span>
  );

  return (
    <span className="flex gap-1">
      {system ? (
        <>
          {paint('light')}
          {paint('dark')}
        </>
      ) : (
        paint(id)
      )}
    </span>
  );
}

function SettingsTab({ settings, setSettings, onRecalibrate }) {
  const rows = [
    {
      key: 'throwbacks',
      title: 'Occasional throwbacks',
      body: 'Sometimes draw a challenge below your level so the fundamentals keep being re-applied, instead of being left behind.',
    },
    {
      key: 'introAnimation',
      title: 'Full-screen brief',
      body: 'Show the brief as a full-screen moment when a challenge starts. It waits for you to dismiss it.',
    },
    {
      key: 'hints',
      title: 'Guided hints',
      body: 'After a failed check, offer escalating hints: where to look, the principle, then the fix.',
    },
  ];

  return (
    <div className="space-y-2">
      <Appearance settings={settings} setSettings={setSettings} />

      {onRecalibrate && (
        <button
          onClick={onRecalibrate}
          className="flex w-full items-start gap-3 rounded-control bg-zinc-900/[0.06] px-4 py-3 text-left transition-colors hover:bg-zinc-900/[0.09]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium text-zinc-900">Set my level again</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-zinc-600">
              Placed too low or too high? Re-place yourself in one click, or tick concepts individually. Earned
              mastery is never overwritten.
            </span>
          </span>
          <span className="mt-1 shrink-0 text-zinc-400">→</span>
        </button>
      )}

      {rows.map((row) => (
        <button
          key={row.key}
          onClick={() => setSettings({ [row.key]: !settings[row.key] })}
          className="flex w-full items-start gap-3 rounded-control bg-zinc-900/[0.04] px-4 py-3 text-left transition-colors hover:bg-zinc-900/[0.06]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium text-zinc-900">{row.title}</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-zinc-600">{row.body}</span>
          </span>
          <span
            className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
              settings[row.key] ? 'bg-accent' : 'bg-zinc-900/20'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full surface-solid shadow transition-transform duration-200 ease-smooth ${
                settings[row.key] ? 'translate-x-4' : ''
              }`}
            />
          </span>
        </button>
      ))}
    </div>
  );
}

function ShortcutsTab() {
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] leading-relaxed text-zinc-600">
        The bindings follow KiCad's schematic editor, so the mouse is optional: place with <Kbd>A</Kbd> and{' '}
        <Kbd>P</Kbd>, wire with <Kbd>W</Kbd>, move with <Kbd>M</Kbd>, and edit values with <Kbd>V</Kbd>.
      </p>
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.group}>
          <h3 className="widget-title mb-2">{group.group}</h3>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {group.items.map((item) => (
              <div key={`${group.group}-${item.label}`} className="flex items-baseline gap-2 py-0.5">
                <span className="flex shrink-0 gap-1">
                  {item.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
                <span className="text-[12px] leading-relaxed text-zinc-600">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Download / restore the whole profile as a file.
 *
 * Guest progress lives in localStorage, which is scoped to an origin and can be
 * cleared by the browser at any time. Until an account exists, this is the only
 * thing standing between a learner and starting over, so it is one click, with
 * no account and no network.
 */
function ProfileBackup() {
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  const download = () => {
    const blob = new Blob([JSON.stringify(localStore.exportProfile(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuitdojo-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ ok: true, text: 'Profile downloaded.' });
  };

  const restore = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = localStore.importProfile(JSON.parse(await file.text()));
      setStatus({ ok: result.ok, text: result.ok ? 'Profile restored: reloading...' : result.error });
      // A full reload is the honest way to re-seed every hook from storage.
      if (result.ok) setTimeout(() => window.location.reload(), 700);
    } catch {
      setStatus({ ok: false, text: 'That file could not be read as JSON.' });
    }
  };

  return (
    <div className="rounded-control bg-zinc-900/[0.04] p-4">
      <p className="widget-title">Back up this profile</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600">
        Browser storage is tied to this exact address and can be cleared without warning. Keep a copy of your level,
        mastery and attempt history as a file.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary px-4 py-2 text-[13px]" onClick={download}>
          Download profile
        </button>
        <button className="btn-quiet px-4 py-2 text-[13px]" onClick={() => fileRef.current?.click()}>
          Restore from file
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={restore} />
      </div>
      {status && (
        <p className={`mt-2.5 text-[11.5px] ${status.ok ? 'text-good' : 'text-bad'}`}>{status.text}</p>
      )}
    </div>
  );
}

function AccountTab({
  user,
  supabaseEnabled,
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  submit,
  authError,
  message,
  busy,
  onSignOut,
}) {
  if (!supabaseEnabled) {
    return (
      <div className="space-y-2">
        <div className="rounded-control bg-zinc-900/[0.04] p-4">
          <p className="text-[12.5px] leading-relaxed text-zinc-700">
            Running in guest mode. Progress is saved in this browser only.
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-500">{supabaseStatus}</p>
        </div>
        <ProfileBackup />
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-sm rounded-control bg-zinc-900/[0.04] p-4">
        <p className="text-[12px] text-zinc-500">Signed in as</p>
        <p className="truncate text-[13.5px] font-medium text-zinc-900">{user.email}</p>
        <button className="btn-quiet mt-3 w-full" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form className="max-w-sm space-y-2" onSubmit={submit}>
      <p className="text-[12.5px] leading-relaxed text-zinc-600">
        You are playing as a guest: everything works. Create an account to keep progress across devices; what you
        have already done comes with you.
      </p>
      <input
        className="field"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="field"
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
        required
      />
      <button className="btn-primary w-full" disabled={busy}>
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button"
        className="btn-ghost w-full text-[12px]"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
      </button>
      {authError && <p className="text-[12px] text-bad">{authError}</p>}
      {message && <p className="text-[12px] text-good">{message}</p>}
    </form>
  );
}

function Kbd({ children }) {
  return (
    <kbd className="rounded-md border border-zinc-950/10 surface-2 px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-zinc-700 shadow-sm">
      {children}
    </kbd>
  );
}
