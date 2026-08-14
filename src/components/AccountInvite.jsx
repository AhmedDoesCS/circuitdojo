import React, { useState } from 'react';
import MenuShell, { LogoMark, at } from './MenuShell.jsx';
import AuthPanel from './AuthPanel.jsx';

/**
 * The account offer, made once, at the moment it first means something.
 *
 * Placed immediately after placement, because that is the first point at which
 * the learner has anything to lose: they have just told the app where they are
 * starting from, and the next screen is a challenge. Asked before that, an
 * account is a form standing between someone and a product they have not seen.
 *
 * Guest is presented as a choice rather than a way out. It is a real way to use
 * this: everything works, nothing is withheld, and the only thing an account
 * adds is that the work survives this browser. Saying exactly that, and no
 * more, is more persuasive than a list of benefits that do not exist.
 */
export default function AccountInvite({ profile, onSkip, onDone }) {
  const [showForm, setShowForm] = useState(false);

  // Rendered only where accounts exist; the caller skips this step entirely
  // otherwise, so there is no sign-up here that could not work.
  if (!profile.supabaseEnabled) return null;

  return (
    <MenuShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="panel-pill animate-enter-up flex h-11 items-center gap-2.5 px-4" style={at(0)}>
            <LogoMark />
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">CircuitDojo</span>
          </div>
          <span className="chip animate-enter-up bg-zinc-900/[0.06] text-zinc-500" style={at(0)}>
            Step 2 of 2
          </span>
        </header>

        <main className="grid min-h-0 flex-1 content-center gap-x-[clamp(1.75rem,4vw,4.5rem)] gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <section className="min-w-0">
            <p className="animate-enter-up text-[11px] uppercase tracking-[0.14em] text-zinc-400" style={at(1)}>
              Before you start
            </p>
            <h1
              className="animate-enter-up mt-2 text-[min(5.4vw,8.5vh)] font-semibold leading-[1.03] tracking-[-0.03em] text-zinc-900"
              style={at(1.4)}
            >
              Keep your work,
              <br />
              wherever you are.
            </h1>
            <p
              className="animate-enter-up mt-4 max-w-md text-[14px] leading-relaxed text-zinc-600"
              style={at(1.9)}
            >
              Everything below works either way. An account exists for one reason: your place in the roadmap and
              everything you have solved follow you to any machine you sign in from, instead of living in this one
              browser.
            </p>

            <ul className="animate-enter-up mt-6 space-y-2.5" style={at(2.3)}>
              <Point>Your position in all 137 units, kept.</Point>
              <Point>Sign in on a laptop and carry on from a phone.</Point>
              <Point>Survives clearing your browser, or losing the machine.</Point>
            </ul>

            <p className="animate-fade-in mt-6 text-[11.5px] text-zinc-400" style={at(3)}>
              A name, an email and a password. Nothing else is asked for and nothing is shared.
            </p>
          </section>

          <section className="min-w-0">
            <div className="panel animate-enter-right p-[clamp(1.1rem,2vw,1.7rem)]" style={at(2)}>
              {showForm ? (
                <AuthPanel profile={profile} compact onDone={onDone} />
              ) : (
                <div className="space-y-2.5">
                  <button className="btn-primary w-full py-3 text-[14px]" onClick={() => setShowForm(true)}>
                    Create an account
                  </button>
                  <button className="btn-quiet w-full py-3 text-[13.5px]" onClick={onSkip}>
                    Continue as a guest
                  </button>
                  <p className="pt-1 text-center text-[11.5px] leading-relaxed text-zinc-500">
                    You can create one later from the profile menu, and everything you have done so far comes with
                    you.
                  </p>
                </div>
              )}
            </div>

            {showForm && (
              <button className="btn-ghost mt-2 w-full text-[12.5px]" onClick={onSkip}>
                Not now, continue as a guest
              </button>
            )}
          </section>
        </main>
      </div>
    </MenuShell>
  );
}

function Point({ children }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-relaxed text-zinc-700">
      <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-good/15 text-good">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 5.2 L4 7.2 L8 2.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </li>
  );
}
