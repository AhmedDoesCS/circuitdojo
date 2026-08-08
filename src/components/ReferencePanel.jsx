import React, { useMemo, useState } from 'react';
import { REFERENCE, searchReference } from '../reference/content.js';
import Widget from './Widget.jsx';

/**
 * On-demand reference. Opened by the learner, never auto-popped: noticing that
 * you are stuck and choosing to look something up is part of the skill.
 */
export default function ReferencePanel({ onClose }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(REFERENCE[0].id);
  const entries = useMemo(() => searchReference(query), [query]);

  return (
    <Widget
      title="Reference"
      onClose={onClose}
      className="max-h-[min(34rem,calc(100vh-9rem))] w-[21rem]"
      bodyClassName="px-2 pb-3"
    >
      <div className="sticky top-0 z-10 surface-2 px-1 pb-2 pt-2">
        <input
          className="field"
          placeholder="Ohm's law, pull-up, RC, 555..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {entries.length === 0 && <p className="px-2 py-4 text-[13px] text-ink-500">Nothing matches "{query}".</p>}

      {entries.map((entry) => {
        const isOpen = openId === entry.id || query.trim().length > 0;
        return (
          <div key={entry.id} className="mb-0.5">
            <button
              className="flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-left text-[13px] font-medium text-ink-950 transition-colors hover:bg-zinc-950/[0.045]"
              onClick={() => setOpenId(isOpen && openId === entry.id ? null : entry.id)}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 12 12"
                fill="none"
                className={`shrink-0 text-ink-400 transition-transform duration-200 ease-smooth ${
                  isOpen ? 'rotate-90' : ''
                }`}
              >
                <path d="M4 2.5L8 6L4 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {entry.title}
            </button>
            {isOpen && (
              <div className="space-y-2 px-3 pb-3 pt-1">
                {entry.body.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Widget>
  );
}

function Block({ block }) {
  if (block.kind === 'formula') {
    return (
      <p className="rounded-control bg-accent/[0.07] px-2.5 py-2 font-mono text-[12px] text-accent-deep">
        {block.text}
      </p>
    );
  }
  if (block.kind === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr>
              {block.head.map((h) => (
                <th key={h} className="border-b border-zinc-950/10 py-1 pr-2 text-left font-semibold text-ink-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border-b border-zinc-950/10 py-1 pr-2 text-ink-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p className="text-[12px] leading-relaxed text-ink-600">{block.text}</p>;
}
