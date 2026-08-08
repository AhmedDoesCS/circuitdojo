/**
 * Power symbols.
 *
 * These are NOT text labels. A power symbol carries a `power` descriptor, and
 * the netlist extractor merges every power symbol with the same netName into
 * one global net regardless of where it sits on the sheet. A plain net label
 * (item kind 'label') also merges by name, but it does not count as a supply
 * for ERC, and it does not tell the reader "this is a rail".
 *
 * That distinction is deliberately modelled because students constantly
 * conflate the two, then wonder why their IC's VCC pin reads as unpowered.
 */

function powerSymbol({ id, name, netName, kind, voltage, keywords, help }) {
  const isGround = kind === 'ground';
  const graphics = isGround
    ? [
        { t: 'line', pts: [[0, 0], [0, 10]] },
        { t: 'line', pts: [[-14, 10], [14, 10]] },
        { t: 'line', pts: [[-9, 15], [9, 15]] },
        { t: 'line', pts: [[-4, 20], [4, 20]] },
      ]
    : [
        { t: 'line', pts: [[0, 0], [0, -12]] },
        { t: 'line', pts: [[-12, -12], [12, -12]] },
      ];

  return {
    id,
    name,
    refPrefix: '#PWR',
    category: 'Power',
    tags: ['power', isGround ? 'ground' : 'supply'],
    defaultValue: netName,
    valueKind: 'net',
    isPower: true,
    power: { netName, kind, voltage },
    keywords,
    help,
    // The visible caption is the net name, drawn by the renderer above/below the bar.
    labelOffset: isGround ? 30 : -18,
    units: [
      {
        id: 'A',
        graphics,
        pins: [
          {
            num: '1',
            name: netName,
            x: 0,
            y: 0,
            orient: isGround ? 'U' : 'D',
            len: 0,
            type: 'power_out',
            hideStub: true,
          },
        ],
      },
    ],
    showPinNames: false,
    showPinNumbers: false,
  };
}

export const powerSymbols = [
  powerSymbol({
    id: 'PWR_GND',
    name: 'GND',
    netName: 'GND',
    kind: 'ground',
    voltage: 0,
    keywords: ['gnd', 'ground', '0v', 'return', 'common'],
    help: 'The 0V reference every other voltage is measured against. Every supply needs a return path to it.',
  }),
  powerSymbol({
    id: 'PWR_5V',
    name: '+5V',
    netName: '+5V',
    kind: 'supply',
    voltage: 5,
    keywords: ['5v', 'vcc', 'supply', 'rail'],
    help: '+5V rail. Standard for 74HC logic and classic 5V microcontrollers.',
  }),
  powerSymbol({
    id: 'PWR_3V3',
    name: '+3V3',
    netName: '+3V3',
    kind: 'supply',
    voltage: 3.3,
    keywords: ['3v3', '3.3v', 'supply', 'rail'],
    help: '+3.3V rail. Most modern MCUs and sensors run here: mind level shifting when mixing with 5V parts.',
  }),
  powerSymbol({
    id: 'PWR_12V',
    name: '+12V',
    netName: '+12V',
    kind: 'supply',
    voltage: 12,
    keywords: ['12v', 'supply', 'rail', 'motor'],
    help: '+12V rail: typical unregulated input to a linear regulator, or an op-amp positive supply.',
  }),
  powerSymbol({
    id: 'PWR_N12V',
    name: '-12V',
    netName: '-12V',
    kind: 'supply',
    voltage: -12,
    keywords: ['-12v', 'negative', 'dual supply', 'vee'],
    help: 'Negative rail for dual-supply op-amp circuits, letting the output swing below 0V.',
  }),
  powerSymbol({
    id: 'PWR_VCC',
    name: 'VCC',
    netName: 'VCC',
    kind: 'supply',
    voltage: null,
    keywords: ['vcc', 'vdd', 'supply', 'generic rail'],
    help: 'Generic positive supply rail when the exact voltage is not the point of the exercise.',
  }),
];
