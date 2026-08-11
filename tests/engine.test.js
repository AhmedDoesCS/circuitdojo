/**
 * Engine tests: netlist extraction, ERC and requirement checking.
 * Run with: npm test   (node --test, no test framework needed)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createDocument, makeComponent, makeWire, makeJunction, makeLabel, componentPins } from '../src/schematic/model.js';
import { placeComponent } from '../src/schematic/edit.js';
import { extractNetlist } from '../src/schematic/netlist.js';
import { evaluateAttempt } from '../src/engine/evaluate.js';
import { runERC } from '../src/engine/erc.js';
import { instantiate } from '../src/challenges/index.js';
import { parseValue, formatValue, nearestE24 } from '../src/schematic/units.js';

/** Place a component and return it (mutates doc). */
function place(doc, symbolId, unitId, x, y, { rot = 0, value } = {}) {
  const c = makeComponent(doc, symbolId, unitId, x, y);
  c.rot = rot;
  if (value !== undefined) c.value = value;
  doc.components.push(c);
  return c;
}

function wire(doc, x1, y1, x2, y2) {
  doc.wires.push(makeWire(x1, y1, x2, y2));
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

test('parses engineering notation the way EEs write it', () => {
  assert.equal(parseValue('220'), 220);
  assert.equal(parseValue('4k7'), 4700);
  assert.equal(parseValue('4.7k'), 4700);
  assert.equal(parseValue('1M'), 1e6);
  assert.ok(Math.abs(parseValue('100n') - 1e-7) < 1e-18);
  assert.equal(Math.round(parseValue('10uF') * 1e9), 10000);
  assert.equal(parseValue('2.2 kΩ'), 2200);
  assert.equal(parseValue(''), null);
  assert.equal(formatValue(4700, 'Ω'), '4.7kΩ');
  assert.equal(nearestE24(320), 330);
});

// ---------------------------------------------------------------------------
// Netlist semantics
// ---------------------------------------------------------------------------

test('crossing wires without a junction are separate nets', () => {
  const doc = createDocument();
  wire(doc, 0, 0, 100, 0);
  wire(doc, 50, -50, 50, 50);
  const netlist = extractNetlist(doc);
  assert.equal(netlist.nets.length, 2, 'a plain crossing must not connect');
});

test('a junction dot joins crossing wires into one net', () => {
  const doc = createDocument();
  wire(doc, 0, 0, 100, 0);
  wire(doc, 50, -50, 50, 50);
  doc.junctions.push(makeJunction(50, 0));
  const netlist = extractNetlist(doc);
  assert.equal(netlist.nets.length, 1, 'the junction must merge both wires');
});

test('wires sharing an endpoint connect without a junction', () => {
  const doc = createDocument();
  wire(doc, 0, 0, 50, 0);
  wire(doc, 50, 0, 50, 50);
  const netlist = extractNetlist(doc);
  assert.equal(netlist.nets.length, 1);
});

test('power symbols with the same name form one global net', () => {
  const doc = createDocument();
  place(doc, 'PWR_GND', 'A', 0, 0);
  place(doc, 'PWR_GND', 'A', 500, 300);
  const netlist = extractNetlist(doc);
  const gnd = netlist.groundNets();
  assert.equal(gnd.length, 1, 'both GND symbols are the same net');
  assert.equal(gnd[0].pins.length, 2);
});

test('net labels merge by name but do not count as a supply', () => {
  const doc = createDocument();
  doc.labels.push(makeLabel(0, 0, 'VCC'));
  doc.labels.push(makeLabel(200, 0, 'VCC'));
  wire(doc, 0, 0, 0, 40);
  wire(doc, 200, 0, 200, 40);
  const netlist = extractNetlist(doc);
  const named = netlist.netByName('VCC');
  assert.ok(named, 'label net exists');
  assert.equal(named.isPower, false, 'a label is not a power symbol');
});

// ---------------------------------------------------------------------------
// A complete, correct tier-1 solution
// ---------------------------------------------------------------------------

/**
 * Vertical chain: +5V -> R -> LED -> GND, all on one column.
 * Pin geometry: a two-terminal part rotated 90° has pins at y ∓ 30.
 */
function buildLedCircuit(resistorValue, { reverseLed = false, omitResistor = false } = {}) {
  const doc = createDocument();
  place(doc, 'PWR_5V', 'A', 0, 0);
  if (omitResistor) {
    wire(doc, 0, 0, 0, 140);
  } else {
    wire(doc, 0, 0, 0, 50);
    place(doc, 'R', 'A', 0, 80, { rot: 90, value: resistorValue });
    wire(doc, 0, 110, 0, 140);
  }
  place(doc, 'D_LED', 'A', 0, 170, { rot: reverseLed ? 270 : 90 });
  wire(doc, 0, 200, 0, 230);
  place(doc, 'PWR_GND', 'A', 0, 230);
  return doc;
}

test('a correct LED + resistor circuit passes its challenge', () => {
  const challenge = instantiate('led_current_limit', 12345);
  const { rail, led, current } = challenge.params;
  const ideal = (rail.v - led.vf) / current;

  // The generated challenge may specify +3V3; rebuild on whichever rail it asks for.
  const doc = buildLedCircuit(String(Math.round(ideal)));
  const powerSym = doc.components.find((c) => c.symbolId === 'PWR_5V');
  powerSym.symbolId = rail.name === '+5V' ? 'PWR_5V' : 'PWR_3V3';
  powerSym.value = rail.name;

  const result = evaluateAttempt(doc, challenge);
  assert.equal(
    result.passed,
    true,
    `expected a pass, got errors: ${JSON.stringify(result.errors.concat(result.missing), null, 1)}`
  );
  assert.ok(result.correct.length >= 4);
});

test('an LED straight across the rails is caught as unlimited current', () => {
  const challenge = instantiate('led_current_limit', 999);
  const rail = challenge.params.rail;
  const doc = buildLedCircuit('220', { omitResistor: true });
  const powerSym = doc.components.find((c) => c.symbolId === 'PWR_5V');
  powerSym.symbolId = rail.name === '+5V' ? 'PWR_5V' : 'PWR_3V3';
  powerSym.value = rail.name;

  const result = evaluateAttempt(doc, challenge);
  assert.equal(result.passed, false);
  assert.ok(
    result.errors.some((e) => e.code === 'no_current_limit'),
    'ERC should report the missing current limit'
  );
  assert.ok(
    result.missing.some((m) => m.label.includes('resistor')),
    'and the missing resistor should be reported as missing, not just wrong'
  );
});

test('a wrong resistor value fails the value check with a worked explanation', () => {
  const challenge = instantiate('led_current_limit', 4242);
  const { rail } = challenge.params;
  const doc = buildLedCircuit('10k');
  const powerSym = doc.components.find((c) => c.symbolId === 'PWR_5V');
  powerSym.symbolId = rail.name === '+5V' ? 'PWR_5V' : 'PWR_3V3';
  powerSym.value = rail.name;

  const result = evaluateAttempt(doc, challenge);
  assert.equal(result.passed, false);
  const valueError = result.errors.find((e) => e.label.includes('Resistor sized'));
  assert.ok(valueError, 'the resistor value check must fail');
  assert.match(valueError.detail, /Ohm's law/);
});

// ---------------------------------------------------------------------------
// Multi-unit IC behaviour
// ---------------------------------------------------------------------------

test('a placed gate without its power unit is an ERC error', () => {
  const doc = createDocument();
  place(doc, '74HC08', 'A', 0, 0);
  const netlist = extractNetlist(doc);
  const result = evaluateAttempt(doc, { requirements: {} });
  assert.equal(netlist.components.length, 1);
  assert.ok(
    result.errors.some((e) => e.code === 'missing_power_unit'),
    'the chip has no supply connection without its power unit'
  );
});

test('gate units placed after the first share the same reference designator', () => {
  const doc = createDocument();
  const a = place(doc, '74HC08', 'A', 0, 0);
  const b = place(doc, '74HC08', 'B', 200, 0);
  const pwr = place(doc, '74HC08', 'PWR', 400, 0);
  assert.equal(a.ref, b.ref, 'units of one chip share a reference');
  assert.equal(a.ref, pwr.ref);

  // A second chip only appears once every unit of the first is used.
  place(doc, '74HC08', 'A', 600, 0);
  const refs = new Set(doc.components.map((c) => c.ref));
  assert.equal(refs.size, 2, 'a fifth AND gate needs a second package');
});

// ---------------------------------------------------------------------------
// Short-circuit detection
// ---------------------------------------------------------------------------

test('a switch wired straight across the rails is a dead short', () => {
  const doc = createDocument();
  place(doc, 'PWR_5V', 'A', 0, 0);
  wire(doc, 0, 0, 0, 50);
  place(doc, 'SW_SPST', 'A', 0, 80, { rot: 90 });
  wire(doc, 0, 110, 0, 140);
  place(doc, 'PWR_GND', 'A', 0, 140);

  const result = evaluateAttempt(doc, { requirements: {} });
  assert.ok(result.errors.some((e) => e.code === 'rail_short'));
});

test('two power symbols on one node is reported as a supply short', () => {
  const doc = createDocument();
  place(doc, 'PWR_5V', 'A', 0, 0);
  place(doc, 'PWR_GND', 'A', 0, 0);
  const result = evaluateAttempt(doc, { requirements: {} });
  assert.ok(result.errors.some((e) => e.code === 'power_short'));
});

// ---------------------------------------------------------------------------
// Every authored challenge must generate cleanly
// ---------------------------------------------------------------------------

test('all templates instantiate with a brief and at least one check', async () => {
  const { TEMPLATES } = await import('../src/challenges/index.js');
  for (const template of TEMPLATES) {
    for (const seed of [1, 7, 4242]) {
      const c = instantiate(template.id, seed);
      assert.ok(c.brief.goal, `${template.id} has a goal`);
      assert.ok(c.brief.spec.length > 0, `${template.id} has spec bullets`);
      const checks = (c.requirements.checks || []).length + (c.requirements.requiredComponents || []).length;
      assert.ok(checks > 0, `${template.id} has checks`);
      // Checks must be evaluable against an empty schematic without throwing.
      const result = evaluateAttempt(createDocument(), c);
      assert.equal(result.passed, false);
    }
  }
});


// ---------------------------------------------------------------------------
// Placing a two-terminal part onto a wire
// ---------------------------------------------------------------------------

test('dropping a two-pin part on a wire splits it into two stubs', () => {
  let doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));

  // A resistor is 2 pins on the x axis; centring it at 100,0 puts both pins
  // inside the wire.
  const { doc: after, component } = placeComponent(doc, 'R', 'A', 100, 0);
  const pins = componentPins(component).map((p) => p.x).sort((a, b) => a - b);

  assert.equal(after.wires.length, 2, 'the original wire is replaced by two');
  const spans = after.wires
    .map((w) => [Math.min(w.x1, w.x2), Math.max(w.x1, w.x2)])
    .sort((a, b) => a[0] - b[0]);
  assert.deepEqual(spans[0], [0, pins[0]], 'first stub runs from the start to the near pin');
  assert.deepEqual(spans[1], [pins[1], 200], 'second stub runs from the far pin to the end');

  // The span the component now bridges must be gone, or the part is shorted.
  const bridges = after.wires.some(
    (w) => Math.min(w.x1, w.x2) <= pins[0] && Math.max(w.x1, w.x2) >= pins[1]
  );
  assert.equal(bridges, false, 'nothing still spans across the component');
});

test('the split leaves one net through the component, not a short', () => {
  let doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  const { doc: after } = placeComponent(doc, 'R', 'A', 100, 0);

  const nets = extractNetlist(after).nets;
  const resistorNets = nets.filter((n) => n.pins.some((p) => p.ref?.startsWith('R')));
  assert.equal(resistorNets.length, 2, 'each terminal sits on its own net');
});

test('a part dropped clear of any wire leaves wires alone', () => {
  let doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  const { doc: after } = placeComponent(doc, 'R', 'A', 100, 80);
  assert.equal(after.wires.length, 1, 'the wire is untouched');
});

test('a part crossing a wire perpendicular is not spliced', () => {
  let doc = createDocument();
  doc.wires.push(makeWire(0, 0, 200, 0));
  // Rotated 90 degrees, the pins run vertically and cannot both lie on the wire.
  const { doc: after } = placeComponent(doc, 'R', 'A', 100, 0, { rot: 90 });
  assert.equal(after.wires.length, 1, 'a crossing part does not rewire the sheet');
});

// ---------------------------------------------------------------------------
// A changeover switch is not a short
// ---------------------------------------------------------------------------

test('an SPDT selecting between a rail and ground is not a rail short', () => {
  const doc = createDocument();
  const sw = place(doc, 'SW_SPDT', 'A', 300, 200);
  const [com, nc, no] = componentPins(sw);
  const v = place(doc, 'PWR_5V', 'A', 480, 100);
  const g = place(doc, 'PWR_GND', 'A', 480, 320);

  wire(doc, nc.x, nc.y, 480, nc.y);
  wire(doc, 480, nc.y, 480, 100);
  wire(doc, no.x, no.y, 480, no.y);
  wire(doc, 480, no.y, 480, 320);
  wire(doc, com.x, com.y, 200, com.y);

  const netlist = extractNetlist(doc);
  const issues = runERC(doc, netlist, {});
  const shorts = issues.filter((i) => i.code === 'rail_short');
  assert.deepEqual(
    shorts,
    [],
    'the two throws are mutually exclusive: a path through the common terminal is both positions at once'
  );
  assert.ok(v.ref && g.ref);
});

test('a net the brief declares as driven satisfies an input behind a resistor', () => {
  const doc = createDocument();
  const q = place(doc, 'Q_NPN', 'A', 400, 300);
  const base = componentPins(q).find((p) => p.name === 'B');
  const r = place(doc, 'R', 'A', 250, base.y, { value: '10k' });
  const [rIn, rOut] = componentPins(r);

  wire(doc, rOut.x, rOut.y, base.x, base.y);
  wire(doc, rIn.x, rIn.y, 130, rIn.y);
  doc.labels.push(makeLabel(130, rIn.y, 'DRIVE'));

  const netlist = extractNetlist(doc);
  const floating = (opts) => runERC(doc, netlist, opts).filter((i) => i.code === 'floating_input');

  assert.equal(floating({}).length, 1, 'undeclared, the base really is floating');
  assert.deepEqual(floating({ drivenNets: ['DRIVE'] }), [], 'declared, the driver is simply off-sheet');
});

// ---------------------------------------------------------------------------
// Dual supplies, and inputs held by feedback rather than by a rail
// ---------------------------------------------------------------------------

/** An op-amp with its two supply pins wired to the named rails. */
function supplyOpamp(negativeRail) {
  const doc = createDocument();
  const u = place(doc, 'OPAMP', 'A', 400, 300);
  const vPlus = componentPins(u).find((p) => p.name === 'V+');
  const vMinus = componentPins(u).find((p) => p.name === 'V-');

  const top = place(doc, 'PWR_12V', 'A', vPlus.x, 200);
  const bottom = place(doc, negativeRail, 'A', vMinus.x, 400);
  wire(doc, vPlus.x, vPlus.y, top.x, top.y);
  wire(doc, vMinus.x, vMinus.y, bottom.x, bottom.y);

  return runERC(doc, extractNetlist(doc), {}).filter((i) => i.code === 'power_pin_swapped');
}

test('an op-amp V- on a negative rail is correct, not a swapped supply', () => {
  assert.deepEqual(
    supplyOpamp('PWR_N12V'),
    [],
    '-12V is a supply symbol but it is below ground, which is exactly where V- belongs'
  );
});

test('an op-amp V- on ground is still correct, because single supply is a real arrangement', () => {
  assert.deepEqual(supplyOpamp('PWR_GND'), []);
});

test('a supply pin wired above the positive rail is caught', () => {
  const doc = createDocument();
  const u = place(doc, 'OPAMP', 'A', 400, 300);
  const vMinus = componentPins(u).find((p) => p.name === 'V-');
  const rail = place(doc, 'PWR_12V', 'A', vMinus.x, 400);
  wire(doc, vMinus.x, vMinus.y, rail.x, rail.y);

  const swapped = runERC(doc, extractNetlist(doc), {}).filter((i) => i.code === 'power_pin_swapped');
  assert.equal(swapped.length, 1, 'V- on +12V is the mistake the rule exists to find');
  assert.ok(swapped[0].message.includes('negative side'));
});

test('an input reached through a resistor from a driven net is not floating', () => {
  const doc = createDocument();
  const u = place(doc, 'OPAMP', 'A', 400, 300);
  const inMinus = componentPins(u).find((p) => p.name === 'IN-');
  const out = componentPins(u).find((p) => p.name === 'OUT');

  // The feedback resistor, and nothing else: no route from IN- to any rail.
  const rf = place(doc, 'R', 'A', 500, 150, { value: '10k' });
  const [rfLeft, rfRight] = componentPins(rf);
  wire(doc, inMinus.x, inMinus.y, 450, inMinus.y);
  wire(doc, 450, inMinus.y, 450, rfLeft.y);
  wire(doc, 450, rfLeft.y, rfLeft.x, rfLeft.y);
  wire(doc, rfRight.x, rfRight.y, 620, rfRight.y);
  wire(doc, 620, rfRight.y, 620, out.y);
  wire(doc, 620, out.y, out.x, out.y);

  const floating = runERC(doc, extractNetlist(doc), {}).filter((i) => i.code === 'floating_input');
  assert.deepEqual(
    floating,
    [],
    'feedback defines the inverting input more firmly than any pull resistor would'
  );
});

// ---------------------------------------------------------------------------
// A label that names nothing
// ---------------------------------------------------------------------------

test('a label beside the wire is reported as naming nothing', () => {
  const doc = createDocument();
  wire(doc, 100, 200, 400, 200);
  place(doc, 'R', 'A', 500, 200);
  doc.labels.push(makeLabel(250, 220, 'BTN')); // 20 units below the run

  const issues = runERC(doc, extractNetlist(doc), {});
  const dangling = issues.filter((i) => i.code === 'dangling_label');
  assert.equal(dangling.length, 1, 'the root cause is stated once, plainly');
  assert.equal(dangling[0].severity, 'error');
  assert.ok(dangling[0].message.includes('BTN'));
});

test('a label sitting on the wire is not complained about at all', () => {
  const doc = createDocument();
  wire(doc, 100, 200, 400, 200);
  doc.labels.push(makeLabel(250, 200, 'BTN'));

  const issues = runERC(doc, extractNetlist(doc), {});
  assert.deepEqual(
    issues.filter((i) => i.code === 'dangling_label' || i.code === 'lonely_label'),
    [],
    'one label naming a node is exactly what the briefs ask for'
  );
});
