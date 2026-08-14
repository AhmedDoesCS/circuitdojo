/**
 * The identity model: everything a person can choose about how they appear.
 *
 * Plain data and pure functions, deliberately separate from the component that
 * draws it, so the invariants can be tested. Two of them matter enough to have
 * a test each: every mark must appear on exactly one shelf of the picker, or a
 * symbol exists that nobody can pick; and every colour must have a token
 * defined in both themes, or a mark chosen in daylight renders transparent
 * after dark.
 */

/**
 * The marks on offer.
 *
 * Every one is a symbol from the library the learner is already drawing with,
 * reduced to a single stroke weight at avatar scale. Recognising your own mark
 * in the corner should feel like recognising a part on a sheet.
 *
 * They are grouped the way the parts palette groups them, because twenty-four
 * unlabelled glyphs in one grid is a puzzle and four short shelves is a choice.
 */
export const AVATAR_SYMBOLS = {
  // -- yourself -------------------------------------------------------------
  initials: { label: 'Your initials', path: null },
  junction: { label: 'Junction', path: 'M12 2.5 V21.5 M2.5 12 H21.5' },
  bolt: { label: 'Spark', path: 'M13.5 2.5 L5.5 12.5 H11 L9.5 21.5 L18.5 10.5 H12.5 Z' },

  // -- passives -------------------------------------------------------------
  resistor: { label: 'Resistor', path: 'M2 12 H5 L6.4 7.5 L9.2 16.5 L12 7.5 L14.8 16.5 L16.2 12 H22' },
  capacitor: { label: 'Capacitor', path: 'M2 12 H9.6 M9.6 5.5 V18.5 M14.4 5.5 V18.5 M14.4 12 H22' },
  polcap: {
    label: 'Polarised capacitor',
    path: 'M2 12 H9.4 M9.4 5.5 V18.5 M15.6 12 H22 M14.2 6 A8.4 8.4 0 0 1 14.2 18',
  },
  inductor: {
    label: 'Inductor',
    path: 'M2 13.5 H5 A2.6 2.6 0 0 1 10.2 13.5 A2.6 2.6 0 0 1 15.4 13.5 A2.6 2.6 0 0 1 20.6 13.5 H22',
  },
  crystal: { label: 'Crystal', path: 'M2 12 H6.5 M6.5 6.5 V17.5 M17.5 6.5 V17.5 M17.5 12 H22 M9.5 8 H14.5 V16 H9.5 Z' },
  fuse: { label: 'Fuse', path: 'M2 12 H5.5 M18.5 12 H22 M5.5 8 H18.5 V16 H5.5 Z M5.5 12 H18.5' },

  // -- semiconductors -------------------------------------------------------
  diode: { label: 'Diode', path: 'M2 12 H8 M8 6.5 V17.5 L16.5 12 Z M16.5 6.5 V17.5 M16.5 12 H22' },
  led: {
    label: 'LED',
    path: 'M2 14 H7.5 M7.5 9 V19 L15.5 14 Z M15.5 9 V19 M15.5 14 H22 M11 7 L15.5 2.5 M15.5 2.5 H12.8 M15.5 2.5 V5.2 M15 6.4 L19.5 2 M19.5 2 H16.8 M19.5 2 V4.7',
  },
  zener: {
    label: 'Zener',
    path: 'M2 12 H8 M8 6.5 V17.5 L16.5 12 Z M13.6 6.5 H16.5 V17.5 H19.4 M16.5 12 H22',
  },
  transistor: {
    label: 'Transistor',
    path: 'M2 12 H8.5 M8.5 6 V18 M8.5 9.8 L16 4.5 M16 4.5 V1.5 M8.5 14.2 L16 19.5 M16 19.5 V22.5 M13.2 16.2 L16 19.5 L12.6 19.9',
  },
  opamp: { label: 'Op-amp', path: 'M6.5 3.5 L20 12 L6.5 20.5 Z M2 8 H6.5 M2 16 H6.5 M20 12 H22.5' },
  chip: { label: 'Chip', path: 'M6 6.5 H18 V17.5 H6 Z M2.5 9.5 H6 M2.5 14.5 H6 M18 9.5 H21.5 M18 14.5 H21.5' },

  // -- power and signal -----------------------------------------------------
  ground: { label: 'Ground', path: 'M12 3 V11 M4.5 11 H19.5 M7.5 15 H16.5 M10.5 19 H13.5' },
  supply: { label: 'Supply rail', path: 'M12 21.5 V6 M5.5 6 H18.5 M12 2 L8.5 6 M12 2 L15.5 6' },
  battery: { label: 'Battery', path: 'M2 12 H6.5 M6.5 5.5 V18.5 M10.5 8.5 V15.5 M14.5 5.5 V18.5 M18.5 8.5 V15.5 M18.5 12 H22' },
  switchsym: { label: 'Switch', path: 'M2 12 H7 M7 12 L16.4 6 M17.5 12 H22 M5.4 12 A1.6 1.6 0 1 0 8.6 12 A1.6 1.6 0 1 0 5.4 12 M15.9 12 A1.6 1.6 0 1 0 19.1 12 A1.6 1.6 0 1 0 15.9 12' },
  wave: { label: 'Sine', path: 'M2 12 Q6.5 3 11 12 T20 12' },
  clock: { label: 'Clock', path: 'M2 17 H7 V7 H12 V17 H17 V7 H22' },
  antenna: { label: 'Antenna', path: 'M12 21.5 V9 M3.5 3.5 L12 9 L20.5 3.5' },
  motor: {
    label: 'Motor',
    path: 'M12 3 A9 9 0 1 0 12.01 3 M8.4 15.5 V8.5 L12 13 L15.6 8.5 V15.5',
  },
  lamp: { label: 'Lamp', path: 'M12 3 A9 9 0 1 0 12.01 3 M5.6 5.6 L18.4 18.4 M18.4 5.6 L5.6 18.4' },
};

/** The shelves the picker lays the marks out on. */
export const AVATAR_GROUPS = [
  { name: 'Yourself', keys: ['initials', 'junction', 'bolt'] },
  { name: 'Passives', keys: ['resistor', 'capacitor', 'polcap', 'inductor', 'crystal', 'fuse'] },
  { name: 'Semiconductors', keys: ['diode', 'led', 'zener', 'transistor', 'opamp', 'chip'] },
  {
    name: 'Power and signal',
    keys: ['ground', 'supply', 'battery', 'switchsym', 'wave', 'clock', 'antenna', 'motor', 'lamp'],
  },
];

/**
 * Twelve hues, defined as properties in index.css so they re-solve per theme
 * rather than being one hardcoded set that goes muddy in the dark.
 *
 * The name is not decoration: twelve hues cannot all separate under dichromacy,
 * so the picker labels every swatch. Colour is the second channel here; the
 * mark is the first.
 */
export const AVATAR_COLOURS = {
  cobalt: 'Cobalt',
  indigo: 'Indigo',
  violet: 'Violet',
  rose: 'Rose',
  crimson: 'Crimson',
  copper: 'Copper',
  amber: 'Amber',
  moss: 'Moss',
  emerald: 'Emerald',
  teal: 'Teal',
  cyan: 'Cyan',
  slate: 'Slate',
};

const COLOUR_KEYS = Object.keys(AVATAR_COLOURS);

/**
 * How the mark is plated.
 *
 * Three treatments of one colour rather than three colours: the hue still says
 * who you are, and the plate says how loudly. `solid` knocks the mark out in the
 * panel's own colour, which is the one ink guaranteed to contrast with a filled
 * hue in either theme.
 */
export const AVATAR_FRAMES = {
  disc: { label: 'Disc', hint: 'A tinted plate' },
  solid: { label: 'Solid', hint: 'Filled, mark knocked out' },
  outline: { label: 'Outline', hint: 'Just a ring' },
};

/**
 * The backdrop behind the profile header.
 *
 * Four drawings from the same sheet the app is made of: nothing, the dot grid a
 * schematic is snapped to, a hatched copper pour, and 45-degree routing. It is
 * the one piece of customisation with room to be seen at any size, which is why
 * it exists: a 28px corner icon can only carry so much of a person.
 */
export const BENCH_CARDS = {
  plain: 'Plain',
  grid: 'Sheet grid',
  pour: 'Copper pour',
  traces: 'Routing',
};

/** A stable default, so an account that has chosen nothing still looks like one. */
export function defaultColour(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOUR_KEYS[hash % COLOUR_KEYS.length];
}

/** Has this person actually told us what to call them? */
export function hasName(identity) {
  return Boolean(identity?.name?.trim());
}

/**
 * What to call this person.
 *
 * Never the email address. An address is how a message is routed, not what
 * somebody is called, and an app that uses one as a name is telling you it never
 * asked. Sign-up asks; where a name is genuinely unknown this says "Designer"
 * and the app offers a way to fix it.
 */
export function displayName(user, identity) {
  const chosen = identity?.name?.trim();
  if (chosen) return chosen;
  return user ? 'Designer' : 'Guest';
}

/** How they would like to be referred to, if they said. */
export function pronounsOf(identity) {
  return identity?.pronouns?.trim() || '';
}

/** The preset list, plus room to type something that is not on it. */
export const PRONOUN_PRESETS = ['they/them', 'she/her', 'he/him'];

/**
 * Up to two letters. "Ahmed Hasabu" gives AH rather than AH-from-one-word,
 * because a separator is a word boundary and initials taken across one read as
 * a name.
 *
 * Empty when nobody has given a name: rather than stamping a placeholder's
 * initial on the plate, the avatar falls back to a drawn mark.
 */
export function initialsFor(user, identity) {
  if (!hasName(identity)) return '';
  const words = identity.name.trim().split(/[.\-_+\s]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

/** The mark actually drawn, resolving the "initials but no name yet" case. */
export function markFor(identity) {
  const chosen = identity?.symbol;
  if (chosen && chosen !== 'initials' && AVATAR_SYMBOLS[chosen]) return AVATAR_SYMBOLS[chosen].path;
  if (chosen === 'initials') return null; // letters, if there are any
  return AVATAR_SYMBOLS.junction.path; // never chosen anything: the wordmark's own glyph
}
