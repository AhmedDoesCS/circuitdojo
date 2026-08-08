/**
 * The requirement-check DSL.
 *
 * A challenge's `requirements_schema` is data, not code, so it can live in
 * Postgres (jsonb) and be authored without touching the engine. Each check is
 * an object with a `kind` plus kind-specific fields, and every kind is
 * implemented here as a pure function over the extracted netlist.
 *
 *   { kind: 'series', a: {type:'D_LED'}, b: {type:'resistor'},
 *     label: 'LED has a series current-limiting resistor',
 *     fail: 'Your LED and resistor are not in series: ...' }
 *
 * A check returns:
 *   { passed, detail?, classify?: 'missing'|'wrong' }
 *
 * `classify` lets the feedback panel separate "you never added the decoupling
 * capacitor the spec asked for" (missing) from "your resistor is in the wrong
 * place" (wrong), the distinction Section 5c cares about.
 *
 * SELECTORS
 * ---------
 * Many checks take a selector describing which components they mean:
 *   { type: 'resistor' }                              by symbol id or tag
 *   { type: 'resistor', pin: '1' }                    a specific pin
 *   { type: 'resistor', inSeriesWith: {type:'D_LED'} }
 *   { type: 'resistor', between: [ {type:'OPAMP',pin:'OUT'}, {type:'OPAMP',pin:'IN-'} ] }
 *   { rail: 'ground' | 'supply' | '+5V' }             a power net rather than a part
 */

import { parseValue, formatValue } from '../schematic/units.js';
import { findPath } from './graph.js';

// ---------------------------------------------------------------------------
// Selector resolution
// ---------------------------------------------------------------------------

/** Components matching a selector's `type`. */
export function selectComponents(ctx, sel) {
  if (!sel || !sel.type) return [];
  let comps = ctx.netlist.find(sel.type);

  if (sel.inSeriesWith) {
    const others = ctx.netlist.find(sel.inSeriesWith.type);
    comps = comps.filter((c) =>
      others.some((o) => o.ref !== c.ref && ctx.netlist.sharedNets(c.ref, o.ref, { exclusive: true }).length > 0)
    );
  }

  if (sel.between) {
    const [endA, endB] = sel.between;
    const netsA = resolveNets(ctx, endA);
    const netsB = resolveNets(ctx, endB);
    comps = comps.filter((c) => {
      const pinNets = c.pins.map((p) => p.netId);
      return netsA.some((n) => pinNets.includes(n.id)) && netsB.some((n) => pinNets.includes(n.id));
    });
  }

  if (sel.connectedTo) {
    const nets = resolveNets(ctx, sel.connectedTo);
    comps = comps.filter((c) => c.pins.some((p) => nets.some((n) => n.id === p.netId)));
  }

  if (typeof sel.index === 'number') {
    const one = comps[sel.index];
    return one ? [one] : [];
  }
  return comps;
}

/** Nets a selector refers to: either a rail, or the nets touching given pins. */
export function resolveNets(ctx, sel) {
  if (!sel) return [];
  const { netlist } = ctx;

  if (sel.rail) {
    if (sel.rail === 'ground') return netlist.groundNets();
    if (sel.rail === 'supply') return netlist.supplyNets();
    if (sel.rail === 'any_power') return netlist.nets.filter((n) => n.isPower);
    const named = netlist.nets.filter((n) => n.powerNames.includes(sel.rail) || n.name === sel.rail);
    return named;
  }

  if (sel.net) {
    const n = netlist.netByName(sel.net);
    return n ? [n] : [];
  }

  const comps = selectComponents(ctx, sel);
  const nets = [];
  for (const comp of comps) {
    for (const pin of comp.pins) {
      if (sel.pin && pin.num !== String(sel.pin) && pin.name !== sel.pin) continue;
      const net = netlist.netById(pin.netId);
      if (net && !nets.includes(net)) nets.push(net);
    }
  }
  return nets;
}

/** Human wording for a selector, used to build default messages. */
export function describeSelector(ctx, sel) {
  if (!sel) return 'that node';
  if (sel.rail === 'ground') return 'ground';
  if (sel.rail === 'supply') return 'the supply rail';
  if (sel.rail) return sel.rail;
  if (sel.net) return `net ${sel.net}`;
  const label = sel.label || typeLabel(sel.type);
  return sel.pin ? `${label} pin ${sel.pin}` : label;
}

const TYPE_LABELS = {
  resistor: 'a resistor',
  capacitor: 'a capacitor',
  led: 'the LED',
  D_LED: 'the LED',
  diode: 'a diode',
  switch: 'the switch',
  SW_PUSH: 'the pushbutton',
  SW_SPST: 'the switch',
  opamp: 'the op-amp',
  logic: 'the logic IC',
  mcu: 'the microcontroller',
  potentiometer: 'the potentiometer',
};

function typeLabel(type) {
  return TYPE_LABELS[type] || `a ${type}`;
}

// ---------------------------------------------------------------------------
// Check implementations
// ---------------------------------------------------------------------------

const CHECKS = {
  /** N components of a type must be present. */
  component_count(ctx, check) {
    const comps = selectComponents(ctx, check);
    const n = comps.length;
    const min = check.min ?? 1;
    const max = check.max ?? Infinity;
    if (n < min) {
      return {
        passed: false,
        classify: 'missing',
        detail: `Found ${n}; the specification calls for ${min === max ? min : `at least ${min}`}.`,
      };
    }
    if (n > max) {
      return {
        passed: false,
        classify: 'wrong',
        detail: `Found ${n}, which is more than the ${max} the specification allows. Extra parts change the circuit's behaviour.`,
      };
    }
    return { passed: true, detail: `${n} placed.` };
  },

  /** Two parts must meet at a node shared by nobody else, a true series pair. */
  series(ctx, check) {
    const as = selectComponents(ctx, check.a);
    const bs = selectComponents(ctx, check.b);
    if (!as.length || !bs.length) {
      return { passed: false, classify: 'missing', detail: missingDetail(ctx, as.length ? check.b : check.a) };
    }
    for (const a of as) {
      for (const b of bs) {
        if (a.ref === b.ref) continue;
        const shared = ctx.netlist.sharedNets(a.ref, b.ref, { exclusive: true });
        for (const s of shared) {
          const aOk = !check.a.pin || s.aPins.some((p) => p.num === String(check.a.pin) || p.name === check.a.pin);
          const bOk = !check.b.pin || s.bPins.some((p) => p.num === String(check.b.pin) || p.name === check.b.pin);
          if (aOk && bOk) return { passed: true, detail: `${a.ref} and ${b.ref} share node ${s.net.name}.` };
        }
      }
    }
    // Distinguish "touching but not in series" from "not connected at all".
    const touching = as.some((a) => bs.some((b) => ctx.netlist.sharedNets(a.ref, b.ref).length > 0));
    return {
      passed: false,
      classify: 'wrong',
      detail: touching
        ? 'They do meet, but the node they share also carries other connections, so they are not in series: current has somewhere else to go.'
        : 'They are not connected to each other at all.',
    };
  },

  /**
   * EVERY component matching `a` must have its own series partner matching `b`.
   * This is what catches "two LEDs sharing one resistor": the shared node is
   * no longer exclusive, so the pairing fails.
   */
  each_series(ctx, check) {
    const as = selectComponents(ctx, check.a);
    const bs = selectComponents(ctx, check.b);
    if (!as.length) return { passed: false, classify: 'missing', detail: missingDetail(ctx, check.a) };
    if (!bs.length) return { passed: false, classify: 'missing', detail: missingDetail(ctx, check.b) };

    const used = new Set();
    const unmatched = [];
    for (const a of as) {
      const partner = bs.find(
        (b) => !used.has(b.ref) && b.ref !== a.ref && ctx.netlist.sharedNets(a.ref, b.ref, { exclusive: true }).length > 0
      );
      if (partner) used.add(partner.ref);
      else unmatched.push(a.ref);
    }
    if (!unmatched.length) return { passed: true, detail: `Each ${check.a.type} has its own series partner.` };
    return {
      passed: false,
      classify: 'wrong',
      detail: `${unmatched.join(', ')} ${unmatched.length === 1 ? 'does' : 'do'} not have a dedicated series ${check.b.label || check.b.type}. Sharing one between two branches means the current through each depends on the other: they have to be independent.`,
    };
  },

  /** Two things must sit on the same net (not necessarily exclusively). */
  connected(ctx, check) {
    const netsA = resolveNets(ctx, check.a);
    const netsB = resolveNets(ctx, check.b);
    if (!netsA.length || !netsB.length) {
      const missingSide = !netsA.length ? check.a : check.b;
      return { passed: false, classify: missingSide.rail ? 'wrong' : 'missing', detail: missingDetail(ctx, missingSide) };
    }
    const hit = netsA.find((na) => netsB.some((nb) => nb.id === na.id));
    if (hit) return { passed: true, detail: `Both land on net ${hit.name}.` };
    return {
      passed: false,
      classify: 'wrong',
      detail: `${describeSelector(ctx, check.a)} is on net ${netsA[0].name}; ${describeSelector(ctx, check.b)} is on net ${netsB.map((n) => n.name).join('/')}. They never meet.`,
    };
  },

  /** Two things must NOT share a net. */
  not_connected(ctx, check) {
    const netsA = resolveNets(ctx, check.a);
    const netsB = resolveNets(ctx, check.b);
    const hit = netsA.find((na) => netsB.some((nb) => nb.id === na.id));
    if (!hit) return { passed: true };
    return {
      passed: false,
      classify: 'wrong',
      detail: `${describeSelector(ctx, check.a)} and ${describeSelector(ctx, check.b)} are both on net ${hit.name}; the specification requires them to stay separate.`,
    };
  },

  /**
   * Several things must all meet at ONE node. This is how topology
   * requirements like "the switch, the pull-down and the gate input must all
   * meet at the same node" are expressed: the wrong answer (parts in series)
   * fails because the pins land on different nets.
   */
  common_node(ctx, check) {
    const memberNets = check.members.map((m) => ({ member: m, nets: resolveNets(ctx, m) }));
    const missing = memberNets.find((m) => m.nets.length === 0);
    if (missing) {
      return {
        passed: false,
        classify: missing.member.rail ? 'wrong' : 'missing',
        detail: missingDetail(ctx, missing.member),
      };
    }
    // Every candidate net of the first member is a possible meeting point.
    for (const candidate of memberNets[0].nets) {
      if (memberNets.every((m) => m.nets.some((n) => n.id === candidate.id))) {
        return { passed: true, detail: `They all meet at net ${candidate.name}.` };
      }
    }
    const summary = memberNets
      .map((m) => `${describeSelector(ctx, m.member)} → ${m.nets.map((n) => n.name).join('/')}`)
      .join('; ');
    return {
      passed: false,
      classify: 'wrong',
      detail: `They sit on different nodes (${summary}). The specification needs them tied to the same node.`,
    };
  },

  /** Passes when ANY listed sub-check passes, for genuinely equivalent answers. */
  any_of(ctx, check) {
    const results = check.checks.map((sub) => ({ sub, result: runCheck(ctx, sub) }));
    const hit = results.find((r) => r.result.passed);
    if (hit) return { passed: true, detail: hit.result.detail };
    const allMissing = results.every((r) => r.result.classify === 'missing');
    return {
      passed: false,
      classify: allMissing ? 'missing' : 'wrong',
      detail: results.map((r) => r.result.detail).filter(Boolean)[0] || '',
    };
  },

  /**
   * A component's value must land inside a range (usually a computed target).
   * `all: true` requires every matching component to be in range, rather than
   * just one of them.
   */
  value_range(ctx, check) {
    const comps = selectComponents(ctx, check);
    if (!comps.length) return { passed: false, classify: 'missing', detail: missingDetail(ctx, check) };
    const unit = check.unit || '';
    const matching = comps.filter((c) => {
      const v = parseValue(c.value);
      return v !== null && v >= check.min && v <= check.max;
    });
    if (check.all ? matching.length === comps.length : matching.length > 0) {
      return { passed: true, detail: comps.map((c) => `${c.ref} = ${c.value}`).join(', ') + '.' };
    }
    const shown = comps.map((c) => `${c.ref} = ${c.value || '(no value)'}`).join(', ');
    const unparsed = comps.every((c) => parseValue(c.value) === null);
    return {
      passed: false,
      classify: 'wrong',
      detail: unparsed
        ? `No usable value is set (${shown}). Type the value into the component's Value field: e.g. "220" or "4k7".`
        : `You have ${shown}. The acceptable range here is ${formatValue(check.min, unit)} to ${formatValue(check.max, unit)}.`,
    };
  },

  /** Ratio between two component values: op-amp gain, divider ratio, ... */
  value_ratio(ctx, check) {
    const as = selectComponents(ctx, check.a);
    const bs = selectComponents(ctx, check.b);
    if (!as.length || !bs.length) {
      return { passed: false, classify: 'missing', detail: missingDetail(ctx, as.length ? check.b : check.a) };
    }
    for (const a of as) {
      for (const b of bs) {
        const va = parseValue(a.value);
        const vb = parseValue(b.value);
        if (va === null || vb === null || vb === 0) continue;
        const ratio = va / vb;
        if (ratio >= check.min && ratio <= check.max) {
          return { passed: true, detail: `${a.ref}/${b.ref} = ${ratio.toFixed(2)}.` };
        }
      }
    }
    const va = parseValue(as[0].value);
    const vb = parseValue(bs[0].value);
    const actual = va !== null && vb ? (va / vb).toFixed(2) : 'undefined';
    return {
      passed: false,
      classify: 'wrong',
      detail: `Your ratio is ${actual} (${as[0].ref} = ${as[0].value || '?'}, ${bs[0].ref} = ${bs[0].value || '?'}). It needs to fall between ${check.min} and ${check.max}.`,
    };
  },

  /**
   * A pull resistor: one leg on a rail, the other on the node being pulled.
   * Passing this proves the resistor is a pull, not a series element.
   */
  pull_resistor(ctx, check) {
    const resistors = ctx.netlist.find(check.type || 'resistor');
    if (!resistors.length) return { passed: false, classify: 'missing', detail: 'No resistor is placed.' };
    const railNets = resolveNets(ctx, { rail: check.rail });
    const nodeNets = resolveNets(ctx, check.node);
    if (!railNets.length) {
      return {
        passed: false,
        classify: 'missing',
        detail: `There is no ${check.rail === 'ground' ? 'ground' : check.rail} symbol to pull to.`,
      };
    }
    if (!nodeNets.length) {
      return { passed: false, classify: 'missing', detail: missingDetail(ctx, check.node) };
    }
    for (const r of resistors) {
      const nets = r.pins.map((p) => p.netId);
      const onRail = nets.some((id) => railNets.some((n) => n.id === id));
      const onNode = nets.some((id) => nodeNets.some((n) => n.id === id));
      if (onRail && onNode) {
        const inRange =
          check.min === undefined ||
          (parseValue(r.value) !== null && parseValue(r.value) >= check.min && parseValue(r.value) <= check.max);
        if (!inRange) {
          return {
            passed: false,
            classify: 'wrong',
            detail: `${r.ref} is wired correctly as a pull ${check.rail === 'ground' ? 'down' : 'up'}, but ${r.value || 'its value'} is outside the ${formatValue(check.min, 'Ω')}-${formatValue(check.max, 'Ω')} range this circuit calls for.`,
          };
        }
        return { passed: true, detail: `${r.ref} pulls the node to ${check.rail === 'ground' ? 'GND' : 'the rail'}.` };
      }
    }
    return {
      passed: false,
      classify: 'wrong',
      detail: `No resistor bridges ${describeSelector(ctx, check.node)} and ${check.rail === 'ground' ? 'ground' : 'the supply rail'}. A pull resistor must have one leg on the node and the other on the rail: if both legs are in the signal path it is a series resistor, not a pull.`,
    };
  },

  /** A decoupling capacitor across an IC's own supply pins. */
  decoupling(ctx, check) {
    const ics = ctx.netlist.find(check.ic);
    if (!ics.length) return { passed: false, classify: 'missing', detail: missingDetail(ctx, { type: check.ic }) };
    const caps = ctx.netlist.find('capacitor');
    for (const ic of ics) {
      const vccPin = ic.pins.find((p) => p.type === 'power_in' && /^(vcc|vdd|v\+)/i.test(p.name));
      const gndPin = ic.pins.find((p) => p.type === 'power_in' && /^(gnd|vss|v-)/i.test(p.name));
      if (!vccPin || !gndPin) continue;
      const hit = caps.find((c) => {
        const nets = c.pins.map((p) => p.netId);
        if (!(nets.includes(vccPin.netId) && nets.includes(gndPin.netId))) return false;
        if (check.min === undefined) return true;
        const v = parseValue(c.value);
        return v !== null && v >= check.min && v <= check.max;
      });
      if (!hit) {
        const anyCapAcross = caps.some((c) => {
          const nets = c.pins.map((p) => p.netId);
          return nets.includes(vccPin.netId) && nets.includes(gndPin.netId);
        });
        return {
          passed: false,
          classify: caps.length === 0 ? 'missing' : 'wrong',
          detail: anyCapAcross
            ? `There is a capacitor across ${ic.ref}'s supply pins, but its value is outside ${formatValue(check.min, 'F')}-${formatValue(check.max, 'F')}. 100nF is the standard choice.`
            : `Nothing decouples ${ic.ref}. Every IC needs a capacitor directly between its own VCC and GND pins to supply the fast current spikes its outputs draw when they switch: without it the local supply dips and the chip misbehaves.`,
        };
      }
    }
    return { passed: true, detail: 'Supply pins are decoupled.' };
  },

  /**
   * A DC path must exist between two points through allowed element kinds
   * (and, optionally, must NOT exist through forbidden ones).
   */
  path(ctx, check) {
    const from = resolveNets(ctx, check.from).map((n) => n.id);
    const to = resolveNets(ctx, check.to).map((n) => n.id);
    if (!from.length || !to.length) {
      return { passed: false, classify: 'missing', detail: missingDetail(ctx, from.length ? check.to : check.from) };
    }
    const found = findPath(ctx.adjacency, from, to, check.through || ['zero', 'resistive', 'diode']);
    if (check.forbidden) {
      return found
        ? {
            passed: false,
            classify: 'wrong',
            detail: `There is a direct path from ${describeSelector(ctx, check.from)} to ${describeSelector(ctx, check.to)} through ${[...new Set(found.edges.map((e) => e.ref))].join(' → ')}, which this design must not have.`,
          }
        : { passed: true };
    }
    return found
      ? {
          passed: true,
          detail: found.edges.length
            ? `Path: ${[...new Set(found.edges.map((e) => e.ref))].join(' → ')}.`
            : 'Directly connected.',
        }
      : {
          passed: false,
          classify: 'wrong',
          detail: `No current path exists from ${describeSelector(ctx, check.from)} to ${describeSelector(ctx, check.to)}. Trace it with your finger: every element in that path has to be wired end to end.`,
        };
  },

  /** How many pins of a given type land on a node, e.g. "one gate input only". */
  net_pin_count(ctx, check) {
    const nets = resolveNets(ctx, check.node);
    if (!nets.length) return { passed: false, classify: 'missing', detail: missingDetail(ctx, check.node) };
    const net = nets[0];
    const n = net.pins.length;
    const min = check.min ?? 0;
    const max = check.max ?? Infinity;
    if (n >= min && n <= max) return { passed: true, detail: `${n} pins on ${net.name}.` };
    return {
      passed: false,
      classify: 'wrong',
      detail: `Net ${net.name} has ${n} connections; this node should have ${min === max ? min : `${min}-${max === Infinity ? 'many' : max}`}.`,
    };
  },

  /** Every placed IC's supply pins must reach a rail (topology, not ERC severity). */
  ic_powered(ctx, check) {
    const ics = ctx.netlist.find(check.type);
    if (!ics.length) return { passed: false, classify: 'missing', detail: missingDetail(ctx, { type: check.type }) };
    for (const ic of ics) {
      const supplyPins = ic.pins.filter((p) => p.type === 'power_in');
      if (!supplyPins.length) continue;
      const unpowered = supplyPins.filter((p) => {
        const net = ctx.netlist.netById(p.netId);
        return !net || !net.isPower;
      });
      if (unpowered.length) {
        return {
          passed: false,
          classify: 'wrong',
          detail: `${ic.ref} pin ${unpowered[0].num} (${unpowered[0].name}) does not reach a power symbol. On a real board that pin is what actually feeds the silicon: the gate symbols on your sheet are just parts of the same chip.`,
        };
      }
    }
    return { passed: true, detail: 'Supply pins are wired to rails.' };
  },
};

/**
 * Why a selector found nothing.
 *
 * "Net BTN is not in your schematic" is false, and infuriating: when there
 * is a BTN label sitting right there on the sheet. It names nothing because it
 * is not touching a wire, and that is a completely different problem with a
 * completely different fix. A label that does not attach looks identical to one
 * that does, so the checker is the only thing in a position to say so.
 */
function missingDetail(ctx, sel) {
  if (sel?.net) {
    const dangling = danglingLabel(ctx, sel.net);
    if (dangling) {
      return `There is a ${sel.net} label on your sheet, but it is not attached to anything: it sits at ${Math.round(
        dangling.x / 10
      )}, ${Math.round(dangling.y / 10)} with no wire or pin under it, so it names nothing. Move it onto the node it is meant to name.`;
    }
  }
  return `${capitalize(describeSelector(ctx, sel))} is not in your schematic.`;
}

/** A label with this text whose net carries nothing else. */
function danglingLabel(ctx, text) {
  const label = (ctx.doc?.labels || []).find((l) => (l.text || '').trim() === text);
  if (!label) return null;
  const net = ctx.netlist.netByName(text);
  if (net && (net.pins.length > 0 || net.wireCount > 0)) return null;
  return label;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Run one check; unknown kinds fail loudly rather than silently passing. */
export function runCheck(ctx, check) {
  const fn = CHECKS[check.kind];
  if (!fn) {
    return { passed: false, classify: 'wrong', detail: `Unknown check kind "${check.kind}".` };
  }
  try {
    return fn(ctx, check);
  } catch (err) {
    return { passed: false, classify: 'wrong', detail: `Check failed to evaluate: ${err.message}` };
  }
}

export const CHECK_KINDS = Object.keys(CHECKS);
