/**
 * Tier 2: power supply basics: regulation, bulk vs decoupling, filtering.
 */

import { band } from '../rng.js';
import { formatValue, nearestE24 } from '../../schematic/units.js';
import { sheet } from '../solution.js';

/** Vertical ladder geometry, the same one tier 1 uses, so the shapes rhyme. */
const TOP = 60;
const STEP = 120;
const row = (n) => TOP + n * STEP;

export const tier2 = [
  {
    id: 'linear_regulator',
    tier: 2,
    level: 4,
    concepts: ['linear_regulation', 'decoupling', 'capacitor_basics', 'power_dissipation'],
    topic: 'power_supply',
    title: '5V linear regulator stage',
    concept: 'A regulator is only stable with the capacitors its datasheet asks for.',
    params(rng) {
      return { cin: rng.pick([10e-6, 22e-6, 47e-6]), cout: rng.pick([100e-9, 220e-9]) };
    },
    build({ cin, cout }) {
      return {
        brief: {
          goal: 'Turn a +12V input into a regulated +5V rail with an LM7805.',
          spec: [
            'Input: the +12V power symbol. Output: a +5V power symbol driven by the regulator.',
            'The regulator\'s ground pin must return to GND.',
            `Fit a bulk capacitor of roughly ${formatValue(cin, 'F')} across the input, close to the regulator.`,
            `Fit ${formatValue(cout, 'F')} across the output.`,
            'Set a value on every capacitor.',
          ],
          notes: 'Both capacitors are part of the specification, not decoration: a 78xx without them can oscillate at hundreds of kHz.',
        },
        solutionNote:
          '+12V → IN, GND → GND, OUT → +5V symbol. One capacitor from IN to GND, one from OUT to GND. Dissipation is (12 − 5) × I_load, which is why 7805s need heatsinks.',
        /**
         * Drawn the way a datasheet draws it: power flows left to right along
         * one horizontal line, and both capacitors hang off that line straight
         * down to ground. Reading it, the two capacitors are visibly on
         * opposite sides of the regulator, which is the point being taught.
         */
        solution() {
          const s = sheet();
          const reg = s.place('LM7805', { x: 400, y: 300 });

          s.wire(s.rail('+12V', { x: 200, y: 180 }).top(), reg.pin('IN'));
          s.wire(reg.pin('OUT'), s.rail('+5V', { x: 640, y: 180 }).top(), { horizontalFirst: true });
          s.wire(reg.pin('GND'), s.rail('ground', { x: 400, y: 470 }).top());

          const input = s.place('C', { x: 270, y: 380, rot: 90, value: formatValue(cin, 'F') });
          s.wire(input.top(), { x: 270, y: 300 });
          s.wire(input.bottom(), s.rail('ground', { x: 270, y: 470 }).top());

          const output = s.place('C', { x: 530, y: 380, rot: 90, value: formatValue(cout, 'F') });
          s.wire(output.top(), { x: 530, y: 300 });
          s.wire(output.bottom(), s.rail('ground', { x: 530, y: 470 }).top());

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'LM7805', min: 1, max: 1, label: 'LM7805 placed' },
            { type: 'capacitor', min: 2, label: 'Two capacitors placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'LM7805', pin: 'IN' },
              b: { rail: '+12V' },
              label: 'Regulator input on +12V',
              fail: 'The IN pin needs the unregulated +12V rail. A 7805 needs at least ~7V in to hold 5V out: that gap is its dropout voltage.',
            },
            {
              kind: 'connected',
              a: { type: 'LM7805', pin: 'GND' },
              b: { rail: 'ground' },
              label: 'Regulator ground pin returns to GND',
              fail: 'The middle pin is the regulator\'s reference. Without it the part has no idea what "5V" means and cannot regulate at all.',
            },
            {
              kind: 'connected',
              a: { type: 'LM7805', pin: 'OUT' },
              b: { rail: '+5V' },
              label: 'Regulator output drives the +5V rail',
              fail: 'Attach a +5V power symbol to the OUT pin: that symbol is what makes the regulated node a named rail the rest of the sheet can use.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'LM7805', pin: 'IN' }, { rail: 'ground' }],
              min: 0.33e-6,
              max: 1e-3,
              unit: 'F',
              label: 'Input capacitor fitted',
              fail: 'Nothing suitable sits between the regulator input and ground. The input capacitor supplies the surge current the regulator draws when the load steps, and stops the input drooping below dropout. 0.33µF is the datasheet minimum; 10µF is the usual choice.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'LM7805', pin: 'OUT' }, { rail: 'ground' }],
              min: 47e-9,
              max: 100e-6,
              unit: 'F',
              label: 'Output capacitor fitted',
              fail: 'The output needs its own capacitor to ground (0.1µF typical). It improves the regulator\'s transient response and keeps its control loop stable.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'zener_shunt_reference',
    tier: 2,
    level: 4,
    concepts: ['diode_behaviour', 'ohms_law', 'power_dissipation'],
    topic: 'power_supply',
    title: 'Zener shunt reference',
    concept: 'The series resistor carries both the load current and the Zener\'s own bias current.',
    params(rng) {
      const iLoad = rng.pick([2, 5, 10]) / 1000;
      const iZener = rng.pick([5, 10]) / 1000;
      return { vin: 12, vz: 5.1, iLoad, iZener };
    },
    build({ vin, vz, iLoad, iZener }) {
      const ideal = (vin - vz) / (iLoad + iZener);
      const { min, max } = band(ideal, 0.2);
      return {
        brief: {
          goal: `Make a rough ${vz} V reference from the +12V rail using a Zener diode.`,
          spec: [
            'Input: +12V rail, return to GND.',
            `Zener: ${vz} V, biased at ${Math.round(iZener * 1000)} mA minimum.`,
            `The load draws ${Math.round(iLoad * 1000)} mA from the reference node.`,
            'Size the series resistor so the Zener still gets its bias current with the load connected (±20% accepted).',
            'Label the reference node VREF.',
          ],
          notes: 'The Zener must be reverse-biased: cathode toward the positive side.',
        },
        solutionNote: `R = (Vin − Vz) / (I_load + I_zener) = (${vin} − ${vz}) / ${(iLoad + iZener).toFixed(3)} ≈ ${formatValue(ideal, 'Ω')}.`,
        /**
         * The Zener is placed at 270° rather than 90°, which is what puts the
         * cathode at the top. That single rotation is the whole difference
         * between a working shunt reference and a diode dropping 0.7 V.
         */
        solution() {
          const s = sheet();
          const x = 300;
          const series = s.place('R', { x, y: row(1), rot: 90, value: formatValue(nearestE24(ideal), 'Ω') });
          const zener = s.place('D_ZENER', { x, y: row(2), rot: 270 });
          s.chain(s.rail('+12V', { x, y: row(0) }), series, zener, s.rail('ground', { x, y: row(3) }));
          s.label(series.bottom(), 'VREF');
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'zener', min: 1, max: 1, label: 'Zener diode placed' },
            { type: 'resistor', min: 1, max: 1, label: 'Series resistor placed' },
          ],
          checks: [
            {
              kind: 'series',
              a: { type: 'resistor' },
              b: { type: 'zener' },
              label: 'Resistor is in series with the Zener',
              fail: 'The resistor drops the difference between 12V and the Zener voltage. Without it in series, the Zener is straight across the supply and will fail.',
            },
            {
              kind: 'connected',
              a: { type: 'zener', pin: 'A' },
              b: { rail: 'ground' },
              label: 'Zener anode on GND (reverse-biased)',
              fail: 'A shunt reference works in reverse breakdown: cathode (the barred end) at the reference node, anode at ground. Forward-biased it just looks like an ordinary diode dropping 0.7V.',
            },
            {
              kind: 'connected',
              a: { type: 'resistor' },
              b: { rail: '+12V' },
              label: 'Resistor feeds from +12V',
              fail: 'The top of the resistor belongs on the +12V rail.',
            },
            {
              kind: 'connected',
              a: { net: 'VREF' },
              b: { type: 'zener', pin: 'K' },
              label: 'VREF label on the Zener cathode node',
              fail: 'Label the node between the resistor and the Zener cathode as VREF: that is the regulated output.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              min,
              max,
              unit: 'Ω',
              label: 'Series resistor sized for load + bias current',
              fail: `The resistor must pass the load current AND the Zener's bias current: R = (${vin} − ${vz}) / (${iLoad} + ${iZener}) ≈ ${formatValue(ideal, 'Ω')}. Too big and the Zener starves when the load draws current; too small and it wastes power.`,
            },
          ],
        },
      };
    },
  },

  {
    id: 'mcu_power_entry',
    tier: 2,
    level: 3,
    concepts: ['decoupling', 'capacitor_basics', 'pull_resistors', 'mcu_hardware_contract'],
    topic: 'power_supply',
    title: 'Microcontroller power entry',
    concept: 'Bulk capacitance holds the rail up; local decoupling handles fast switching currents.',
    params(rng) {
      return {
        rail: rng.pick([
          { name: '+5V', v: 5 },
          { name: '+3V3', v: 3.3 },
        ]),
        pull: rng.pick([10000, 4700]),
        bulk: rng.pick([10e-6, 22e-6]),
      };
    },
    build({ rail, pull, bulk }) {
      return {
        brief: {
          goal: `Wire an ATtiny85's power entry properly on the ${rail.name} rail.`,
          spec: [
            `Supply the MCU from ${rail.name} and GND.`,
            'Fit a 100nF decoupling capacitor directly across the MCU\'s own VCC and GND pins.',
            `Fit a ${formatValue(bulk, 'F')} bulk capacitor across the rail as well.`,
            `Pull /RESET up to ${rail.name} through ${formatValue(pull, 'Ω')} so the part does not reset on noise.`,
            'The I/O pins may be left unconnected for this exercise.',
          ],
          notes: 'Two capacitors with different jobs: the small one is fast and local, the big one is slow and shared.',
        },
        solutionNote: `${rail.name} → pin 8, GND → pin 4, 100nF between them, ${formatValue(bulk, 'F')} across the rail, ${formatValue(pull, 'Ω')} from /RST to ${rail.name}.`,
        /**
         * The two capacitors are drawn at different distances from the chip on
         * purpose. The 100nF sits right against the MCU's own supply pins; the
         * bulk capacitor sits further out on the rail. That is the physical
         * arrangement on a board, and the drawing should not hide it.
         */
        solution() {
          const s = sheet();
          const mcu = s.place('ATTINY85', { x: 400, y: 300 });

          s.wire(s.rail(rail.name, { x: 400, y: 140 }).top(), mcu.pin('VCC'));
          s.wire(mcu.pin('GND'), s.rail('ground', { x: 400, y: 500 }).top());

          const local = s.place('C', { x: 600, y: 300, rot: 90, value: '100n' });
          s.wire(local.top(), { x: 400, y: 190 });
          s.wire(local.bottom(), { x: 400, y: 450 });

          const reservoir = s.place('C_POL', { x: 760, y: 300, rot: 90, value: formatValue(bulk, 'F') });
          s.wire(reservoir.top(), { x: 600, y: 190 });
          s.wire(reservoir.bottom(), { x: 600, y: 450 });

          const pullUp = s.place('R', { x: 200, y: 190, rot: 90, value: formatValue(pull, 'Ω') });
          s.wire(pullUp.top(), { x: 400, y: 140 });
          s.wire(pullUp.bottom(), mcu.pin('/RST'));

          return s.done();
        },
        requirements: {
          ercOptions: { allowUnconnected: ['ATTINY85:PB*'] },
          requiredComponents: [
            { type: 'ATTINY85', min: 1, max: 1, label: 'ATtiny85 placed' },
            { type: 'capacitor', min: 2, label: 'Two capacitors placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: 'ATTINY85',
              label: 'MCU supply pins reach the rails',
              fail: `Pin 8 (VCC) must reach ${rail.name} and pin 4 (GND) must reach GND.`,
            },
            {
              kind: 'decoupling',
              ic: 'ATTINY85',
              min: 47e-9,
              max: 1e-6,
              label: 'MCU decoupled with ~100nF',
              fail: 'The decoupling capacitor goes directly between the MCU\'s VCC and GND pins. When an output switches, the chip pulls a current spike far faster than the supply wiring can respond; the local capacitor is what supplies it.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ rail: rail.name }, { rail: 'ground' }],
              min: 4.7e-6,
              max: 470e-6,
              unit: 'F',
              label: 'Bulk capacitor on the rail',
              fail: `The bulk capacitor (${formatValue(bulk, 'F')}) sits across the rail and rides out slower load changes. 100nF alone cannot do that job: it stores far too little charge.`,
            },
            {
              kind: 'pull_resistor',
              rail: rail.name,
              node: { type: 'ATTINY85', pin: '/RST' },
              min: pull * 0.5,
              max: pull * 5,
              label: '/RESET pulled up',
              fail: `/RESET is active-low: left floating it will pick up noise and reset the chip at random. Pull it to ${rail.name} through ${formatValue(pull, 'Ω')}.`,
            },
          ],
        },
      };
    },
  },

  {
    id: 'rc_lowpass',
    tier: 2,
    level: 3,
    concepts: ['rc_time_constant', 'capacitor_basics'],
    topic: 'power_supply',
    title: 'RC low-pass filter',
    concept: 'f_c = 1 / (2πRC): the corner where the capacitor\'s impedance equals the resistor\'s.',
    params(rng) {
      return { fc: rng.pick([100, 160, 1000, 1600, 10000]), c: rng.pick([100e-9, 10e-9, 1e-6]) };
    },
    build({ fc, c }) {
      const ideal = 1 / (2 * Math.PI * fc * c);
      const { min, max } = band(ideal, 0.15);
      return {
        brief: {
          goal: `Build a single-pole RC low-pass filter with a ${fc} Hz corner frequency.`,
          spec: [
            'The signal comes from the AC source symbol (pin 1); its pin 2 returns to GND.',
            `Use a ${formatValue(c, 'F')} capacitor and calculate the resistor (±15%).`,
            'Label the filter output VOUT.',
            'The capacitor must shunt the output to GND, not sit in the signal path.',
          ],
          notes: 'Above the corner the capacitor\'s impedance falls, shorting the signal to ground: the output rolls off at 20dB/decade.',
        },
        solutionNote: `R = 1 / (2π·f·C) = 1 / (2π·${fc}·${formatValue(c, 'F')}) ≈ ${formatValue(ideal, 'Ω')}. Source → R → VOUT, C from VOUT to GND.`,
        /**
         * Signal left to right, ground along the bottom. The capacitor hangs
         * off the output node rather than sitting in the run, which is exactly
         * the distinction between this filter and a high-pass one.
         */
        solution() {
          const s = sheet();
          const source = s.place('V_AC', { x: 200, y: 400 });
          const series = s.place('R', { x: 340, y: 300, value: formatValue(nearestE24(ideal), 'Ω') });
          const shunt = s.place('C', { x: 500, y: 380, rot: 90, value: formatValue(c, 'F') });

          s.wire(source.pin('1'), series.left());
          s.wire(source.pin('2'), s.rail('ground', { x: 200, y: 520 }).top());
          s.wire(series.right(), shunt.top(), { horizontalFirst: true });
          s.wire(shunt.bottom(), s.rail('ground', { x: 500, y: 520 }).top());
          s.label(series.right(), 'VOUT');

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'resistor', min: 1, max: 1, label: 'One resistor placed' },
            { type: 'capacitor', min: 1, max: 1, label: 'One capacitor placed' },
            { type: 'V_AC', min: 1, max: 1, label: 'Signal source placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'V_AC', pin: '1' },
              b: { type: 'resistor' },
              label: 'Source feeds the resistor',
              fail: 'The signal enters through the series resistor.',
            },
            {
              kind: 'connected',
              a: { type: 'V_AC', pin: '2' },
              b: { rail: 'ground' },
              label: 'Source return on GND',
              fail: 'The source\'s return terminal must go to ground, or the signal has no reference and no return path.',
            },
            {
              kind: 'series',
              a: { type: 'resistor' },
              b: { type: 'capacitor' },
              label: 'R and C meet at the output node',
              fail: 'The resistor and capacitor must share exactly one node: that node is the filter output.',
            },
            {
              kind: 'connected',
              a: { type: 'capacitor' },
              b: { rail: 'ground' },
              label: 'Capacitor shunts to GND',
              fail: 'The capacitor\'s other leg belongs on ground. With both legs in the signal path it becomes a series (high-pass) element instead.',
            },
            {
              kind: 'connected',
              a: { net: 'VOUT' },
              b: { type: 'capacitor' },
              label: 'VOUT labels the filter output',
              fail: 'Put a VOUT net label on the node where the resistor meets the capacitor.',
            },
            {
              kind: 'not_connected',
              a: { net: 'VOUT' },
              b: { type: 'V_AC', pin: '1' },
              label: 'Output is after the resistor',
              fail: 'Your VOUT label is on the source node itself, so the resistor is not between the input and the output, nothing is being filtered.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              min,
              max,
              unit: 'Ω',
              label: `Resistor sets the ${fc} Hz corner`,
              fail: `Rearrange f = 1/(2πRC): R = 1/(2π·${fc}·${formatValue(c, 'F')}) ≈ ${formatValue(ideal, 'Ω')}.`,
            },
          ],
        },
      };
    },
  },
];
