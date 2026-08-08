/**
 * Challenge registry and instantiation.
 *
 * A challenge INSTANCE is a (templateId, seed) pair. The template hand-authors
 * the topology and the teaching point; the seed randomises the numbers. That
 * keeps the pool effectively endless while guaranteeing every generated
 * challenge is a circuit that actually makes sense.
 *
 * Selection lives in `select.js`: it is level-driven and random, not a
 * roadmap.
 */

import { tier1 } from './templates/tier1.js';
import { tier2 } from './templates/tier2.js';
import { tier3 } from './templates/tier3.js';
import { tier4, tier5 } from './templates/analog.js';
import { tier6, tier7, tier8 } from './templates/systems.js';
import { foundations } from './templates/foundations.js';
import { systems2 } from './templates/systems2.js';
import { makeRng, randomSeed } from './rng.js';
import { theoryFor } from './concepts.js';

export const TEMPLATES = [
  ...tier1,
  ...tier2,
  ...tier3,
  ...tier4,
  ...tier5,
  ...tier6,
  ...tier7,
  ...tier8,
  ...foundations,
  ...systems2,
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

/** Legacy tier labels, still used by the browser UI for grouping. */
export const TIERS = [
  { tier: 1, name: 'Passive recipes', blurb: 'LEDs, switches, dividers and pull resistors.' },
  { tier: 2, name: 'Power basics', blurb: 'Regulation, bulk vs decoupling, simple filtering.' },
  { tier: 3, name: 'Digital logic', blurb: 'Real 74HC parts: power units, decoupling, defined input levels.' },
  { tier: 4, name: 'Op-amp circuits', blurb: 'Buffers and gain stages set by feedback ratios.' },
  { tier: 5, name: 'Sensor interfacing', blurb: 'Turning resistance and analog outputs into readable voltages.' },
  { tier: 6, name: 'Communication buses', blurb: 'I²C pull-ups, SPI wiring, control pins that must be tied.' },
  { tier: 7, name: 'Timing circuits', blurb: '555 oscillators and RC time constants.' },
  { tier: 8, name: 'Mixed-signal systems', blurb: 'Several stages combined into one working design.' },
];

export const TOPICS = {
  passives: 'Passive recipes',
  pull_resistors: 'Pull-up / pull-down',
  power_supply: 'Power supplies',
  digital_logic: 'Digital logic',
  op_amp: 'Op-amp circuits',
  sensors: 'Sensor interfacing',
  comms: 'Communication buses',
  timing: 'Timing circuits',
  mixed_signal: 'Mixed-signal systems',
  mechatronics: 'Motors & actuators',
  protection: 'Protection & safety',
  signal_chain: 'Signal chain',
  mcu: 'Microcontroller hardware',
};

/**
 * Concepts a template exercises when it does not name them itself. Explicit
 * `concepts` on a template always wins; this keeps older templates working.
 */
const TOPIC_CONCEPTS = {
  passives: ['ohms_law', 'led_drive', 'schematic_conventions'],
  pull_resistors: ['pull_resistors', 'voltage_divider', 'ground_reference'],
  power_supply: ['linear_regulation', 'decoupling', 'capacitor_basics'],
  digital_logic: ['logic_gates', 'multi_unit_ics', 'pull_resistors', 'decoupling'],
  op_amp: ['opamp_feedback', 'opamp_practical'],
  sensors: ['sensor_interface', 'adc_frontend', 'voltage_divider'],
  comms: ['i2c_bus', 'logic_levels', 'mcu_hardware_contract'],
  timing: ['oscillators', 'rc_time_constant'],
  mixed_signal: ['mixed_signal_partitioning', 'opamp_feedback', 'sensor_interface'],
  mechatronics: ['motor_drive', 'transistor_switch'],
  protection: ['input_protection', 'protection_systems'],
  signal_chain: ['rc_time_constant', 'opamp_practical'],
};

export function conceptsOf(template) {
  return template.concepts || TOPIC_CONCEPTS[template.topic] || [];
}

export function levelOf(template) {
  return template.level ?? template.tier ?? 1;
}

export function getTemplate(id) {
  return BY_ID.get(id) || null;
}

export function templatesForTier(tier) {
  return TEMPLATES.filter((t) => t.tier === tier);
}

/** Build a concrete challenge from a template id and seed. */
export function instantiate(templateId, seed = randomSeed()) {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Unknown challenge template: ${templateId}`);
  const rng = makeRng(seed);
  const params = template.params ? template.params(rng) : {};
  const built = template.build(params);
  const concepts = conceptsOf(template);

  return {
    id: `${templateId}#${seed}`,
    templateId,
    seed,
    tier: template.tier,
    level: levelOf(template),
    topic: template.topic,
    title: template.title,
    concept: template.concept,
    concepts,
    // The theory pack is always attached: formulas are never withheld.
    theory: built.theory || theoryFor(concepts),
    params,
    brief: built.brief,
    firmware: built.firmware || null,
    solutionNote: built.solutionNote,
    /**
     * The reference answer as a real schematic, or null where the template has
     * not authored one yet. A thunk: building it costs a document, and most
     * instantiations never show it.
     */
    solution: typeof built.solution === 'function' ? built.solution : null,
    requirements: built.requirements,
  };
}

/** The reference schematic for a challenge, or null. Memoised per instance. */
const solutionCache = new Map();
export function solutionDoc(challenge) {
  if (!challenge?.solution) return null;
  if (!solutionCache.has(challenge.id)) solutionCache.set(challenge.id, challenge.solution());
  return solutionCache.get(challenge.id);
}

/** Rebuild an instance from a stored id ("templateId#seed"). */
export function instantiateFromId(id) {
  const [templateId, seedText] = String(id).split('#');
  return instantiate(templateId, Number(seedText) || 0);
}

/** How many hand-authored recipes exist right now. */
export const RECIPE_COUNT = TEMPLATES.length;

export { selectChallenge, dailyChallenge, availableTemplates } from './select.js';
