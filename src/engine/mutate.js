/**
 * Fault injection for review exercises.
 *
 * Takes a schematic that is known to be correct and breaks it in exactly one
 * way, recording what it broke. The learner is then asked to find the fault,
 * which is the exercise an engineer actually performs most often: reviewing
 * somebody else's drawing rather than producing their own.
 *
 * This is cheap to author because it inverts work already done. Every reference
 * solution is proven correct by the grader before it ships, so a mutation of one
 * is a known-wrong circuit with a known answer, and one solution yields as many
 * review exercises as there are faults that apply to it.
 *
 * Every fault leaves something on the sheet to point at. A missing part has no
 * culprit to click, so parts are never simply deleted: they are detached,
 * reversed, mis-valued or bypassed instead. All of those are findings a real
 * review produces.
 */

import { cloneDocument, componentPins } from '../schematic/model.js';
import { normalize } from '../schematic/edit.js';
import { getSymbol } from '../schematic/symbols/index.js';
import { parseValue, formatValue } from '../schematic/units.js';
import { makeRng } from '../challenges/rng.js';
import { GRID, distanceToSegment } from '../schematic/geometry.js';

/**
 * Each fault reports the item the learner has to identify, a one-line statement
 * of what is wrong for the answer screen, and the consequence, because knowing
 * a schematic is wrong is worth much less than knowing what it would do.
 */
const FAULTS = [
  {
    id: 'reversed_polarity',
    prompt: 'One part is fitted the wrong way round.',
    applies: (doc) => doc.components.some((c) => getSymbol(c.symbolId)?.polarized),
    apply(doc, rng) {
      const candidates = doc.components.filter((c) => getSymbol(c.symbolId)?.polarized);
      const victim = rng.pick(candidates);
      const target = doc.components.find((c) => c.id === victim.id);
      target.rot = ((target.rot || 0) + 180) % 360;
      const symbol = getSymbol(target.symbolId);
      return {
        itemId: target.id,
        what: `${target.ref} is reversed.`,
        consequence: symbol.tags.includes('capacitor')
          ? 'A reverse-biased electrolytic heats, gases and vents.'
          : 'Reversed, it blocks the current the circuit depends on and the branch does nothing.',
      };
    },
  },
  {
    id: 'wrong_decade',
    prompt: 'One value is wrong by a factor of ten.',
    applies: (doc) => valuedParts(doc).length > 0,
    apply(doc, rng) {
      const victim = rng.pick(valuedParts(doc));
      const target = doc.components.find((c) => c.id === victim.id);
      const symbol = getSymbol(target.symbolId);
      const value = parseValue(target.value);
      const scaled = rng.bool() ? value * 10 : value / 10;
      const was = target.value;
      target.value = formatValue(scaled, symbol.valueUnit || '');
      return {
        itemId: target.id,
        what: `${target.ref} reads ${target.value} where the design needs ${was}.`,
        consequence:
          'A decade error passes every visual check and none of the electrical ones. It is the most common value mistake there is.',
      };
    },
  },
  {
    id: 'shorted_part',
    prompt: 'Something on this sheet is bypassed by a wire.',
    applies: (doc) => twoTerminalParts(doc).length > 0,
    apply(doc, rng) {
      const victim = rng.pick(twoTerminalParts(doc));
      const [a, b] = componentPins(victim);
      // A jumper laid around the part, offset so it reads as a routed wire
      // rather than a line drawn through the symbol.
      const offset = GRID * 4;
      const side = a.x === b.x ? { x: offset, y: 0 } : { x: 0, y: offset };
      const path = [
        { x1: a.x, y1: a.y, x2: a.x + side.x, y2: a.y + side.y },
        { x1: a.x + side.x, y1: a.y + side.y, x2: b.x + side.x, y2: b.y + side.y },
        { x1: b.x + side.x, y1: b.y + side.y, x2: b.x, y2: b.y },
      ];
      const ids = [];
      for (const seg of path) {
        const wire = { id: `mut${ids.length}${victim.id}`, ...seg };
        doc.wires.push(wire);
        ids.push(wire.id);
      }
      return {
        itemId: ids[1],
        alsoAccept: ids,
        what: `${victim.ref} is shorted out by a wire around it.`,
        consequence: `Current takes the wire, not the part, so ${victim.ref} does nothing at all.`,
      };
    },
  },
  {
    id: 'detached_part',
    prompt: 'One part is not connected to the circuit it is drawn in.',
    applies: (doc) => twoTerminalParts(doc).length > 0,
    apply(doc, rng) {
      const victim = rng.pick(twoTerminalParts(doc));
      const target = doc.components.find((c) => c.id === victim.id);
      // Moved one grid step off the run, which is exactly how this happens in
      // real life and exactly how easy it is to miss.
      target.x += GRID;
      target.y += GRID;
      return {
        itemId: target.id,
        what: `${target.ref} sits one grid step off the wire, so its pins touch nothing.`,
        consequence: 'The drawing reads as a complete circuit and the netlist has a gap in it.',
      };
    },
  },
  {
    id: 'dangling_label',
    prompt: 'One net name does not name anything.',
    applies: (doc) => doc.labels.length > 0,
    apply(doc, rng) {
      const victim = rng.pick(doc.labels);
      const target = doc.labels.find((l) => l.id === victim.id);
      // Off the copper, not along it. Sliding a label down its own wire leaves
      // it attached and leaves nothing wrong with the drawing.
      const clear = [
        { x: GRID * 3, y: 0 },
        { x: -GRID * 3, y: 0 },
        { x: 0, y: GRID * 3 },
        { x: 0, y: -GRID * 3 },
      ].find((d) => !touchesAnyWire(doc, target.x + d.x, target.y + d.y));
      if (!clear) return null;
      target.x += clear.x;
      target.y += clear.y;
      return {
        itemId: target.id,
        what: `The ${target.text} label is beside the wire rather than on it.`,
        consequence: `Nothing is called ${target.text}, so every requirement written in terms of that net fails.`,
      };
    },
  },
  {
    id: 'retracted_wire',
    prompt: 'One wire stops short of what it was meant to reach.',
    applies: (doc) => doc.wires.length > 1,
    apply(doc, rng) {
      const victim = rng.pick(doc.wires.filter((w) => wireLength(w) > GRID * 2));
      if (!victim) return null;
      const target = doc.wires.find((w) => w.id === victim.id);
      // Pull the far end back along the run, leaving a visible gap.
      if (target.x1 === target.x2) target.y2 += target.y2 > target.y1 ? -GRID * 2 : GRID * 2;
      else target.x2 += target.x2 > target.x1 ? -GRID * 2 : GRID * 2;
      return {
        itemId: target.id,
        what: 'A wire ends in mid-air instead of meeting the pin it was drawn towards.',
        consequence: 'The gap is two grid steps wide and the circuit is open at that point.',
      };
    },
  },
];

function valuedParts(doc) {
  return doc.components.filter((c) => {
    const symbol = getSymbol(c.symbolId);
    if (!symbol || symbol.isPower) return false;
    return parseValue(c.value) !== null && Boolean(symbol.valueUnit);
  });
}

function twoTerminalParts(doc) {
  return doc.components.filter((c) => {
    const symbol = getSymbol(c.symbolId);
    return symbol && !symbol.isPower && componentPins(c).length === 2;
  });
}

function touchesAnyWire(doc, x, y) {
  return doc.wires.some(
    (w) => distanceToSegment({ x, y }, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) < 1
  );
}

function wireLength(w) {
  return Math.abs(w.x2 - w.x1) + Math.abs(w.y2 - w.y1);
}

/** Which faults can be applied to this schematic at all. */
export function applicableFaults(doc) {
  return FAULTS.filter((f) => f.applies(doc)).map((f) => f.id);
}

/**
 * Break a correct schematic in exactly one way.
 *
 * `verify` is how this stays honest. A mutation is only a fault if the grader
 * actually rejects the result, and some do not: reversing one LED of two leaves
 * a challenge that asks for "an LED anode reaching the rail" satisfied by the
 * other one. Rather than hand-listing which fault suits which circuit, the
 * caller passes the grader and this tries the pool until something genuinely
 * breaks. Same discipline as the reference solutions, pointed the other way.
 *
 * @param {object} reference  a schematic known to be correct
 * @param {number} seed       makes the choice reproducible
 * @param {object} [options]
 * @param {string} [options.only]    force one fault, for authoring and tests
 * @param {Function} [options.verify] doc => true when the doc is properly broken
 * @returns {{doc, fault}|null} null when nothing applicable actually breaks it
 */
export function injectFault(reference, seed, options = {}) {
  const { only = null, verify = null } = typeof options === 'string' ? { only: options } : options;
  const rng = makeRng(seed);
  const pool = FAULTS.filter((f) => (only ? f.id === only : true) && f.applies(reference));
  if (!pool.length) return null;

  // A seeded shuffle, so the first choice varies with the seed but the whole
  // pool is still available as a fallback.
  const order = rng.sample(pool, pool.length);

  for (const fault of order) {
    const doc = cloneDocument(reference);
    const result = fault.apply(doc, rng);
    if (!result) continue;
    normalize(doc);
    if (verify && !verify(doc)) continue;
    return {
      doc,
      fault: {
        id: fault.id,
        prompt: fault.prompt,
        itemId: result.itemId,
        accepts: result.alsoAccept || [result.itemId],
        what: result.what,
        consequence: result.consequence,
      },
    };
  }
  return null;
}

export { FAULTS };
