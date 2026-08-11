/**
 * Reference solutions: a real schematic, not a picture of one.
 *
 * A template's `solution(params)` returns a document built with the little
 * sheet builder below. It is the same document type the learner draws, so it
 * renders through the same canvas, extracts through the same netlist code and:
 * the point of the whole exercise: is graded by the same checker.
 *
 * `tests/solutions.test.js` runs `evaluateAttempt` over every declared solution
 * across many seeds and asserts it passes. A reference answer that cannot
 * satisfy its own brief is worse than no reference answer at all: it teaches a
 * circuit that is wrong, with the app's authority behind it. That test is what
 * makes it safe to show these to a learner who is, by definition, not yet able
 * to tell.
 *
 * Templates without a solution fall back to their `solutionNote` plus the
 * requirement list, which is text the author wrote by hand and is always exact.
 */

import { createDocument, makeComponent, makeWire, makeLabel, componentPins } from '../schematic/model.js';
import { normalize } from '../schematic/edit.js';
import { routeOrthogonal } from '../schematic/geometry.js';
import { SYMBOLS } from '../schematic/symbols/index.js';

/**
 * A 74xx chip's power unit and its decoupling capacitor.
 *
 * Every logic challenge needs this and none of them is about it, so it is drawn
 * the same way every time: the power unit parked to the right of the logic, the
 * 100nF wired to the two short stubs either side of it rather than to the rails
 * directly. Tying it to the stubs is the part that matters, because it makes
 * the drawing say "across this chip's own pins" instead of "somewhere on the
 * rail", which is the whole point of a decoupling capacitor.
 */
export function powerAndDecouple(s, part, x) {
  const power = s.place(part, { x, y: 300, unitId: 'PWR' });
  s.wire(s.rail('+5V', { x, y: 160 }).top(), power.pin('VCC'));
  s.wire(power.pin('GND'), s.rail('ground', { x, y: 460 }).top());

  const cap = s.place('C', { x: x + 130, y: 300, rot: 90, value: '100n' });
  s.wire(cap.top(), { x, y: 220 });
  s.wire(cap.bottom(), { x, y: 400 });
  return power;
}

/**
 * The same arrangement for a part whose supply pins are on the symbol itself
 * rather than on a separate power unit. `tees` are the two points on the supply
 * stubs the capacitor is wired back to, which is what keeps it reading as
 * "across this chip" rather than "somewhere on the rail".
 */
export function supplyAndCap(s, part, { rail, top, bottom, capX, tees, value = '100n' }) {
  s.wire(s.rail(rail, { x: part.pin('VCC').x, y: top }).top(), part.pin('VCC'));
  s.wire(part.pin('GND'), s.rail('ground', { x: part.pin('GND').x, y: bottom }).top());

  const cap = s.place('C', { x: capX, y: 400, rot: 90, value });
  s.wire(cap.top(), { x: part.pin('VCC').x, y: tees[0] });
  s.wire(cap.bottom(), { x: part.pin('GND').x, y: tees[1] });
  return cap;
}

/**
 * Power symbol for a rail name as the briefs write it ('+5V', 'GND', ...).
 * Reading the registry rather than hard-coding a table means a new rail symbol
 * is usable by every solution the moment it exists.
 */
export function railSymbolId(netName) {
  const wanted = netName === 'ground' ? 'GND' : netName;
  const hit = SYMBOLS.find((s) => s.isPower && s.power.netName === wanted);
  return hit ? hit.id : 'PWR_GND';
}

/** Extreme pin along an axis, which terminal is currently the top/left one. */
function extremePin(component, axis, sign) {
  const pins = componentPins(component);
  let best = pins[0];
  for (const p of pins) if (sign * p[axis] > sign * best[axis]) best = p;
  return { x: best.x, y: best.y };
}

export function sheet() {
  const doc = createDocument();

  const handle = (component) => ({
    component,
    get id() {
      return component.id;
    },
    get ref() {
      return component.ref;
    },
    /** A named pin, by number or by symbol pin name ('A', 'K', 'VCC', ...). */
    pin(which) {
      const pins = componentPins(component);
      const hit =
        pins.find((p) => p.num === String(which)) || pins.find((p) => p.name === String(which));
      if (!hit) throw new Error(`${component.symbolId} has no pin ${which}`);
      return { x: hit.x, y: hit.y };
    },
    top: () => extremePin(component, 'y', -1),
    bottom: () => extremePin(component, 'y', 1),
    left: () => extremePin(component, 'x', -1),
    right: () => extremePin(component, 'x', 1),
  });

  const api = {
    /**
     * Place a part. Two-terminal symbols are drawn horizontally by their
     * symbol definition, so `rot: 90` is what makes a vertical branch, and it
     * puts pin 1 at the top, which is why polarised parts come out the right
     * way up in a rail-to-ground ladder.
     */
    place(symbolId, { x, y, rot = 0, mirror = false, unitId = 'A', value } = {}) {
      const component = makeComponent(doc, symbolId, unitId, x, y);
      component.rot = rot;
      component.mirror = mirror;
      if (value !== undefined) component.value = value;
      doc.components.push(component);
      return handle(component);
    },

    /** A rail symbol by net name: `rail('+5V', {x, y})`. */
    rail(netName, opts) {
      return api.place(railSymbolId(netName), opts);
    },

    /** Orthogonal wire between two world points. */
    wire(from, to, { horizontalFirst = false } = {}) {
      const path = routeOrthogonal(from, to, horizontalFirst);
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        if (a.x === b.x && a.y === b.y) continue;
        doc.wires.push(makeWire(a.x, a.y, b.x, b.y));
      }
      return to;
    },

    /** Wire a vertical stack bottom-to-top, in the order given. */
    chain(...parts) {
      for (let i = 0; i < parts.length - 1; i++) {
        api.wire(parts[i].bottom(), parts[i + 1].top());
      }
    },

    /** Wire a horizontal run left-to-right, in the order given. */
    chainX(...parts) {
      for (let i = 0; i < parts.length - 1; i++) {
        api.wire(parts[i].right(), parts[i + 1].left(), { horizontalFirst: true });
      }
    },

    label(point, text) {
      doc.labels.push(makeLabel(point.x, point.y, text));
      return point;
    },

    /** Finish: implied junctions are derived exactly as they are while editing. */
    done() {
      return normalize(doc);
    },
  };

  return api;
}
