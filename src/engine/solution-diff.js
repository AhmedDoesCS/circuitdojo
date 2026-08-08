/**
 * Compare a learner's sheet against the reference answer.
 *
 * Two schematics of the same circuit almost never match item for item: the
 * reference designators differ, the parts sit in different places, the wires
 * take different corners. None of that is the circuit. So the comparison is
 * made on the only things that *are* the circuit, which kinds of part are
 * present, and which pins end up sharing a node.
 *
 * A pin's identity here is `symbolId.pinName` ("R.1", "D_LED.A"), which is
 * stable across both sheets. A node matches when the learner has some net
 * carrying everything the reference's node carries; extra company on the net is
 * reported as a match rather than a miss, because the requirement checks are
 * the authority on whether that extra connection is a fault. This is guidance,
 * not a second grader.
 */

import { extractNetlist } from '../schematic/netlist.js';
import { getSymbol } from '../schematic/symbols/index.js';

/** Stable, sheet-independent name for a pin. */
function pinSignature(pin) {
  const name = pin.name && pin.name !== '~' ? pin.name : pin.num;
  return `${pin.symbolId}.${name}`;
}

/** How a signature reads to a human: "LED anode", "R pin 1". */
function humanSignature(signature) {
  const [symbolId, part] = signature.split('.');
  const symbol = getSymbol(symbolId);
  const label = symbol ? symbol.name : symbolId;
  if (symbol?.isPower) return label;
  return `${label} ${/^\d+$/.test(part) ? `pin ${part}` : part}`;
}

function countBySymbol(netlist) {
  const counts = new Map();
  for (const c of netlist.components) {
    if (c.isPower) continue;
    counts.set(c.symbolId, (counts.get(c.symbolId) || 0) + 1);
  }
  return counts;
}

/** Nets worth talking about: the ones joining two or more pins. */
function meaningfulNets(netlist) {
  return netlist.nets
    .filter((n) => n.pins.length >= 2)
    .map((net) => ({
      name: net.name,
      isPower: net.isPower,
      signatures: net.pins.map(pinSignature).sort(),
    }));
}

/**
 * @returns {{parts: Array, nodes: Array, missingNodes: Array, extraParts: Array}}
 */
export function compareToSolution(doc, reference) {
  const mine = extractNetlist(doc);
  const theirs = extractNetlist(reference);

  // --- parts ---------------------------------------------------------------
  const myCounts = countBySymbol(mine);
  const refCounts = countBySymbol(theirs);
  const parts = [];
  for (const [symbolId, wanted] of refCounts) {
    const have = myCounts.get(symbolId) || 0;
    const symbol = getSymbol(symbolId);
    parts.push({
      type: symbolId,
      label: symbol ? symbol.name : symbolId,
      yours: have,
      reference: wanted,
      ok: have === wanted,
    });
  }
  const extraParts = [];
  for (const [symbolId, have] of myCounts) {
    if (refCounts.has(symbolId)) continue;
    const symbol = getSymbol(symbolId);
    extraParts.push({ type: symbolId, label: symbol ? symbol.name : symbolId, yours: have });
  }

  // --- nodes ---------------------------------------------------------------
  const myNets = meaningfulNets(mine);
  const nodes = [];
  const missingNodes = [];

  for (const wanted of meaningfulNets(theirs)) {
    // A learner net matches when it carries everything this node carries.
    const ok = myNets.some((net) => covers(net.signatures, wanted.signatures));
    const entry = {
      name: wanted.isPower ? wanted.name : describe(wanted.signatures),
      members: wanted.signatures.map(humanSignature).join(': '),
      signatures: wanted.signatures,
      ok,
    };
    nodes.push(entry);
    if (!ok) missingNodes.push(entry);
  }

  return { parts, nodes, missingNodes, extraParts };
}

/** Does `have` contain at least as many of every signature in `want`? */
function covers(have, want) {
  const pool = new Map();
  for (const s of have) pool.set(s, (pool.get(s) || 0) + 1);
  for (const s of want) {
    const left = pool.get(s) || 0;
    if (left === 0) return false;
    pool.set(s, left - 1);
  }
  return true;
}

/** A short name for an unnamed node, from the parts that meet on it. */
function describe(signatures) {
  const unique = [...new Set(signatures.map((s) => s.split('.')[0]))];
  const symbols = unique.map((id) => getSymbol(id)?.name || id);
  return symbols.join(' · ');
}

/**
 * Turn the diff into sentences a hint can use.
 *
 * These are deliberately about the learner's own sheet: "the LED anode and the
 * resistor are not on the same node", rather than about the abstract rule.
 * A missing node is the single most useful thing to say, so those come first.
 */
export function solutionGuidance(doc, reference, limit = 4) {
  if (!reference) return [];
  const diff = compareToSolution(doc, reference);
  const lines = [];

  for (const part of diff.parts) {
    if (part.ok) continue;
    lines.push(
      part.yours < part.reference
        ? `The reference uses ${part.reference} × ${part.label}; your sheet has ${part.yours}.`
        : `The reference uses only ${part.reference} × ${part.label}; your sheet has ${part.yours}.`
    );
  }

  for (const node of diff.missingNodes) {
    lines.push(`These are one node in the reference and are not joined on your sheet: ${node.members}.`);
  }

  return lines.slice(0, limit);
}
