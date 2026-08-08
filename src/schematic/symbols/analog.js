/**
 * Op-amps.
 *
 * The generic OPAMP is a single unit that carries its own supply pins: good
 * for teaching that an op-amp needs power even when the "textbook" schematic
 * omits it. The LM358 is the honest multi-unit version: two amplifier units
 * plus a shared power unit, exactly as KiCad models it.
 */

const TRIANGLE = { t: 'line', pts: [[-20, -30], [-20, 30], [30, 0]], fill: 'body' };
const MARKS = [
  { t: 'text', x: -14, y: -16, s: '−', size: 10 },
  { t: 'text', x: -14, y: 24, s: '+', size: 10 },
];

function ampUnit(id, pins, withSupply) {
  const supply = withSupply
    ? [
        { num: pins.vp, name: 'V+', x: 0, y: -40, orient: 'U', len: 22, type: 'power_in' },
        { num: pins.vn, name: 'V-', x: 0, y: 40, orient: 'D', len: 22, type: 'power_in' },
      ]
    : [];
  return {
    id,
    graphics: [TRIANGLE, ...MARKS],
    pins: [
      { num: pins.inn, name: 'IN-', x: -30, y: -20, orient: 'L', len: 10, type: 'input' },
      { num: pins.inp, name: 'IN+', x: -30, y: 20, orient: 'L', len: 10, type: 'input' },
      { num: pins.out, name: 'OUT', x: 40, y: 0, orient: 'R', len: 10, type: 'output' },
      ...supply,
    ],
  };
}

export const analogSymbols = [
  {
    id: 'OPAMP',
    name: 'Op-amp (generic, single)',
    refPrefix: 'U',
    category: 'Analog',
    tags: ['opamp', 'ic', 'analog', 'amplifier'],
    defaultValue: 'OPAMP',
    valueKind: 'part',
    keywords: ['op amp', 'opamp', 'amplifier', 'buffer', 'comparator', 'follower'],
    help:
      'Ideal-ish op-amp: infinite gain, no input current. With negative feedback the two inputs sit at the same voltage: that single rule solves buffers, inverting and non-inverting amps.',
    units: [ampUnit('A', { inn: '2', inp: '3', out: '1', vp: '8', vn: '4' }, true)],
    showPinNames: true,
    showPinNumbers: true,
  },
  {
    id: 'LM358',
    name: 'LM358: dual op-amp',
    refPrefix: 'U',
    category: 'Analog',
    tags: ['opamp', 'ic', 'analog', 'amplifier', 'lm358'],
    defaultValue: 'LM358',
    valueKind: 'part',
    multiUnit: true,
    keywords: ['lm358', 'dual op amp', 'single supply', 'amplifier'],
    help:
      'Two op-amps in an 8-pin package, V+ on 8 and GND/V− on 4. Single-supply capable, but its output cannot reach either rail, roughly 0V+30mV up to (V+ − 1.5V).',
    units: [
      ampUnit('A', { inn: '2', inp: '3', out: '1' }, false),
      ampUnit('B', { inn: '6', inp: '5', out: '7' }, false),
      {
        id: 'PWR',
        isPowerUnit: true,
        graphics: [
          { t: 'rect', x: -30, y: -20, w: 60, h: 40, fill: 'body' },
          { t: 'text', x: 0, y: 4, s: 'LM358', size: 9, anchor: 'middle' },
        ],
        pins: [
          { num: '8', name: 'V+', x: 0, y: -40, orient: 'U', len: 20, type: 'power_in' },
          { num: '4', name: 'V-', x: 0, y: 40, orient: 'D', len: 20, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },
];
