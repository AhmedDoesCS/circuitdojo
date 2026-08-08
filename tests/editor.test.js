/**
 * Editor tests, the document operations behind the canvas gestures.
 *
 * These are the behaviours that are easy to break and expensive to notice: a
 * connection that only *looks* made, a drag that silently detaches wiring, a
 * paste that reuses a reference designator. Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createDocument, makeWire, makeLabel, cloneDocument, componentPins } from '../src/schematic/model.js';
import {
  placeComponent,
  moveItems,
  copySelection,
  pasteClipboard,
  toggleJunction,
  deleteItems,
  normalize,
  wireSnap,
} from '../src/schematic/edit.js';
import { extractNetlist } from '../src/schematic/netlist.js';
import { key } from '../src/schematic/geometry.js';
import { parseValue } from '../src/schematic/units.js';
import {
  applyConceptResults,
  computeLevel,
  conceptsAtOrBelow,
  emptyMastery,
  stepUp,
  repairFailedConcepts,
  HOLD,
} from '../src/lib/level.js';

/** The net a given world point ends up on, or null. */
function netAt(netlist, x, y) {
  const k = key(x, y);
  return netlist.nets.find((n) => n.points.includes(k)) || null;
}

// ---------------------------------------------------------------------------
// A pin on the middle of a wire is a connection
// ---------------------------------------------------------------------------

test('a pin landing mid-wire is connected, and says so with a dot', () => {
  const doc = createDocument();
  // A long horizontal run.
  doc.wires.push(makeWire(0, 0, 200, 0));
  // A ground symbol whose single pin lands in the middle of it.
  const { doc: next } = placeComponent(doc, 'PWR_GND', 'A', 100, 0);

  const pin = componentPins(next.components[0])[0];
  assert.ok(
    next.junctions.some((j) => j.x === pin.x && j.y === pin.y),
    'the implied connection is drawn as a junction dot'
  );

  const netlist = extractNetlist(next);
  const wireNet = netAt(netlist, 0, 0);
  assert.ok(wireNet, 'the wire has a net');
  assert.equal(netlist.pins.length, 1);
  assert.equal(netlist.pins[0].netId, wireNet.id, "the pin is on the wire's net");
});

test('dragging a part off a wire takes its implied dot with it', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  const { doc: placed, component } = placeComponent(doc, 'PWR_GND', 'A', 100, 0);
  assert.equal(placed.junctions.length, 1);

  const moved = moveItems(placed, [component.id], 0, 60, { dragWires: false });
  assert.equal(moved.junctions.length, 0, 'a stale dot would fake a connection that is gone');
});

test('a hand-placed junction survives normalisation', () => {
  let doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  doc.wires.push(makeWire(100, -50, 100, 50));
  doc = toggleJunction(doc, 100, 0);
  assert.equal(doc.junctions.length, 1);
  normalize(doc);
  assert.equal(doc.junctions.length, 1, "the learner's own dot is never re-derived away");
  assert.equal(doc.junctions[0].auto, undefined);
});

test('crossing wires still need a dot: the trap is intact', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  doc.wires.push(makeWire(100, -50, 100, 50));
  normalize(doc);
  assert.equal(doc.junctions.length, 0);
  assert.equal(extractNetlist(doc).nets.length, 2);
});

// ---------------------------------------------------------------------------
// Splicing into a wire
// ---------------------------------------------------------------------------

test('a two-terminal part dropped into a wire replaces the span it covers', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  const { doc: next } = placeComponent(doc, 'R', 'A', 100, 0);

  assert.equal(next.wires.length, 2, 'the run is split either side of the part');
  const pins = componentPins(next.components[0]);
  const ends = next.wires.flatMap((w) => [key(w.x1, w.y1), key(w.x2, w.y2)]);
  for (const p of pins) assert.ok(ends.includes(key(p.x, p.y)), 'each stub lands on a pin');

  const netlist = extractNetlist(next);
  assert.equal(netlist.nets.filter((n) => n.pins.length).length, 2, 'the part is in the path, not across it');
});

// ---------------------------------------------------------------------------
// Dragging wires along
// ---------------------------------------------------------------------------

test('dragging a component stretches the wires attached to its pins', () => {
  const doc = createDocument();
  const { doc: placed, component } = placeComponent(doc, 'R', 'A', 100, 100, { rot: 90 });
  const [a, b] = componentPins(placed.components[0]);
  placed.wires.push(makeWire(a.x, a.y, a.x - 100, a.y));
  placed.wires.push(makeWire(b.x, b.y, b.x + 100, b.y));

  const moved = moveItems(placed, [component.id], 0, 40);
  const pins = componentPins(moved.components[0]);
  const netlist = extractNetlist(moved);
  for (const p of pins) {
    const net = netAt(netlist, p.x, p.y);
    assert.ok(net && net.wireCount > 0, 'the pin is still on a wire after the drag');
  }
  // The far ends stayed where they were: the wires stretched, they did not slide.
  const xs = moved.wires.flatMap((w) => [w.x1, w.x2]);
  assert.ok(xs.includes(a.x - 100) && xs.includes(b.x + 100));
});

test('move (M) leaves the wiring behind, on purpose', () => {
  const doc = createDocument();
  const { doc: placed, component } = placeComponent(doc, 'R', 'A', 100, 100, { rot: 90 });
  const [a] = componentPins(placed.components[0]);
  placed.wires.push(makeWire(a.x, a.y, a.x - 100, a.y));

  const moved = moveItems(placed, [component.id], 0, 40, { dragWires: false });
  assert.deepEqual(
    moved.wires.map((w) => [w.x1, w.y1, w.x2, w.y2]),
    placed.wires.map((w) => [w.x1, w.y1, w.x2, w.y2])
  );
});

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

test('paste gives every copied part its own reference designator', () => {
  let doc = createDocument();
  ({ doc } = placeComponent(doc, 'R', 'A', 100, 100));
  ({ doc } = placeComponent(doc, 'R', 'A', 200, 100));
  const refs = doc.components.map((c) => c.ref);
  assert.deepEqual(refs, ['R1', 'R2']);

  const clip = copySelection(doc, doc.components.map((c) => c.id));
  const { doc: pasted, ids } = pasteClipboard(doc, clip, 400, 400);

  assert.equal(ids.length, 2);
  const all = pasted.components.map((c) => c.ref);
  assert.equal(new Set(all).size, 4, 'four parts, four references');
  assert.deepEqual([...all].sort(), ['R1', 'R2', 'R3', 'R4']);
});

test('a copied fragment keeps its shape and lands where it is put', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(100, 100, 180, 100));
  const clip = copySelection(doc, [doc.wires[0].id]);
  const { doc: pasted } = pasteClipboard(doc, clip, 500, 300);
  const copy = pasted.wires[1];
  assert.deepEqual([copy.x1, copy.y1, copy.x2, copy.y2], [500, 300, 580, 300]);
});

test('copying nothing yields nothing rather than an empty paste', () => {
  const doc = createDocument();
  assert.equal(copySelection(doc, []), null);
  assert.deepEqual(pasteClipboard(doc, null, 0, 0).ids, []);
});

test('deleting a wire clears the dots that only existed because of it', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  const { doc: placed, component } = placeComponent(doc, 'PWR_GND', 'A', 100, 0);
  assert.equal(placed.junctions.length, 1);
  const wireIds = placed.wires.map((w) => w.id);
  const cleared = deleteItems(placed, wireIds);
  assert.equal(cleared.junctions.length, 0);
  assert.equal(cleared.components.length, 1, 'the part itself is untouched');
  assert.ok(component.id);
});

// ---------------------------------------------------------------------------
// Levelling
// ---------------------------------------------------------------------------

test('"too easy" raises the level even after a failed attempt at it', () => {
  // A learner who tried a level-1 concept and got it wrong.
  let mastery = applyConceptResults(emptyMastery(), conceptsAtOrBelow(1), false);
  assert.equal(computeLevel(mastery).level, 1);

  mastery = stepUp(mastery, 1);
  assert.equal(computeLevel(mastery).level, 2, 'the button has to actually move them');
});

test('a skipped-up claim is still provisional', () => {
  let mastery = stepUp(emptyMastery(), 1);
  const claimed = conceptsAtOrBelow(1);
  assert.ok(claimed.every((id) => mastery[id].self), 'claimed, not earned');

  // One failure settles it decisively, exactly as calibration claims do.
  mastery = applyConceptResults(mastery, claimed, false);
  assert.ok(claimed.every((id) => mastery[id].value < HOLD));
  assert.equal(computeLevel(mastery).level, 1);
});

// ---------------------------------------------------------------------------
// Naming a node
// ---------------------------------------------------------------------------

test('a label anywhere along a wire names that wire', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  const { doc: withR } = placeComponent(doc, 'R', 'A', 400, 0);
  withR.wires.push(makeWire(200, 0, 370, 0));

  // Every position along the run must name the same net, not only the ends.
  for (const x of [0, 40, 100, 160, 200]) {
    const probe = cloneDocument(withR);
    probe.labels.push(makeLabel(x, 0, 'VOUT'));
    const netlist = extractNetlist(probe);
    const named = netlist.nets.find((n) => n.labels.includes('VOUT'));
    assert.ok(named, `no net named at x=${x}`);
    assert.ok(named.pins.length > 0, `the label at x=${x} floated on a net of its own`);
  }
});

test('a label off the wire stays off it', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  doc.labels.push(makeLabel(100, 60, 'VOUT'));
  const named = extractNetlist(doc).nets.find((n) => n.labels.includes('VOUT'));
  assert.equal(named.points.length, 1, 'a label in empty space names nothing');
});

test('clicking near a wire snaps the point onto it', () => {
  const doc = createDocument();
  doc.wires.push(makeWire(100, 200, 100, 400));
  assert.deepEqual(wireSnap(doc, 104, 297), { x: 100, y: 300 }, 'pulled onto the run and snapped along it');
  assert.equal(wireSnap(doc, 160, 300), null, 'a click nowhere near stays where it was put');
  // Past the end of the run, the snap clamps rather than inventing wire.
  assert.deepEqual(wireSnap(doc, 100, 402), { x: 100, y: 400 });
});

test('resistance written the way engineers write it', () => {
  assert.equal(parseValue('220R'), 220);
  assert.equal(parseValue('4R7'), 4.7);
  assert.equal(parseValue('4k7'), 4700);
  assert.equal(parseValue('220'), 220);
  assert.equal(parseValue('220Ω'), 220);
});

// ---------------------------------------------------------------------------
// Undoing failures the grader should never have recorded
// ---------------------------------------------------------------------------

test('repair rebuilds a concept from its passes alone', () => {
  const earned = applyConceptResults(emptyMastery(), ['ohms_law'], true);
  const damaged = applyConceptResults(earned, ['ohms_law'], false);
  assert.ok(damaged.ohms_law.value < earned.ohms_law.value, 'the failure knocked it down');

  const fixed = repairFailedConcepts(damaged);
  assert.equal(fixed.ohms_law.fails, 0);
  assert.equal(fixed.ohms_law.passes, 1);
  assert.equal(fixed.ohms_law.attempts, 1);
  assert.equal(fixed.ohms_law.value, earned.ohms_law.value, 'back to what the pass alone produced');
});

test('a concept with nothing but failures returns to a provisional claim', () => {
  const damaged = applyConceptResults(emptyMastery(), ['led_drive'], false);
  const fixed = repairFailedConcepts(damaged);
  assert.equal(fixed.led_drive.self, true, 'claimed, so the next real check settles it');
  assert.ok(fixed.led_drive.value >= HOLD);
  assert.equal(fixed.led_drive.fails, 0);
});

test('repair leaves untouched concepts exactly as they were', () => {
  const clean = applyConceptResults(emptyMastery(), ['ohms_law'], true);
  assert.deepEqual(repairFailedConcepts(clean), clean);
});
