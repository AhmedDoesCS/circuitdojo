/**
 * Symbol registry.
 *
 * A symbol definition looks like:
 * {
 *   id, name, refPrefix, category, tags[], defaultValue, valueUnit, valueKind,
 *   multiUnit?, isPower?, power?: {netName, kind, voltage},
 *   zeroImpedance?: bool     // closed switches/jumpers: used by short detection
 *   units: [{ id, isPowerUnit?, graphics[], pins[] }]
 * }
 *
 * Requirement checks refer to components by `type`, which matches either the
 * symbol id ("74HC08") or any of its tags ("resistor", "led", "logic").
 */

import { passiveSymbols } from './passives.js';
import { powerSymbols } from './power.js';
import { logicSymbols } from './logic.js';
import { analogSymbols } from './analog.js';
import { icSymbols, sensorSymbols } from './ics.js';
import { extendedSymbols } from './extended.js';

export const SYMBOLS = [
  ...passiveSymbols,
  ...powerSymbols,
  ...logicSymbols,
  ...analogSymbols,
  ...icSymbols,
  ...sensorSymbols,
  ...extendedSymbols,
];

const BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]));

export function getSymbol(id) {
  return BY_ID.get(id) || null;
}

export function getUnit(symbolId, unitId) {
  const sym = getSymbol(symbolId);
  if (!sym) return null;
  return sym.units.find((u) => u.id === unitId) || sym.units[0];
}

export function getPin(symbolId, unitId, pinNum) {
  const unit = getUnit(symbolId, unitId);
  if (!unit) return null;
  return unit.pins.find((p) => p.num === String(pinNum)) || null;
}

/** Does this symbol match a requirement `type` (symbol id or tag)? */
export function symbolMatches(symbol, type) {
  if (!symbol || !type) return false;
  if (symbol.id === type) return true;
  return (symbol.tags || []).includes(type);
}

/** Categories in palette display order. */
export const CATEGORY_ORDER = [
  'Passives',
  'Discretes',
  'Switches',
  'Power',
  'Logic',
  'Analog',
  'ICs',
  'Sensors',
  'Mechatronics',
  'Protection',
  'Sources',
  'Connectors',
];

export function symbolsByCategory() {
  const groups = new Map();
  for (const cat of CATEGORY_ORDER) groups.set(cat, []);
  for (const sym of SYMBOLS) {
    if (!groups.has(sym.category)) groups.set(sym.category, []);
    groups.get(sym.category).push(sym);
  }
  return [...groups.entries()].filter(([, list]) => list.length > 0);
}

/** Free-text palette search across name, id and keywords. */
export function searchSymbols(query) {
  const q = query.trim().toLowerCase();
  if (!q) return SYMBOLS;
  return SYMBOLS.filter((s) => {
    const hay = [s.id, s.name, ...(s.keywords || []), ...(s.tags || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

/** Pin electrical types that can source a logic level onto a net. */
export const DRIVER_PIN_TYPES = new Set(['output', 'tri_state', 'bidirectional', 'power_out']);
/** Pin types that only listen. */
export const SINK_PIN_TYPES = new Set(['input', 'power_in']);
