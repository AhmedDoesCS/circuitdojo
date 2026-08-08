import React, { useEffect, useRef, useState } from 'react';
import { getSymbol } from '../schematic/symbols/index.js';
import { parseValue, formatValue } from '../schematic/units.js';
import Widget from './Widget.jsx';

/**
 * Properties for the current selection: reference designator, value, and the
 * part's own quick-reference note.
 *
 * Renaming a reference designator renames every unit of that package, because
 * on a real board they are one chip.
 *
 * ## Why editing does not need confirming
 *
 * These fields used to commit on blur alone, which quietly lost work: clicking
 * the sheet clears the selection, the panel re-renders without the input, and
 * **removing a focused element does not fire `blur`**: so the edit went
 * nowhere and the field appeared to reset. Typing a value and clicking back on
 * the canvas is the single most common thing anyone does here.
 *
 * So the draft is also committed when the panel *leaves* the component: an
 * effect keyed on the component id captures that component, and its cleanup
 * writes whatever is in the draft. That fires on deselect, on selecting a
 * different part, and on the widget closing, every exit that blur misses.
 */
export default function PropertiesPanel({ schematic, onClose }) {
  const { doc, selection } = schematic;
  const selected = doc.components.filter((c) => selection.includes(c.id));
  const selectedLabel = doc.labels.find((l) => selection.includes(l.id));

  const component = selected.length === 1 ? selected[0] : null;
  const symbol = component ? getSymbol(component.symbolId) : null;

  const [ref, setRef] = useState('');
  const [value, setValue] = useState('');
  const [labelText, setLabelText] = useState('');

  useEffect(() => {
    setRef(component?.ref ?? '');
    setValue(component?.value ?? '');
  }, [component?.id, component?.ref, component?.value]);

  useEffect(() => {
    setLabelText(selectedLabel?.text ?? '');
  }, [selectedLabel?.id, selectedLabel?.text]);

  /* The draft, and the live schematic, read from cleanup functions that were
     created a render ago: refs rather than closures, so they are never stale. */
  const draft = useRef({ ref: '', value: '', labelText: '' });
  draft.current = { ref, value, labelText };
  const live = useRef(schematic);
  live.current = schematic;

  /** Write the draft back to `target`, doing nothing if it is unchanged. */
  const commitComponent = (target, sym) => {
    if (!target) return;
    const nextRef = draft.current.ref.trim();
    if (nextRef && nextRef !== target.ref) live.current.renameRef(target.ref, nextRef);

    const nextValue = draft.current.value.trim();
    if (nextValue !== (target.value ?? '')) {
      // A multi-unit package carries one value across all its units.
      const targets = sym?.multiUnit
        ? live.current.doc.components.filter((c) => c.ref === target.ref)
        : [target];
      for (const t of targets) live.current.update(t.id, { value: nextValue });
    }
  };

  // Commit on the way out: deselect, select-something-else, or widget close.
  useEffect(() => {
    const target = component;
    const sym = symbol;
    if (!target) return undefined;
    return () => commitComponent(target, sym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component?.id]);

  useEffect(() => {
    const target = selectedLabel;
    if (!target) return undefined;
    return () => {
      const next = draft.current.labelText.trim();
      if (next && next !== target.text) live.current.update(target.id, { text: next });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabel?.id]);

  const shell = (children, subtitle) => (
    <Widget title="Properties" subtitle={subtitle} onClose={onClose} className="w-[17.5rem]" bodyClassName="px-4 py-3">
      {children}
    </Widget>
  );

  if (selectedLabel) {
    return shell(
      <>
        <label className="widget-title">Net name</label>
        <input
          className="field mt-1.5"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          onBlur={() => schematic.update(selectedLabel.id, { text: labelText.trim() || selectedLabel.text })}
          data-prop-field="label"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-600">
          Labels with identical names are the same net, anywhere on the sheet. Unlike a power symbol, a label does
          not supply anything, it only names a connection.
        </p>
      </>,
      'Net label'
    );
  }

  if (!component) {
    return shell(
      <p className="text-[12.5px] leading-relaxed text-ink-600">
        {selection.length > 1
          ? `${selection.length} items selected. Rotate, mirror or delete them from the tool bar.`
          : 'Select a component to edit its reference designator and value.'}
      </p>
    );
  }

  const numeric = parseValue(value);
  const isPower = symbol?.isPower;
  const unitCount = symbol?.units.length ?? 1;
  const placedUnits = doc.components.filter((c) => c.ref === component.ref).map((c) => c.unitId);

  return shell(
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-medium text-ink-950">{symbol?.name}</span>
        {symbol?.multiUnit && (
          <span className="chip shrink-0 bg-zinc-950/[0.05] text-ink-600">
            unit {component.unitId}/{unitCount}
          </span>
        )}
      </div>

      {!isPower && (
        <div>
          <label className="widget-title">Reference</label>
          <input
            data-prop-field="reference"
            className="field mt-1.5"
            value={ref}
            onChange={(e) => setRef(e.target.value.toUpperCase())}
            onBlur={() => {
              if (!ref.trim()) setRef(component.ref);
              else commitComponent(component, symbol);
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
      )}

      <div>
        <label className="widget-title">
          {isPower ? 'Net name' : symbol?.valueKind === 'part' ? 'Part' : 'Value'}
        </label>
        <input
          data-prop-field="value"
          className="field mt-1.5"
          value={value}
          placeholder={symbol?.defaultValue}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commitComponent(component, symbol)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        {numeric !== null && symbol?.valueUnit && (
          <p className="mt-1 text-[11.5px] text-ink-500">= {formatValue(numeric, symbol.valueUnit)}</p>
        )}
        {numeric === null && symbol?.valueKind !== 'part' && symbol?.valueKind !== 'net' && value && (
          <p className="mt-1 text-[11.5px] text-warn">Not a usable number. Try 220, 4k7, 10k or 100n.</p>
        )}
      </div>

      {symbol?.multiUnit && (
        <div className="rounded-control bg-zinc-950/[0.035] p-2.5">
          <p className="text-[11.5px] text-ink-600">
            Units of {component.ref} placed: {placedUnits.sort().join(', ')}
          </p>
          {!placedUnits.includes('PWR') && symbol.units.some((u) => u.isPowerUnit) && (
            <p className="mt-1 text-[11.5px] text-warn">
              The power unit is not placed: this chip has no supply connection yet.
            </p>
          )}
        </div>
      )}

      {symbol?.help && <p className="text-[11.5px] leading-relaxed text-ink-600">{symbol.help}</p>}

      <div className="flex gap-1.5 pt-0.5">
        <button className="btn-quiet flex-1 text-[12px]" onClick={() => schematic.rotate([component.id])}>
          Rotate
        </button>
        <button className="btn-quiet flex-1 text-[12px]" onClick={() => schematic.mirror([component.id])}>
          Mirror
        </button>
        <button className="btn-quiet flex-1 text-[12px]" onClick={() => schematic.remove([component.id])}>
          Delete
        </button>
      </div>
    </div>,
    component.ref
  );
}
