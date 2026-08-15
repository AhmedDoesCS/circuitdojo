/**
 * The roadmap.
 *
 * An ordered curriculum from a single loop of current to a finished product.
 * Twelve stages, each a handful of blocks, each block a short arc around one
 * idea. Progression is linear in sequence and deliberately not linear in
 * subject: a block moves through analysis, components, recipes and professional
 * practice as that idea is actually learned.
 *
 * This file holds the structure and the ordering. It does not hold the content:
 * a unit points at a challenge template, and everything about what the learner
 * reads and is graded on still lives with that template.
 *
 * Selection used to be a weighted random draw. It is now a cursor into this
 * array, which is both a better curriculum and a faster lookup.
 */

import { getTemplate } from '../challenges/index.js';
import { formatValue, nearestE24 } from '../schematic/units.js';
import { firstStageForBand } from '../lib/level.js';

/**
 * Every block ends in a capstone: the Build unit that demonstrates the block's
 * idea end to end. Passing a capstone cold completes the whole block, which is
 * how a learner skips material they already know. It is an examination rather
 * than a claim, so it cannot leave a silent gap.
 */
export const STAGES = [
  {
    stage: 1,
    name: 'One closed loop',
    blurb: 'Current only flows in a complete circuit, and something has to limit it.',
    blocks: [
      {
        block: 1,
        name: 'Current, voltage and a resistor',
        units: [
          {
            kind: 'analyse',
            slug: 'ohms-law-current',
            title: 'How much current flows',
            prompt:
              'A {r} resistor is connected straight across a {v} V supply. What current flows through it?',
            params: (rng) => ({ v: rng.pick([3.3, 5, 9, 12]), r: rng.pick([220, 470, 1000, 2200]) }),
            answer: (p) => p.v / p.r,
            unit: 'A',
            hint: "Ohm's law, rearranged for current.",
            explain: (p) => `I = V / R = ${p.v} / ${p.r}`,
          },
          {
            kind: 'analyse',
            slug: 'ohms-law-voltage',
            title: 'The voltage a resistor makes',
            prompt: '{ma} mA flows through a {r} resistor. What voltage appears across it?',
            params: (rng) => ({ ma: rng.pick([1, 5, 10, 20, 50]), r: rng.pick([100, 220, 470, 1000]) }),
            answer: (p) => (p.ma / 1000) * p.r,
            unit: 'V',
            hint: 'The same law, used the other way round.',
            explain: (p) =>
              `V = I × R = ${p.ma} mA × ${p.r} Ω. A resistor does not have a voltage of its own: ` +
              'it has the one the current through it produces.',
          },
          {
            kind: 'analyse',
            slug: 'resistor-power',
            title: 'Where the heat goes',
            prompt:
              'A {r} resistor carries {ma} mA. How much power does it turn into heat?',
            params: (rng) => ({ ma: rng.pick([10, 20, 50, 100]), r: rng.pick([10, 47, 100, 220]) }),
            answer: (p) => (p.ma / 1000) ** 2 * p.r,
            unit: 'W',
            hint: 'P = I²R, and the answer decides which part you can buy.',
            explain: (p) =>
              `P = I²R = (${p.ma} mA)² × ${p.r} Ω. A common surface-mount resistor is rated at 0.1 W ` +
              'or 0.25 W, so this number is what says whether the one in the drawer will survive.',
          },
          {
            kind: 'analyse',
            slug: 'led-resistor-value',
            title: 'Sizing the resistor',
            prompt:
              'An LED dropping {vf} V is to run at {ma} mA from a {v} V rail. What resistance goes in series with it?',
            params: (rng) => ({
              v: rng.pick([5, 9, 12]),
              vf: rng.pick([1.8, 2.1, 3.2]),
              ma: rng.pick([5, 10, 20]),
            }),
            answer: (p) => (p.v - p.vf) / (p.ma / 1000),
            unit: 'ohm',
            hint: 'The resistor drops whatever the LED does not.',
            explain: (p) =>
              `V across the resistor is ${p.v} - ${p.vf} = ${(p.v - p.vf).toFixed(1)} V, and R = V / I.`,
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'e24-nearest',
            title: 'The value you can actually buy',
            prompt:
              'Your sum says {ideal} Ω. Resistors are not made in every value: the E24 series runs 1.0, ' +
              '1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, ' +
              '6.2, 6.8, 7.5, 8.2, 9.1 and the same figures in every decade. Which one would you order?',
            params: (rng) => ({ ideal: rng.pick([187, 312, 640, 1830, 2900, 4400, 7700]) }),
            answer: (p) => nearestE24(p.ideal),
            unit: 'ohm',
            hint: 'Round to the nearest step in the series, not to a round number.',
            explain: (p) =>
              `${p.ideal} Ω is nearest ${formatValue(nearestE24(p.ideal), 'Ω')}. Every value in the ` +
              'series is about 10% from its neighbours, which is exactly the tolerance the cheap parts ' +
              'are made to. That is not a coincidence: the series exists so that any real resistor is ' +
              'within tolerance of a named value.',
          },
          'led_current_limit',
          {
            kind: 'inspect',
            slug: 'led-review',
            templateId: 'led_current_limit',
            title: 'Review: an LED indicator',
            prompt:
              'This sheet came back from a colleague. It does not work. Find the one thing that is wrong with it.',
          },
        ],
      },
      {
        block: 2,
        name: 'Interrupting the loop',
        units: [
          {
            kind: 'analyse',
            slug: 'series-current',
            title: 'Two resistors, one current',
            prompt: 'A {v} V supply drives {r1} and {r2} in series. What current flows?',
            params: (rng) => ({
              v: rng.pick([5, 9, 12]),
              r1: rng.pick([100, 220, 470]),
              r2: rng.pick([330, 680, 1000]),
            }),
            answer: (p) => p.v / (p.r1 + p.r2),
            unit: 'A',
            hint: 'In series there is only one current, and it sees the sum of the resistances.',
            explain: (p) =>
              `I = V / (R1 + R2) = ${p.v} / ${p.r1 + p.r2}. Series resistances add because the same ` +
              'current has to push through both, one after the other.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'switch-contact-drop',
            title: 'A switch is not a perfect wire',
            prompt:
              'A closed pushbutton has {mohm} mΩ of contact resistance and carries {ma} mA. ' +
              'What voltage does it drop?',
            params: (rng) => ({ mohm: rng.pick([50, 100, 200]), ma: rng.pick([10, 20, 100]) }),
            answer: (p) => (p.mohm / 1000) * (p.ma / 1000),
            unit: 'V',
            hint: 'Ohm again, in millis. Look at how small the answer is before you judge it.',
            explain: (p) =>
              `V = ${p.mohm} mΩ × ${p.ma} mA. Small enough to ignore in a signal path, and the reason ` +
              'a switch that carries amps rather than milliamps is a different part with a different price.',
          },
          'switched_led',
          {
            kind: 'inspect',
            slug: 'switched-led-review',
            templateId: 'switched_led',
            title: 'Review: a switched indicator',
            prompt: 'One thing on this sheet stops it working. Find it.',
          },
        ],
      },
    ],
  },
  {
    stage: 2,
    name: 'Resistance in combination',
    blurb: 'Branches, ratios and the values you can actually buy.',
    blocks: [
      {
        block: 1,
        name: 'Branches that do not interfere',
        units: [
          {
            kind: 'analyse',
            slug: 'parallel-pair',
            title: 'Two paths for one current',
            prompt: 'What is the resistance of {r1} and {r2} in parallel?',
            params: (rng) => ({
              r1: rng.pick([100, 220, 470, 1000]),
              r2: rng.pick([100, 330, 680, 2200]),
            }),
            answer: (p) => (p.r1 * p.r2) / (p.r1 + p.r2),
            unit: 'ohm',
            hint: 'Product over sum. The answer is always smaller than either one.',
            explain: (p) =>
              `R = R1·R2 / (R1 + R2) = ${p.r1 * p.r2} / ${p.r1 + p.r2}. Adding a second path can only ` +
              'make it easier for current to get through, so parallel resistance always falls.',
          },
          {
            kind: 'analyse',
            slug: 'branch-total-current',
            title: 'What the supply has to deliver',
            prompt:
              '{n} identical LED branches hang off a {v} V rail. Each is an LED dropping {vf} V in ' +
              'series with a {r} resistor. What current does the supply deliver in total?',
            params: (rng) => ({
              n: rng.pick([2, 3, 4]),
              v: rng.pick([5, 9]),
              vf: rng.pick([1.8, 2.1]),
              r: rng.pick([220, 330, 470]),
            }),
            answer: (p) => (p.n * (p.v - p.vf)) / p.r,
            unit: 'A',
            hint: 'Work out one branch, then remember the branches do not know about each other.',
            explain: (p) =>
              `One branch draws (${p.v} − ${p.vf}) / ${p.r}, and there are ${p.n} of them. Independent ` +
              'branches share a rail, not a current: each takes what its own resistor allows.',
          },
          'two_led_indicators',
          'led_bar_indicators',
          {
            kind: 'inspect',
            slug: 'two-led-review',
            templateId: 'two_led_indicators',
            title: 'Review: two indicators',
            prompt: 'Both indicators were meant to work independently. One thing here is wrong.',
          },
        ],
      },
      {
        block: 2,
        name: 'Dividing a voltage',
        units: [
          {
            kind: 'analyse',
            slug: 'divider-output',
            title: 'What comes out of the middle',
            prompt:
              '{v} V is applied across {r1} on top and {r2} underneath. What voltage appears at the ' +
              'junction between them, measured to ground?',
            params: (rng) => ({
              v: rng.pick([5, 9, 12]),
              r1: rng.pick([1000, 2200, 4700]),
              r2: rng.pick([1000, 3300, 10000]),
            }),
            answer: (p) => (p.v * p.r2) / (p.r1 + p.r2),
            unit: 'V',
            hint: 'The bottom resistor keeps the share of the voltage that matches its share of the total.',
            explain: (p) =>
              `Vout = V · R2 / (R1 + R2) = ${p.v} × ${p.r2} / ${p.r1 + p.r2}. Only the ratio matters, ` +
              'which is why the same output can be built from 1k and 1k or from 1M and 1M.',
          },
          {
            kind: 'analyse',
            slug: 'divider-loaded',
            title: 'What a load does to it',
            prompt:
              'A divider of {r1} over {r2} runs from {v} V to ground, and a {rl} load is now hung on ' +
              'its midpoint. What voltage does the midpoint settle at?',
            params: (rng) => ({
              v: rng.pick([5, 9, 12]),
              r1: rng.pick([10000, 22000]),
              r2: rng.pick([10000, 22000]),
              rl: rng.pick([1000, 4700, 10000]),
            }),
            answer: (p) => {
              const bottom = (p.r2 * p.rl) / (p.r2 + p.rl);
              return (p.v * bottom) / (p.r1 + bottom);
            },
            unit: 'V',
            hint: 'The load is in parallel with the bottom resistor. Combine them first, then divide.',
            explain: (p) => {
              const bottom = (p.r2 * p.rl) / (p.r2 + p.rl);
              return (
                `The load parallels R2 into ${formatValue(bottom, 'Ω')}, and the divider then reads ` +
                `${p.v} × ${formatValue(bottom, '')} / ${formatValue(p.r1 + bottom, '')}. This is why a ` +
                'divider is a reference, not a supply: anything that draws current moves it.'
              );
            },
          },
          {
            kind: 'analyse',
            slug: 'divider-pick-top',
            title: 'Working backwards to a value',
            prompt:
              'You need {vout} V out of a {v} V rail, and you have chosen {r2} for the bottom resistor. ' +
              'What value goes on top?',
            params: (rng) => ({
              v: rng.pick([5, 9, 12]),
              vout: rng.pick([1.65, 2.5, 3.3]),
              r2: rng.pick([1000, 10000]),
            }),
            answer: (p) => (p.r2 * (p.v - p.vout)) / p.vout,
            unit: 'ohm',
            hint: 'The top resistor drops the part of the rail you do not want, at the same current.',
            explain: (p) =>
              `R1 = R2 · (V − Vout) / Vout = ${p.r2} × (${p.v} − ${p.vout}) / ${p.vout}. Then round it ` +
              'to a value you can buy, and check what the rounding did to the output.',
          },
          'voltage_divider',
          {
            kind: 'inspect',
            slug: 'divider-review',
            templateId: 'voltage_divider',
            title: 'Review: a divider reference',
            prompt: 'This divider does not produce the voltage it was designed for. Find the reason.',
          },
        ],
      },
      {
        block: 3,
        name: 'More than one tap',
        units: [
          {
            kind: 'analyse',
            slug: 'ladder-tap',
            title: 'Reading a tap part-way down',
            prompt:
              'Three resistors sit in series across {v} V: R1 = {r1} at the top, then R2 = {r2}, then ' +
              'R3 = {r3} to ground. What voltage appears at the junction of R2 and R3?',
            params: (rng) => ({
              v: rng.pick([5, 9, 12]),
              r1: rng.pick([1000, 2200]),
              r2: rng.pick([1000, 3300]),
              r3: rng.pick([1000, 4700]),
            }),
            answer: (p) => (p.v * p.r3) / (p.r1 + p.r2 + p.r3),
            unit: 'V',
            hint: 'A tap sees everything below it, over everything in the chain.',
            explain: (p) =>
              `V = ${p.v} × ${p.r3} / ${p.r1 + p.r2 + p.r3}. One current runs the whole ladder, so ` +
              'every tap is just the fraction of the chain that lies beneath it.',
          },
          'divider_ladder',
          {
            kind: 'inspect',
            slug: 'ladder-review',
            templateId: 'divider_ladder',
            title: 'Review: a reference ladder',
            prompt: 'One of the taps on this ladder is not where the brief asked for it.',
          },
        ],
      },
    ],
  },
  {
    stage: 3,
    name: 'Switches and defined levels',
    blurb: 'A node with nothing holding it is not low. It is undefined.',
    blocks: [
      {
        block: 1,
        name: 'Pulling a node',
        units: [
          {
            kind: 'analyse',
            slug: 'pull-current',
            title: 'What the pull-up costs you',
            prompt:
              'A {r} pull-up holds a node at {v} V. While the button is held down the node is at 0 V. ' +
              'What current flows through the resistor for as long as it is held?',
            params: (rng) => ({ v: rng.pick([3.3, 5]), r: rng.pick([1000, 4700, 10000, 47000]) }),
            answer: (p) => p.v / p.r,
            unit: 'A',
            hint: 'The whole rail is across the resistor while the button is pressed.',
            explain: (p) =>
              `I = ${p.v} / ${p.r}. This is the standing cost of the arrangement, and it is the reason ` +
              'a battery-powered board uses 100k rather than 1k for a button nobody is pressing.',
          },
          {
            kind: 'analyse',
            slug: 'pull-leakage',
            title: 'Why the pull-up cannot be enormous',
            prompt:
              'A {r} pull-up feeds a logic input that leaks {ua} µA. How far below the rail does the ' +
              'node sit when nothing is pulling it down?',
            params: (rng) => ({ r: rng.pick([100000, 470000, 1000000]), ua: rng.pick([1, 5, 10]) }),
            answer: (p) => p.r * (p.ua / 1e6),
            unit: 'V',
            hint: 'The leakage is a current, and it flows through the pull-up.',
            explain: (p) =>
              `V = ${formatValue(p.r, 'Ω')} × ${p.ua} µA. The bigger the resistor, the less current it ` +
              'wastes and the more of the rail the leakage takes away. That trade is the whole reason ' +
              'pull-ups cluster around 10k.',
          },
          'button_pulldown',
          'button_pullup',
          {
            kind: 'inspect',
            slug: 'pulldown-review',
            templateId: 'button_pulldown',
            title: 'Review: a button input',
            prompt:
              'This input reads as random noise when the button is not pressed. Find what was done wrong.',
          },
        ],
      },
      {
        block: 2,
        name: 'Changeover and shared lines',
        units: [
          {
            kind: 'analyse',
            slug: 'both-throws-closed',
            title: 'Why a changeover has one wiper',
            prompt:
              'Someone wires two separate switches instead of one changeover: one from a node up to ' +
              '{v} V, one from the same node down to ground. Both get closed at once. The only ' +
              'resistance in that loop is {mohm} mΩ of wiring. What current flows?',
            params: (rng) => ({ v: rng.pick([3.3, 5, 12]), mohm: rng.pick([20, 50, 100]) }),
            answer: (p) => p.v / (p.mohm / 1000),
            unit: 'A',
            hint: 'Ohm does not care that you did not mean it.',
            explain: (p) =>
              `I = ${p.v} / ${p.mohm} mΩ. Nothing in that loop limits it but the wire, and the answer ` +
              'is why a changeover switch exists: one wiper physically cannot touch both throws, so ' +
              'the mistake becomes impossible rather than merely unlikely.',
          },
          'spdt_level_select',
          'wired_or_buttons',
          {
            kind: 'inspect',
            slug: 'spdt-review',
            templateId: 'spdt_level_select',
            title: 'Review: a level selector',
            prompt: 'This selector does not hold the level it should. Find the item at fault.',
          },
        ],
      },
    ],
  },
  {
    stage: 4,
    name: 'Charge, capacitors and time',
    blurb: 'Storing energy locally, and what that buys you.',
    blocks: [
      {
        block: 1,
        name: 'Holding a rail up',
        units: [
          {
            kind: 'analyse',
            slug: 'rail-droop',
            title: 'How far the rail falls',
            prompt:
              'A chip draws a {ma} mA spike for {us} µs. The only thing supplying it that fast is a ' +
              '{c}F capacitor across the rail. How far does the rail droop?',
            params: (rng) => ({
              ma: rng.pick([50, 100, 200]),
              us: rng.pick([1, 5, 10]),
              c: rng.pick([100e-9, 1e-6, 10e-6]),
            }),
            answer: (p) => ((p.ma / 1000) * (p.us / 1e6)) / p.c,
            unit: 'V',
            hint: 'The charge taken out is I·t, and taking charge out of a capacitor lowers its voltage.',
            explain: (p) =>
              `ΔV = I·t / C = ${p.ma} mA × ${p.us} µs / ${formatValue(p.c, 'F')}. This is the whole ` +
              'argument for decoupling: the supply cannot respond in microseconds, so something local has to.',
          },
          {
            kind: 'analyse',
            slug: 'bulk-sizing',
            title: 'Sizing it from the droop you will accept',
            prompt:
              'A spike of {ma} mA lasts {us} µs, and the rail may not fall by more than {mv} mV while ' +
              'it does. What capacitance do you need across the rail?',
            params: (rng) => ({
              ma: rng.pick([50, 100, 200]),
              us: rng.pick([1, 5, 10]),
              mv: rng.pick([10, 50, 100]),
            }),
            answer: (p) => ((p.ma / 1000) * (p.us / 1e6)) / (p.mv / 1000),
            unit: 'F',
            hint: 'Same relation, rearranged for C.',
            explain: (p) =>
              `C = I·t / ΔV = ${p.ma} mA × ${p.us} µs / ${p.mv} mV. Now round it up to a value you can ` +
              'buy, and notice that 100nF turns out to be the right order of magnitude surprisingly often.',
          },
          'rail_bypass_pair',
          {
            kind: 'inspect',
            slug: 'bypass-review',
            templateId: 'rail_bypass_pair',
            title: 'Review: bulk and bypass',
            prompt: 'One of these two capacitors is not doing the job it was put there for.',
          },
        ],
      },
      {
        block: 2,
        name: 'RC and time',
        units: [
          {
            kind: 'analyse',
            slug: 'rc-tau',
            title: 'The time constant',
            prompt: 'What is the time constant of {r} and {c}F together?',
            params: (rng) => ({
              r: rng.pick([1000, 10000, 100000]),
              c: rng.pick([10e-9, 100e-9, 1e-6]),
            }),
            answer: (p) => p.r * p.c,
            unit: 's',
            hint: 'τ = R·C, and it comes out in seconds if you keep everything in ohms and farads.',
            explain: (p) =>
              `τ = ${formatValue(p.r, 'Ω')} × ${formatValue(p.c, 'F')} = ${formatValue(p.r * p.c, 's')}. ` +
              'One time constant is the time to cover 63% of whatever gap is left.',
          },
          {
            kind: 'analyse',
            slug: 'rc-settle',
            title: 'Waiting for it to arrive',
            prompt:
              'A step is applied to an RC made of {r} and {c}F. How long until the output has reached ' +
              '90% of the way there?',
            params: (rng) => ({
              r: rng.pick([1000, 10000, 100000]),
              c: rng.pick([10e-9, 100e-9, 1e-6]),
            }),
            answer: (p) => p.r * p.c * Math.log(10),
            unit: 's',
            hint: 'It never quite arrives. 90% takes ln(10) time constants, which is about 2.3 of them.',
            explain: (p) =>
              `t = τ · ln(10) ≈ 2.3 × ${formatValue(p.r * p.c, 's')}. Worth memorising: one τ is 63%, ` +
              'three τ is 95%, five τ is 99%. Nothing charging through a resistor ever truly finishes.',
          },
          {
            kind: 'analyse',
            slug: 'rc-corner',
            title: 'The same circuit, measured in hertz',
            prompt: 'What is the corner frequency of a low-pass filter made from {r} and {c}F?',
            params: (rng) => ({
              r: rng.pick([1000, 10000, 100000]),
              c: rng.pick([10e-9, 100e-9, 1e-6]),
            }),
            answer: (p) => 1 / (2 * Math.PI * p.r * p.c),
            unit: 'Hz',
            hint: 'f = 1 / (2πRC). Same two parts as the time constant, read in the other domain.',
            explain: (p) =>
              `f = 1 / (2π × ${formatValue(p.r, 'Ω')} × ${formatValue(p.c, 'F')}) = ` +
              `${formatValue(1 / (2 * Math.PI * p.r * p.c), 'Hz')}. Time constant and corner frequency ` +
              'are the same fact: a circuit that takes longer to respond must pass less of what is fast.',
          },
          'rc_lowpass',
          {
            kind: 'inspect',
            slug: 'rc-review',
            templateId: 'rc_lowpass',
            title: 'Review: an RC filter',
            prompt: 'This filter does not do what the brief asked. Find the item responsible.',
          },
        ],
      },
    ],
  },
  {
    stage: 5,
    name: 'Parts that only work one way',
    blurb: 'Diodes, clamping and polarity discipline.',
    blocks: [
      {
        block: 1,
        name: 'Clamping a rail',
        units: [
          {
            kind: 'analyse',
            slug: 'diode-forward-current',
            title: 'Current through a forward diode',
            prompt:
              'A silicon diode drops {vd} V once it is conducting. It is fed from {v} V through a ' +
              '{r} resistor. What current flows?',
            params: (rng) => ({
              vd: rng.pick([0.6, 0.7]),
              v: rng.pick([5, 9, 12]),
              r: rng.pick([220, 470, 1000]),
            }),
            answer: (p) => (p.v - p.vd) / p.r,
            unit: 'A',
            hint: 'The diode takes its drop off the top; the resistor sets the current with what is left.',
            explain: (p) =>
              `I = (${p.v} − ${p.vd}) / ${p.r}. A diode's forward drop barely moves with current, ` +
              'which is exactly why it cannot limit its own: something else has to.',
          },
          {
            kind: 'analyse',
            slug: 'zener-series-resistor',
            title: 'Feeding a shunt reference',
            prompt:
              'A {vz} V Zener runs from a {vin} V rail. The load takes {il} mA, and the Zener needs ' +
              '{iz} mA of its own to stay in regulation. What series resistor feeds both?',
            params: (rng) => ({
              vz: rng.pick([3.3, 5.1, 6.2]),
              vin: rng.pick([9, 12]),
              il: rng.pick([2, 5, 10]),
              iz: rng.pick([5, 10]),
            }),
            answer: (p) => (p.vin - p.vz) / ((p.il + p.iz) / 1000),
            unit: 'ohm',
            hint: 'One resistor carries both currents, so size it for their sum.',
            explain: (p) =>
              `R = (${p.vin} − ${p.vz}) / (${p.il} + ${p.iz}) mA. Size it for the load alone and the ` +
              'Zener starves the moment the load draws anything, which is the failure that looks like ' +
              'a reference that works on the bench and not in the product.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'zener-power',
            title: 'What the Zener has to survive',
            prompt:
              'The load is disconnected, so the whole {iz} mA now goes through the {vz} V Zener. ' +
              'How much power does it dissipate?',
            params: (rng) => ({ vz: rng.pick([3.3, 5.1, 6.2]), iz: rng.pick([10, 15, 20]) }),
            answer: (p) => p.vz * (p.iz / 1000),
            unit: 'W',
            hint: 'The worst case for a shunt regulator is no load at all.',
            explain: (p) =>
              `P = ${p.vz} V × ${p.iz} mA. A shunt reference is at its hottest when nothing is using ` +
              'it, which is the opposite of every other kind of supply and catches people out.',
          },
          'zener_shunt_reference',
          {
            kind: 'inspect',
            slug: 'zener-review',
            templateId: 'zener_shunt_reference',
            title: 'Review: a shunt reference',
            prompt: 'This reference does not hold its voltage. Find the item at fault.',
          },
        ],
      },
    ],
  },
  {
    stage: 6,
    name: 'Logic gates and real chips',
    blurb: 'A gate is one unit of a package that needs feeding.',
    blocks: [
      {
        block: 1,
        name: 'A gate is part of a chip',
        units: [
          {
            kind: 'analyse',
            slug: 'logic-threshold',
            title: 'What counts as low',
            prompt:
              'A 74HC part on a {v} V rail reads an input as LOW only below 0.3 × VCC, and as HIGH ' +
              'only above 0.7 × VCC. What is the highest voltage that is still reliably a LOW?',
            params: (rng) => ({ v: rng.pick([3.3, 5]) }),
            answer: (p) => 0.3 * p.v,
            unit: 'V',
            hint: 'The thresholds are fractions of the supply, not fixed voltages.',
            explain: (p) =>
              `0.3 × ${p.v} V. Between that and 0.7 × ${p.v} V is the forbidden band: an input sitting ` +
              'there is not read as either level, and the gate may oscillate rather than simply guess. ' +
              'That band is the reason a floating input is a fault and not a coin toss.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'gate-output-current',
            title: 'What a logic output can actually drive',
            prompt:
              'A 74HC output sags to {vo} V when it sources {ma} mA. Driving an LED that drops {vf} V ' +
              'at that current, what series resistor do you need?',
            params: (rng) => ({
              vo: rng.pick([4.1, 4.3]),
              ma: rng.pick([3, 4, 5]),
              vf: rng.pick([1.8, 2.1]),
            }),
            answer: (p) => (p.vo - p.vf) / (p.ma / 1000),
            unit: 'ohm',
            hint: 'Size it from the output voltage under load, not from the rail.',
            explain: (p) =>
              `R = (${p.vo} − ${p.vf}) / ${p.ma} mA. Using the 5 V rail in that sum instead of the ` +
              'loaded output voltage is how people arrive at 20 mA from a part that cannot deliver it.',
          },
          'and_two_buttons',
          {
            kind: 'inspect',
            slug: 'and-review',
            templateId: 'and_two_buttons',
            title: 'Review: a two-button AND',
            prompt: 'The LED lights when it should not. Find what is wrong with this sheet.',
          },
        ],
      },
      {
        block: 2,
        name: 'Making a gate do another job',
        units: [
          {
            kind: 'analyse',
            slug: 'nand-truth',
            title: 'Counting a truth table',
            prompt:
              'A 2-input NAND has four possible input combinations. In how many of them is the output HIGH?',
            params: () => ({}),
            answer: () => 3,
            unit: '',
            hint: 'A NAND is only LOW when an AND would be HIGH.',
            explain: () =>
              'Three. Only 1-1 gives a LOW output. That single asymmetry is why NAND is a universal ' +
              'gate: every other function can be built from enough of them.',
          },
          {
            kind: 'analyse',
            slug: 'chained-delay',
            title: 'Delay adds up',
            prompt:
              'A 74HC gate has a propagation delay of {ns} ns. A signal passes through {n} of them in ' +
              'a chain. How long from the input changing to the last output settling?',
            params: (rng) => ({ ns: rng.pick([8, 12, 15]), n: rng.pick([3, 4, 5]) }),
            answer: (p) => p.n * p.ns * 1e-9,
            unit: 's',
            hint: 'Each stage waits for the one before it.',
            explain: (p) =>
              `${p.n} × ${p.ns} ns. Logic is fast but not instant, and depth costs time: this is why a ` +
              'design is described by how many gates a signal passes through, not how many it contains.',
          },
          'nand_as_inverter',
          'active_low_inverter',
          {
            kind: 'inspect',
            slug: 'nand-review',
            templateId: 'nand_as_inverter',
            title: 'Review: a NAND as an inverter',
            prompt: 'This inverter behaves unpredictably. Find the item responsible.',
          },
        ],
      },
      {
        block: 3,
        name: 'Comparing two inputs',
        units: [
          {
            kind: 'analyse',
            slug: 'xor-truth',
            title: 'The disagreement gate',
            prompt:
              'A 2-input XOR has four possible input combinations. In how many of them is the output HIGH?',
            params: () => ({}),
            answer: () => 2,
            unit: '',
            hint: 'It is HIGH exactly when the two inputs differ.',
            explain: () =>
              'Two: 0-1 and 1-0. "These two disagree" is the whole function, which is why XOR turns up ' +
              'in parity checks, comparators and every adder ever built.',
          },
          'xor_difference_detector',
          {
            kind: 'inspect',
            slug: 'xor-review',
            templateId: 'xor_difference_detector',
            title: 'Review: a difference detector',
            prompt: 'This detector never changes state. Find the reason.',
          },
        ],
      },
      {
        block: 4,
        name: 'Cleaning up a real signal',
        units: [
          {
            kind: 'analyse',
            slug: 'debounce-resistor',
            title: 'Sizing the filter to the bounce',
            prompt:
              'Contact bounce on this switch lasts up to {ms} ms. You want an RC time constant at ' +
              'least that long, and you have a {c}F capacitor. What resistor?',
            params: (rng) => ({ ms: rng.pick([5, 10, 20]), c: rng.pick([100e-9, 1e-6]) }),
            answer: (p) => p.ms / 1000 / p.c,
            unit: 'ohm',
            hint: 'τ = R·C, rearranged, with the bounce time as τ.',
            explain: (p) =>
              `R = ${p.ms} ms / ${formatValue(p.c, 'F')}. Too short and the bounce gets through; too ` +
              'long and the button feels slow to respond. Bounce is the specification here.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'switch-discharge-current',
            title: 'What the contacts have to survive',
            prompt:
              'The {c}F filter capacitor is charged to {v} V when the button closes and shorts it out ' +
              'through {mohm} mΩ of contact resistance. What is the peak current through the contacts?',
            params: (rng) => ({
              c: rng.pick([100e-9, 1e-6]),
              v: rng.pick([3.3, 5]),
              mohm: rng.pick([50, 100, 200]),
            }),
            answer: (p) => p.v / (p.mohm / 1000),
            unit: 'A',
            hint: 'Nothing but the contacts is in that loop.',
            explain: (p) =>
              `I = ${p.v} / ${p.mohm} mΩ. It lasts nanoseconds and does not trip anything, but it ` +
              'pits the contacts a little on every press. A resistor in series with the switch costs ' +
              'nothing and is why the good debounce circuits have one.',
          },
          'rc_debounce',
          {
            kind: 'inspect',
            slug: 'debounce-review',
            templateId: 'rc_debounce',
            title: 'Review: a debounced input',
            prompt: 'This input still registers multiple presses. Find the item at fault.',
          },
        ],
      },
    ],
  },
  {
    stage: 7,
    name: 'Transistors as switches',
    blurb: 'A logic pin cannot drive a load. Something has to multiply its current.',
    blocks: [
      {
        block: 1,
        name: 'Driving a real load',
        units: [
          {
            kind: 'analyse',
            slug: 'base-current-needed',
            title: 'How hard to drive the base',
            prompt:
              'The load draws {ic} mA. The transistor guarantees a current gain of only {hfe} down at ' +
              'saturation, and good practice is to overdrive the base {k} times beyond the minimum. ' +
              'What base current do you aim for?',
            params: (rng) => ({
              ic: rng.pick([100, 200, 500]),
              hfe: rng.pick([20, 30, 50]),
              k: rng.pick([2, 3, 5]),
            }),
            answer: (p) => ((p.ic / 1000) / p.hfe) * p.k,
            unit: 'A',
            hint: 'Collector current over the saturation gain, then multiply by the overdrive factor.',
            explain: (p) =>
              `I_B = ${p.ic} mA / ${p.hfe} × ${p.k}. The gain on the front of a datasheet is measured ` +
              'in the active region and is not the number to use here: a switch has to be driven hard ' +
              'enough to stay in saturation at the worst-case gain, not the typical one.',
          },
          {
            kind: 'analyse',
            slug: 'base-resistor',
            title: 'The resistor that sets it',
            prompt:
              'You need {ib} mA into the base. It is driven from a logic output at {v} V, and the ' +
              'base-emitter junction drops 0.7 V. What base resistor?',
            params: (rng) => ({ ib: rng.pick([1, 2, 5, 10]), v: rng.pick([3.3, 5]) }),
            answer: (p) => (p.v - 0.7) / (p.ib / 1000),
            unit: 'ohm',
            hint: 'The resistor drops whatever the base-emitter junction does not.',
            explain: (p) =>
              `R = (${p.v} − 0.7) / ${p.ib} mA. The base looks like a diode, so the drop across it ` +
              'hardly moves and the resistor is what actually decides the current.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'saturation-loss',
            title: 'What the transistor turns into heat',
            prompt:
              'A saturated transistor drops {vce} V while carrying {ic} mA. How much power does it ' +
              'dissipate?',
            params: (rng) => ({ vce: rng.pick([0.2, 0.3, 0.5]), ic: rng.pick([100, 200, 500]) }),
            answer: (p) => p.vce * (p.ic / 1000),
            unit: 'W',
            hint: 'The drop across it, times the current through it.',
            explain: (p) =>
              `P = ${p.vce} V × ${p.ic} mA. Small, and that is the point of saturating it: the same ` +
              'transistor half-on would drop volts instead of tenths and cook itself.',
          },
          'transistor_load_switch',
          {
            kind: 'inspect',
            slug: 'load-switch-review',
            templateId: 'transistor_load_switch',
            title: 'Review: a logic-driven load switch',
            prompt: 'This switch does not turn the load fully on. Find the item responsible.',
          },
        ],
      },
    ],
  },
  {
    stage: 8,
    name: 'Powering a board',
    blurb: 'Getting a clean rail to every part that needs one.',
    blocks: [
      {
        block: 1,
        name: 'Power entry',
        units: [
          {
            kind: 'analyse',
            slug: 'bulk-versus-local',
            title: 'Two capacitors, two jobs',
            prompt:
              'A 100nF decoupling capacitor and a {c}F bulk capacitor sit on the same rail at the same ' +
              'voltage. How many times more charge does the bulk one hold?',
            params: (rng) => ({ c: rng.pick([10e-6, 22e-6, 100e-6]) }),
            answer: (p) => p.c / 100e-9,
            unit: '',
            hint: 'Charge is proportional to capacitance at a given voltage, so this is just a ratio.',
            explain: (p) =>
              `${formatValue(p.c, 'F')} / 100nF. The bulk capacitor holds hundreds of times more and ` +
              'cannot deliver it quickly; the small one holds almost nothing and can deliver it in ' +
              'nanoseconds. They are not redundant, they are a fast one and a deep one.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'esr-ripple',
            title: 'Why the capacitor is not a short',
            prompt:
              'An electrolytic with {mohm} mΩ of equivalent series resistance carries {ma} mA of ' +
              'ripple current. How much ripple voltage does its ESR alone put back on the rail?',
            params: (rng) => ({ mohm: rng.pick([100, 300, 600]), ma: rng.pick([50, 100, 500]) }),
            answer: (p) => (p.mohm / 1000) * (p.ma / 1000),
            unit: 'V',
            hint: 'The ESR is a resistor in series with an otherwise ideal capacitor.',
            explain: (p) =>
              `V = ${p.mohm} mΩ × ${p.ma} mA. Above a few hundred kilohertz the ESR, not the ` +
              'capacitance, is what decides how well a capacitor holds a rail up, and it is why a ' +
              'ceramic sits next to the electrolytic rather than instead of it.',
          },
          'mcu_power_entry',
          {
            kind: 'inspect',
            slug: 'power-entry-review',
            templateId: 'mcu_power_entry',
            title: 'Review: a microcontroller power entry',
            prompt: 'This board resets at random. Find the item at fault.',
          },
        ],
      },
      {
        block: 2,
        name: 'Regulating a rail',
        units: [
          {
            kind: 'analyse',
            slug: 'regulator-dissipation',
            title: 'The heat a linear regulator makes',
            prompt:
              'A 7805 turns {vin} V into 5 V and the load draws {ma} mA. How much power does the ' +
              'regulator itself dissipate?',
            params: (rng) => ({ vin: rng.pick([9, 12, 15]), ma: rng.pick([100, 250, 500]) }),
            answer: (p) => (p.vin - 5) * (p.ma / 1000),
            unit: 'W',
            hint: 'It passes the load current and drops the difference in voltage.',
            explain: (p) =>
              `P = (${p.vin} − 5) × ${p.ma} mA. A linear regulator does not convert the excess, it ` +
              'burns it, and the current through it is the load current whatever the input voltage is.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'regulator-efficiency',
            title: 'What fraction reaches the load',
            prompt:
              'The same regulator, {vin} V in and 5 V out. What fraction of the input power actually ' +
              'reaches the load?',
            params: (rng) => ({ vin: rng.pick([9, 12, 15, 24]) }),
            answer: (p) => 5 / p.vin,
            unit: '',
            hint: 'The current is the same on both sides, so the ratio is just the voltages.',
            explain: (p) =>
              `5 / ${p.vin}. Nothing about the load changes that number, which is the whole case ` +
              'against a linear regulator across a large drop, and the whole case for a switcher.',
          },
          'linear_regulator',
          {
            kind: 'inspect',
            slug: 'regulator-review',
            templateId: 'linear_regulator',
            title: 'Review: a 5V regulator stage',
            prompt: 'This regulator oscillates. Find the item responsible.',
          },
        ],
      },
      {
        block: 3,
        name: 'A quiet rail for analogue parts',
        units: [
          {
            kind: 'analyse',
            slug: 'ldo-dropout',
            title: 'The lowest input it will take',
            prompt:
              'An LDO regulating to {vout} V needs {vdo} mV of dropout at the current you are drawing. ' +
              'What is the lowest input voltage at which it still regulates?',
            params: (rng) => ({ vout: rng.pick([1.8, 3.3, 5]), vdo: rng.pick([150, 300, 500]) }),
            answer: (p) => p.vout + p.vdo / 1000,
            unit: 'V',
            hint: 'Dropout is the headroom it needs above its own output.',
            explain: (p) =>
              `${p.vout} + ${p.vdo} mV. Below that the output simply follows the input down, minus the ` +
              'dropout, and stops being regulated at all: it does not fail loudly, it just stops working.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'ferrite-dc-drop',
            title: 'A ferrite is a wire at DC',
            prompt:
              'A ferrite bead is specified as {z} Ω at 100 MHz and {mohm} mΩ at DC. The analogue rail ' +
              'behind it draws {ma} mA. How much voltage does the bead drop?',
            params: (rng) => ({
              z: rng.pick([120, 220, 600]),
              mohm: rng.pick([50, 100, 300]),
              ma: rng.pick([20, 50, 100]),
            }),
            answer: (p) => (p.mohm / 1000) * (p.ma / 1000),
            unit: 'V',
            hint: 'Only one of those two numbers matters to a DC load. Pick the right one.',
            explain: (p) =>
              `V = ${p.mohm} mΩ × ${p.ma} mA. The 100 MHz figure is what the bead does to noise; the ` +
              'DC figure is what it costs you. A bead chosen only by its impedance rating can quietly ' +
              'drop a tenth of a volt off the rail it was meant to clean.',
          },
          'ldo_analog_rail',
          {
            kind: 'inspect',
            slug: 'ldo-review',
            templateId: 'ldo_analog_rail',
            title: 'Review: a filtered analogue rail',
            prompt: 'Switching noise is still reaching the analogue parts. Find the item at fault.',
          },
        ],
      },
    ],
  },
  {
    stage: 9,
    name: 'Operational amplifiers',
    blurb: 'Feedback sets the behaviour, not the part.',
    blocks: [
      {
        block: 1,
        name: 'Buffering a signal',
        units: [
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'bias-current-offset',
            title: 'What the input current costs you',
            prompt:
              'An op-amp draws {na} nA of bias current into its input. It is fed from a source whose ' +
              'resistance is {r}. What offset voltage does that current create?',
            params: (rng) => ({ na: rng.pick([1, 20, 100]), r: rng.pick([10000, 100000, 1000000]) }),
            answer: (p) => p.r * (p.na / 1e9),
            unit: 'V',
            hint: 'The bias current has to flow through whatever resistance feeds the input.',
            explain: (p) =>
              `V = ${formatValue(p.r, 'Ω')} × ${p.na} nA. This is the number that decides whether a ` +
              'part is suitable: a bipolar input is fine from a low-impedance source and hopeless from ' +
              'a megohm divider, which is exactly what a FET-input op-amp exists to solve.',
          },
          {
            kind: 'analyse',
            slug: 'slew-limit',
            title: 'The fastest signal it can follow',
            prompt:
              'An op-amp slews at {sr} V/µs. What is the highest frequency at which it can still ' +
              'reproduce a {vpp} V peak-to-peak sine wave without distorting it?',
            params: (rng) => ({ sr: rng.pick([0.5, 2, 13]), vpp: rng.pick([2, 5, 10]) }),
            answer: (p) => (p.sr * 1e6) / (Math.PI * p.vpp),
            unit: 'Hz',
            hint: 'A sine is steepest at the zero crossing, where its slope is π·f·Vpp.',
            explain: (p) =>
              `f = SR / (π · Vpp) = ${p.sr} V/µs / (π × ${p.vpp} V). Above that the output stops being ` +
              'a sine and becomes a triangle: the amplifier is no longer amplifying, it is running as ' +
              'fast as it can. Note that it depends on amplitude, so the same part is faster on a ' +
              'smaller signal.',
          },
          'voltage_follower',
          {
            kind: 'inspect',
            slug: 'follower-review',
            templateId: 'voltage_follower',
            title: 'Review: a unity-gain buffer',
            prompt: 'This buffer sits hard against one rail. Find the item at fault.',
          },
        ],
      },
      {
        block: 2,
        name: 'Setting a gain',
        units: [
          {
            kind: 'analyse',
            slug: 'noninverting-gain',
            title: 'Reading the gain off the resistors',
            prompt:
              'A non-inverting stage has {rf} in the feedback path and {rg} from the inverting input ' +
              'to ground. What is its voltage gain?',
            params: (rng) => ({
              rf: rng.pick([10000, 47000, 100000]),
              rg: rng.pick([1000, 4700, 10000]),
            }),
            answer: (p) => 1 + p.rf / p.rg,
            unit: '',
            hint: 'Gain = 1 + Rf/Rg. Mind the one.',
            explain: (p) =>
              `1 + ${formatValue(p.rf, '')} / ${formatValue(p.rg, '')}. The one is the signal itself ` +
              'arriving at the input; the ratio is what the feedback divider adds on top. That is why ' +
              'a non-inverting stage can never have a gain below one.',
          },
          {
            kind: 'analyse',
            slug: 'inverting-feedback-resistor',
            title: 'Working back to a feedback resistor',
            prompt:
              'You want an inverting stage with a gain of −{g}, and you have chosen {rin} as the input ' +
              'resistor. What feedback resistor?',
            params: (rng) => ({ g: rng.pick([2, 5, 10, 20]), rin: rng.pick([1000, 4700, 10000]) }),
            answer: (p) => p.g * p.rin,
            unit: 'ohm',
            hint: 'For an inverting stage the gain is just the ratio, with no added one.',
            explain: (p) =>
              `Rf = ${p.g} × ${formatValue(p.rin, 'Ω')}. The input resistor also sets the impedance the ` +
              'source sees, so it is not a free choice: pick it for the source, then size Rf for the gain.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'gain-bandwidth',
            title: 'Gain costs bandwidth',
            prompt:
              'An op-amp has a gain-bandwidth product of {gbw} MHz. You configure it for a gain of ' +
              '{g}. What bandwidth do you get?',
            params: (rng) => ({ gbw: rng.pick([1, 3, 10]), g: rng.pick([2, 10, 100]) }),
            answer: (p) => (p.gbw * 1e6) / p.g,
            unit: 'Hz',
            hint: 'The product is constant: that is what makes it a product.',
            explain: (p) =>
              `${p.gbw} MHz / ${p.g}. Gain and bandwidth trade one for one, which is why a high-gain ` +
              'stage is often split into two lower-gain ones: the same total gain arrives with far ' +
              'more bandwidth left.',
          },
          'noninverting_amp',
          'inverting_amp',
          {
            kind: 'inspect',
            slug: 'amp-review',
            templateId: 'inverting_amp',
            title: 'Review: an inverting amplifier',
            prompt: 'The gain is not what the brief asked for. Find the item responsible.',
          },
        ],
      },
      {
        block: 3,
        name: 'Deciding, with hysteresis',
        units: [
          {
            kind: 'analyse',
            slug: 'hysteresis-band',
            title: 'How much hysteresis you get',
            prompt:
              'A comparator output swings between 0 and {v} V. A {rf} feedback resistor runs from the ' +
              'output back to the non-inverting input, where the reference divider presents a source ' +
              'resistance of {rth}. By how much does the threshold move when the output flips?',
            params: (rng) => ({
              v: rng.pick([3.3, 5]),
              rf: rng.pick([100000, 220000, 470000]),
              rth: rng.pick([2500, 5000, 10000]),
            }),
            answer: (p) => (p.v * p.rth) / (p.rth + p.rf),
            unit: 'V',
            hint: 'The output drives the threshold through a divider made of Rf and the reference impedance.',
            explain: (p) =>
              `ΔV = ${p.v} × ${formatValue(p.rth, '')} / (${formatValue(p.rth, '')} + ` +
              `${formatValue(p.rf, '')}). Make Rf large and the band shrinks toward nothing, which is ` +
              'the chattering you were trying to stop. Make it small and the comparator latches and ' +
              'never comes back.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'open-collector-rise',
            title: 'What an open-collector output cannot do',
            prompt:
              'An open-collector output can only pull down. Its {r} pull-up has to charge {pf} pF of ' +
              'wiring capacitance to get back high. How long is one time constant of that rise?',
            params: (rng) => ({ r: rng.pick([1000, 4700, 10000]), pf: rng.pick([50, 100, 400]) }),
            answer: (p) => p.r * (p.pf * 1e-12),
            unit: 's',
            hint: 'The same RC as ever, with the pull-up as R and the stray capacitance as C.',
            explain: (p) =>
              `τ = ${formatValue(p.r, 'Ω')} × ${p.pf} pF. Falling edges are fast because a transistor ` +
              'drives them; rising edges are slow because only a resistor does. Every open-collector ' +
              'bus in existence is asymmetric for this reason.',
          },
          'comparator_hysteresis',
          {
            kind: 'inspect',
            slug: 'comparator-review',
            templateId: 'comparator_hysteresis',
            title: 'Review: a comparator with hysteresis',
            prompt: 'This output chatters on a slow input. Find the item at fault.',
          },
        ],
      },
    ],
  },
  {
    stage: 10,
    name: 'Sensing the physical world',
    blurb: 'Turning a physical quantity into a voltage something can read.',
    blocks: [
      {
        block: 1,
        name: 'Resistive sensors',
        units: [
          {
            kind: 'analyse',
            slug: 'thermistor-midpoint',
            title: 'Turning a resistance into a voltage',
            prompt:
              'An NTC thermistor reads {rt} at the temperature you care about. It sits on top of a ' +
              'fixed {rf} resistor across a {v} V rail. What voltage appears at the midpoint?',
            params: (rng) => ({
              rt: rng.pick([4700, 10000, 22000]),
              rf: rng.pick([4700, 10000]),
              v: rng.pick([3.3, 5]),
            }),
            answer: (p) => (p.v * p.rf) / (p.rt + p.rf),
            unit: 'V',
            hint: 'It is an ordinary divider. The sensor is just the resistor that moves.',
            explain: (p) =>
              `V = ${p.v} × ${formatValue(p.rf, '')} / ${formatValue(p.rt + p.rf, '')}. A resistive ` +
              'sensor measures nothing on its own: the divider is what turns its resistance into ' +
              'something an ADC can read.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'adc-lsb',
            title: 'The smallest change a converter can see',
            prompt:
              'An ADC of {bits} bits is referenced to {v} V. What voltage does one count represent?',
            params: (rng) => ({ bits: rng.pick([8, 10, 12]), v: rng.pick([3.3, 5]) }),
            answer: (p) => p.v / 2 ** p.bits,
            unit: 'V',
            hint: 'The reference is divided into 2^bits steps.',
            explain: (p) =>
              `${p.v} / 2^${p.bits} = ${p.v} / ${2 ** p.bits}. Anything smaller than this is invisible ` +
              'to the converter however clean the front end is, so it is the number that decides ' +
              'whether the divider you designed has enough swing to be worth reading.',
          },
          'thermistor_adc',
          {
            kind: 'inspect',
            slug: 'thermistor-review',
            templateId: 'thermistor_adc',
            title: 'Review: a thermistor front end',
            prompt: 'This reading does not move with temperature. Find the item responsible.',
          },
        ],
      },
      {
        block: 2,
        name: 'Sensors that output a voltage',
        units: [
          {
            kind: 'analyse',
            slug: 'tmp36-temperature',
            title: 'Reading the sensor back',
            prompt:
              'A TMP36 outputs 500 mV at 0 °C and rises 10 mV for every degree. It reads {mv} mV. ' +
              'What temperature is that, in °C?',
            params: (rng) => ({ mv: rng.pick([600, 700, 850, 950]) }),
            answer: (p) => (p.mv - 500) / 10,
            unit: '',
            hint: 'Take off the offset first, then divide by the slope.',
            explain: (p) =>
              `(${p.mv} − 500) / 10. The 500 mV offset is there so the part can report temperatures ` +
              'below zero on a single supply, which it could not do if 0 °C sat at 0 V.',
          },
          {
            kind: 'analyse',
            slug: 'sensor-adc-counts',
            title: 'What the converter actually reports',
            prompt:
              'A sensor output of {mv} mV goes into a {bits}-bit ADC referenced to {v} V. What count does it read?',
            params: (rng) => ({
              mv: rng.pick([600, 700, 850, 950]),
              bits: rng.pick([10, 12]),
              v: rng.pick([3.3, 5]),
            }),
            answer: (p) => (p.mv / 1000 / p.v) * 2 ** p.bits,
            unit: '',
            hint: 'The count is the fraction of the reference, times the number of steps.',
            explain: (p) =>
              `${p.mv} mV / ${p.v} V × ${2 ** p.bits}. Notice how little of the range a 0.6 to 1.75 V ` +
              'sensor uses on a 5 V reference: most of the converter is being spent on voltages the ' +
              'sensor will never produce.',
          },
          'tmp36_buffer',
          {
            kind: 'inspect',
            slug: 'tmp36-review',
            templateId: 'tmp36_buffer',
            title: 'Review: a buffered sensor',
            prompt: 'This reading sags whenever the ADC samples. Find the item at fault.',
          },
        ],
      },
    ],
  },
  {
    stage: 11,
    name: 'Digital interfaces and buses',
    blurb: 'Hardware that honours a contract the firmware depends on.',
    blocks: [
      {
        block: 1,
        name: 'The microcontroller contract',
        units: [
          {
            kind: 'analyse',
            slug: 'port-current-budget',
            title: 'The whole port has a limit too',
            prompt:
              '{n} indicators are driven from one microcontroller, each at {ma} mA. The part allows ' +
              '{max} mA in total across the whole package. How much of that budget is left?',
            params: (rng) => ({ n: rng.pick([4, 6, 8]), ma: rng.pick([3, 5, 8]), max: rng.pick([100, 200]) }),
            answer: (p) => (p.max - p.n * p.ma) / 1000,
            unit: 'A',
            hint: 'Total the pins first, then take it off the package limit.',
            explain: (p) =>
              `${p.max} − ${p.n} × ${p.ma} mA. Every pin can be within its own rating while the ` +
              'package is not: the current all comes back through one ground pin, and that pin is ' +
              'usually the real limit.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'logic-level-margin',
            title: 'How much margin the levels leave',
            prompt:
              'A pin sinking {ma} mA sits at {vol} V rather than at ground. The input it drives reads ' +
              'LOW only below {vil} V. How much margin is there?',
            params: (rng) => ({
              ma: rng.pick([4, 8, 16]),
              vol: rng.pick([0.3, 0.45, 0.6]),
              vil: rng.pick([0.8, 1.0, 1.5]),
            }),
            answer: (p) => p.vil - p.vol,
            unit: 'V',
            hint: 'The difference between what the driver produces and what the receiver requires.',
            explain: (p) =>
              `${p.vil} − ${p.vol}. Noise, ground offsets and temperature all eat into this, so a ` +
              'design with a couple of hundred millivolts of margin is not comfortable, it is marginal.',
          },
          'mcu_gpio_contract',
          {
            kind: 'inspect',
            slug: 'gpio-review',
            templateId: 'mcu_gpio_contract',
            title: 'Review: a GPIO contract',
            prompt: 'The firmware reads this input as random. Find what the hardware got wrong.',
          },
        ],
      },
      {
        block: 2,
        name: 'A shared bus',
        units: [
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'i2c-sink-limit',
            title: 'The smallest pull-up the parts allow',
            prompt:
              'An I²C device can sink {ma} mA and still hold the line below its LOW threshold. On a ' +
              '{v} V bus, what is the smallest pull-up resistor it can cope with?',
            params: (rng) => ({ ma: rng.pick([3, 6, 20]), v: rng.pick([3.3, 5]) }),
            answer: (p) => p.v / (p.ma / 1000),
            unit: 'ohm',
            hint: 'When the line is held low, the whole bus voltage is across the pull-up.',
            explain: (p) =>
              `R = ${p.v} / ${p.ma} mA. Anything smaller asks the device for more current than it has, ` +
              'and the line never gets low enough to read as a zero. This is the floor; the rise time ' +
              'sets the ceiling, and the answer lives between them.',
          },
          {
            kind: 'analyse',
            slug: 'i2c-rise-time',
            title: 'How long the line takes to get back up',
            prompt:
              'The bus carries {pf} pF of capacitance and is pulled up through {r}. Taking the rise ' +
              'time as 0.85 × R × C, how long is it?',
            params: (rng) => ({ pf: rng.pick([50, 100, 400]), r: rng.pick([2200, 4700, 10000]) }),
            answer: (p) => 0.85 * p.r * (p.pf * 1e-12),
            unit: 's',
            hint: 'The 0.85 is the 30% to 70% part of an exponential; the rest is RC.',
            explain: (p) =>
              `t = 0.85 × ${formatValue(p.r, 'Ω')} × ${p.pf} pF. Standard mode allows 1000 ns and fast ` +
              'mode 300 ns, so this number is what decides whether the bus you have drawn can run at ' +
              'the speed the firmware assumes.',
          },
          {
            kind: 'analyse',
            slug: 'i2c-pullup-max',
            title: 'The largest pull-up that still makes the deadline',
            prompt:
              'The bus has {pf} pF and the rise time must stay under {us} µs, again taking it as ' +
              '0.85 × R × C. What is the largest pull-up you can use?',
            // Expressed in microseconds because the two limits that matter are
            // 0.3 µs and 1 µs, and 1000 ns is a number nobody writes.
            params: (rng) => ({ pf: rng.pick([50, 100, 200, 400]), us: rng.pick([0.3, 1]) }),
            answer: (p) => (p.us * 1e-6) / (0.85 * p.pf * 1e-12),
            unit: 'ohm',
            hint: 'Same relation, rearranged for R.',
            explain: (p) =>
              `R = ${p.us} µs / (0.85 × ${p.pf} pF). More devices and longer tracks mean more ` +
              'capacitance and therefore a smaller resistor, which is why a bus that worked with two ' +
              'parts on it stops working with six.',
          },
          'i2c_pullups',
          {
            kind: 'inspect',
            slug: 'i2c-review',
            templateId: 'i2c_pullups',
            title: 'Review: an I²C bus',
            prompt: 'No transfer on this bus ever completes. Find the item at fault.',
          },
        ],
      },
      {
        block: 3,
        name: 'Expanding the pin count',
        units: [
          {
            kind: 'analyse',
            slug: 'shift-clocks',
            title: 'Clocking a chain',
            prompt:
              '{k} eight-bit shift registers are cascaded, one feeding the next. How many clock ' +
              'pulses does it take to load the whole chain?',
            params: (rng) => ({ k: rng.pick([2, 3, 4, 8]) }),
            answer: (p) => 8 * p.k,
            unit: '',
            hint: 'Every bit has to be shifted through every stage before it.',
            explain: (p) =>
              `8 × ${p.k}. Three wires drive ${8 * p.k} outputs, and the cost is time rather than ` +
              'pins: this is the trade a shift register exists to make.',
          },
          {
            kind: 'analyse',
            slug: 'shift-refresh-time',
            title: 'How long an update takes',
            prompt:
              'You clock {bits} bits out at {khz} kHz. How long does one full update of the outputs take?',
            params: (rng) => ({ bits: rng.pick([16, 24, 64]), khz: rng.pick([100, 250, 500]) }),
            answer: (p) => p.bits / (p.khz * 1000),
            unit: 's',
            hint: 'One bit per clock, so the time is bits divided by the clock rate.',
            explain: (p) =>
              `${p.bits} / ${p.khz} kHz. Multiply that by the refresh rate you want and you find out ` +
              'whether the microcontroller has any time left over for anything else.',
          },
          'shift_register_outputs',
          {
            kind: 'inspect',
            slug: 'shift-review',
            templateId: 'shift_register_outputs',
            title: 'Review: a shift register expansion',
            prompt: 'None of the outputs ever turn on. Find the item responsible.',
          },
        ],
      },
    ],
  },
  {
    stage: 12,
    name: 'Switching power, motion and production',
    blurb: 'The parts that bite, and designing so they do not.',
    blocks: [
      {
        block: 1,
        name: 'Making a clock',
        units: [
          {
            kind: 'analyse',
            slug: '555-frequency',
            title: 'What the timing parts decide',
            prompt:
              'A 555 astable has R1 = {r1}, R2 = {r2} and a {c}F timing capacitor. Its frequency is ' +
              '1.44 / ((R1 + 2·R2)·C). What frequency does it run at?',
            params: (rng) => ({
              r1: rng.pick([1000, 10000]),
              r2: rng.pick([4700, 47000, 100000]),
              c: rng.pick([100e-9, 1e-6, 10e-6]),
            }),
            answer: (p) => 1.44 / ((p.r1 + 2 * p.r2) * p.c),
            unit: 'Hz',
            hint: 'R2 appears twice because the capacitor discharges through it alone.',
            explain: (p) =>
              `f = 1.44 / ((${formatValue(p.r1, '')} + 2 × ${formatValue(p.r2, '')}) × ` +
              `${formatValue(p.c, 'F')}). The capacitor charges through both resistors and discharges ` +
              'through only R2, which is where the asymmetry in the formula comes from.',
          },
          {
            kind: 'analyse',
            slug: '555-duty',
            title: 'Why it is never a square wave',
            prompt:
              'The same circuit, R1 = {r1} and R2 = {r2}. Its duty cycle is (R1 + R2) / (R1 + 2·R2). ' +
              'What is it?',
            params: (rng) => ({ r1: rng.pick([1000, 10000]), r2: rng.pick([4700, 47000, 100000]) }),
            answer: (p) => (p.r1 + p.r2) / (p.r1 + 2 * p.r2),
            unit: '',
            hint: 'Look at what happens to the answer as R1 gets small compared with R2.',
            explain: (p) =>
              `(${formatValue(p.r1, '')} + ${formatValue(p.r2, '')}) / ` +
              `(${formatValue(p.r1, '')} + 2 × ${formatValue(p.r2, '')}). It can approach 50% but never ` +
              'reach it, because the charge path always contains one more resistor than the discharge ' +
              'path. Getting below 50% needs a diode across R2 or a different chip.',
          },
          'astable_555',
          {
            kind: 'inspect',
            slug: '555-review',
            templateId: 'astable_555',
            title: 'Review: a 555 blinker',
            prompt: 'This oscillator sits still instead of running. Find the item at fault.',
          },
        ],
      },
      {
        block: 2,
        name: 'Driving motion',
        units: [
          {
            kind: 'analyse',
            slug: 'motor-stall-current',
            title: 'The current that decides everything',
            prompt:
              'A DC motor has {ohm} Ω of winding resistance and runs from {v} V. When the shaft is ' +
              'held still it generates no back-EMF at all. What current does it draw then?',
            params: (rng) => ({ ohm: rng.pick([1.5, 3, 8]), v: rng.pick([6, 12, 24]) }),
            answer: (p) => p.v / p.ohm,
            unit: 'A',
            hint: 'With no back-EMF, only the winding resistance is left to limit it.',
            explain: (p) =>
              `I = ${p.v} / ${p.ohm}. A running motor draws a fraction of this, which is why a design ` +
              'sized for the running current works on the bench and fails the first time something ' +
              'jams. Stall is the number the driver, the fuse and the supply all have to survive.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'flyback-energy',
            title: 'Where the winding energy goes',
            prompt:
              'A winding of {mh} mH is carrying {a} A when the drive transistor switches off. How ' +
              'much energy has to go somewhere in that instant?',
            params: (rng) => ({ mh: rng.pick([1, 5, 20]), a: rng.pick([0.5, 1, 2]) }),
            answer: (p) => 0.5 * (p.mh / 1000) * p.a ** 2,
            unit: 'J',
            hint: 'E = ½·L·I². The current cannot stop instantly; the energy has to go somewhere.',
            explain: (p) =>
              `E = ½ × ${p.mh} mH × (${p.a} A)². Without a path for it, the inductor produces whatever ` +
              'voltage it takes to keep the current flowing, which is usually the voltage that ' +
              'destroys the transistor. The flyback diode is that path.',
          },
          'mcu_motor_contract',
          {
            kind: 'inspect',
            slug: 'motor-review',
            templateId: 'mcu_motor_contract',
            title: 'Review: a motor drive',
            prompt: 'This bridge drives the motor before the firmware is ready. Find the item at fault.',
          },
        ],
      },
      {
        block: 3,
        name: 'Switching supplies',
        units: [
          {
            kind: 'analyse',
            slug: 'buck-duty',
            title: 'What fraction of the time the switch is on',
            prompt:
              'A buck converter makes {vout} V from {vin} V. Ignoring losses, what duty cycle does it run at?',
            params: (rng) => ({ vout: rng.pick([1.8, 3.3, 5]), vin: rng.pick([12, 24]) }),
            answer: (p) => p.vout / p.vin,
            unit: '',
            hint: 'A buck converter chops the input and averages it. The average is the output.',
            explain: (p) =>
              `D = ${p.vout} / ${p.vin}. Note what a linear regulator would have done with the same ` +
              'two voltages: burned the difference. A switcher spends the time instead of the power.',
          },
          {
            kind: 'analyse',
            slug: 'buck-feedback-top',
            title: 'Setting the output with two resistors',
            prompt:
              'The converter regulates its feedback pin to {vfb} V. With {rbot} on the bottom of the ' +
              'divider, what top resistor gives {vout} V out?',
            params: (rng) => ({
              vfb: rng.pick([0.6, 0.8, 1.25]),
              rbot: rng.pick([10000, 20000]),
              vout: rng.pick([1.8, 3.3, 5]),
            }),
            answer: (p) => p.rbot * (p.vout / p.vfb - 1),
            unit: 'ohm',
            hint: 'The converter moves its output until the divider brings FB to its reference.',
            explain: (p) =>
              `R_top = ${formatValue(p.rbot, 'Ω')} × (${p.vout} / ${p.vfb} − 1). These two resistors ` +
              'are the entire specification of the output voltage: a wrong value here does not make ' +
              'the converter run badly, it makes it run correctly to the wrong number.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'inductor-ripple',
            title: 'How much the inductor current swings',
            prompt:
              'A buck at {khz} kHz with a {uh} µH inductor, {vin} V in and {vout} V out. Taking ' +
              'ΔI = (Vin − Vout)·D / (L·f) with D = Vout/Vin, what is the peak-to-peak ripple current?',
            params: (rng) => ({
              khz: rng.pick([400, 800]),
              uh: rng.pick([10, 22, 47]),
              vin: rng.pick([12, 24]),
              vout: rng.pick([3.3, 5]),
            }),
            answer: (p) =>
              ((p.vin - p.vout) * (p.vout / p.vin)) / (p.uh * 1e-6 * p.khz * 1000),
            unit: 'A',
            hint: 'Bigger inductor or faster switching, less ripple. Both cost something.',
            explain: (p) =>
              `ΔI = (${p.vin} − ${p.vout}) × ${(p.vout / p.vin).toFixed(2)} / (${p.uh} µH × ` +
              `${p.khz} kHz). Designers aim for roughly 30% of the load current: less needs a bigger ` +
              'inductor for no real gain, more makes the output capacitor work far too hard.',
          },
          'buck_feedback_divider',
          {
            kind: 'inspect',
            slug: 'buck-review',
            templateId: 'buck_feedback_divider',
            title: 'Review: a buck converter',
            prompt: 'This converter produces the wrong output voltage. Find the item responsible.',
          },
        ],
      },
      {
        block: 4,
        name: 'Protecting the product',
        units: [
          {
            kind: 'analyse',
            slug: 'fuse-rating',
            title: 'Choosing a fuse',
            prompt:
              'The board draws {ma} mA in normal operation. A fuse should be rated at least {k} times ' +
              'the working current so it does not fatigue and open on its own. What rating?',
            params: (rng) => ({ ma: rng.pick([120, 250, 400]), k: rng.pick([2, 2.5, 3]) }),
            answer: (p) => (p.k * p.ma) / 1000,
            unit: 'A',
            hint: 'Round up to a value that exists after you have done the sum.',
            explain: (p) =>
              `${p.k} × ${p.ma} mA. A fuse sized exactly to the working current is a component that ` +
              'will eventually fail for no reason, in the field, and look exactly like a real fault.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'schottky-protection-loss',
            title: 'What a series diode costs',
            prompt:
              'A series Schottky protecting against reversed supplies drops {vf} V and carries {ma} mA ' +
              'continuously. How much power does it lose?',
            params: (rng) => ({ vf: rng.pick([0.3, 0.4, 0.55]), ma: rng.pick([200, 500, 900]) }),
            answer: (p) => p.vf * (p.ma / 1000),
            unit: 'W',
            hint: 'Its drop times the current, for as long as the product is switched on.',
            explain: (p) =>
              `P = ${p.vf} × ${p.ma} mA. Every second the product runs. Compare it with the next ` +
              'question before deciding a diode is the simple option.',
          },
          {
            kind: 'analyse',
            strand: 'C',
            slug: 'pfet-protection-loss',
            title: 'What a P-FET costs instead',
            prompt:
              'A P-channel MOSFET doing the same job has {mohm} mΩ of on-resistance and carries the ' +
              'same {ma} mA. How much power does it lose?',
            params: (rng) => ({ mohm: rng.pick([20, 50, 100]), ma: rng.pick([200, 500, 900]) }),
            answer: (p) => (p.mohm / 1000) * (p.ma / 1000) ** 2,
            unit: 'W',
            hint: 'I²R this time, not V·I. That difference is the whole argument.',
            explain: (p) =>
              `P = ${p.mohm} mΩ × (${p.ma} mA)². Orders of magnitude less than the diode, because a ` +
              'resistance loses less as the current falls while a diode drop stays put. The FET costs ' +
              'more and needs its gate thinking about; below a hundred milliamps the diode usually wins.',
          },
          'supply_input_protection',
          {
            kind: 'inspect',
            slug: 'protection-review',
            templateId: 'supply_input_protection',
            title: 'Review: a protected input',
            prompt: 'This input does not survive a reversed supply. Find the item at fault.',
          },
        ],
      },
      {
        block: 5,
        name: 'A whole product',
        units: [
          {
            kind: 'analyse',
            slug: 'ldr-dark-voltage',
            title: 'What the sensor reads in the dark',
            prompt:
              'A photoresistor measures {rlight} in bright light and {rdark} in the dark. It sits on ' +
              'top of a fixed {rf} resistor across a {v} V rail. What is the midpoint voltage in the dark?',
            params: (rng) => ({
              rlight: rng.pick([1000, 5000]),
              rdark: rng.pick([100000, 500000]),
              rf: rng.pick([10000, 22000]),
              v: rng.pick([3.3, 5]),
            }),
            answer: (p) => (p.v * p.rf) / (p.rdark + p.rf),
            unit: 'V',
            hint: 'In the dark the sensor is the large resistance, so it takes most of the rail.',
            explain: (p) =>
              `V = ${p.v} × ${formatValue(p.rf, '')} / ${formatValue(p.rdark + p.rf, '')}. Work out the ` +
              'bright case as well and the pair tells you the swing your comparator has to sit inside. ' +
              'A threshold outside that swing is a circuit that never changes state.',
          },
          {
            kind: 'analyse',
            strand: 'P',
            slug: 'threshold-margin',
            title: 'Is the threshold in a sensible place',
            prompt:
              'The sensor node swings between {vlow} V and {vhigh} V across the conditions you care ' +
              'about, and the reference divider sets the threshold at {vth} V. What is the smaller of ' +
              'the two margins?',
            params: (rng) => ({
              vlow: rng.pick([0.4, 0.8, 1.1]),
              vhigh: rng.pick([2.8, 3.4, 4.2]),
              vth: rng.pick([1.65, 2.5]),
            }),
            answer: (p) => Math.min(p.vth - p.vlow, p.vhigh - p.vth),
            unit: 'V',
            hint: 'Two margins, one on each side. The design is only as good as the worse one.',
            explain: (p) =>
              `The smaller of (${p.vth} − ${p.vlow}) and (${p.vhigh} − ${p.vth}). Putting the threshold ` +
              'exactly half way between the two rails is a habit, not an answer: half way between the ' +
              'two states the sensor actually reaches is what gives both of them room.',
          },
          'light_threshold_alarm',
          {
            kind: 'inspect',
            slug: 'alarm-review',
            templateId: 'light_threshold_alarm',
            title: 'Review: a light-threshold alarm',
            prompt: 'This alarm never triggers, whatever the light does. Find the item at fault.',
          },
        ],
      },
    ],
  },
];

/** Practice mode opens once this stage is complete. */
export const PRACTICE_UNLOCK_STAGE = 6;

/**
 * The flat, ordered list the cursor indexes into.
 *
 * Built once at module load. Everything downstream is an array read, which is
 * what keeps pressing Start Designing as immediate as it was when selection was
 * random.
 */
/** Which strand a kind serves when the unit does not say. */
const DEFAULT_STRAND = {
  build: 'R',
  analyse: 'A',
  inspect: 'P',
  choose: 'C',
  trace: 'A',
};

function lastBuildIndex(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (typeof e === 'string' || (e.kind || 'build') === 'build') return i;
  }
  return -1;
}

export const UNITS = STAGES.flatMap((stage) =>
  stage.blocks.flatMap((block) =>
    block.units.map((entry, i) => {
      // A bare string is the shorthand for a Build unit, which is all the
      // roadmap contains today. Everything else is written out, so Analyse,
      // Inspect, Choose and Trace units drop in beside these without the
      // structure changing.
      const spec = typeof entry === 'string' ? { kind: 'build', templateId: entry } : entry;
      const kind = spec.kind || 'build';
      return {
        ...spec,
        kind,
        // The slug wins: a review unit names the same template as the Build
        // unit it reviews, and the two must not collide.
        id: spec.id || `s${stage.stage}b${block.block}-${spec.slug || spec.templateId}`,
        stage: stage.stage,
        block: block.block,
        blockName: block.name,
        stageName: stage.name,
        strand: spec.strand || DEFAULT_STRAND[kind],
        // The last Build unit in a block is what a learner passes to skip it.
        // Only a Build unit can be a capstone: skipping has to be demonstrated
        // by drawing the circuit, not by answering a question about it.
        capstone: kind === 'build' && i === lastBuildIndex(block.units),
      };
    })
  )
);

const BY_ID = new Map(UNITS.map((u) => [u.id, u]));
const INDEX_OF = new Map(UNITS.map((u, i) => [u.id, i]));

export const UNIT_COUNT = UNITS.length;
export const STAGE_COUNT = STAGES.length;

export function unitById(id) {
  return BY_ID.get(id) || null;
}

export function indexOfUnit(id) {
  return INDEX_OF.has(id) ? INDEX_OF.get(id) : -1;
}

/**
 * The title shown for a unit.
 *
 * A Build unit takes its name from the template, so the two cannot drift apart.
 * Everything else carries its own, because there is no template to ask: an
 * Analyse unit is a question, and an Inspect unit is a review of a circuit
 * rather than the circuit itself.
 */
export function unitTitle(unit) {
  if (!unit) return '';
  if (unit.title) return unit.title;
  return getTemplate(unit.templateId)?.title || unit.templateId;
}

/** Where a unit stands relative to the cursor: done, current, or ahead. */
export function unitStatus(unit, completed = []) {
  const done = completed instanceof Set ? completed : new Set(completed);
  if (done.has(unit.id)) return 'done';
  const current = nextUnit(done);
  return current && current.id === unit.id ? 'current' : 'ahead';
}

/**
 * The next unit to work on: the first one not yet completed.
 *
 * A plain scan of an array of a few hundred entries. Ordering is the curriculum,
 * so there is nothing to weight and nothing to randomise.
 */
export function nextUnit(completed = []) {
  const done = completed instanceof Set ? completed : new Set(completed);
  return UNITS.find((u) => !done.has(u.id)) || null;
}

/** Every unit of the block a given unit belongs to. */
export function unitsInBlock(stage, block) {
  return UNITS.filter((u) => u.stage === stage && u.block === block);
}

/** The capstone of a block, which is the unit that can be passed to skip it. */
export function capstoneOf(stage, block) {
  return unitsInBlock(stage, block).find((u) => u.capstone) || null;
}

/**
 * The unit that skipping the current block would put the learner in front of.
 * Null when the current block has only one unit, since passing that unit is
 * already the whole block and there is nothing to skip.
 */
export function skipTarget(completed = []) {
  const current = nextUnit(completed);
  if (!current) return null;
  const capstone = capstoneOf(current.stage, current.block);
  if (!capstone || capstone.id === current.id) return null;
  return capstone;
}

/**
 * Placement: what it would take to start at a given expertise band.
 *
 * Picking a band used to *claim* the concepts below it, which unlocked nothing
 * once selection became a cursor into this array: a learner said they were a
 * Junior Design Engineer, the app agreed, and then handed them the first LED
 * again. A claim that changes nothing is worse than no claim, because it looks
 * like it worked.
 *
 * So placement is an examination, which is the rule this file already runs on:
 * a block ends in a capstone precisely so that skipping is demonstrated rather
 * than asserted. Placement is that rule applied at range. The exam is the last
 * capstone before the target, which is the hardest circuit being skipped over,
 * and passing it signs off everything before the target: the curriculum is
 * ordered, so demonstrating a later idea end to end is a claim on the earlier
 * ones that the learner has actually paid for.
 *
 * Returns the target, the exam, and exactly which units a pass would grant, so
 * the screen can say all three before anybody commits to anything.
 */
export function placementFor(band, completed = []) {
  const targetStage = firstStageForBand(band, STAGE_COUNT);
  const target = UNITS.find((u) => u.stage === targetStage) || UNITS[0];
  const targetIndex = indexOfUnit(target.id);

  const here = nextUnit(completed);
  const hereIndex = here ? indexOfUnit(here.id) : UNITS.length;

  // Already at or past it: there is nothing to skip and nothing to prove.
  if (targetIndex <= hereIndex) {
    return { band, targetStage, target, exam: null, grants: [], ahead: false, behind: targetIndex < hereIndex };
  }

  let exam = null;
  for (let i = targetIndex - 1; i >= 0; i--) {
    if (UNITS[i].capstone) {
      exam = UNITS[i];
      break;
    }
  }

  return {
    band,
    targetStage,
    target,
    exam,
    // Everything strictly before the target, so a pass lands the cursor exactly
    // on it rather than somewhere in the tail of the previous block.
    grants: UNITS.slice(0, targetIndex).map((u) => u.id),
    ahead: true,
    behind: false,
  };
}

/**
 * Completing a unit. Passing a capstone completes its whole block, which is what
 * makes skipping ahead an examination rather than a claim.
 */
export function completeUnit(completed, unitId) {
  const unit = unitById(unitId);
  const done = new Set(completed);
  if (!unit) return [...done];
  done.add(unit.id);
  if (unit.capstone) {
    for (const sibling of unitsInBlock(unit.stage, unit.block)) done.add(sibling.id);
  }
  return UNITS.filter((u) => done.has(u.id)).map((u) => u.id);
}

/** Where the learner stands, for the menu and the profile. */
export function roadmapProgress(completed = []) {
  const done = completed instanceof Set ? completed : new Set(completed);
  const current = nextUnit(done);
  const stageNumber = current ? current.stage : STAGE_COUNT;
  const stage = STAGES.find((s) => s.stage === stageNumber) || STAGES[STAGE_COUNT - 1];
  const stageUnits = UNITS.filter((u) => u.stage === stageNumber);
  const stageDone = stageUnits.filter((u) => done.has(u.id)).length;
  const stagesCleared = STAGES.filter((s) =>
    UNITS.filter((u) => u.stage === s.stage).every((u) => done.has(u.id))
  ).length;

  return {
    current,
    stage: stageNumber,
    stageName: stage.name,
    stageBlurb: stage.blurb,
    blockName: current ? current.blockName : 'Complete',
    stagesCleared,
    stageCount: STAGE_COUNT,
    unitsDone: done.size,
    unitCount: UNIT_COUNT,
    stageUnitsDone: stageDone,
    stageUnitCount: stageUnits.length,
    /** Fraction through the current stage, for the menu's progress bar. */
    stageProgress: stageUnits.length ? stageDone / stageUnits.length : 1,
    /** Distance travelled toward industry practice, as a percentage. */
    expertise: Math.round((done.size / UNIT_COUNT) * 100),
    practiceUnlocked: stagesCleared >= PRACTICE_UNLOCK_STAGE,
    finished: !current,
  };
}
