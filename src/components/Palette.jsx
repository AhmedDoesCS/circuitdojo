import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SYMBOLS, symbolsByCategory, searchSymbols, getSymbol } from '../schematic/symbols/index.js';
import SymbolView from './SymbolView.jsx';
import { unitBounds } from '../schematic/model.js';
import Widget from './Widget.jsx';

/**
 * Component palette.
 *
 * Multi-unit parts expand into their units (A, B, ... plus PWR): placing the
 * power unit has to be a conscious act, because on a real board it is one chip
 * and those two pins are what actually feed the silicon.
 */

function SymbolThumb({ symbolId, unitId, size = 42 }) {
  const symbol = getSymbol(symbolId);
  const unit = symbol.units.find((u) => u.id === unitId) || symbol.units[0];
  const b = unitBounds(unit);
  const pad = 12;
  const w = Math.max(b.maxX - b.minX, 40) + pad * 2;
  const h = Math.max(b.maxY - b.minY, 40) + pad * 2;
  const component = { id: 'thumb', symbolId, unitId: unit.id, ref: '', value: '', x: 0, y: 0, rot: 0, mirror: false };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${b.minX - pad} ${b.minY - pad} ${w} ${h}`}
      /* The preview tile is a miniature of the sheet, so it takes the sheet's
         own colour. Hardcoding paper here left the symbols on a light tile in
         dark mode, where the pin numbers inherit near-white text and vanish. */
      className="shrink-0 rounded-chip sheet"
    >
      <SymbolView component={component} showAnnotations={false} />
    </svg>
  );
}

function PaletteEntry({ symbol, unit, active, onPick }) {
  const multi = symbol.multiUnit;
  const label = multi ? `${symbol.id} [${unit.id}]` : symbol.name;
  const sub = multi
    ? unit.isPowerUnit
      ? `power unit: ${unit.pins.map((p) => `${p.name} ${p.num}`).join(', ')}`
      : `unit ${unit.id}: pins ${unit.pins.map((p) => p.num).join('/')}`
    : symbol.id;

  return (
    <button
      onClick={() => onPick(symbol.id, unit.id)}
      className={`flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left transition-all duration-200 ease-smooth active:scale-[0.98] ${
        active ? 'bg-accent/12 ring-1 ring-accent/40' : 'hover:bg-zinc-950/[0.045]'
      }`}
      title={symbol.help || symbol.name}
    >
      <SymbolThumb symbolId={symbol.id} unitId={unit.id} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-ink-950">{label}</span>
        <span className="block truncate text-[11px] text-ink-500">{sub}</span>
      </span>
    </button>
  );
}

export default function Palette({ placing, onPick, onClose, filter = null }) {
  const [query, setQuery] = useState('');
  const [openCategories, setOpenCategories] = useState(() => new Set(['Passives', 'Power']));
  const searchRef = useRef(null);

  // The A / P shortcuts jump straight here with the search focused, so parts
  // can be placed without ever touching the mouse.
  useEffect(() => {
    if (!filter) return;
    setQuery(filter.query || '');
    searchRef.current?.focus();
    searchRef.current?.select();
  }, [filter]);

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchSymbols(query) : SYMBOLS), [query, searching]);
  const categories = useMemo(() => symbolsByCategory(), []);

  const entriesFor = (symbol) =>
    symbol.units.map((unit) => (
      <PaletteEntry
        key={`${symbol.id}:${unit.id}`}
        symbol={symbol}
        unit={unit}
        active={placing?.symbolId === symbol.id && placing?.unitId === unit.id}
        onPick={onPick}
      />
    ));

  return (
    <Widget
      title="Components"
      onClose={onClose}
      className="max-h-[min(34rem,calc(100vh-9rem))] w-[17.5rem]"
      bodyClassName="px-2 pb-2"
    >
      <div className="sticky top-0 z-10 surface-2 px-1 pb-2 pt-2">
        <input
          ref={searchRef}
          className="field"
          placeholder="Search parts...  (A)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter places the first match: keyboard-only part placement.
            if (e.key === 'Enter') {
              const first = (query.trim() ? searchSymbols(query) : SYMBOLS)[0];
              if (first) {
                onPick(first.id, first.units[0].id);
                e.currentTarget.blur();
              }
            } else if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
        />
      </div>

      {searching ? (
        <div className="space-y-0.5">
          {results.length === 0 && <p className="px-2 py-4 text-[13px] text-ink-500">No parts match "{query}".</p>}
          {results.map((symbol) => entriesFor(symbol))}
        </div>
      ) : (
        categories.map(([category, symbols]) => {
          const open = openCategories.has(category);
          return (
            <div key={category} className="mb-0.5">
              <button
                className="flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500 transition-colors hover:bg-zinc-950/[0.04]"
                onClick={() =>
                  setOpenCategories((prev) => {
                    const next = new Set(prev);
                    if (next.has(category)) next.delete(category);
                    else next.add(category);
                    return next;
                  })
                }
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={`transition-transform duration-200 ease-smooth ${open ? 'rotate-90' : ''}`}
                >
                  <path d="M4 2.5L8 6L4 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {category}
                <span className="ml-auto font-normal text-ink-400">{symbols.length}</span>
              </button>
              {open && <div className="space-y-0.5 pb-1.5">{symbols.map((symbol) => entriesFor(symbol))}</div>}
            </div>
          );
        })
      )}

      <p className="border-t border-zinc-950/10 px-2 pt-2 text-[11px] leading-relaxed text-ink-500">
        Click a part, then click the sheet or press <Kbd>Enter</Kbd>. <Kbd>R</Kbd> rotates, <Kbd>X</Kbd> mirrors,{' '}
        <Kbd>Ins</Kbd> repeats, <Kbd>Esc</Kbd> cancels.
      </p>
    </Widget>
  );
}

function Kbd({ children }) {
  return (
    <kbd className="rounded border border-zinc-950/10 bg-zinc-950/[0.04] px-1 font-sans text-[10px] text-ink-700">
      {children}
    </kbd>
  );
}
