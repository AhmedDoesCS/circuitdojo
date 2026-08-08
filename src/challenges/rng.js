/**
 * Deterministic seeded RNG.
 *
 * Challenge instances are (templateId, seed) pairs: the same seed always
 * regenerates the identical challenge, so an attempt saved in the database can
 * be replayed exactly without storing the whole generated brief.
 */

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Integer in [min, max]. */
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    /** Pick n distinct entries. */
    sample(list, n) {
      const copy = [...list];
      const out = [];
      while (out.length < n && copy.length) {
        out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
      }
      return out;
    },
    bool() {
      return next() < 0.5;
    },
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Tolerance band helper used all over the challenge templates. */
export function band(ideal, tolerance) {
  return { min: ideal * (1 - tolerance), max: ideal * (1 + tolerance) };
}
