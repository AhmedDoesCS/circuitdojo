/**
 * The schematic document model.
 *
 * A document is a flat, JSON-serialisable bag of items, which is exactly what
 * gets stored in `attempts.schematic_state` and replayed later:
 *
 *   components: placed symbol units. Multi-unit parts appear as several
 *               components sharing one `ref` with different `unitId`.
 *   wires:      straight segments between two grid points.
 *   junctions:  explicit connection dots. Their presence (or absence) is what
 *               decides whether crossing/touching wires are the same net.
 *   labels:     net labels: merge nets by name, but do NOT power anything.
 *   noConnects: X markers that tell the ERC "this pin is intentionally open".
 */

import { getSymbol, getUnit } from './symbols/index.js';
import { transformPoint, transformOrient, orientVector } from './geometry.js';

export const DOC_VERSION = 1;

let idCounter = 0;
export function uid(prefix = 'i') {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function createDocument() {
  return {
    version: DOC_VERSION,
    components: [],
    wires: [],
    junctions: [],
    labels: [],
    noConnects: [],
  };
}

export function cloneDocument(doc) {
  return JSON.parse(JSON.stringify(doc));
}

export function isEmptyDocument(doc) {
  return (
    !doc ||
    (doc.components.length === 0 &&
      doc.wires.length === 0 &&
      doc.labels.length === 0 &&
      doc.junctions.length === 0)
  );
}

/**
 * Pick the reference designator + unit for a newly placed symbol unit.
 *
 * Multi-unit behaviour (KiCad-accurate): placing gate B of a 74HC08 when U1
 * already exists and has a free B slot assigns it to U1 rather than creating
 * U2, because it is physically the same chip.
 */
export function assignRef(doc, symbolId, unitId) {
  const symbol = getSymbol(symbolId);
  if (!symbol) return { ref: '?', unitId };

  if (symbol.multiUnit) {
    const refs = [...new Set(doc.components.filter((c) => c.symbolId === symbolId).map((c) => c.ref))].sort();
    for (const ref of refs) {
      const taken = doc.components.some((c) => c.ref === ref && c.unitId === unitId);
      if (!taken) return { ref, unitId };
    }
  }
  return { ref: nextRef(doc, symbol.refPrefix), unitId };
}

export function nextRef(doc, prefix) {
  const used = new Set(
    doc.components
      .map((c) => c.ref)
      .filter((r) => r && r.startsWith(prefix))
      .map((r) => Number(r.slice(prefix.length)))
      .filter((n) => Number.isFinite(n))
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `${prefix}${n}`;
}

export function makeComponent(doc, symbolId, unitId, x, y) {
  const symbol = getSymbol(symbolId);
  const unit = getUnit(symbolId, unitId) || symbol.units[0];
  const { ref } = assignRef(doc, symbolId, unit.id);
  return {
    id: uid('c'),
    symbolId,
    unitId: unit.id,
    ref,
    value: symbol.defaultValue || '',
    x,
    y,
    rot: 0,
    mirror: false,
  };
}

export function makeWire(x1, y1, x2, y2) {
  return { id: uid('w'), x1, y1, x2, y2 };
}

export function makeJunction(x, y) {
  return { id: uid('j'), x, y };
}

export function makeLabel(x, y, text) {
  return { id: uid('l'), x, y, text, rot: 0 };
}

export function makeNoConnect(x, y) {
  return { id: uid('n'), x, y };
}

/** World-space pins of one placed component unit. */
export function componentPins(component) {
  const unit = getUnit(component.symbolId, component.unitId);
  if (!unit) return [];
  return unit.pins.map((pin) => {
    const p = transformPoint({ x: pin.x, y: pin.y }, component);
    const orient = transformOrient(pin.orient, component);
    const v = orientVector(orient);
    return {
      pin,
      num: pin.num,
      name: pin.name,
      type: pin.type,
      x: p.x,
      y: p.y,
      // Where the stub meets the body, in world space (for drawing).
      bodyX: p.x - v.x * (pin.len || 0),
      bodyY: p.y - v.y * (pin.len || 0),
      orient,
      componentId: component.id,
      ref: component.ref,
      unitId: component.unitId,
      symbolId: component.symbolId,
    };
  });
}

/** Every pin in the document, world-space. */
export function allPins(doc) {
  const out = [];
  for (const c of doc.components) out.push(...componentPins(c));
  return out;
}

/**
 * Local bounding box of a symbol unit (graphics + pins).
 * Curved paths are approximated from their pin span, which is close enough for
 * hit-testing and for deciding where to hang the reference/value text.
 */
export function unitBounds(unit) {
  const pts = [];
  for (const pin of unit.pins) pts.push({ x: pin.x, y: pin.y });
  for (const g of unit.graphics || []) {
    if (g.t === 'line' && g.pts) for (const [x, y] of g.pts) pts.push({ x, y });
    else if (g.t === 'rect') pts.push({ x: g.x, y: g.y }, { x: g.x + g.w, y: g.y + g.h });
    else if (g.t === 'circle') pts.push({ x: g.cx - g.r, y: g.cy - g.r }, { x: g.cx + g.r, y: g.cy + g.r });
    else if (g.t === 'text') pts.push({ x: g.x, y: g.y });
  }
  if (!pts.length) return { minX: -20, minY: -20, maxX: 20, maxY: 20 };
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

/** World-space bounding box of a placed component. */
export function componentBounds(component) {
  const unit = getUnit(component.symbolId, component.unitId);
  if (!unit) return { minX: component.x, minY: component.y, maxX: component.x, maxY: component.y };
  const b = unitBounds(unit);
  const corners = [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.minX, y: b.maxY },
    { x: b.maxX, y: b.maxY },
  ].map((p) => transformPoint(p, component));
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxX: Math.max(...corners.map((p) => p.x)),
    maxY: Math.max(...corners.map((p) => p.y)),
  };
}

/** Rough bounding box of the drawing (for zoom-to-fit). */
export function documentBounds(doc) {
  const pts = [];
  for (const p of allPins(doc)) pts.push({ x: p.x, y: p.y }, { x: p.bodyX, y: p.bodyY });
  for (const c of doc.components) pts.push({ x: c.x - 40, y: c.y - 40 }, { x: c.x + 40, y: c.y + 40 });
  for (const w of doc.wires) pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
  for (const l of doc.labels) pts.push({ x: l.x, y: l.y });
  if (!pts.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Components grouped by reference designator (one entry per physical part). */
export function componentsByRef(doc) {
  const map = new Map();
  for (const c of doc.components) {
    if (!map.has(c.ref)) map.set(c.ref, []);
    map.get(c.ref).push(c);
  }
  return map;
}

/** Serialisation is plain JSON: kept as functions so the shape can evolve. */
export function serializeDocument(doc) {
  return { ...cloneDocument(doc), version: DOC_VERSION };
}

export function deserializeDocument(raw) {
  if (!raw || typeof raw !== 'object') return createDocument();
  const base = createDocument();
  return {
    ...base,
    ...raw,
    components: raw.components || [],
    wires: raw.wires || [],
    junctions: raw.junctions || [],
    labels: raw.labels || [],
    noConnects: raw.noConnects || [],
  };
}
