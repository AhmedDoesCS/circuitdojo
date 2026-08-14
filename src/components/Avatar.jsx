import React from 'react';

/**
 * The person, as a mark.
 *
 * There is no photograph here and there never will be: this app asks for an
 * email and a password and nothing else, and a file upload would mean a storage
 * bucket, a moderation problem and a way to be recognised by strangers, none of
 * which anybody asked for.
 *
 * What it offers instead is a mark drawn from the same vocabulary as the rest of
 * the app: a schematic symbol, in a colour, or your initials. That is more
 * personal than a default silhouette, entirely yours, and costs two short
 * strings to store and sync.
 */

/**
 * The marks on offer.
 *
 * Every one is a symbol from the library the learner is already drawing with,
 * reduced to a single stroke weight at avatar scale. Recognising your own mark
 * in the corner should feel like recognising a part on a sheet.
 */
export const AVATAR_SYMBOLS = {
  initials: { label: 'Your initials', path: null },
  resistor: {
    label: 'Resistor',
    path: 'M2 12 H5 L6.4 7.5 L9.2 16.5 L12 7.5 L14.8 16.5 L16.2 12 H22',
  },
  capacitor: { label: 'Capacitor', path: 'M2 12 H9.6 M9.6 5.5 V18.5 M14.4 5.5 V18.5 M14.4 12 H22' },
  inductor: {
    label: 'Inductor',
    path: 'M2 13.5 H5 A2.6 2.6 0 0 1 10.2 13.5 A2.6 2.6 0 0 1 15.4 13.5 A2.6 2.6 0 0 1 20.6 13.5 H22',
  },
  diode: { label: 'Diode', path: 'M2 12 H8 M8 6.5 V17.5 L16.5 12 Z M16.5 6.5 V17.5 M16.5 12 H22' },
  ground: { label: 'Ground', path: 'M12 3 V11 M4.5 11 H19.5 M7.5 15 H16.5 M10.5 19 H13.5' },
  wave: { label: 'Signal', path: 'M2 12 Q6.5 3 11 12 T20 12' },
  chip: {
    label: 'Chip',
    path: 'M6 6.5 H18 V17.5 H6 Z M2.5 9.5 H6 M2.5 14.5 H6 M18 9.5 H21.5 M18 14.5 H21.5',
  },
  bolt: { label: 'Spark', path: 'M13.5 2.5 L5.5 12.5 H11 L9.5 21.5 L18.5 10.5 H12.5 Z' },
  node: { label: 'Junction', path: 'M12 2.5 V21.5 M2.5 12 H21.5' },
};

/**
 * Six hues that all sit legibly on the app's surfaces, drawn from the accent
 * family rather than picked at random so a mark still belongs to the palette.
 */
export const AVATAR_COLOURS = {
  cobalt: { bg: 'rgb(0 113 227 / 0.14)', fg: 'rgb(0 90 190)', label: 'Cobalt' },
  forest: { bg: 'rgb(21 128 61 / 0.14)', fg: 'rgb(18 100 48)', label: 'Forest' },
  amber: { bg: 'rgb(180 83 9 / 0.15)', fg: 'rgb(150 68 8)', label: 'Amber' },
  maroon: { bg: 'rgb(139 26 26 / 0.13)', fg: 'rgb(139 26 26)', label: 'Maroon' },
  teal: { bg: 'rgb(13 110 110 / 0.14)', fg: 'rgb(11 92 92)', label: 'Teal' },
  violet: { bg: 'rgb(88 28 135 / 0.13)', fg: 'rgb(88 28 135)', label: 'Violet' },
};

const COLOUR_KEYS = Object.keys(AVATAR_COLOURS);

/** A stable default, so an account that has chosen nothing still looks like one. */
function defaultColour(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOUR_KEYS[hash % COLOUR_KEYS.length];
}

/** What to call this person: their chosen name, else the local part of the email. */
export function displayName(user, identity) {
  const chosen = identity?.name?.trim();
  if (chosen) return chosen;
  if (!user?.email) return 'Guest';
  return user.email.split('@')[0];
}

/**
 * Up to two letters. "ahmed.hasabu" gives AH rather than AD, because the
 * separator is a word boundary and initials taken across one read as a name.
 */
export function initialsFor(user, identity) {
  const name = displayName(user, identity);
  const words = name.split(/[.\-_+\s]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Avatar({ user, identity, size = 28, className = '' }) {
  const guest = !user && !identity?.name;
  const seed = user?.email || user?.id || identity?.name || '';
  const key = identity?.colour && AVATAR_COLOURS[identity.colour] ? identity.colour : defaultColour(seed);
  const hue = guest ? null : AVATAR_COLOURS[key];

  const symbol = identity?.symbol && AVATAR_SYMBOLS[identity.symbol];
  const drawn = symbol?.path;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${
        guest ? 'bg-zinc-900/[0.08] text-zinc-500' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        // Scales with the mark rather than being set per call site, so a 24px
        // avatar and a 64px one are the same drawing at two sizes.
        fontSize: Math.round(size * 0.4),
        letterSpacing: '-0.02em',
        ...(hue ? { background: hue.bg, color: hue.fg } : {}),
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
      ) : guest ? (
        'G'
      ) : (
        initialsFor(user, identity)
      )}
    </span>
  );
}
