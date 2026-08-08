/**
 * The "Run Check" entry point: schematic document + challenge -> graded result.
 *
 * Two independent passes, exactly as specified:
 *   1. ERC: is this a valid circuit at all?
 *   2. Requirements: is it the circuit the brief asked for?
 *
 * Both always run. A schematic can be electrically clean and still fail the
 * brief (missing decoupling cap), and it can satisfy the brief while being
 * electrically broken (shorted rails): the student needs to see both.
 */

import { extractNetlist } from '../schematic/netlist.js';
import { runERC } from './erc.js';
import { runCheck } from './checks.js';
import { buildComponentGraph } from './graph.js';
import { isEmptyDocument } from '../schematic/model.js';

/**
 * @param {object} doc        schematic document
 * @param {object} challenge  { requirements: {requiredComponents, checks, ercOptions}, ... }
 * @returns {object} structured result: also stored verbatim in attempts.feedback
 */
export function evaluateAttempt(doc, challenge) {
  const netlist = extractNetlist(doc);
  const adjacency = buildComponentGraph(netlist);
  const ctx = { doc, netlist, adjacency, challenge };
  const requirements = challenge?.requirements || {};

  if (isEmptyDocument(doc)) {
    return {
      passed: false,
      empty: true,
      correct: [],
      errors: [],
      missing: [
        {
          label: 'Nothing has been drawn yet',
          detail: 'Place components from the palette, wire them together, then run the check again.',
        },
      ],
      warnings: [],
      stats: statsOf(netlist),
      netlist: summarizeNetlist(netlist),
    };
  }

  // --- Pass 1: ERC ---------------------------------------------------------
  const ercIssues = runERC(doc, netlist, requirements.ercOptions || {});
  const errors = ercIssues
    .filter((i) => i.severity === 'error')
    .map((i) => ({ source: 'erc', code: i.code, label: i.message, refs: i.refs, points: i.points }));
  const warnings = ercIssues
    .filter((i) => i.severity === 'warning')
    .map((i) => ({ source: 'erc', code: i.code, label: i.message, refs: i.refs, points: i.points }));

  // --- Pass 2: requirements ------------------------------------------------
  const checks = normalizeChecks(requirements);
  const correct = [];
  const missing = [];

  for (const check of checks) {
    const result = runCheck(ctx, check);
    const label = check.label || defaultLabel(check);
    if (result.passed) {
      correct.push({ label, detail: result.detail || '', code: check.id });
      continue;
    }
    const located = locate(netlist, check);
    const entry = {
      source: 'requirement',
      code: check.id || check.kind,
      label,
      detail: check.fail || '',
      why: result.detail || '',
      refs: located.refs,
      points: located.points,
      // What to place, when the failure is "there is nothing here to mark".
      want: wantedPart(netlist, check),
    };
    if (result.classify === 'missing') missing.push(entry);
    else errors.push(entry);
  }

  // Give credit for a clean ERC: students should see that it was checked.
  if (!ercIssues.some((i) => i.severity === 'error')) {
    correct.unshift({
      label: 'Electrical rules check passed',
      detail: 'No floating pins, shorted rails, unpowered ICs or conflicting outputs.',
      code: 'erc',
    });
  }

  const passed = errors.length === 0 && missing.length === 0;

  return {
    passed,
    empty: false,
    correct,
    errors,
    missing,
    warnings,
    stats: statsOf(netlist),
    netlist: summarizeNetlist(netlist),
  };
}

/**
 * Where on the sheet a failed requirement lives.
 *
 * ERC failures already carry coordinates because they are *about* a pin. A
 * requirement failure is about a relationship, so nothing hands it a position,
 * which is why an unmet requirement used to produce a paragraph of text and no
 * mark anywhere on the drawing. The learner then has to translate "the resistor
 * is not in series with the LED" back into "which resistor".
 *
 * The check's own selectors say which parts it is talking about, so they are
 * resolved against the netlist and every pin involved is marked. Crude by
 * design: pointing at all three resistors is far more use than pointing at
 * none, and the check text names which relationship is wrong.
 */
function locate(netlist, check) {
  const refs = new Set();
  const points = [];

  const visit = (selector) => {
    if (!selector || typeof selector !== 'object') return;
    if (selector.type) {
      for (const component of netlist.find(selector.type)) {
        refs.add(component.ref);
        for (const pin of component.pins) points.push({ x: pin.x, y: pin.y });
      }
    }
    if (selector.rail || selector.net) {
      const name = selector.rail === 'ground' ? null : selector.rail || selector.net;
      const nets = name
        ? [netlist.netByName(name)].filter(Boolean)
        : netlist.groundNets();
      for (const net of nets) for (const pin of net.pins) points.push({ x: pin.x, y: pin.y });
    }
  };

  visit(check.a);
  visit(check.b);
  visit(check.node);
  if (check.type) visit({ type: check.type });
  if (check.ic) visit({ type: check.ic });
  for (const member of check.members || []) visit(member);
  for (const nested of check.checks || []) {
    visit(nested.a);
    visit(nested.b);
  }

  // Enough to find the area, not so many that the sheet turns into a rash.
  return { refs: [...refs], points: dedupe(points).slice(0, 10) };
}

function dedupe(points) {
  const seen = new Set();
  const out = [];
  for (const p of points) {
    const k = `${Math.round(p.x)},${Math.round(p.y)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/**
 * A part that is required and is not on the sheet.
 *
 * This is the one failure with nowhere to point: the mark belongs where the
 * component *isn't*. Naming it here lets the UI offer the part itself rather
 * than a sentence about it.
 */
function wantedPart(netlist, check) {
  if (check.kind !== 'component_count' || !check.type) return null;
  const have = netlist.find(check.type).length;
  const min = check.min ?? 1;
  if (have >= min) return null;
  return { type: check.type, have, need: min };
}

/** requiredComponents is sugar for a list of component_count checks. */
function normalizeChecks(requirements) {
  const fromComponents = (requirements.requiredComponents || []).map((rc, i) => ({
    id: `req_component_${i}`,
    kind: 'component_count',
    type: rc.type,
    min: rc.min ?? 1,
    max: rc.max,
    label: rc.label || `Uses ${rc.min > 1 ? `${rc.min} ` : ''}${rc.type}`,
    fail: rc.fail,
  }));
  const explicit = (requirements.checks || []).map((c, i) => ({ id: c.id || `check_${i}`, ...c }));
  return [...fromComponents, ...explicit];
}

function defaultLabel(check) {
  switch (check.kind) {
    case 'series':
      return `${check.a.type} in series with ${check.b.type}`;
    case 'connected':
      return `${check.a.type || check.a.rail} connected to ${check.b.type || check.b.rail}`;
    case 'common_node':
      return 'Required parts meet at a shared node';
    case 'value_range':
      return `${check.type} value within the required range`;
    case 'pull_resistor':
      return `Pull ${check.rail === 'ground' ? 'down' : 'up'} resistor present`;
    case 'decoupling':
      return `${check.ic} decoupled`;
    default:
      return check.kind;
  }
}

function statsOf(netlist) {
  return {
    components: netlist.signalComponents().length,
    nets: netlist.nets.filter((n) => n.pins.length > 0).length,
    pins: netlist.pins.length,
  };
}

/** Compact netlist view, handy for the "Netlist" debug/inspection tab. */
export function summarizeNetlist(netlist) {
  return netlist.nets
    .filter((n) => n.pins.length > 0)
    .map((n) => ({
      name: n.name,
      isPower: n.isPower,
      kind: n.powerKind,
      pins: n.pins.map((p) => `${p.ref}.${p.num}${p.name && p.name !== '~' ? `(${p.name})` : ''}`),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
