import React, { useMemo, useState } from 'react';
import Widget from './Widget.jsx';
import { generateHints } from '../engine/hints.js';

/**
 * Check results, floating over the canvas rather than covering it.
 *
 * Feedback arrives all at once and names the consequence, not just the rule.
 * Correct items get one quiet line each; anything unmet gets the room, a
 * marker on the canvas and, if the learner asks for it, an escalating hint.
 */
export default function ResultsPanel({
  result,
  challenge,
  doc,
  onRetry,
  onClose,
  onHighlight,
  onShowSolution,
  tries = 0,
  maxTries = 3,
  hintsEnabled = true,
  openHints = false,
}) {
  const [tab, setTab] = useState(openHints ? 'hints' : 'feedback');
  const [showApproach, setShowApproach] = useState(false);
  const [revealed, setRevealed] = useState({});

  const hints = useMemo(
    () => (hintsEnabled ? generateHints(result, challenge, doc) : []),
    [result, challenge, doc, hintsEnabled]
  );

  if (!result) return null;
  const { passed, correct, errors, missing, warnings, stats } = result;
  const unresolved = errors.length + missing.length;

  const tabs = [
    { id: 'feedback', label: 'Feedback' },
    ...(hints.length ? [{ id: 'hints', label: `Hints (${hints.length})` }] : []),
    { id: 'netlist', label: 'Netlist' },
  ];

  return (
    <Widget
      className={`max-h-[min(26rem,48vh)] w-[min(58rem,calc(100vw-3rem))] ${
        !passed ? 'ring-1 ring-bad/25' : ''
      }`}
      title="Check results"
      onClose={onClose}
      actions={
        <>
          <div className="mr-1 flex rounded-control bg-zinc-900/[0.05] p-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-chip px-2.5 py-1 text-[11.5px] font-medium transition-all duration-200 ease-smooth ${
                  tab === t.id ? 'surface-solid text-accent shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* The count itself lives on the dock, against the button that spends
              it. Repeating it here would split the attention at the one moment
              the break animation needs it. */}
          {!passed && tries >= maxTries && onShowSolution && (
            <button className="btn-quiet text-[12px]" onClick={onShowSolution}>
              Reference circuit
            </button>
          )}
          {!passed && (
            <button className="btn-quiet text-[12px]" onClick={onRetry}>
              Keep my work
            </button>
          )}
        </>
      }
      bodyClassName="px-4 py-3"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span
          className={`chip ${passed ? 'bg-good/12 text-good' : 'animate-alert-pulse bg-bad/12 text-bad'}`}
        >
          {passed ? 'Passed' : `${unresolved} unresolved`}
        </span>
        <span className="text-[12.5px] text-zinc-600">
          {passed
            ? 'This meets the specification and passes the electrical rules check.'
            : `${errors.length} problem${errors.length === 1 ? '' : 's'} with what you built, ${missing.length} requirement${
                missing.length === 1 ? '' : 's'
              } not addressed. Marked items are ringed on the sheet.`}
        </span>
      </div>

      {tab === 'netlist' && <NetlistView netlist={result.netlist} stats={stats} />}

      {tab === 'hints' && (
        <HintList hints={hints} revealed={revealed} setRevealed={setRevealed} />
      )}

      {tab === 'feedback' && (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Group
              title="Correct"
              tone="text-good"
              dot="bg-good"
              empty="Nothing verified yet."
              items={correct.map((c) => ({ label: c.label, detail: c.detail }))}
              compact
            />
            <Group
              title="Wrong"
              tone="text-bad"
              dot="bg-bad"
              alert
              empty="No electrical or structural errors."
              // `why` is what is true of *this* sheet; `detail` is the teaching
              // text, which is the same every time. The specific finding leads,
              // because burying it at the end of a paragraph of theory is how
              // "Net BTN is not in your schematic" gets missed entirely.
              items={errors.map((e) => ({
                label: e.label,
                finding: e.why,
                detail: e.detail,
                points: e.points,
                refs: e.refs,
              }))}
              onHighlight={onHighlight}
            />
            <Group
              title="Missing"
              tone="text-warn"
              dot="bg-warn"
              alert
              empty="Every stated requirement is addressed."
              items={missing.map((m) => ({
                label: m.label,
                finding: m.why,
                detail: m.detail,
              }))}
            />
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 border-t border-zinc-950/10 pt-3">
              <h4 className="widget-title mb-1">Worth noticing</h4>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-zinc-600">
                    - {w.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {challenge?.solutionNote && (
            <div className="mt-4 border-t border-zinc-950/10 pt-3">
              {showApproach ? (
                <div>
                  <h4 className="widget-title mb-1">The approach</h4>
                  <p className="text-[12.5px] leading-relaxed text-zinc-700">{challenge.solutionNote}</p>
                </div>
              ) : (
                <button className="btn-ghost text-[12px]" onClick={() => setShowApproach(true)}>
                  Show the approach for this challenge
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Widget>
  );
}

/**
 * Hints escalate on demand: a nudge, then the principle behind it, then the
 * concrete fix. The learner decides how much help to take.
 */
function HintList({ hints, revealed, setRevealed }) {
  if (!hints.length) return <p className="text-[12.5px] text-zinc-500">Nothing to hint at, this one passed.</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {hints.map((hint) => {
        const level = revealed[hint.id] || 0;
        return (
          <div key={hint.id} className="rounded-control border border-zinc-950/10 surface-1 px-3 py-2.5">
            <p className="text-[12.5px] font-medium text-zinc-900">{hint.title}</p>
            {hint.concept && (
              <p className="mt-0.5 text-[11px] text-zinc-500">Concept: {hint.concept.name}</p>
            )}

            <div className="mt-2 space-y-2">
              {hint.steps.slice(0, level).map((step) => (
                <div key={step.level}>
                  <p className="widget-title">{step.label}</p>
                  <p className="mt-0.5 whitespace-pre-line text-[12px] leading-relaxed text-zinc-700">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            {level < hint.steps.length ? (
              <button
                className="btn-quiet mt-2.5 w-full text-[12px]"
                onClick={() => setRevealed((r) => ({ ...r, [hint.id]: level + 1 }))}
              >
                {level === 0 ? 'Give me a nudge' : level === 1 ? 'Explain the principle' : 'Show me the fix'}
              </button>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-400">That is the whole hint.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Group({ title, tone, dot, items, empty, onHighlight, compact = false, alert = false }) {
  return (
    <div>
      <h3 className={`mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {title}
        <span className="text-zinc-400">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-[12px] text-zinc-400">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className={`rounded-control px-2.5 py-2 transition-colors ${
                alert ? 'alert-card' : 'bg-zinc-900/[0.04]'
              } ${item.points?.length ? 'cursor-pointer hover:bg-bad/[0.12]' : ''}`}
              onClick={() => item.points?.length && onHighlight?.(item.points)}
            >
              <p className={`text-[12.5px] ${compact ? 'text-zinc-600' : 'font-medium text-zinc-900'}`}>
                {item.label}
              </p>
              {item.finding && (
                <p className={`mt-1 text-[12px] font-medium leading-relaxed ${tone}`}>{item.finding}</p>
              )}
              {item.detail && (
                <p className={`mt-1 leading-relaxed ${compact ? 'text-[11px] text-zinc-500' : 'text-[12px] text-zinc-700'}`}>
                  {item.detail}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2">
                {item.refs?.length > 0 && (
                  <span className="font-mono text-[11px] text-zinc-500">{[...new Set(item.refs)].join(', ')}</span>
                )}
                {item.points?.length > 0 && (
                  <span className="ml-auto text-[10.5px] font-medium text-bad">Click to locate ›</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NetlistView({ netlist, stats }) {
  return (
    <div>
      <p className="mb-2 text-[11.5px] text-zinc-500">
        {stats.components} components · {stats.nets} nets · {stats.pins} pins. This is what the checker sees: if
        two things you meant to connect appear on different nets, that is your bug.
      </p>
      <div className="grid gap-x-6 font-mono text-[11.5px] md:grid-cols-2">
        {netlist.map((net) => (
          <div key={net.name} className="flex gap-2 border-b border-zinc-950/10 py-1">
            <span className={net.isPower ? 'text-warn' : 'text-zinc-900'}>{net.name}</span>
            <span className="text-zinc-500">{net.pins.join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
