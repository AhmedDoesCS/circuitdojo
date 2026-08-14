import React, { useMemo } from 'react';
import { STAGES, UNITS } from '../roadmap/index.js';
import { CONCEPTS, DOMAINS } from '../challenges/concepts.js';
import { HOLD, masteryOf } from '../lib/level.js';

/**
 * The profile, as figures.
 *
 * Four questions, in the order a learner actually asks them: how far along am I,
 * have I been showing up, what am I made of, and where am I weak. Each gets the
 * form its data deserves rather than the form that looks most impressive: a
 * headline number where there is one number, bars where the job is comparing
 * magnitudes, a calendar where the job is a habit over time.
 *
 * ## The colours
 *
 * Three categorical hues, for the three kinds of unit, and they are the only
 * categorical set in the app. They were chosen by running the palette through a
 * validator rather than by eye: light and dark are separate sets of steps, not
 * one set brightened, because a hue that separates well on white can collapse
 * against a dark panel. Every chart that uses them also labels them, so identity
 * never rests on colour alone.
 *
 * Everything else is a single accent ramp, because everything else is one
 * measure across categories rather than several series.
 */

const KIND_META = {
  build: { label: 'Drawn', hint: 'Schematics you captured to a specification' },
  analyse: { label: 'Worked out', hint: 'Numbers you calculated and got right' },
  inspect: { label: 'Reviewed', hint: "Faults you found on somebody else's sheet" },
};
const KIND_ORDER = ['build', 'analyse', 'inspect'];

export default function ProfileStats({ mastery, level, roadmap, completedUnits = [], activity = [] }) {
  const done = useMemo(() => new Set(completedUnits), [completedUnits]);

  const byKind = useMemo(() => {
    const totals = { build: 0, analyse: 0, inspect: 0 };
    const completed = { build: 0, analyse: 0, inspect: 0 };
    for (const unit of UNITS) {
      totals[unit.kind] = (totals[unit.kind] || 0) + 1;
      if (done.has(unit.id)) completed[unit.kind] = (completed[unit.kind] || 0) + 1;
    }
    return { totals, completed };
  }, [done]);

  const streak = useMemo(() => streakFrom(activity), [activity]);
  const recent = useMemo(() => activity.slice(0, 20).reverse(), [activity]);
  const passRate = useMemo(() => {
    if (!activity.length) return null;
    const window = activity.slice(0, 40);
    return window.filter((a) => a.passed).length / window.length;
  }, [activity]);

  return (
    <div className="space-y-6">
      <HeadlineRow roadmap={roadmap} level={level} streak={streak} passRate={passRate} />

      <Figure
        title="The curriculum"
        caption={`${roadmap.unitsDone} of ${roadmap.unitCount} units complete. Each bar is one stage.`}
      >
        <StageChart done={done} currentStage={roadmap.stage} />
      </Figure>

      <Figure
        title="What you have done"
        caption="Three kinds of work, and how much of each the roadmap still holds."
      >
        <KindChart totals={byKind.totals} completed={byKind.completed} />
      </Figure>

      <Figure
        title="When you worked"
        caption="Every check of the last twelve weeks, on this device. Darker means a busier day."
      >
        <ActivityCalendar activity={activity} />
      </Figure>

      {recent.length > 1 && (
        <Figure title="Recent form" caption="Your last twenty checks, oldest on the left.">
          <RecentForm entries={recent} />
        </Figure>
      )}

      <Figure
        title="Where your strength is"
        caption="Concepts held, by branch of the subject. A concept counts once you have shown it."
      >
        <DomainChart mastery={mastery} />
      </Figure>
    </div>
  );
}

/* ------------------------------------------------------------------ headline */

/**
 * Four numbers with no plot, because four single values are a worse chart than
 * they are a sentence. The ring is the exception: a proportion reads faster as
 * an arc than as "37%".
 */
function HeadlineRow({ roadmap, level, streak, passRate }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ProgressRing value={roadmap.expertise / 100} label={`${roadmap.expertise}%`} />
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile value={`${roadmap.unitsDone}`} unit={`/ ${roadmap.unitCount}`} label="units complete" />
        <Tile value={`${roadmap.stage}`} unit={`/ ${roadmap.stageCount}`} label="stage" />
        <Tile value={streak.current ? `${streak.current}` : '0'} label={streak.current === 1 ? 'day streak' : 'day streak'} />
        <Tile value={`${level.level}`} unit="/ 8" label="expertise band" />
        <Tile
          value={passRate === null ? '--' : `${Math.round(passRate * 100)}%`}
          label="first-time passes"
        />
        <Tile value={streak.best ? `${streak.best}` : '0'} label="best streak" />
      </div>
    </div>
  );
}

function Tile({ value, unit, label }) {
  return (
    <div className="rounded-control bg-zinc-900/[0.04] px-3 py-2.5">
      <p className="flex items-baseline gap-1">
        <span className="text-[19px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-900">{value}</span>
        {unit && <span className="font-mono text-[11px] text-zinc-400">{unit}</span>}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">{label}</p>
    </div>
  );
}

/** A proportion, as an arc. Stroke-dash rather than a path, so it animates. */
function ProgressRing({ value, label }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[88px] w-[88px] shrink-0 place-items-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgb(9 9 11 / 0.08)" strokeWidth="7" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--viz-accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[17px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-900">{label}</p>
        <p className="text-[9.5px] uppercase tracking-[0.06em] text-zinc-400">toward</p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- stage chart */

/**
 * Twelve stages, twelve bars, in order. One measure across an ordered set, so
 * one hue: the accent, deepening as a stage fills. The stage you are in is
 * ringed rather than recoloured, because "where am I" is a different fact from
 * "how much is done" and should not compete for the same channel.
 */
function StageChart({ done, currentStage }) {
  const rows = STAGES.map((stage) => {
    const units = UNITS.filter((u) => u.stage === stage.stage);
    const complete = units.filter((u) => done.has(u.id)).length;
    return { stage: stage.stage, name: stage.name, complete, total: units.length };
  });

  return (
    <ul className="space-y-1.5">
      {rows.map((row) => {
        const pct = row.total ? (row.complete / row.total) * 100 : 0;
        const here = row.stage === currentStage;
        return (
          <li key={row.stage} className="flex items-center gap-2.5">
            <span
              className={`w-4 shrink-0 text-right font-mono text-[10.5px] tabular-nums ${
                here ? 'font-semibold text-zinc-900' : 'text-zinc-400'
              }`}
            >
              {row.stage}
            </span>
            <span
              className="relative h-4 flex-1 overflow-hidden rounded-[5px] bg-zinc-900/[0.06]"
              title={`${row.name}: ${row.complete} of ${row.total}`}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-[5px]"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? 'var(--viz-done)' : 'var(--viz-accent)',
                  transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
              {here && (
                <span className="pointer-events-none absolute inset-0 rounded-[5px] ring-1 ring-inset ring-[var(--viz-accent)]" />
              )}
            </span>
            <span className="hidden min-w-0 flex-[1.6] truncate text-[11.5px] text-zinc-600 sm:block">
              {row.name}
            </span>
            <span className="w-11 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-zinc-500">
              {row.complete}/{row.total}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- kind chart */

/**
 * Three categories, one stacked bar per category showing done against the whole.
 * Not a donut: comparing three arcs is harder than comparing three lengths on a
 * shared baseline, and the total matters as much as the share.
 */
function KindChart({ totals, completed }) {
  const max = Math.max(...KIND_ORDER.map((k) => totals[k] || 0), 1);
  return (
    <div className="space-y-2.5">
      {KIND_ORDER.map((kind) => {
        const total = totals[kind] || 0;
        const did = completed[kind] || 0;
        return (
          <div key={kind}>
            <div className="mb-1 flex items-baseline gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: `var(--viz-${kind})` }}
                aria-hidden="true"
              />
              <span className="text-[12.5px] font-medium text-zinc-900">{KIND_META[kind].label}</span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-zinc-500">
                {did} / {total}
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-zinc-900/[0.06]"
              style={{ width: `${(total / max) * 100}%` }}
              title={`${KIND_META[kind].hint}: ${did} of ${total}`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${total ? (did / total) * 100 : 0}%`,
                  background: `var(--viz-${kind})`,
                  transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>
            <p className="mt-1 text-[11px] leading-tight text-zinc-500">{KIND_META[kind].hint}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ activity chart */

const WEEKS = 12;
const DAY_MS = 86400000;

/**
 * A calendar of the last twelve weeks: one column per week, one cell per day,
 * shaded by how much was done. Sequential, so one hue in four steps rather than
 * four colours.
 */
function ActivityCalendar({ activity }) {
  const { columns, busiest, total } = useMemo(() => {
    const counts = new Map();
    for (const entry of activity) {
      const key = new Date(entry.at).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // End on the Saturday of this week so the grid always has square corners.
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));

    const cols = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(end.getTime() - (w * 7 + (6 - d)) * DAY_MS);
        const key = date.toISOString().slice(0, 10);
        days.push({ key, date, count: counts.get(key) || 0, future: date > today });
      }
      cols.push(days);
    }
    const max = Math.max(...[...counts.values()], 0);
    return { columns: cols, busiest: max, total: activity.length };
  }, [activity]);

  if (!total) {
    return (
      <p className="rounded-control bg-zinc-900/[0.035] px-3 py-4 text-center text-[12px] text-zinc-500">
        Nothing here yet. Every check you run will land on this calendar.
      </p>
    );
  }

  const step = (count) => {
    if (!count) return 0;
    if (busiest <= 1) return 4;
    return Math.min(4, Math.ceil((count / busiest) * 4));
  };

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {columns.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <span
                key={day.key}
                title={day.future ? '' : `${day.date.toDateString()}: ${day.count} check${day.count === 1 ? '' : 's'}`}
                className="h-[11px] w-[11px] rounded-[3px]"
                style={{
                  background: day.future ? 'transparent' : `var(--viz-heat-${step(day.count)})`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10.5px] text-zinc-400">Quieter</span>
        {[0, 1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className="h-[9px] w-[9px] rounded-[2px]"
            style={{ background: `var(--viz-heat-${s})` }}
            aria-hidden="true"
          />
        ))}
        <span className="text-[10.5px] text-zinc-400">Busier</span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- form line */

/** Twenty pips: passed or not. A sequence, not a proportion, so no percentage. */
function RecentForm({ entries }) {
  return (
    <div className="flex items-end gap-[3px]">
      {entries.map((entry, i) => (
        <span
          key={i}
          title={`${entry.passed ? 'Passed' : 'Not yet'} · ${new Date(entry.at).toLocaleDateString()}`}
          className="flex-1 rounded-[2px]"
          style={{
            height: entry.passed ? 22 : 11,
            minWidth: 5,
            background: entry.passed ? 'var(--viz-done)' : 'rgb(9 9 11 / 0.16)',
          }}
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- domain bars */

function DomainChart({ mastery }) {
  const rows = useMemo(() => {
    const out = [];
    for (const [id, label] of Object.entries(DOMAINS)) {
      const concepts = CONCEPTS.filter((c) => c.domain === id);
      if (!concepts.length) continue;
      const held = concepts.filter((c) => masteryOf(mastery, c.id) >= HOLD).length;
      out.push({ id, label, held, total: concepts.length });
    }
    return out.sort((a, b) => b.held / b.total - a.held / a.total);
  }, [mastery]);

  const anything = rows.some((r) => r.held > 0);

  return (
    <div>
      {!anything && (
        <p className="mb-2 text-[11.5px] leading-relaxed text-zinc-500">
          Nothing held yet. A concept counts once a circuit you drew has demonstrated it.
        </p>
      )}
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-2.5">
            <span className="w-[8.5rem] shrink-0 truncate text-[11.5px] text-zinc-600">{row.label}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-900/[0.06]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(row.held / row.total) * 100}%`,
                  background: 'var(--viz-accent)',
                  transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </span>
            <span className="w-9 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-zinc-500">
              {row.held}/{row.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------- figures */

function Figure({ title, caption, children }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-2">
        <h4 className="text-[12.5px] font-semibold tracking-[-0.01em] text-zinc-900">{title}</h4>
        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{caption}</p>
      </figcaption>
      {children}
    </figure>
  );
}

/* --------------------------------------------------------------------- maths */

/**
 * Consecutive days with at least one check, counting back from today.
 *
 * Today not having started yet must not break a streak, so the count is allowed
 * to begin at yesterday. Anyone who has ever lost a streak to a timezone knows
 * why this is worth the extra three lines.
 */
export function streakFrom(activity) {
  if (!activity.length) return { current: 0, best: 0 };

  const days = new Set(activity.map((a) => new Date(a.at).toISOString().slice(0, 10)));
  const key = (d) => d.toISOString().slice(0, 10);

  let current = 0;
  const cursor = new Date();
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(key(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of sorted) {
    const date = new Date(day);
    run = previous && date - previous === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  return { current, best };
}
