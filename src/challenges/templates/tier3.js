/**
 * Tier 3: digital logic fundamentals.
 *
 * These are the first challenges with a real multi-unit IC, so they exercise
 * the whole stack: gate units and the power unit share a reference designator,
 * the chip must be powered and decoupled, and every logic input needs a
 * defined level rather than a dangling wire.
 */

import { band } from '../rng.js';
import { formatValue } from '../../schematic/units.js';

const LEDS = [
  { color: 'red', vf: 1.8 },
  { color: 'green', vf: 2.1 },
  { color: 'yellow', vf: 2.0 },
];

/** Checks for "button pulls node HIGH, resistor holds it LOW". */
function pulledDownButton(net, rail, pull, gate, pin) {
  return [
    {
      kind: 'path',
      from: { rail: rail.name },
      to: { net },
      through: ['zero'],
      label: `A switch connects ${rail.name} to ${net}`,
      fail: `Pressing a button has to tie ${net} to ${rail.name}. One switch terminal on the rail, the other on ${net}.`,
    },
    {
      kind: 'pull_resistor',
      rail: 'ground',
      node: { net },
      min: pull * 0.2,
      max: pull * 10,
      label: `${net} has a pull-down resistor`,
      fail: `Without a pull-down, ${net} is connected to nothing at all while the button is released: a floating CMOS input, which drifts and switches on noise. Put a resistor from ${net} to GND (${formatValue(pull, 'Ω')} is a good value).`,
    },
    {
      kind: 'connected',
      a: { net },
      b: { type: gate, pin },
      label: `${net} drives ${gate} pin ${pin}`,
      fail: `The ${net} node must reach the gate input on pin ${pin}.`,
    },
    {
      kind: 'common_node',
      members: [{ net }, { type: 'switch' }, { type: 'resistor' }, { type: gate, pin }],
      label: `Switch, pull-down and gate input meet at ${net}`,
      fail: `The switch, its pull-down resistor and the gate input all have to meet at the ${net} node. Wired as a chain instead: switch, then resistor, then the gate: the gate input sits on the wrong side of the resistor and the button cannot pull it high.`,
    },
  ];
}

/** Checks for "gate output drives an LED through a series resistor". */
function gateDrivesLed(gate, outPin, rail, led, current) {
  const ideal = (rail.v - led.vf) / current;
  const { min, max } = band(ideal, 0.25);
  return [
    {
      kind: 'path',
      from: { type: gate, pin: outPin },
      to: { type: 'D_LED', pin: 'A' },
      through: ['resistive'],
      label: 'Gate output drives the LED anode through a resistor',
      fail: `The output on pin ${outPin} must reach the LED's anode through a series resistor. Driving an LED straight from a logic output with no resistor exceeds the pin's current rating and eventually kills the gate.`,
    },
    {
      kind: 'path',
      from: { type: 'D_LED', pin: 'K' },
      to: { rail: 'ground' },
      through: ['resistive', 'zero'],
      label: 'LED cathode returns to GND',
      fail: 'The LED cathode has no route back to ground, so no current can flow. Check the LED is not reversed.',
    },
    {
      kind: 'value_range',
      type: 'resistor',
      inSeriesWith: { type: 'D_LED' },
      min,
      max,
      unit: 'Ω',
      label: `LED resistor sized for about ${Math.round(current * 1000)} mA`,
      fail: `R = (V_OH − Vf) / I ≈ (${rail.v} − ${led.vf}) / ${current} ≈ ${formatValue(ideal, 'Ω')}. A 74HC output can only source a few mA before its output voltage sags, so do not aim for 20mA here.`,
    },
  ];
}

const RAIL_5V = { name: '+5V', v: 5 };

export const tier3 = [
  {
    id: 'and_two_buttons',
    tier: 3,
    level: 3,
    concepts: ['logic_gates', 'multi_unit_ics', 'pull_resistors', 'decoupling', 'led_drive'],
    topic: 'digital_logic',
    title: 'Two-button AND with indicator',
    concept: 'A real logic IC: powered, decoupled, with defined levels on every input.',
    params(rng) {
      return {
        led: rng.pick(LEDS),
        pull: rng.pick([10000, 4700]),
        current: rng.pick([3, 5]) / 1000,
      };
    },
    build({ led, pull, current }) {
      return {
        brief: {
          goal: 'Light an LED only while two pushbuttons are held down at the same time, using a 74HC08 AND gate.',
          spec: [
            'Supply: +5V and GND.',
            'Use one gate of a 74HC08. The chip\'s power unit must be placed and wired: VCC on pin 14, GND on pin 7.',
            'Decouple the 74HC08 with 100nF directly across its supply pins.',
            `Each button drives a gate input HIGH when pressed and is held LOW by a ${formatValue(pull, 'Ω')} pull-down when released. Label the two input nodes BTN1 and BTN2.`,
            `The gate output drives a ${led.color} LED (Vf = ${led.vf} V) at about ${Math.round(current * 1000)} mA through a series resistor.`,
            'Set values on all three resistors and the capacitor.',
          ],
          notes:
            'Neither input may ever be left floating. A 74HC input that is not driven does not read as LOW: it reads as whatever noise it picks up.',
        },
        solutionNote:
          'U1A: pin 1 ← BTN1, pin 2 ← BTN2, pin 3 → R → LED → GND. U1 power unit: pin 14 → +5V, pin 7 → GND, 100nF between them. Each BTN node: button up to +5V, pull-down to GND.',
        requirements: {
          requiredComponents: [
            { type: '74HC08', min: 1, max: 1, label: '74HC08 placed' },
            { type: 'switch', min: 2, max: 2, label: 'Two buttons placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'resistor', min: 3, max: 3, label: 'Three resistors placed (two pull-downs, one LED limiter)' },
            { type: 'capacitor', min: 1, label: 'Decoupling capacitor placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: '74HC08',
              label: 'The 74HC08 is powered',
              fail: 'Place the 74HC08\'s power unit and wire pin 14 to +5V and pin 7 to GND. The gate symbols on your sheet are units of one physical chip: the silicon is powered through those two pins and nothing else.',
            },
            {
              kind: 'decoupling',
              ic: '74HC08',
              min: 47e-9,
              max: 1e-6,
              label: '74HC08 decoupled with 100nF',
              fail: 'Add a 100nF capacitor directly between the chip\'s pin 14 and pin 7. Every time an output switches, the chip draws a fast current spike; without local decoupling that spike drags its own supply down and can make the other gates glitch.',
            },
            ...pulledDownButton('BTN1', RAIL_5V, pull, '74HC08', '1'),
            ...pulledDownButton('BTN2', RAIL_5V, pull, '74HC08', '2'),
            {
              kind: 'not_connected',
              a: { net: 'BTN1' },
              b: { net: 'BTN2' },
              label: 'The two inputs are independent',
              fail: 'BTN1 and BTN2 are the same node, so both gate inputs always see the same level: the AND gate can never distinguish the two buttons.',
            },
            ...gateDrivesLed('74HC08', '3', RAIL_5V, led, current),
          ],
        },
      };
    },
  },

  {
    id: 'nand_as_inverter',
    tier: 3,
    level: 3,
    concepts: ['logic_gates', 'multi_unit_ics', 'pull_resistors', 'decoupling'],
    topic: 'digital_logic',
    title: 'NAND wired as an inverter',
    concept: 'Tying a NAND\'s inputs together makes an inverter, and unused inputs are never left floating.',
    params(rng) {
      return { led: rng.pick(LEDS), pull: rng.pick([10000, 4700]), current: rng.pick([3, 5]) / 1000 };
    },
    build({ led, pull, current }) {
      return {
        brief: {
          goal: 'Use one gate of a 74HC00 as an inverter: the LED lights when the button is NOT pressed.',
          spec: [
            'Supply: +5V and GND. Place and wire the 74HC00 power unit, and decouple it with 100nF.',
            `A pushbutton with a ${formatValue(pull, 'Ω')} pull-down drives the input node, labelled IN.`,
            'Both inputs of the gate must be tied to IN, a NAND with its inputs joined behaves as an inverter.',
            `The output drives a ${led.color} LED (Vf = ${led.vf} V) at about ${Math.round(current * 1000)} mA through a resistor.`,
          ],
          notes: 'Y = NOT(A·A) = NOT A. Leaving the second input dangling instead would give you an input that floats.',
        },
        solutionNote: 'U1A pins 1 and 2 both to IN, pin 3 → R → LED → GND, power unit to +5V/GND with 100nF.',
        requirements: {
          requiredComponents: [
            { type: '74HC00', min: 1, max: 1, label: '74HC00 placed' },
            { type: 'switch', min: 1, max: 1, label: 'One button placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'resistor', min: 2, max: 2, label: 'Two resistors placed' },
            { type: 'capacitor', min: 1, label: 'Decoupling capacitor placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: '74HC00',
              label: 'The 74HC00 is powered',
              fail: 'Place the power unit of the 74HC00 and wire pin 14 to +5V, pin 7 to GND.',
            },
            {
              kind: 'decoupling',
              ic: '74HC00',
              min: 47e-9,
              max: 1e-6,
              label: '74HC00 decoupled',
              fail: 'A 100nF capacitor belongs directly across the chip\'s own supply pins.',
            },
            {
              kind: 'connected',
              a: { type: '74HC00', pin: '1' },
              b: { type: '74HC00', pin: '2' },
              label: 'Both gate inputs are tied together',
              fail: 'Pins 1 and 2 must be joined. A NAND only acts as an inverter when both inputs see the same signal; leaving pin 2 unconnected leaves it floating, and the gate output becomes unpredictable.',
            },
            ...pulledDownButton('IN', RAIL_5V, pull, '74HC00', '1'),
            ...gateDrivesLed('74HC00', '3', RAIL_5V, led, current),
          ],
        },
      };
    },
  },

  {
    id: 'active_low_inverter',
    tier: 3,
    level: 3,
    concepts: ['logic_gates', 'pull_resistors', 'multi_unit_ics', 'logic_levels'],
    topic: 'digital_logic',
    title: 'Active-low input into an inverter',
    concept: 'Pull-up + switch to ground is the standard input arrangement; the inverter restores the sense.',
    params(rng) {
      return { led: rng.pick(LEDS), pull: rng.pick([10000, 4700, 47000]), current: rng.pick([3, 5]) / 1000 };
    },
    build({ led, pull, current }) {
      const ideal = (5 - led.vf) / current;
      const { min, max } = band(ideal, 0.25);
      return {
        brief: {
          goal: 'Wire a button as active-low into a 74HC04 inverter, so the LED lights while the button is held.',
          spec: [
            'Supply: +5V and GND. Place the 74HC04 power unit (pin 14 / pin 7) and decouple it with 100nF.',
            `The button shorts the input node to GND when pressed; a ${formatValue(pull, 'Ω')} pull-up holds it HIGH otherwise. Label that node nIN.`,
            'nIN drives the input of one inverter unit.',
            `The inverter output drives a ${led.color} LED (Vf = ${led.vf} V) at about ${Math.round(current * 1000)} mA through a resistor.`,
          ],
          notes:
            'Grounding a node through a switch is more robust than pulling it up through one: ground is the quietest node on the board.',
        },
        solutionNote: '+5V → pull-up → nIN → button → GND. nIN → U1A pin 1, pin 2 → R → LED → GND.',
        requirements: {
          requiredComponents: [
            { type: '74HC04', min: 1, max: 1, label: '74HC04 placed' },
            { type: 'switch', min: 1, max: 1, label: 'One button placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'resistor', min: 2, max: 2, label: 'Two resistors placed' },
            { type: 'capacitor', min: 1, label: 'Decoupling capacitor placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: '74HC04',
              label: 'The 74HC04 is powered',
              fail: 'Place and wire the 74HC04 power unit: pin 14 to +5V, pin 7 to GND.',
            },
            {
              kind: 'decoupling',
              ic: '74HC04',
              min: 47e-9,
              max: 1e-6,
              label: '74HC04 decoupled',
              fail: 'Put 100nF straight across pins 14 and 7 of the chip.',
            },
            {
              kind: 'connected',
              a: { type: 'switch' },
              b: { rail: 'ground' },
              label: 'Button pulls the node to GND',
              fail: 'One terminal of the button belongs on ground: that is what makes the input active-low.',
            },
            {
              kind: 'pull_resistor',
              rail: '+5V',
              node: { net: 'nIN' },
              min: pull * 0.2,
              max: pull * 10,
              label: 'nIN pulled up to +5V',
              fail: `The pull-up bridges +5V and nIN. Without it, nIN is floating whenever the button is open. ${formatValue(pull, 'Ω')} is the target value.`,
            },
            {
              kind: 'common_node',
              members: [{ net: 'nIN' }, { type: 'switch' }, { type: 'resistor' }, { type: '74HC04', pin: '1' }],
              label: 'Pull-up, button and inverter input meet at nIN',
              fail: 'The pull-up leg, the button terminal and the inverter input must all land on the nIN node.',
            },
            {
              kind: 'path',
              from: { type: '74HC04', pin: '2' },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive'],
              label: 'Inverter output drives the LED through a resistor',
              fail: 'Pin 2 is the inverter output. It must reach the LED anode through a series resistor.',
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'LED cathode returns to GND',
              fail: 'Close the loop: the cathode has to reach ground.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              inSeriesWith: { type: 'D_LED' },
              min,
              max,
              unit: 'Ω',
              label: 'LED resistor sized for the target current',
              fail: `R ≈ (5 − ${led.vf}) / ${current} ≈ ${formatValue(ideal, 'Ω')}.`,
            },
          ],
        },
      };
    },
  },

  {
    id: 'xor_difference_detector',
    tier: 3,
    level: 3,
    concepts: ['logic_gates', 'multi_unit_ics', 'pull_resistors', 'decoupling'],
    topic: 'digital_logic',
    title: 'XOR difference detector',
    concept: 'Same input arrangement, different logic function, and the same non-negotiable power/decoupling rules.',
    params(rng) {
      return { led: rng.pick(LEDS), pull: rng.pick([10000, 4700]), current: rng.pick([3, 5]) / 1000 };
    },
    build({ led, pull, current }) {
      return {
        brief: {
          goal: 'Light an LED whenever two switches are in different positions, using a 74HC86 XOR gate.',
          spec: [
            'Supply: +5V and GND. Place and wire the 74HC86 power unit, decoupled with 100nF.',
            `Two switches, each with a ${formatValue(pull, 'Ω')} pull-down, drive the two gate inputs. Label the nodes SW_A and SW_B.`,
            `The output drives a ${led.color} LED (Vf = ${led.vf} V) at roughly ${Math.round(current * 1000)} mA through a resistor.`,
          ],
          notes: 'XOR is the "these two disagree" gate: the basis of comparators, parity checks and adders.',
        },
        solutionNote: 'U1A pin 1 ← SW_A, pin 2 ← SW_B, pin 3 → R → LED → GND, power unit on +5V/GND with 100nF.',
        requirements: {
          requiredComponents: [
            { type: '74HC86', min: 1, max: 1, label: '74HC86 placed' },
            { type: 'switch', min: 2, max: 2, label: 'Two switches placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'resistor', min: 3, max: 3, label: 'Three resistors placed' },
            { type: 'capacitor', min: 1, label: 'Decoupling capacitor placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: '74HC86',
              label: 'The 74HC86 is powered',
              fail: 'The power unit carrying pins 14 and 7 has to be placed and wired to +5V and GND.',
            },
            {
              kind: 'decoupling',
              ic: '74HC86',
              min: 47e-9,
              max: 1e-6,
              label: '74HC86 decoupled',
              fail: '100nF directly across the chip\'s supply pins.',
            },
            ...pulledDownButton('SW_A', RAIL_5V, pull, '74HC86', '1'),
            ...pulledDownButton('SW_B', RAIL_5V, pull, '74HC86', '2'),
            {
              kind: 'not_connected',
              a: { net: 'SW_A' },
              b: { net: 'SW_B' },
              label: 'The two inputs are independent',
              fail: 'SW_A and SW_B are the same node. An XOR fed identical inputs always outputs LOW.',
            },
            ...gateDrivesLed('74HC86', '3', RAIL_5V, led, current),
          ],
        },
      };
    },
  },
];
