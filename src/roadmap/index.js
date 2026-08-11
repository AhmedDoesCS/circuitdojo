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
              '{c} capacitor across the rail. How far does the rail droop?',
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
            prompt: 'What is the time constant of {r} and {c} together?',
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
              'A step is applied to an RC made of {r} and {c}. How long until the output has reached ' +
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
            prompt: 'What is the corner frequency of a low-pass filter made from {r} and {c}?',
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
    blocks: [{ block: 1, name: 'Clamping a rail', units: ['zener_shunt_reference'] }],
  },
  {
    stage: 6,
    name: 'Logic gates and real chips',
    blurb: 'A gate is one unit of a package that needs feeding.',
    blocks: [
      { block: 1, name: 'A gate is part of a chip', units: ['and_two_buttons'] },
      { block: 2, name: 'Making a gate do another job', units: ['nand_as_inverter', 'active_low_inverter'] },
      { block: 3, name: 'Comparing two inputs', units: ['xor_difference_detector'] },
      { block: 4, name: 'Cleaning up a real signal', units: ['rc_debounce'] },
    ],
  },
  {
    stage: 7,
    name: 'Transistors as switches',
    blurb: 'A logic pin cannot drive a load. Something has to multiply its current.',
    blocks: [{ block: 1, name: 'Driving a real load', units: ['transistor_load_switch'] }],
  },
  {
    stage: 8,
    name: 'Powering a board',
    blurb: 'Getting a clean rail to every part that needs one.',
    blocks: [
      { block: 1, name: 'Power entry', units: ['mcu_power_entry'] },
      { block: 2, name: 'Regulating a rail', units: ['linear_regulator'] },
      { block: 3, name: 'A quiet rail for analogue parts', units: ['ldo_analog_rail'] },
    ],
  },
  {
    stage: 9,
    name: 'Operational amplifiers',
    blurb: 'Feedback sets the behaviour, not the part.',
    blocks: [
      { block: 1, name: 'Buffering a signal', units: ['voltage_follower'] },
      { block: 2, name: 'Setting a gain', units: ['noninverting_amp', 'inverting_amp'] },
      { block: 3, name: 'Deciding, with hysteresis', units: ['comparator_hysteresis'] },
    ],
  },
  {
    stage: 10,
    name: 'Sensing the physical world',
    blurb: 'Turning a physical quantity into a voltage something can read.',
    blocks: [
      { block: 1, name: 'Resistive sensors', units: ['thermistor_adc'] },
      { block: 2, name: 'Sensors that output a voltage', units: ['tmp36_buffer'] },
    ],
  },
  {
    stage: 11,
    name: 'Digital interfaces and buses',
    blurb: 'Hardware that honours a contract the firmware depends on.',
    blocks: [
      { block: 1, name: 'The microcontroller contract', units: ['mcu_gpio_contract'] },
      { block: 2, name: 'A shared bus', units: ['i2c_pullups'] },
      { block: 3, name: 'Expanding the pin count', units: ['shift_register_outputs'] },
    ],
  },
  {
    stage: 12,
    name: 'Switching power, motion and production',
    blurb: 'The parts that bite, and designing so they do not.',
    blocks: [
      { block: 1, name: 'Making a clock', units: ['astable_555'] },
      { block: 2, name: 'Driving motion', units: ['mcu_motor_contract'] },
      { block: 3, name: 'Switching supplies', units: ['buck_feedback_divider'] },
      { block: 4, name: 'Protecting the product', units: ['supply_input_protection'] },
      { block: 5, name: 'A whole product', units: ['light_threshold_alarm'] },
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

/** The title shown for a unit, taken from the template so it cannot drift. */
export function unitTitle(unit) {
  return getTemplate(unit.templateId)?.title || unit.templateId;
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
