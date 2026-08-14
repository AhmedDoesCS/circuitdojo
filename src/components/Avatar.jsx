import React, { useId } from 'react';
import {
  AVATAR_COLOURS,
  AVATAR_FRAMES,
  BENCH_CARDS,
  defaultColour,
  initialsFor,
  markFor,
} from '../lib/identity.js';

// Re-exported so a call site importing the mark and the model it is built from
// does not need two imports for one idea.
export * from '../lib/identity.js';

/**
 * The person, as a mark.
 *
 * There is no photograph here and there never will be: this app asks for an
 * email and a password and nothing else, and a file upload would mean a storage
 * bucket, a moderation problem and a way to be recognised by strangers, none of
 * which anybody asked for.
 *
 * What it offers instead is drawn from the same vocabulary as the rest of the
 * app: a schematic symbol, in a colour, on a plate, or your initials. Twenty-four
 * marks, twelve colours and three treatments is 864 distinct marks, all of them
 * legible at 24px, and the whole thing costs a handful of short strings to store
 * and sync.
 *
 * ## The rule about names
 *
 * The email address is never shown as a name. It used to be the fallback, so an
 * account belonging to a person called Ahmed was greeted as "ahmedqhasabu"
 * everywhere in the app: an address is a routing detail, not what somebody is
 * called, and using one as a name is the tell of a product that never bothered
 * to ask. Sign-up asks for a name, and where one is genuinely unknown the app
 * says "Designer" and offers a way to fix it.
 */

export default function Avatar({ user, identity, size = 28, className = '' }) {
  const seed = user?.email || user?.id || identity?.name || '';
  const key = identity?.colour && AVATAR_COLOURS[identity.colour] ? identity.colour : defaultColour(seed);
  const frame = AVATAR_FRAMES[identity?.frame] ? identity.frame : 'disc';
  const hue = `rgb(var(--av-${key}))`;

  const letters = identity?.symbol === 'initials' ? initialsFor(user, identity) : '';
  const drawn = letters ? null : markFor(identity);

  const plate =
    frame === 'solid'
      ? { background: hue, color: 'rgb(var(--panel))' }
      : frame === 'outline'
        ? { background: 'transparent', color: hue, boxShadow: `inset 0 0 0 1.5px ${hue}` }
        : { background: `rgb(var(--av-${key}) / 0.15)`, color: hue };

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${className}`}
      style={{
        width: size,
        height: size,
        // Scales with the mark rather than being set per call site, so a 24px
        // avatar and a 64px one are the same drawing at two sizes.
        fontSize: Math.round(size * 0.4),
        letterSpacing: '-0.02em',
        ...plate,
      }}
    >
      {drawn ? (
        <svg
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d={drawn}
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        letters || <span style={{ opacity: 0.55 }}>?</span>
      )}
    </span>
  );
}

/**
 * The backdrop, drawn flat in the schematic tokens so it follows the theme.
 *
 * `fixed inset-0` inside a `relative` parent, faint enough to be texture. Every
 * pattern is one `<pattern>` tiled across the box, so it costs the same at any
 * size and never needs to know how big the header is.
 */
export function BenchCardArt({ identity, className = '' }) {
  /**
   * The pattern id has to be unique per mount, not per kind.
   *
   * The picker shows all four backdrops at once and the header shows the chosen
   * one, so a fixed `bench-traces` appears twice in the document, and `url(#id)`
   * resolves to whichever came first. It renders correctly today only because
   * the two definitions happen to be identical.
   */
  const id = `bench-${useId()}`;
  const kind = BENCH_CARDS[identity?.card] ? identity.card : 'plain';
  if (kind === 'plain') return null;

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
      style={{ opacity: kind === 'pour' ? 0.14 : 0.2 }}
    >
      <defs>
        {kind === 'grid' && (
          <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.1" fill="var(--sch-wire)" />
          </pattern>
        )}
        {kind === 'pour' && (
          <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--sch-wire)" strokeWidth="1.2" />
          </pattern>
        )}
        {kind === 'traces' && (
          <pattern id={id} width="60" height="30" patternUnits="userSpaceOnUse">
            {/* Copper never turns a sharp corner: the etchant undercuts an acute
                angle. Mitred here for the same reason the ambient board is. */}
            <path
              d="M-6 8 H14 L22 16 H44 L52 8 H66 M-6 26 H6 L14 18 H30 L38 26 H66"
              fill="none"
              stroke="var(--sch-wire)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="22" cy="16" r="2.6" fill="none" stroke="var(--sch-wire)" strokeWidth="1.4" />
            <circle cx="38" cy="26" r="2.6" fill="none" stroke="var(--sch-wire)" strokeWidth="1.4" />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
