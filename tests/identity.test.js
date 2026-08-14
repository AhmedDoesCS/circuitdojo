import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AVATAR_SYMBOLS,
  AVATAR_GROUPS,
  AVATAR_COLOURS,
  AVATAR_FRAMES,
  BENCH_CARDS,
  PRONOUN_PRESETS,
  defaultColour,
  displayName,
  hasName,
  initialsFor,
  markFor,
  pronounsOf,
} from '../src/lib/identity.js';

const CSS = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

/**
 * The rule this whole feature exists for.
 *
 * An email address is how a message is routed, not what somebody is called.
 * It was the fallback once, which meant a person called Ahmed was addressed as
 * "ahmedqhasabu" in the corner of every screen.
 */
test('a name is never derived from an email address', () => {
  const user = { email: 'ahmedqhasabu@gmail.com', id: 'u1' };

  for (const identity of [null, {}, { name: '' }, { name: '   ' }, { bio: 'hello' }]) {
    const shown = displayName(user, identity);
    assert.ok(!shown.includes('@'), `"${shown}" leaked an address`);
    assert.ok(
      !shown.toLowerCase().includes('ahmedqhasabu'),
      `"${shown}" is the local part of the address`
    );
    assert.equal(shown, 'Designer');
  }

  assert.equal(displayName(null, null), 'Guest', 'a guest is a guest, not an empty string');
  assert.equal(displayName(user, { name: '  Ahmed  ' }), 'Ahmed', 'a chosen name wins, trimmed');
});

test('initials come from the chosen name or from nothing at all', () => {
  const user = { email: 'ahmedqhasabu@gmail.com' };
  assert.equal(initialsFor(user, { name: 'Ahmed Hasabu' }), 'AH');
  assert.equal(initialsFor(user, { name: 'ahmed.hasabu' }), 'AH', 'a separator is a word boundary');
  assert.equal(initialsFor(user, { name: 'Ahmed' }), 'AH', 'one word gives its first two letters');
  // Not "AH" from the address: with no name there are no initials, and the
  // avatar draws a symbol instead of stamping a letter nobody chose.
  assert.equal(initialsFor(user, null), '');
  assert.equal(initialsFor(user, { name: '  ' }), '');
});

test('hasName and pronounsOf ignore whitespace', () => {
  assert.equal(hasName({ name: '  ' }), false);
  assert.equal(hasName({ name: ' A ' }), true);
  assert.equal(hasName(null), false);
  assert.equal(pronounsOf({ pronouns: '  they/them ' }), 'they/them');
  assert.equal(pronounsOf({}), '');
});

/**
 * A mark that is not on a shelf is a mark nobody can pick, and a shelf naming a
 * mark that does not exist is a hole in the picker. Both are invisible in
 * review and obvious in use.
 */
test('every mark appears on exactly one shelf of the picker', () => {
  const shelved = AVATAR_GROUPS.flatMap((g) => g.keys);
  assert.equal(new Set(shelved).size, shelved.length, 'a mark is on two shelves');

  for (const key of shelved) {
    assert.ok(AVATAR_SYMBOLS[key], `the picker offers "${key}", which is not a mark`);
  }
  for (const key of Object.keys(AVATAR_SYMBOLS)) {
    assert.ok(shelved.includes(key), `"${key}" exists but no shelf offers it`);
  }
});

test('every mark is drawn inside the box it is drawn in', () => {
  for (const [key, symbol] of Object.entries(AVATAR_SYMBOLS)) {
    if (key === 'initials') {
      assert.equal(symbol.path, null, 'initials are letters, not a path');
      continue;
    }
    assert.ok(symbol.label, `${key} has no label, so its tooltip would be empty`);
    assert.match(symbol.path, /^M/, `${key} does not start with a move`);

    // Every number in the path is a coordinate or a radius; nothing legitimate
    // in a 24x24 glyph reaches beyond a small margin either side.
    const numbers = symbol.path.match(/-?\d+(\.\d+)?/g).map(Number);
    for (const n of numbers) {
      assert.ok(n >= -7 && n <= 25, `${key} has ${n} in it, which is outside the 24x24 box`);
    }
  }
});

/**
 * A colour with no token renders transparent, and a colour with a token in only
 * one theme goes invisible the moment the app changes theme. That is exactly
 * the bug the first version of this shipped with.
 */
test('every colour has a token in both themes', () => {
  const light = CSS.slice(CSS.indexOf(':root {'), CSS.indexOf("[data-theme='dark']"));
  const dark = CSS.slice(CSS.indexOf("[data-theme='dark']"), CSS.indexOf('/* ---'.padEnd(6), CSS.indexOf("[data-theme='dark']")));

  for (const key of Object.keys(AVATAR_COLOURS)) {
    assert.match(light, new RegExp(`--av-${key}:\\s*\\d+ \\d+ \\d+;`), `--av-${key} missing in light`);
    assert.match(dark, new RegExp(`--av-${key}:\\s*\\d+ \\d+ \\d+;`), `--av-${key} missing in dark`);
  }
});

/**
 * Twelve hues cannot all separate under colour blindness, so the picker labels
 * every swatch instead of pretending they can. The label is load-bearing.
 */
test('every colour, frame and card is named', () => {
  for (const [key, label] of Object.entries(AVATAR_COLOURS)) {
    assert.ok(typeof label === 'string' && label.length, `${key} has no name to show`);
  }
  for (const [key, frame] of Object.entries(AVATAR_FRAMES)) {
    assert.ok(frame.label && frame.hint, `frame ${key} is missing its label or hint`);
  }
  for (const [key, label] of Object.entries(BENCH_CARDS)) {
    assert.ok(typeof label === 'string' && label.length, `card ${key} has no name`);
  }
  assert.ok(BENCH_CARDS.plain, 'there must be a way to have no backdrop at all');
});

test('an account that has chosen nothing still looks like an account', () => {
  const keys = Object.keys(AVATAR_COLOURS);
  for (const seed of ['', 'a@b.co', 'ahmedqhasabu@gmail.com', 'x']) {
    assert.ok(keys.includes(defaultColour(seed)), `${seed} picked a colour that does not exist`);
  }
  assert.equal(defaultColour('same'), defaultColour('same'), 'the default must be stable');

  // Nobody has chosen a mark: it falls back to a drawn one rather than to a
  // blank plate or a letter taken from an address.
  assert.equal(markFor(null), AVATAR_SYMBOLS.junction.path);
  assert.equal(markFor({ symbol: 'nonexistent' }), AVATAR_SYMBOLS.junction.path);
  assert.equal(markFor({ symbol: 'initials' }), null);
  assert.equal(markFor({ symbol: 'resistor' }), AVATAR_SYMBOLS.resistor.path);
});

test('the pronoun presets are a starting point, not a closed list', () => {
  assert.ok(PRONOUN_PRESETS.includes('they/them'));
  assert.ok(PRONOUN_PRESETS.length >= 3);
  // Anything typed is kept verbatim; nothing is normalised into a preset.
  assert.equal(pronounsOf({ pronouns: 'ze/hir' }), 'ze/hir');
});
