import React, { useMemo, useState } from 'react';
import { STAGES, UNITS, unitTitle, unitStatus, roadmapProgress } from '../roadmap/index.js';
import { CloseIcon } from './Widget.jsx';

/**
 * The whole curriculum, laid out.
 *
 * Deliberately a destination and not a gate. Nobody is made to come here to
 * start work: Start Designing reads the cursor and goes straight to a brief,
 * exactly as it did when selection was random. This screen exists for the
 * separate and real question of "what is this, and where am I in it", which a
 * hundred and thirty-seven units cannot answer by being walked through one at a
 * time.
 *
 * Two things it deliberately does not do. It does not let you jump ahead: the
 * order is the curriculum, and a block ends in a capstone precisely so that
 * skipping is earned rather than clicked. And it does not hide what is coming,
 * because the shape of the thing is most of what a learner wants from a map.
 */
export default function RoadmapMap({ open, onClose, completed = [], onPick }) {
  const progress = useMemo(() => roadmapProgress(completed), [completed]);
  const done = useMemo(() => new Set(completed), [completed]);

  // The stage you are in opens itself; the rest stay folded, because twelve
  // stages of units unrolled at once is a wall rather than a map.
  const [expanded, setExpanded] = useState(() => new Set([progress.stage]));
  if (!open) return null;

  const toggle = (stage) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-zinc-900/25 p-6"
      onClick={onClose}
    >
      <div
        className="panel max-h-full w-full max-w-3xl animate-widget-in overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-950/10 surface-2 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">The roadmap</h2>
            <p className="text-[11.5px] text-zinc-500">
              {progress.unitsDone} of {progress.unitCount} units · stage {progress.stage} of{' '}
              {progress.stageCount} · {progress.expertise}% toward industry practice
            </p>
          </div>
          <button className="icon-btn ml-auto" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="space-y-2 p-4">
          {STAGES.map((stage) => {
            const units = UNITS.filter((u) => u.stage === stage.stage);
            const cleared = units.filter((u) => done.has(u.id)).length;
            const here = stage.stage === progress.stage && !progress.finished;
            const isOpen = expanded.has(stage.stage);

            return (
              <section
                key={stage.stage}
                className={`rounded-control border transition-colors duration-200 ${
                  here ? 'border-accent/40 bg-accent/[0.045]' : 'border-zinc-950/[0.07] bg-zinc-900/[0.02]'
                }`}
              >
                <button
                  onClick={() => toggle(stage.stage)}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold tabular-nums ${
                      cleared === units.length
                        ? 'bg-good/15 text-good'
                        : here
                          ? 'bg-accent text-on-accent'
                          : 'bg-zinc-900/[0.07] text-zinc-500'
                    }`}
                  >
                    {cleared === units.length ? <TickIcon /> : stage.stage}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-zinc-900">{stage.name}</span>
                      {here && <span className="chip bg-accent/15 text-accent">You are here</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-zinc-500">{stage.blurb}</span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[11.5px] tabular-nums text-zinc-500">
                      {cleared}/{units.length}
                    </span>
                    <span className="mt-1 block h-1 w-16 overflow-hidden rounded-full bg-zinc-900/[0.08]">
                      <span
                        className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-smooth"
                        style={{ width: `${units.length ? (cleared / units.length) * 100 : 0}%` }}
                      />
                    </span>
                  </span>

                  <Chevron open={isOpen} />
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-zinc-950/[0.06] px-3.5 py-3">
                    {stage.blocks.map((block) => (
                      <div key={block.block}>
                        <h4 className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-zinc-400">
                          {block.name}
                        </h4>
                        <ul className="space-y-1">
                          {units
                            .filter((u) => u.block === block.block)
                            .map((unit) => (
                              <UnitRow
                                key={unit.id}
                                unit={unit}
                                status={unitStatus(unit, done)}
                                onPick={onPick}
                              />
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * One unit.
 *
 * Anything already done can be sat again, which costs nothing and un-completes
 * nothing: going back over something is how it sticks. What is ahead is shown
 * but not offered, because the sequence is the curriculum.
 */
function UnitRow({ unit, status, onPick }) {
  const reachable = status !== 'ahead';
  const Tag = reachable ? 'button' : 'div';

  return (
    <li>
      <Tag
        {...(reachable ? { onClick: () => onPick(unit), type: 'button' } : {})}
        className={`flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left transition-colors duration-150 ${
          status === 'current'
            ? 'bg-accent/12 text-zinc-900 ring-1 ring-accent/35'
            : status === 'done'
              ? 'text-zinc-700 hover:bg-zinc-900/[0.05]'
              : 'text-zinc-400'
        }`}
      >
        <KindGlyph kind={unit.kind} status={status} />
        <span className="min-w-0 flex-1 truncate text-[12.5px]">{unitTitle(unit)}</span>
        {unit.capstone && (
          <span
            className="chip shrink-0 bg-zinc-900/[0.06] text-zinc-500"
            title="Pass this one cold and the whole block is complete"
          >
            capstone
          </span>
        )}
        {status === 'done' && <TickIcon className="shrink-0 text-good" />}
      </Tag>
    </li>
  );
}

/**
 * What kind of work a unit is, at a glance.
 *
 * Three shapes rather than three colours, because colour is already carrying
 * status here and a second meaning on the same channel is a chart nobody can
 * read: a pen for drawing, a bar chart for a number, a lens for a review.
 */
function KindGlyph({ kind, status }) {
  const tint =
    status === 'ahead' ? 'text-zinc-300' : status === 'current' ? 'text-accent' : 'text-zinc-400';
  return (
    <span className={`shrink-0 ${tint}`} title={KIND_NAME[kind] || kind}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        {kind === 'build' && (
          <path
            d="M2 12 L3.6 8.4 L9.6 2.4 A1.6 1.6 0 0 1 11.9 4.7 L5.9 10.7 Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        )}
        {kind === 'analyse' && (
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 11 V7" />
            <path d="M7 11 V3.5" />
            <path d="M11 11 V8.5" />
          </g>
        )}
        {kind === 'inspect' && (
          <g stroke="currentColor" strokeWidth="1.2">
            <circle cx="6.2" cy="6.2" r="3.7" />
            <path d="M9 9 L12 12" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </span>
  );
}

const KIND_NAME = { build: 'Draw it', analyse: 'Work out a number', inspect: 'Find the fault' };

function TickIcon({ className = '' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 6.4 L4.8 8.7 L9.5 3.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-zinc-400 transition-transform duration-200 ease-smooth ${open ? 'rotate-180' : ''}`}
    >
      <path d="M3 4.5 L6 7.8 L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
