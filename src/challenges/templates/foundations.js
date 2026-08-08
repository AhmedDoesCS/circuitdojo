/**
 * Foundations, levels 1 to 3.
 *
 * Elementary circuits for someone with no prior electronics, written so the
 * maths is always handed over and the design decision is always theirs. Several
 * templates are *families*: `params` picks a structurally different variant, so
 * one template yields several genuinely different recipes.
 */

import { band } from '../rng.js';
import { formatValue, nearestE24 } from '../../schematic/units.js';
import { sheet } from '../solution.js';

/** Ladder geometry, shared with tier1 so every reference reads the same way. */
const TOP = 60;
const STEP = 120;
const row = (n) => TOP + n * STEP;

const RAILS = [
  { name: '+5V', v: 5 },
  { name: '+3V3', v: 3.3 },
  { name: '+12V', v: 12 },
];

const LED_COLOURS = [
  { color: 'red', vf: 1.8 },
  { color: 'green', vf: 2.1 },
  { color: 'yellow', vf: 2.0 },
  { color: 'blue', vf: 3.2 },
];

export const foundations = [
  {
    id: 'led_bar_indicators',
    tier: 1,
    level: 2,
    concepts: ['led_drive', 'series_parallel', 'ohms_law', 'power_dissipation'],
    topic: 'passives',
    title: 'Three-LED status bar',
    concept: 'Independent branches: each LED gets its own resistor so its current does not depend on the others.',
    params(rng) {
      const rail = rng.pick(RAILS.slice(0, 2));
      const led = rng.pick(LED_COLOURS.filter((l) => rail.v - l.vf >= 1));
      return { rail, led, current: rng.pick([3, 5, 10]) / 1000, count: 3 };
    },
    build({ rail, led, current, count }) {
      const ideal = (rail.v - led.vf) / current;
      const { min, max } = band(ideal, 0.12);
      const mA = Math.round(current * 1000);
      return {
        brief: {
          goal: `Build a ${count}-LED status bar on the ${rail.name} rail, every LED at ${mA} mA.`,
          spec: [
            `Supply from ${rail.name} and GND using power symbols.`,
            `${count} ${led.color} LEDs, Vf = ${led.vf} V, each running at ${mA} mA.`,
            'Each LED must keep its current even if the other branches are removed.',
            'Set every resistor value (±12% accepted).',
          ],
          notes: 'Work out one branch, then ask yourself what the other branches change about it. Nothing, if you wire them right.',
        },
        solutionNote: `Three parallel branches, each ${rail.name} → R → LED → GND with R = (${rail.v} − ${led.vf})/${current} ≈ ${formatValue(ideal, 'Ω')} (E24: ${formatValue(nearestE24(ideal), 'Ω')}). Total supply current is ${count} × ${mA} mA = ${count * mA} mA.`,
        solution() {
          const s = sheet();
          // One branch per LED, side by side. Drawn as separate columns because
          // that is the shape of the answer: nothing is shared between them.
          for (let i = 0; i < count; i++) {
            const x = 200 + i * 180;
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
            { type: 'D_LED', min: count, max: count, label: `${count} LEDs placed` },
            { type: 'resistor', min: count, max: count, label: `${count} resistors placed` },
          ],
          checks: [
            {
              kind: 'each_series',
              a: { type: 'D_LED' },
              b: { type: 'resistor', label: 'resistor' },
              label: 'Every LED has its own series resistor',
              fail: 'At least one LED shares a resistor with another. Shared, the branches divide the current between them and each LED dims as more are added.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              all: true,
              min,
              max,
              unit: 'Ω',
              label: `All resistors sized for ${mA} mA`,
              fail: `Each branch needs R = (V − Vf)/I = (${rail.v} − ${led.vf})/${current} ≈ ${formatValue(ideal, 'Ω')}.`,
            },
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive', 'zero'],
              label: `Anodes trace back to ${rail.name}`,
              fail: `Every branch starts at ${rail.name}.`,
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'Cathodes return to GND',
              fail: 'Check LED orientation: the barred end faces ground.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'spdt_level_select',
    tier: 1,
    level: 2,
    concepts: ['pull_resistors', 'ground_reference', 'schematic_conventions'],
    topic: 'pull_resistors',
    title: 'SPDT logic level selector',
    concept: 'A changeover switch gives a defined level in both positions, no pull resistor needed, and never a float.',
    params(rng) {
      return { rail: rng.pick(RAILS.slice(0, 2)) };
    },
    build({ rail }) {
      return {
        brief: {
          goal: `Produce a logic level that is ${rail.name} in one switch position and 0 V in the other, with no floating state.`,
          spec: [
            `Supply: ${rail.name} and GND.`,
            'Use one SPDT switch. Its common terminal is the output: label that node SEL.',
            `One throw goes to ${rail.name}, the other to GND.`,
            'SEL must never be left unconnected, and the two throws must never be shorted together.',
          ],
          notes:
            'Compare this with a pushbutton and a pull resistor: the SPDT wastes no idle current, but costs a more expensive part and an extra wire.',
        },
        solutionNote: `${rail.name} → one throw, GND → the other throw, common → SEL. In both positions SEL is driven by a rail, so it is never floating.`,
        solution() {
          const s = sheet();
          // The switch stays horizontal: its two throws are stacked on the right
          // and the common is on the left, so the drawing reads left to right as
          // "output ← changeover → the two things it selects between".
          const sw = s.place('SW_SPDT', { x: 340, y: 220 });
          s.wire(sw.pin('NC'), s.rail(rail.name, { x: 480, y: 100 }).pin(1));
          s.wire(sw.pin('NO'), s.rail('ground', { x: 480, y: 360 }).pin(1));
          s.label(s.wire(sw.pin('COM'), { x: 200, y: 220 }), 'SEL');
          return s.done();
        },
        requirements: {
          requiredComponents: [{ type: 'SW_SPDT', min: 1, max: 1, label: 'SPDT switch placed' }],
          checks: [
            {
              kind: 'connected',
              a: { type: 'SW_SPDT', pin: 'NC' },
              b: { rail: rail.name },
              label: `One throw on ${rail.name}`,
              fail: `One of the two throw terminals belongs on ${rail.name}.`,
            },
            {
              kind: 'connected',
              a: { type: 'SW_SPDT', pin: 'NO' },
              b: { rail: 'ground' },
              label: 'The other throw on GND',
              fail: 'The remaining throw terminal belongs on ground, so the other switch position gives a defined 0 V.',
            },
            {
              kind: 'connected',
              a: { net: 'SEL' },
              b: { type: 'SW_SPDT', pin: 'COM' },
              label: 'SEL labels the common terminal',
              fail: 'The common terminal is the output of the selector: label that node SEL.',
            },
            {
              kind: 'not_connected',
              a: { rail: rail.name },
              b: { rail: 'ground' },
              label: 'The rails stay separate',
              fail: 'The supply and ground have ended up on the same net: that is a short across the supply.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'divider_ladder',
    tier: 2,
    level: 2,
    concepts: ['voltage_divider', 'series_parallel', 'ohms_law'],
    topic: 'passives',
    title: 'Two-tap reference ladder',
    concept: 'A chain of resistors gives several references at once, and the same current flows through all of them.',
    params(rng) {
      const rail = rng.pick(RAILS);
      const bottom = rng.pick([10000, 4700]);
      return { rail, bottom, taps: [rng.pick([0.25, 0.33]), rng.pick([0.5, 0.66])] };
    },
    build({ rail, bottom, taps }) {
      // Three equal-current resistors: R_bottom fixed, the others set the taps.
      const vLow = Number((rail.v * taps[0]).toFixed(2));
      const vHigh = Number((rail.v * taps[1]).toFixed(2));
      const iChain = vLow / bottom;
      const rMid = (vHigh - vLow) / iChain;
      const rTop = (rail.v - vHigh) / iChain;
      return {
        brief: {
          goal: `Build a resistor ladder from ${rail.name} that provides two references: ${vHigh} V and ${vLow} V.`,
          spec: [
            `Three resistors in one chain from ${rail.name} down to GND.`,
            `Use ${formatValue(bottom, 'Ω')} as the bottom resistor.`,
            `Label the upper tap VREF_HI (${vHigh} V) and the lower tap VREF_LO (${vLow} V).`,
            'Both taps are unloaded, nothing else connects to them.',
            'Set all three resistor values (±8% accepted).',
          ],
          notes: 'One current flows through the whole chain. Find it from the bottom resistor first, then every other resistor follows from Ohm\'s law.',
        },
        solutionNote: `I_chain = ${vLow} V / ${formatValue(bottom, 'Ω')} = ${formatValue(iChain, 'A')}. R_mid = (${vHigh} − ${vLow})/I ≈ ${formatValue(rMid, 'Ω')}, R_top = (${rail.v} − ${vHigh})/I ≈ ${formatValue(rTop, 'Ω')}.`,
        solution() {
          const s = sheet();
          const x = 240;
          const top = s.place('R', { x, y: row(1), rot: 90, value: formatValue(rTop, 'Ω') });
          const mid = s.place('R', { x, y: row(2), rot: 90, value: formatValue(rMid, 'Ω') });
          const low = s.place('R', { x, y: row(3), rot: 90, value: formatValue(bottom, 'Ω') });
          s.chain(s.rail(rail.name, { x, y: row(0) }), top, mid, low, s.rail('ground', { x, y: row(4) }));
          // A tap is the node between two resistors, so the label goes exactly
          // on the junction rather than beside it.
          s.label(top.bottom(), 'VREF_HI');
          s.label(mid.bottom(), 'VREF_LO');
          return s.done();
        },
        requirements: {
          requiredComponents: [{ type: 'resistor', min: 3, max: 3, label: 'Three resistors placed' }],
          checks: [
            {
              kind: 'path',
              from: { rail: rail.name },
              to: { rail: 'ground' },
              through: ['resistive'],
              label: 'The ladder spans rail to ground',
              fail: `All three resistors form one chain from ${rail.name} to GND.`,
            },
            {
              kind: 'connected',
              a: { net: 'VREF_HI' },
              b: { type: 'resistor', connectedTo: { rail: rail.name } },
              label: 'VREF_HI sits below the top resistor',
              fail: 'The upper tap is the node between the top and middle resistors.',
            },
            {
              kind: 'connected',
              a: { net: 'VREF_LO' },
              b: { type: 'resistor', connectedTo: { rail: 'ground' } },
              label: 'VREF_LO sits above the bottom resistor',
              fail: 'The lower tap is the node between the middle and bottom resistors.',
            },
            {
              kind: 'not_connected',
              a: { net: 'VREF_HI' },
              b: { net: 'VREF_LO' },
              label: 'The two taps are different nodes',
              fail: 'Both labels have landed on the same node, so there is only one reference, not two.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              connectedTo: { rail: 'ground' },
              min: bottom * 0.98,
              max: bottom * 1.02,
              unit: 'Ω',
              label: `Bottom resistor is ${formatValue(bottom, 'Ω')}`,
              fail: `The brief fixes the ground-side resistor at ${formatValue(bottom, 'Ω')}.`,
            },
            {
              kind: 'value_range',
              type: 'resistor',
              connectedTo: { rail: rail.name },
              min: rTop * 0.92,
              max: rTop * 1.08,
              unit: 'Ω',
              label: `Top resistor sets ${vHigh} V`,
              fail: `R_top = (${rail.v} − ${vHigh}) / ${formatValue(iChain, 'A')} ≈ ${formatValue(rTop, 'Ω')}.`,
            },
          ],
        },
      };
    },
  },

  {
    id: 'wired_or_buttons',
    tier: 2,
    level: 3,
    concepts: ['pull_resistors', 'logic_levels', 'ground_reference'],
    topic: 'pull_resistors',
    title: 'Two buttons, one alarm line',
    concept: 'Active-low wired-OR: any switch can pull the shared line down, and one pull-up serves them all.',
    params(rng) {
      return { rail: rng.pick(RAILS.slice(0, 2)), pull: rng.pick([4700, 10000]) };
    },
    build({ rail, pull }) {
      const idle = rail.v / pull;
      return {
        brief: {
          goal: 'Wire two buttons onto one shared alarm line that goes LOW when either button is pressed.',
          spec: [
            `Supply: ${rail.name} and GND.`,
            `A single ${formatValue(pull, 'Ω')} pull-up holds the shared line HIGH.`,
            'Both buttons pull the same line to GND when pressed.',
            'Label the shared line nALARM.',
            'Pressing both at once must be harmless.',
          ],
          notes:
            'This is why active-low signalling is so common: any number of devices can pull a line down, but they must never fight to drive it up.',
        },
        solutionNote: `One pull-up from ${rail.name} to nALARM (current when pressed: ${formatValue(idle, 'A')}), both buttons from nALARM to GND. Two buttons pressed together is just two paths to the same ground.`,
        solution() {
          const s = sheet();
          const x = 240;
          const pullUp = s.place('R', { x, y: row(1), rot: 90, value: formatValue(pull, 'Ω') });
          const first = s.place('SW_PUSH', { x, y: row(2), rot: 90 });
          s.chain(s.rail(rail.name, { x, y: row(0) }), pullUp, first, s.rail('ground', { x, y: row(3) }));

          // The second button hangs off the same node, which is the whole
          // point of a wired-OR, and the reason there is only one pull-up.
          const second = s.place('SW_PUSH', { x: x + 180, y: row(2), rot: 90 });
          s.wire(pullUp.bottom(), second.top(), { horizontalFirst: true });
          s.chain(second, s.rail('ground', { x: x + 180, y: row(3) }));

          s.label(pullUp.bottom(), 'nALARM');
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'switch', min: 2, max: 2, label: 'Two buttons placed' },
            { type: 'resistor', min: 1, max: 1, label: 'One pull-up resistor placed' },
          ],
          checks: [
            {
              kind: 'pull_resistor',
              rail: rail.name,
              node: { net: 'nALARM' },
              min: pull * 0.5,
              max: pull * 2,
              label: 'Single pull-up on the shared line',
              fail: `One resistor bridges ${rail.name} and nALARM. Two pull-ups would work but waste current; none leaves the line floating when no button is pressed.`,
            },
            {
              kind: 'common_node',
              members: [{ net: 'nALARM' }, { type: 'switch' }, { type: 'resistor' }],
              label: 'Both buttons and the pull-up meet at nALARM',
              fail: 'All the switch terminals on the signal side, plus the pull-up leg, belong on the nALARM node.',
            },
            {
              kind: 'connected',
              a: { type: 'switch' },
              b: { rail: 'ground' },
              label: 'Buttons pull down to GND',
              fail: 'The other terminal of each button goes to ground.',
            },
            {
              kind: 'not_connected',
              a: { net: 'nALARM' },
              b: { rail: 'ground' },
              label: 'nALARM is not tied to ground',
              fail: 'The shared line sits on ground itself, so it can never read HIGH.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'rail_bypass_pair',
    tier: 2,
    level: 3,
    concepts: ['decoupling', 'capacitor_basics', 'ground_reference'],
    topic: 'power_supply',
    title: 'Bulk and bypass on a rail',
    concept: 'Two capacitors, two jobs: one holds the rail up over milliseconds, the other over nanoseconds.',
    params(rng) {
      return {
        rail: rng.pick(RAILS.slice(0, 2)),
        bulk: rng.pick([10e-6, 22e-6, 47e-6]),
        step: rng.pick([50, 100, 200]) / 1000, // load step in amps
        droop: rng.pick([50, 100]) / 1000, // allowed droop in volts
      };
    },
    build({ rail, step, droop }) {
      // ΔV = I·Δt/C over a 1ms transient, the sizing rule the brief asks for.
      const needed = (step * 1e-3) / droop;
      /**
       * The part actually recommended, derived from the requirement.
       *
       * This used to be an independent random pick from 10/22/47 µF, while the
       * droop rule needs somewhere between 500 µF and 4 mF, so the approach
       * note recommended a capacitor around twenty times too small, and the
       * grader rejected it. The one place a learner cannot tell which of the
       * two is wrong is precisely here. Deriving it from `needed` makes them
       * disagree impossible.
       */
      const bulk =
        [
          1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6, 220e-6, 470e-6, 1000e-6, 2200e-6,
          4700e-6, 10000e-6,
        ].find((c) => c >= needed * 1.5) ?? needed * 2;
      return {
        brief: {
          goal: `Fit the ${rail.name} rail with the capacitance it needs to survive a ${Math.round(step * 1000)} mA load step.`,
          spec: [
            `Rail: ${rail.name} with GND, brought out to a 2-pin connector as the load.`,
            `A ${Math.round(step * 1000)} mA step lasting 1 ms may droop the rail by no more than ${Math.round(droop * 1000)} mV.`,
            'Fit one bulk capacitor sized from that requirement, and one 100nF ceramic across the rail for fast transients.',
            'Set both capacitor values.',
          ],
          notes: 'ΔV = I·Δt / C. Rearranged for C, this tells you the smallest bulk capacitor that meets the droop limit.',
        },
        solutionNote: `C ≥ I·Δt/ΔV = ${step} A × 1 ms / ${droop} V = ${formatValue(needed, 'F')}, so ${formatValue(bulk, 'F')} is a sound choice. The 100nF handles what the bulk part is too slow and too inductive to supply.`,
        solution() {
          const s = sheet();
          // Three things across one rail: bulk, bypass and the load. Drawn as
          // three branches between the same two rails, which is what "across
          // the rail" looks like.
          const branch = (x, part) => {
            s.chain(s.rail(rail.name, { x, y: row(0) }), part, s.rail('ground', { x, y: row(2) }));
          };
          branch(200, s.place('C_POL', { x: 200, y: row(1), rot: 90, value: formatValue(bulk, 'F') }));
          branch(340, s.place('C', { x: 340, y: row(1), rot: 90, value: '100n' }));

          // The connector carries both pins on its left edge, so its feed and
          // return are routed out sideways rather than through the body.
          const load = s.place('CONN_2', { x: 560, y: row(1) });
          s.wire(load.pin('1'), s.rail(rail.name, { x: 490, y: row(0) }).pin(1), { horizontalFirst: true });
          s.wire(load.pin('2'), s.rail('ground', { x: 490, y: row(2) }).pin(1), { horizontalFirst: true });
          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'capacitor', min: 2, max: 2, label: 'Two capacitors placed' },
            { type: 'CONN_2', min: 1, max: 1, label: 'Load connector placed' },
          ],
          checks: [
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ rail: rail.name }, { rail: 'ground' }],
              min: needed * 0.9,
              max: needed * 40,
              unit: 'F',
              label: 'Bulk capacitor meets the droop limit',
              fail: `C ≥ I·Δt/ΔV = ${step}·0.001/${droop} = ${formatValue(needed, 'F')}. Anything smaller lets the rail sag past the limit.`,
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ rail: rail.name }, { rail: 'ground' }],
              min: 47e-9,
              max: 1e-6,
              unit: 'F',
              label: 'Ceramic bypass fitted',
              fail: 'A 100nF ceramic across the rail handles the fast edges the bulk capacitor cannot.',
            },
            {
              kind: 'connected',
              a: { type: 'CONN_2', pin: '1' },
              b: { rail: rail.name },
              label: 'Load connector fed from the rail',
              fail: `Pin 1 of the connector is the load feed: wire it to ${rail.name}.`,
            },
            {
              kind: 'connected',
              a: { type: 'CONN_2', pin: '2' },
              b: { rail: 'ground' },
              label: 'Load return to GND',
              fail: 'Pin 2 is the load return and belongs on ground.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'transistor_load_switch',
    tier: 3,
    level: 3,
    concepts: ['transistor_switch', 'ohms_law', 'diode_behaviour', 'led_drive'],
    topic: 'digital_logic',
    title: 'Logic-driven load switch',
    concept: 'A logic pin cannot drive a real load: a transistor multiplies its current for you.',
    params(rng) {
      const variant = rng.pick(['bjt', 'nmos']);
      return {
        variant,
        rail: { name: '+5V', v: 5 },
        loadCurrent: rng.pick([100, 200, 300]) / 1000,
        beta: 100,
        driveV: 5,
      };
    },
    build({ variant, rail, loadCurrent, beta, driveV }) {
      const isBjt = variant === 'bjt';
      const ib = (loadCurrent / beta) * 5; // 5× overdrive for hard saturation
      const rBase = (driveV - 0.7) / ib;
      const rBaseBand = band(rBase, 0.4);
      const partName = isBjt ? 'NPN transistor' : 'N-channel MOSFET';

      return {
        brief: {
          goal: `Switch a ${Math.round(loadCurrent * 1000)} mA buzzer from a ${driveV} V logic signal using an ${partName}.`,
          spec: [
            `Supply: ${rail.name} and GND. The logic signal arrives on a net labelled DRIVE.`,
            `Load: the buzzer, drawing ${Math.round(loadCurrent * 1000)} mA, switched on the low side.`,
            isBjt
              ? `Base resistor sized for saturation: aim for I_B ≈ 5 × I_C/β with β = ${beta} (±40% accepted).`
              : 'Drive the gate directly from DRIVE, and pull the gate to GND with 100k so it cannot float while the driver is in reset.',
            'The buzzer is magnetic, so fit a flyback diode across it.',
          ],
          notes: isBjt
            ? 'Saturating a BJT means deliberately over-driving the base: the "β" from the datasheet is a small-signal figure, not a switching guarantee.'
            : 'A MOSFET gate is a capacitor: it takes no steady current, but it holds whatever charge was left on it, which is why an undriven gate is dangerous.',
        },
        solutionNote: isBjt
          ? `I_B = 5·I_C/β = 5·${loadCurrent}/${beta} = ${formatValue(ib, 'A')}; R_B = (${driveV} − 0.7)/I_B ≈ ${formatValue(rBase, 'Ω')}. Buzzer from ${rail.name} to collector, flyback diode across the buzzer, emitter to GND.`
          : `DRIVE → gate, 100k gate-to-GND, buzzer from ${rail.name} to drain, flyback diode across the buzzer, source to GND.`,
        solution() {
          const s = sheet();
          const device = isBjt ? 'Q_NPN' : 'Q_NMOS';
          const inPin = isBjt ? 'B' : 'G';
          const highPin = isBjt ? 'C' : 'D';
          const lowPin = isBjt ? 'E' : 'S';

          // The load sits above the switching device and the device sits above
          // ground: low-side switching, drawn the way it is described.
          const q = s.place(device, { x: 420, y: 340 });
          const buzzer = s.place('BUZZER', { x: 430, y: 180 });
          s.wire(buzzer.pin('+'), s.rail(rail.name, { x: 330, y: 70 }).pin(1), { horizontalFirst: true });
          s.wire(buzzer.pin('-'), q.pin(highPin));
          s.wire(q.pin(lowPin), s.rail('ground', { x: 440, y: 470 }).pin(1));

          // Flyback across the coil: cathode to the rail, anode on the switched
          // node, so the collapsing field has somewhere to go and the diode is
          // reverse-biased whenever the load is simply on.
          const flyback = s.place('D', { x: 610, y: 260, rot: 270 });
          s.wire(flyback.pin('K'), s.rail(rail.name, { x: 610, y: 70 }).pin(1));
          s.wire(flyback.pin('A'), q.pin(highPin), { horizontalFirst: true });

          if (isBjt) {
            // A base is a forward-biased diode; the resistor is what stops a
            // logic output from being asked for unlimited current.
            const rBaseR = s.place('R', { x: 250, y: 340, value: formatValue(nearestE24(rBase), 'Ω') });
            s.wire(rBaseR.right(), q.pin('B'));
            s.label(s.wire(rBaseR.left(), { x: 130, y: 340 }), 'DRIVE');
          } else {
            s.label(s.wire(q.pin('G'), { x: 130, y: 340 }), 'DRIVE');
            // A gate holds its charge, so it needs somewhere to lose it.
            const pullDown = s.place('R', { x: 250, y: 420, rot: 90, value: '100k' });
            s.wire({ x: 250, y: 340 }, pullDown.top());
            s.wire(pullDown.bottom(), s.rail('ground', { x: 250, y: 520 }).pin(1));
          }
          return s.done();
        },
        requirements: {
          // The brief hands the learner this signal; nothing on the sheet
          // drives it, and nothing is meant to.
          ercOptions: { drivenNets: ['DRIVE'] },
          requiredComponents: [
            { type: isBjt ? 'Q_NPN' : 'Q_NMOS', min: 1, max: 1, label: `${partName} placed` },
            { type: 'BUZZER', min: 1, max: 1, label: 'Buzzer placed' },
            { type: 'diode', min: 1, label: 'Flyback diode placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'BUZZER', pin: '+' },
              b: { rail: rail.name },
              label: 'Buzzer fed from the rail',
              fail: `The load sits between ${rail.name} and the switching device: that is what "low-side switching" means.`,
            },
            {
              kind: 'connected',
              a: { type: isBjt ? 'Q_NPN' : 'Q_NMOS', pin: isBjt ? 'E' : 'S' },
              b: { rail: 'ground' },
              label: `${isBjt ? 'Emitter' : 'Source'} on GND`,
              fail: `The ${isBjt ? 'emitter' : 'source'} is the common terminal and belongs on ground.`,
            },
            {
              kind: 'connected',
              a: { type: 'BUZZER', pin: '-' },
              b: { type: isBjt ? 'Q_NPN' : 'Q_NMOS', pin: isBjt ? 'C' : 'D' },
              label: `Load switched by the ${isBjt ? 'collector' : 'drain'}`,
              fail: `The return side of the buzzer connects to the ${isBjt ? 'collector' : 'drain'}; the device completes the circuit to ground when it turns on.`,
            },
            {
              kind: 'connected',
              a: { type: 'diode', pin: 'K' },
              b: { rail: rail.name },
              label: 'Flyback diode cathode on the positive side',
              fail: 'The flyback diode goes across the load, cathode to the positive rail. Reversed, it short-circuits the supply.',
            },
            {
              kind: 'connected',
              a: { type: 'diode', pin: 'A' },
              b: { type: isBjt ? 'Q_NPN' : 'Q_NMOS', pin: isBjt ? 'C' : 'D' },
              label: 'Flyback diode anode on the switched node',
              fail: 'The anode belongs on the switched node, so the coil current has somewhere to go the instant the device turns off.',
            },
            ...(isBjt
              ? [
                  {
                    kind: 'component_count',
                    type: 'resistor',
                    between: [{ net: 'DRIVE' }, { type: 'Q_NPN', pin: 'B' }],
                    min: 1,
                    label: 'Base resistor between DRIVE and the base',
                    fail: 'A BJT base is a forward-biased diode: connected straight to a logic output it draws unlimited current and destroys both parts.',
                  },
                  {
                    kind: 'value_range',
                    type: 'resistor',
                    between: [{ net: 'DRIVE' }, { type: 'Q_NPN', pin: 'B' }],
                    min: rBaseBand.min,
                    max: rBaseBand.max,
                    unit: 'Ω',
                    label: 'Base resistor sized for saturation',
                    fail: `I_B = 5·I_C/β = ${formatValue(ib, 'A')}, so R_B = (${driveV} − 0.7)/I_B ≈ ${formatValue(rBase, 'Ω')}.`,
                  },
                ]
              : [
                  {
                    kind: 'connected',
                    a: { net: 'DRIVE' },
                    b: { type: 'Q_NMOS', pin: 'G' },
                    label: 'DRIVE reaches the gate',
                    fail: 'The logic signal drives the gate directly, no series resistor is needed for a slow load like this.',
                  },
                  {
                    kind: 'pull_resistor',
                    rail: 'ground',
                    node: { type: 'Q_NMOS', pin: 'G' },
                    min: 10000,
                    max: 1000000,
                    label: 'Gate pull-down fitted',
                    fail: 'A MOSFET gate holds its charge. Without a pull-down to ground it can sit half-on while the driver is in reset, and the device overheats.',
                  },
                ]),
          ],
        },
      };
    },
  },
];
