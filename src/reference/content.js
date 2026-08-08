/**
 * On-demand reference material.
 *
 * Deliberately NOT injected into the challenge flow, the learner opens this
 * when they choose to. Content is written as quick-reference cards, the way a
 * bench notebook is, not as lessons.
 */

export const REFERENCE = [
  {
    id: 'ohms_law',
    title: "Ohm's law and power",
    tags: ['ohm', 'resistor', 'current', 'voltage', 'power', 'watt'],
    body: [
      { kind: 'formula', text: 'V = I · R      I = V / R      R = V / I' },
      { kind: 'formula', text: 'P = V · I = I²·R = V²/R' },
      {
        kind: 'note',
        text: 'Series resistors add: R = R1 + R2. Parallel resistors: 1/R = 1/R1 + 1/R2 (two equal resistors in parallel halve the value).',
      },
      {
        kind: 'note',
        text: 'A resistor in a signal path sets current. A resistor from a node to a rail sets that node\'s idle voltage. Same part, entirely different job, which one you are drawing matters more than the value.',
      },
    ],
  },
  {
    id: 'led_sizing',
    title: 'LED current-limiting resistors',
    tags: ['led', 'forward voltage', 'vf', 'current limit', 'indicator'],
    body: [
      { kind: 'formula', text: 'R = (V_supply − V_f) / I_target' },
      {
        kind: 'table',
        head: ['LED colour', 'Typical Vf', 'Typical current'],
        rows: [
          ['Red', '1.8: 2.0 V', '5: 20 mA'],
          ['Yellow', '2.0: 2.2 V', '5: 20 mA'],
          ['Green', '2.0: 2.2 V', '5: 20 mA'],
          ['Blue', '3.0: 3.4 V', '5: 20 mA'],
          ['White', '3.0: 3.4 V', '5: 20 mA'],
        ],
      },
      {
        kind: 'note',
        text: 'An LED has no internal current limit: a small increase in forward voltage causes a huge increase in current. The resistor is not optional.',
      },
      {
        kind: 'note',
        text: 'Modern indicator LEDs are clearly visible at 2-5 mA. Aim low when a logic gate is driving them.',
      },
    ],
  },
  {
    id: 'e_series',
    title: 'Standard resistor values (E24)',
    tags: ['e24', 'e12', 'preferred values', 'resistor'],
    body: [
      {
        kind: 'note',
        text: 'E24 (5%): 1.0 1.1 1.2 1.3 1.5 1.6 1.8 2.0 2.2 2.4 2.7 3.0 3.3 3.6 3.9 4.3 4.7 5.1 5.6 6.2 6.8 7.5 8.2 9.1: times any power of ten.',
      },
      {
        kind: 'note',
        text: 'Notation: 4k7 means 4.7 kΩ, 1R5 means 1.5 Ω, 2M2 means 2.2 MΩ. The multiplier replaces the decimal point so it cannot be lost in a photocopy.',
      },
    ],
  },
  {
    id: 'pull_resistors',
    title: 'Pull-up and pull-down resistors',
    tags: ['pull-up', 'pull-down', 'floating', 'input', 'button'],
    body: [
      {
        kind: 'note',
        text: 'A CMOS input draws essentially no current, so an unconnected input holds no defined level: it drifts with nearby signals and can oscillate, heating the chip.',
      },
      {
        kind: 'note',
        text: 'A pull resistor has ONE leg on the node and the other on a rail. If both legs are in the signal path, it is a series resistor and it defines nothing.',
      },
      {
        kind: 'table',
        head: ['Situation', 'Typical value'],
        rows: [
          ['General logic pull-up/pull-down', '10 kΩ'],
          ['MCU /RESET pull-up', '10 kΩ'],
          ['I²C bus at 100 kHz', '4.7 kΩ'],
          ['I²C bus at 400 kHz', '2.2 kΩ'],
          ['Noisy environment / long wires', '1: 4.7 kΩ'],
        ],
      },
      {
        kind: 'note',
        text: 'Smaller resistors resist noise better and switch faster, but waste more current when the switch is closed: I = V_rail / R.',
      },
    ],
  },
  {
    id: 'decoupling',
    title: 'Decoupling and bulk capacitance',
    tags: ['decoupling', 'bypass', 'bulk', 'capacitor', '100nf'],
    body: [
      {
        kind: 'note',
        text: '100 nF ceramic directly across each IC\'s own VCC and GND pins. It supplies the fast current spike the chip draws when its outputs switch, before the supply wiring can respond.',
      },
      {
        kind: 'note',
        text: '10 µF (or more) of bulk capacitance per board or per supply rail handles slower load changes and keeps the rail up between regulator responses.',
      },
      {
        kind: 'note',
        text: 'They are not interchangeable: the big capacitor is too slow, the small one stores too little charge. Real designs use both.',
      },
    ],
  },
  {
    id: 'rc',
    title: 'RC time constants and filters',
    tags: ['rc', 'filter', 'time constant', 'cutoff', 'debounce'],
    body: [
      { kind: 'formula', text: 'τ = R · C        f_c = 1 / (2π·R·C)' },
      {
        kind: 'note',
        text: 'After one τ a charging capacitor reaches 63% of its final voltage; after 5τ it is within 1%: that is the usual "settled" rule.',
      },
      {
        kind: 'table',
        head: ['Use', 'Typical τ'],
        rows: [
          ['Switch debounce', '5: 20 ms'],
          ['Audio band low-pass', '1 / (2π · 20 kHz) ≈ 8 µs'],
          ['Supply ripple filter', '10 ms and up'],
        ],
      },
      {
        kind: 'note',
        text: 'Low-pass: resistor in series, capacitor from the output node to ground. High-pass: capacitor in series, resistor to ground. Getting these the wrong way round is the most common filter mistake.',
      },
    ],
  },
  {
    id: 'dividers',
    title: 'Voltage dividers',
    tags: ['divider', 'ratio', 'reference', 'sensor'],
    body: [
      { kind: 'formula', text: 'V_out = V_in · R_bottom / (R_top + R_bottom)' },
      { kind: 'formula', text: 'R_top = R_bottom · (V_in − V_out) / V_out' },
      {
        kind: 'note',
        text: 'A divider holds its voltage only when very little current is drawn from the midpoint. Anything that loads it (a resistive load, a slow ADC sampling capacitor) drags the output down: buffer it with an op-amp when in doubt.',
      },
      {
        kind: 'note',
        text: 'For a resistive sensor, pair it with a fixed resistor of the same nominal value: that puts the output near half-rail, where the sensitivity is best.',
      },
    ],
  },
  {
    id: 'logic_levels',
    title: 'Logic families and levels',
    tags: ['74hc', '74hct', 'ttl', 'cmos', 'logic level', 'voh', 'vil'],
    body: [
      {
        kind: 'table',
        head: ['Family', 'Supply', 'Input LOW / HIGH', 'Output drive'],
        rows: [
          ['74HC (5V)', '2: 6 V', '< 1.35 V / > 3.15 V', '±4 mA typical'],
          ['74HCT', '4.5: 5.5 V', '< 0.8 V / > 2.0 V', '±4 mA typical'],
          ['74LS (TTL)', '5 V', '< 0.8 V / > 2.0 V', 'sinks 8 mA, sources 0.4 mA'],
          ['CMOS at 3.3 V', '2: 3.6 V', '< 0.8 V / > 2.0 V', '±4 mA typical'],
        ],
      },
      {
        kind: 'note',
        text: '74HC inputs are ratiometric to their own supply: a 3.3V signal into a 5V 74HC part sits in the undefined band. Use 74HCT (or a level shifter) when crossing voltage domains.',
      },
      {
        kind: 'note',
        text: 'Never leave an unused CMOS input floating: tie it to VCC or GND, even on gates you do not use.',
      },
    ],
  },
  {
    id: 'multi_unit',
    title: 'Multi-unit ICs and power units',
    tags: ['multi-unit', 'power unit', '74hc08', 'reference designator'],
    body: [
      {
        kind: 'note',
        text: 'A 74HC08 is four AND gates in one 14-pin package. On a schematic each gate is a separate symbol "unit", but they all share one reference designator (U1) because they are one physical chip.',
      },
      {
        kind: 'note',
        text: 'The supply pins live on a separate power unit (pins 14 and 7 for most 14-pin 74xx parts). Placing gate U1A but not U1\'s power unit means the chip has no supply at all: the ERC will say so.',
      },
      {
        kind: 'table',
        head: ['Part', 'Function', 'Power pins'],
        rows: [
          ['74HC00', 'Quad 2-input NAND', '14 / 7'],
          ['74HC02', 'Quad 2-input NOR (outputs on 1/4/10/13)', '14 / 7'],
          ['74HC04', 'Hex inverter', '14 / 7'],
          ['74HC08', 'Quad 2-input AND', '14 / 7'],
          ['74HC32', 'Quad 2-input OR', '14 / 7'],
          ['74HC86', 'Quad 2-input XOR', '14 / 7'],
        ],
      },
    ],
  },
  {
    id: 'opamp_rules',
    title: 'Op-amp golden rules',
    tags: ['op amp', 'gain', 'feedback', 'buffer', 'virtual ground'],
    body: [
      {
        kind: 'note',
        text: 'With negative feedback: (1) no current flows into either input, (2) the op-amp drives its output until both inputs sit at the same voltage. Nearly every op-amp circuit falls out of those two rules.',
      },
      { kind: 'formula', text: 'Non-inverting gain = 1 + Rf/Rg' },
      { kind: 'formula', text: 'Inverting gain = −Rf/Rin' },
      { kind: 'formula', text: 'Buffer (follower): output wired straight to the inverting input, gain = 1' },
      {
        kind: 'note',
        text: 'No feedback path at all means open-loop: gain of ~100,000, so the output slams to a rail. That is a comparator, and it is only correct when you meant it.',
      },
      {
        kind: 'note',
        text: 'Single-supply parts cannot output negative voltages. An LM358 output reaches about 30 mV above GND but stops roughly 1.5 V below V+.',
      },
    ],
  },
  {
    id: 'i2c_spi',
    title: 'I²C and SPI wiring',
    tags: ['i2c', 'spi', 'sda', 'scl', 'bus', 'open drain'],
    body: [
      {
        kind: 'note',
        text: 'I²C is open-drain: devices can only pull the line LOW. SDA and SCL each need their own pull-up to the bus voltage: 4.7 kΩ at 100 kHz, 2.2 kΩ at 400 kHz. All devices share the same two wires.',
      },
      {
        kind: 'note',
        text: 'SPI is push-pull and point-to-point: MOSI, MISO, SCK shared, plus one dedicated chip-select per device. No pull-ups needed, but idle chip-selects should be pulled high so a device is never accidentally addressed during reset.',
      },
      {
        kind: 'note',
        text: 'Active-low control pins (/OE, /CS, /RESET, /SRCLR) must be tied to a definite level. "Not used" never means "leave it floating".',
      },
    ],
  },
  {
    id: 'timer_555',
    title: '555 timer formulas',
    tags: ['555', 'astable', 'monostable', 'oscillator', 'timing'],
    body: [
      { kind: 'formula', text: 'Astable: f = 1.44 / ((R1 + 2·R2) · C)' },
      { kind: 'formula', text: 'Astable: t_high = 0.693·(R1+R2)·C,  t_low = 0.693·R2·C' },
      { kind: 'formula', text: 'Monostable: t = 1.1 · R · C' },
      {
        kind: 'note',
        text: 'Standard astable wiring: R1 from VCC to DIS (7), R2 from DIS (7) to THR (6), C from THR (6) to GND, TRIG (2) tied to THR (6), RESET (4) to VCC, 10 nF from CTRL (5) to GND.',
      },
      {
        kind: 'note',
        text: 'Because charging goes through R1+R2 and discharging only through R2, this configuration can never give a duty cycle below 50%.',
      },
    ],
  },
  {
    id: 'regulators',
    title: 'Linear regulators',
    tags: ['7805', 'ldo', 'regulator', 'dropout', 'heat'],
    body: [
      {
        kind: 'note',
        text: 'A 78xx needs its input at least ~2 V above its output (dropout). Below that it stops regulating and simply follows the input.',
      },
      {
        kind: 'note',
        text: 'Power dissipated = (V_in − V_out) × I_out, all of it as heat. 12 V in, 5 V out at 500 mA is 3.5 W: that needs a heatsink.',
      },
      {
        kind: 'note',
        text: 'Capacitors are part of the circuit, not decoration: ≥0.33 µF on the input, 0.1 µF on the output for a 7805. Without them the regulator can oscillate.',
      },
    ],
  },
  {
    id: 'schematic_conventions',
    title: 'Schematic conventions',
    tags: ['junction', 'net label', 'power symbol', 'convention', 'erc'],
    body: [
      {
        kind: 'note',
        text: 'Wires that cross WITHOUT a junction dot are not connected. A dot means "these are the same node". Never rely on a crossing to make a connection.',
      },
      {
        kind: 'note',
        text: 'A power symbol (+5V, GND) declares a rail and connects everywhere the same symbol appears. A net label just names a node: it connects to other labels of the same name but supplies nothing.',
      },
      {
        kind: 'note',
        text: 'Reference designators: R resistors, C capacitors, D diodes/LEDs, Q transistors, U integrated circuits, SW switches, J connectors, L inductors, TH thermistors.',
      },
      {
        kind: 'note',
        text: 'Signals flow left to right, power at the top, ground at the bottom. Following that convention makes a schematic readable at a glance: including by you, six months later.',
      },
    ],
  },
];

export function searchReference(query) {
  const q = query.trim().toLowerCase();
  if (!q) return REFERENCE;
  return REFERENCE.filter((entry) => {
    const hay = [entry.title, ...entry.tags, JSON.stringify(entry.body)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
