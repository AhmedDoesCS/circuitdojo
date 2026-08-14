import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MenuShell, { LogoMark, at } from './MenuShell.jsx';
import { STAGES, UNITS, STAGE_COUNT, unitById, unitTitle, indexOfUnit, roadmapProgress } from '../roadmap/index.js';

/**
 * Levels: the curriculum as a route you are travelling, not a list you are
 * ticking off.
 *
 * ## What was wrong with the old one
 *
 * The first version of this screen was a modal holding twelve collapsible
 * sections of unit rows. Everything in it was true and none of it was
 * inspiring: it read as a checklist of things already learned, which is exactly
 * what a curriculum should *not* feel like from the inside. A checklist looks
 * backwards. A map looks forwards, and the whole reason to open this screen is
 * to see what is coming.
 *
 * ## The metaphor
 *
 * The roadmap is **a circuit being energised**. That is not decoration bolted
 * on afterwards: it is the one metaphor this app already owns, and every state
 * on this screen falls out of it without needing a legend.
 *
 *  - What you have finished is **energised copper**, with current visibly
 *    running along it.
 *  - Where you are is the **live edge**: the last powered node, breathing.
 *  - What is ahead is **an unpopulated footprint**: drawn on the board, dashed,
 *    waiting. Visible, so the shape of the journey is legible; not offered,
 *    because the sequence *is* the curriculum.
 *
 * The trunk across the top is the supply rail running through twelve stages.
 * Each block below taps off it. A capstone is drawn as a diamond rather than a
 * circle, because a capstone is the test point at the end of a run: pass it
 * cold and everything behind it is signed off.
 *
 * ## What it deliberately does not do
 *
 * It does not compete with the menu. Continue Challenge still resumes the sheet
 * you left open and Start Designing still drops you straight onto the frontier
 * without coming through here. This screen is a *pathway*: somewhere to retrace
 * your steps and look into the future, and nothing on the critical path to
 * doing a single minute of work.
 *
 * It does not let you jump ahead either. Selecting a locked unit tells you what
 * it is and how far away it is; starting it is not offered, because a block
 * ends in a capstone precisely so that skipping is earned rather than clicked.
 */

/** What each kind of unit actually asks of you, in its own voice. */
const KIND = {
  build: {
    name: 'Draw it',
    line: 'A blank sheet and a specification. Graded on the netlist, the electrical rules and the brief.',
    hue: 'var(--viz-build)',
  },
  analyse: {
    name: 'Work it out',
    line: 'One number, worked out and typed in. The full working is shown once you have answered.',
    hue: 'var(--viz-analyse)',
  },
  inspect: {
    name: 'Find the fault',
    line: "Somebody else's schematic with exactly one thing wrong on it. Click the thing that is wrong.",
    hue: 'var(--viz-inspect)',
  },
};

export default function LevelsScreen({ completed = [], onPick, onBack }) {
  const done = useMemo(() => new Set(completed), [completed]);
  const progress = useMemo(() => roadmapProgress(completed), [completed]);
  const currentId = progress.current?.id || null;

  /**
   * Status is derived here rather than through `unitStatus`, which re-scans the
   * whole array to find the cursor on every call. This screen asks for it a
   * hundred and thirty-seven times per render.
   */
  const statusOf = useCallback(
    (unit) => (done.has(unit.id) ? 'done' : unit.id === currentId ? 'current' : 'ahead'),
    [done, currentId]
  );

  // The map opens on you: your stage, your next unit. A map that opens at the
  // beginning makes you find yourself before it can tell you anything.
  const [stageNo, setStageNo] = useState(progress.stage);
  const [selectedId, setSelectedId] = useState(currentId || UNITS[UNITS.length - 1].id);
  const byKeyboard = useRef(false);
  const rowRefs = useRef({});

  const stage = useMemo(() => STAGES.find((s) => s.stage === stageNo) || STAGES[0], [stageNo]);
  const stageUnits = useMemo(() => UNITS.filter((u) => u.stage === stageNo), [stageNo]);
  const stageDone = stageUnits.filter((u) => done.has(u.id)).length;

  const selected = unitById(selectedId);
  const selectedStatus = selected ? statusOf(selected) : 'ahead';

  /**
   * Moving to a stage takes the selection with it, landing on that stage's own
   * frontier: its first unfinished unit, or its last if the stage is cleared.
   * Leaving the selection behind on another stage would break the one thing the
   * detail panel is for, which is describing the node you are looking at.
   */
  const goStage = useCallback(
    (next) => {
      const n = Math.min(STAGE_COUNT, Math.max(1, next));
      const units = UNITS.filter((u) => u.stage === n);
      setStageNo(n);
      setSelectedId((units.find((u) => !done.has(u.id)) || units[units.length - 1]).id);
    },
    [done]
  );

  const act = useCallback(() => {
    if (selected && selectedStatus !== 'ahead') onPick(selected);
  }, [selected, selectedStatus, onPick]);

  /**
   * Console-menu driving, matching the home screen.
   *
   * The axes follow the drawing: left and right walk the rail, because the rail
   * is horizontal; up and down walk the stage's units in curriculum order,
   * because that is the order they are laid out in and the order they are sat
   * in. Crossing from the bottom of one block to the top of the next is a jump
   * on screen, but it is the honest next unit, and a cursor that wanders
   * column-wise through a curriculum would be lying about the sequence.
   */
  useEffect(() => {
    const onKey = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onBack();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        byKeyboard.current = true;
        goStage(stageNo + (event.key === 'ArrowRight' ? 1 : -1));
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        byKeyboard.current = true;
        const here = stageUnits.findIndex((u) => u.id === selectedId);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = stageUnits[Math.min(stageUnits.length - 1, Math.max(0, (here < 0 ? 0 : here) + step))];
        if (next) setSelectedId(next.id);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        act();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stageNo, stageUnits, selectedId, goStage, act, onBack]);

  // Only the keyboard scrolls the map. Doing it on every selection change would
  // yank the list out from under a pointer that is simply hovering.
  useEffect(() => {
    if (!byKeyboard.current) return;
    byKeyboard.current = false;
    rowRefs.current[selectedId]?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  return (
    <MenuShell pad="tight">
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.7rem,1.8vh,1.2rem)]">
        {/* ---------------------------------------------------------- header */}
        <header className="flex shrink-0 items-center gap-3">
          <button
            onClick={onBack}
            className="panel-pill animate-enter-up flex h-11 items-center gap-2 px-4 transition-transform duration-200 ease-smooth hover:scale-[1.02]"
            style={at(0)}
            title="Back to the menu"
          >
            <LogoMark size={18} />
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">CircuitDojo</span>
          </button>

          <div className="animate-enter-up min-w-0" style={at(0.5)}>
            <h1 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-900">Levels</h1>
            <p className="truncate text-[11.5px] text-zinc-500">
              Everything behind you, and everything still ahead
            </p>
          </div>

          <div
            className="panel-pill animate-enter-up ml-auto hidden h-11 items-center gap-3 px-4 sm:flex"
            style={at(1)}
          >
            <Readout value={progress.unitsDone} of={progress.unitCount} label="units" />
            <span className="h-5 w-px bg-zinc-950/10" />
            <Readout value={progress.stagesCleared} of={STAGE_COUNT} label="stages" />
            <span className="h-5 w-px bg-zinc-950/10" />
            <span className="font-mono text-[12px] tabular-nums text-accent">{progress.expertise}%</span>
          </div>
        </header>

        {/* ------------------------------------------------------------ rail */}
        <StageRail
          stageNo={stageNo}
          currentStage={progress.stage}
          finished={progress.finished}
          fraction={
            progress.finished
              ? 1
              : Math.min(1, Math.max(0, (progress.stage - 1 + progress.stageProgress) / (STAGE_COUNT - 1)))
          }
          done={done}
          onSelect={(n) => {
            byKeyboard.current = true;
            goStage(n);
          }}
        />

        {/* ------------------------------------------------------------ body */}
        <main className="grid min-h-0 flex-1 gap-[clamp(0.7rem,1.6vw,1.1rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          {/* The selected stage, opened out into its blocks. */}
          <section className="panel animate-enter-up flex min-h-0 min-w-0 flex-col" style={at(2)}>
            <div className="flex shrink-0 items-end gap-3 border-b border-zinc-950/[0.07] px-[clamp(0.9rem,1.6vw,1.4rem)] py-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                  Stage {stage.stage} of {STAGE_COUNT}
                </p>
                <h2 className="mt-0.5 truncate text-[clamp(0.95rem,1.5vw,1.15rem)] font-semibold tracking-[-0.02em] text-zinc-900">
                  {stage.name}
                </h2>
                <p className="mt-0.5 truncate text-[11.5px] text-zinc-500 [@media(max-height:640px)]:hidden">
                  {stage.blurb}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-mono text-[12px] tabular-nums text-zinc-600">
                  {stageDone}/{stageUnits.length}
                </span>
                <span className="mt-1.5 block h-1 w-20 overflow-hidden rounded-full bg-zinc-900/[0.08]">
                  <span
                    className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-smooth"
                    style={{ width: `${stageUnits.length ? (stageDone / stageUnits.length) * 100 : 0}%` }}
                  />
                </span>
              </div>
            </div>

            {/* Blocks side by side. A block is a branch off the rail, so it gets
                its own copper run with the units tapped off it. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-[clamp(0.9rem,1.6vw,1.4rem)] py-3">
              <div className="grid gap-x-[clamp(0.9rem,1.8vw,1.6rem)] gap-y-4 [grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]">
                {stage.blocks.map((block, b) => {
                  const units = stageUnits.filter((u) => u.block === block.block);
                  return (
                    <div key={block.block} className="animate-enter-up min-w-0" style={at(2.6 + b * 0.4)}>
                      <h3 className="mb-1.5 truncate text-[10.5px] uppercase tracking-[0.09em] text-zinc-400">
                        {block.name}
                      </h3>
                      <ul>
                        {units.map((unit, i) => (
                          <UnitNode
                            key={unit.id}
                            unit={unit}
                            status={statusOf(unit)}
                            selected={unit.id === selectedId}
                            first={i === 0}
                            last={i === units.length - 1}
                            /* The run below a node is live only when the unit
                               after it is finished, which is what stops the
                               copper exactly at the frontier. */
                            liveBelow={i < units.length - 1 && done.has(units[i + 1].id)}
                            nodeRef={(el) => {
                              rowRefs.current[unit.id] = el;
                            }}
                            onSelect={() => {
                              byKeyboard.current = false;
                              setSelectedId(unit.id);
                            }}
                            onOpen={() => statusOf(unit) !== 'ahead' && onPick(unit)}
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* The log for whatever node is selected. */}
          <UnitDetail
            unit={selected}
            status={selectedStatus}
            currentId={currentId}
            onStart={act}
            onGoToCurrent={() => {
              const current = unitById(currentId);
              if (current) onPick(current);
            }}
          />
        </main>

        <footer className="shrink-0">
          <p
            className="animate-fade-in text-[11px] text-zinc-400 [@media(max-height:600px)]:hidden"
            style={at(6)}
          >
            ← → stage · ↑ ↓ unit · Enter to open · Esc to go back &nbsp;·&nbsp; anything finished can be sat
            again with fresh numbers, and un-completes nothing
          </p>
        </footer>
      </div>
    </MenuShell>
  );
}

/** One figure in the header pill: done over total, in one breath. */
function Readout({ value, of, label }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-mono text-[12.5px] font-semibold tabular-nums text-zinc-900">{value}</span>
      <span className="font-mono text-[11px] tabular-nums text-zinc-400">/{of}</span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </span>
  );
}

/**
 * The trunk: twelve stages on one supply rail.
 *
 * The copper behind you carries current; the copper ahead is drawn but dead.
 * `fraction` is a continuous position rather than a count of cleared stages, so
 * the live end of the rail creeps forward as you work through a stage instead
 * of sitting still for eleven units and then jumping.
 *
 * The line insets by half a node at each end so it meets the first and last
 * node dead centre rather than sticking out past them.
 */
const NODE = 30;

function StageRail({ stageNo, currentStage, finished, fraction, done, onSelect }) {
  return (
    <div className="panel-pill animate-enter-up shrink-0 px-[clamp(0.9rem,1.8vw,1.6rem)] py-3" style={at(1.5)}>
      <div className="relative" style={{ height: NODE }}>
        {/* Dead copper: the whole run, drawn faint so the shape of the journey
            is legible before any of it is yours. */}
        <span
          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-zinc-900/[0.09]"
          style={{ left: NODE / 2, right: NODE / 2 }}
        />
        {/* Live copper, with current running it. */}
        <span
          className="absolute top-1/2 h-[2px] -translate-y-1/2 overflow-hidden rounded-full bg-accent transition-[width] duration-700 ease-smooth"
          style={{ left: NODE / 2, width: `calc((100% - ${NODE}px) * ${fraction})` }}
        >
          <span className="rail-flow absolute inset-0" />
        </span>

        <div className="relative flex h-full items-center justify-between">
          {STAGES.map((s) => {
            const units = UNITS.filter((u) => u.stage === s.stage);
            const cleared = units.every((u) => done.has(u.id));
            const here = s.stage === currentStage && !finished;
            const picked = s.stage === stageNo;

            return (
              <button
                key={s.stage}
                onClick={() => onSelect(s.stage)}
                title={`Stage ${s.stage}: ${s.name}`}
                aria-label={`Stage ${s.stage}, ${s.name}`}
                aria-pressed={picked}
                className="relative grid shrink-0 place-items-center rounded-full transition-transform duration-200 ease-smooth hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
                style={{ height: NODE, width: NODE }}
              >
                {/* The live node breathes. Only one node ever does, so it reads
                    as a position rather than as decoration. */}
                {here && (
                  <span className="animate-pulse-ring absolute inset-0 rounded-full bg-accent/30" aria-hidden="true" />
                )}
                <span
                  className={`relative grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[10.5px] font-semibold tabular-nums transition-colors duration-300 ${
                    cleared
                      ? 'bg-good text-on-solid'
                      : here
                        ? 'bg-accent text-on-accent'
                        : 'border border-dashed border-zinc-400/60 bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {cleared ? <TickIcon /> : s.stage}
                </span>
                {/* Where you are looking, as opposed to where you are. A probe
                    ring, not a fill: the fill already means something. */}
                {picked && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-zinc-900/40"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * One unit, as a node on a branch.
 *
 * The glyph inside the node says what kind of work it is; the node's own
 * treatment says where it stands. Two meanings, two channels: colour is already
 * carrying status, so kind is carried by shape, and a legend is not needed for
 * either.
 *
 * A capstone is a diamond. That is the test point at the end of a run, and it
 * is the one node on the board that is worth more than it looks.
 */
function UnitNode({ unit, status, selected, first, last, liveBelow, nodeRef, onSelect, onOpen }) {
  const reachable = status !== 'ahead';

  return (
    <li>
      <button
        ref={nodeRef}
        onClick={onSelect}
        /* Selecting reads; opening commits. The double-click is for anyone who
           already knows what the node is and does not want the round trip. */
        onDoubleClick={onOpen}
        aria-current={status === 'current' ? 'step' : undefined}
        className={`group flex w-full items-stretch gap-2.5 rounded-control pr-2 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 ${
          selected ? 'bg-accent/[0.10] ring-1 ring-accent/30' : 'hover:bg-zinc-900/[0.04]'
        }`}
      >
        {/* The copper this node is tapped off. Above is live once this unit is
            finished; below is live once the next one is. */}
        {/* w-8 rather than w-7 because a rotated square is √2 times as wide as
            its side: a 20px capstone occupies 28px, which a 28px column has no
            room for. */}
        <span className="relative grid w-8 shrink-0 place-items-center">
          {!first && (
            <span
              className={`absolute left-1/2 top-0 h-1/2 w-[1.5px] -translate-x-1/2 ${
                status === 'done' ? 'bg-good/70' : 'bg-zinc-900/[0.10]'
              }`}
            />
          )}
          {!last && (
            <span
              className={`absolute bottom-0 left-1/2 h-1/2 w-[1.5px] -translate-x-1/2 ${
                liveBelow ? 'bg-good/70' : 'bg-zinc-900/[0.10]'
              }`}
            />
          )}
          <span
            className={`relative grid place-items-center transition-colors duration-200 ${
              unit.capstone ? 'h-5 w-5 rotate-45 rounded-[5px]' : 'h-[22px] w-[22px] rounded-full'
            } ${
              status === 'done'
                ? 'bg-good/[0.16] text-good ring-1 ring-good/35'
                : status === 'current'
                  ? 'bg-accent text-on-accent'
                  : 'border border-dashed border-zinc-400/70 bg-zinc-100 text-zinc-400'
            }`}
          >
            {status === 'current' && (
              <span
                className="animate-pulse-ring absolute -inset-[3px] rounded-full bg-accent/30"
                aria-hidden="true"
              />
            )}
            <span className={`relative ${unit.capstone ? '-rotate-45' : ''}`}>
              <KindGlyph kind={unit.kind} />
            </span>
          </span>
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5">
          <span
            className={`min-w-0 flex-1 truncate text-[12.5px] ${
              status === 'ahead' ? 'text-zinc-400' : status === 'current' ? 'font-medium text-zinc-900' : 'text-zinc-700'
            }`}
          >
            {unit.title || unitTitle(unit)}
          </span>
          {status === 'done' && <TickIcon className="shrink-0 text-good" />}
          {reachable && status !== 'done' && (
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-accent">now</span>
          )}
        </span>
      </button>
    </li>
  );
}

/**
 * The log for the selected node.
 *
 * This is where looking into the future is paid off. A locked unit is not a
 * dead row: it says what kind of work it is, what that work involves and
 * exactly how far away it is, and it offers the one thing that actually
 * shortens the distance, which is going and doing the next one.
 */
function UnitDetail({ unit, status, currentId, onStart, onGoToCurrent }) {
  if (!unit) return null;
  const kind = KIND[unit.kind] || KIND.build;
  const distance = currentId ? indexOfUnit(unit.id) - indexOfUnit(currentId) : 0;

  return (
    <aside className="panel animate-enter-right flex min-h-0 flex-col p-[clamp(0.9rem,1.5vw,1.25rem)]" style={at(3)}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
          Stage {unit.stage} · {unit.blockName}
        </p>

        <h3 className="mt-1.5 text-[clamp(1rem,1.5vw,1.2rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-zinc-900">
          {unit.title || unitTitle(unit)}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className="chip"
            style={{ color: kind.hue, background: 'rgb(var(--panel-2))' }}
          >
            <span className="grid place-items-center" style={{ color: kind.hue }}>
              <KindGlyph kind={unit.kind} />
            </span>
            {kind.name}
          </span>
          <StatusChip status={status} />
          {unit.capstone && <span className="chip bg-zinc-900/[0.06] text-zinc-600">Capstone</span>}
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-zinc-600">{kind.line}</p>

        {unit.capstone && (
          <p className="mt-2.5 rounded-control bg-accent/[0.07] px-3 py-2 text-[11.5px] leading-relaxed text-zinc-700">
            The last drawing in its block. Pass it cold and the whole block is signed off, which is how you skip
            material you already know: by examination rather than by claim.
          </p>
        )}

        {status === 'ahead' && (
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-zinc-500">
            {distance === 1
              ? 'Next but one. Clear the unit you are on and this opens.'
              : `${distance} units ahead of where you are. The order is the curriculum, so it opens when you reach it.`}
          </p>
        )}
      </div>

      <div className="mt-3 shrink-0">
        {status === 'ahead' ? (
          <button className="btn-quiet w-full py-2.5 text-[13px]" onClick={onGoToCurrent}>
            Go to where you are
          </button>
        ) : (
          <button className="btn-primary w-full py-2.5 text-[13px]" onClick={onStart}>
            {status === 'done' ? 'Sit it again' : 'Start this one'}
          </button>
        )}
        {status === 'done' && (
          <p className="mt-2 text-center text-[11px] leading-relaxed text-zinc-500">
            Fresh numbers, and nothing to lose: replaying un-completes nothing.
          </p>
        )}
      </div>
    </aside>
  );
}

function StatusChip({ status }) {
  if (status === 'done') return <span className="chip bg-good/[0.14] text-good">Cleared</span>;
  if (status === 'current') return <span className="chip bg-accent text-on-accent">You are here</span>;
  return <span className="chip bg-zinc-900/[0.06] text-zinc-500">Locked</span>;
}

/**
 * What kind of work a unit is, at a glance: a pen for drawing, a bar chart for
 * a number, a lens for a review.
 */
function KindGlyph({ kind }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      {kind === 'build' && (
        <path
          d="M2 12 L3.6 8.4 L9.6 2.4 A1.6 1.6 0 0 1 11.9 4.7 L5.9 10.7 Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      )}
      {kind === 'analyse' && (
        <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M3 11 V7" />
          <path d="M7 11 V3.5" />
          <path d="M11 11 V8.5" />
        </g>
      )}
      {kind === 'inspect' && (
        <g stroke="currentColor" strokeWidth="1.3">
          <circle cx="6.2" cy="6.2" r="3.7" />
          <path d="M9 9 L12 12" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

function TickIcon({ className = '' }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 6.4 L4.8 8.7 L9.5 3.3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
