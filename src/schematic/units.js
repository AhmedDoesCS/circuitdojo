/**
 * Engineering-value parsing and formatting.
 *
 * Students type values the way EEs actually write them: "220", "4k7", "1M",
 * "10uF", "100n", "2.2 kΩ". Everything downstream (validation, ERC) works in
 * base SI units, so parsing happens exactly once, here.
 */

const SI_PREFIXES = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  µ: 1e-6,
  μ: 1e-6,
  m: 1e-3,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  meg: 1e6,
  G: 1e9,
};

// Unit suffixes we strip before parsing (Ω, ohm, F, H, V, A, W, C, J, Hz, s).
//
// Watts, coulombs and joules are here for the Analyse units rather than for any
// component value: asked how much heat a resistor makes, people write "150mW",
// and a grader that reads that as unparseable is telling them their correct
// answer is not a number.
const UNIT_SUFFIX =
  /(ohms?|Ω|ω|farads?|henr(y|ies)|volts?|amps?|amperes?|watts?|coulombs?|joules?|hz|hertz|seconds?|[FHVAWCJsΩ])\s*$/i;

/**
 * Parse an engineering value string into a base-unit number.
 * Supports: "220", "4k7", "4.7k", "1M", "10uF", "100n", "2.2 kΩ", "1.5V".
 * Returns null when the string carries no usable number.
 */
export function parseValue(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim();
  if (!s) return null;

  // Drop a trailing unit word/symbol ("10uF" -> "10u", "220 ohm" -> "220").
  s = s.replace(UNIT_SUFFIX, '').trim();
  // "meg" is the only multi-letter prefix we honour (SPICE convention).
  s = s.replace(/meg/i, 'M');

  // Infix-prefix notation: 4k7 => 4.7k, 1R5 => 1.5, 2u2 => 2.2u
  const infix = s.match(/^(\d+)\s*([pnuµμmkKMGR])\s*(\d+)$/);
  if (infix) {
    const [, whole, prefix, frac] = infix;
    const n = Number(`${whole}.${frac}`);
    if (!Number.isFinite(n)) return null;
    return prefix === 'R' ? n : n * SI_PREFIXES[prefix];
  }

  // A trailing R is the ohm symbol written on a keyboard ("220R"), and the
  // infix form above already honours it ("4R7"). Read as nothing, it made a
  // correctly-calculated resistor look valueless.
  const m = s.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*([pnuµμmkKMGR]?)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = m[2] && m[2] !== 'R' ? SI_PREFIXES[m[2]] : 1;
  return n * mult;
}

/** Format a base-unit number back into engineering notation ("4.7k", "220"). */
export function formatValue(value, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  const steps = [
    [1e9, 'G'],
    [1e6, 'M'],
    [1e3, 'k'],
    [1, ''],
    [1e-3, 'm'],
    [1e-6, 'µ'],
    [1e-9, 'n'],
    [1e-12, 'p'],
  ];
  for (const [scale, prefix] of steps) {
    if (abs >= scale) {
      const n = value / scale;
      const text = Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : trimFloat(n);
      return `${text}${prefix}${unit}`;
    }
  }
  return `${trimFloat(value)}${unit}`;
}

function trimFloat(n) {
  return String(Number(n.toPrecision(3)));
}

/** Units the briefs name in words but nobody writes that way. */
const UNIT_SYMBOL = { ohm: 'Ω', ohms: 'Ω' };

/** The symbol a unit is actually written with ('ohm' -> 'Ω'). */
export function unitSymbol(unit = '') {
  return UNIT_SYMBOL[unit] || unit;
}

/**
 * A quantity as a person would write it in a sentence.
 *
 * `formatValue` is for component values, where 4700 is "4.7k" and everyone
 * expects it. It is wrong for the quantities that appear in a question: a
 * 0.6 V diode drop came out as "600m V", a duty cycle of 0.548 as "548m", and
 * an answer that reads like a typing error undermines a question that is
 * otherwise correct.
 *
 * The rule is about whether a unit is attached. "4.4mA" is how an engineer says
 * a current and "0.0044A" is not, so anything carrying a unit keeps engineering
 * notation. A bare number in a sentence has its unit in the words around it, and
 * a ratio has no unit at all: those read as ordinary decimals. Both forms parse
 * back identically; this is only about reading.
 */
export function formatReadable(value, unit = '') {
  if (!Number.isFinite(value)) return '';
  const symbol = unitSymbol(unit);
  if (symbol) return formatValue(value, symbol);

  const abs = Math.abs(value);
  if (abs !== 0 && abs < 1000 && abs >= 0.001) return String(Number(value.toPrecision(3)));
  return formatValue(value, '');
}

/** Standard E-series (used to tell a student the nearest buyable resistor). */
const E24 = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6,
  6.2, 6.8, 7.5, 8.2, 9.1,
];

/** Nearest E24 value at or above `target` (the safe direction for a current limiter). */
export function nearestE24Above(target) {
  if (!Number.isFinite(target) || target <= 0) return null;
  const decade = Math.pow(10, Math.floor(Math.log10(target)));
  for (const base of E24) {
    const candidate = base * decade;
    if (candidate >= target - 1e-9) return round3(candidate);
  }
  return round3(10 * decade);
}

/** Nearest E24 value in either direction. */
export function nearestE24(target) {
  if (!Number.isFinite(target) || target <= 0) return null;
  const decade = Math.pow(10, Math.floor(Math.log10(target)));
  let best = null;
  for (const mult of [0.1, 1, 10]) {
    for (const base of E24) {
      const candidate = base * decade * mult;
      if (best === null || Math.abs(candidate - target) < Math.abs(best - target)) best = candidate;
    }
  }
  return round3(best);
}

function round3(n) {
  return Number(n.toPrecision(4));
}

/** Relative error helper used by tolerance checks. */
export function withinTolerance(actual, ideal, tolerance) {
  if (!Number.isFinite(actual) || !Number.isFinite(ideal) || ideal === 0) return false;
  return Math.abs(actual - ideal) / ideal <= tolerance;
}
