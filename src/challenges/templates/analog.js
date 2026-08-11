/**
 * Tier 4: op-amp circuits, and Tier 5, sensor interfacing.
 *
 * The op-amp templates lean on one rule: with negative feedback, the op-amp
 * drives its output until both inputs sit at the same voltage. Every gain
 * requirement here is checked as a resistor RATIO, which is what actually sets
 * the gain, absolute values only matter for loading and noise.
 */

import { band } from '../rng.js';
import { formatValue } from '../../schematic/units.js';
import { sheet } from '../solution.js';

/**
 * The feedback wire, drawn over the top of the part.
 *
 * An op-amp's inverting input and its output are on opposite sides of the
 * symbol, so the shortest route between them runs straight through the
 * triangle. Every published schematic instead takes the wire up and over, and
 * so does this: a reference drawing that overlaps its own symbol teaches a
 * habit that will be corrected in the learner's first design review.
 */
function feedbackOverTheTop(s, opamp, { out, height, back }) {
  s.wire(opamp.pin('OUT'), { x: out, y: opamp.pin('OUT').y });
  s.wire({ x: out, y: opamp.pin('OUT').y }, { x: back, y: height });
  s.wire({ x: back, y: height }, opamp.pin('IN-'));
}

/** ±12V dual supply wiring checks for the generic op-amp symbol. */
function dualSupplyChecks() {
  return [
    {
      kind: 'connected',
      a: { type: 'OPAMP', pin: 'V+' },
      b: { rail: '+12V' },
      label: 'Op-amp positive supply on +12V',
      fail: 'Pin V+ needs the +12V rail. Textbook schematics often hide the supply pins; real ones cannot.',
    },
    {
      kind: 'connected',
      a: { type: 'OPAMP', pin: 'V-' },
      b: { rail: '-12V' },
      label: 'Op-amp negative supply on -12V',
      fail: 'Pin V− needs the −12V rail so the output can swing below 0V.',
    },
  ];
}

export const tier4 = [
  {
    id: 'voltage_follower',
    tier: 4,
    level: 4,
    concepts: ['opamp_feedback', 'opamp_practical'],
    topic: 'op_amp',
    title: 'Unity-gain buffer',
    concept: '100% negative feedback: the output copies the input, but can drive a load the source cannot.',
    params() {
      return {};
    },
    build() {
      return {
        brief: {
          goal: 'Build a unity-gain voltage follower on a ±12V supply.',
          spec: [
            'Use the generic op-amp symbol, powered from +12V and -12V, with GND as the signal reference.',
            'The AC source drives the non-inverting input; its return goes to GND.',
            'Connect the output back to the inverting input directly, no resistors.',
            'Label the output node VOUT.',
          ],
          notes:
            'A buffer changes no voltage at all. Its job is impedance: a high-impedance source (a divider, a sensor) can drive a real load through it without sagging.',
        },
        solutionNote: 'Source → IN+, OUT → IN− (a plain wire), OUT labelled VOUT, V+ → +12V, V− → −12V.',
        solution() {
          const s = sheet();
          const opamp = s.place('OPAMP', { x: 500, y: 300 });

          s.wire(s.rail('+12V', { x: 500, y: 200 }).top(), opamp.pin('V+'));
          s.wire(opamp.pin('V-'), s.rail('-12V', { x: 500, y: 400 }).top());

          const source = s.place('V_AC', { x: 250, y: 320 });
          s.wire(source.pin('1'), opamp.pin('IN+'));
          s.wire(source.pin('2'), s.rail('ground', { x: 250, y: 480 }).top());

          feedbackOverTheTop(s, opamp, { out: 620, height: 150, back: 400 });
          s.label(opamp.pin('OUT'), 'VOUT');

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'OPAMP', min: 1, max: 1, label: 'Op-amp placed' },
            { type: 'V_AC', min: 1, max: 1, label: 'Signal source placed' },
          ],
          checks: [
            ...dualSupplyChecks(),
            {
              kind: 'connected',
              a: { type: 'OPAMP', pin: 'OUT' },
              b: { type: 'OPAMP', pin: 'IN-' },
              label: 'Output fed back to the inverting input',
              fail: 'The feedback wire from OUT to IN− is the whole circuit. Without it the op-amp runs open-loop with a gain of ~100,000 and slams to one rail or the other.',
            },
            {
              kind: 'connected',
              a: { type: 'V_AC', pin: '1' },
              b: { type: 'OPAMP', pin: 'IN+' },
              label: 'Source drives the non-inverting input',
              fail: 'The signal belongs on IN+. On IN− you would get an inverting stage instead.',
            },
            {
              kind: 'connected',
              a: { type: 'V_AC', pin: '2' },
              b: { rail: 'ground' },
              label: 'Source return on GND',
              fail: 'The source needs its return to the same ground the op-amp references.',
            },
            {
              kind: 'connected',
              a: { net: 'VOUT' },
              b: { type: 'OPAMP', pin: 'OUT' },
              label: 'VOUT labels the output',
              fail: 'Put a VOUT net label on the op-amp output node.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'noninverting_amp',
    tier: 4,
    level: 4,
    concepts: ['opamp_feedback', 'voltage_divider'],
    topic: 'op_amp',
    title: 'Non-inverting amplifier',
    concept: 'Gain = 1 + Rf/Rg. The feedback divider decides how much of the output the inputs compare.',
    params(rng) {
      return { gain: rng.pick([2, 3, 5, 6, 11, 21]), rg: rng.pick([1000, 10000]) };
    },
    build({ gain, rg }) {
      const rf = (gain - 1) * rg;
      const ratio = band(gain - 1, 0.1);
      return {
        brief: {
          goal: `Build a non-inverting amplifier with a voltage gain of ${gain} on a ±12V supply.`,
          spec: [
            'Generic op-amp powered from +12V and -12V.',
            'The AC source drives the non-inverting input; its return goes to GND.',
            `Use ${formatValue(rg, 'Ω')} for the resistor from the inverting input to ground, and size the feedback resistor for a gain of ${gain}.`,
            'Label the output VOUT.',
            'Set values on both resistors.',
          ],
          notes: 'Gain = 1 + Rf/Rg. Note the "1 +": a non-inverting stage can never have a gain below 1.',
        },
        solutionNote: `Rf = (G − 1)·Rg = (${gain} − 1)·${formatValue(rg, 'Ω')} = ${formatValue(rf, 'Ω')}. Source → IN+, Rg from IN− to GND, Rf from IN− to OUT.`,
        /**
         * The feedback divider is drawn as a divider: Rf above, Rg below, both
         * hanging off one vertical node that runs down from the inverting
         * input. Seen that way the "1 +" in the gain formula stops being
         * arbitrary, because the output is being divided down and compared
         * against the input.
         */
        solution() {
          const s = sheet();
          const opamp = s.place('OPAMP', { x: 600, y: 300 });

          s.wire(s.rail('+12V', { x: 600, y: 200 }).top(), opamp.pin('V+'));
          s.wire(opamp.pin('V-'), s.rail('-12V', { x: 600, y: 400 }).top());

          const source = s.place('V_AC', { x: 300, y: 320 });
          s.wire(source.pin('1'), opamp.pin('IN+'));
          s.wire(source.pin('2'), s.rail('ground', { x: 300, y: 480 }).top());

          const summing = { x: 450, y: 280 };
          s.wire(opamp.pin('IN-'), summing);

          const ground = s.place('R', { x: 450, y: 360, rot: 90, value: formatValue(rg, 'Ω') });
          s.wire(summing, ground.top());
          s.wire(ground.bottom(), s.rail('ground', { x: 450, y: 480 }).top());

          const feedback = s.place('R', { x: 500, y: 150, value: formatValue(rf, 'Ω') });
          s.wire(summing, feedback.left());
          s.wire(feedback.right(), opamp.pin('OUT'), { horizontalFirst: true });
          s.label(opamp.pin('OUT'), 'VOUT');

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'OPAMP', min: 1, max: 1, label: 'Op-amp placed' },
            { type: 'resistor', min: 2, max: 2, label: 'Two resistors placed' },
            { type: 'V_AC', min: 1, max: 1, label: 'Signal source placed' },
          ],
          checks: [
            ...dualSupplyChecks(),
            {
              kind: 'connected',
              a: { type: 'V_AC', pin: '1' },
              b: { type: 'OPAMP', pin: 'IN+' },
              label: 'Source drives the non-inverting input',
              fail: 'For a non-inverting amplifier the signal enters at IN+.',
            },
            {
              kind: 'connected',
              a: { type: 'V_AC', pin: '2' },
              b: { rail: 'ground' },
              label: 'Source return on GND',
              fail: 'The source return must share the op-amp\'s ground reference.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ type: 'OPAMP', pin: 'IN-' }, { type: 'OPAMP', pin: 'OUT' }],
              min: 1,
              label: 'Feedback resistor between output and inverting input',
              fail: 'Rf must bridge OUT and IN−. That path is what feeds a fraction of the output back for comparison.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ type: 'OPAMP', pin: 'IN-' }, { rail: 'ground' }],
              min: 1,
              label: 'Gain-setting resistor from the inverting input to ground',
              fail: 'Rg runs from IN− to ground. Without it the feedback network is just a wire and the stage collapses to unity gain.',
            },
            {
              kind: 'value_ratio',
              a: { type: 'resistor', between: [{ type: 'OPAMP', pin: 'IN-' }, { type: 'OPAMP', pin: 'OUT' }] },
              b: { type: 'resistor', between: [{ type: 'OPAMP', pin: 'IN-' }, { rail: 'ground' }] },
              min: ratio.min,
              max: ratio.max,
              label: `Rf/Rg gives a gain of ${gain}`,
              fail: `Gain = 1 + Rf/Rg, so Rf/Rg must be ${gain - 1}. With Rg = ${formatValue(rg, 'Ω')} that means Rf = ${formatValue(rf, 'Ω')}.`,
            },
            {
              kind: 'connected',
              a: { net: 'VOUT' },
              b: { type: 'OPAMP', pin: 'OUT' },
              label: 'VOUT labels the output',
              fail: 'Label the op-amp output node VOUT.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'inverting_amp',
    tier: 4,
    level: 4,
    concepts: ['opamp_feedback', 'opamp_practical'],
    topic: 'op_amp',
    title: 'Inverting amplifier',
    concept: 'The inverting input becomes a virtual ground; the two resistors set gain = −Rf/Rin.',
    params(rng) {
      return { gain: rng.pick([2, 4, 5, 10, 20]), rin: rng.pick([1000, 10000]) };
    },
    build({ gain, rin }) {
      const rf = gain * rin;
      const ratio = band(gain, 0.1);
      return {
        brief: {
          goal: `Build an inverting amplifier with a gain of −${gain} on a ±12V supply.`,
          spec: [
            'Generic op-amp powered from +12V and -12V.',
            `The AC source feeds the inverting input through a ${formatValue(rin, 'Ω')} input resistor; the source return goes to GND.`,
            'The non-inverting input is tied directly to GND.',
            `Size the feedback resistor for a gain magnitude of ${gain}.`,
            'Label the output VOUT.',
          ],
          notes:
            'Because IN+ is at 0V and feedback forces IN− to match it, the inverting input sits at a "virtual ground": the input resistor sees the full input voltage across it.',
        },
        solutionNote: `Rf = G·Rin = ${gain}·${formatValue(rin, 'Ω')} = ${formatValue(rf, 'Ω')}. Source → Rin → IN−, Rf from IN− to OUT, IN+ → GND.`,
        /**
         * Rin and Rf are drawn end to end along one line, with the inverting
         * input tapped off the middle of it. That is the shape worth
         * remembering: the input current has nowhere to go except through the
         * feedback resistor, because the tap is held at 0 V and draws none.
         */
        solution() {
          const s = sheet();
          const opamp = s.place('OPAMP', { x: 600, y: 300 });

          s.wire(s.rail('+12V', { x: 600, y: 200 }).top(), opamp.pin('V+'));
          s.wire(opamp.pin('V-'), s.rail('-12V', { x: 600, y: 400 }).top());
          s.wire(opamp.pin('IN+'), s.rail('ground', { x: 570, y: 440 }).top());

          const source = s.place('V_AC', { x: 250, y: 340 });
          s.wire(source.pin('2'), s.rail('ground', { x: 250, y: 480 }).top());

          const input = s.place('R', { x: 400, y: 280, value: formatValue(rin, 'Ω') });
          s.wire(source.pin('1'), input.left());
          s.wire(input.right(), opamp.pin('IN-'));

          const feedback = s.place('R', { x: 500, y: 150, value: formatValue(rf, 'Ω') });
          s.wire({ x: 480, y: 280 }, feedback.left());
          s.wire(feedback.right(), opamp.pin('OUT'), { horizontalFirst: true });
          s.label(opamp.pin('OUT'), 'VOUT');

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'OPAMP', min: 1, max: 1, label: 'Op-amp placed' },
            { type: 'resistor', min: 2, max: 2, label: 'Two resistors placed' },
            { type: 'V_AC', min: 1, max: 1, label: 'Signal source placed' },
          ],
          checks: [
            ...dualSupplyChecks(),
            {
              kind: 'connected',
              a: { type: 'OPAMP', pin: 'IN+' },
              b: { rail: 'ground' },
              label: 'Non-inverting input grounded',
              fail: 'IN+ sets the reference the feedback loop works towards. For an inverting stage on a dual supply it goes straight to GND.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ type: 'V_AC', pin: '1' }, { type: 'OPAMP', pin: 'IN-' }],
              min: 1,
              label: 'Input resistor between source and inverting input',
              fail: 'Rin must sit between the source and IN−. Connecting the source directly to the virtual ground node would short it out.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ type: 'OPAMP', pin: 'IN-' }, { type: 'OPAMP', pin: 'OUT' }],
              min: 1,
              label: 'Feedback resistor between inverting input and output',
              fail: 'Rf bridges IN− and OUT.',
            },
            {
              kind: 'value_ratio',
              a: { type: 'resistor', between: [{ type: 'OPAMP', pin: 'IN-' }, { type: 'OPAMP', pin: 'OUT' }] },
              b: { type: 'resistor', between: [{ type: 'V_AC', pin: '1' }, { type: 'OPAMP', pin: 'IN-' }] },
              min: ratio.min,
              max: ratio.max,
              label: `Rf/Rin gives a gain of −${gain}`,
              fail: `|Gain| = Rf/Rin, so with Rin = ${formatValue(rin, 'Ω')} you need Rf = ${formatValue(rf, 'Ω')}.`,
            },
            {
              kind: 'connected',
              a: { type: 'V_AC', pin: '2' },
              b: { rail: 'ground' },
              label: 'Source return on GND',
              fail: 'The source return belongs on ground.',
            },
            {
              kind: 'connected',
              a: { net: 'VOUT' },
              b: { type: 'OPAMP', pin: 'OUT' },
              label: 'VOUT labels the output',
              fail: 'Label the output node VOUT.',
            },
          ],
        },
      };
    },
  },
];

export const tier5 = [
  {
    id: 'thermistor_adc',
    tier: 5,
    level: 5,
    concepts: ['sensor_interface', 'voltage_divider', 'adc_frontend', 'decoupling'],
    topic: 'sensors',
    title: 'Thermistor into an ADC input',
    concept: 'A resistive sensor is useless until a divider turns its resistance into a voltage.',
    params(rng) {
      return {
        rail: rng.pick([
          { name: '+5V', v: 5 },
          { name: '+3V3', v: 3.3 },
        ]),
        nominal: rng.pick([10000, 4700]),
      };
    },
    build({ rail, nominal }) {
      return {
        brief: {
          goal: `Read a ${formatValue(nominal, 'Ω')} NTC thermistor with an ATtiny85 ADC input.`,
          spec: [
            `Supply the MCU and the divider from ${rail.name} and GND. Decouple the MCU with 100nF.`,
            `Form a divider: the thermistor and a fixed ${formatValue(nominal, 'Ω')} resistor in series across the rail.`,
            'Bring the divider midpoint to the MCU\'s PB4 pin and label that node TSENSE.',
            'Pull /RESET up with 10k.',
            'The remaining I/O pins may be left open.',
          ],
          notes:
            'Pairing the thermistor with a fixed resistor of the same nominal value puts the midpoint near half-rail at 25°C, which is where the divider is most sensitive.',
        },
        solutionNote: `${rail.name} → thermistor → TSENSE → ${formatValue(nominal, 'Ω')} → GND, TSENSE → PB4. (Swapping the two changes the sign of the response, not its validity.)`,
        /**
         * The signal leaves the divider sideways and only then turns down to
         * meet PB4. Approaching the MCU vertically along its left edge would
         * run the wire straight over /RESET and PB3, and a wire crossing a pin
         * is a connection: the sheet would read as three shorted inputs.
         */
        solution() {
          const s = sheet();
          const mcu = s.place('ATTINY85', { x: 700, y: 300 });

          s.wire(s.rail(rail.name, { x: 700, y: 120 }).top(), mcu.pin('VCC'));
          s.wire(mcu.pin('GND'), s.rail('ground', { x: 700, y: 490 }).top());

          const cap = s.place('C', { x: 900, y: 300, rot: 90, value: '100n' });
          s.wire(cap.top(), { x: 700, y: 180 });
          s.wire(cap.bottom(), { x: 700, y: 430 });

          const x = 250;
          const sensor = s.place('NTC', { x, y: 140, rot: 90, value: formatValue(nominal, 'Ω') });
          const fixed = s.place('R', { x, y: 250, rot: 90, value: formatValue(nominal, 'Ω') });
          s.chain(s.rail(rail.name, { x, y: 60 }), sensor, fixed, s.rail('ground', { x, y: 360 }));

          const midpoint = { x, y: 195 };
          s.label(midpoint, 'TSENSE');
          s.wire(midpoint, { x: 400, y: 195 });
          s.wire({ x: 400, y: 195 }, mcu.pin('PB4'));

          const pullUp = s.place('R', { x: 520, y: 100, value: '10k' });
          s.wire(pullUp.left(), s.rail(rail.name, { x: 490, y: 40 }).top());
          s.wire(pullUp.right(), mcu.pin('/RST'));

          return s.done();
        },
        requirements: {
          ercOptions: { allowUnconnected: ['ATTINY85:PB0*', 'ATTINY85:PB1', 'ATTINY85:PB2*', 'ATTINY85:PB3'] },
          requiredComponents: [
            { type: 'ATTINY85', min: 1, max: 1, label: 'ATtiny85 placed' },
            { type: 'NTC', min: 1, max: 1, label: 'Thermistor placed' },
            { type: 'capacitor', min: 1, label: 'Decoupling capacitor placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: 'ATTINY85',
              label: 'MCU supply pins reach the rails',
              fail: `Pin 8 to ${rail.name}, pin 4 to GND.`,
            },
            {
              kind: 'decoupling',
              ic: 'ATTINY85',
              min: 47e-9,
              max: 1e-6,
              label: 'MCU decoupled',
              fail: 'A 100nF capacitor across the MCU\'s own supply pins. ADC readings are especially sensitive to supply noise, since the supply is usually the ADC reference.',
            },
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { rail: 'ground' },
              through: ['resistive'],
              label: 'Divider spans the rail',
              fail: 'The thermistor and the fixed resistor must form a chain from the rail to ground. A sensor with one leg unconnected produces no voltage at all.',
            },
            /**
             * Stated as two halves rather than as a series pair. The midpoint
             * is deliberately tapped by PB4, so the two parts are not a strict
             * series pair and never can be here; asking for one would be a
             * requirement no correct answer could satisfy. Written this way it
             * also stays neutral about which part goes on top, which the brief
             * leaves open.
             */
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { net: 'TSENSE' },
              through: ['resistive'],
              label: 'Something resistive between the rail and TSENSE',
              fail: 'TSENSE has to sit below the rail through one of the two parts. Wired straight to the rail it cannot move at all.',
            },
            {
              kind: 'path',
              from: { net: 'TSENSE' },
              to: { rail: 'ground' },
              through: ['resistive'],
              label: 'Something resistive between TSENSE and ground',
              fail: 'The other half of the divider is missing: TSENSE needs a resistive path down to ground as well, or no current flows and the node has no defined voltage.',
            },
            {
              kind: 'common_node',
              members: [{ net: 'TSENSE' }, { type: 'NTC' }, { type: 'ATTINY85', pin: 'PB4' }],
              label: 'TSENSE joins the divider midpoint to PB4',
              fail: 'The divider midpoint, the TSENSE label and the MCU\'s PB4 pin all belong on the same node.',
            },
            {
              kind: 'not_connected',
              a: { net: 'TSENSE' },
              b: { rail: 'ground' },
              label: 'TSENSE is the midpoint, not a rail',
              fail: 'TSENSE has landed on a rail. The measurement node is between the two elements, where the voltage actually moves with temperature.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              connectedTo: { rail: 'ground' },
              min: nominal * 0.5,
              max: nominal * 2,
              unit: 'Ω',
              label: 'Fixed divider resistor of a sensible value',
              fail: `Use roughly ${formatValue(nominal, 'Ω')}: matching the thermistor's nominal resistance centres the output around half the rail.`,
            },
            {
              kind: 'pull_resistor',
              rail: rail.name,
              node: { type: 'ATTINY85', pin: '/RST' },
              min: 4000,
              max: 100000,
              label: '/RESET pulled up',
              fail: 'Pull /RESET to the rail through 10k so noise cannot reset the part mid-measurement.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'tmp36_buffer',
    tier: 5,
    level: 5,
    concepts: ['sensor_interface', 'opamp_feedback', 'adc_frontend', 'decoupling'],
    topic: 'sensors',
    title: 'Buffered analog sensor',
    concept: 'A high-impedance sensor output needs a buffer before it drives anything real.',
    params() {
      return {};
    },
    build() {
      return {
        brief: {
          goal: 'Condition a TMP36 temperature sensor with a unity-gain buffer, then feed an ATtiny85 ADC input.',
          spec: [
            'Supply the TMP36, the op-amp and the MCU from +5V and GND.',
            'The generic op-amp runs single-supply here: V+ on +5V and V− on GND.',
            'Buffer the TMP36 output with the op-amp (output tied back to the inverting input).',
            'The buffer output goes to the MCU\'s PB4 pin; label that node TEMP.',
            'Decouple both the MCU and the TMP36 with 100nF.',
            'Pull /RESET up with 10k.',
          ],
          notes:
            'The TMP36 gives 0.5V at 0°C plus 10mV/°C. Driving a long trace or a switched ADC input directly from it makes the reading sag; the buffer isolates it.',
        },
        solutionNote: 'TMP36 OUT → op-amp IN+, op-amp OUT → IN− and → PB4 (labelled TEMP). Supplies and 100nF caps on both parts.',
        /**
         * Three parts in a row, signal flowing left to right, each with its own
         * decoupling capacitor beside it. Drawn this way the buffer is visibly
         * a stage between the sensor and the MCU rather than an extra part
         * bolted on, which is the reason it is there.
         */
        solution() {
          const s = sheet();
          const sensor = s.place('TMP36', { x: 200, y: 300 });
          const opamp = s.place('OPAMP', { x: 500, y: 300 });
          const mcu = s.place('ATTINY85', { x: 900, y: 300 });

          s.wire(s.rail('+5V', { x: 200, y: 140 }).top(), sensor.pin('VCC'));
          s.wire(sensor.pin('GND'), s.rail('ground', { x: 200, y: 470 }).top());
          const sensorCap = s.place('C', { x: 60, y: 300, rot: 90, value: '100n' });
          s.wire(sensorCap.top(), { x: 200, y: 190 });
          s.wire(sensorCap.bottom(), { x: 200, y: 410 });

          s.wire(s.rail('+5V', { x: 500, y: 200 }).top(), opamp.pin('V+'));
          s.wire(opamp.pin('V-'), s.rail('ground', { x: 500, y: 400 }).top());
          s.wire(sensor.pin('OUT'), opamp.pin('IN+'));
          feedbackOverTheTop(s, opamp, { out: 620, height: 150, back: 400 });

          s.wire(s.rail('+5V', { x: 900, y: 120 }).top(), mcu.pin('VCC'));
          s.wire(mcu.pin('GND'), s.rail('ground', { x: 900, y: 490 }).top());
          const mcuCap = s.place('C', { x: 1080, y: 300, rot: 90, value: '100n' });
          s.wire(mcuCap.top(), { x: 900, y: 180 });
          s.wire(mcuCap.bottom(), { x: 900, y: 430 });

          s.wire({ x: 620, y: 300 }, mcu.pin('PB4'));
          s.label({ x: 720, y: 300 }, 'TEMP');

          const pullUp = s.place('R', { x: 720, y: 200, value: '10k' });
          s.wire(pullUp.left(), s.rail('+5V', { x: 690, y: 100 }).top());
          s.wire(pullUp.right(), mcu.pin('/RST'));

          return s.done();
        },
        requirements: {
          ercOptions: { allowUnconnected: ['ATTINY85:PB0*', 'ATTINY85:PB1', 'ATTINY85:PB2*', 'ATTINY85:PB3'] },
          requiredComponents: [
            { type: 'TMP36', min: 1, max: 1, label: 'TMP36 placed' },
            { type: 'OPAMP', min: 1, max: 1, label: 'Op-amp placed' },
            { type: 'ATTINY85', min: 1, max: 1, label: 'ATtiny85 placed' },
            { type: 'capacitor', min: 2, label: 'Two decoupling capacitors placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'TMP36', pin: 'VCC' },
              b: { rail: '+5V' },
              label: 'Sensor powered',
              fail: 'The TMP36 needs +5V on its VCC pin and GND on its ground pin.',
            },
            {
              kind: 'connected',
              a: { type: 'OPAMP', pin: 'V+' },
              b: { rail: '+5V' },
              label: 'Op-amp positive supply on +5V',
              fail: 'V+ to +5V.',
            },
            {
              kind: 'connected',
              a: { type: 'OPAMP', pin: 'V-' },
              b: { rail: 'ground' },
              label: 'Op-amp negative supply on GND (single supply)',
              fail: 'Running single-supply means V− goes to GND: the output can then only swing between the rails, which is fine for a 0.5-1.75V sensor signal.',
            },
            {
              kind: 'connected',
              a: { type: 'TMP36', pin: 'OUT' },
              b: { type: 'OPAMP', pin: 'IN+' },
              label: 'Sensor drives the buffer input',
              fail: 'The sensor output belongs on IN+, the high-impedance input.',
            },
            {
              kind: 'connected',
              a: { type: 'OPAMP', pin: 'OUT' },
              b: { type: 'OPAMP', pin: 'IN-' },
              label: 'Buffer feedback in place',
              fail: 'Tie OUT back to IN− to close the loop at unity gain. Without feedback the op-amp is a comparator and saturates.',
            },
            {
              kind: 'common_node',
              members: [{ net: 'TEMP' }, { type: 'OPAMP', pin: 'OUT' }, { type: 'ATTINY85', pin: 'PB4' }],
              label: 'Buffer output reaches PB4 as TEMP',
              fail: 'The op-amp output, the TEMP label and PB4 must all be the same node.',
            },
            {
              kind: 'decoupling',
              ic: 'ATTINY85',
              min: 47e-9,
              max: 1e-6,
              label: 'MCU decoupled',
              fail: '100nF directly across the MCU supply pins.',
            },
            {
              kind: 'decoupling',
              ic: 'TMP36',
              min: 47e-9,
              max: 10e-6,
              label: 'Sensor decoupled',
              fail: 'The TMP36 datasheet asks for a 100nF capacitor across its supply pins too: analog parts are the ones that suffer most from supply noise.',
            },
            {
              kind: 'pull_resistor',
              rail: '+5V',
              node: { type: 'ATTINY85', pin: '/RST' },
              min: 4000,
              max: 100000,
              label: '/RESET pulled up',
              fail: 'Pull /RESET to +5V through 10k.',
            },
          ],
        },
      };
    },
  },
];
