/**
 * Netlist extraction: schematic graph -> electrical nets.
 *
 * This is the foundation of the whole validation stack, so the connectivity
 * rules are stated explicitly and match real EDA behaviour:
 *
 *  1. A wire segment connects its own two endpoints.
 *  2. Two items touching at the SAME point are connected (wire end to wire end,
 *     pin to wire end, pin to pin).
 *  3. A point touching the INTERIOR of a wire (a T, or a crossing X) is
 *     connected only if a junction dot exists at that point. This is the
 *     classic teachable trap: two wires crossing without a dot are NOT joined,
 *     and the editor never invents a dot for a plain crossing.
 *  4. All power symbols with the same net name are one global net, wherever
 *     they sit on the sheet.
 *  5. All net labels with the same text are one net, but a label is not a
 *     supply, so a labelled "VCC" net with no power symbol still counts as
 *     unpowered for ERC purposes.
 *
 * Output shape (see `extractNetlist`):
 *   {
 *     nets: [{ id, name, isPower, powerKind, voltage, pins[], points[], labels[] }],
 *     pins: [...all pins with .netId],
 *     components: [{ ref, symbolId, symbol, value, units[], pins[] }],
 *     netOfPin(ref, pinNum), netByName(name), ...
 *   }
 */

import { key, pointOnSegmentInterior, pointsEqual } from './geometry.js';
import { allPins } from './model.js';
import { getSymbol } from './symbols/index.js';
import { parseValue } from './units.js';

class UnionFind {
  constructor() {
    this.parent = new Map();
  }

  add(k) {
    if (!this.parent.has(k)) this.parent.set(k, k);
    return k;
  }

  find(k) {
    this.add(k);
    let root = k;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    // Path compression.
    let cur = k;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur);
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/**
 * Build the electrical netlist for a document.
 * Pure function, no DOM, no React. Also runnable under `node --test`.
 */
export function extractNetlist(doc) {
  const uf = new UnionFind();
  const pins = allPins(doc);

  // (1) Each wire ties its endpoints together.
  for (const w of doc.wires) {
    uf.union(key(w.x1, w.y1), key(w.x2, w.y2));
  }

  // (2) Coincident points share a key already, so nothing to do: the key IS
  //     the identity. Pins simply join the key at their coordinate.
  for (const p of pins) uf.add(key(p.x, p.y));

  // (3) Junction dots bind a point into the interior of any wire crossing it.
  for (const j of doc.junctions) {
    const jk = uf.add(key(j.x, j.y));
    for (const w of doc.wires) {
      const a = { x: w.x1, y: w.y1 };
      const b = { x: w.x2, y: w.y2 };
      if (pointOnSegmentInterior({ x: j.x, y: j.y }, a, b)) {
        uf.union(jk, key(a.x, a.y));
        uf.union(jk, key(b.x, b.y));
      }
    }
  }

  // (4) Power symbols: same net name -> same net, globally.
  const powerGroups = new Map();
  for (const c of doc.components) {
    const sym = getSymbol(c.symbolId);
    if (!sym || !sym.isPower) continue;
    const netName = c.value || sym.power.netName;
    const pin = pins.find((p) => p.componentId === c.id);
    if (!pin) continue;
    const k = key(pin.x, pin.y);
    if (!powerGroups.has(netName)) powerGroups.set(netName, []);
    powerGroups.get(netName).push({ key: k, symbol: sym, component: c });
  }
  for (const group of powerGroups.values()) {
    for (let i = 1; i < group.length; i++) uf.union(group[0].key, group[i].key);
  }

  // (5) Net labels: same text -> same net.
  //
  // A label dropped anywhere along a wire names that wire. It only ever bound
  // at an exact endpoint or pin coordinate before, so a label placed in the
  // middle of a run, the obvious place to put one, sat on an isolated net of
  // its own and did nothing at all. Every challenge that asks the learner to
  // name a node was unpassable unless they happened to click the one pixel
  // where a pin was.
  //
  // Unlike a junction this does NOT imply a branch, so no dot is drawn: a label
  // is an annotation on a net, not a connection between two of them.
  const labelGroups = new Map();
  for (const l of doc.labels) {
    const text = (l.text || '').trim();
    if (!text) continue;
    const k = uf.add(key(l.x, l.y));
    for (const w of doc.wires) {
      const a = { x: w.x1, y: w.y1 };
      const b = { x: w.x2, y: w.y2 };
      if (pointOnSegmentInterior({ x: l.x, y: l.y }, a, b)) {
        uf.union(k, key(a.x, a.y));
        uf.union(k, key(b.x, b.y));
      }
    }
    if (!labelGroups.has(text)) labelGroups.set(text, []);
    labelGroups.get(text).push(k);
  }
  for (const group of labelGroups.values()) {
    for (let i = 1; i < group.length; i++) uf.union(group[0], group[i]);
  }

  // ---- Collect roots into nets -------------------------------------------
  const netsByRoot = new Map();
  const ensureNet = (root) => {
    if (!netsByRoot.has(root)) {
      netsByRoot.set(root, {
        id: root,
        name: null,
        isPower: false,
        powerKind: null,
        voltage: null,
        powerNames: [],
        pins: [],
        points: [],
        labels: [],
        wireCount: 0,
      });
    }
    return netsByRoot.get(root);
  };

  for (const k of uf.parent.keys()) ensureNet(uf.find(k)).points.push(k);

  for (const w of doc.wires) ensureNet(uf.find(key(w.x1, w.y1))).wireCount += 1;

  for (const p of pins) {
    const net = ensureNet(uf.find(key(p.x, p.y)));
    p.netId = net.id;
    net.pins.push(p);
  }

  for (const [name, group] of powerGroups) {
    const net = ensureNet(uf.find(group[0].key));
    net.isPower = true;
    net.powerNames.push(name);
    const sym = group[0].symbol;
    // A ground symbol anywhere on the net makes the whole net ground.
    if (sym.power.kind === 'ground' || net.powerKind === 'ground') net.powerKind = 'ground';
    else net.powerKind = 'supply';
    if (sym.power.voltage !== null && sym.power.voltage !== undefined) {
      net.voltage = net.voltage === null ? sym.power.voltage : net.voltage;
    }
    if (sym.power.kind === 'ground') net.voltage = 0;
    net.name = net.name || name;
  }

  for (const [text, group] of labelGroups) {
    const net = ensureNet(uf.find(group[0]));
    net.labels.push(text);
    if (!net.name) net.name = text;
  }

  // Name the unnamed nets N$1, N$2, ... in a stable order.
  let anon = 1;
  const nets = [...netsByRoot.values()];
  nets.sort((a, b) => a.id.localeCompare(b.id));
  for (const net of nets) {
    if (!net.name) net.name = `N$${anon++}`;
    net.pointCount = net.points.length;
  }

  // ---- Component view (one entry per physical part) ------------------------
  const componentMap = new Map();
  for (const c of doc.components) {
    const sym = getSymbol(c.symbolId);
    if (!sym) continue;
    if (!componentMap.has(c.ref)) {
      componentMap.set(c.ref, {
        ref: c.ref,
        symbolId: c.symbolId,
        symbol: sym,
        value: c.value,
        numericValue: parseValue(c.value),
        tags: sym.tags || [],
        isPower: !!sym.isPower,
        units: [],
        pins: [],
        placedUnitIds: [],
        missingUnitIds: [],
      });
    }
    const entry = componentMap.get(c.ref);
    entry.units.push(c);
    entry.placedUnitIds.push(c.unitId);
    // Values live per placed unit; the first non-empty one wins for the part.
    if (!entry.value && c.value) {
      entry.value = c.value;
      entry.numericValue = parseValue(c.value);
    }
  }
  for (const p of pins) {
    const entry = componentMap.get(p.ref);
    if (entry) entry.pins.push(p);
  }
  for (const entry of componentMap.values()) {
    entry.missingUnitIds = entry.symbol.units
      .map((u) => u.id)
      .filter((id) => !entry.placedUnitIds.includes(id));
  }

  const components = [...componentMap.values()];

  return buildNetlistApi({ nets, pins, components, doc });
}

function buildNetlistApi({ nets, pins, components, doc }) {
  const netById = new Map(nets.map((n) => [n.id, n]));

  const api = {
    doc,
    nets,
    pins,
    components,

    netById(id) {
      return netById.get(id) || null;
    },

    netByName(name) {
      return nets.find((n) => n.name === name) || null;
    },

    /** The net a given pin sits on (by reference designator + pin number). */
    netOfPin(ref, pinNum) {
      const pin = pins.find((p) => p.ref === ref && p.num === String(pinNum));
      return pin ? netById.get(pin.netId) || null : null;
    },

    netOf(pin) {
      return pin ? netById.get(pin.netId) || null : null;
    },

    /** All power nets, split by role. */
    groundNets() {
      return nets.filter((n) => n.isPower && n.powerKind === 'ground');
    },

    supplyNets() {
      return nets.filter((n) => n.isPower && n.powerKind === 'supply');
    },

    /** Components matching a requirement type (symbol id or tag). */
    find(type) {
      if (!type) return [];
      return components.filter((c) => c.symbolId === type || c.tags.includes(type));
    },

    /** Non-power components only, what a student actually "placed". */
    signalComponents() {
      return components.filter((c) => !c.isPower);
    },

    /**
     * Nets shared by two components. `exclusive` means the net has no other
     * pins on it, the definition of a true series node between two parts.
     */
    sharedNets(refA, refB, { exclusive = false } = {}) {
      const out = [];
      for (const net of nets) {
        const a = net.pins.filter((p) => p.ref === refA);
        const b = net.pins.filter((p) => p.ref === refB);
        if (!a.length || !b.length) continue;
        if (exclusive && net.pins.length !== a.length + b.length) continue;
        out.push({ net, aPins: a, bPins: b });
      }
      return out;
    },

    /** Does this net carry any pin of the given component type? */
    netHasType(net, type) {
      return net.pins.some((p) => {
        const sym = getSymbol(p.symbolId);
        return sym && (sym.id === type || (sym.tags || []).includes(type));
      });
    },

    /** Convenience for check messages. */
    describeNet(net) {
      if (!net) return 'nothing';
      return net.name;
    },
  };

  return api;
}

/**
 * A pin is "connected" when its net contains something else, another pin or a
 * wire. A pin alone on a bare coordinate is floating.
 */
export function isPinConnected(netlist, pin) {
  const net = netlist.netOf(pin);
  if (!net) return false;
  if (net.pins.length > 1) return true;
  return net.wireCount > 0 || net.isPower || net.labels.length > 0;
}

/** Does the document mark this pin as intentionally unconnected? */
export function hasNoConnect(doc, pin) {
  return doc.noConnects.some((nc) => pointsEqual(nc, pin));
}
