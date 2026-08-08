/**
 * Progressive hints.
 *
 * Hints only ever appear AFTER a check, never during the attempt, which is
 * the whole point of the exercise. They escalate in three steps so the learner
 * chooses how much help they take:
 *
 *   1. Nudge     where to look, in the learner's own circuit
 *   2. Principle the rule and the maths that decide the answer
 *   3. Fix       the concrete change to make
 *
 * Everything is derived from the failed check plus the concepts the challenge
 * exercises, so a new challenge gets hints for free.
 */

import { getConcept } from '../challenges/concepts.js';
import { solutionDoc } from '../challenges/index.js';
import { compareToSolution } from './solution-diff.js';

/** Hint bodies per requirement-check kind. */
const BY_KIND = {
  series: {
    nudge: 'Trace the current path with your finger. Do these two parts actually sit on the same wire, one after the other?',
    principle:
      'In series means they share one node and nothing else joins it. If a third connection lands on that node, current has an alternative route and the parts are no longer in series.',
    fix: 'Delete the wire that branches away from the node between them, or move the extra connection to the far end of one part.',
  },
  each_series: {
    nudge: 'Check each branch separately: does every one of them have its own partner?',
    principle:
      'Sharing one resistor between two branches couples them: the current splits and each branch depends on whether the other is fitted.',
    fix: 'Give each branch a dedicated series part, so removing one branch changes nothing in the other.',
  },
  connected: {
    nudge: 'Open the Netlist tab in the results and look at which net each of these two pins ended up on.',
    principle: 'Two things are connected only if they end up on the same net: touching visually is not enough without a wire or a junction.',
    fix: 'Draw a wire from one pin to the other; if the wire crosses another, add a junction dot only where you want them joined.',
  },
  not_connected: {
    nudge: 'Two things that should be independent have ended up on the same node.',
    principle: 'Every wire that joins two nodes merges them into one net. Once merged, they can never hold different voltages.',
    fix: 'Delete the wire (or the junction dot) that joins them and re-route so each keeps its own node.',
  },
  common_node: {
    nudge: 'The parts that must meet are landing on different nets. Which one is on the wrong side?',
    principle:
      'A shared node means every one of those pins connects to the same point. Wiring them as a chain instead puts a component between them, and they no longer share a voltage.',
    fix: 'Bring all of the listed pins to one point on the sheet and wire them together there.',
  },
  value_range: {
    nudge: 'The topology is fine: this is about the number in the Value field.',
    principle: 'Work the formula from the quantities the brief gives you, then pick the nearest standard value.',
    fix: 'Select the component, type the calculated value into the Value field (forms like 220, 4k7, 100n all work).',
  },
  value_ratio: {
    nudge: 'Gain is set by the ratio of two resistors, not by their absolute size.',
    principle: 'Rearrange the gain equation for the unknown resistor, keeping the one the brief fixed for you.',
    fix: 'Change one resistor value so the ratio matches, and leave the other at the value the brief specified.',
  },
  pull_resistor: {
    nudge: 'Look at where each leg of the pull resistor lands.',
    principle:
      'A pull resistor bridges the node and a rail: one leg on each. If both legs are in the signal path it is a series resistor and it defines nothing.',
    fix: 'Move one leg onto the rail (supply or ground as the brief asks) and the other onto the node being pulled.',
  },
  decoupling: {
    nudge: 'Look at the chip\'s own supply pins, not the rail somewhere else on the sheet.',
    principle:
      'Decoupling works because the capacitor is local: it supplies the current spike before the supply wiring can respond. 100nF directly across VCC and GND of that package.',
    fix: 'Add a 100nF capacitor with one leg on the chip\'s VCC pin net and the other on its GND pin net.',
  },
  path: {
    nudge: 'Follow the loop end to end: where does it stop?',
    principle: 'Current only flows in a complete circuit. Every element in the path has to be wired at both ends.',
    fix: 'Find the pin with no wire on it and connect it, minding component orientation where polarity matters.',
  },
  component_count: {
    nudge: 'Count what you have placed against what the brief asks for.',
    principle: 'The specification is part of the design: extra parts change behaviour, missing parts leave a requirement unmet.',
    fix: 'Place the missing part from the palette, or delete the extra one.',
  },
  ic_powered: {
    nudge: 'The gate symbols are only part of the chip. Where are its supply pins?',
    principle:
      'A multi-unit IC has a separate power unit. The silicon is fed through those pins and nothing else, so an unplaced power unit means an unpowered chip.',
    fix: 'Place the part\'s power unit from the palette and wire VCC to the rail and GND to ground.',
  },
  net_pin_count: {
    nudge: 'This node has more (or fewer) connections than the design calls for.',
    principle: 'Every extra pin on a node changes the loading and can break the assumption the stage depends on.',
    fix: 'Move the connections that do not belong onto their own node.',
  },
  any_of: {
    nudge: 'There is more than one valid arrangement here, and none of them is present yet.',
    principle: 'The check accepts any correct topology: what matters is that the element ends up in the right current path.',
    fix: 'Re-read the requirement and place the part in the loop it describes.',
  },
};

/** Hint bodies per ERC code: these are electrical faults, not spec misses. */
const BY_ERC = {
  floating_pin: {
    nudge: 'One or more pins have nothing attached. The canvas marks them with a ring.',
    principle: 'An open terminal carries no current, and an open input has no defined level at all.',
    fix: 'Wire the marked pin, or place a no-connect marker (Q) if leaving it open is deliberate.',
  },
  floating_input: {
    nudge: 'An input is sitting on a net that nothing drives.',
    principle:
      'CMOS inputs draw almost no current, so an undriven input drifts with nearby signals and can oscillate, which also heats the chip.',
    fix: 'Give the node a defined level: a pull-up or pull-down resistor to a rail, or a driver output.',
  },
  rail_short: {
    nudge: 'There is a path from a supply straight to ground with nothing to limit current.',
    principle: 'Without series impedance the current is limited only by wiring resistance: that is a dead short.',
    fix: 'Put the load (and its resistor) in that path, or move the switch so it interrupts the load current instead of bridging the rails.',
  },
  no_current_limit: {
    nudge: 'A diode or LED is bridging the rails on its own.',
    principle: 'A diode\'s current rises exponentially with voltage: it cannot limit itself. R = (V_supply − V_f) / I_target.',
    fix: 'Add a series resistor in the same branch and set its value from the formula.',
  },
  power_short: {
    nudge: 'Two different power symbols have ended up on the same node.',
    principle: 'Two rails tied together fight each other; the supply with the lower impedance wins and something overheats.',
    fix: 'Delete the wire joining them and give each rail its own node.',
  },
  unpowered_power_pin: {
    nudge: 'A supply pin is wired, but not to anything that actually supplies it.',
    principle: 'A net only counts as a rail when a power symbol or a source output sits on it.',
    fix: 'Place the correct power symbol and wire it to that net.',
  },
  missing_power_unit: {
    nudge: 'The chip you placed is only one unit of a larger package.',
    principle: 'Gate units and the power unit share one reference designator because they are one physical chip.',
    fix: 'Place the power unit for that reference and wire its VCC and GND pins.',
  },
  output_conflict: {
    nudge: 'Two outputs are driving the same net.',
    principle: 'If one drives high while the other drives low, both conduct hard and the current is limited only by their output stages.',
    fix: 'Separate them, or use open-drain outputs with a single pull-up if a wired-OR is what you meant.',
  },
  power_pin_swapped: {
    nudge: 'A supply pin and a ground pin look swapped.',
    principle: 'Reverse-powering an IC conducts through its internal ESD diodes and usually destroys it.',
    fix: 'Swap the two connections so VCC goes to the positive rail and GND to ground.',
  },
  reversed_polarized_cap: {
    nudge: 'A polarised capacitor is in backwards.',
    principle: 'Electrolytics only tolerate voltage in one direction; reverse-biased they heat, gas and vent.',
    fix: 'Rotate it 180° so the + terminal sits on the more positive node.',
  },
  dangling_label: {
    nudge: 'The label is on the sheet, but look closely at where its marker sits: it is beside the wire, not on it.',
    principle:
      'A net label names whatever it is touching. Touching nothing, it names nothing, and every requirement that refers to that net fails even though the circuit around it may be perfect.',
    fix: 'Drag the label until its marker sits on the wire: it turns from an open square back into a dot when it attaches.',
  },
  no_ground: {
    nudge: 'There is no ground symbol anywhere on the sheet.',
    principle: 'Voltage is a difference. With no reference node there are no defined levels and no return path.',
    fix: 'Place a GND symbol and wire the return side of your circuit to it.',
  },
};

const GENERIC = {
  nudge: 'Compare your sheet against the requirement list one line at a time.',
  principle: 'Each requirement describes a property of the finished circuit, not a step to follow.',
  fix: 'Adjust the wiring or values so the stated property holds, then check again.',
};

/**
 * Build the hint stack for a failed result.
 *
 * `doc` is the learner's own sheet. When the challenge ships a reference
 * answer, the last hint is generated by comparing the two, which is the
 * difference between "two things that should be connected are not" and "the LED
 * anode and the resistor are not on the same node on your sheet". The generic
 * hints still come first, because being told exactly what to change is the
 * deepest help there is and it should be the last thing offered, not the first.
 *
 * @returns {Array<{id, title, steps: [{level, text}], concept?}>}
 */
export function generateHints(result, challenge, doc = null) {
  if (!result || result.passed) return [];

  const hints = [];
  const seen = new Set();

  const push = (key, title, body, conceptId) => {
    if (seen.has(key) || hints.length >= 5) return;
    seen.add(key);
    const concept = conceptId ? getConcept(conceptId) : null;
    hints.push({
      id: key,
      title,
      concept: concept ? { id: concept.id, name: concept.name, formulas: concept.formulas } : null,
      steps: [
        { level: 1, label: 'Where to look', text: body.nudge },
        {
          level: 2,
          label: 'The principle',
          text: concept && concept.formulas?.length
            ? `${body.principle}  ${concept.formulas[0].expr}`
            : body.principle,
        },
        { level: 3, label: 'The fix', text: body.fix },
      ],
    });
  };

  // Electrical faults first, they block everything else.
  for (const error of result.errors) {
    if (error.source === 'erc') {
      const body = BY_ERC[error.code] || GENERIC;
      push(`erc:${error.code}`, error.label, body, conceptForErc(error.code, challenge));
    }
  }

  // Then unmet requirements, wrong before missing.
  for (const entry of [...result.errors.filter((e) => e.source === 'requirement'), ...result.missing]) {
    const kind = kindOf(entry, challenge);
    const body = BY_KIND[kind] || GENERIC;
    push(`req:${entry.code}`, entry.label, body, conceptForCheck(kind, challenge));
  }

  const grounded = referenceHint(doc, challenge);
  if (grounded) hints.push(grounded);

  return hints;
}

/**
 * The one hint that knows the answer.
 *
 * Everything above describes a rule; this describes *this sheet*. It names the
 * parts that are missing or surplus and the nodes the reference joins that the
 * learner has not: in their own components, not in the abstract.
 */
function referenceHint(doc, challenge) {
  if (!doc || !challenge) return null;
  const reference = solutionDoc(challenge);
  if (!reference) return null;

  const diff = compareToSolution(doc, reference);
  const partGaps = diff.parts.filter((p) => !p.ok);
  if (!partGaps.length && !diff.missingNodes.length) return null;

  const nudge = partGaps.length
    ? `Start with the part count: the reference uses ${partGaps
        .map((p) => `${p.reference} × ${p.label}`)
        .join(', ')}, and your sheet has ${partGaps.map((p) => `${p.yours}`).join(', ')}.`
    : `Look at where ${diff.missingNodes[0].members.split(': ')[0]} ends up on your sheet. It is not on the node the reference puts it on.`;

  const fix = diff.missingNodes.length
    ? `These belong on one node each, and are not joined on your sheet:\n${diff.missingNodes
        .map((n) => `· ${n.members}`)
        .join('\n')}`
    : `Adjust the part count to match, then re-check: the wiring already agrees with the reference.`;

  return {
    id: 'reference',
    title: 'Measured against the reference circuit',
    concept: null,
    steps: [
      { level: 1, label: 'Where to look', text: nudge },
      {
        level: 2,
        label: 'The principle',
        text: challenge.solutionNote || 'The reference is one correct arrangement, not the only one.',
      },
      { level: 3, label: 'The fix', text: fix },
    ],
  };
}

/** Recover the check kind for a failed entry by looking it up in the challenge. */
function kindOf(entry, challenge) {
  const checks = challenge?.requirements?.checks || [];
  const match = checks.find((c, i) => (c.id || `check_${i}`) === entry.code);
  if (match) return match.kind;
  if (String(entry.code).startsWith('req_component')) return 'component_count';
  return 'generic';
}

const ERC_CONCEPTS = {
  floating_input: 'pull_resistors',
  rail_short: 'ground_reference',
  no_current_limit: 'led_drive',
  power_short: 'ground_reference',
  missing_power_unit: 'multi_unit_ics',
  unpowered_power_pin: 'multi_unit_ics',
  output_conflict: 'logic_gates',
  reversed_polarized_cap: 'capacitor_basics',
  power_pin_swapped: 'schematic_conventions',
  no_ground: 'ground_reference',
  dangling_label: 'schematic_conventions',
  floating_pin: 'schematic_conventions',
};

function conceptForErc(code, challenge) {
  const preferred = ERC_CONCEPTS[code];
  if (preferred && (challenge?.concepts || []).includes(preferred)) return preferred;
  return preferred || (challenge?.concepts || [])[0];
}

const CHECK_CONCEPTS = {
  value_range: 'ohms_law',
  value_ratio: 'opamp_feedback',
  pull_resistor: 'pull_resistors',
  decoupling: 'decoupling',
  ic_powered: 'multi_unit_ics',
  series: 'series_parallel',
  each_series: 'series_parallel',
  common_node: 'schematic_conventions',
};

function conceptForCheck(kind, challenge) {
  const preferred = CHECK_CONCEPTS[kind];
  if (preferred && (challenge?.concepts || []).includes(preferred)) return preferred;
  return preferred || (challenge?.concepts || [])[0];
}
