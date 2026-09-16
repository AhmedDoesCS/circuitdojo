import { extractNetlist } from '../schematic/netlist.js';

/** Resolve a named net to wire IDs, never to their drawing order. */
export function traceWires(doc, netName) {
  const net = extractNetlist(doc).netByName(netName);
  if (!net) throw new Error(`Trace target net not found: ${netName}`);
  const points = new Set(net.points.map((p) => typeof p === 'string' ? p : `${p.x},${p.y}`));
  return doc.wires.filter((w) => points.has(`${w.x1},${w.y1}`) && points.has(`${w.x2},${w.y2}`)).map((w) => w.id);
}

function result(passed, empty, detail) {
  return { passed, empty, correct: passed ? [{ label: 'Reasoning verified', detail }] : [],
    errors: !passed && !empty ? [{ source: 'answer', label: 'Check the selection again', detail }] : [],
    missing: empty ? [{ label: 'Finish your selection before checking.' }] : [], warnings: [] };
}

export function gradeChoose(unit, answer) {
  if (!answer?.option || !answer?.reason) return result(false, true, '');
  const passed = answer.option === unit.correctOption && answer.reason === unit.correctReason;
  return result(passed, false, passed ? unit.explanation : unit.hint);
}

export function gradeTrace(work, answer) {
  if (!Array.isArray(answer) || !answer.length) return result(false, true, '');
  const chosen = new Set(answer);
  const passed = chosen.size === work.expected.length && work.expected.every((id) => chosen.has(id));
  return result(passed, false, passed ? work.unit.explanation : work.unit.hint);
}
