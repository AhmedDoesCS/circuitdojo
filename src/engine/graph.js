/**
 * Component graph over the netlist: nets are vertices, two-terminal parts are
 * edges. Used for the questions that connectivity alone cannot answer:
 * "is there a DC path from +5V to GND through nothing but a closed switch?",
 * "can this logic input reach a rail through a resistor?".
 *
 * Edge kinds:
 *   zero     : a closed switch / jumper: a wire for DC purposes
 *   resistive: resistor, pot, thermistor, LDR, inductor, unknown external load
 *   diode    : diode / LED: conducts, drops ~0.7-2V, does NOT limit current
 *   blocking : capacitor: no DC path
 *   active   : transistors, IC internals: not treated as a DC path
 */

const KIND_BY_TAG = [
  ['capacitor', 'blocking'],
  ['zero_impedance', 'zero'],
  ['led', 'diode'],
  ['zener', 'diode'],
  ['diode', 'diode'],
  ['resistor', 'resistive'],
  ['thermistor', 'resistive'],
  ['ldr', 'resistive'],
  ['inductor', 'resistive'],
  ['connector', 'resistive'],
  ['transistor', 'active'],
];

function edgeKind(symbol) {
  const tags = symbol.tags || [];
  for (const [tag, kind] of KIND_BY_TAG) {
    if (tags.includes(tag)) return kind;
  }
  return 'active';
}

/**
 * Build an adjacency map: netId -> [{ netId, kind, ref, symbol, pins }].
 * Only components whose internal conduction is well-defined become edges.
 */
export function buildComponentGraph(netlist) {
  const adjacency = new Map();
  const addEdge = (a, b, edge) => {
    if (!a || !b || a === b) return;
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a).push({ ...edge, from: a, to: b });
  };

  for (const comp of netlist.components) {
    if (comp.isPower) continue;
    const kind = edgeKind(comp.symbol);
    if (kind === 'active' || kind === 'blocking') continue;

    // Two-terminal parts, plus potentiometers where every pin pair conducts.
    const pins = comp.pins.filter((p) => p.type === 'passive' || p.type === 'power_in' || p.type === 'power_out');

    /**
     * A changeover switch is the exception to "every pin pair conducts".
     *
     * Its two throws are mutually exclusive: the common terminal reaches one or
     * the other, and they never reach each other. Meshing all three pins made
     * the graph believe a wiper could join both throws at once, so an SPDT
     * selecting between a rail and ground read as a dead short across the
     * supply, and the challenge that asks for exactly that circuit was
     * impossible to pass.
     */
    const hub = comp.symbol.commonPin
      ? pins.find((p) => p.name === comp.symbol.commonPin || p.num === comp.symbol.commonPin)
      : null;

    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i];
        const b = pins[j];
        if (hub && a !== hub && b !== hub) continue;
        const edge = { kind, ref: comp.ref, symbol: comp.symbol, component: comp, pins: [a, b] };
        addEdge(a.netId, b.netId, edge);
        addEdge(b.netId, a.netId, edge);
      }
    }
  }
  return adjacency;
}

/**
 * Breadth-first search for a path between two net sets using only the allowed
 * edge kinds. Returns the path ({netId, edges}) or null.
 *
 * A start net that is already a goal returns a zero-edge path: that is a real
 * "directly connected" answer for topology checks. Callers that specifically
 * mean "through at least one component" (short detection) must test
 * `edges.length > 0` themselves.
 */
export function findPath(adjacency, startNetIds, goalNetIds, allowedKinds) {
  const goals = new Set(goalNetIds);
  const allowed = new Set(allowedKinds);
  const seen = new Set(startNetIds);
  const queue = startNetIds.map((id) => ({ netId: id, edges: [] }));

  while (queue.length) {
    const { netId, edges } = queue.shift();
    if (goals.has(netId)) return { netId, edges };
    for (const edge of adjacency.get(netId) || []) {
      if (!allowed.has(edge.kind)) continue;
      if (seen.has(edge.to)) continue;
      if (reusesChangeover(edges, edge)) continue;
      seen.add(edge.to);
      queue.push({ netId: edge.to, edges: [...edges, edge] });
    }
  }
  return null;
}

/**
 * A changeover part may appear at most once in a conduction path.
 *
 * Removing the throw-to-throw edge is not enough on its own: a path can still
 * enter one throw, pass through the common terminal and leave by the other,
 * which is the same physically impossible connection spelled with two edges
 * instead of one. That is what made an SPDT selecting between a rail and ground
 * report as a dead short.
 *
 * Two edges of the same changeover in one path always means both positions at
 * once, because the only way through such a part is via its common terminal.
 */
function reusesChangeover(edges, next) {
  if (!next.symbol?.commonPin) return false;
  return edges.some((e) => e.component === next.component);
}

/** Every net reachable from a starting set through the allowed edge kinds. */
export function reachableNets(adjacency, startNetIds, allowedKinds) {
  const allowed = new Set(allowedKinds);
  const seen = new Set(startNetIds);
  const stack = [...startNetIds];
  while (stack.length) {
    const netId = stack.pop();
    for (const edge of adjacency.get(netId) || []) {
      if (!allowed.has(edge.kind)) continue;
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      stack.push(edge.to);
    }
  }
  return seen;
}

/** Edges incident on a net, optionally filtered by kind. */
export function edgesAt(adjacency, netId, kinds = null) {
  const list = adjacency.get(netId) || [];
  return kinds ? list.filter((e) => kinds.includes(e.kind)) : list;
}
