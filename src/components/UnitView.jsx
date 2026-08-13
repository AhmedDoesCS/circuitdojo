import React, { useEffect, useRef, useState } from 'react';
import MenuShell, { LogoMark, at } from './MenuShell.jsx';
import SolutionView from './SolutionView.jsx';
import LivesMeter from './LivesMeter.jsx';
import { unitSymbol } from '../schematic/units.js';

/**
 * The screen for a roadmap unit that is not a drawing.
 *
 * Analyse asks for a number. Inspect asks the learner to find the fault in
 * somebody else's schematic. Both exist because three of the four strands the
 * roadmap teaches cannot be taught by drawing: you cannot learn what loading
 * does to a divider, or that 3.147k is not a part you can buy, or how to review
 * a colleague's sheet, by being asked to draw one more circuit.
 *
 * It shares the menu shell rather than the workspace chrome. There is no canvas
 * to give the whole window to, and the tool dock, palette and properties panel
 * would all be furniture for tools that do not apply here.
 */
export default function UnitView({ unit, tries, maxTries, onCheck, onBack, result, checking }) {
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setValue('');
    setSelected(null);
  }, [unit.unitId, unit.seed]);

  useEffect(() => {
    if (unit.kind === 'analyse') inputRef.current?.focus();
  }, [unit.kind, unit.unitId]);

  const answered = unit.kind === 'analyse' ? value.trim() !== '' : Boolean(selected);
  const submit = () => onCheck(unit.kind === 'analyse' ? value : selected);

  return (
    <MenuShell pad="tight">
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.9rem,2.4vh,1.6rem)]">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="panel-pill animate-enter-up flex h-11 items-center gap-2 px-4 transition-transform duration-200 ease-smooth hover:scale-[1.02]"
            style={at(0)}
            title="Back to the menu"
          >
            <LogoMark size={18} />
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-900">CircuitDojo</span>
          </button>

          <div className="panel-pill animate-enter-up flex h-11 items-center gap-3 px-4" style={at(0.5)}>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
              {unit.kind === 'analyse' ? 'Analysis' : 'Review'}
            </span>
            <LivesMeter used={tries} total={maxTries} />
          </div>
        </header>

        <main className="grid min-h-0 flex-1 content-center gap-[clamp(1rem,3vw,2.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="flex min-w-0 flex-col justify-center">
            <p
              className="animate-enter-up font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500"
              style={at(1)}
            >
              Stage {unit.unit.stage} · {unit.unit.blockName}
            </p>
            <h1
              className="animate-intro-title mt-2 font-semibold leading-[1.05] tracking-[-0.03em] text-zinc-900"
              style={{ fontSize: 'clamp(1.5rem, min(3.4vw, 5vh), 2.4rem)', ...at(1.5) }}
            >
              {unit.title}
            </h1>
            <p
              className="animate-enter-up mt-3 max-w-[46ch] text-[15px] leading-relaxed text-zinc-700"
              style={at(2)}
            >
              {unit.prompt}
            </p>

            {unit.kind === 'analyse' ? (
              <form
                className="animate-enter-up mt-6 flex items-center gap-2"
                style={at(2.6)}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (answered && !checking) submit();
                }}
              >
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="your answer"
                  className="field w-40 font-mono text-[15px]"
                  aria-label="Your answer"
                />
                {unit.answerUnit && (
                  <span className="font-mono text-[15px] text-zinc-500">
                    {unitSymbol(unit.answerUnit)}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!answered || checking}
                  className="btn-primary ml-2 h-11 rounded-control px-5 text-[14px]"
                >
                  {checking ? 'Checking...' : 'Check'}
                </button>
              </form>
            ) : (
              <div className="animate-enter-up mt-6 flex items-center gap-3" style={at(2.6)}>
                <button
                  onClick={submit}
                  disabled={!answered || checking}
                  className="btn-primary h-11 rounded-control px-5 text-[14px]"
                >
                  {checking ? 'Checking...' : 'This is the fault'}
                </button>
                <span className="text-[12.5px] text-zinc-500">
                  {selected ? 'One item selected.' : 'Click the item you think is wrong.'}
                </span>
              </div>
            )}

            {/* Values are read the way they are written on a part: 4k7, 100n, 220R. */}
            {unit.kind === 'analyse' && (
              <p className="animate-fade-in mt-3 text-[11.5px] text-zinc-500" style={at(3.2)}>
                Engineering notation is fine: 4k7, 100n, 22m, 0.0227.
              </p>
            )}

            {result && !result.passed && (
              <div className="alert-card animate-widget-in mt-5 rounded-control px-3.5 py-3">
                <p className="text-[13px] font-medium text-zinc-900">{result.errors[0]?.label}</p>
                {result.errors[0]?.why && (
                  <p className="mt-1 text-[12.5px] font-medium text-bad">{result.errors[0].why}</p>
                )}
                {result.errors[0]?.detail && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-700">{result.errors[0].detail}</p>
                )}
              </div>
            )}
          </section>

          {unit.doc && (
            <section className="flex min-w-0 items-center justify-center">
              <SolutionView
                doc={unit.doc}
                animate={false}
                selectable={unit.kind === 'inspect'}
                selectedId={selected}
                onSelect={setSelected}
                className="h-[min(56vh,30rem)]"
              />
            </section>
          )}
        </main>
      </div>
    </MenuShell>
  );
}
