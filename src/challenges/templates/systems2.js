/**
 * Power, protection, comparators and microcontroller-hardware challenges,
 * levels 4 to 7.
 *
 * The MCU templates carry a `firmware` contract: the software behaviour is
 * given as a hardware requirement (which pins are driven, which are read, what
 * state they hold during reset), so the learner designs for real firmware
 * without writing a line of code.
 */

import { band } from '../rng.js';
import { formatValue } from '../../schematic/units.js';
import { sheet, powerAndDecouple, supplyAndCap } from '../solution.js';

export const systems2 = [
  {
    id: 'ldo_analog_rail',
    tier: 2,
    level: 5,
    concepts: ['linear_regulation', 'decoupling', 'capacitor_basics'],
    topic: 'power_supply',
    title: 'Quiet analog rail from a noisy 5V',
    concept: 'Regulate, then filter: an LDO sets the voltage, a ferrite and capacitors keep switching noise out of it.',
    params(rng) {
      return { cout: rng.pick([10e-6, 22e-6]), cin: rng.pick([1e-6, 10e-6]) };
    },
    build({ cout, cin }) {
      return {
        brief: {
          goal: 'Derive a clean +3V3 analog rail from a noisy +5V supply using an LDO and a filter.',
          spec: [
            'Input: the +5V rail. Output: a +3V3 power symbol driven by the LDO.',
            `Fit ${formatValue(cin, 'F')} on the LDO input and ${formatValue(cout, 'F')} on its output: the datasheet requires an output capacitor for stability.`,
            'Between the LDO output and the analog rail, fit a ferrite bead with a 100nF capacitor on the far side of it.',
            'Ground the LDO and set every capacitor value.',
          ],
          notes:
            'A ferrite is a wire at DC and a resistor at high frequency. On its own it does nothing: it needs capacitance on both sides to form a filter.',
        },
        solutionNote:
          '+5V → LDO IN (with input cap), LDO OUT → output cap → ferrite → +3V3 symbol, 100nF after the ferrite. The ferrite and the two capacitors form a π filter.',
        /**
         * One horizontal line with three capacitors hanging off it in a row.
         * Drawn like that the filter is visible as a filter: capacitor,
         * series element, capacitor, which is the shape of every pi filter
         * anyone will ever ask for.
         */
        solution() {
          const s = sheet();
          const ldo = s.place('LDO_3V3', { x: 400, y: 300 });

          s.wire(s.rail('+5V', { x: 200, y: 180 }).top(), ldo.pin('IN'));
          s.wire(ldo.pin('GND'), s.rail('ground', { x: 400, y: 470 }).top());

          const bead = s.place('FERRITE', { x: 680, y: 300 });
          s.wire(ldo.pin('OUT'), bead.left());
          s.wire(bead.right(), s.rail('+3V3', { x: 830, y: 180 }).top(), { horizontalFirst: true });

          const shunts = [
            [270, formatValue(cin, 'F')],
            [540, formatValue(cout, 'F')],
            [780, '100n'],
          ];
          for (const [x, value] of shunts) {
            const cap = s.place('C', { x, y: 380, rot: 90, value });
            s.wire(cap.top(), { x, y: 300 });
            s.wire(cap.bottom(), s.rail('ground', { x, y: 470 }).top());
          }

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'LDO_3V3', min: 1, max: 1, label: 'LDO placed' },
            { type: 'FERRITE', min: 1, max: 1, label: 'Ferrite bead placed' },
            { type: 'capacitor', min: 3, label: 'Three capacitors placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'LDO_3V3', pin: 'IN' },
              b: { rail: '+5V' },
              label: 'LDO input on +5V',
              fail: 'The regulator input takes the unregulated +5V rail.',
            },
            {
              kind: 'connected',
              a: { type: 'LDO_3V3', pin: 'GND' },
              b: { rail: 'ground' },
              label: 'LDO ground connected',
              fail: 'Without its ground pin the regulator has no reference and cannot regulate.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'LDO_3V3', pin: 'IN' }, { rail: 'ground' }],
              min: 0.5e-6,
              max: 100e-6,
              unit: 'F',
              label: 'Input capacitor fitted',
              fail: `Put ${formatValue(cin, 'F')} between the LDO input and ground.`,
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'LDO_3V3', pin: 'OUT' }, { rail: 'ground' }],
              min: 4.7e-6,
              max: 100e-6,
              unit: 'F',
              label: 'Output capacitor fitted',
              fail: `An LDO needs its specified output capacitor (${formatValue(cout, 'F')} here) to keep its control loop stable: without it the regulator can oscillate.`,
            },
            {
              kind: 'connected',
              a: { type: 'FERRITE' },
              b: { type: 'LDO_3V3', pin: 'OUT' },
              label: 'Ferrite fed from the LDO output',
              fail: 'The ferrite goes in series between the regulator output and the analog rail.',
            },
            {
              kind: 'connected',
              a: { type: 'FERRITE' },
              b: { rail: '+3V3' },
              label: 'Ferrite feeds the +3V3 rail',
              fail: 'The far side of the ferrite is the analog rail: put the +3V3 power symbol there.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ rail: '+3V3' }, { rail: 'ground' }],
              min: 47e-9,
              max: 10e-6,
              unit: 'F',
              label: 'Capacitor after the ferrite',
              fail: 'A ferrite only filters when there is capacitance on the far side of it: fit 100nF from the analog rail to ground.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'supply_input_protection',
    tier: 4,
    level: 7,
    concepts: ['input_protection', 'diode_behaviour', 'protection_systems', 'power_dissipation'],
    topic: 'protection',
    title: 'Protected supply input',
    concept: 'A product survives what a prototype does not: reversed supplies, surges and overcurrent.',
    params(rng) {
      const variant = rng.pick(['pfet', 'schottky']);
      return { variant, fuse: rng.pick([0.5, 1, 2]), rail: { name: '+12V', v: 12 } };
    },
    build({ variant, fuse, rail }) {
      const isPfet = variant === 'pfet';
      return {
        brief: {
          goal: `Design a protected ${rail.name} input that survives a reversed supply, a surge and an overload.`,
          spec: [
            `Input arrives on a 2-pin connector. The protected rail is the ${rail.name} power symbol.`,
            `Fit a ${fuse} A fuse in the incoming positive line.`,
            'Fit a TVS diode across the input, after the fuse, to clamp surges.',
            isPfet
              ? 'Use a P-channel MOSFET for reverse-polarity protection: source to the incoming positive, drain to the protected rail, gate to ground.'
              : 'Use a Schottky diode in series for reverse-polarity protection, anode to the incoming positive.',
            'Fit a 10µF bulk capacitor on the protected rail.',
          ],
          notes: isPfet
            ? 'The P-FET conducts through its body diode first, then the gate-source voltage turns the channel on properly, so the drop becomes I·R_DS(on) instead of a diode drop.'
            : 'A series Schottky is the simplest reverse protection there is, and it costs you its forward drop (~0.3V) and the power that goes with it, every second the product is on.',
        },
        solutionNote: isPfet
          ? `Connector → fuse → TVS to GND → P-FET (source in, drain out, gate to GND) → ${rail.name} → 10µF. Loss = I²·R_DS(on), typically milliwatts.`
          : `Connector → fuse → TVS to GND → Schottky (anode in, cathode out) → ${rail.name} → 10µF. Loss = I × 0.3V, which at 1A is 0.3W of heat.`,
        /**
         * Strictly in the order the hazards arrive: connector, fuse, clamp,
         * reverse protection, then the rail. The order is the design, and a
         * drawing that puts the TVS before the fuse describes a different and
         * worse circuit even though every part is present.
         *
         * The connector is mirrored so its pins face into the sheet, which is
         * the only way a left-hand input reads left to right.
         */
        solution() {
          const s = sheet();
          const inlet = s.place('CONN_2', { x: 150, y: 300, mirror: true });
          const link = s.place('FUSE', { x: 320, y: 290, value: `${fuse}A` });

          s.wire(inlet.pin('1'), link.left());
          s.wire(inlet.pin('2'), s.rail('ground', { x: 180, y: 430 }).top());

          s.wire(link.right(), { x: 450, y: 290 });
          const clamp = s.place('D_TVS', { x: 450, y: 380, rot: 90 });
          s.wire({ x: 450, y: 290 }, clamp.top());
          s.wire(clamp.bottom(), s.rail('ground', { x: 450, y: 470 }).top());

          if (isPfet) {
            const fet = s.place('Q_PMOS', { x: 620, y: 290 });
            s.wire({ x: 450, y: 290 }, fet.pin('S'));
            s.wire(fet.pin('G'), s.rail('ground', { x: 590, y: 470 }).top());
            s.wire(fet.pin('D'), { x: 800, y: 330 });
            s.wire({ x: 800, y: 330 }, s.rail(rail.name, { x: 800, y: 180 }).top());
          } else {
            const blocker = s.place('D_SCHOTTKY', { x: 620, y: 290 });
            s.wire({ x: 450, y: 290 }, blocker.left());
            s.wire(blocker.right(), s.rail(rail.name, { x: 800, y: 180 }).top(), { horizontalFirst: true });
          }

          const bulk = s.place('C_POL', { x: 950, y: 300, rot: 90, value: '10u' });
          s.wire(s.rail(rail.name, { x: 950, y: 180 }).top(), bulk.top());
          s.wire(bulk.bottom(), s.rail('ground', { x: 950, y: 470 }).top());

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'CONN_2', min: 1, max: 1, label: 'Input connector placed' },
            { type: 'FUSE', min: 1, max: 1, label: 'Fuse placed' },
            { type: 'D_TVS', min: 1, max: 1, label: 'TVS diode placed' },
            { type: isPfet ? 'Q_PMOS' : 'D_SCHOTTKY', min: 1, max: 1, label: isPfet ? 'P-FET placed' : 'Schottky placed' },
            { type: 'capacitor', min: 1, label: 'Bulk capacitor placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'CONN_2', pin: '1' },
              b: { type: 'FUSE' },
              label: 'Fuse is first in the incoming line',
              fail: 'The fuse protects everything downstream of it, so it belongs immediately at the input.',
            },
            {
              kind: 'connected',
              a: { type: 'CONN_2', pin: '2' },
              b: { rail: 'ground' },
              label: 'Input return on GND',
              fail: 'The negative side of the connector is the ground return.',
            },
            {
              kind: 'connected',
              a: { type: 'D_TVS' },
              b: { rail: 'ground' },
              label: 'TVS returns to GND',
              fail: 'A TVS clamps between the line and ground: it needs a solid ground connection to divert the surge into.',
            },
            {
              kind: 'connected',
              a: { type: 'D_TVS' },
              b: { type: 'FUSE' },
              label: 'TVS sits after the fuse',
              fail: 'Place the TVS downstream of the fuse, so a sustained fault opens the fuse instead of cooking the TVS.',
            },
            ...(isPfet
              ? [
                  {
                    kind: 'connected',
                    a: { type: 'Q_PMOS', pin: 'S' },
                    b: { type: 'FUSE' },
                    label: 'P-FET source on the incoming side',
                    fail: 'For high-side reverse protection the source faces the incoming supply and the drain faces the load.',
                  },
                  {
                    kind: 'connected',
                    a: { type: 'Q_PMOS', pin: 'D' },
                    b: { rail: rail.name },
                    label: 'P-FET drain feeds the protected rail',
                    fail: `The drain is the protected side: put the ${rail.name} symbol there.`,
                  },
                  {
                    kind: 'connected',
                    a: { type: 'Q_PMOS', pin: 'G' },
                    b: { rail: 'ground' },
                    label: 'P-FET gate referenced to GND',
                    fail: 'Gate to ground gives V_GS = −V_supply when the polarity is correct, which turns the FET on. With the supply reversed, V_GS is positive and it stays off.',
                  },
                ]
              : [
                  {
                    kind: 'connected',
                    a: { type: 'D_SCHOTTKY', pin: 'A' },
                    b: { type: 'FUSE' },
                    label: 'Schottky anode on the incoming side',
                    fail: 'Current must flow anode → cathode, so the anode faces the incoming supply.',
                  },
                  {
                    kind: 'connected',
                    a: { type: 'D_SCHOTTKY', pin: 'K' },
                    b: { rail: rail.name },
                    label: 'Schottky cathode feeds the protected rail',
                    fail: `The cathode is the protected side: put the ${rail.name} symbol there.`,
                  },
                ]),
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ rail: rail.name }, { rail: 'ground' }],
              min: 4.7e-6,
              max: 470e-6,
              unit: 'F',
              label: 'Bulk capacitor on the protected rail',
              fail: 'Fit 10µF from the protected rail to ground, downstream of the protection.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'comparator_hysteresis',
    tier: 5,
    level: 6,
    concepts: ['opamp_practical', 'voltage_divider', 'sensor_interface', 'logic_levels'],
    topic: 'signal_chain',
    title: 'Comparator with hysteresis',
    concept: 'Open-collector output plus positive feedback: a threshold detector that does not chatter.',
    params(rng) {
      return { pull: rng.pick([4700, 10000]), rail: { name: '+5V', v: 5 }, fb: rng.pick([100000, 220000]) };
    },
    build({ pull, rail, fb }) {
      return {
        brief: {
          goal: 'Turn a slowly changing sensor voltage into a clean digital signal using an LM393 comparator.',
          spec: [
            `Supply the LM393 from ${rail.name} and GND: its power unit must be placed, and decouple it with 100nF.`,
            'An LDR and a fixed resistor form the sensor divider. Label its midpoint SENSE and take it to the inverting input.',
            'Two equal resistors form a reference divider across the rail. Label its midpoint VREF and take it to the non-inverting input.',
            `The output is open-collector: fit a ${formatValue(pull, 'Ω')} pull-up to ${rail.name}. Label the output node DOUT.`,
            `Add a ${formatValue(fb, 'Ω')} positive-feedback resistor from the output back to the non-inverting input to create hysteresis.`,
          ],
          notes:
            'Without hysteresis, noise on a signal creeping past the threshold makes the output flip back and forth many times. Positive feedback moves the threshold as soon as the output changes, so it takes a real change to come back.',
        },
        solutionNote: `Sensor divider → IN−, reference divider → IN+, ${formatValue(fb, 'Ω')} from OUT to IN+, ${formatValue(pull, 'Ω')} pull-up on OUT. The feedback resistor and the reference divider set how wide the hysteresis band is.`,
        /**
         * The sensor divider sits above and the reference below, each with a
         * clear run to its own input, so the two never appear to touch. The
         * hysteresis resistor is drawn as a loop from the output back under the
         * part to IN+, which is what positive feedback looks like: the output
         * reaching back to move the threshold it was just compared against.
         */
        solution() {
          const s = sheet();
          const cmp = s.place('LM393', { x: 700, y: 400, unitId: 'A' });

          const sensor = s.place('LDR', { x: 340, y: 140, rot: 90 });
          const fixed = s.place('R', { x: 340, y: 250, rot: 90, value: '10k' });
          s.chain(s.rail(rail.name, { x: 340, y: 60 }), sensor, fixed, s.rail('ground', { x: 340, y: 360 }));
          s.label({ x: 340, y: 195 }, 'SENSE');
          s.wire({ x: 340, y: 195 }, { x: 600, y: 195 });
          s.wire({ x: 600, y: 195 }, cmp.pin('IN-'));

          const refTop = s.place('R', { x: 200, y: 540, rot: 90, value: '10k' });
          const refBottom = s.place('R', { x: 200, y: 650, rot: 90, value: '10k' });
          s.chain(s.rail(rail.name, { x: 200, y: 460 }), refTop, refBottom, s.rail('ground', { x: 200, y: 760 }));
          s.label({ x: 200, y: 595 }, 'VREF');
          s.wire({ x: 200, y: 595 }, { x: 560, y: 595 });
          s.wire({ x: 560, y: 595 }, cmp.pin('IN+'));

          s.wire(cmp.pin('OUT'), { x: 900, y: 400 });
          s.label({ x: 900, y: 400 }, 'DOUT');
          const pullUp = s.place('R', { x: 900, y: 280, rot: 90, value: formatValue(pull, 'Ω') });
          s.wire(s.rail(rail.name, { x: 900, y: 180 }).top(), pullUp.top());
          s.wire(pullUp.bottom(), { x: 900, y: 400 });

          const hysteresis = s.place('R', { x: 800, y: 500, value: formatValue(fb, 'Ω') });
          s.wire({ x: 860, y: 400 }, hysteresis.right());
          s.wire(hysteresis.left(), cmp.pin('IN+'));

          powerAndDecouple(s, 'LM393', { x: 1150 });

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'LM393', min: 1, max: 1, label: 'LM393 placed' },
            { type: 'LDR', min: 1, max: 1, label: 'Photoresistor placed' },
            // 'R' rather than the 'resistor' tag, which the LDR also carries.
            { type: 'R', min: 5, max: 5, label: 'Five resistors placed' },
            { type: 'capacitor', min: 1, label: 'Decoupling capacitor placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: 'LM393',
              label: 'Comparator powered',
              fail: 'Place the LM393 power unit and wire pin 8 to +5V, pin 4 to GND.',
            },
            {
              kind: 'decoupling',
              ic: 'LM393',
              min: 47e-9,
              max: 1e-6,
              label: 'Comparator decoupled',
              fail: '100nF directly across the comparator supply pins.',
            },
            {
              kind: 'common_node',
              members: [{ net: 'SENSE' }, { type: 'LDR' }, { type: 'LM393', pin: 'IN-' }],
              label: 'Sensor divider drives IN−',
              fail: 'The LDR divider midpoint, the SENSE label and the inverting input all belong on one node.',
            },
            {
              kind: 'connected',
              a: { net: 'VREF' },
              b: { type: 'LM393', pin: 'IN+' },
              label: 'Reference drives IN+',
              fail: 'The reference divider midpoint (VREF) goes to the non-inverting input.',
            },
            {
              kind: 'pull_resistor',
              rail: rail.name,
              node: { net: 'DOUT' },
              min: pull * 0.4,
              max: pull * 3,
              label: 'Pull-up on the open-collector output',
              fail: 'An open-collector output can only pull low. Without a pull-up to the rail it never produces a logic high at all.',
            },
            {
              kind: 'connected',
              a: { net: 'DOUT' },
              b: { type: 'LM393', pin: 'OUT' },
              label: 'DOUT labels the comparator output',
              fail: 'Label the output node DOUT.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ type: 'LM393', pin: 'OUT' }, { type: 'LM393', pin: 'IN+' }],
              min: 1,
              label: 'Positive-feedback resistor fitted',
              fail: 'Hysteresis comes from a resistor between the output and the NON-inverting input. On the inverting input it would be negative feedback, turning the comparator into a (badly compensated) amplifier.',
            },
            {
              kind: 'not_connected',
              a: { net: 'SENSE' },
              b: { net: 'VREF' },
              label: 'Sensor and reference nodes stay separate',
              fail: 'Both comparator inputs are on the same node, so it can never change state.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'mcu_gpio_contract',
    tier: 5,
    level: 4,
    concepts: ['mcu_hardware_contract', 'pull_resistors', 'decoupling', 'led_drive'],
    topic: 'mcu',
    title: 'GPIO hardware contract',
    concept: 'Firmware states how it will use each pin; the schematic has to make that behaviour possible.',
    params(rng) {
      return { rail: { name: '+5V', v: 5 }, led: { color: 'green', vf: 2.1 }, current: rng.pick([3, 5]) / 1000, pull: 10000 };
    },
    build({ rail, led, current, pull }) {
      const ideal = (rail.v - led.vf) / current;
      const { min, max } = band(ideal, 0.25);
      return {
        brief: {
          goal: 'Build the hardware an ATtiny85 firmware release needs: one indicator output and one button input.',
          spec: [
            `Supply the MCU from ${rail.name} and GND, decoupled with 100nF.`,
            `PB1 drives a ${led.color} LED (Vf = ${led.vf} V) at about ${Math.round(current * 1000)} mA through a series resistor.`,
            `PB3 reads a pushbutton. The firmware does NOT enable the internal pull-up, so provide an external ${formatValue(pull, 'Ω')} pull-up and wire the button to ground.`,
            'Pull /RESET up with 10k so the part cannot reset on noise.',
            'Unused pins may be left open.',
          ],
          notes:
            'Read the firmware contract tab before wiring. "The firmware does not enable the internal pull-up" is a hardware requirement in disguise.',
        },
        firmware: {
          summary:
            'Release 1.2 of the firmware configures the port once at start-up and then loops: it reads PB3 and mirrors it to the LED on PB1.',
          pins: [
            { pin: 'PB1', role: 'Push-pull output, drives the indicator LED high to light it', reset: 'Input, high-Z' },
            { pin: 'PB3', role: 'Digital input, internal pull-up NOT enabled', reset: 'Input, high-Z' },
            { pin: '/RESET', role: 'Not used by firmware; must stay high for the part to run', reset: 'Reset input' },
          ],
          implications: [
            'PB1 is high-impedance from power-on until the firmware configures it, so the LED branch must not depend on the pin holding any particular level at reset.',
            'Because the internal pull-up stays off, PB3 has no defined level unless you provide one externally.',
            'Total port current matters as much as per-pin current: an ATtiny85 pin sources 20mA at absolute maximum, and a few mA is the sensible design point.',
          ],
        },
        solutionNote: `PB1 → R (${formatValue(ideal, 'Ω')}) → LED → GND. ${formatValue(pull, 'Ω')} from ${rail.name} to PB3, button from PB3 to GND. 10k from ${rail.name} to /RESET, 100nF across pins 8 and 4.`,
        /**
         * Inputs on the left, output on the right, which is the convention and
         * is also what keeps the /RESET pull-up and the PB3 network from having
         * to reach across each other. The button network is one column: pull-up
         * above the node, switch below it, exactly as the pull-resistor block
         * taught it.
         */
        solution() {
          const s = sheet();
          const mcu = s.place('ATTINY85', { x: 400, y: 400 });
          supplyAndCap(s, mcu, { rail: rail.name, top: 200, bottom: 600, capX: 1000, tees: [250, 540] });

          const reset = s.place('R', { x: 280, y: 180, rot: 90, value: '10k' });
          s.wire(s.rail(rail.name, { x: 280, y: 60 }).top(), reset.top());
          s.wire(reset.bottom(), mcu.pin('/RST'));

          const up = s.place('R', { x: 180, y: 180, rot: 90, value: formatValue(pull, 'Ω') });
          const button = s.place('SW_PUSH', { x: 180, y: 470, rot: 90 });
          s.wire(s.rail(rail.name, { x: 180, y: 60 }).top(), up.top());
          s.wire(up.bottom(), { x: 180, y: 380 });
          s.wire({ x: 180, y: 380 }, mcu.pin('PB3'));
          s.wire({ x: 180, y: 380 }, button.top());
          s.wire(button.bottom(), s.rail('ground', { x: 180, y: 600 }).top());

          const limit = s.place('R', { x: 620, y: 380, value: formatValue(ideal, 'Ω') });
          const lamp = s.place('D_LED', { x: 820, y: 380 });
          s.wire(mcu.pin('PB1'), limit.left());
          s.chainX(limit, lamp);
          s.wire(lamp.right(), s.rail('ground', { x: lamp.right().x, y: 520 }).top());

          return s.done();
        },
        requirements: {
          ercOptions: { allowUnconnected: ['ATTINY85:PB0*', 'ATTINY85:PB2*', 'ATTINY85:PB4'] },
          requiredComponents: [
            { type: 'ATTINY85', min: 1, max: 1, label: 'ATtiny85 placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'LED placed' },
            { type: 'switch', min: 1, max: 1, label: 'Button placed' },
            { type: 'capacitor', min: 1, label: 'Decoupling capacitor placed' },
          ],
          checks: [
            { kind: 'ic_powered', type: 'ATTINY85', label: 'MCU powered', fail: 'Pin 8 to +5V, pin 4 to GND.' },
            {
              kind: 'decoupling',
              ic: 'ATTINY85',
              min: 47e-9,
              max: 1e-6,
              label: 'MCU decoupled',
              fail: '100nF directly across the MCU supply pins.',
            },
            {
              kind: 'path',
              from: { type: 'ATTINY85', pin: 'PB1' },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive'],
              label: 'PB1 drives the LED through a resistor',
              fail: 'The firmware drives PB1 high to light the LED, so the LED anode must reach PB1 through a series resistor.',
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'LED returns to GND',
              fail: 'The cathode needs a route to ground.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              inSeriesWith: { type: 'D_LED' },
              min,
              max,
              unit: 'Ω',
              label: 'LED resistor sized for the pin',
              fail: `R = (${rail.v} − ${led.vf}) / ${current} ≈ ${formatValue(ideal, 'Ω')}. Keep the current low: an MCU pin is not a power driver.`,
            },
            {
              kind: 'pull_resistor',
              rail: rail.name,
              node: { type: 'ATTINY85', pin: 'PB3' },
              min: pull * 0.4,
              max: pull * 5,
              label: 'External pull-up on PB3',
              fail: `The firmware contract says the internal pull-up is disabled, so PB3 floats unless you fit an external one. ${formatValue(pull, 'Ω')} from ${rail.name} to PB3.`,
            },
            {
              kind: 'connected',
              a: { type: 'switch' },
              b: { type: 'ATTINY85', pin: 'PB3' },
              label: 'Button on the PB3 node',
              fail: 'One button terminal belongs on PB3.',
            },
            {
              kind: 'connected',
              a: { type: 'switch' },
              b: { rail: 'ground' },
              label: 'Button pulls PB3 down',
              fail: 'The other button terminal goes to ground, so pressing it reads as a low.',
            },
            {
              kind: 'pull_resistor',
              rail: rail.name,
              node: { type: 'ATTINY85', pin: '/RST' },
              min: 4000,
              max: 100000,
              label: '/RESET pulled up',
              fail: 'Pull /RESET to the rail through 10k.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'mcu_motor_contract',
    tier: 7,
    level: 7,
    concepts: ['motor_drive', 'mcu_hardware_contract', 'decoupling', 'transistor_switch', 'emc_practice'],
    topic: 'mechatronics',
    title: 'Motor drive to a firmware contract',
    concept: 'Mechatronics: a logic-level control interface on one side, a noisy inductive load on the other.',
    params(rng) {
      return { bulk: rng.pick([100e-6, 220e-6]), rail: { name: '+12V', v: 12 } };
    },
    build({ bulk, rail }) {
      return {
        brief: {
          goal: 'Wire an H-bridge so an ATtiny85 running the given firmware can drive a DC motor in both directions.',
          spec: [
            `Motor supply: ${rail.name}. Logic supply: +5V. Both share GND.`,
            'MCU PB0 → IN1, PB1 → IN2, PB2 → nSLEEP on the H-bridge.',
            'The motor connects across OUT1 and OUT2.',
            `Fit ${formatValue(bulk, 'F')} of bulk capacitance directly across the H-bridge motor supply, plus 100nF.`,
            'Decouple the MCU with 100nF and pull its /RESET up with 10k.',
          ],
          notes:
            'The motor supply and the logic supply must share a ground, or the control signals have no reference. They must not share anything else.',
        },
        firmware: {
          summary:
            'The motion firmware drives IN1/IN2 as a complementary PWM pair and holds nSLEEP high while the motor is enabled. It never drives both inputs high at once.',
          pins: [
            { pin: 'PB0', role: 'PWM output → IN1 (forward drive)', reset: 'Input, high-Z' },
            { pin: 'PB1', role: 'PWM output → IN2 (reverse drive)', reset: 'Input, high-Z' },
            { pin: 'PB2', role: 'Output → nSLEEP, driven high to enable the bridge', reset: 'Input, high-Z' },
          ],
          implications: [
            'Every control pin is high-impedance from power-on until firmware configures it, so the bridge must not be able to drive the motor during that window: nSLEEP needs a pull-down to keep the driver asleep until the MCU says otherwise.',
            'Motor current returns through the ground; keep it out of the logic supply by decoupling both sides properly and sharing ground at one point.',
            'A stalled motor draws its stall current continuously: size the supply and the bulk capacitance for that case, not for the running current.',
          ],
        },
        solutionNote: `+12V and bulk (${formatValue(bulk, 'F')}) + 100nF at the H-bridge VM pin, motor across OUT1/OUT2, PB0/PB1/PB2 → IN1/IN2/nSLEEP, pull-down on nSLEEP, MCU decoupled with /RESET pulled up, single common ground.`,
        /**
         * Logic on the left, power on the right, one signal per height, and
         * nothing crossing. The three control wires stagger their turns so they
         * stay in the order the pins are already in, which is the trick that
         * makes a fan of parallel signals readable without a single junction.
         */
        solution() {
          const s = sheet();
          const mcu = s.place('ATTINY85', { x: 400, y: 400 });
          const bridge = s.place('HBRIDGE', { x: 900, y: 400 });

          supplyAndCap(s, mcu, { rail: '+5V', top: 200, bottom: 600, capX: 100, tees: [220, 540] });
          const reset = s.place('R', { x: 220, y: 360, value: '10k' });
          s.wire(s.rail('+5V', { x: 190, y: 280 }).top(), reset.left());
          s.wire(reset.right(), mcu.pin('/RST'));

          s.wire(s.rail('+12V', { x: 900, y: 200 }).top(), bridge.pin('VM'));
          s.wire(bridge.pin('GND'), s.rail('ground', { x: 900, y: 620 }).top());

          for (const [x, from, to] of [
            [560, 'PB0/SDA', 'IN1'],
            [520, 'PB1', 'IN2'],
            [490, 'PB2/SCL', 'nSLEEP'],
          ]) {
            const corner = { x, y: mcu.pin(from).y };
            s.wire(mcu.pin(from), corner);
            s.wire(corner, bridge.pin(to));
          }

          // The bridge must stay asleep through the window between power-on and
          // the firmware configuring PB2, so the pull-down is not optional.
          const hold = s.place('R', { x: 700, y: 520, rot: 90, value: '47k' });
          s.wire({ x: 700, y: 420 }, hold.top());
          s.wire(hold.bottom(), s.rail('ground', { x: 700, y: 640 }).top());

          const motor = s.place('MOTOR_DC', { x: 1150, y: 400 });
          s.wire(bridge.pin('OUT1'), motor.pin('+'));
          s.wire(bridge.pin('OUT2'), motor.pin('-'));

          const reservoir = s.place('C_POL', { x: 1350, y: 400, rot: 90, value: formatValue(bulk, 'F') });
          s.wire(reservoir.top(), { x: 900, y: 250 });
          s.wire(reservoir.bottom(), { x: 900, y: 560 });
          const local = s.place('C', { x: 1500, y: 400, rot: 90, value: '100n' });
          s.wire(local.top(), { x: 900, y: 220 });
          s.wire(local.bottom(), { x: 900, y: 600 });

          return s.done();
        },
        requirements: {
          ercOptions: { allowUnconnected: ['ATTINY85:PB3', 'ATTINY85:PB4'] },
          requiredComponents: [
            { type: 'HBRIDGE', min: 1, max: 1, label: 'H-bridge placed' },
            { type: 'MOTOR_DC', min: 1, max: 1, label: 'Motor placed' },
            { type: 'ATTINY85', min: 1, max: 1, label: 'MCU placed' },
            { type: 'capacitor', min: 3, label: 'Bulk and decoupling capacitors placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'HBRIDGE', pin: 'VM' },
              b: { rail: '+12V' },
              label: 'Bridge on the motor supply',
              fail: 'The H-bridge power stage runs from the motor rail, not the logic rail.',
            },
            {
              kind: 'connected',
              a: { type: 'HBRIDGE', pin: 'GND' },
              b: { rail: 'ground' },
              label: 'Bridge grounded',
              fail: 'The driver shares the system ground: that is the reference its logic inputs are measured against.',
            },
            { kind: 'ic_powered', type: 'ATTINY85', label: 'MCU powered', fail: 'MCU VCC to +5V, GND to ground.' },
            {
              kind: 'decoupling',
              ic: 'ATTINY85',
              min: 47e-9,
              max: 1e-6,
              label: 'MCU decoupled',
              fail: '100nF across the MCU supply pins: especially important with a motor on the same board.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'HBRIDGE', pin: 'VM' }, { rail: 'ground' }],
              min: 47e-6,
              max: 2200e-6,
              unit: 'F',
              label: 'Bulk capacitance at the bridge',
              fail: `Motor current steps are large and fast. Put ${formatValue(bulk, 'F')} directly across the bridge's own supply pins.`,
            },
            {
              kind: 'connected',
              a: { type: 'ATTINY85', pin: 'PB0/SDA' },
              b: { type: 'HBRIDGE', pin: 'IN1' },
              label: 'PB0 drives IN1',
              fail: 'The firmware contract assigns PB0 to IN1.',
            },
            {
              kind: 'connected',
              a: { type: 'ATTINY85', pin: 'PB1' },
              b: { type: 'HBRIDGE', pin: 'IN2' },
              label: 'PB1 drives IN2',
              fail: 'The firmware contract assigns PB1 to IN2.',
            },
            {
              kind: 'connected',
              a: { type: 'ATTINY85', pin: 'PB2/SCL' },
              b: { type: 'HBRIDGE', pin: 'nSLEEP' },
              label: 'PB2 drives nSLEEP',
              fail: 'The firmware enables the bridge through nSLEEP on PB2.',
            },
            {
              kind: 'pull_resistor',
              rail: 'ground',
              node: { type: 'HBRIDGE', pin: 'nSLEEP' },
              min: 4700,
              max: 470000,
              label: 'nSLEEP pulled down',
              fail: 'Every MCU pin is high-impedance until firmware runs. Without a pull-down, nSLEEP floats during that window and the bridge may drive the motor before the software is ready.',
            },
            {
              kind: 'connected',
              a: { type: 'MOTOR_DC', pin: '+' },
              b: { type: 'HBRIDGE', pin: 'OUT1' },
              label: 'Motor on OUT1',
              fail: 'The motor connects across the two bridge outputs.',
            },
            {
              kind: 'connected',
              a: { type: 'MOTOR_DC', pin: '-' },
              b: { type: 'HBRIDGE', pin: 'OUT2' },
              label: 'Motor on OUT2',
              fail: 'The second motor terminal goes to OUT2: that is what lets the bridge reverse it.',
            },
            {
              kind: 'pull_resistor',
              rail: '+5V',
              node: { type: 'ATTINY85', pin: '/RST' },
              min: 4000,
              max: 100000,
              label: 'MCU /RESET pulled up',
              fail: 'Pull /RESET to +5V through 10k; motor noise is exactly what resets an unprotected part.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'buck_feedback_divider',
    tier: 7,
    level: 7,
    concepts: ['switching_supplies', 'voltage_divider', 'decoupling', 'emc_practice'],
    topic: 'power_supply',
    title: 'Buck converter feedback network',
    concept: 'In a switching supply the feedback divider sets the output voltage, and the layout sets whether it works.',
    params(rng) {
      const vout = rng.pick([3.3, 5, 1.8]);
      return { vout, vfb: 0.8, rbot: rng.pick([10000, 20000]), l: rng.pick([10e-6, 22e-6]) };
    },
    build({ vout, vfb, rbot, l }) {
      const rtop = rbot * (vout / vfb - 1);
      const ratio = band(vout / vfb - 1, 0.06);
      return {
        brief: {
          goal: `Complete a buck converter that produces ${vout} V from +12V.`,
          spec: [
            'Input: +12V with a 10µF input capacitor placed directly at the IC.',
            `Inductor of ${formatValue(l, 'H')} from the SW pin to the output node: label that node VOUT.`,
            'Output capacitor of 22µF from VOUT to ground.',
            `Feedback divider from VOUT to FB to GND, with ${formatValue(rbot, 'Ω')} as the bottom resistor. The IC regulates FB to ${vfb} V.`,
            'Tie EN to the input rail so the converter is enabled.',
            'Set every value.',
          ],
          notes:
            'V_out = V_FB · (1 + R_top/R_bottom). The feedback divider is the only thing that tells the converter what voltage to make.',
        },
        solutionNote: `R_top = R_bot · (V_out/V_FB − 1) = ${formatValue(rbot, 'Ω')} · (${vout}/${vfb} − 1) ≈ ${formatValue(rtop, 'Ω')}. The input capacitor carries the highest di/dt on the board: in a real layout it goes right against the IC.`,
        /**
         * The power path runs straight across the top and the feedback divider
         * hangs off the output, returning to FB underneath. Reading it, the
         * loop is obvious: the converter makes a voltage, the divider measures
         * it, and the answer comes back to the pin that decides what to do next.
         */
        solution() {
          const s = sheet();
          const buck = s.place('BUCK_IC', { x: 500, y: 400 });

          s.wire(s.rail('+12V', { x: 300, y: 200 }).top(), buck.pin('VIN'));
          s.wire(buck.pin('GND'), s.rail('ground', { x: 500, y: 620 }).top());

          // EN is tee'd onto the input rather than given its own rail symbol,
          // so the sheet says "enabled whenever there is input" in one wire.
          s.wire(buck.pin('EN'), { x: 360, y: 420 });
          s.wire({ x: 360, y: 420 }, { x: 360, y: 380 });

          const inputCap = s.place('C', { x: 200, y: 400, rot: 90, value: '10u' });
          s.wire(inputCap.top(), { x: 300, y: 340 });
          s.wire(inputCap.bottom(), s.rail('ground', { x: 200, y: 560 }).top());

          const coil = s.place('L', { x: 700, y: 380, value: formatValue(l, 'H') });
          s.wire(buck.pin('SW'), coil.left());
          s.wire(coil.right(), { x: 950, y: 380 });
          s.label(coil.right(), 'VOUT');

          const outputCap = s.place('C', { x: 950, y: 460, rot: 90, value: '22u' });
          s.wire(outputCap.top(), { x: 950, y: 380 });
          s.wire(outputCap.bottom(), s.rail('ground', { x: 950, y: 620 }).top());

          const upper = s.place('R', { x: 780, y: 460, rot: 90, value: formatValue(rtop, 'Ω') });
          const lower = s.place('R', { x: 780, y: 600, rot: 90, value: formatValue(rbot, 'Ω') });
          s.wire(upper.top(), { x: 780, y: 380 });
          s.wire(upper.bottom(), lower.top());
          s.wire(lower.bottom(), s.rail('ground', { x: 780, y: 740 }).top());

          s.wire(buck.pin('FB'), { x: 560, y: 530 });
          s.wire({ x: 560, y: 530 }, { x: 780, y: 530 });

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'BUCK_IC', min: 1, max: 1, label: 'Buck IC placed' },
            { type: 'L', min: 1, max: 1, label: 'Inductor placed' },
            { type: 'resistor', min: 2, max: 2, label: 'Feedback resistors placed' },
            { type: 'capacitor', min: 2, label: 'Input and output capacitors placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'BUCK_IC', pin: 'VIN' },
              b: { rail: '+12V' },
              label: 'Converter input on +12V',
              fail: 'VIN takes the unregulated input rail.',
            },
            {
              kind: 'connected',
              a: { type: 'BUCK_IC', pin: 'GND' },
              b: { rail: 'ground' },
              label: 'Converter grounded',
              fail: 'The IC ground is the return for both the power stage and the feedback divider.',
            },
            {
              kind: 'connected',
              a: { type: 'BUCK_IC', pin: 'EN' },
              b: { rail: '+12V' },
              label: 'EN tied high',
              fail: 'EN must be pulled up to enable the converter; floating, the part may never start.',
            },
            {
              kind: 'connected',
              a: { type: 'L' },
              b: { type: 'BUCK_IC', pin: 'SW' },
              label: 'Inductor on the switch node',
              fail: 'The inductor connects the switching node to the output: it is what converts the chopped waveform into a DC current.',
            },
            {
              kind: 'connected',
              a: { net: 'VOUT' },
              b: { type: 'L' },
              label: 'VOUT labels the far side of the inductor',
              fail: 'The output node is the far end of the inductor, not the SW pin itself.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ net: 'VOUT' }, { rail: 'ground' }],
              min: 4.7e-6,
              max: 470e-6,
              unit: 'F',
              label: 'Output capacitor fitted',
              fail: 'The output capacitor smooths the inductor ripple into a usable DC rail: 22µF here.',
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'BUCK_IC', pin: 'VIN' }, { rail: 'ground' }],
              min: 4.7e-6,
              max: 100e-6,
              unit: 'F',
              label: 'Input capacitor fitted',
              fail: 'The input capacitor supplies the switching current pulses. Without it, the input rail rings and the converter radiates.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ net: 'VOUT' }, { type: 'BUCK_IC', pin: 'FB' }],
              min: 1,
              label: 'Upper feedback resistor from VOUT to FB',
              fail: 'The top of the feedback divider samples the output voltage.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ type: 'BUCK_IC', pin: 'FB' }, { rail: 'ground' }],
              min: 1,
              label: 'Lower feedback resistor from FB to GND',
              fail: 'Without the bottom resistor there is no divider, and the converter drives its output to the maximum.',
            },
            {
              kind: 'value_ratio',
              a: { type: 'resistor', between: [{ net: 'VOUT' }, { type: 'BUCK_IC', pin: 'FB' }] },
              b: { type: 'resistor', between: [{ type: 'BUCK_IC', pin: 'FB' }, { rail: 'ground' }] },
              min: ratio.min,
              max: ratio.max,
              label: `Divider ratio sets ${vout} V`,
              fail: `V_out = V_FB(1 + R_top/R_bot), so R_top/R_bot must be ${(vout / vfb - 1).toFixed(2)}: with ${formatValue(rbot, 'Ω')} at the bottom that is ${formatValue(rtop, 'Ω')} on top.`,
            },
          ],
        },
      };
    },
  },
];
