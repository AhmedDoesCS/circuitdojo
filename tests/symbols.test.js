/**
 * Symbol library audit.
 *
 * These tests are the guarantee that the parts and the challenges agree: every
 * symbol is geometrically legal, and every symbol id, tag and pin name a
 * challenge check refers to actually exists on the part it names. A typo in a
 * pin name would otherwise surface as an unsolvable challenge.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SYMBOLS, getSymbol, symbolMatches } from '../src/schematic/symbols/index.js';
import { GRID } from '../src/schematic/geometry.js';
import { TEMPLATES, instantiate, conceptsOf, levelOf } from '../src/challenges/index.js';
import { CONCEPTS, getConcept } from '../src/challenges/concepts.js';

const PIN_TYPES = new Set([
  'passive',
  'input',
  'output',
  'bidirectional',
  'power_in',
  'power_out',
  'open_collector',
  'tri_state',
  'unspecified',
  'no_connect',
]);

test('every symbol is well formed and on-grid', () => {
  const ids = new Set();
  for (const symbol of SYMBOLS) {
    assert.ok(symbol.id, 'symbol has an id');
    assert.ok(!ids.has(symbol.id), `duplicate symbol id: ${symbol.id}`);
    ids.add(symbol.id);
    assert.ok(symbol.refPrefix, `${symbol.id} has a reference prefix`);
    assert.ok(symbol.units?.length, `${symbol.id} has at least one unit`);

    for (const unit of symbol.units) {
      const nums = new Set();
      for (const pin of unit.pins) {
        assert.ok(!nums.has(pin.num), `${symbol.id}.${unit.id}: duplicate pin ${pin.num}`);
        nums.add(pin.num);
        // Note: (-30 % 10) is -0 in JavaScript, so compare the magnitude.
        assert.ok(
          Math.abs(pin.x % GRID) === 0,
          `${symbol.id}.${unit.id} pin ${pin.num}: x=${pin.x} is off-grid (must be a multiple of ${GRID})`
        );
        assert.ok(
          Math.abs(pin.y % GRID) === 0,
          `${symbol.id}.${unit.id} pin ${pin.num}: y=${pin.y} is off-grid`
        );
        assert.ok(
          PIN_TYPES.has(pin.type),
          `${symbol.id}.${unit.id} pin ${pin.num}: unknown electrical type "${pin.type}"`
        );
        assert.ok(['L', 'R', 'U', 'D'].includes(pin.orient), `${symbol.id} pin ${pin.num}: bad orientation`);
      }
    }
  }
});

test('multi-unit parts declare a power unit', () => {
  for (const symbol of SYMBOLS.filter((s) => s.multiUnit)) {
    const powerUnits = symbol.units.filter((u) => u.isPowerUnit);
    assert.equal(powerUnits.length, 1, `${symbol.id} should have exactly one power unit`);
    const pins = powerUnits[0].pins;
    assert.ok(
      pins.every((p) => p.type === 'power_in'),
      `${symbol.id} power unit pins must be power_in`
    );
  }
});

/** Walk every selector in a challenge's checks and collect {type, pin} pairs. */
function collectSelectors(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectSelectors(item, out);
    return out;
  }
  if (node.type && typeof node.type === 'string' && !['and', 'or'].includes(node.kind)) {
    out.push({ type: node.type, pin: node.pin });
  }
  if (node.ic) out.push({ type: node.ic });
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') collectSelectors(value, out);
  }
  return out;
}

test('every symbol type and pin referenced by a challenge exists', () => {
  const problems = [];

  for (const template of TEMPLATES) {
    const challenge = instantiate(template.id, 7);
    const requirements = challenge.requirements || {};
    const selectors = [
      ...collectSelectors(requirements.checks || []),
      ...collectSelectors(requirements.requiredComponents || []),
    ];

    for (const sel of selectors) {
      // A selector type is either a symbol id or a tag shared by some symbol.
      const matching = SYMBOLS.filter((s) => symbolMatches(s, sel.type));
      if (!matching.length) {
        problems.push(`${template.id}: no symbol matches type "${sel.type}"`);
        continue;
      }
      if (!sel.pin) continue;

      // The pin must exist on at least one matching symbol, by number or name.
      const pinExists = matching.some((s) =>
        s.units.some((u) => u.pins.some((p) => p.num === String(sel.pin) || p.name === sel.pin))
      );
      if (!pinExists) {
        problems.push(
          `${template.id}: type "${sel.type}" has no pin "${sel.pin}" ` +
            `(available: ${matching[0].units.flatMap((u) => u.pins.map((p) => p.name)).join(', ')})`
        );
      }
    }
  }

  assert.deepEqual(problems, [], `challenge/symbol mismatches:\n${problems.join('\n')}`);
});

test('every challenge declares concepts that exist, at a sensible level', () => {
  for (const template of TEMPLATES) {
    const concepts = conceptsOf(template);
    assert.ok(concepts.length > 0, `${template.id} declares no concepts`);
    const level = levelOf(template);
    for (const id of concepts) {
      const concept = getConcept(id);
      assert.ok(concept, `${template.id} references unknown concept "${id}"`);
      assert.ok(
        concept.level <= level + 1,
        `${template.id} (level ${level}) uses concept ${id} from level ${concept.level}`
      );
    }
  }
});

test('every concept prerequisite exists and is easier than the concept itself', () => {
  for (const concept of CONCEPTS) {
    for (const prereq of concept.prereq || []) {
      const target = getConcept(prereq);
      assert.ok(target, `${concept.id} requires unknown concept "${prereq}"`);
      assert.ok(
        target.level <= concept.level,
        `${concept.id} (level ${concept.level}) requires ${prereq} from a higher level ${target.level}`
      );
    }
    assert.ok(concept.formulas, `${concept.id} must define a formulas array (may be empty)`);
    assert.ok(concept.refs?.length || concept.formulas.length === 0, `${concept.id} should cite further reading`);
  }
});

test('power symbols each declare one power_out pin', () => {
  for (const symbol of SYMBOLS.filter((s) => s.isPower)) {
    assert.ok(symbol.power?.netName, `${symbol.id} needs a net name`);
    const pins = symbol.units.flatMap((u) => u.pins);
    assert.equal(pins.length, 1, `${symbol.id} should have exactly one pin`);
    assert.equal(pins[0].type, 'power_out', `${symbol.id} pin must be power_out`);
  }
});
