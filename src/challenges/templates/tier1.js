/**
 * Tier 1: passive component recipes.
 *
 * Every template is parameterised: the topology is hand-authored (so it always
 * makes engineering sense) while the numbers are randomised inside sane bounds,
 * which is what makes the pool feel endless without ever generating nonsense.
 */

import { band } from '../rng.js';
import { formatValue, nearestE24 } from '../../schematic/units.js';
import { sheet } from '../solution.js';

/**
 * Column geometry for the reference solutions. A rail-to-ground ladder is the
 * canonical way these circuits are drawn, and drawing them all the same way is
 * itself part of the teaching: the learner should come to recognise the shape.
 */
const TOP = 60;
const STEP = 120;
const row = (n) => TOP + n * STEP;

const LEDS = [
  { color: 'red', vf: 1.8 },
  { color: 'green', vf: 2.1 },
  { color: 'yellow', vf: 2.0 },
  { color: 'blue', vf: 3.2 },
  { color: 'white', vf: 3.1 },
];

const RAILS = [
  { name: '+5V', v: 5 },
  { name: '+3V3', v: 3.3 },
];

/** Pick an LED whose forward voltage leaves useful headroom on the rail. */
function pickLed(rng, rail) {
  const usable = LEDS.filter((l) => rail.v - l.vf >= 1.0);
  return rng.pick(usable);
}

export const tier1 = [
  {
    id: 'led_current_limit',
    tier: 1,
    level: 1,
    concepts: ['ohms_law', 'led_drive', 'power_dissipation', 'ground_reference'],
    topic: 'passives',
    title: 'Current-limited LED indicator',
    concept: 'Ohm\'s law applied to an LED branch: the resistor sets the current, the LED does not.',
    params(rng) {
      const rail = rng.pick(RAILS);
      const led = pickLed(rng, rail);
      const current = rng.pick([5, 10, 15, 20]) / 1000;
      return { rail, led, current };
    },
    build({ rail, led, current }) {
      const ideal = (rail.v - led.vf) / current;
      const { min, max } = band(ideal, 0.1);
      const mA = Math.round(current * 1000);
      return {
        brief: {
          goal: `Design a ${led.color} LED indicator running from the ${rail.name} rail at ${mA} mA.`,
          spec: [
            `Power the circuit from the ${rail.name} rail and GND: use power symbols, not text labels.`,
            `The ${led.color} LED drops ${led.vf} V at the target current.`,
            `Set the LED current to ${mA} mA. Size the resistor yourself; ±10% of the ideal value is accepted.`,
            'Orient the LED correctly, conventional current flows in at the anode and out of the cathode.',
            'Type the resistance you calculate into the resistor\'s Value field (e.g. "220" or "1k2").',
          ],
          notes: 'Exactly one LED and one resistor. Nothing else is needed.',
        },
        solutionNote: `R = (V − Vf) / I = (${rail.v} − ${led.vf}) / ${current} = ${formatValue(ideal, 'Ω')} → nearest E24 ${formatValue(nearestE24(ideal), 'Ω')}.`,
        solution() {
          const s = sheet();
          const x = 200;
          s.chain(
            s.rail(rail.name, { x, y: row(0) }),
            s.place('R', { x, y: row(1), rot: 90, value: formatValue(nearestE24(ideal), 'Ω') }),
            s.place('D_LED', { x, y: row(2), rot: 90 }),
            s.rail('ground', { x, y: row(3) })
          );
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'resistor', min: 1, max: 1, label: 'One resistor placed' },
          ],
          checks: [
            {
              kind: 'series',
              a: { type: 'D_LED' },
              b: { type: 'resistor' },
              label: 'Resistor is in series with the LED',
              fail: 'The resistor has to sit in the same current path as the LED. In parallel it does nothing to limit LED current; the LED still sees the full rail voltage.',
            },
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive', 'zero'],
              label: `LED anode side reaches ${rail.name}`,
              fail: `The LED's anode must trace back to ${rail.name} (directly or through the resistor).`,
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'LED cathode side reaches GND',
              fail: 'The cathode has no route to ground, so no current can flow. If the LED is the right way round, check that the loop is actually closed back to GND.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              inSeriesWith: { type: 'D_LED' },
              min,
              max,
              unit: 'Ω',
              label: `Resistor sized for ${mA} mA`,
              fail: `Work it out from Ohm's law: the resistor drops what the LED does not, so V_R = ${rail.v} − ${led.vf} = ${(rail.v - led.vf).toFixed(1)} V, and R = V_R / I = ${(rail.v - led.vf).toFixed(1)} / ${current} = ${formatValue(ideal, 'Ω')}.`,
            },
          ],
        },
      };
    },
  },

  {
    id: 'switched_led',
    tier: 1,
    level: 1,
    concepts: ['ohms_law', 'led_drive', 'schematic_conventions'],
    topic: 'passives',
    title: 'Switched LED branch',
    concept: 'A switch belongs in series with the load, never straight across the supply.',
    params(rng) {
      const rail = rng.pick(RAILS);
      const led = pickLed(rng, rail);
      const current = rng.pick([5, 10, 20]) / 1000;
      const sw = rng.pick(['SW_SPST', 'SW_PUSH']);
      return { rail, led, current, sw };
    },
    build({ rail, led, current, sw }) {
      const ideal = (rail.v - led.vf) / current;
      const { min, max } = band(ideal, 0.1);
      const mA = Math.round(current * 1000);
      const swName = sw === 'SW_PUSH' ? 'pushbutton' : 'SPST switch';
      return {
        brief: {
          goal: `Light a ${led.color} LED at ${mA} mA from ${rail.name}, but only while a ${swName} is closed.`,
          spec: [
            `Supply: ${rail.name} and GND power symbols.`,
            `${led.color} LED, Vf = ${led.vf} V, target current ${mA} mA (±10% on the resistor).`,
            `The ${swName} must interrupt the LED's current path, not bridge the rails.`,
            'Give the resistor a value.',
          ],
        },
        solutionNote: `Rail → switch → resistor → LED → GND (any order of switch/resistor/LED works). R = (${rail.v} − ${led.vf}) / ${current} ≈ ${formatValue(ideal, 'Ω')}.`,
        solution() {
          const s = sheet();
          const x = 200;
          s.chain(
            s.rail(rail.name, { x, y: row(0) }),
            s.place(sw, { x, y: row(1), rot: 90 }),
            s.place('R', { x, y: row(2), rot: 90, value: formatValue(nearestE24(ideal), 'Ω') }),
            s.place('D_LED', { x, y: row(3), rot: 90 }),
            s.rail('ground', { x, y: row(4) })
          );
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'resistor', min: 1, max: 1, label: 'One resistor placed' },
            { type: 'switch', min: 1, max: 1, label: `One ${swName} placed` },
          ],
          checks: [
            {
              kind: 'series',
              a: { type: 'D_LED' },
              b: { type: 'resistor' },
              label: 'Resistor is in series with the LED',
              fail: 'The resistor must share a node with the LED and nothing else: that is what "in series" means electrically.',
            },
            {
              kind: 'any_of',
              label: 'Switch is inside the LED current path',
              fail: 'The switch has to break the loop that carries LED current. Wired across the rails it just shorts the supply; wired to a dead-end node it does nothing at all.',
              checks: [
                { kind: 'series', a: { type: 'switch' }, b: { type: 'resistor' } },
                { kind: 'series', a: { type: 'switch' }, b: { type: 'D_LED' } },
              ],
            },
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive', 'zero'],
              label: `Anode side traces back to ${rail.name}`,
              fail: `Follow the anode: it should reach ${rail.name} through the switch and/or the resistor.`,
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'Cathode side reaches GND',
              fail: 'The cathode must reach ground for the loop to close. A backwards LED never conducts.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              inSeriesWith: { type: 'D_LED' },
              min,
              max,
              unit: 'Ω',
              label: `Resistor sized for ${mA} mA`,
              fail: `R = (V − Vf) / I = (${rail.v} − ${led.vf}) / ${current} ≈ ${formatValue(ideal, 'Ω')}.`,
            },
          ],
        },
      };
    },
  },

  {
    id: 'two_led_indicators',
    tier: 1,
    level: 2,
    concepts: ['led_drive', 'series_parallel', 'ohms_law'],
    topic: 'passives',
    title: 'Two independent LED indicators',
    concept: 'Each LED branch needs its own resistor: sharing one couples the branches together.',
    params(rng) {
      const rail = rng.pick(RAILS);
      const led = pickLed(rng, rail);
      const current = rng.pick([5, 10, 15]) / 1000;
      return { rail, led, current };
    },
    build({ rail, led, current }) {
      const ideal = (rail.v - led.vf) / current;
      const { min, max } = band(ideal, 0.1);
      const mA = Math.round(current * 1000);
      return {
        brief: {
          goal: `Put two ${led.color} status LEDs on the ${rail.name} rail, each running at ${mA} mA.`,
          spec: [
            `Two ${led.color} LEDs (Vf = ${led.vf} V), both fed from ${rail.name} and returning to GND.`,
            `Each LED must sit at ${mA} mA regardless of whether the other one is fitted.`,
            'Give every resistor a value.',
          ],
          notes: 'Think about what happens to the current in one LED if the other is removed.',
        },
        solutionNote: `Two independent branches, each rail → R (${formatValue(ideal, 'Ω')}) → LED → GND. One shared resistor would make each LED's current depend on the other.`,
        solution() {
          const s = sheet();
          // Two branches side by side. Each gets its own rail and ground symbol:
          // same net, drawn locally, which is how real sheets stay readable.
          for (const x of [200, 380]) {
            s.chain(
              s.rail(rail.name, { x, y: row(0) }),
              s.place('R', { x, y: row(1), rot: 90, value: formatValue(nearestE24(ideal), 'Ω') }),
              s.place('D_LED', { x, y: row(2), rot: 90 }),
              s.rail('ground', { x, y: row(3) })
            );
          }
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'D_LED', min: 2, max: 2, label: 'Two LEDs placed' },
            { type: 'resistor', min: 2, max: 2, label: 'Two resistors placed' },
          ],
          checks: [
            {
              kind: 'each_series',
              a: { type: 'D_LED' },
              b: { type: 'resistor', label: 'resistor' },
              label: 'Every LED has its own series resistor',
              fail: 'One resistor shared by both LEDs makes the branches interact: the current splits between them, each LED runs dim, and unplugging one changes the other. Give each LED a dedicated resistor.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              all: true,
              min,
              max,
              unit: 'Ω',
              label: `Both resistors sized for ${mA} mA`,
              fail: `Each branch needs R = (${rail.v} − ${led.vf}) / ${current} ≈ ${formatValue(ideal, 'Ω')}.`,
            },
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive', 'zero'],
              label: `Anodes trace back to ${rail.name}`,
              fail: `Both branches must start at ${rail.name}.`,
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'Cathodes reach GND',
              fail: 'Check LED orientation: the barred (cathode) end faces ground.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'voltage_divider',
    tier: 1,
    level: 2,
    concepts: ['voltage_divider', 'ohms_law', 'series_parallel'],
    topic: 'passives',
    title: 'Voltage divider reference',
    concept: 'Two resistors set a ratio: Vout = Vin · Rbottom / (Rtop + Rbottom).',
    params(rng) {
      const rail = rng.pick([...RAILS, { name: '+12V', v: 12 }]);
      const bottom = rng.pick([10000, 4700, 22000]);
      const fraction = rng.pick([0.25, 0.33, 0.5, 0.6, 0.66]);
      return { rail, bottom, vout: Number((rail.v * fraction).toFixed(2)) };
    },
    build({ rail, bottom, vout }) {
      // Vout = Vin·Rb/(Rt+Rb)  =>  Rt = Rb·(Vin − Vout)/Vout
      const top = (bottom * (rail.v - vout)) / vout;
      const topBand = band(top, 0.05);
      return {
        brief: {
          goal: `Build a resistive divider that produces ${vout} V from the ${rail.name} rail.`,
          spec: [
            `Input: ${rail.name}. Return: GND.`,
            `Use ${formatValue(bottom, 'Ω')} for the lower (ground-side) resistor and calculate the upper one.`,
            `Target output: ${vout} V, unloaded, within 5%.`,
            'Label the divider midpoint with a net label named VOUT.',
            'Set both resistor values.',
          ],
          notes: 'A divider only holds its output voltage when almost nothing is drawn from the midpoint.',
        },
        solutionNote: `Rtop = Rbottom · (Vin − Vout) / Vout = ${formatValue(bottom, 'Ω')} · (${rail.v} − ${vout}) / ${vout} ≈ ${formatValue(top, 'Ω')}.`,
        solution() {
          const s = sheet();
          const x = 200;
          const rTop = s.place('R', { x, y: row(1), rot: 90, value: formatValue(top, 'Ω') });
          const rBottom = s.place('R', { x, y: row(2), rot: 90, value: formatValue(bottom, 'Ω') });
          s.chain(s.rail(rail.name, { x, y: row(0) }), rTop, rBottom, s.rail('ground', { x, y: row(3) }));
          // The label goes exactly on the midpoint node, which is what makes it
          // name that net rather than float beside it.
          s.label(rTop.bottom(), 'VOUT');
          return s.done();
        },
        requirements: {
          requiredComponents: [{ type: 'resistor', min: 2, max: 2, label: 'Two resistors placed' }],
          checks: [
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { rail: 'ground' },
              through: ['resistive'],
              label: 'Divider spans the rail to ground',
              fail: `Both resistors must form one chain from ${rail.name} down to GND: that chain is what carries the divider current.`,
            },
            {
              kind: 'series',
              a: { type: 'resistor', connectedTo: { rail: rail.name } },
              b: { type: 'resistor', connectedTo: { rail: 'ground' } },
              label: 'The two resistors meet at a single midpoint',
              fail: 'The upper and lower resistors must share one node and nothing else. If anything else joins that node, it is no longer a clean divider.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              connectedTo: { rail: 'ground' },
              min: bottom * 0.99,
              max: bottom * 1.01,
              unit: 'Ω',
              label: `Lower resistor is ${formatValue(bottom, 'Ω')}`,
              fail: `The brief fixes the ground-side resistor at ${formatValue(bottom, 'Ω')}.`,
            },
            {
              kind: 'value_range',
              type: 'resistor',
              connectedTo: { rail: rail.name },
              min: topBand.min,
              max: topBand.max,
              unit: 'Ω',
              label: `Upper resistor produces ${vout} V`,
              fail: `Rearrange Vout = Vin·Rb/(Rt+Rb) for Rt: Rt = Rb·(Vin − Vout)/Vout = ${formatValue(bottom, 'Ω')}·(${rail.v} − ${vout})/${vout} ≈ ${formatValue(top, 'Ω')}.`,
            },
            {
              kind: 'connected',
              a: { net: 'VOUT' },
              b: { type: 'resistor', connectedTo: { rail: 'ground' } },
              label: 'VOUT label sits on the midpoint',
              fail: 'Add a net label named VOUT on the node between the two resistors: that is the output of the divider.',
            },
            {
              kind: 'not_connected',
              a: { net: 'VOUT' },
              b: { rail: 'ground' },
              label: 'VOUT is not the ground node',
              fail: 'Your VOUT label is on the ground net. The output is the junction between the resistors, not the bottom of the chain.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'button_pulldown',
    tier: 1,
    level: 2,
    concepts: ['pull_resistors', 'ground_reference', 'schematic_conventions'],
    topic: 'pull_resistors',
    title: 'Pushbutton with pull-down',
    concept: 'A switch alone leaves a node floating half the time; the pull resistor defines the idle level.',
    params(rng) {
      const rail = rng.pick(RAILS);
      const pull = rng.pick([10000, 4700, 22000, 100000]);
      return { rail, pull };
    },
    build({ rail, pull }) {
      return {
        brief: {
          goal: `Produce a clean logic signal from a pushbutton: LOW when idle, ${rail.name} when pressed.`,
          spec: [
            `Supply: ${rail.name} and GND.`,
            'One pushbutton and one pull-down resistor.',
            `Use ${formatValue(pull, 'Ω')} for the pull-down.`,
            'Label the output node BTN.',
            'BTN must never be left floating, and pressing the button must not short the supply.',
          ],
          notes: 'Ask yourself what BTN is connected to when the button is released. "Nothing" is the wrong answer.',
        },
        solutionNote: `${rail.name} → button → BTN node → ${formatValue(pull, 'Ω')} → GND. Released, the resistor holds BTN at 0 V; pressed, the button pulls it to ${rail.name} and the resistor limits the current to ${formatValue(5 / pull, 'A')}.`,
        solution() {
          const s = sheet();
          const x = 200;
          const button = s.place('SW_PUSH', { x, y: row(1), rot: 90 });
          const pullDown = s.place('R', { x, y: row(2), rot: 90, value: formatValue(pull, 'Ω') });
          s.chain(s.rail(rail.name, { x, y: row(0) }), button, pullDown, s.rail('ground', { x, y: row(3) }));
          s.label(button.bottom(), 'BTN');
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'switch', min: 1, max: 1, label: 'One button placed' },
            { type: 'resistor', min: 1, max: 1, label: 'One resistor placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'switch' },
              b: { rail: rail.name },
              label: `One side of the button is on ${rail.name}`,
              fail: `Pressing the button has to connect BTN to ${rail.name}, so one of its terminals belongs on that rail.`,
            },
            {
              kind: 'pull_resistor',
              rail: 'ground',
              node: { net: 'BTN' },
              min: pull * 0.9,
              max: pull * 1.1,
              label: 'Pull-down resistor from BTN to GND',
              fail: `The pull-down goes from the BTN node to ground, one leg on each. Wired in series inside the signal path instead, it cannot hold BTN low when the button is open. Value: ${formatValue(pull, 'Ω')}.`,
            },
            {
              kind: 'common_node',
              members: [{ type: 'switch' }, { type: 'resistor' }, { net: 'BTN' }],
              label: 'Button, pull-down and BTN meet at one node',
              fail: 'The button, the resistor and the BTN label must all land on the same node. That shared node is the output; if they sit on different nodes there is nothing tying the output to a defined level.',
            },
            {
              kind: 'not_connected',
              a: { net: 'BTN' },
              b: { rail: 'ground' },
              label: 'BTN is not shorted to ground',
              fail: 'BTN sits directly on the ground net, so it can never go high. The pull-down resistor must be between BTN and GND, not a wire.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'button_pullup',
    tier: 1,
    level: 2,
    concepts: ['pull_resistors', 'ground_reference'],
    topic: 'pull_resistors',
    title: 'Active-low button with pull-up',
    concept: 'The mirror image: the resistor idles the node high, the switch pulls it to ground.',
    params(rng) {
      const rail = rng.pick(RAILS);
      const pull = rng.pick([10000, 4700, 47000]);
      return { rail, pull };
    },
    build({ rail, pull }) {
      return {
        brief: {
          goal: 'Wire an active-low button: the output idles HIGH and is pulled to 0 V while the button is held.',
          spec: [
            `Supply: ${rail.name} and GND.`,
            `One pushbutton and a ${formatValue(pull, 'Ω')} pull-up resistor.`,
            'Label the output node nBTN.',
            'Holding the button must not short the rail to ground.',
          ],
          notes: 'This is the arrangement almost every microcontroller input uses, because MCUs have pull-ups built in.',
        },
        solutionNote: `${rail.name} → ${formatValue(pull, 'Ω')} → nBTN → button → GND. Idle the resistor holds nBTN at ${rail.name}; pressed, the button drags it to 0 V and the resistor limits the current.`,
        solution() {
          const s = sheet();
          const x = 200;
          const pullUp = s.place('R', { x, y: row(1), rot: 90, value: formatValue(pull, 'Ω') });
          const button = s.place('SW_PUSH', { x, y: row(2), rot: 90 });
          s.chain(s.rail(rail.name, { x, y: row(0) }), pullUp, button, s.rail('ground', { x, y: row(3) }));
          s.label(pullUp.bottom(), 'nBTN');
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'switch', min: 1, max: 1, label: 'One button placed' },
            { type: 'resistor', min: 1, max: 1, label: 'One resistor placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'switch' },
              b: { rail: 'ground' },
              label: 'One side of the button is on GND',
              fail: 'Pressing the button must pull the node to 0 V, so one terminal belongs on ground.',
            },
            {
              kind: 'pull_resistor',
              rail: rail.name,
              node: { net: 'nBTN' },
              min: pull * 0.9,
              max: pull * 1.1,
              label: `Pull-up resistor from nBTN to ${rail.name}`,
              fail: `The pull-up bridges the rail and the nBTN node: one leg on ${rail.name}, the other on nBTN. Value: ${formatValue(pull, 'Ω')}.`,
            },
            {
              kind: 'common_node',
              members: [{ type: 'switch' }, { type: 'resistor' }, { net: 'nBTN' }],
              label: 'Button, pull-up and nBTN meet at one node',
              fail: 'The switch terminal, the resistor leg and the nBTN label all belong on the same node.',
            },
            {
              kind: 'not_connected',
              a: { net: 'nBTN' },
              b: { rail: rail.name },
              label: 'nBTN is not tied straight to the rail',
              fail: `nBTN is on ${rail.name} itself. With no resistance between them, pressing the button would short the supply to ground.`,
            },
          ],
        },
      };
    },
  },
];
