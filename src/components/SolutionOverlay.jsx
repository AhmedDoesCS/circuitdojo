import React, { useMemo, useState } from 'react';
import SolutionView from './SolutionView.jsx';
import { solutionDoc } from '../challenges/index.js';
import { compareToSolution } from '../engine/solution-diff.js';
import { getSymbol } from '../schematic/symbols/index.js';

/**
 * The reference answer, shown when the tries run out.
 *
 * Three attempts is the point at which another hint stops teaching and starts
 * grinding. What is shown here is not a picture of the answer: it is the same
 * document type the learner draws, graded by the same checker before it ever
 * ships (see tests/solutions.test.js). Beside it sits a comparison against
 * *their* sheet, because "here is the answer" is a much weaker lesson than
 * "here is the answer and here is where yours diverged".
 *
 * The sheet is never overwritten. The learner keeps what they built and can put
 * the reference beside it, which is the only version of this that respects the
 * work already done.
 */
export default function SolutionOverlay({ challenge, doc, result, onClose, onNext, onRetry }) {
  const [tab, setTab] = useState('circuit');
  const reference = useMemo(() => solutionDoc(challenge), [challenge]);
  const diff = useMemo(
    () => (reference ? compareToSolution(doc, reference) : null),
    [doc, reference]
  );

  const unresolved = result ? result.errors.length + result.missing.length : 0;
  const tabs = [
    ...(reference ? [{ id: 'circuit', label: 'Reference circuit' }] : []),
    ...(diff ? [{ id: 'diff', label: 'Yours vs the reference' }] : []),
    { id: 'why', label: 'Why it is that shape' },
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 animate-fade-in bg-zinc-200/[0.94]" />

      <div className="relative mx-6 flex max-h-[92vh] w-full max-w-4xl flex-col">
        <header className="animate-rise-in text-center">
          <span className="chip bg-warn/12 text-warn">Three attempts used</span>
          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-zinc-900">
            Here is the circuit that answers it
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-zinc-600">
            {challenge?.title}, {unresolved > 0 ? `${unresolved} requirement${unresolved === 1 ? '' : 's'} still unmet.` : ''}{' '}
            Your sheet is untouched. Read this, then rebuild it yourself.
          </p>
        </header>

        <div
          className="animate-rise-in mt-5 flex justify-center gap-1"
          style={{ animationDelay: '0.08s' }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-control px-3 py-1.5 text-[12.5px] font-medium transition-all duration-200 ease-smooth ${
                active === t.id ? 'surface-solid text-accent shadow-e1' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="animate-rise-in panel mt-4 min-h-0 flex-1 overflow-auto p-4"
          style={{ animationDelay: '0.16s' }}
        >
          {active === 'circuit' && reference && (
            /* Sheet and parts list, as a drawing is actually issued. The sheet
               takes a portrait-ish column because these circuits are ladders,
               given the full width it letterboxed itself into a thin strip in
               the middle with the drawing tiny. */
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_13.5rem]">
              <SolutionView
                doc={reference}
                title={challenge?.title}
                meta={`Level ${challenge?.level ?? '-'}`}
                // Height only. The sheet derives its own width from the
                // drawing's proportions, so `w-full` here would override that
                // and letterbox it again.
                className="h-[min(46vh,24rem)]"
              />
              <BillOfMaterials doc={reference} note={challenge?.solutionNote} />
            </div>
          )}

          {active === 'diff' && diff && <Diff diff={diff} />}

          {active === 'why' && (
            <div className="space-y-3">
              {/* Not every challenge ships a drawn reference yet. Say so, rather
                  than quietly showing one tab and letting it look broken. */}
              {!reference && (
                <p className="rounded-control bg-warn/[0.10] px-3 py-2 text-[12px] leading-relaxed text-zinc-700">
                  This challenge does not have a drawn reference circuit yet: what follows is the worked approach,
                  with the numbers for your version of it.
                </p>
              )}
              {challenge?.solutionNote && (
                <p className="text-[13.5px] leading-relaxed text-zinc-800">{challenge.solutionNote}</p>
              )}
              {challenge?.concept && (
                <p className="text-[13px] leading-relaxed text-zinc-600">{challenge.concept}</p>
              )}
              <ul className="mt-3 space-y-1.5">
                {(challenge?.brief?.spec || []).map((line, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-zinc-700">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          className="animate-rise-in mt-4 flex items-center justify-center gap-2"
          style={{ animationDelay: '0.24s' }}
        >
          <button className="btn-primary px-5 py-2.5 text-[14px]" onClick={onRetry}>
            Rebuild it on my sheet
          </button>
          <button className="btn-quiet px-5 py-2.5 text-[14px]" onClick={onNext}>
            Next challenge
          </button>
          <button className="btn-ghost px-4 py-2.5 text-[13px]" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The parts list that belongs beside a drawing.
 *
 * Power symbols are left out: they are a notation for a rail, not a component
 * anyone fits, which is the same distinction the netlist draws when it counts
 * "what the learner placed".
 */
function BillOfMaterials({ doc, note }) {
  const parts = doc.components
    .filter((c) => !getSymbol(c.symbolId)?.isPower)
    .map((c) => {
      const symbol = getSymbol(c.symbolId);
      const name = symbol?.name || c.symbolId;
      // Some symbols carry a part designation in the value field rather than a
      // measurement. "SW1 · Pushbutton · SW_PUSH" says the same thing twice;
      // "D1 · Zener diode · 5V1" does not, so only the echo is dropped.
      const echoes =
        !c.value ||
        c.value.toLowerCase() === c.symbolId.toLowerCase() ||
        c.value.toLowerCase() === name.toLowerCase();
      return { ref: c.ref, name, value: echoes ? null : c.value };
    });

  return (
    <aside className="flex min-h-0 flex-col">
      <h3 className="widget-title mb-2">Parts</h3>
      <ul className="space-y-1">
        {parts.map((p) => (
          <li key={p.ref} className="flex items-baseline gap-2 rounded-control bg-zinc-900/[0.04] px-2.5 py-1.5">
            <span className="font-mono text-[11.5px] font-semibold text-accent">{p.ref}</span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">{p.name}</span>
            {p.value && <span className="shrink-0 font-mono text-[11.5px] text-zinc-900">{p.value}</span>}
          </li>
        ))}
        {!parts.length && <li className="text-[12px] text-zinc-500">Nothing but rails.</li>}
      </ul>

      {note && (
        <p className="mt-3 border-t border-zinc-950/10 pt-3 text-[11.5px] leading-relaxed text-zinc-600">{note}</p>
      )}
    </aside>
  );
}

/** Part list and node list, side by side, marked with what is off. */
function Diff({ diff }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section>
        <h3 className="widget-title mb-2">Parts</h3>
        <ul className="space-y-1">
          {diff.parts.map((p) => (
            <li key={p.type} className="flex items-baseline gap-2 rounded-control bg-zinc-900/[0.04] px-2.5 py-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.ok ? 'bg-good' : 'bg-bad'}`} />
              <span className="text-[12.5px] text-zinc-900">{p.label}</span>
              <span className="ml-auto font-mono text-[11.5px] text-zinc-500">
                {p.yours} / {p.reference}
              </span>
            </li>
          ))}
          {!diff.parts.length && <li className="text-[12px] text-zinc-500">No parts in the reference.</li>}
        </ul>
      </section>

      <section>
        <h3 className="widget-title mb-2">Nodes the reference has</h3>
        <ul className="space-y-1">
          {diff.nodes.map((n) => (
            <li key={n.name} className="flex items-baseline gap-2 rounded-control bg-zinc-900/[0.04] px-2.5 py-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${n.ok ? 'bg-good' : 'bg-bad'}`} />
              <span className="font-mono text-[12px] text-zinc-900">{n.name}</span>
              <span className="ml-auto text-right font-mono text-[11px] text-zinc-500">{n.members}</span>
            </li>
          ))}
          {!diff.nodes.length && <li className="text-[12px] text-zinc-500">Nothing to compare.</li>}
        </ul>
      </section>
    </div>
  );
}
