import React from 'react';

/**
 * The person, as a mark.
 *
 * There is no photo to show and there never will be: this app asks for an email
 * and a password and nothing else. So the mark is built from the address, which
 * means it is stable, needs no upload, and is recognisably *yours* the moment
 * you sign in on a machine you have never used.
 *
 * A guest gets the same treatment in neutral grey rather than a different
 * shape, because guest mode is a real way to use this and should not look like
 * an empty slot waiting to be filled.
 */

/**
 * Six hues that all sit legibly against the app's surfaces, chosen from the
 * accent family rather than at random so a signed-in avatar still belongs to
 * the palette. Picked by a hash of the address, so the same person is the same
 * colour on every device.
 */
const HUES = [
  { bg: 'rgb(0 113 227 / 0.14)', fg: 'rgb(0 90 190)' },
  { bg: 'rgb(21 128 61 / 0.14)', fg: 'rgb(18 100 48)' },
  { bg: 'rgb(180 83 9 / 0.15)', fg: 'rgb(150 68 8)' },
  { bg: 'rgb(139 26 26 / 0.13)', fg: 'rgb(139 26 26)' },
  { bg: 'rgb(13 110 110 / 0.14)', fg: 'rgb(11 92 92)' },
  { bg: 'rgb(88 28 135 / 0.13)', fg: 'rgb(88 28 135)' },
];

function hueFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[hash % HUES.length];
}

/** The part of an email address a person thinks of as their name. */
export function displayName(user) {
  if (!user?.email) return 'Guest';
  return user.email.split('@')[0];
}

/**
 * Up to two letters. "ahmed.hasabu" gives AH rather than AD, because the
 * separator is a word boundary and initials taken across one read as a name.
 */
export function initialsFor(user) {
  const name = displayName(user);
  const words = name.split(/[.\-_+\s]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Avatar({ user, size = 28, className = '' }) {
  const guest = !user;
  const hue = guest ? null : hueFor(user.email || user.id || '');
  const text = guest ? 'G' : initialsFor(user);

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
      {text}
    </span>
  );
}
