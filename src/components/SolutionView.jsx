import React, { useMemo } from 'react';
import SymbolView from './SymbolView.jsx';
import { documentBounds } from '../schematic/model.js';

/**
 * A schematic document, presented as a drawing.
 *
 * Same symbols, same wire weight, same colours as the editor, because the
 * point of showing a reference answer is that the learner recognises it as the
 * thing they were trying to draw. A different rendering would read as a diagram
 * *about* the circuit rather than the circuit.
 *
 * What is added is the apparatus a real drawing has: a frame, and a title block
 * in the corner naming what this is. Those are not decoration. They say "this
 * is the issued drawing", which is exactly the status the reference answer has
 * and exactly what distinguishes it from the learner's working sheet.
 *
 * ## It assembles itself
 *
 * Parts arrive first, then the wires run between them, then the junction dots
 * land: the order the circuit would actually be built in. Watching it assemble
 * says more about the topology than the finished picture does, because the
 * finished picture is the thing they have already failed to produce three
 * times. Under a second in total: a reveal, not a performance.
 */

const PART_STEP = 0.05;
const WIRE_STEP = 0.07;

export default function SolutionView({ doc, title, meta, animate = true, className = '', pad = 40 }) {
  const box = useMemo(() => {
    const bounds = documentBounds(doc);
    if (!bounds) return null;
    return {
      x: bounds.x - pad,
      y: bounds.y - pad,
      w: Math.max(bounds.w + pad * 2, 120),
      h: Math.max(bounds.h + pad * 2, 120),
    };
  }, [doc, pad]);

  /**
   * Wires drawn in document order, which for an authored solution is the order
   * the chain was written: rail downward. Each carries its own length so a
   * short stub and a long run take the same time rather than the same speed.
   */
  const wires = useMemo(
    () =>
      doc.wires.map((w, i) => ({
        ...w,
        length: Math.hypot(w.x2 - w.x1, w.y2 - w.y1),
        delay: doc.components.length * PART_STEP + i * WIRE_STEP,
      })),
    [doc]
  );

  const partsDone = doc.components.length * PART_STEP;
  const wiresDone = partsDone + wires.length * WIRE_STEP + 0.5;

  if (!box) return null;

  /**
   * The sheet takes the drawing's own proportions rather than the container's.
   *
   * A rail-to-ground ladder is around 1:3, and stretched across a wide panel it
   * letterboxed itself into a thin strip with acres of blank sheet either side.
   * Sizing the sheet to the content means the frame and the title block sit on
   * the edge of the drawing, which is what makes it read as an issued sheet
   * rather than a drawing floating in a box.
   *
   * The floor stops a very tall circuit from becoming a ribbon: past that point
   * the drawing centres itself on a portrait sheet, exactly as it would on
   * paper.
   */
  const ratio = Math.max(box.w / box.h, 0.62);

  return (
    <figure
      className={`sheet relative mx-auto flex max-w-full flex-col overflow-hidden rounded-control ${className}`}
      style={{ aspectRatio: `${ratio.toFixed(3)}` }}
    >
      {/* Drawing frame: an outer rule and an inner one, as on an issued sheet. */}
      <div className="pointer-events-none absolute inset-2 rounded-[6px] border border-zinc-950/[0.13]" />
      <div className="pointer-events-none absolute inset-[0.85rem] rounded-[3px] border border-zinc-950/[0.07]" />

      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        className="min-h-0 w-full flex-1"
        role="img"
        aria-label={title ? `Reference schematic: ${title}` : 'Reference schematic'}
      >
        {/* Wires are painted first so they pass *under* the symbol bodies, but
            they animate last. Paint order and time order are independent, and
            conflating them is how a wire ends up drawn across a chip. */}
        {wires.map((w) => (
          <line
            key={w.id}
            x1={w.x1}
            y1={w.y1}
            x2={w.x2}
            y2={w.y2}
            stroke="var(--sch-wire)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className={animate ? 'sol-wire' : undefined}
            style={
              animate
                ? {
                    strokeDasharray: w.length,
                    strokeDashoffset: w.length,
                    animationDelay: `${w.delay.toFixed(3)}s`,
                  }
                : undefined
            }
          />
        ))}

        {/* Components: the parts exist before anything is wired to them. */}
        {doc.components.map((c, i) => (
          <g
            key={c.id}
            className={animate ? 'sol-part' : undefined}
            style={animate ? { animationDelay: `${(i * PART_STEP).toFixed(3)}s` } : undefined}
          >
            <SymbolView component={c} />
          </g>
        ))}

        {/* Junction dots land once there is something for them to join. */}
        {doc.junctions.map((j) => (
          <circle
            key={j.id}
            cx={j.x}
            cy={j.y}
            r={3.6}
            fill="var(--sch-wire)"
            className={animate ? 'sol-dot' : undefined}
            style={animate ? { animationDelay: `${wiresDone.toFixed(3)}s` } : undefined}
          />
        ))}

        {doc.noConnects.map((n) => (
          <g key={n.id} stroke="var(--sch-nc)" strokeWidth="2">
            <line x1={n.x - 5} y1={n.y - 5} x2={n.x + 5} y2={n.y + 5} />
            <line x1={n.x - 5} y1={n.y + 5} x2={n.x + 5} y2={n.y - 5} />
          </g>
        ))}

        {doc.labels.map((l) => (
          <g
            key={l.id}
            className={animate ? 'sol-dot' : undefined}
            style={animate ? { animationDelay: `${wiresDone.toFixed(3)}s` } : undefined}
          >
            <circle cx={l.x} cy={l.y} r={2.2} fill="var(--sch-label)" />
            <text x={l.x + 6} y={l.y - 5} fontSize="11" fill="var(--sch-label)" className="font-mono">
              {l.text}
            </text>
          </g>
        ))}
      </svg>

      {/* Title block. A drawing keeps this in the bottom-right corner, but these
          sheets go portrait and narrow, where a floating corner block sits on
          top of the circuit. Spanning the foot of the frame is the same
          convention at a size that has to share the page. */}
      {title && (
        <figcaption className="relative z-10 mx-[0.85rem] mb-[0.85rem] shrink-0 border-t border-zinc-950/[0.13] px-2 pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-accent">Reference</span>
            {meta && (
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                {meta} · 1/1
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[12px] font-semibold tracking-[-0.01em] text-zinc-900">{title}</div>
        </figcaption>
      )}
    </figure>
  );
}
