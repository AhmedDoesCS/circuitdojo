import React from 'react';
import { getSymbol, getUnit } from '../schematic/symbols/index.js';
import { svgTransform, orientVector } from '../schematic/geometry.js';
import { componentBounds } from '../schematic/model.js';

/**
 * Renders one placed symbol unit.
 *
 * Colours follow EDA convention (maroon bodies, teal annotations) because the
 * point of this tool is that a schematic drawn here looks like a schematic
 * drawn anywhere else.
 */

/* Read from the theme rather than fixed: the hues stay conventional in light
   mode and lift in dark mode so they still carry on a matte sheet. */
const BODY = 'var(--sch-body)';
const BODY_FILL = 'var(--sch-body-fill)';
const ANNOT = 'var(--sch-label)';
const PIN_NUM = 'var(--sch-pin-num)';
const SELECTED = 'var(--sch-selected)';

function Graphic({ g, stroke }) {
  const fill = g.fill === 'body' ? BODY_FILL : g.fill === 'solid' ? stroke : 'none';
  switch (g.t) {
    case 'line':
      return (
        <polyline
          points={g.pts.map(([x, y]) => `${x},${y}`).join(' ')}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'rect':
      return <rect x={g.x} y={g.y} width={g.w} height={g.h} fill={fill} stroke={stroke} strokeWidth="2" rx="1" />;
    case 'circle':
      return <circle cx={g.cx} cy={g.cy} r={g.r} fill={fill} stroke={stroke} strokeWidth="2" />;
    case 'path':
      return <path d={g.d} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" />;
    case 'text':
      return (
        <text
          x={g.x}
          y={g.y}
          fontSize={g.size || 9}
          fill={stroke}
          textAnchor={g.anchor || 'start'}
          className="font-mono"
        >
          {g.s}
        </text>
      );
    default:
      return null;
  }
}

/**
 * Where the reference designator and value sit, given how the part is turned.
 *
 * A wire reaching a two-terminal part runs along the part's own axis, so any
 * annotation placed along that axis lands on the wire. Putting the text
 * *perpendicular* to the body avoids it by construction, with no need to know
 * where the wires actually are:
 *
 *   - horizontal part → reference above the body, value below it
 *   - vertical part   → both stacked to the right of the body
 *
 * This is also the KiCad convention, so a sheet drawn here keeps looking like a
 * sheet drawn there.
 */
function annotationSlots(component, bounds) {
  const turned = ((component.rot || 0) / 90) % 2 === 1;

  if (turned) {
    const x = bounds.maxX + 8;
    return {
      ref: { x, y: bounds.minY + 10, textAnchor: 'start' },
      value: { x, y: bounds.minY + 23, textAnchor: 'start' },
    };
  }

  const cx = (bounds.minX + bounds.maxX) / 2;
  return {
    ref: { x: cx, y: bounds.minY - 7, textAnchor: 'middle' },
    value: { x: cx, y: bounds.maxY + 15, textAnchor: 'middle' },
  };
}

/** Pin stub + its number/name annotations. */
function Pin({ pin, symbol, stroke, connected, showPinDots }) {
  const v = orientVector(pin.orient);
  const bx = pin.x - v.x * (pin.len || 0);
  const by = pin.y - v.y * (pin.len || 0);
  const nameOffset = 6;

  return (
    <g>
      {!pin.hideStub && pin.len > 0 && (
        <line x1={pin.x} y1={pin.y} x2={bx} y2={by} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      )}
      {showPinDots && (
        <circle
          cx={pin.x}
          cy={pin.y}
          r={connected ? 2.5 : 3.5}
          fill={connected ? 'var(--sch-wire)' : 'none'}
          stroke={connected ? 'var(--sch-wire)' : 'var(--sch-pin-free)'}
          strokeWidth="1.5"
        />
      )}
      {symbol.showPinNumbers && (
        <text
          x={bx - v.x * -4 + (pin.orient === 'U' || pin.orient === 'D' ? 4 : 0)}
          y={by - (pin.orient === 'L' || pin.orient === 'R' ? 3 : -3)}
          fontSize="6"
          fill={PIN_NUM}
          textAnchor={pin.orient === 'L' ? 'start' : pin.orient === 'R' ? 'end' : 'start'}
          className="font-mono"
        >
          {pin.num}
        </text>
      )}
      {symbol.showPinNames && pin.name && pin.name !== '~' && (
        <text
          x={bx + v.x * -nameOffset}
          y={by + v.y * -nameOffset + 3}
          fontSize="7.5"
          fill={ANNOT}
          textAnchor={pin.orient === 'L' ? 'start' : pin.orient === 'R' ? 'end' : 'middle'}
          className="font-mono"
        >
          {pin.name}
        </text>
      )}
    </g>
  );
}

export default function SymbolView({
  component,
  selected = false,
  ghost = false,
  showPinDots = false,
  connectedPins = null,
  showAnnotations = true,
}) {
  const symbol = getSymbol(component.symbolId);
  const unit = getUnit(component.symbolId, component.unitId);
  if (!symbol || !unit) return null;

  const stroke = selected ? SELECTED : BODY;
  const opacity = ghost ? 0.45 : 1;
  const bounds = componentBounds(component);
  const isMultiUnit = symbol.multiUnit;
  const unitSuffix = isMultiUnit ? unit.id : '';
  const annotation = annotationSlots(component, bounds);

  return (
    <g opacity={opacity} className="no-select">
      <g transform={svgTransform(component)}>
        {(unit.graphics || []).map((g, i) => (
          <Graphic key={i} g={g} stroke={stroke} />
        ))}
        {unit.pins.map((pin) => (
          <Pin
            key={pin.num}
            pin={pin}
            symbol={symbol}
            stroke={stroke}
            showPinDots={showPinDots}
            connected={connectedPins ? connectedPins.has(`${component.id}:${pin.num}`) : false}
          />
        ))}
      </g>

      {/* Annotations are drawn unrotated so text always reads left-to-right. */}
      {showAnnotations && symbol.isPower && (
        <text
          x={component.x}
          y={component.y + (symbol.labelOffset || -18)}
          fontSize="10"
          fill={BODY}
          textAnchor="middle"
          className="font-mono"
        >
          {component.value || symbol.power.netName}
        </text>
      )}

      {showAnnotations && !symbol.isPower && (
        <>
          <text
            {...annotation.ref}
            fontSize="11"
            fill={selected ? SELECTED : ANNOT}
            className="font-mono"
          >
            {component.ref}
            {unitSuffix}
          </text>
          {component.value && (
            <text
              {...annotation.value}
              fontSize="10"
              fill={selected ? SELECTED : ANNOT}
              className="font-mono"
            >
              {component.value}
            </text>
          )}
        </>
      )}
    </g>
  );
}
