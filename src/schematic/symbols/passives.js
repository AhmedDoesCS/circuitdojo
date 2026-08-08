/**
 * Passive + discrete symbols.
 *
 * Every symbol is described in schematic units (GRID = 10). Pin connection
 * points are always multiples of 10 so they stay on-grid through rotation.
 *
 * Graphics primitives understood by <SymbolView/>:
 *   {t:'line', pts:[[x,y],...], fill?}   polyline / polygon (fill: 'body'|'solid'|'none')
 *   {t:'rect', x,y,w,h, fill?}
 *   {t:'circle', cx,cy,r, fill?}
 *   {t:'path', d, fill?}
 *   {t:'text', x,y, s, size?, anchor?, tone?}
 *
 * Pin electrical types drive the ERC and must be honest:
 *   passive | input | output | bidirectional | power_in | power_out |
 *   open_collector | tri_state | unspecified | no_connect
 */

export const passiveSymbols = [
  {
    id: 'R',
    name: 'Resistor',
    refPrefix: 'R',
    category: 'Passives',
    tags: ['resistor', 'passive', 'two_terminal'],
    defaultValue: '10k',
    valueUnit: 'Ω',
    valueKind: 'resistance',
    keywords: ['resistor', 'r', 'ohm', 'pull-up', 'pull-down', 'limiter'],
    help: 'Ohm\'s law device. V = I·R. Used for current limiting, pull-up/pull-down, biasing and dividers.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-20, 0],
              [-16, -7],
              [-8, 7],
              [0, -7],
              [8, 7],
              [16, -7],
              [20, 0],
            ],
          },
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

  {
    id: 'R_POT',
    name: 'Potentiometer',
    refPrefix: 'RV',
    category: 'Passives',
    tags: ['potentiometer', 'resistor', 'passive'],
    defaultValue: '10k',
    valueUnit: 'Ω',
    valueKind: 'resistance',
    keywords: ['pot', 'potentiometer', 'variable resistor', 'trimmer', 'divider'],
    help: 'Three-terminal adjustable divider. Wiper (pin 2) taps anywhere between the two ends.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-20, 0],
              [-16, -7],
              [-8, 7],
              [0, -7],
              [8, 7],
              [16, -7],
              [20, 0],
            ],
          },
          {
            t: 'line',
            pts: [
              [0, -20],
              [0, -12],
            ],
          },
          {
            t: 'line',
            pts: [
              [-4, -20],
              [0, -12],
              [4, -20],
            ],
            fill: 'solid',
          },
        ],
        pins: [
          { num: '1', name: 'A', x: -30, y: 0, orient: 'L', len: 10, type: 'passive' },
          { num: '2', name: 'W', x: 0, y: -30, orient: 'U', len: 10, type: 'passive' },
          { num: '3', name: 'B', x: 30, y: 0, orient: 'R', len: 10, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: true,
  },

  {
    id: 'C',
    name: 'Capacitor (non-polarized)',
    refPrefix: 'C',
    category: 'Passives',
    tags: ['capacitor', 'passive', 'two_terminal', 'nonpolarized'],
    defaultValue: '100n',
    valueUnit: 'F',
    valueKind: 'capacitance',
    keywords: ['capacitor', 'cap', 'decoupling', 'bypass', 'filter', 'ceramic'],
    help: 'Blocks DC, passes AC. Xc = 1/(2πfC). 100nF ceramic is the standard IC decoupling part.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-5, -12],
              [-5, 12],
            ],
          },
          {
            t: 'line',
            pts: [
              [5, -12],
              [5, 12],
            ],
          },
        ],
        pins: [
          // Pins sit on grid multiples so they still land on intersections
          // after a 90° rotation, the audit test enforces this.
          { num: '1', name: '~', x: -30, y: 0, orient: 'L', len: 25, type: 'passive' },
          { num: '2', name: '~', x: 30, y: 0, orient: 'R', len: 25, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },

  {
    id: 'C_POL',
    name: 'Capacitor (polarized)',
    refPrefix: 'C',
    category: 'Passives',
    tags: ['capacitor', 'passive', 'two_terminal', 'polarized'],
    defaultValue: '10u',
    valueUnit: 'F',
    valueKind: 'capacitance',
    polarized: true,
    keywords: ['electrolytic', 'polarized', 'bulk', 'reservoir', 'capacitor'],
    help: 'Electrolytic/tantalum bulk capacitor. Pin 1 (+) must sit at the higher potential or it fails, often violently.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-5, -12],
              [-5, 12],
            ],
          },
          { t: 'path', d: 'M 5 -12 Q 14 0 5 12' },
          { t: 'text', x: -16, y: -10, s: '+', size: 9 },
        ],
        pins: [
          { num: '1', name: '+', x: -30, y: 0, orient: 'L', len: 25, type: 'passive' },
          { num: '2', name: '-', x: 30, y: 0, orient: 'R', len: 25, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },

  {
    id: 'L',
    name: 'Inductor',
    refPrefix: 'L',
    category: 'Passives',
    tags: ['inductor', 'passive', 'two_terminal'],
    defaultValue: '10u',
    valueUnit: 'H',
    valueKind: 'inductance',
    keywords: ['inductor', 'coil', 'choke', 'ferrite'],
    help: 'Opposes change in current. V = L·di/dt. Used in filters and switching supplies.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'path',
            d: 'M -20 0 A 5 5 0 0 1 -10 0 A 5 5 0 0 1 0 0 A 5 5 0 0 1 10 0 A 5 5 0 0 1 20 0',
          },
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

  {
    id: 'D',
    name: 'Diode',
    refPrefix: 'D',
    category: 'Discretes',
    tags: ['diode', 'two_terminal', 'polarized'],
    defaultValue: '1N4148',
    valueKind: 'part',
    polarized: true,
    keywords: ['diode', 'rectifier', 'flyback', '1n4148', '1n4007'],
    help: 'Conducts anode→cathode above ~0.7V (silicon). Cathode is the barred end.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-10, -10],
              [-10, 10],
              [10, 0],
            ],
            fill: 'body',
          },
          {
            t: 'line',
            pts: [
              [10, -10],
              [10, 10],
            ],
          },
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
    id: 'D_LED',
    name: 'LED',
    refPrefix: 'D',
    category: 'Discretes',
    tags: ['led', 'diode', 'two_terminal', 'polarized'],
    defaultValue: 'LED',
    valueKind: 'part',
    polarized: true,
    keywords: ['led', 'light', 'indicator', 'forward voltage'],
    help: 'Light-emitting diode. Needs a series current-limiting resistor: R = (Vsupply − Vf) / If.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-10, -10],
              [-10, 10],
              [10, 0],
            ],
            fill: 'body',
          },
          {
            t: 'line',
            pts: [
              [10, -10],
              [10, 10],
            ],
          },
          {
            t: 'line',
            pts: [
              [-2, -14],
              [6, -22],
            ],
          },
          {
            t: 'line',
            pts: [
              [2, -22],
              [6, -22],
              [6, -18],
            ],
            fill: 'solid',
          },
          {
            t: 'line',
            pts: [
              [6, -14],
              [14, -22],
            ],
          },
          {
            t: 'line',
            pts: [
              [10, -22],
              [14, -22],
              [14, -18],
            ],
            fill: 'solid',
          },
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
    id: 'D_ZENER',
    name: 'Zener diode',
    refPrefix: 'D',
    category: 'Discretes',
    tags: ['zener', 'diode', 'two_terminal', 'polarized'],
    defaultValue: '5V1',
    valueKind: 'part',
    polarized: true,
    keywords: ['zener', 'clamp', 'shunt regulator', 'reference'],
    help: 'Conducts in reverse above its Zener voltage: used as a clamp or crude shunt reference.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-10, -10],
              [-10, 10],
              [10, 0],
            ],
            fill: 'body',
          },
          {
            t: 'line',
            pts: [
              [16, -14],
              [10, -10],
              [10, 10],
              [4, 14],
            ],
          },
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
    id: 'SW_SPST',
    name: 'Switch SPST',
    refPrefix: 'SW',
    category: 'Switches',
    tags: ['switch', 'spst', 'two_terminal', 'zero_impedance'],
    defaultValue: 'SPST',
    valueKind: 'part',
    zeroImpedance: true,
    keywords: ['switch', 'spst', 'toggle', 'on off'],
    help: 'Simple on/off contact. Closed, it is a wire, never place one directly across a supply and ground.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'circle', cx: -15, cy: 0, r: 3 },
          { t: 'circle', cx: 15, cy: 0, r: 3 },
          {
            t: 'line',
            pts: [
              [-13, -2],
              [14, -14],
            ],
          },
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
    id: 'SW_PUSH',
    name: 'Pushbutton (NO)',
    refPrefix: 'SW',
    category: 'Switches',
    tags: ['switch', 'pushbutton', 'two_terminal', 'zero_impedance'],
    defaultValue: 'SW_PUSH',
    valueKind: 'part',
    zeroImpedance: true,
    keywords: ['button', 'pushbutton', 'momentary', 'tactile', 'debounce'],
    help: 'Normally-open momentary contact. Mechanically bounces for ~1-10ms: hence RC or firmware debouncing.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-15, 0],
              [-15, -8],
            ],
          },
          {
            t: 'line',
            pts: [
              [15, 0],
              [15, -8],
            ],
          },
          {
            t: 'line',
            pts: [
              [-19, -12],
              [19, -12],
            ],
          },
          {
            t: 'line',
            pts: [
              [0, -12],
              [0, -20],
            ],
          },
          {
            t: 'line',
            pts: [
              [-8, -20],
              [8, -20],
            ],
          },
        ],
        pins: [
          { num: '1', name: '~', x: -30, y: 0, orient: 'L', len: 15, type: 'passive' },
          { num: '2', name: '~', x: 30, y: 0, orient: 'R', len: 15, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },

  {
    id: 'SW_SPDT',
    name: 'Switch SPDT',
    refPrefix: 'SW',
    category: 'Switches',
    tags: ['switch', 'spdt', 'zero_impedance'],
    defaultValue: 'SPDT',
    valueKind: 'part',
    zeroImpedance: true,
    // Changeover: COM reaches one throw or the other, never both. Without this
    // the DC graph meshes all three pins and an SPDT selecting between a rail
    // and ground reads as a dead short.
    commonPin: 'COM',
    keywords: ['spdt', 'changeover', 'selector', 'switch'],
    help: 'Common terminal selects one of two throws: a clean way to drive a logic input high or low with no float.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'circle', cx: -15, cy: 0, r: 3 },
          { t: 'circle', cx: 15, cy: -10, r: 3 },
          { t: 'circle', cx: 15, cy: 10, r: 3 },
          {
            t: 'line',
            pts: [
              [-13, -1],
              [13, -9],
            ],
          },
        ],
        pins: [
          { num: '1', name: 'COM', x: -30, y: 0, orient: 'L', len: 12, type: 'passive' },
          { num: '2', name: 'NC', x: 30, y: -10, orient: 'R', len: 12, type: 'passive' },
          { num: '3', name: 'NO', x: 30, y: 10, orient: 'R', len: 12, type: 'passive' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: false,
  },

  {
    id: 'Q_NPN',
    name: 'NPN transistor',
    refPrefix: 'Q',
    category: 'Discretes',
    tags: ['transistor', 'npn', 'bjt'],
    defaultValue: '2N3904',
    valueKind: 'part',
    keywords: ['transistor', 'npn', 'bjt', 'switch', 'driver', '2n3904'],
    help: 'Base current controls collector current (Ic ≈ β·Ib). As a low-side switch, always drive the base through a resistor.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [0, -16],
              [0, 16],
            ],
          },
          {
            t: 'line',
            pts: [
              [-20, 0],
              [0, 0],
            ],
          },
          {
            t: 'line',
            pts: [
              [0, -8],
              [20, -22],
            ],
          },
          {
            t: 'line',
            pts: [
              [0, 8],
              [20, 22],
            ],
          },
          {
            t: 'line',
            pts: [
              [12, 12],
              [20, 22],
              [10, 20],
            ],
            fill: 'solid',
          },
        ],
        pins: [
          { num: '1', name: 'B', x: -30, y: 0, orient: 'L', len: 10, type: 'input' },
          { num: '2', name: 'C', x: 20, y: -40, orient: 'U', len: 18, type: 'passive' },
          { num: '3', name: 'E', x: 20, y: 40, orient: 'D', len: 18, type: 'passive' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: false,
  },

  {
    id: 'CONN_2',
    name: '2-pin connector',
    refPrefix: 'J',
    category: 'Connectors',
    tags: ['connector', 'header', 'port'],
    defaultValue: 'Conn_01x02',
    valueKind: 'part',
    keywords: ['connector', 'header', 'terminal', 'load', 'input', 'output'],
    help: 'Off-board connection: a load, a sensor, or an external signal source.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -10, y: -25, w: 20, h: 50, fill: 'body' },
          { t: 'circle', cx: -4, cy: -10, r: 3 },
          { t: 'circle', cx: -4, cy: 10, r: 3 },
        ],
        pins: [
          { num: '1', name: '1', x: -30, y: -10, orient: 'L', len: 20, type: 'passive' },
          { num: '2', name: '2', x: -30, y: 10, orient: 'L', len: 20, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: true,
  },

  {
    id: 'V_AC',
    name: 'AC signal source',
    refPrefix: 'V',
    category: 'Sources',
    tags: ['source', 'ac', 'signal'],
    defaultValue: '1Vpp',
    valueKind: 'part',
    keywords: ['source', 'signal', 'sine', 'generator', 'input'],
    help: 'Idealised input signal for analog challenges. Pin 1 is the signal, pin 2 its return.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'circle', cx: 0, cy: 0, r: 20, fill: 'body' },
          { t: 'path', d: 'M -11 0 Q -5.5 -12 0 0 Q 5.5 12 11 0' },
        ],
        pins: [
          { num: '1', name: '+', x: 0, y: -40, orient: 'U', len: 20, type: 'output' },
          { num: '2', name: '-', x: 0, y: 40, orient: 'D', len: 20, type: 'passive' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },

  {
    id: 'V_DC',
    name: 'DC source / battery',
    refPrefix: 'BT',
    category: 'Sources',
    tags: ['source', 'dc', 'battery', 'supply'],
    defaultValue: '9V',
    valueUnit: 'V',
    valueKind: 'voltage',
    polarized: true,
    keywords: ['battery', 'supply', 'dc', 'cell', 'power'],
    help: 'DC supply. Pin 1 (+) is the positive terminal; pin 2 (−) normally goes to your ground net.',
    units: [
      {
        id: 'A',
        graphics: [
          {
            t: 'line',
            pts: [
              [-14, -8],
              [14, -8],
            ],
          },
          {
            t: 'line',
            pts: [
              [-7, 0],
              [7, 0],
            ],
          },
          {
            t: 'line',
            pts: [
              [-14, 8],
              [14, 8],
            ],
          },
          {
            t: 'line',
            pts: [
              [-7, 16],
              [7, 16],
            ],
          },
          { t: 'text', x: -22, y: -14, s: '+', size: 9 },
        ],
        pins: [
          { num: '1', name: '+', x: 0, y: -40, orient: 'U', len: 32, type: 'power_out' },
          { num: '2', name: '-', x: 0, y: 40, orient: 'D', len: 24, type: 'power_out' },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  },
];
