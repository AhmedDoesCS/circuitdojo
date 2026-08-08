/**
 * Extended symbol library: the parts the higher-level challenge domains need:
 * switching devices, protection, isolation, motors, comparators, buses and
 * power conversion.
 *
 * Same rules as the core library: pin connection points on multiples of GRID
 * (10), and honest electrical pin types, because the ERC believes them.
 */

const box = ({ x, y, w, h, label, labelSize = 9 }) => [
  { t: 'rect', x, y, w, h, fill: 'body' },
  ...(label ? [{ t: 'text', x: x + w / 2, y: y + 13, s: label, size: labelSize, anchor: 'middle' }] : []),
];

export const extendedSymbols = [
  // ------------------------------------------------------------- switching
  {
    id: 'Q_NMOS',
    name: 'N-channel MOSFET',
    refPrefix: 'Q',
    category: 'Discretes',
    tags: ['transistor', 'mosfet', 'nmos', 'switch'],
    defaultValue: '2N7002',
    valueKind: 'part',
    keywords: ['mosfet', 'nmos', 'n-channel', 'low side', 'switch', 'logic level'],
    help:
      'Voltage-controlled switch. Gate draws no steady current, but needs V_GS well above V_GS(th), check R_DS(on) at the gate voltage you can actually supply. Low-side switching only, unless you add a gate driver.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'line', pts: [[-10, -18], [-10, 18]] },
          { t: 'line', pts: [[-2, -18], [-2, -6]] },
          { t: 'line', pts: [[-2, -4], [-2, 4]] },
          { t: 'line', pts: [[-2, 6], [-2, 18]] },
          { t: 'line', pts: [[-2, -12], [20, -12], [20, -30]] },
          { t: 'line', pts: [[-2, 0], [20, 0], [20, 12]] },
          { t: 'line', pts: [[-2, 12], [20, 12], [20, 30]] },
          { t: 'line', pts: [[4, 0], [12, -4], [12, 4]], fill: 'solid' },
          { t: 'line', pts: [[-30, 0], [-10, 0]] },
        ],
        pins: [
          { num: '1', name: 'G', x: -30, y: 0, orient: 'L', len: 0, type: 'input', hideStub: true },
          { num: '2', name: 'D', x: 20, y: -40, orient: 'U', len: 10, type: 'passive' },
          { num: '3', name: 'S', x: 20, y: 40, orient: 'D', len: 10, type: 'passive' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: false,
  },
  {
    id: 'Q_PMOS',
    name: 'P-channel MOSFET',
    refPrefix: 'Q',
    category: 'Discretes',
    tags: ['transistor', 'mosfet', 'pmos', 'switch'],
    defaultValue: 'IRLML6402',
    valueKind: 'part',
    keywords: ['pmos', 'p-channel', 'high side', 'reverse polarity', 'load switch'],
    help:
      'High-side switch: source to the supply, gate pulled below it to turn on. The classic reverse-polarity protector, with far less drop than a series diode.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'line', pts: [[-10, -18], [-10, 18]] },
          { t: 'line', pts: [[-2, -18], [-2, -6]] },
          { t: 'line', pts: [[-2, -4], [-2, 4]] },
          { t: 'line', pts: [[-2, 6], [-2, 18]] },
          { t: 'line', pts: [[-2, -12], [20, -12], [20, -30]] },
          { t: 'line', pts: [[-2, 0], [20, 0], [20, 12]] },
          { t: 'line', pts: [[-2, 12], [20, 12], [20, 30]] },
          { t: 'line', pts: [[12, 0], [4, -4], [4, 4]], fill: 'solid' },
          { t: 'line', pts: [[-30, 0], [-10, 0]] },
        ],
        pins: [
          { num: '1', name: 'G', x: -30, y: 0, orient: 'L', len: 0, type: 'input', hideStub: true },
          { num: '2', name: 'S', x: 20, y: -40, orient: 'U', len: 10, type: 'passive' },
          { num: '3', name: 'D', x: 20, y: 40, orient: 'D', len: 10, type: 'passive' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: false,
  },
  {
    id: 'Q_PNP',
    name: 'PNP transistor',
    refPrefix: 'Q',
    category: 'Discretes',
    tags: ['transistor', 'pnp', 'bjt'],
    defaultValue: '2N3906',
    valueKind: 'part',
    keywords: ['pnp', 'bjt', 'high side', 'transistor'],
    help: 'Complement of the NPN: emitter to the positive rail, base pulled low through a resistor to turn it on.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'line', pts: [[0, -16], [0, 16]] },
          { t: 'line', pts: [[-20, 0], [0, 0]] },
          { t: 'line', pts: [[0, -8], [20, -22]] },
          { t: 'line', pts: [[0, 8], [20, 22]] },
          { t: 'line', pts: [[2, 6], [12, 12], [4, 16]], fill: 'solid' },
        ],
        pins: [
          { num: '1', name: 'B', x: -30, y: 0, orient: 'L', len: 10, type: 'input' },
          { num: '2', name: 'C', x: 20, y: 40, orient: 'D', len: 18, type: 'passive' },
          { num: '3', name: 'E', x: 20, y: -40, orient: 'U', len: 18, type: 'passive' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: false,
  },

  // ------------------------------------------------------------ protection
  {
    id: 'D_SCHOTTKY',
    name: 'Schottky diode',
    refPrefix: 'D',
    category: 'Discretes',
    tags: ['diode', 'schottky', 'two_terminal', 'polarized'],
    defaultValue: '1N5819',
    valueKind: 'part',
    polarized: true,
    keywords: ['schottky', 'low drop', 'freewheel', 'rectifier'],
    help: 'Low forward drop (~0.3V) and fast recovery: the usual choice for freewheeling and OR-ing supplies.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'line', pts: [[-10, -10], [-10, 10], [10, 0]], fill: 'body' },
          { t: 'line', pts: [[16, -6], [16, -10], [10, -10], [10, 10], [4, 10], [4, 6]] },
        ],
        pins: [
          { num: '1', name: 'A', x: -30, y: 0, orient: 'L', len: 20, type: 'passive' },
          { num: '2', name: 'K', x: 30, y: 0, orient: 'R', len: 20, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
  {
    id: 'D_TVS',
    name: 'TVS diode (bidirectional)',
    refPrefix: 'D',
    category: 'Protection',
    tags: ['tvs', 'diode', 'protection', 'two_terminal'],
    defaultValue: 'SMAJ5.0CA',
    valueKind: 'part',
    keywords: ['tvs', 'esd', 'surge', 'clamp', 'protection'],
    help:
      'Transient suppressor: high impedance until the transient exceeds its standoff voltage, then it clamps hard. Fit at the connector, before anything it protects.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'line', pts: [[-12, -10], [-12, 10], [0, 0]], fill: 'body' },
          { t: 'line', pts: [[12, -10], [12, 10], [0, 0]], fill: 'body' },
          { t: 'line', pts: [[0, -12], [0, 12]] },
        ],
        pins: [
          { num: '1', name: '~', x: -30, y: 0, orient: 'L', len: 18, type: 'passive' },
          { num: '2', name: '~', x: 30, y: 0, orient: 'R', len: 18, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
  {
    id: 'FUSE',
    name: 'Fuse',
    refPrefix: 'F',
    category: 'Protection',
    tags: ['fuse', 'protection', 'two_terminal', 'resistive'],
    defaultValue: '1A',
    valueKind: 'part',
    keywords: ['fuse', 'ptc', 'polyfuse', 'overcurrent', 'protection'],
    help:
      'Opens on sustained overcurrent. Rate it above the worst-case normal current and below what the weakest protected part can survive.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -18, y: -7, w: 36, h: 14, fill: 'body' },
          { t: 'line', pts: [[-18, 0], [18, 0]] },
        ],
        pins: [
          { num: '1', name: '~', x: -30, y: 0, orient: 'L', len: 12, type: 'passive' },
          { num: '2', name: '~', x: 30, y: 0, orient: 'R', len: 12, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
  {
    id: 'FERRITE',
    name: 'Ferrite bead',
    refPrefix: 'FB',
    category: 'Protection',
    tags: ['ferrite', 'emc', 'two_terminal', 'inductor'],
    defaultValue: '600R@100MHz',
    valueKind: 'part',
    keywords: ['ferrite', 'bead', 'emi', 'filter', 'noise'],
    help:
      'Looks like a wire at DC and a resistor at high frequency. Used to keep switching noise out of an analog rail, always with capacitors either side.',
    units: [
      {
        id: 'A',
        graphics: [{ t: 'rect', x: -16, y: -6, w: 32, h: 12, fill: 'body' }],
        pins: [
          { num: '1', name: '~', x: -30, y: 0, orient: 'L', len: 14, type: 'passive' },
          { num: '2', name: '~', x: 30, y: 0, orient: 'R', len: 14, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
  {
    id: 'R_SHUNT',
    name: 'Current-sense shunt',
    refPrefix: 'R',
    category: 'Sensors',
    tags: ['resistor', 'shunt', 'two_terminal', 'sense'],
    defaultValue: '0R1',
    valueUnit: 'Ω',
    valueKind: 'resistance',
    keywords: ['shunt', 'current sense', 'milliohm', 'kelvin'],
    help:
      'A deliberately small, accurate resistance in the current path. V = I·R gives the measurement; keep full-scale drop to 25-100mV so it neither wastes power nor disappears into noise.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -20, y: -8, w: 40, h: 16, fill: 'body' },
          { t: 'text', x: 0, y: 4, s: 'R', size: 8, anchor: 'middle' },
        ],
        pins: [
          { num: '1', name: '~', x: -30, y: 0, orient: 'L', len: 10, type: 'passive' },
          { num: '2', name: '~', x: 30, y: 0, orient: 'R', len: 10, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },

  // -------------------------------------------------------------- isolation
  {
    id: 'OPTO',
    name: 'Optocoupler',
    refPrefix: 'U',
    category: 'Protection',
    tags: ['opto', 'isolation', 'ic'],
    defaultValue: 'PC817',
    valueKind: 'part',
    keywords: ['optocoupler', 'isolation', 'opto', 'pc817', 'ctr'],
    help:
      'An LED shining on a phototransistor. Input side needs a current-limiting resistor; output side needs a pull-up. CTR = I_C/I_F, and it degrades with age: design for the datasheet minimum.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -45, y: -30, w: 90, h: 60, fill: 'body' },
          { t: 'line', pts: [[0, -30], [0, 30]], fill: 'none' },
          { t: 'line', pts: [[-32, -10], [-32, 10], [-18, 0]], fill: 'body' },
          { t: 'line', pts: [[-18, -10], [-18, 10]] },
          { t: 'line', pts: [[-10, -6], [-4, -2]] },
          { t: 'line', pts: [[-10, 2], [-4, 6]] },
          { t: 'line', pts: [[18, -16], [18, 16]] },
          { t: 'line', pts: [[18, -8], [34, -20]] },
          { t: 'line', pts: [[18, 8], [34, 20]] },
        ],
        pins: [
          { num: '1', name: 'A', x: -60, y: -10, orient: 'L', len: 15, type: 'passive' },
          { num: '2', name: 'K', x: -60, y: 10, orient: 'L', len: 15, type: 'passive' },
          { num: '4', name: 'C', x: 60, y: -20, orient: 'R', len: 26, type: 'open_collector' },
          { num: '3', name: 'E', x: 60, y: 20, orient: 'R', len: 26, type: 'passive' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },

  // ------------------------------------------------------------ electromech
  {
    id: 'RELAY',
    name: 'Relay (SPDT)',
    refPrefix: 'K',
    category: 'Mechatronics',
    tags: ['relay', 'inductive', 'switch', 'mechatronics'],
    defaultValue: 'SRD-05VDC',
    valueKind: 'part',
    keywords: ['relay', 'coil', 'contact', 'flyback', 'inductive'],
    help:
      'A coil that moves a contact. The coil is an inductor: interrupting its current produces a large reverse spike, so it always needs a flyback diode across it.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -50, y: -30, w: 34, h: 60, fill: 'body' },
          { t: 'text', x: -33, y: 4, s: 'K', size: 9, anchor: 'middle' },
          { t: 'circle', cx: 20, cy: 20, r: 3 },
          { t: 'circle', cx: 44, cy: 0, r: 3 },
          { t: 'circle', cx: 44, cy: 40, r: 3 },
          { t: 'line', pts: [[20, 20], [42, 2]] },
          { t: 'line', pts: [[-16, 0], [10, 0]], fill: 'none' },
        ],
        pins: [
          { num: '1', name: 'COIL+', x: -60, y: -20, orient: 'L', len: 10, type: 'passive' },
          { num: '2', name: 'COIL-', x: -60, y: 20, orient: 'L', len: 10, type: 'passive' },
          { num: '3', name: 'COM', x: 20, y: 50, orient: 'D', len: 27, type: 'passive' },
          { num: '4', name: 'NO', x: 60, y: 0, orient: 'R', len: 13, type: 'passive' },
          { num: '5', name: 'NC', x: 60, y: 40, orient: 'R', len: 13, type: 'passive' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: false,
  },
  {
    id: 'MOTOR_DC',
    name: 'DC motor',
    refPrefix: 'M',
    category: 'Mechatronics',
    tags: ['motor', 'inductive', 'load', 'mechatronics'],
    defaultValue: 'DC motor',
    valueKind: 'part',
    keywords: ['motor', 'dc', 'load', 'inductive', 'stall'],
    help:
      'An inductive load that draws several times its running current at stall and on start-up. Size the switch for stall current, and never share its supply wiring with logic.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'circle', cx: 0, cy: 0, r: 22, fill: 'body' },
          { t: 'text', x: 0, y: 5, s: 'M', size: 14, anchor: 'middle' },
        ],
        pins: [
          { num: '1', name: '+', x: 0, y: -40, orient: 'U', len: 18, type: 'passive' },
          { num: '2', name: '-', x: 0, y: 40, orient: 'D', len: 18, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
  {
    id: 'BUZZER',
    name: 'Buzzer',
    refPrefix: 'LS',
    category: 'Mechatronics',
    tags: ['buzzer', 'load', 'mechatronics'],
    defaultValue: 'Buzzer',
    valueKind: 'part',
    keywords: ['buzzer', 'sounder', 'piezo', 'alarm'],
    help: 'Magnetic buzzers are inductive and need a flyback diode; piezo types are capacitive and do not.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'path', d: 'M -14 -20 A 20 20 0 0 1 -14 20 Z', fill: 'body' },
          { t: 'line', pts: [[-14, -20], [-14, 20]] },
        ],
        pins: [
          { num: '1', name: '+', x: -30, y: -10, orient: 'L', len: 16, type: 'passive' },
          { num: '2', name: '-', x: -30, y: 10, orient: 'L', len: 16, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
  {
    id: 'XTAL',
    name: 'Crystal',
    refPrefix: 'Y',
    category: 'ICs',
    tags: ['crystal', 'timing', 'two_terminal'],
    defaultValue: '16MHz',
    valueKind: 'part',
    keywords: ['crystal', 'xtal', 'oscillator', 'clock', 'load capacitance'],
    help:
      'Sets clock frequency to ±20ppm. Needs the load capacitors its datasheet specifies: C_L = (C1·C2)/(C1+C2) + C_stray, with C_stray ≈ 3-5pF.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'line', pts: [[-8, -14], [-8, 14]] },
          { t: 'rect', x: -4, y: -12, w: 8, h: 24, fill: 'body' },
          { t: 'line', pts: [[8, -14], [8, 14]] },
        ],
        pins: [
          { num: '1', name: '~', x: -30, y: 0, orient: 'L', len: 22, type: 'passive' },
          { num: '2', name: '~', x: 30, y: 0, orient: 'R', len: 22, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },

  // ---------------------------------------------------------------- analog
  {
    id: 'LM393',
    name: 'LM393: dual comparator',
    refPrefix: 'U',
    category: 'Analog',
    tags: ['comparator', 'ic', 'analog', 'open_collector'],
    defaultValue: 'LM393',
    valueKind: 'part',
    multiUnit: true,
    keywords: ['comparator', 'lm393', 'threshold', 'hysteresis', 'open collector'],
    help:
      'Comparator with an OPEN-COLLECTOR output: it can only pull low, so it needs a pull-up resistor. Add positive feedback for hysteresis, or the output chatters near the threshold.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'line', pts: [[-20, -30], [-20, 30], [30, 0]], fill: 'body' },
          { t: 'text', x: -14, y: -16, s: '−', size: 10 },
          { t: 'text', x: -14, y: 24, s: '+', size: 10 },
        ],
        pins: [
          { num: '2', name: 'IN-', x: -30, y: -20, orient: 'L', len: 10, type: 'input' },
          { num: '3', name: 'IN+', x: -30, y: 20, orient: 'L', len: 10, type: 'input' },
          { num: '1', name: 'OUT', x: 40, y: 0, orient: 'R', len: 10, type: 'open_collector' },
        ],
      },
      {
        id: 'B',
        graphics: [
          { t: 'line', pts: [[-20, -30], [-20, 30], [30, 0]], fill: 'body' },
          { t: 'text', x: -14, y: -16, s: '−', size: 10 },
          { t: 'text', x: -14, y: 24, s: '+', size: 10 },
        ],
        pins: [
          { num: '6', name: 'IN-', x: -30, y: -20, orient: 'L', len: 10, type: 'input' },
          { num: '5', name: 'IN+', x: -30, y: 20, orient: 'L', len: 10, type: 'input' },
          { num: '7', name: 'OUT', x: 40, y: 0, orient: 'R', len: 10, type: 'open_collector' },
        ],
      },
      {
        id: 'PWR',
        isPowerUnit: true,
        graphics: box({ x: -30, y: -20, w: 60, h: 40, label: 'LM393' }),
        pins: [
          { num: '8', name: 'VCC', x: 0, y: -40, orient: 'U', len: 20, type: 'power_in' },
          { num: '4', name: 'GND', x: 0, y: 40, orient: 'D', len: 20, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },
  {
    id: 'INA_SENSE',
    name: 'Current-sense amplifier',
    refPrefix: 'U',
    category: 'Sensors',
    tags: ['ic', 'analog', 'current_sense', 'amplifier'],
    defaultValue: 'INA181',
    valueKind: 'part',
    keywords: ['current sense', 'ina', 'shunt amplifier', 'high side'],
    help:
      'Amplifies the small differential voltage across a shunt while tolerating a large common-mode voltage. Gain is fixed by the part; V_out = gain · I_load · R_shunt (+ V_ref).',
    units: [
      {
        id: 'A',
        graphics: box({ x: -50, y: -40, w: 100, h: 80, label: 'I-SENSE' }),
        pins: [
          { num: '1', name: 'IN+', x: -60, y: -20, orient: 'L', len: 10, type: 'input' },
          { num: '2', name: 'IN-', x: -60, y: 0, orient: 'L', len: 10, type: 'input' },
          { num: '3', name: 'REF', x: -60, y: 20, orient: 'L', len: 10, type: 'input' },
          { num: '4', name: 'OUT', x: 60, y: 0, orient: 'R', len: 10, type: 'output' },
          { num: '5', name: 'VCC', x: 0, y: -50, orient: 'U', len: 10, type: 'power_in' },
          { num: '6', name: 'GND', x: 0, y: 50, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },
  {
    id: '74HC14',
    name: '74HC14: hex Schmitt inverter',
    refPrefix: 'U',
    category: 'Logic',
    tags: ['ic', 'logic', '74hc', 'schmitt', 'not'],
    defaultValue: '74HC14',
    valueKind: 'part',
    multiUnit: true,
    logicFamily: '74HC',
    keywords: ['schmitt', 'trigger', 'hysteresis', 'debounce', '74hc14', 'inverter'],
    help:
      'Inverter with input hysteresis (about 0.9V at 5V): it turns a slow or noisy edge into one clean transition. The correct part to follow an RC debounce filter.',
    units: [
      ...['A', 'B', 'C', 'D', 'E', 'F'].map((id, i) => {
        const pins = [
          { a: '1', y: '2' },
          { a: '3', y: '4' },
          { a: '5', y: '6' },
          { a: '9', y: '8' },
          { a: '11', y: '10' },
          { a: '13', y: '12' },
        ][i];
        return {
          id,
          graphics: [
            { t: 'line', pts: [[-20, -16], [-20, 16], [14, 0]], fill: 'body' },
            { t: 'circle', cx: 18, cy: 0, r: 3, fill: 'body' },
            // Hysteresis glyph inside the triangle.
            { t: 'line', pts: [[-14, 4], [-8, 4], [-8, -4], [-2, -4]] },
          ],
          pins: [
            { num: pins.a, name: 'A', x: -30, y: 0, orient: 'L', len: 10, type: 'input' },
            { num: pins.y, name: 'Y', x: 30, y: 0, orient: 'R', len: 9, type: 'output' },
          ],
        };
      }),
      {
        id: 'PWR',
        isPowerUnit: true,
        graphics: box({ x: -30, y: -20, w: 60, h: 40, label: '74HC14' }),
        pins: [
          { num: '14', name: 'VCC', x: 0, y: -40, orient: 'U', len: 20, type: 'power_in' },
          { num: '7', name: 'GND', x: 0, y: 40, orient: 'D', len: 20, type: 'power_in' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: true,
  },

  // ----------------------------------------------------------------- power
  {
    id: 'LDO_3V3',
    name: 'LDO regulator 3.3V',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'regulator', 'power', 'linear', 'ldo'],
    defaultValue: 'AMS1117-3.3',
    valueKind: 'part',
    keywords: ['ldo', 'regulator', '3v3', 'low dropout'],
    help:
      'Low-dropout linear regulator. Needs its specified output capacitor (often 10µF with a minimum ESR window) to stay stable: this is not optional decoration.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -40, y: -30, w: 80, h: 70, label: 'LDO' }),
        pins: [
          { num: '1', name: 'IN', x: -50, y: 0, orient: 'L', len: 10, type: 'power_in' },
          { num: '3', name: 'OUT', x: 50, y: 0, orient: 'R', len: 10, type: 'power_out' },
          { num: '2', name: 'GND', x: 0, y: 50, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },
  {
    id: 'BUCK_IC',
    name: 'Buck converter IC',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'regulator', 'power', 'switching', 'buck'],
    defaultValue: 'MP1584',
    valueKind: 'part',
    keywords: ['buck', 'switching', 'smps', 'step down', 'efficiency'],
    help:
      'Step-down switching regulator. V_out = D·V_in, set by the feedback divider: V_out = V_FB·(1 + R_top/R_bottom), with V_FB typically 0.8V. Needs an inductor on SW and tight input capacitor placement.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -50, y: -50, w: 100, h: 100, label: 'BUCK' }),
        pins: [
          { num: '1', name: 'VIN', x: -60, y: -20, orient: 'L', len: 10, type: 'power_in' },
          { num: '2', name: 'EN', x: -60, y: 20, orient: 'L', len: 10, type: 'input' },
          { num: '3', name: 'SW', x: 60, y: -20, orient: 'R', len: 10, type: 'output' },
          { num: '4', name: 'FB', x: 60, y: 20, orient: 'R', len: 10, type: 'input' },
          { num: '5', name: 'GND', x: 0, y: 60, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },
  {
    id: 'HBRIDGE',
    name: 'H-bridge motor driver',
    refPrefix: 'U',
    category: 'Mechatronics',
    tags: ['ic', 'driver', 'motor', 'mechatronics', 'hbridge'],
    defaultValue: 'DRV8871',
    valueKind: 'part',
    keywords: ['h-bridge', 'motor driver', 'l293', 'drv8871', 'pwm'],
    help:
      'Drives a motor in both directions from logic inputs. Needs a separate motor supply with bulk capacitance, a common ground with the logic, and its own thermal path.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -60, y: -50, w: 120, h: 100, label: 'H-BRIDGE' }),
        pins: [
          { num: '1', name: 'IN1', x: -70, y: -20, orient: 'L', len: 10, type: 'input' },
          { num: '2', name: 'IN2', x: -70, y: 0, orient: 'L', len: 10, type: 'input' },
          { num: '3', name: 'nSLEEP', x: -70, y: 20, orient: 'L', len: 10, type: 'input' },
          { num: '4', name: 'OUT1', x: 70, y: -20, orient: 'R', len: 10, type: 'output' },
          { num: '5', name: 'OUT2', x: 70, y: 20, orient: 'R', len: 10, type: 'output' },
          { num: '6', name: 'VM', x: 0, y: -60, orient: 'U', len: 10, type: 'power_in' },
          { num: '7', name: 'GND', x: 0, y: 60, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },

  // ----------------------------------------------------------------- comms
  {
    id: 'RS485',
    name: 'RS-485 transceiver',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'comms', 'rs485', 'transceiver'],
    defaultValue: 'MAX3485',
    valueKind: 'part',
    keywords: ['rs485', 'differential', 'transceiver', 'termination', 'bus'],
    help:
      'Differential bus transceiver for long cable runs. Needs 120Ω termination at each end of the bus and idle bias resistors so the line is defined when nobody drives it.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -50, y: -50, w: 100, h: 100, label: 'RS-485' }),
        pins: [
          { num: '1', name: 'RO', x: -60, y: -30, orient: 'L', len: 10, type: 'output' },
          { num: '2', name: 'nRE', x: -60, y: -10, orient: 'L', len: 10, type: 'input' },
          { num: '3', name: 'DE', x: -60, y: 10, orient: 'L', len: 10, type: 'input' },
          { num: '4', name: 'DI', x: -60, y: 30, orient: 'L', len: 10, type: 'input' },
          { num: '6', name: 'A', x: 60, y: -10, orient: 'R', len: 10, type: 'bidirectional' },
          { num: '7', name: 'B', x: 60, y: 10, orient: 'R', len: 10, type: 'bidirectional' },
          { num: '8', name: 'VCC', x: 0, y: -60, orient: 'U', len: 10, type: 'power_in' },
          { num: '5', name: 'GND', x: 0, y: 60, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },

  // ------------------------------------------------------------ connectors
  {
    id: 'CONN_3',
    name: '3-pin connector',
    refPrefix: 'J',
    category: 'Connectors',
    tags: ['connector', 'header', 'port'],
    defaultValue: 'Conn_01x03',
    valueKind: 'part',
    keywords: ['connector', 'header', 'sensor', 'servo'],
    help: 'Three-wire off-board connection: typically supply, signal and ground.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -10, y: -35, w: 20, h: 70, fill: 'body' },
          { t: 'circle', cx: -4, cy: -20, r: 3 },
          { t: 'circle', cx: -4, cy: 0, r: 3 },
          { t: 'circle', cx: -4, cy: 20, r: 3 },
        ],
        pins: [
          { num: '1', name: '1', x: -30, y: -20, orient: 'L', len: 20, type: 'passive' },
          { num: '2', name: '2', x: -30, y: 0, orient: 'L', len: 20, type: 'passive' },
          { num: '3', name: '3', x: -30, y: 20, orient: 'L', len: 20, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: true,
  },
  {
    id: 'TESTPOINT',
    name: 'Test point',
    refPrefix: 'TP',
    category: 'Connectors',
    tags: ['testpoint', 'connector'],
    defaultValue: 'TP',
    valueKind: 'part',
    keywords: ['test point', 'probe', 'debug', 'bring-up'],
    help: 'A pad to put a probe on. Free to add, invaluable during bring-up: put them on every rail and every reference.',
    units: [
      {
        id: 'A',
        graphics: [{ t: 'circle', cx: 0, cy: -14, r: 5 }],
        pins: [{ num: '1', name: 'TP', x: 0, y: 0, orient: 'D', len: 9, type: 'passive' }],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
];
