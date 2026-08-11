/**
 * Tier 6, communication-bus circuit considerations,
 * Tier 7, timing circuits,
 * Tier 8, multi-stage mixed-signal systems.
 *
 * These combine everything below them: a bus challenge still fails if you
 * forget the decoupling capacitor, and a 555 still fails if the LED has no
 * series resistor.
 */

import { band } from '../rng.js';
import { formatValue } from '../../schematic/units.js';
import { sheet, powerAndDecouple } from '../solution.js';

/**
 * A chip's supply stubs and the capacitor across them.
 *
 * The same arrangement as the 74xx helper, for parts whose supply pins are on
 * the symbol itself rather than on a separate power unit. `tees` are the two
 * points on the supply stubs the capacitor is wired back to.
 */
function supplyAndCap(s, part, { rail, top, bottom, capX, tees }) {
  s.wire(s.rail(rail, { x: part.pin('VCC').x, y: top }).top(), part.pin('VCC'));
  s.wire(part.pin('GND'), s.rail('ground', { x: part.pin('GND').x, y: bottom }).top());

  const cap = s.place('C', { x: capX, y: 400, rot: 90, value: '100n' });
  s.wire(cap.top(), { x: part.pin('VCC').x, y: tees[0] });
  s.wire(cap.bottom(), { x: part.pin('GND').x, y: tees[1] });
  return cap;
}

export const tier6 = [
  {
    id: 'i2c_pullups',
    tier: 6,
    level: 6,
    concepts: ['i2c_bus', 'pull_resistors', 'logic_levels', 'mcu_hardware_contract', 'decoupling'],
    topic: 'comms',
    title: 'I²C bus with pull-ups',
    concept: 'I²C is open-drain: devices can only pull the bus low, so external resistors provide the high.',
    params(rng) {
      const speed = rng.pick([
        { khz: 100, r: 4700 },
        { khz: 400, r: 2200 },
      ]);
      return { speed };
    },
    build({ speed }) {
      return {
        brief: {
          goal: `Wire an ATtiny85 to an I²C peripheral on a +3V3 bus running at ${speed.khz} kHz.`,
          spec: [
            'Both devices run from +3V3 and GND, each decoupled with 100nF.',
            'Connect SDA to SDA and SCL to SCL. On the ATtiny85 those are PB0 and PB2.',
            `Fit bus pull-up resistors of about ${formatValue(speed.r, 'Ω')} on each line, up to +3V3.`,
            'Label the two bus nets SDA and SCL.',
            'Pull /RESET up with 10k. Other I/O pins may be left open.',
          ],
          notes:
            'An I²C output transistor can only pull the line down. Without pull-ups the bus never returns high and every transfer fails: the single most common I²C bring-up mistake.',
        },
        solutionNote: `Two shared nets, each with one ${formatValue(speed.r, 'Ω')} resistor to +3V3. Smaller resistors charge the bus capacitance faster, which is why ${speed.khz} kHz wants ${formatValue(speed.r, 'Ω')}.`,
        /**
         * The bus is joined by net labels rather than by wires drawn across the
         * page, which is how a real I2C sheet does it. Three things have to
         * reach SDA and three have to reach SCL, and any wired version of that
         * puts one line across the other: on paper the crossing means nothing,
         * but a learner reading it cannot tell that from a connection.
         */
        solution() {
          const s = sheet();
          const mcu = s.place('ATTINY85', { x: 400, y: 400 });
          const dev = s.place('I2C_DEV', { x: 1000, y: 400 });

          supplyAndCap(s, mcu, { rail: '+3V3', top: 200, bottom: 600, capX: 100, tees: [220, 540] });
          supplyAndCap(s, dev, { rail: '+3V3', top: 200, bottom: 600, capX: 1180, tees: [260, 540] });

          // Each device brings its bus pins out to a short stub and names it.
          s.wire(mcu.pin('PB0/SDA'), { x: 580, y: 360 });
          s.label({ x: 580, y: 360 }, 'SDA');
          s.wire(mcu.pin('PB2/SCL'), { x: 580, y: 400 });
          s.label({ x: 580, y: 400 }, 'SCL');
          s.wire(dev.pin('SDA'), { x: 820, y: 380 });
          s.label({ x: 820, y: 380 }, 'SDA');
          s.wire(dev.pin('SCL'), { x: 820, y: 420 });
          s.label({ x: 820, y: 420 }, 'SCL');

          for (const [x, net] of [[660, 'SDA'], [760, 'SCL']]) {
            const pull = s.place('R', { x, y: 220, rot: 90, value: formatValue(speed.r, 'Ω') });
            s.wire(s.rail('+3V3', { x, y: 120 }).top(), pull.top());
            s.wire(pull.bottom(), { x, y: 320 });
            s.label({ x, y: 320 }, net);
          }

          const reset = s.place('R', { x: 220, y: 360, value: '10k' });
          s.wire(s.rail('+3V3', { x: 190, y: 280 }).top(), reset.left());
          s.wire(reset.right(), mcu.pin('/RST'));

          return s.done();
        },
        requirements: {
          ercOptions: { allowUnconnected: ['ATTINY85:PB1', 'ATTINY85:PB3', 'ATTINY85:PB4'] },
          requiredComponents: [
            { type: 'ATTINY85', min: 1, max: 1, label: 'ATtiny85 placed' },
            { type: 'I2C_DEV', min: 1, max: 1, label: 'I²C peripheral placed' },
            { type: 'capacitor', min: 2, label: 'Two decoupling capacitors placed' },
            { type: 'resistor', min: 3, max: 3, label: 'Three resistors placed (two pull-ups, one reset pull-up)' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: 'ATTINY85',
              label: 'MCU powered',
              fail: 'MCU pin 8 to +3V3, pin 4 to GND.',
            },
            {
              kind: 'ic_powered',
              type: 'I2C_DEV',
              label: 'Peripheral powered',
              fail: 'The peripheral needs +3V3 and GND too: it cannot hold the bus low without its own supply.',
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
              ic: 'I2C_DEV',
              min: 47e-9,
              max: 1e-6,
              label: 'Peripheral decoupled',
              fail: '100nF directly across the peripheral supply pins.',
            },
            {
              kind: 'common_node',
              members: [{ net: 'SDA' }, { type: 'ATTINY85', pin: 'PB0/SDA' }, { type: 'I2C_DEV', pin: 'SDA' }],
              label: 'SDA joins both devices',
              fail: 'Both SDA pins and the SDA label belong on one net: I²C is a shared bus, not point-to-point wiring.',
            },
            {
              kind: 'common_node',
              members: [{ net: 'SCL' }, { type: 'ATTINY85', pin: 'PB2/SCL' }, { type: 'I2C_DEV', pin: 'SCL' }],
              label: 'SCL joins both devices',
              fail: 'Both SCL pins and the SCL label belong on one net.',
            },
            {
              kind: 'not_connected',
              a: { net: 'SDA' },
              b: { net: 'SCL' },
              label: 'The two bus lines are separate',
              fail: 'SDA and SCL have ended up on the same net. Data and clock shorted together makes the bus permanently unusable.',
            },
            {
              kind: 'pull_resistor',
              rail: '+3V3',
              node: { net: 'SDA' },
              min: speed.r * 0.5,
              max: speed.r * 2.5,
              label: 'SDA pulled up to +3V3',
              fail: `SDA needs a resistor to +3V3 (about ${formatValue(speed.r, 'Ω')}). Open-drain outputs only sink; the pull-up is what actually produces a logic high.`,
            },
            {
              kind: 'pull_resistor',
              rail: '+3V3',
              node: { net: 'SCL' },
              min: speed.r * 0.5,
              max: speed.r * 2.5,
              label: 'SCL pulled up to +3V3',
              fail: `SCL needs its own pull-up to +3V3 (about ${formatValue(speed.r, 'Ω')}). One resistor cannot serve both lines.`,
            },
            {
              kind: 'pull_resistor',
              rail: '+3V3',
              node: { type: 'ATTINY85', pin: '/RST' },
              min: 4000,
              max: 100000,
              label: '/RESET pulled up',
              fail: 'Pull /RESET to +3V3 through 10k.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'shift_register_outputs',
    tier: 6,
    level: 6,
    concepts: ['spi_bus', 'logic_levels', 'mcu_hardware_contract', 'decoupling', 'led_drive'],
    topic: 'comms',
    title: 'SPI shift register expansion',
    concept: 'Control pins that "do nothing" still have to be tied to a level: floating is not a choice.',
    params(rng) {
      return { led: rng.pick([{ color: 'red', vf: 1.8 }, { color: 'green', vf: 2.1 }]), current: 5 / 1000 };
    },
    build({ led, current }) {
      const ideal = (5 - led.vf) / current;
      const { min, max } = band(ideal, 0.25);
      return {
        brief: {
          goal: 'Drive a 74HC595 shift register from an ATtiny85 and light one LED from output QA.',
          spec: [
            'Both chips run from +5V and GND, each decoupled with 100nF.',
            'MCU PB0 → SER, PB1 → SRCLK, PB2 → RCLK.',
            'Tie /OE low so the outputs are enabled, and /SRCLR high so the register is not held in reset.',
            `QA drives a ${led.color} LED (Vf = ${led.vf} V) at about ${Math.round(current * 1000)} mA through a series resistor.`,
            'Pull the MCU /RESET up with 10k. Unused QB-QH outputs may be left open.',
          ],
          notes:
            'Both /OE and /SRCLR are active-low control inputs. Leaving either floating gives you a register that sometimes works and sometimes does not: the worst possible failure mode.',
        },
        solutionNote: '/OE (pin 13) → GND, /SRCLR (pin 10) → +5V, QA → R → LED → GND, plus supplies and decoupling on both chips.',
        /**
         * The three control signals run straight across at their own heights,
         * in the order the pins are already in, so nothing has to cross
         * anything. /OE and /SRCLR are tied off below them, where the corridor
         * is empty: a control pin at a fixed level gets the shortest wire on
         * the sheet, because there is nothing to follow.
         */
        solution() {
          const s = sheet();
          const mcu = s.place('ATTINY85', { x: 400, y: 400 });
          const sr = s.place('74HC595', { x: 900, y: 400 });

          supplyAndCap(s, mcu, { rail: '+5V', top: 200, bottom: 600, capX: 100, tees: [220, 540] });
          supplyAndCap(s, sr, { rail: '+5V', top: 180, bottom: 640, capX: 1400, tees: [250, 560] });

          s.wire(mcu.pin('PB0/SDA'), { x: 560, y: 360 });
          s.wire({ x: 560, y: 360 }, sr.pin('SER'));
          s.wire(mcu.pin('PB1'), { x: 600, y: 380 });
          s.wire({ x: 600, y: 380 }, sr.pin('SRCLK'));
          s.wire(mcu.pin('PB2/SCL'), sr.pin('RCLK'));

          s.wire(sr.pin('/OE'), { x: 760, y: 430 });
          s.wire({ x: 760, y: 430 }, s.rail('ground', { x: 760, y: 620 }).top());
          s.wire(sr.pin('/SRCLR'), s.rail('+5V', { x: 770, y: 460 }).top());

          const limit = s.place('R', { x: 1100, y: 330, value: formatValue(ideal, 'Ω') });
          const lamp = s.place('D_LED', { x: 1280, y: 330 });
          s.wire(sr.pin('QA'), limit.left());
          s.chainX(limit, lamp);
          s.wire(lamp.right(), s.rail('ground', { x: lamp.right().x, y: 470 }).top());

          const reset = s.place('R', { x: 220, y: 360, value: '10k' });
          s.wire(s.rail('+5V', { x: 190, y: 280 }).top(), reset.left());
          s.wire(reset.right(), mcu.pin('/RST'));

          return s.done();
        },
        requirements: {
          ercOptions: { allowUnconnected: ['74HC595:Q*', 'ATTINY85:PB3', 'ATTINY85:PB4'] },
          requiredComponents: [
            { type: '74HC595', min: 1, max: 1, label: '74HC595 placed' },
            { type: 'ATTINY85', min: 1, max: 1, label: 'ATtiny85 placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'capacitor', min: 2, label: 'Two decoupling capacitors placed' },
          ],
          checks: [
            { kind: 'ic_powered', type: '74HC595', label: 'Shift register powered', fail: 'Pin 16 to +5V, pin 8 to GND.' },
            { kind: 'ic_powered', type: 'ATTINY85', label: 'MCU powered', fail: 'Pin 8 to +5V, pin 4 to GND.' },
            {
              kind: 'decoupling',
              ic: '74HC595',
              min: 47e-9,
              max: 1e-6,
              label: 'Shift register decoupled',
              fail: '100nF across pins 16 and 8. Eight outputs switching at once is exactly the load that needs local decoupling.',
            },
            { kind: 'decoupling', ic: 'ATTINY85', min: 47e-9, max: 1e-6, label: 'MCU decoupled', fail: '100nF across the MCU supply pins.' },
            {
              kind: 'connected',
              a: { type: 'ATTINY85', pin: 'PB0/SDA' },
              b: { type: '74HC595', pin: 'SER' },
              label: 'Serial data connected',
              fail: 'PB0 carries the data into the register\'s SER pin.',
            },
            {
              kind: 'connected',
              a: { type: 'ATTINY85', pin: 'PB1' },
              b: { type: '74HC595', pin: 'SRCLK' },
              label: 'Shift clock connected',
              fail: 'PB1 drives SRCLK, which clocks each bit into the shift register.',
            },
            {
              kind: 'connected',
              a: { type: 'ATTINY85', pin: 'PB2/SCL' },
              b: { type: '74HC595', pin: 'RCLK' },
              label: 'Latch clock connected',
              fail: 'PB2 drives RCLK, the latch clock that transfers the shifted byte to the outputs.',
            },
            {
              kind: 'connected',
              a: { type: '74HC595', pin: '/OE' },
              b: { rail: 'ground' },
              label: '/OE tied low',
              fail: '/OE is active-low output enable. Left floating or tied high, all eight outputs stay in high-impedance and nothing lights.',
            },
            {
              kind: 'connected',
              a: { type: '74HC595', pin: '/SRCLR' },
              b: { rail: '+5V' },
              label: '/SRCLR tied high',
              fail: '/SRCLR is active-low clear. It must sit at +5V during normal operation, otherwise the register is continuously wiped.',
            },
            {
              kind: 'path',
              from: { type: '74HC595', pin: 'QA' },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive'],
              label: 'QA drives the LED through a resistor',
              fail: 'QA must reach the LED anode through a series resistor.',
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'LED cathode returns to GND',
              fail: 'The cathode needs a route to ground.',
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
            {
              kind: 'pull_resistor',
              rail: '+5V',
              node: { type: 'ATTINY85', pin: '/RST' },
              min: 4000,
              max: 100000,
              label: 'MCU /RESET pulled up',
              fail: 'Pull /RESET to +5V through 10k.',
            },
          ],
        },
      };
    },
  },
];

export const tier7 = [
  {
    id: 'astable_555',
    tier: 7,
    level: 6,
    concepts: ['oscillators', 'rc_time_constant', 'capacitor_basics', 'led_drive'],
    topic: 'timing',
    title: '555 astable blinker',
    concept: 'f = 1.44 / ((R1 + 2·R2)·C): the capacitor charges through R1+R2 and discharges through R2.',
    params(rng) {
      const freq = rng.pick([1, 2, 5, 10]);
      const c = rng.pick([10e-6, 4.7e-6]);
      const r1 = 10000;
      return { freq, c, r1 };
    },
    build({ freq, c, r1 }) {
      // f = 1.44 / ((R1 + 2R2)C)  =>  R2 = (1.44/(f·C) − R1) / 2
      const r2 = (1.44 / (freq * c) - r1) / 2;
      const { min, max } = band(r2, 0.2);
      return {
        brief: {
          goal: `Build a 555 astable oscillator running at about ${freq} Hz, blinking an LED.`,
          spec: [
            'Supply: +5V and GND. VCC on pin 8, GND on pin 1.',
            `R1 = ${formatValue(r1, 'Ω')} from +5V to DIS (pin 7).`,
            `R2 from DIS (pin 7) to THR (pin 6): size it for ${freq} Hz.`,
            `The timing capacitor is ${formatValue(c, 'F')}, from THR (pin 6) to GND.`,
            'TRIG (pin 2) must be tied to THR (pin 6).',
            'RESET (pin 4) must be tied to +5V, or the chip stays held in reset.',
            'Fit a 10nF capacitor from CTRL (pin 5) to GND.',
            'OUT (pin 3) drives a red LED (Vf = 1.8V) at about 10mA through a series resistor.',
          ],
          notes:
            'The 555 charges the capacitor through R1+R2 and discharges it through R2 alone, which is why the duty cycle is never below 50% in this configuration.',
        },
        solutionNote: `R2 = (1.44/(f·C) − R1)/2 = (1.44/(${freq}·${formatValue(c, 'F')}) − ${formatValue(r1, 'Ω')})/2 ≈ ${formatValue(r2, 'Ω')}.`,
        /**
         * R1, R2 and the timing capacitor are drawn as one column on the left,
         * which is the arrangement every 555 datasheet uses, because the column
         * is literally the charge path: down through both resistors into the
         * capacitor. The long way round to pin 7 is the price of keeping it,
         * and it is worth paying: the shape is the thing being learned.
         */
        solution() {
          const s = sheet();
          const timer = s.place('NE555', { x: 700, y: 400 });

          s.wire(s.rail('+5V', { x: 700, y: 200 }).top(), timer.pin('VCC'));
          s.wire(timer.pin('GND'), s.rail('ground', { x: 700, y: 600 }).top());

          const x = 250;
          const charge = s.place('R', { x, y: 200, rot: 90, value: formatValue(r1, 'Ω') });
          const discharge = s.place('R', { x, y: 320, rot: 90, value: formatValue(r2, 'Ω') });
          const timing = s.place('C', { x, y: 440, rot: 90, value: formatValue(c, 'F') });
          s.chain(
            s.rail('+5V', { x, y: 120 }),
            charge,
            discharge,
            timing,
            s.rail('ground', { x, y: 540 })
          );

          // THR, and TRIG tee'd onto the same run: joining pins 2 and 6 is what
          // makes this astable rather than a one-shot.
          s.wire({ x, y: 380 }, { x: 600, y: 380 });
          s.wire({ x: 600, y: 380 }, timer.pin('THR'));
          s.wire(timer.pin('TRIG'), { x: 600, y: 390 }, { horizontalFirst: true });

          // DIS takes the long way round the outside rather than cutting across
          // the timing column or the output branch.
          s.wire({ x, y: 260 }, { x: 120, y: 700 }, { horizontalFirst: true });
          s.wire({ x: 120, y: 700 }, { x: 1000, y: 410 }, { horizontalFirst: true });
          s.wire({ x: 1000, y: 410 }, timer.pin('DIS'));

          s.wire(timer.pin('RST'), { x: 480, y: 370 });
          s.wire({ x: 480, y: 370 }, s.rail('+5V', { x: 480, y: 280 }).top());

          const control = s.place('C', { x: 560, y: 500, rot: 90, value: '10n' });
          s.wire(timer.pin('CTRL'), { x: 560, y: 430 });
          s.wire({ x: 560, y: 430 }, control.top());
          s.wire(control.bottom(), s.rail('ground', { x: 560, y: 620 }).top());

          const limit = s.place('R', { x: 880, y: 390, value: '330' });
          const lamp = s.place('D_LED', { x: 1080, y: 390 });
          s.wire(timer.pin('OUT'), limit.left());
          s.chainX(limit, lamp);
          s.wire(lamp.right(), s.rail('ground', { x: lamp.right().x, y: 540 }).top());

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'NE555', min: 1, max: 1, label: 'NE555 placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            { type: 'resistor', min: 3, max: 3, label: 'Three resistors placed (R1, R2, LED limiter)' },
            { type: 'capacitor', min: 2, label: 'Timing and control capacitors placed' },
          ],
          checks: [
            {
              kind: 'connected',
              a: { type: 'NE555', pin: 'VCC' },
              b: { rail: '+5V' },
              label: 'VCC on +5V',
              fail: 'Pin 8 to +5V.',
            },
            {
              kind: 'connected',
              a: { type: 'NE555', pin: 'GND' },
              b: { rail: 'ground' },
              label: 'GND on ground',
              fail: 'Pin 1 to GND.',
            },
            {
              kind: 'connected',
              a: { type: 'NE555', pin: 'RST' },
              b: { rail: '+5V' },
              label: 'RESET tied high',
              fail: 'RESET (pin 4) is active-low. Tie it to +5V: floating, the chip resets on noise and the oscillator stalls.',
            },
            {
              kind: 'connected',
              a: { type: 'NE555', pin: 'TRIG' },
              b: { type: 'NE555', pin: 'THR' },
              label: 'TRIG tied to THR',
              fail: 'Astable operation needs pins 2 and 6 joined so the same capacitor voltage both triggers and resets the flip-flop, giving continuous oscillation.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ rail: '+5V' }, { type: 'NE555', pin: 'DIS' }],
              min: 1,
              label: 'R1 from +5V to DIS',
              fail: 'R1 runs from the supply to pin 7. It carries the charging current for the capacitor.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ type: 'NE555', pin: 'DIS' }, { type: 'NE555', pin: 'THR' }],
              min: 1,
              label: 'R2 between DIS and THR',
              fail: 'R2 sits between pin 7 and pin 6. On discharge the internal transistor pulls pin 7 low, and the capacitor drains through R2 only.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              between: [{ type: 'NE555', pin: 'DIS' }, { type: 'NE555', pin: 'THR' }],
              min,
              max,
              unit: 'Ω',
              label: `R2 sized for ${freq} Hz`,
              fail: `Rearrange f = 1.44/((R1+2R2)C): R2 = (1.44/(f·C) − R1)/2 = ${formatValue(r2, 'Ω')}.`,
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'NE555', pin: 'THR' }, { rail: 'ground' }],
              min: c * 0.8,
              max: c * 1.2,
              unit: 'F',
              label: 'Timing capacitor from THR to GND',
              fail: `The ${formatValue(c, 'F')} timing capacitor goes from pin 6 to ground. It is the element that actually sets the period.`,
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ type: 'NE555', pin: 'CTRL' }, { rail: 'ground' }],
              min: 4.7e-9,
              max: 100e-9,
              unit: 'F',
              label: 'CTRL decoupled with 10nF',
              fail: 'Pin 5 exposes the internal 2/3·VCC reference. A 10nF capacitor to ground keeps supply noise from modulating your timing.',
            },
            {
              kind: 'path',
              from: { type: 'NE555', pin: 'OUT' },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive'],
              label: 'Output drives the LED through a resistor',
              fail: 'Pin 3 must reach the LED anode through a series resistor.',
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'LED cathode returns to GND',
              fail: 'Close the LED loop to ground.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              inSeriesWith: { type: 'D_LED' },
              min: 220,
              max: 470,
              unit: 'Ω',
              label: 'LED resistor around 330Ω',
              fail: 'R = (5 − 1.8) / 0.01 = 320Ω, so 330Ω is the standard choice.',
            },
          ],
        },
      };
    },
  },

  {
    id: 'rc_debounce',
    tier: 7,
    level: 6,
    concepts: ['switch_debounce', 'rc_time_constant', 'pull_resistors', 'logic_levels'],
    topic: 'timing',
    title: 'RC-debounced button input',
    concept: 'A mechanical contact bounces for milliseconds; an RC filter plus a logic buffer hides it.',
    params(rng) {
      const tau = rng.pick([0.005, 0.01, 0.02]);
      const c = rng.pick([100e-9, 1e-6]);
      return { tau, c, pull: 10000 };
    },
    build({ tau, c, pull }) {
      const r = tau / c;
      const { min, max } = band(r, 0.25);
      return {
        brief: {
          goal: `Debounce a pushbutton with an RC filter of about ${Math.round(tau * 1000)} ms, then square it up with a 74HC04 inverter.`,
          spec: [
            'Supply: +5V and GND. Place and wire the 74HC04 power unit, decoupled with 100nF.',
            `A ${formatValue(pull, 'Ω')} pull-up holds the button node HIGH; the button pulls it to GND. Label that node BTN_RAW.`,
            `From BTN_RAW, a series resistor feeds the filter node; a ${formatValue(c, 'F')} capacitor runs from that node to GND. Label it BTN_F.`,
            `Size the series resistor for an RC time constant near ${Math.round(tau * 1000)} ms (±25%).`,
            'BTN_F drives the inverter input; the inverter output is the debounced signal, label it BTN_CLEAN.',
          ],
          notes:
            'Contact bounce lasts roughly 1-10ms. The filter smears the bouncing edges into one slow ramp, and the gate turns that ramp back into a single clean transition.',
        },
        solutionNote: `R = τ/C = ${tau}/${formatValue(c, 'F')} ≈ ${formatValue(r, 'Ω')}. +5V → pull-up → BTN_RAW → button → GND; BTN_RAW → R → BTN_F; C from BTN_F to GND; BTN_F → inverter input.`,
        /**
         * Signal left to right through three named nodes: raw, filtered,
         * clean. Naming all three is the point of the exercise, because the
         * whole circuit is one signal being improved twice, and the sheet
         * should let you point at where each improvement happened.
         */
        solution() {
          const s = sheet();
          const x = 200;
          const pullUp = s.place('R', { x, y: 140, rot: 90, value: formatValue(pull, 'Ω') });
          const button = s.place('SW_PUSH', { x, y: 250, rot: 90 });
          s.chain(s.rail('+5V', { x, y: 60 }), pullUp, button, s.rail('ground', { x, y: 360 }));
          s.label({ x, y: 195 }, 'BTN_RAW');

          const series = s.place('R', { x: 340, y: 195, value: formatValue(r, 'Ω') });
          s.wire({ x, y: 195 }, series.left());

          const filter = s.place('C', { x: 450, y: 275, rot: 90, value: formatValue(c, 'F') });
          s.wire(series.right(), filter.top(), { horizontalFirst: true });
          s.wire(filter.bottom(), s.rail('ground', { x: 450, y: 420 }).top());
          s.label({ x: 450, y: 195 }, 'BTN_F');

          const inverter = s.place('74HC04', { x: 700, y: 195, unitId: 'A' });
          s.wire({ x: 450, y: 195 }, inverter.pin('1'));
          s.wire(inverter.pin('2'), { x: 850, y: 195 });
          s.label({ x: 850, y: 195 }, 'BTN_CLEAN');

          powerAndDecouple(s, '74HC04', 1000);

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: '74HC04', min: 1, max: 1, label: '74HC04 placed' },
            { type: 'switch', min: 1, max: 1, label: 'One button placed' },
            { type: 'resistor', min: 2, max: 2, label: 'Two resistors placed' },
            { type: 'capacitor', min: 2, label: 'Filter and decoupling capacitors placed' },
          ],
          checks: [
            {
              kind: 'ic_powered',
              type: '74HC04',
              label: 'The 74HC04 is powered',
              fail: 'Place the power unit and wire pin 14 to +5V, pin 7 to GND.',
            },
            {
              kind: 'decoupling',
              ic: '74HC04',
              min: 47e-9,
              max: 1e-6,
              label: '74HC04 decoupled',
              fail: '100nF across the chip supply pins.',
            },
            {
              kind: 'pull_resistor',
              rail: '+5V',
              node: { net: 'BTN_RAW' },
              min: pull * 0.2,
              max: pull * 10,
              label: 'BTN_RAW pulled up',
              fail: `A ${formatValue(pull, 'Ω')} resistor from +5V to BTN_RAW gives the node its idle level.`,
            },
            {
              kind: 'common_node',
              members: [{ net: 'BTN_RAW' }, { type: 'switch' }],
              label: 'Button sits on BTN_RAW',
              fail: 'One button terminal belongs on BTN_RAW; the other goes to ground.',
            },
            {
              kind: 'connected',
              a: { type: 'switch' },
              b: { rail: 'ground' },
              label: 'Button pulls to GND',
              fail: 'The other side of the button must reach ground.',
            },
            {
              kind: 'component_count',
              type: 'resistor',
              between: [{ net: 'BTN_RAW' }, { net: 'BTN_F' }],
              min: 1,
              label: 'Series resistor between BTN_RAW and BTN_F',
              fail: 'The filter resistor sits between the raw button node and the filtered node. Without it the capacitor is directly across the switch and simply gets short-circuited on every press.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              between: [{ net: 'BTN_RAW' }, { net: 'BTN_F' }],
              min,
              max,
              unit: 'Ω',
              label: `Series resistor gives a ${Math.round(tau * 1000)} ms time constant`,
              fail: `τ = R·C, so R = τ/C = ${tau}/${formatValue(c, 'F')} ≈ ${formatValue(r, 'Ω')}.`,
            },
            {
              kind: 'value_range',
              type: 'capacitor',
              between: [{ net: 'BTN_F' }, { rail: 'ground' }],
              min: c * 0.8,
              max: c * 1.2,
              unit: 'F',
              label: 'Filter capacitor from BTN_F to GND',
              fail: `The ${formatValue(c, 'F')} capacitor runs from the filtered node to ground.`,
            },
            {
              kind: 'connected',
              a: { net: 'BTN_F' },
              b: { type: '74HC04', pin: '1' },
              label: 'Filtered node drives the inverter',
              fail: 'BTN_F feeds the inverter input on pin 1.',
            },
            {
              kind: 'connected',
              a: { net: 'BTN_CLEAN' },
              b: { type: '74HC04', pin: '2' },
              label: 'BTN_CLEAN labels the inverter output',
              fail: 'Label the inverter output pin 2 as BTN_CLEAN: that is the debounced signal.',
            },
          ],
        },
      };
    },
  },
];

export const tier8 = [
  {
    id: 'light_threshold_alarm',
    tier: 8,
    level: 8,
    concepts: ['mixed_signal_partitioning', 'sensor_interface', 'opamp_feedback', 'voltage_divider', 'led_drive'],
    topic: 'mixed_signal',
    title: 'Light-threshold comparator',
    concept: 'Sensor divider, reference divider, comparator, driver: four stages that each fail on their own terms.',
    params(rng) {
      return { fixed: rng.pick([10000, 22000]), refTop: 10000, refBottom: 10000, led: { color: 'red', vf: 1.8 } };
    },
    build({ fixed, refTop, refBottom, led }) {
      const ledR = (5 - led.vf) / 0.01;
      const { min, max } = band(ledR, 0.3);
      return {
        brief: {
          goal: 'Light an LED when a photoresistor sees less light than a fixed threshold, using an op-amp as a comparator.',
          spec: [
            'Supply: +5V and GND. The op-amp runs single-supply: V+ on +5V, V− on GND.',
            `Sensor stage: the LDR and a fixed ${formatValue(fixed, 'Ω')} resistor form a divider across the rail. Label its midpoint LIGHT.`,
            `Reference stage: two ${formatValue(refTop, 'Ω')} resistors form a second divider across the rail, giving the 2.5V threshold. Label its midpoint VREF.`,
            'LIGHT drives the non-inverting input; VREF drives the inverting input. No feedback resistor: this stage is deliberately open-loop.',
            `Output drives a ${led.color} LED (Vf = ${led.vf} V) at about 10mA through a series resistor.`,
            'The two divider midpoints must stay separate nodes.',
          ],
          notes:
            'Open-loop, the op-amp output slams to whichever rail the input comparison calls for: that is exactly what a comparator does. A real design would add hysteresis; here, get the four stages right first.',
        },
        solutionNote:
          'LDR divider → IN+, reference divider → IN−, output → R → LED → GND. With no feedback path the gain is enormous, so the output is fully high or fully low.',
        /**
         * The two dividers are stacked rather than placed side by side: the
         * reference above, the sensor below, each with a clear run to its own
         * input. Drawn side by side, one divider's output has to cross the
         * other's body to reach the op-amp, and a sheet where LIGHT appears to
         * touch VREF is the one mistake this circuit cannot survive.
         */
        solution() {
          const s = sheet();
          const opamp = s.place('OPAMP', { x: 700, y: 400 });
          s.wire(s.rail('+5V', { x: 700, y: 280 }).top(), opamp.pin('V+'));
          s.wire(opamp.pin('V-'), s.rail('ground', { x: 700, y: 540 }).top());

          const refTopR = s.place('R', { x: 340, y: 140, rot: 90, value: formatValue(refTop, 'Ω') });
          const refBottomR = s.place('R', { x: 340, y: 250, rot: 90, value: formatValue(refBottom, 'Ω') });
          s.chain(
            s.rail('+5V', { x: 340, y: 60 }),
            refTopR,
            refBottomR,
            s.rail('ground', { x: 340, y: 360 })
          );
          s.label({ x: 340, y: 195 }, 'VREF');
          s.wire({ x: 340, y: 195 }, { x: 600, y: 195 });
          s.wire({ x: 600, y: 195 }, opamp.pin('IN-'));

          const sensor = s.place('LDR', { x: 200, y: 540, rot: 90 });
          const fixedR = s.place('R', { x: 200, y: 650, rot: 90, value: formatValue(fixed, 'Ω') });
          s.chain(
            s.rail('+5V', { x: 200, y: 460 }),
            sensor,
            fixedR,
            s.rail('ground', { x: 200, y: 760 })
          );
          s.label({ x: 200, y: 595 }, 'LIGHT');
          s.wire({ x: 200, y: 595 }, { x: 560, y: 595 });
          s.wire({ x: 560, y: 595 }, opamp.pin('IN+'));

          const limit = s.place('R', { x: 860, y: 400, value: formatValue(ledR, 'Ω') });
          const lamp = s.place('D_LED', { x: 1060, y: 400 });
          s.wire(opamp.pin('OUT'), limit.left());
          s.chainX(limit, lamp);
          s.wire(lamp.right(), s.rail('ground', { x: lamp.right().x, y: 540 }).top());

          return s.done();
        },
        requirements: {
          requiredComponents: [
            { type: 'OPAMP', min: 1, max: 1, label: 'Op-amp placed' },
            { type: 'LDR', min: 1, max: 1, label: 'Photoresistor placed' },
            { type: 'D_LED', min: 1, max: 1, label: 'One LED placed' },
            // 'R' rather than the 'resistor' tag on purpose: an LDR carries
            // that tag too, so counting by tag made five parts out of four and
            // the requirement could not be met.
            { type: 'R', min: 4, max: 4, label: 'Four resistors placed (sensor, two reference, LED limiter)' },
          ],
          checks: [
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
              label: 'Op-amp negative supply on GND',
              fail: 'Single-supply operation puts V− on ground.',
            },
            // Stated as two halves, because the midpoint is deliberately tapped
            // by IN+: a strict series pair would be a requirement no correct
            // answer could meet.
            {
              kind: 'path',
              from: { rail: '+5V' },
              to: { net: 'LIGHT' },
              through: ['resistive'],
              label: 'Sensor divider fed from +5V',
              fail: 'LIGHT has to sit below the rail through one of the two parts. Tied straight to +5V it cannot move with the light level at all.',
            },
            {
              kind: 'path',
              from: { net: 'LIGHT' },
              to: { rail: 'ground' },
              through: ['resistive'],
              label: 'Sensor divider returns to GND',
              fail: 'The other half of the sensor divider is missing: LIGHT needs a resistive path to ground, or no current flows through the LDR and its resistance changes nothing.',
            },
            {
              kind: 'common_node',
              members: [{ net: 'LIGHT' }, { type: 'LDR' }, { type: 'OPAMP', pin: 'IN+' }],
              label: 'Sensor midpoint drives IN+',
              fail: 'The LDR divider midpoint, the LIGHT label and the op-amp IN+ pin all belong on one node.',
            },
            {
              kind: 'connected',
              a: { net: 'VREF' },
              b: { type: 'OPAMP', pin: 'IN-' },
              label: 'Reference divider drives IN−',
              fail: 'The reference midpoint (labelled VREF) goes to IN−, giving the comparator something to compare against.',
            },
            {
              kind: 'not_connected',
              a: { net: 'LIGHT' },
              b: { net: 'VREF' },
              label: 'Sensor and reference nodes are separate',
              fail: 'LIGHT and VREF have ended up on the same node. A comparator with both inputs tied together can never change state.',
            },
            {
              kind: 'path',
              from: { rail: '+5V' },
              to: { net: 'VREF' },
              through: ['resistive'],
              label: 'Reference divider fed from +5V',
              fail: 'The reference divider must run from the rail down to ground, with VREF at its midpoint.',
            },
            {
              kind: 'path',
              from: { net: 'VREF' },
              to: { rail: 'ground' },
              through: ['resistive'],
              label: 'Reference divider returns to GND',
              fail: 'Without the lower reference resistor to ground there is no divider: VREF would simply sit at the rail.',
            },
            {
              kind: 'not_connected',
              a: { type: 'OPAMP', pin: 'OUT' },
              b: { type: 'OPAMP', pin: 'IN-' },
              label: 'No feedback path (open-loop comparator)',
              fail: 'A feedback resistor from OUT to IN− turns this into a linear amplifier. For a threshold detector the stage must stay open-loop.',
            },
            {
              kind: 'path',
              from: { type: 'OPAMP', pin: 'OUT' },
              to: { type: 'D_LED', pin: 'A' },
              through: ['resistive'],
              label: 'Output drives the LED through a resistor',
              fail: 'The op-amp output must reach the LED anode through a series resistor.',
            },
            {
              kind: 'path',
              from: { type: 'D_LED', pin: 'K' },
              to: { rail: 'ground' },
              through: ['resistive', 'zero'],
              label: 'LED cathode returns to GND',
              fail: 'The LED cathode needs a route to ground.',
            },
            {
              kind: 'value_range',
              type: 'resistor',
              inSeriesWith: { type: 'D_LED' },
              min,
              max,
              unit: 'Ω',
              label: 'LED resistor sized for about 10mA',
              fail: `R = (5 − ${led.vf}) / 0.01 ≈ ${formatValue(ledR, 'Ω')}.`,
            },
          ],
        },
      };
    },
  },
];
