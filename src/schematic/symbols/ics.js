/**
 * Integrated circuits with a rectangular body: timers, regulators, shift
 * registers, a small MCU, plus the sensor parts used from tier 5 onward.
 *
 * Bodies are laid out functionally (inputs left, outputs right, supply top,
 * ground bottom) the way an EDA symbol is drawn, rather than as a physical
 * DIP pin-order picture.
 */

/** Helper: build a rectangular IC body with pins on the four sides. */
function box({ x, y, w, h, label, labelSize = 9 }) {
  return [
    { t: 'rect', x, y, w, h, fill: 'body' },
    ...(label ? [{ t: 'text', x: x + w / 2, y: y + 12, s: label, size: labelSize, anchor: 'middle' }] : []),
  ];
}

export const icSymbols = [
  {
    id: 'NE555',
    name: 'NE555: timer',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'timer', '555'],
    defaultValue: 'NE555',
    valueKind: 'part',
    keywords: ['555', 'timer', 'astable', 'monostable', 'oscillator', 'pwm'],
    help:
      'Classic timer. Astable: t_high = 0.693·(R1+R2)·C, t_low = 0.693·R2·C, f = 1.44/((R1+2·R2)·C). Monostable: t = 1.1·R·C. CTRL (5) wants a 10nF cap to GND.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -50, y: -50, w: 100, h: 100, label: 'NE555' }),
        pins: [
          { num: '4', name: 'RST', x: -60, y: -30, orient: 'L', len: 10, type: 'input' },
          { num: '2', name: 'TRIG', x: -60, y: -10, orient: 'L', len: 10, type: 'input' },
          { num: '6', name: 'THR', x: -60, y: 10, orient: 'L', len: 10, type: 'input' },
          // CTRL is internally held at 2/3 VCC by the 555's own divider, so it
          // is an analog node rather than a logic input, typing it 'passive'
          // stops the ERC from calling the standard 10nF-to-GND cap a floating
          // input.
          { num: '5', name: 'CTRL', x: -60, y: 30, orient: 'L', len: 10, type: 'passive' },
          { num: '3', name: 'OUT', x: 60, y: -10, orient: 'R', len: 10, type: 'output' },
          { num: '7', name: 'DIS', x: 60, y: 10, orient: 'R', len: 10, type: 'open_collector' },
          { num: '8', name: 'VCC', x: 0, y: -60, orient: 'U', len: 10, type: 'power_in' },
          { num: '1', name: 'GND', x: 0, y: 60, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },

  {
    id: 'LM7805',
    name: 'LM7805: 5V linear regulator',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'regulator', 'power', 'linear'],
    defaultValue: 'LM7805',
    valueKind: 'part',
    keywords: ['7805', 'regulator', 'ldo', 'linear', 'power supply', '5v'],
    help:
      'Fixed +5V linear regulator. Needs ≥7V in (2V dropout), a bulk cap on the input (≈0.33µF min, 10µF typical) and 0.1µF on the output. Dissipates (Vin−5V)·Iout as heat.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -40, y: -30, w: 80, h: 70, label: '7805' }),
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
    id: '74HC595',
    name: '74HC595: 8-bit shift register',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'logic', 'shift_register', '74hc'],
    defaultValue: '74HC595',
    valueKind: 'part',
    keywords: ['595', 'shift register', 'serial', 'spi', 'expander', 'latch'],
    help:
      'Serial-in / parallel-out shift register. Clock data in on SRCLK, latch it to the outputs with RCLK. /OE must be tied low to enable the outputs; /SRCLR must be tied high.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -60, y: -90, w: 120, h: 190, label: '74HC595' }),
        pins: [
          { num: '14', name: 'SER', x: -70, y: -60, orient: 'L', len: 10, type: 'input' },
          { num: '11', name: 'SRCLK', x: -70, y: -30, orient: 'L', len: 10, type: 'input' },
          { num: '12', name: 'RCLK', x: -70, y: 0, orient: 'L', len: 10, type: 'input' },
          { num: '13', name: '/OE', x: -70, y: 30, orient: 'L', len: 10, type: 'input' },
          { num: '10', name: '/SRCLR', x: -70, y: 60, orient: 'L', len: 10, type: 'input' },
          { num: '15', name: 'QA', x: 70, y: -70, orient: 'R', len: 10, type: 'output' },
          { num: '1', name: 'QB', x: 70, y: -50, orient: 'R', len: 10, type: 'output' },
          { num: '2', name: 'QC', x: 70, y: -30, orient: 'R', len: 10, type: 'output' },
          { num: '3', name: 'QD', x: 70, y: -10, orient: 'R', len: 10, type: 'output' },
          { num: '4', name: 'QE', x: 70, y: 10, orient: 'R', len: 10, type: 'output' },
          { num: '5', name: 'QF', x: 70, y: 30, orient: 'R', len: 10, type: 'output' },
          { num: '6', name: 'QG', x: 70, y: 50, orient: 'R', len: 10, type: 'output' },
          { num: '7', name: 'QH', x: 70, y: 70, orient: 'R', len: 10, type: 'output' },
          { num: '9', name: 'QH*', x: 70, y: 90, orient: 'R', len: 10, type: 'output' },
          { num: '16', name: 'VCC', x: 0, y: -100, orient: 'U', len: 10, type: 'power_in' },
          { num: '8', name: 'GND', x: 0, y: 110, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },

  {
    id: 'ATTINY85',
    name: 'ATtiny85: 8-pin MCU',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'mcu', 'microcontroller', 'avr'],
    defaultValue: 'ATtiny85',
    valueKind: 'part',
    keywords: ['attiny', 'mcu', 'microcontroller', 'avr', 'gpio', 'i2c', 'spi'],
    help:
      'Small AVR MCU. VCC 2.7-5.5V, needs a 100nF decoupling cap right at pin 8. /RESET (pin 1) must be pulled up (10k) unless used as an I/O. PB0/PB2 carry the I²C (SDA/SCL) and SPI pins.',
    units: [
      {
        id: 'A',
        graphics: box({ x: -50, y: -60, w: 100, h: 120, label: 'ATtiny85' }),
        pins: [
          { num: '1', name: '/RST', x: -60, y: -40, orient: 'L', len: 10, type: 'input' },
          { num: '2', name: 'PB3', x: -60, y: -20, orient: 'L', len: 10, type: 'bidirectional' },
          { num: '3', name: 'PB4', x: -60, y: 0, orient: 'L', len: 10, type: 'bidirectional' },
          { num: '5', name: 'PB0/SDA', x: 60, y: -40, orient: 'R', len: 10, type: 'bidirectional' },
          { num: '6', name: 'PB1', x: 60, y: -20, orient: 'R', len: 10, type: 'bidirectional' },
          { num: '7', name: 'PB2/SCL', x: 60, y: 0, orient: 'R', len: 10, type: 'bidirectional' },
          { num: '8', name: 'VCC', x: 0, y: -70, orient: 'U', len: 10, type: 'power_in' },
          { num: '4', name: 'GND', x: 0, y: 70, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },

  {
    id: 'I2C_DEV',
    name: 'I²C peripheral (generic)',
    refPrefix: 'U',
    category: 'ICs',
    tags: ['ic', 'i2c', 'peripheral', 'sensor'],
    defaultValue: 'I2C_DEV',
    valueKind: 'part',
    keywords: ['i2c', 'sda', 'scl', 'peripheral', 'slave', 'sensor'],
    help:
      'Generic I²C target device. SDA/SCL are open-drain: the bus only returns high through external pull-ups (typically 4.7k at 100kHz).',
    units: [
      {
        id: 'A',
        graphics: box({ x: -50, y: -50, w: 100, h: 100, label: 'I²C dev' }),
        pins: [
          { num: '1', name: 'SDA', x: -60, y: -20, orient: 'L', len: 10, type: 'open_collector' },
          { num: '2', name: 'SCL', x: -60, y: 20, orient: 'L', len: 10, type: 'open_collector' },
          { num: '4', name: 'VCC', x: 0, y: -60, orient: 'U', len: 10, type: 'power_in' },
          { num: '3', name: 'GND', x: 0, y: 60, orient: 'D', len: 10, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },
];

export const sensorSymbols = [
  {
    id: 'NTC',
    name: 'Thermistor (NTC)',
    refPrefix: 'TH',
    category: 'Sensors',
    tags: ['sensor', 'thermistor', 'resistor', 'two_terminal'],
    defaultValue: '10k',
    valueUnit: 'Ω',
    valueKind: 'resistance',
    keywords: ['thermistor', 'ntc', 'temperature', 'sensor'],
    help:
      'Resistance falls as temperature rises. Read it by making it one leg of a divider against a fixed resistor of similar value.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -20, y: -8, w: 40, h: 16, fill: 'body' },
          { t: 'line', pts: [[-26, 14], [-14, 14], [22, -14]] },
          { t: 'text', x: -24, y: -12, s: 't°', size: 8 },
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
    id: 'LDR',
    name: 'Photoresistor (LDR)',
    refPrefix: 'R',
    category: 'Sensors',
    tags: ['sensor', 'ldr', 'resistor', 'two_terminal'],
    defaultValue: '10k',
    valueUnit: 'Ω',
    valueKind: 'resistance',
    keywords: ['ldr', 'photoresistor', 'light', 'sensor', 'cds'],
    help: 'Resistance falls with increasing light. Same divider treatment as a thermistor.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -20, y: -8, w: 40, h: 16, fill: 'body' },
          { t: 'line', pts: [[-14, -26], [-6, -14]] },
          { t: 'line', pts: [[-10, -16], [-6, -14], [-8, -20]], fill: 'solid' },
          { t: 'line', pts: [[0, -26], [8, -14]] },
          { t: 'line', pts: [[4, -16], [8, -14], [6, -20]], fill: 'solid' },
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
    id: 'TMP36',
    name: 'TMP36: analog temp sensor',
    refPrefix: 'U',
    category: 'Sensors',
    tags: ['sensor', 'analog', 'ic', 'temperature'],
    defaultValue: 'TMP36',
    valueKind: 'part',
    keywords: ['tmp36', 'temperature', 'analog sensor', 'ratiometric'],
    help:
      'Analog temperature sensor: Vout = 0.5V + 10mV/°C, valid from 2.7-5.5V supply. Output impedance is high: buffer it before driving anything but an ADC input.',
    units: [
      {
        id: 'A',
        graphics: [
          { t: 'rect', x: -40, y: -30, w: 80, h: 60, fill: 'body' },
          { t: 'text', x: 0, y: -8, s: 'TMP36', size: 9, anchor: 'middle' },
        ],
        pins: [
          { num: '1', name: 'VCC', x: 0, y: -50, orient: 'U', len: 20, type: 'power_in' },
          { num: '2', name: 'OUT', x: 50, y: 0, orient: 'R', len: 10, type: 'output' },
          { num: '3', name: 'GND', x: 0, y: 50, orient: 'D', len: 20, type: 'power_in' },
        ],
      },
    ],
    showPinNames: true,
    showPinNumbers: true,
  },
];
