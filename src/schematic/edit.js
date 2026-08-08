/**
 * Pure document-editing operations. Every one takes a document and returns a
 * NEW document, which is what makes undo/redo a simple stack of snapshots.
 */

import {
  cloneDocument,
  makeComponent,
  makeWire,
  makeJunction,
  makeLabel,
  makeNoConnect,
  componentPins,
  componentBounds,
  nextRef,
  uid,
} from './model.js';
import { getSymbol } from './symbols/index.js';
import {
  GRID,
  snap,
  key,
  pointOnSegment,
  pointOnSegmentInterior,
  pointsEqual,
  distanceToSegment,
} from './geometry.js';

export function placeComponent(doc, symbolId, unitId, x, y, { rot = 0, mirror = false } = {}) {
  const next = cloneDocument(doc);
  const component = makeComponent(next, symbolId, unitId, snap(x), snap(y));
  component.rot = rot;
  component.mirror = mirror;
  next.components.push(component);
  spliceIntoWire(next, component);
  normalize(next);
  return { doc: next, component };
}

/**
 * Drop a two-terminal part onto a wire and it takes the wire's place.
 *
 * If both pins land on one wire, that wire is replaced by the two stubs either
 * side of the part: `start → near pin` and `far pin → end`. The span between
 * the pins is deleted, because the component now *is* that span: leaving it
 * would short the part out, which is both wrong and invisible.
 *
 * This is the gesture every EDA tool supports and the reason it matters is that
 * the alternative is delete-wire, place-part, draw-two-wires: four operations
 * to express one intention.
 *
 * Only two-terminal parts qualify. A pin count above two has no unambiguous
 * "the wire goes through here" reading, and guessing would silently rewire the
 * sheet.
 *
 * Mutates `doc` in place; callers already hold a fresh clone.
 */
export function spliceIntoWire(doc, component, { requireInterior = false } = {}) {
  const pins = componentPins(component);
  if (pins.length !== 2) return false;
  const [a, b] = pins;

  for (const wire of doc.wires) {
    const start = { x: wire.x1, y: wire.y1 };
    const end = { x: wire.x2, y: wire.y2 };
    if (!pointOnSegment(a, start, end) || !pointOnSegment(b, start, end)) continue;
    // Both pins on the same point is a degenerate symbol, not a splice.
    if (pointsEqual(a, b)) continue;
    // On a *move*, the wire may have been dragged along by its ends: a part
    // whose own jumper follows it is not being dropped into anything. Only a
    // pin landing strictly inside the run means "put me in this wire".
    if (requireInterior && !pointOnSegmentInterior(a, start, end) && !pointOnSegmentInterior(b, start, end)) {
      continue;
    }

    const distFromStart = (p) => (p.x - start.x) ** 2 + (p.y - start.y) ** 2;
    const [near, far] = distFromStart(a) <= distFromStart(b) ? [a, b] : [b, a];

    doc.wires = doc.wires.filter((w) => w.id !== wire.id);
    // A pin sitting exactly on an endpoint leaves no stub on that side.
    if (!pointsEqual(start, near)) doc.wires.push(makeWire(start.x, start.y, near.x, near.y));
    if (!pointsEqual(far, end)) doc.wires.push(makeWire(far.x, far.y, end.x, end.y));
    return true;
  }
  return false;
}

/**
 * Add wire segments, then bring the implied junction dots up to date.
 */
export function addWires(doc, segments) {
  const next = cloneDocument(doc);
  for (const seg of segments) {
    if (seg.x1 === seg.x2 && seg.y1 === seg.y2) continue;
    next.wires.push(makeWire(seg.x1, seg.y1, seg.x2, seg.y2));
  }
  normalize(next);
  return next;
}

/**
 * Re-derive the junction dots the geometry implies.
 *
 * Two things imply a dot, and both are "a T, not a crossing":
 *
 *  1. A wire END landing on the INTERIOR of another wire: what KiCad does
 *     while you route.
 *  2. A component PIN landing on the INTERIOR of a wire. Run a wire past a
 *     resistor leg and the leg is *in* that wire; the dot says so.
 *
 * Deliberately NOT done: a dot where two wires merely cross (interior to
 * interior). Crossing without a dot means "not connected", and that
 * distinction is one of the things this app is teaching.
 *
 * ## Why these are re-derived rather than accumulated
 *
 * Auto dots are erased and rebuilt on every edit. Drag a part off a wire and
 * its dot must go with it: a leftover dot would silently join two wires that
 * only cross, which is the exact misconception the crossing rule exists to
 * prevent. Dots the learner placed by hand carry `auto: false` and are never
 * touched, so an explicit connection always survives.
 *
 * Mutates `doc` in place; callers already hold a fresh clone.
 */
export function normalize(doc) {
  doc.junctions = doc.junctions.filter((j) => !j.auto);
  const existing = new Set(doc.junctions.map((j) => key(j.x, j.y)));

  const touches = [];
  for (const w of doc.wires) {
    touches.push({ x: w.x1, y: w.y1, wireId: w.id }, { x: w.x2, y: w.y2, wireId: w.id });
  }
  for (const c of doc.components) {
    for (const p of componentPins(c)) touches.push({ x: p.x, y: p.y, wireId: null });
  }

  for (const p of touches) {
    const k = key(p.x, p.y);
    if (existing.has(k)) continue;
    const onInterior = doc.wires.some(
      (w) => w.id !== p.wireId && pointOnSegmentInterior(p, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 })
    );
    if (onInterior) {
      doc.junctions.push({ ...makeJunction(p.x, p.y), auto: true });
      existing.add(k);
    }
  }
  return doc;
}

/** Kept as the historical name; `normalize` is what it does now. */
export const addImpliedJunctions = normalize;

/**
 * Junction tool: adds or removes a junction the learner owns.
 *
 * An implied dot cannot be toggled away: the geometry would just put it back
 * on the next edit, so toggling on top of one is a no-op rather than a flicker.
 */
export function toggleJunction(doc, x, y) {
  const next = cloneDocument(doc);
  const at = next.junctions.findIndex((j) => pointsEqual(j, { x, y }));
  if (at >= 0) {
    if (next.junctions[at].auto) return doc;
    next.junctions.splice(at, 1);
  } else {
    next.junctions.push(makeJunction(snap(x), snap(y)));
  }
  return next;
}

export function addLabel(doc, x, y, text) {
  const next = cloneDocument(doc);
  next.labels.push(makeLabel(snap(x), snap(y), text));
  return next;
}

export function toggleNoConnect(doc, x, y) {
  const next = cloneDocument(doc);
  const at = next.noConnects.findIndex((n) => pointsEqual(n, { x, y }));
  if (at >= 0) next.noConnects.splice(at, 1);
  else next.noConnects.push(makeNoConnect(snap(x), snap(y)));
  return next;
}

/**
 * Anchor points a moving selection drags its wiring by: every pin of a moving
 * component, and every endpoint of a moving wire.
 */
export function attachmentPoints(doc, ids) {
  const sel = new Set(ids);
  const points = new Set();
  for (const c of doc.components) {
    if (!sel.has(c.id)) continue;
    for (const p of componentPins(c)) points.add(key(p.x, p.y));
  }
  for (const w of doc.wires) {
    if (!sel.has(w.id)) continue;
    points.add(key(w.x1, w.y1));
    points.add(key(w.x2, w.y2));
  }
  return points;
}

/**
 * Move every selected item by a grid-aligned delta.
 *
 * With `dragWires` (the default for the mouse and for G), a wire END that sits
 * on a moving pin is carried along: the wire stretches instead of tearing off.
 * That is KiCad's *drag*, and it is what you want almost every time, pulling a
 * resistor two squares to the left should not silently disconnect it.
 *
 * `dragWires: false` is KiCad's *move* (M): the part leaves, the wiring stays.
 * Occasionally that is exactly the intent, so it keeps its own binding rather
 * than being unreachable.
 *
 * A wire whose *both* ends are anchored simply translates, which is what makes
 * dragging a whole sub-circuit behave.
 */
export function moveItems(doc, ids, dx, dy, { dragWires = true } = {}) {
  const next = cloneDocument(doc);
  const sel = new Set(ids);
  const anchors = dragWires ? attachmentPoints(doc, ids) : new Set();

  for (const c of next.components) {
    if (sel.has(c.id)) {
      c.x += dx;
      c.y += dy;
    }
  }
  for (const w of next.wires) {
    if (sel.has(w.id)) {
      w.x1 += dx;
      w.y1 += dy;
      w.x2 += dx;
      w.y2 += dy;
      continue;
    }
    if (!anchors.size) continue;
    if (anchors.has(key(w.x1, w.y1))) {
      w.x1 += dx;
      w.y1 += dy;
    }
    if (anchors.has(key(w.x2, w.y2))) {
      w.x2 += dx;
      w.y2 += dy;
    }
  }
  for (const j of next.junctions) {
    if (sel.has(j.id)) {
      j.x += dx;
      j.y += dy;
    }
  }
  for (const l of next.labels) {
    if (sel.has(l.id)) {
      l.x += dx;
      l.y += dy;
    }
  }
  for (const n of next.noConnects) {
    if (sel.has(n.id)) {
      n.x += dx;
      n.y += dy;
    }
  }

  // A part dropped across a wire takes that wire's place, exactly as it would
  // if it had been placed there in the first place.
  for (const c of next.components) {
    if (sel.has(c.id)) spliceIntoWire(next, c, { requireInterior: true });
  }
  return normalize(next);
}

/** Rotate the selection 90° clockwise about its own centre. */
export function rotateItems(doc, ids) {
  const next = cloneDocument(doc);
  const sel = new Set(ids);
  const pts = collectPoints(next, sel);
  if (!pts.length) return doc;
  const cx = snap(pts.reduce((s, p) => s + p.x, 0) / pts.length);
  const cy = snap(pts.reduce((s, p) => s + p.y, 0) / pts.length);
  const rot = (p) => ({ x: cx - (p.y - cy), y: cy + (p.x - cx) });

  for (const c of next.components) {
    if (!sel.has(c.id)) continue;
    const p = rot({ x: c.x, y: c.y });
    c.x = p.x;
    c.y = p.y;
    c.rot = ((c.rot || 0) + 90) % 360;
  }
  for (const w of next.wires) {
    if (!sel.has(w.id)) continue;
    const a = rot({ x: w.x1, y: w.y1 });
    const b = rot({ x: w.x2, y: w.y2 });
    w.x1 = a.x;
    w.y1 = a.y;
    w.x2 = b.x;
    w.y2 = b.y;
  }
  for (const list of [next.junctions, next.labels, next.noConnects]) {
    for (const item of list) {
      if (!sel.has(item.id)) continue;
      const p = rot({ x: item.x, y: item.y });
      item.x = p.x;
      item.y = p.y;
    }
  }
  return normalize(next);
}

/**
 * Mirror the selection about its own centre line.
 * `axis` is 'x' for a horizontal flip (KiCad's X) or 'y' for vertical (Y).
 */
export function mirrorItems(doc, ids, axis = 'x') {
  const next = cloneDocument(doc);
  const sel = new Set(ids);
  const pts = collectPoints(next, sel);
  if (!pts.length) return doc;
  const horizontal = axis === 'x';
  const centre = snap(
    pts.reduce((s, p) => s + (horizontal ? p.x : p.y), 0) / pts.length
  );
  const flip = (v) => 2 * centre - v;

  for (const c of next.components) {
    if (!sel.has(c.id)) continue;
    if (horizontal) c.x = flip(c.x);
    else c.y = flip(c.y);
    // A vertical flip is a horizontal flip plus a half turn.
    c.mirror = !c.mirror;
    if (!horizontal) c.rot = ((c.rot || 0) + 180) % 360;
    else if (c.rot === 90 || c.rot === 270) c.rot = (c.rot + 180) % 360;
  }
  for (const w of next.wires) {
    if (!sel.has(w.id)) continue;
    if (horizontal) {
      w.x1 = flip(w.x1);
      w.x2 = flip(w.x2);
    } else {
      w.y1 = flip(w.y1);
      w.y2 = flip(w.y2);
    }
  }
  for (const list of [next.junctions, next.labels, next.noConnects]) {
    for (const item of list) {
      if (!sel.has(item.id)) continue;
      if (horizontal) item.x = flip(item.x);
      else item.y = flip(item.y);
    }
  }
  return normalize(next);
}

/**
 * Lift the selection into a clipboard payload.
 *
 * Coordinates are stored relative to the selection's own top-left corner, so a
 * paste is "put this shape here" rather than "put this shape back where it came
 * from". Auto junctions are dropped: they are a property of where the fragment
 * lands, not of the fragment, and the paste re-derives them.
 *
 * The payload is plain JSON so it can go to the system clipboard and come back
 *, including into another tab.
 */
export function copySelection(doc, ids) {
  const sel = new Set(ids);
  const pick = (list) => list.filter((i) => sel.has(i.id));
  const components = pick(doc.components);
  const wires = pick(doc.wires);
  const junctions = pick(doc.junctions).filter((j) => !j.auto);
  const labels = pick(doc.labels);
  const noConnects = pick(doc.noConnects);
  if (!components.length && !wires.length && !junctions.length && !labels.length && !noConnects.length) {
    return null;
  }

  const xs = [
    ...components.map((c) => c.x),
    ...wires.flatMap((w) => [w.x1, w.x2]),
    ...[...junctions, ...labels, ...noConnects].map((i) => i.x),
  ];
  const ys = [
    ...components.map((c) => c.y),
    ...wires.flatMap((w) => [w.y1, w.y2]),
    ...[...junctions, ...labels, ...noConnects].map((i) => i.y),
  ];
  const ox = snap(Math.min(...xs));
  const oy = snap(Math.min(...ys));

  const shift = (i) => ({ ...i, x: i.x - ox, y: i.y - oy });
  return {
    kind: 'circuitdojo.clip',
    components: components.map(shift),
    wires: wires.map((w) => ({ ...w, x1: w.x1 - ox, y1: w.y1 - oy, x2: w.x2 - ox, y2: w.y2 - oy })),
    junctions: junctions.map(shift),
    labels: labels.map(shift),
    noConnects: noConnects.map(shift),
  };
}

/**
 * Drop a clipboard payload onto the sheet with its top-left at (x, y).
 *
 * Every copied part gets a fresh id and a fresh reference designator, because
 * two R4s on one sheet is not a copy: it is a bug the netlist will happily
 * hide by treating them as one part.
 */
export function pasteClipboard(doc, clip, x, y) {
  if (!clip) return { doc, ids: [] };
  const next = cloneDocument(doc);
  const dx = snap(x);
  const dy = snap(y);
  const ids = [];

  for (const c of clip.components || []) {
    const symbol = getSymbol(c.symbolId);
    const copy = {
      ...c,
      id: uid('c'),
      x: c.x + dx,
      y: c.y + dy,
      ref: symbol ? nextRef(next, symbol.refPrefix) : c.ref,
    };
    next.components.push(copy);
    ids.push(copy.id);
  }
  for (const w of clip.wires || []) {
    const copy = { ...w, id: uid('w'), x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy };
    next.wires.push(copy);
    ids.push(copy.id);
  }
  for (const [list, target, prefix] of [
    [clip.junctions, next.junctions, 'j'],
    [clip.labels, next.labels, 'l'],
    [clip.noConnects, next.noConnects, 'n'],
  ]) {
    for (const item of list || []) {
      const copy = { ...item, id: uid(prefix), x: item.x + dx, y: item.y + dy, auto: false };
      target.push(copy);
      ids.push(copy.id);
    }
  }
  return { doc: normalize(next), ids };
}

/**
 * Duplicate the selection, offset by one grid step so the copy is visible and
 * immediately selectable, a copy and a paste in one action.
 */
export function duplicateItems(doc, ids, offset = GRID * 2) {
  const clip = copySelection(doc, ids);
  if (!clip) return { doc, ids: [] };
  // The clip is normalised to its own origin, so pasting at the source origin
  // plus the offset is what puts the copy beside the original.
  const source = originOf(doc, ids);
  return pasteClipboard(doc, clip, source.x + offset, source.y + offset);
}

function originOf(doc, ids) {
  const sel = new Set(ids);
  const pts = collectPoints(doc, sel);
  if (!pts.length) return { x: 0, y: 0 };
  return { x: snap(Math.min(...pts.map((p) => p.x))), y: snap(Math.min(...pts.map((p) => p.y))) };
}

function collectPoints(doc, sel) {
  const pts = [];
  for (const c of doc.components) if (sel.has(c.id)) pts.push({ x: c.x, y: c.y });
  for (const w of doc.wires) if (sel.has(w.id)) pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
  for (const list of [doc.junctions, doc.labels, doc.noConnects]) {
    for (const item of list) if (sel.has(item.id)) pts.push({ x: item.x, y: item.y });
  }
  return pts;
}

export function deleteItems(doc, ids) {
  const sel = new Set(ids);
  const next = cloneDocument(doc);
  next.components = next.components.filter((c) => !sel.has(c.id));
  next.wires = next.wires.filter((w) => !sel.has(w.id));
  next.junctions = next.junctions.filter((j) => !sel.has(j.id));
  next.labels = next.labels.filter((l) => !sel.has(l.id));
  next.noConnects = next.noConnects.filter((n) => !sel.has(n.id));
  return normalize(next);
}

export function updateItem(doc, id, patch) {
  const next = cloneDocument(doc);
  for (const list of [next.components, next.wires, next.junctions, next.labels, next.noConnects]) {
    const item = list.find((i) => i.id === id);
    if (item) {
      Object.assign(item, patch);
      break;
    }
  }
  return normalize(next);
}

/**
 * Multi-unit parts share a reference designator, so renaming one unit renames
 * every unit of that package.
 */
export function renameRef(doc, oldRef, newRef) {
  const next = cloneDocument(doc);
  for (const c of next.components) {
    if (c.ref === oldRef) c.ref = newRef;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

const PIN_SNAP = GRID * 0.9;

/** Nearest pin to a world point, within snapping distance. */
export function pinAt(doc, x, y, tolerance = PIN_SNAP) {
  let best = null;
  let bestDist = tolerance;
  for (const c of doc.components) {
    for (const p of componentPins(c)) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= bestDist) {
        best = p;
        bestDist = d;
      }
    }
  }
  return best;
}

/**
 * Snap a point onto a nearby wire.
 *
 * Naming a node means putting the label on the wire, and "on" has to mean
 * within a few pixels rather than exactly. Clicking a hair off the run left the
 * label floating beside the net it was supposed to name, looking right and
 * doing nothing: the connectivity equivalent of a typo you cannot see.
 *
 * Wires here are axis-aligned, so the point is projected onto the run and then
 * snapped along it. Snapping both axes to the grid would push it back off.
 */
export function wireSnap(doc, x, y, tolerance = GRID * 0.9) {
  let best = null;
  let bestDist = tolerance;
  for (const w of doc.wires) {
    const d = distanceToSegment({ x, y }, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
    if (d > bestDist) continue;
    const horizontal = w.y1 === w.y2;
    const vertical = w.x1 === w.x2;
    if (!horizontal && !vertical) continue;
    const p = horizontal
      ? { x: clamp(snap(x), Math.min(w.x1, w.x2), Math.max(w.x1, w.x2)), y: w.y1 }
      : { x: w.x1, y: clamp(snap(y), Math.min(w.y1, w.y2), Math.max(w.y1, w.y2)) };
    best = p;
    bestDist = d;
  }
  return best;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Topmost item under a world point: component body, wire, label or junction. */
export function itemAt(doc, x, y) {
  for (let i = doc.components.length - 1; i >= 0; i--) {
    const c = doc.components[i];
    if (hitComponent(c, x, y)) return { kind: 'component', item: c };
  }
  for (const l of doc.labels) {
    if (Math.abs(l.x - x) < 40 && Math.abs(l.y - y) < 12) return { kind: 'label', item: l };
  }
  for (const j of doc.junctions) {
    if (Math.hypot(j.x - x, j.y - y) < 6) return { kind: 'junction', item: j };
  }
  for (const n of doc.noConnects) {
    if (Math.hypot(n.x - x, n.y - y) < 8) return { kind: 'noconnect', item: n };
  }
  for (const w of doc.wires) {
    if (distanceToSegment({ x, y }, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) < 5) {
      return { kind: 'wire', item: w };
    }
  }
  return null;
}

function hitComponent(component, x, y) {
  // Pins first, they extend beyond the body.
  for (const p of componentPins(component)) {
    if (Math.hypot(p.x - x, p.y - y) < 6) return true;
    if (distanceToSegment({ x, y }, { x: p.x, y: p.y }, { x: p.bodyX, y: p.bodyY }) < 5) return true;
  }
  const b = componentBounds(component);
  return x >= b.minX - 4 && x <= b.maxX + 4 && y >= b.minY - 4 && y <= b.maxY + 4;
}

/** Items whose anchor falls inside a rubber-band rectangle. */
export function itemsInRect(doc, x1, y1, x2, y2) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const inside = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY;
  const ids = [];
  for (const c of doc.components) if (inside(c.x, c.y)) ids.push(c.id);
  for (const w of doc.wires) if (inside(w.x1, w.y1) && inside(w.x2, w.y2)) ids.push(w.id);
  for (const list of [doc.junctions, doc.labels, doc.noConnects]) {
    for (const item of list) if (inside(item.x, item.y)) ids.push(item.id);
  }
  return ids;
}
