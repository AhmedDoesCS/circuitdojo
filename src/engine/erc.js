/**
 * Electrical Rules Check.
 *
 * Every issue is written the way a professor would say it out loud: what is
 * wrong, and what physically happens as a result. "ERC error on pin 3" teaches
 * nothing; "SW1 ties +5V straight to GND when pressed, that's a dead short"
 * teaches the lesson.
 *
 * Severity contract:
 *   error  : blocks a pass
 *   warning: reported, does not block
 *
 * Challenges may relax rules via `ercOptions`:
 *   { allowUnconnected: ['U1.5', 'LED'], skipRules: ['no_ground'] }
 */

import { isPinConnected, hasNoConnect } from '../schematic/netlist.js';
import { getSymbol } from '../schematic/symbols/index.js';
import { buildComponentGraph, findPath, reachableNets } from './graph.js';
import { key } from '../schematic/geometry.js';

const DRIVERS = new Set(['output', 'tri_state', 'bidirectional', 'power_out']);

export function runERC(doc, netlist, ercOptions = {}) {
  const issues = [];
  const skip = new Set(ercOptions.skipRules || []);
  const allowUnconnected = ercOptions.allowUnconnected || [];
  const adjacency = buildComponentGraph(netlist);
  const railNetIds = netlist.nets.filter((n) => n.isPower).map((n) => n.id);
  const groundNetIds = netlist.groundNets().map((n) => n.id);
  const supplyNetIds = netlist.supplyNets().map((n) => n.id);

  const add = (issue) => {
    if (skip.has(issue.code)) return;
    issues.push({ severity: 'error', refs: [], points: [], ...issue });
  };

  /**
   * `allowUnconnected` entries a challenge may use:
   *   'U1.5'            a specific placed pin
   *   'U1' / 'ATTINY85' / 'led'   every pin of a ref, symbol id or tag
   *   'ATTINY85:PB*'    pins of a symbol whose name matches a prefix pattern
   */
  const pinAllowedOpen = (pin) => {
    const sym = getSymbol(pin.symbolId);
    return allowUnconnected.some((entry) => {
      if (entry.includes(':')) {
        const [symId, pattern] = entry.split(':');
        if (symId !== pin.symbolId && symId !== pin.ref) return false;
        if (pattern.endsWith('*')) return pin.name.startsWith(pattern.slice(0, -1));
        return pin.name === pattern || pin.num === pattern;
      }
      return (
        entry === `${pin.ref}.${pin.num}` ||
        entry === pin.ref ||
        entry === pin.symbolId ||
        (sym && (sym.tags || []).includes(entry))
      );
    });
  };

  // ---- 1. Floating / unconnected pins -------------------------------------
  for (const pin of netlist.pins) {
    if (hasNoConnect(doc, pin) || pinAllowedOpen(pin)) continue;
    if (isPinConnected(netlist, pin)) continue;
    const sym = getSymbol(pin.symbolId);
    if (sym && sym.isPower) {
      add({
        code: 'power_symbol_floating',
        severity: 'warning',
        message: `The ${pin.name} power symbol isn't wired to anything. Placing a power symbol on its own does not connect it: it needs a wire to the node it powers.`,
        refs: [pin.ref],
        points: [{ x: pin.x, y: pin.y }],
      });
      continue;
    }
    add({
      code: 'floating_pin',
      severity: 'error',
      message: `${pin.ref} pin ${pin.num}${pin.name && pin.name !== '~' ? ` (${pin.name})` : ''} isn't connected to anything.${floatingConsequence(pin)}`,
      refs: [pin.ref],
      points: [{ x: pin.x, y: pin.y }],
    });
  }

  // ---- 2. Dangling wire ends ----------------------------------------------
  const pinKeys = new Set(netlist.pins.map((p) => key(p.x, p.y)));
  const junctionKeys = new Set(doc.junctions.map((j) => key(j.x, j.y)));
  const labelKeys = new Set(doc.labels.map((l) => key(l.x, l.y)));
  const endpointCounts = new Map();
  for (const w of doc.wires) {
    for (const k of [key(w.x1, w.y1), key(w.x2, w.y2)]) {
      endpointCounts.set(k, (endpointCounts.get(k) || 0) + 1);
    }
  }
  for (const [k, count] of endpointCounts) {
    if (count > 1 || pinKeys.has(k) || junctionKeys.has(k) || labelKeys.has(k)) continue;
    const [x, y] = k.split(',').map(Number);
    add({
      code: 'dangling_wire',
      severity: 'warning',
      message: 'A wire ends in mid-air: it stops at a point with no pin, junction or label. Nothing is connected there.',
      points: [{ x, y }],
    });
  }

  // ---- 3. Conflicting power symbols on one net -----------------------------
  for (const net of netlist.nets) {
    const names = [...new Set(net.powerNames)];
    if (names.length > 1) {
      add({
        code: 'power_short',
        severity: 'error',
        message: `${names.join(' and ')} are wired to the same node. That is a direct short between two supplies: the current is limited only by your wiring, and something will get hot.`,
        refs: net.pins.map((p) => p.ref),
        points: net.pins.map((p) => ({ x: p.x, y: p.y })),
      });
    }
  }

  // ---- 4. Rail-to-rail paths with nothing in series ------------------------
  if (supplyNetIds.length && groundNetIds.length) {
    // A zero-edge "path" means a supply net that is itself ground, already
    // reported as power_short, so only paths through real parts count here.
    const hardShort = findPath(adjacency, supplyNetIds, groundNetIds, ['zero']);
    if (hardShort && hardShort.edges.length > 0) {
      const parts = [...new Set(hardShort.edges.map((e) => e.ref))];
      add({
        code: 'rail_short',
        severity: 'error',
        message: `${parts.join(' + ')} connect${parts.length === 1 ? 's' : ''} a supply rail straight to ground with no resistance in the path. When that switch closes it is a dead short across the supply.`,
        refs: parts,
      });
    } else {
      const diodeShort = findPath(adjacency, supplyNetIds, groundNetIds, ['zero', 'diode']);
      if (diodeShort && diodeShort.edges.some((e) => e.kind === 'diode')) {
        const diode = diodeShort.edges.find((e) => e.kind === 'diode');
        const parts = [...new Set(diodeShort.edges.map((e) => e.ref))];
        add({
          code: 'no_current_limit',
          severity: 'error',
          message: `${diode.ref} sits between the supply and ground with no series resistance (path: ${parts.join(' → ')}). A diode does not limit its own current: it will conduct until it destroys itself. Add a series resistor.`,
          refs: parts,
        });
      }
    }
  }

  // ---- 5. Power pins that aren't actually powered --------------------------
  for (const pin of netlist.pins) {
    if (pin.type !== 'power_in') continue;
    if (hasNoConnect(doc, pin) || pinAllowedOpen(pin)) continue;
    const net = netlist.netOf(pin);
    if (!net || !isPinConnected(netlist, pin)) continue; // already reported as floating
    const hasSource = net.isPower || net.pins.some((p) => p.type === 'power_out');
    if (!hasSource) {
      add({
        code: 'unpowered_power_pin',
        severity: 'error',
        message: `${pin.ref} pin ${pin.num} (${pin.name}) is wired to net "${net.name}", which has no supply or ground symbol on it. The chip has no valid supply connection.`,
        refs: [pin.ref],
        points: [{ x: pin.x, y: pin.y }],
      });
      continue;
    }
    /**
     * Supply pin landed on ground (or vice versa), a classic wiring slip.
     *
     * The test is on voltages, not on whether the symbol calls itself a supply
     * or a ground. An op-amp's V− is the low side of its supply, and on a dual
     * rail it belongs on −12V, which is a supply symbol: comparing the labels
     * would flag every correctly drawn dual-supply amplifier. Comparing the
     * voltages gets both cases right, because −12V really is below ground and
     * ground really is below +5V.
     */
    const isGroundName = /^(gnd|vss)/i.test(pin.name);
    const expectsLow = isGroundName || /^(v-|vee)/i.test(pin.name);
    const expectsHigh = /^(vcc|vdd|v\+|vin|in)/i.test(pin.name);
    const volts = net.powerKind === 'ground' ? 0 : net.voltage;

    if (volts === null || volts === undefined) {
      // A rail with no stated voltage (a bare VCC symbol) says nothing about
      // which side it is, so there is nothing to check.
    } else if (expectsLow && volts > 0) {
      add({
        code: 'power_pin_swapped',
        severity: 'error',
        message: isGroundName
          ? `${pin.ref} pin ${pin.num} (${pin.name}) is its ground pin, but you have wired it to ${net.name}. Reversing supply and ground on an IC usually destroys it.`
          : `${pin.ref} pin ${pin.num} (${pin.name}) is the negative side of the part's supply, but you have wired it to ${net.name}. It belongs on ground or on a negative rail, never above the positive supply.`,
        refs: [pin.ref],
        points: [{ x: pin.x, y: pin.y }],
      });
    } else if (expectsHigh && volts <= 0) {
      add({
        code: 'power_pin_swapped',
        severity: 'error',
        message: `${pin.ref} pin ${pin.num} (${pin.name}) is a supply pin but it is wired to ${net.name}. The part has no positive supply.`,
        refs: [pin.ref],
        points: [{ x: pin.x, y: pin.y }],
      });
    }
  }

  // ---- 6. Multi-unit parts missing their power unit ------------------------
  for (const comp of netlist.components) {
    if (!comp.symbol.multiUnit) continue;
    const missingPower = comp.symbol.units.filter(
      (u) => u.isPowerUnit && comp.missingUnitIds.includes(u.id)
    );
    if (missingPower.length) {
      const pwr = missingPower[0];
      const pinList = pwr.pins.map((p) => `${p.name} (pin ${p.num})`).join(' and ');
      add({
        code: 'missing_power_unit',
        severity: 'error',
        message: `${comp.ref} is a ${comp.symbolId}: a real chip that needs power. Its power unit carrying ${pinList} has not been placed, so the package has no supply. Place the ${comp.ref} power unit and wire it.`,
        refs: [comp.ref],
      });
    }
  }

  // ---- 7. Outputs shorted together ----------------------------------------
  for (const net of netlist.nets) {
    const drivers = net.pins.filter((p) => p.type === 'output');
    if (drivers.length > 1) {
      add({
        code: 'output_conflict',
        severity: 'error',
        message: `${drivers.map((d) => `${d.ref} pin ${d.num}`).join(' and ')} are outputs wired to the same net (${net.name}). If one drives high while the other drives low they fight, sinking large current through both. Outputs may only be paralleled when they are open-drain or tri-state.`,
        refs: [...new Set(drivers.map((d) => d.ref))],
        points: drivers.map((d) => ({ x: d.x, y: d.y })),
      });
    }
    const outputToRail = net.isPower && net.pins.some((p) => p.type === 'output');
    if (outputToRail) {
      const out = net.pins.find((p) => p.type === 'output');
      add({
        code: 'output_into_rail',
        severity: 'error',
        message: `${out.ref} pin ${out.num} is an output wired directly to ${net.name}. Whenever the output drives the opposite level it is shorted to the rail.`,
        refs: [out.ref],
        points: [{ x: out.x, y: out.y }],
      });
    }
  }

  // ---- 8. Logic inputs left floating --------------------------------------
  /**
   * Nets the brief says arrive from off the sheet.
   *
   * Some challenges hand the learner a signal, "the logic level arrives on a
   * net labelled DRIVE", and there is nothing on the sheet to drive it,
   * because the driver is not part of the exercise. Without this, following
   * those briefs exactly produced a floating-input error that no amount of
   * correct work could clear. Real EDA tools solve the same problem with a
   * hierarchical port or a power flag; this is the same annotation, declared by
   * the challenge that made the promise.
   */
  const drivenNets = new Set(ercOptions.drivenNets || []);
  const drivenNetIds = netlist.nets
    .filter((n) => n.labels.some((label) => drivenNets.has(label)))
    .map((n) => n.id);
  // A declared net is a source, exactly as a rail is: the base behind a series
  // resistor is driven by whatever drives DRIVE, so the search has to start
  // there too rather than only testing the labelled net itself.
  /**
   * A net an output is driving is a source too.
   *
   * The net a pin sits on is already excused when a driver is on that same
   * net; the search has to carry that through a resistor for the same reason it
   * carries a rail through one. An inverting amplifier is the case that proves
   * it: its inverting input reaches no rail at all, only the op-amp's own
   * output through the feedback resistor, and it is nonetheless the most
   * firmly defined node on the sheet.
   */
  const drivenPinNetIds = netlist.nets
    .filter((n) => n.pins.some((p) => DRIVERS.has(p.type)))
    .map((n) => n.id);
  const railReachable = reachableNets(
    adjacency,
    [...railNetIds, ...drivenNetIds, ...drivenPinNetIds],
    ['zero', 'resistive']
  );
  for (const pin of netlist.pins) {
    if (pin.type !== 'input') continue;
    if (hasNoConnect(doc, pin) || pinAllowedOpen(pin)) continue;
    const net = netlist.netOf(pin);
    if (!net || !isPinConnected(netlist, pin)) continue;
    if (net.isPower) continue;
    if (drivenNetIds.includes(net.id)) continue;
    const hasDriver = net.pins.some((p) => DRIVERS.has(p.type));
    if (hasDriver) continue;
    if (railReachable.has(net.id)) continue;
    add({
      code: 'floating_input',
      severity: 'error',
      message: `${pin.ref} pin ${pin.num} (${pin.name}) sits on net "${net.name}", which nothing drives and which has no path to a rail. A floating CMOS input drifts, picks up noise and can oscillate: give it a defined level with a pull-up or pull-down.`,
      refs: [pin.ref],
      points: [{ x: pin.x, y: pin.y }],
    });
  }

  // ---- 9. Reversed polarised capacitor -------------------------------------
  for (const comp of netlist.components) {
    if (!comp.symbol.polarized || !(comp.symbol.tags || []).includes('capacitor')) continue;
    const plus = comp.pins.find((p) => p.num === '1');
    const minus = comp.pins.find((p) => p.num === '2');
    const netPlus = netlist.netOf(plus);
    const netMinus = netlist.netOf(minus);
    if (!netPlus || !netMinus) continue;
    if (netPlus.powerKind === 'ground' && netMinus.powerKind === 'supply') {
      add({
        code: 'reversed_polarized_cap',
        severity: 'error',
        message: `${comp.ref} is polarised and it is in backwards: its + terminal is on ${netPlus.name} and its − terminal on ${netMinus.name}. Reverse-biasing an electrolytic makes it vent.`,
        refs: [comp.ref],
      });
    }
  }

  /**
   * ---- 10. Net labels attached to nothing ---------------------------------
   *
   * A label a few units off the wire draws exactly like one sitting on it, so
   * this is the only item on a sheet whose entire purpose can fail invisibly.
   * The downstream checks then report three separate topology problems, "no
   * resistor bridges BTN and ground", "they sit on different nodes", none of
   * which is the actual fault, and all of which send the learner to rewire a
   * circuit that was already correct.
   *
   * This replaces a warning that fired whenever a label appeared only once,
   * which was both wrong and actively misleading: naming a node so the
   * specification can refer to it is exactly what these briefs ask for, and the
   * warning told the learner their correct label "connects nothing".
   */
  for (const label of doc.labels) {
    const text = (label.text || '').trim();
    if (!text) continue;
    const net = netlist.nets.find((n) => n.points.includes(key(label.x, label.y)));
    if (net && (net.pins.length > 0 || net.wireCount > 0)) continue;
    add({
      code: 'dangling_label',
      severity: 'error',
      message: `The "${text}" label is not touching a wire or a pin, so it names nothing: the net it is supposed to identify does not exist. Drag it onto the node you meant to name.`,
      points: [{ x: label.x, y: label.y }],
    });
  }

  // ---- 11. No ground reference at all --------------------------------------
  if (netlist.signalComponents().length > 0 && groundNetIds.length === 0) {
    add({
      code: 'no_ground',
      severity: 'error',
      message: 'There is no ground symbol anywhere in the circuit. Every voltage is measured relative to something: without a ground reference there is no return path and no defined levels.',
    });
  }

  return dedupe(issues);
}

function floatingConsequence(pin) {
  switch (pin.type) {
    case 'input':
      return ' A floating input has no defined logic level; it will pick up noise and switch at random.';
    case 'power_in':
      return ' That is a supply pin: the part has no power.';
    case 'output':
      return ' The stage does nothing until its output goes somewhere.';
    default:
      return ' Current cannot flow through a component with an open terminal.';
  }
}

function dedupe(issues) {
  const seen = new Set();
  const out = [];
  for (const issue of issues) {
    const k = `${issue.code}|${issue.message}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(issue);
  }
  // Errors first, then warnings, the panel renders in this order.
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}
