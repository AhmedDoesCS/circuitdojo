import React, { useState } from 'react';
import Widget from './Widget.jsx';
import { TOPICS } from '../challenges/index.js';

/**
 * The challenge brief, once the intro has settled.
 *
 * Three tabs: the specification, the theory needed to satisfy it, and, for
 * challenges built around a microcontroller, the firmware contract. No steps,
 * no nudging: working out the topology is the exercise.
 */
export default function BriefWidget({
  challenge,
  onClose,
  onReplayIntro,
  onBrowse,
  onNewChallenge,
  onTooEasy,
  unresolved = 0,
}) {
  const [tab, setTab] = useState('spec');
  if (!challenge) return null;

  const tabs = [
    { id: 'spec', label: 'Spec' },
    { id: 'theory', label: 'Theory' },
    ...(challenge.firmware ? [{ id: 'firmware', label: 'Firmware' }] : []),
  ];

  return (
    <Widget
      className="max-h-[min(32rem,calc(100vh-9rem))] w-[21.5rem]"
      title="Challenge"
      subtitle={`Level ${challenge.level} · ${TOPICS[challenge.topic] || challenge.topic}`}
      onClose={onClose}
      actions={
        unresolved > 0 ? (
          <span className="chip animate-alert-pulse bg-bad/10 text-bad">{unresolved} to fix</span>
        ) : null
      }
      bodyClassName="px-4 py-3"
    >
      <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-zinc-900">{challenge.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-700">{challenge.brief.goal}</p>

      <div className="mt-3 flex rounded-control bg-zinc-900/[0.05] p-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-chip px-2.5 py-1 text-[11.5px] font-medium transition-all duration-200 ease-smooth ${
              tab === t.id ? 'surface-solid text-accent shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'spec' && (
        <>
          <ul className="mt-3 space-y-1.5">
            {challenge.brief.spec.map((line, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-zinc-700">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {challenge.brief.notes && (
            <p className="mt-3 border-l-2 border-zinc-950/15 pl-3 text-[12px] italic leading-relaxed text-zinc-600">
              {challenge.brief.notes}
            </p>
          )}
        </>
      )}

      {tab === 'theory' && <TheoryTab theory={challenge.theory || []} />}

      {tab === 'firmware' && <FirmwareTab firmware={challenge.firmware} />}

      <div className="mt-4 border-t border-zinc-950/10 pt-3">
        <div className="flex gap-1">
          <button className="btn-ghost flex-1 text-[12px]" onClick={onReplayIntro}>
            Replay brief
          </button>
          <button className="btn-ghost flex-1 text-[12px]" onClick={onBrowse}>
            Browse
          </button>
          <button className="btn-quiet flex-1 text-[12px]" onClick={onNewChallenge}>
            New
          </button>
        </div>
        {onTooEasy && (
          // The escape hatch for someone placed too low: claim this level and
          // jump a band, without sitting through a placement test.
          <button className="btn-ghost mt-1 w-full text-[12px] text-zinc-500" onClick={onTooEasy}>
            Too easy, go a level harder ↑
          </button>
        )}
      </div>
    </Widget>
  );
}

/**
 * Theory is always fully given: the equations, what they mean for this design,
 * the professional standard that applies, and where to read more.
 */
function TheoryTab({ theory }) {
  if (!theory.length) {
    return <p className="mt-3 text-[12.5px] text-zinc-500">No specific theory attached to this challenge.</p>;
  }
  return (
    <div className="mt-3 space-y-4">
      {theory.map((t) => (
        <div key={t.id}>
          <h4 className="text-[12.5px] font-semibold text-zinc-900">{t.name}</h4>
          {t.formulas?.map((f, i) => (
            <div key={i} className="mt-1.5">
              <p className="rounded-control bg-zinc-900/[0.05] px-2.5 py-1.5 font-mono text-[12px] text-zinc-900">
                {f.expr}
              </p>
              {f.note && <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-600">{f.note}</p>}
            </div>
          ))}
          {t.applies && (
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-700">
              <span className="font-medium text-zinc-900">Applying it: </span>
              {t.applies}
            </p>
          )}
          {t.standards && (
            <p className="mt-1.5 rounded-control bg-warn/[0.08] px-2.5 py-1.5 text-[11.5px] leading-relaxed text-zinc-700">
              <span className="font-medium">Practice: </span>
              {t.standards}
            </p>
          )}
          {t.refs?.length > 0 && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              Further reading: {t.refs.map((r) => `${r.title}, ${r.where}`).join('; ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * The firmware contract.
 *
 * MCU challenges bring programming considerations without any programming: the
 * firmware's behaviour is stated as a hardware contract, which pins are driven,
 * which are read, what state they hold during reset, and the schematic has to
 * make that behaviour possible.
 */
function FirmwareTab({ firmware }) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-[12px] leading-relaxed text-zinc-600">
        You are not writing code here. The firmware team has told you how the software will use the chip; your
        schematic has to support it.
      </p>

      {firmware.summary && <p className="text-[12.5px] leading-relaxed text-zinc-800">{firmware.summary}</p>}

      {firmware.pins?.length > 0 && (
        <div className="overflow-hidden rounded-control border border-zinc-950/10">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-zinc-900/[0.04]">
                <th className="px-2 py-1 text-left font-semibold text-zinc-600">Pin</th>
                <th className="px-2 py-1 text-left font-semibold text-zinc-600">Firmware uses it as</th>
                <th className="px-2 py-1 text-left font-semibold text-zinc-600">At reset</th>
              </tr>
            </thead>
            <tbody>
              {firmware.pins.map((p) => (
                <tr key={p.pin} className="border-t border-zinc-950/10">
                  <td className="px-2 py-1 font-mono text-zinc-900">{p.pin}</td>
                  <td className="px-2 py-1 text-zinc-700">{p.role}</td>
                  <td className="px-2 py-1 text-zinc-500">{p.reset || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {firmware.implications?.length > 0 && (
        <ul className="space-y-1.5">
          {firmware.implications.map((line, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-zinc-700">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-warn" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
