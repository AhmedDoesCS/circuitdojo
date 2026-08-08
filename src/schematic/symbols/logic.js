/**
 * 74HC logic family, modelled as real multi-unit parts.
 *
 * A 74HC08 is ONE physical package: four AND gates plus a power unit carrying
 * pins 14 (VCC) and 7 (GND). All five units share a single reference designator
 * (U1). Placing gate A of U1 and forgetting U1's power unit is a genuine,
 * extremely common beginner mistake, and the ERC calls it out, which is the
 * whole reason the multi-unit model is here rather than a flattened "AND gate".
 *
 * Shapes are ANSI/IEEE distinctive-shape (shield for AND, curved for OR).
 */

const AND_BODY = { t: 'path', d: 'M -20 -20 L 0 -20 A 20 20 0 0 1 0 20 L -20 20 Z', fill: 'body' };
const OR_BODY = {
  t: 'path',
  d: 'M -22 -20 Q -8 0 -22 20 L -4 20 Q 12 17 20 0 Q 12 -17 -4 -20 Z',
  fill: 'body',
};
const XOR_BACK = { t: 'path', d: 'M -30 -20 Q -16 0 -30 20' };
const NOT_BODY = { t: 'line', pts: [[-20, -16], [-20, 16], [14, 0]], fill: 'body' };

function bubble(cx) {
  return { t: 'circle', cx, cy: 0, r: 3, fill: 'body' };
}

/**
 * Build a two-input gate unit.
 * `shape`: 'and' | 'or' | 'xor'; `inverted` adds the output bubble.
 */
function gateUnit(id, shape, inverted, pins) {
  const graphics = [];
  let inX = -30;
  let inLen = 10;
  if (shape === 'and') {
    graphics.push(AND_BODY);
  } else if (shape === 'or') {
    graphics.push(OR_BODY);
    inLen = 14;
  } else {
    graphics.push(OR_BODY, XOR_BACK);
    inX = -40;
    inLen = 18;
  }
  if (inverted) graphics.push(bubble(23));
  const outX = inverted ? 40 : 30;
  const outLen = inverted ? 14 : 10;
  return {
    id,
    graphics,
    pins: [
      { num: pins.a, name: 'A', x: inX, y: -10, orient: 'L', len: inLen, type: 'input' },
      { num: pins.b, name: 'B', x: inX, y: 10, orient: 'L', len: inLen, type: 'input' },
      { num: pins.y, name: 'Y', x: outX, y: 0, orient: 'R', len: outLen, type: 'output' },
    ],
  };
}

function inverterUnit(id, pins) {
  return {
    id,
    graphics: [NOT_BODY, bubble(18)],
    pins: [
      { num: pins.a, name: 'A', x: -30, y: 0, orient: 'L', len: 10, type: 'input' },
      { num: pins.y, name: 'Y', x: 30, y: 0, orient: 'R', len: 9, type: 'output' },
    ],
  };
}

/** The power unit every 74xx part carries: VCC on top, GND on the bottom. */
function powerUnit(partName, vccPin, gndPin, vccName = 'VCC', gndName = 'GND') {
  return {
    id: 'PWR',
    isPowerUnit: true,
    graphics: [
      { t: 'rect', x: -30, y: -20, w: 60, h: 40, fill: 'body' },
      { t: 'text', x: 0, y: 4, s: partName, size: 9, anchor: 'middle' },
    ],
    pins: [
      { num: vccPin, name: vccName, x: 0, y: -40, orient: 'U', len: 20, type: 'power_in' },
      { num: gndPin, name: gndName, x: 0, y: 40, orient: 'D', len: 20, type: 'power_in' },
    ],
  };
}

function quadGate({ id, name, shape, inverted, pinout, keywords, help, fn }) {
  return {
    id,
    name,
    refPrefix: 'U',
    category: 'Logic',
    tags: ['ic', 'logic', '74hc', fn],
    defaultValue: id,
    valueKind: 'part',
    multiUnit: true,
    logicFamily: '74HC',
    logicFn: fn,
    keywords,
    help,
    units: [
      ...pinout.map((p, i) => gateUnit(String.fromCharCode(65 + i), shape, inverted, p)),
      powerUnit(id, '14', '7'),
    ],
    showPinNames: false,
    showPinNumbers: true,
  };
}

export const logicSymbols = [
  quadGate({
    id: '74HC08',
    name: '74HC08: quad 2-input AND',
    shape: 'and',
    inverted: false,
    fn: 'and',
    pinout: [
      { a: '1', b: '2', y: '3' },
      { a: '4', b: '5', y: '6' },
      { a: '9', b: '10', y: '8' },
      { a: '12', b: '13', y: '11' },
    ],
    keywords: ['and', '74hc08', 'gate', 'logic'],
    help: 'Four independent 2-input AND gates in one 14-pin package. Y = A·B. VCC on 14, GND on 7.',
  }),
  quadGate({
    id: '74HC00',
    name: '74HC00: quad 2-input NAND',
    shape: 'and',
    inverted: true,
    fn: 'nand',
    pinout: [
      { a: '1', b: '2', y: '3' },
      { a: '4', b: '5', y: '6' },
      { a: '9', b: '10', y: '8' },
      { a: '12', b: '13', y: '11' },
    ],
    keywords: ['nand', '74hc00', 'gate', 'logic', 'universal'],
    help: 'Four 2-input NAND gates. Y = /(A·B). The universal gate: any logic function can be built from NANDs.',
  }),
  quadGate({
    id: '74HC32',
    name: '74HC32: quad 2-input OR',
    shape: 'or',
    inverted: false,
    fn: 'or',
    pinout: [
      { a: '1', b: '2', y: '3' },
      { a: '4', b: '5', y: '6' },
      { a: '9', b: '10', y: '8' },
      { a: '12', b: '13', y: '11' },
    ],
    keywords: ['or', '74hc32', 'gate', 'logic'],
    help: 'Four 2-input OR gates. Y = A+B.',
  }),
  quadGate({
    id: '74HC02',
    name: '74HC02, quad 2-input NOR',
    shape: 'or',
    inverted: true,
    fn: 'nor',
    // Note the '02 pinout is NOT the same as the '00, outputs come first.
    pinout: [
      { a: '2', b: '3', y: '1' },
      { a: '5', b: '6', y: '4' },
      { a: '8', b: '9', y: '10' },
      { a: '11', b: '12', y: '13' },
    ],
    keywords: ['nor', '74hc02', 'gate', 'logic'],
    help: 'Four 2-input NOR gates. Y = /(A+B). Watch the pinout: outputs are on 1/4/10/13, unlike the 74HC00.',
  }),
  quadGate({
    id: '74HC86',
    name: '74HC86: quad 2-input XOR',
    shape: 'xor',
    inverted: false,
    fn: 'xor',
    pinout: [
      { a: '1', b: '2', y: '3' },
      { a: '4', b: '5', y: '6' },
      { a: '9', b: '10', y: '8' },
      { a: '12', b: '13', y: '11' },
    ],
    keywords: ['xor', '74hc86', 'gate', 'logic', 'parity'],
    help: 'Four 2-input XOR gates. Y = A⊕B: high when the inputs differ.',
  }),
  {
    id: '74HC04',
    name: '74HC04: hex inverter',
    refPrefix: 'U',
    category: 'Logic',
    tags: ['ic', 'logic', '74hc', 'not'],
    defaultValue: '74HC04',
    valueKind: 'part',
    multiUnit: true,
    logicFamily: '74HC',
    logicFn: 'not',
    keywords: ['not', 'inverter', '74hc04', 'gate', 'logic'],
    help: 'Six inverters in one 14-pin package. Y = /A. VCC on 14, GND on 7.',
    units: [
      inverterUnit('A', { a: '1', y: '2' }),
      inverterUnit('B', { a: '3', y: '4' }),
      inverterUnit('C', { a: '5', y: '6' }),
      inverterUnit('D', { a: '9', y: '8' }),
      inverterUnit('E', { a: '11', y: '10' }),
      inverterUnit('F', { a: '13', y: '12' }),
      powerUnit('74HC04', '14', '7'),
    ],
    showPinNames: false,
    showPinNumbers: true,
  },
];

export { powerUnit };
