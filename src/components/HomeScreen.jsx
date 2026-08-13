import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MenuShell, { LogoMark, MenuOption, MenuSplit, at } from './MenuShell.jsx';
import { CONCEPTS } from '../challenges/concepts.js';
import { HOLD, LEVELS, masteryOf, claimedCount } from '../lib/level.js';

/**
 * Home screen: the main menu of a game, not the landing page of a website.
 *
 * Three areas, and every one of them is visible the moment the screen appears:
 *
 *   1. **The hero.** Name, one line of what this is, and a single dominant
 *      action that drops you straight into a challenge. One action, not six.
 *   2. **Secondary navigation**, stacked directly under that action and sharing
 *      its width: numbered, because a game menu numbers its options. These ran
 *      along the bottom of the whole screen at first, which put them under the
 *      save file too and read as two unrelated rows colliding. Inside the hero
 *      column they stay subordinate to the primary and the two columns balance.
 *   3. **The save file.** Level, progress and totals, parked to the side where
 *      a game keeps your profile.
 *
 * Plus a system button in the top-right for profile, settings and controls, so
 * the housekeeping does not compete with the thing you came here to do.
 *
 * ## Why this is a grid and not a stack
 *
 * The previous version put all six destinations in one vertical column of
 * oversized rows. That column could not fit a short window: at 1366×640 the
 * heading sat 48px above the top of the screen and the last row fell 37px below
 * the bottom, and because the shell is `overflow-hidden` there was no way to
 * reach either. Splitting the screen into header / body / footer bands, sizing
 * the body with `minmax(0, 1fr)`, and demoting five of the six destinations to
 * a compact strip means the content has to fit rather than happening to fit.
 *
 * Type scales are clamped against **both** axes: `min(5.4vw, 8.5vh)`, because
 * a wide, short window is the case that broke, and viewport-width clamps alone
 * cannot see it.
 */
export default function HomeScreen({
  onStart,
  onBrowse,
  onOpenMap,
  onResume,
  onCalibrate,
  onOpenProfile,
  hasSession,
  roadmap,
  level,
  mastery = {},
  solved = 0,
  recipeCount = 0,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  /**
   * The lead action. With a sheet in progress it is two actions sharing one
   * button: continue, and start something new, the latter behind a warning,
   * because it discards work the learner cannot get back.
   */
  const primary = useMemo(
    () =>
      hasSession
        ? {
            id: 'resume',
            label: 'Continue challenge',
            hint: 'Pick up the sheet you left open',
            onClick: onResume,
          }
        : {
            id: 'play',
            label: 'Start designing',
            hint: roadmap ? `Stage ${roadmap.stage} of ${roadmap.stageCount}: ${roadmap.blockName}` : '',
            onClick: onStart,
          },
    [hasSession, roadmap, onResume, onStart]
  );

  const startNew = useMemo(
    () => ({
      id: 'play',
      label: 'New challenge',
      hint: roadmap ? `Stage ${roadmap.stage}` : '',
      onClick: () => setConfirmNew(true),
    }),
    [roadmap]
  );

  const secondary = useMemo(
    () =>
      [
        {
          id: 'browse',
          label: 'Concepts',
          hint: 'Pick a specific circuit to practise',
          meta: `${recipeCount}`,
          onClick: onBrowse,
        },
        {
          id: 'map',
          label: 'The roadmap',
          hint: roadmap ? `Where you are in all ${roadmap.unitCount} units` : 'See the whole curriculum',
          meta: roadmap ? `${roadmap.unitsDone}` : undefined,
          onClick: onOpenMap,
        },
        {
          id: 'level',
          label: 'Set my level',
          hint: 'Skip ahead in one step',
          onClick: onCalibrate,
        },
      ].filter(Boolean),
    [recipeCount, roadmap, onBrowse, onOpenMap, onCalibrate]
  );

  // The split occupies two cursor stops, so the keyboard walk still reaches
  // both halves and the digit shortcuts stay in visual order.
  const lead = useMemo(() => (hasSession ? [primary, startNew] : [primary]), [hasSession, primary, startNew]);
  const actions = useMemo(() => [...lead, ...secondary], [lead, secondary]);

  const [cursor, setCursor] = useState(0);
  const refs = useRef([]);
  /**
   * Which device last moved the cursor.
   *
   * The highlight follows the mouse, but DOM focus must not: dragging the
   * pointer down the list was calling `focus()` on each option in turn, so the
   * focus ring flashed on and off all the way down. Focus is only moved when
   * the keyboard asked for it, which is the only time anyone needs to see it.
   */
  const byKeyboard = useRef(false);
  const hover = useCallback((index) => {
    byKeyboard.current = false;
    setCursor(index);
  }, []);

  useEffect(() => {
    if (cursor > actions.length - 1) setCursor(0);
  }, [actions.length, cursor]);

  // Keyboard driving. Arrows in any direction move along the flat list in
  // visual order, digits jump straight to an option, Enter commits, the
  // interaction model of a console menu rather than a page of links.
  useEffect(() => {
    const onKey = (event) => {
      if (menuOpen || confirmNew) return;
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (step) {
        event.preventDefault();
        byKeyboard.current = true;
        setCursor((c) => (c + step + actions.length) % actions.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        actions[cursor]?.onClick?.();
        return;
      }
      const digit = Number(event.key);
      if (digit >= 1 && digit <= actions.length) {
        event.preventDefault();
        byKeyboard.current = true;
        setCursor(digit - 1);
        actions[digit - 1]?.onClick?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, cursor, menuOpen, confirmNew]);

  useEffect(() => {
    if (menuOpen || confirmNew || !byKeyboard.current) return;
    refs.current[cursor]?.focus?.();
  }, [cursor, menuOpen, confirmNew]);

  const held = CONCEPTS.filter((c) => masteryOf(mastery, c.id) >= HOLD).length;
  const claimed = claimedCount(mastery);
  const band = LEVELS.find((b) => b.level === Math.min(LEVELS.length, level.level));

  return (
    <MenuShell>
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.9rem,2.6vh,2rem)]">
        {/* ---------------------------------------------------------- header */}
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="panel-pill animate-enter-up flex h-11 items-center gap-2.5 px-4" style={at(0)}>
            <LogoMark />
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">CircuitDojo</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Below lg the save file is hidden, so level still has a home. */}
            <div className="panel-pill animate-enter-up flex h-11 items-center gap-2 px-4 lg:hidden" style={at(0.5)}>
              <span className="text-[12.5px] font-semibold text-zinc-900">Lv {level.level}</span>
              <span className="font-mono text-[11px] text-zinc-500">{level.expertise}%</span>
            </div>
            <SystemMenu open={menuOpen} setOpen={setMenuOpen} onOpenProfile={onOpenProfile} />
          </div>
        </header>

        {/* ------------------------------------------------------------ body */}
        <main
          className="grid min-h-0 flex-1 content-center gap-x-[clamp(1.75rem,4vw,4.5rem)] gap-y-[clamp(1rem,2.5vh,2rem)]
            lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]"
        >
          {/* 1: hero, and 2, the secondary actions directly beneath it.
              These used to run along the bottom of the whole screen, which put
              them under the save file as well and read as one row colliding
              with another. Stacked under the primary they stay inside the
              hero's own column and its width, so the two columns balance. */}
          <section className="flex min-w-0 flex-col justify-center">
            <h1
              className="animate-intro-title font-semibold leading-[0.95] tracking-[-0.035em] text-zinc-900"
              style={{ fontSize: 'clamp(2rem, min(5.4vw, 8.5vh), 4.5rem)', ...at(1) }}
            >
              Design it
              <br />
              <span className="text-zinc-400">yourself.</span>
            </h1>

            <p
              className="animate-enter-up mt-[clamp(0.5rem,1.5vh,1.1rem)] max-w-[36ch] text-zinc-600 [@media(max-height:560px)]:hidden"
              style={{ fontSize: 'clamp(0.82rem, min(1.05vw, 2.1vh), 1rem)', ...at(1.5) }}
            >
              A blank sheet, a specification, and a checker that grades your circuit the way an engineer would.
            </p>

            <div className="mt-[clamp(0.8rem,2.4vh,1.7rem)] w-full max-w-[32rem]">
              {hasSession ? (
                <MenuSplit
                  delay={at(2.5)}
                  left={{
                    index: '1',
                    label: primary.label,
                    hint: primary.hint,
                    onClick: primary.onClick,
                    active: cursor === 0,
                    onHover: () => hover(0),
                    buttonRef: (el) => {
                      refs.current[0] = el;
                    },
                  }}
                  right={{
                    index: '2',
                    label: startNew.label,
                    hint: startNew.hint,
                    onClick: startNew.onClick,
                    active: cursor === 1,
                    onHover: () => hover(1),
                    buttonRef: (el) => {
                      refs.current[1] = el;
                    },
                  }}
                />
              ) : (
                <MenuOption
                  index="1"
                  emphasis="primary"
                  label={primary.label}
                  hint={primary.hint}
                  onClick={primary.onClick}
                  active={cursor === 0}
                  onHover={() => hover(0)}
                  delay={at(2.5)}
                  buttonRef={(el) => {
                    refs.current[0] = el;
                  }}
                />
              )}

              <div className="mt-2 flex flex-col gap-2">
                {secondary.map((item, i) => (
                  <MenuOption
                    key={item.id}
                    index={lead.length + i + 1}
                    label={item.label}
                    hint={item.hint}
                    meta={item.meta}
                    onClick={item.onClick}
                    active={cursor === lead.length + i}
                    onHover={() => hover(lead.length + i)}
                    delay={at(3.2 + i * 0.6)}
                    buttonRef={(el) => {
                      refs.current[lead.length + i] = el;
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* 3, the save file. Enters from the side, so the two columns do not
              arrive as one block: the eye gets the hero first, then the file. */}
          <aside className="hidden min-w-0 lg:flex lg:flex-col lg:justify-center">
            <div className="panel animate-enter-right p-[clamp(1rem,1.9vw,1.7rem)]" style={at(4)}>
              <div className="flex items-baseline gap-2">
                <span className="widget-title">Level {level.level}</span>
                <span className="font-mono text-[11px] text-zinc-400">of {level.count}</span>
              </div>
              <div
                className="mt-1 font-semibold tracking-[-0.02em] text-zinc-900"
                style={{ fontSize: 'clamp(1.05rem, min(1.7vw, 3vh), 1.45rem)' }}
              >
                {level.name}
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600 [@media(max-height:640px)]:hidden">
                {band?.blurb}
              </p>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-900/[0.08]">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700 ease-smooth"
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between text-[11.5px] text-zinc-500">
                <span>{level.expertise}% toward industry practice</span>
                <span className="font-mono">
                  {held}/{CONCEPTS.length}
                </span>
              </div>

              {claimed > 0 && (
                <p className="mt-3 rounded-control bg-warn/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-zinc-700 [@media(max-height:720px)]:hidden">
                  {claimed} concept{claimed === 1 ? '' : 's'} you told us you already know. The next challenge that uses
                  one will confirm it, or quietly hand it back.
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Solved" value={solved} delay={at(5)} />
              <Stat label="Level" value={level.level} delay={at(5.5)} />
              <Stat label="Recipes" value={recipeCount} delay={at(6)} />
            </div>
          </aside>
        </main>

        <footer className="shrink-0">
          <p
            className="animate-fade-in text-[11px] text-zinc-400 [@media(max-height:600px)]:hidden"
            style={at(8)}
          >
            ↑ ↓ ← → to move · Enter to select · 1-{actions.length} to jump
          </p>
        </footer>
      </div>

      {confirmNew && (
        <ConfirmNewChallenge
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false);
            onStart();
          }}
        />
      )}
    </MenuShell>
  );
}

/**
 * Starting a new challenge clears the open sheet, and there is no undo across
 * that boundary. The dialog says what is actually lost: the drawing, not the
 * profile, because "you will lose your progress" reads as "your account is
 * being reset" and is the kind of warning people learn to click through.
 */
function ConfirmNewChallenge({ onCancel, onConfirm }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <button
        className="absolute inset-0 animate-fade-in cursor-default bg-zinc-200/[0.94]"
        onClick={onCancel}
        aria-label="Cancel"
        tabIndex={-1}
      />
      <div className="panel animate-widget-in relative w-full max-w-md p-6">
        <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-zinc-900">
          Discard the sheet you have open?
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
          A new challenge starts from a blank sheet. The circuit you have drawn is cleared and cannot be
          brought back. Your level, solved count and concept progress are all kept.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-quiet px-4 py-2 text-[13px]" onClick={onCancel}>
            Keep my sheet
          </button>
          <button ref={confirmRef} className="btn-primary px-4 py-2 text-[13px]" onClick={onConfirm}>
            Start a new challenge
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Top-right system button. Everything that is housekeeping rather than play
 * lives behind it, which is what keeps the main menu down to one real choice.
 */
function SystemMenu({ open, setOpen, onOpenProfile }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, setOpen]);

  const items = [
    { tab: 'progress', label: 'Progress', hint: 'Skills, attempts and history' },
    { tab: 'settings', label: 'Settings', hint: 'Preferences for the app' },
    { tab: 'shortcuts', label: 'Controls', hint: 'KiCad-style keyboard shortcuts' },
    { tab: 'account', label: 'Account', hint: 'Sign in and sync progress' },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Profile, progress, settings and controls"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile and settings"
        style={at(1)}
        className={`panel-pill animate-enter-up flex h-11 w-11 items-center justify-center transition-all duration-200 ease-smooth
          active:scale-[0.96] ${open ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="6.2" r="2.9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M3.4 15.2a5.8 5.8 0 0111.2 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="panel animate-widget-in absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[17rem] p-1.5"
        >
          {items.map((item) => (
            <button
              key={item.tab}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenProfile(item.tab);
              }}
              className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors duration-200
                hover:bg-zinc-900/[0.05] focus:bg-zinc-900/[0.05] focus:outline-none"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-zinc-900">{item.label}</span>
                <span className="block truncate text-[11px] text-zinc-500">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, delay }) {
  return (
    <div className="panel animate-enter-right px-3 py-2.5 text-center" style={delay}>
      <div
        className="font-semibold tracking-[-0.02em] text-zinc-900"
        style={{ fontSize: 'clamp(1rem, min(1.6vw, 2.8vh), 1.35rem)' }}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{label}</div>
    </div>
  );
}
