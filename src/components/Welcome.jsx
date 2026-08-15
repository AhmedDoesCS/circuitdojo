import React, { useState } from 'react';
import MenuShell, { LogoMark, at } from './MenuShell.jsx';
import AuthPanel from './AuthPanel.jsx';

/**
 * The front door.
 *
 * ## Why this exists
 *
 * The first screen anybody saw used to be the placement picker: six sentences
 * about your own experience, asked before you had been told what the thing in
 * front of you was. That is a form standing where an introduction should be. It
 * also meant the account offer arrived two screens later, after somebody had
 * already put work in, which is a worse moment to ask, not a better one.
 *
 * So: what this is, who it is for, and one decision. Placement comes next,
 * because "where should we start you" is a fair question once you know what you
 * are being started on.
 *
 * ## Why guest is a button and not a link in the corner
 *
 * Guest is a real way to use this. Everything works, nothing is withheld, and
 * the only thing an account buys is that the work survives this browser. A
 * product that says that plainly gets more sign-ups than one that buries the
 * alternative, and it is the truth either way.
 */
export default function Welcome({ profile, onGuest, onAuthed }) {
  const [mode, setMode] = useState('intro'); // intro → auth

  return (
    <MenuShell>
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.8rem,2.2vh,1.6rem)]">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="panel-pill animate-enter-up flex h-11 items-center gap-2.5 px-4" style={at(0)}>
            <LogoMark />
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">CircuitDojo</span>
          </div>
          {mode === 'auth' && (
            <button
              className="btn-ghost animate-enter-up text-[12px]"
              style={at(0.4)}
              onClick={() => {
                setMode('intro');
                profile.clearAuthError?.();
              }}
            >
              Back
            </button>
          )}
        </header>

        {/* items-center, and both columns capped: nothing here may be taller
            than the row it sits in, or it draws over the header. */}
        <main
          className="grid min-h-0 flex-1 items-center gap-x-[clamp(1.75rem,4vw,4.5rem)] gap-y-[clamp(1rem,2.5vh,2rem)]
            lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
        >
          <section className="flex max-h-full min-h-0 min-w-0 flex-col justify-center">
            <p className="widget-title animate-enter-up shrink-0" style={at(1)}>
              Practice electronics design
            </p>

            <h1
              className="animate-intro-title mt-2 shrink-0 font-semibold leading-[0.95] tracking-[-0.035em] text-zinc-900"
              style={{ fontSize: 'clamp(1.9rem, min(5vw, 7.4vh), 4rem)', ...at(1.5) }}
            >
              Design it
              <br />
              <span className="text-zinc-400">yourself.</span>
            </h1>

            {/* The motto, then the one sentence that says what actually
                happens here. Everything else about the product is a
                consequence of that sentence. */}
            <p
              className="animate-enter-up mt-[clamp(0.5rem,1.5vh,1.1rem)] max-w-[52ch] shrink-0 leading-relaxed text-zinc-600"
              style={{ fontSize: 'clamp(0.85rem, min(1.1vw, 2vh), 1.02rem)', ...at(2.1) }}
            >
              Not videos, not multiple choice. Every challenge is a blank schematic sheet and a specification: you
              place real symbols, wire real nets, and a checker grades the circuit the way an engineer would.
            </p>

            <ul className="animate-enter-up mt-[clamp(0.7rem,2vh,1.4rem)] min-h-0 space-y-2 overflow-y-auto" style={at(2.7)}>
              <Point n="137">units across twelve stages, from one closed loop to designing for production</Point>
              <Point n="59">industry-accurate symbols on a real grid-snapped editor</Point>
              <Point n="36">circuits to draw, each graded on the netlist, the rules and the brief</Point>
            </ul>
          </section>

          <section className="flex max-h-full min-h-0 min-w-0 flex-col justify-center">
            <div className="panel animate-enter-right min-h-0 overflow-y-auto p-[clamp(1.1rem,2vw,1.7rem)]" style={at(2)}>
              {mode === 'auth' ? (
                <AuthPanel profile={profile} compact onDone={onAuthed} />
              ) : (
                <>
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-zinc-900">Get started</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600">
                    {profile.supabaseEnabled
                      ? 'An account keeps your place in the roadmap and everything you have solved, on every machine you sign in from.'
                      : 'Accounts are not switched on for this deployment. Everything works; your progress is saved in this browser.'}
                  </p>

                  <div className="mt-4 space-y-2">
                    {profile.supabaseEnabled && (
                      <>
                        <button
                          className="btn-primary w-full py-3 text-[14px]"
                          onClick={() => setMode('auth')}
                        >
                          Create an account
                        </button>
                        <button className="btn-quiet w-full py-3 text-[13.5px]" onClick={() => setMode('auth')}>
                          I already have one
                        </button>
                        <div className="flex items-center gap-3 py-1">
                          <span className="h-px flex-1 bg-zinc-950/10" />
                          <span className="text-[10.5px] uppercase tracking-[0.1em] text-zinc-400">or</span>
                          <span className="h-px flex-1 bg-zinc-950/10" />
                        </div>
                      </>
                    )}
                    <button
                      className={`w-full py-3 text-[13.5px] ${profile.supabaseEnabled ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={onGuest}
                    >
                      Continue as a guest
                    </button>
                  </div>

                  <p className="mt-3 text-center text-[11.5px] leading-relaxed text-zinc-500">
                    {profile.supabaseEnabled
                      ? 'Guest works completely. Nothing is withheld, and you can create an account later without losing anything you have done.'
                      : 'Back your profile up from the Progress tab so a cleared cache cannot take it.'}
                  </p>
                </>
              )}
            </div>
          </section>
        </main>

        <footer className="shrink-0">
          <p className="animate-fade-in text-[11px] text-zinc-400 [@media(max-height:600px)]:hidden" style={at(6)}>
            A name, an email and a password. Nothing else is asked for and nothing is shared.
          </p>
        </footer>
      </div>
    </MenuShell>
  );
}

/** One figure and what it counts. The number carries; the line explains. */
function Point({ n, children }) {
  return (
    <li className="flex items-baseline gap-3 text-[12.5px] leading-relaxed text-zinc-600">
      <span className="w-[2.6rem] shrink-0 text-right font-mono text-[15px] font-semibold tabular-nums text-zinc-900">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
