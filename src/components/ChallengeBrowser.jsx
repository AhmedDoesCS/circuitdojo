import React, { useState } from 'react';
import { TEMPLATES, TOPICS, conceptsOf, levelOf } from '../challenges/index.js';
import { CONCEPTS, getConcept, DOMAINS } from '../challenges/concepts.js';
import { LEVELS, HOLD, masteryOf } from '../lib/level.js';
import { CloseIcon } from './Widget.jsx';

/**
 * Concept browser.
 *
 * Challenges are normally drawn at random for your level, so this is not a
 * roadmap: it is a way to go looking for something specific. Everything stays
 * reachable, including material above the current level: curiosity is not a
 * thing to gate.
 */
export default function ChallengeBrowser({ open, onClose, onPick, mastery = {}, level, currentTemplateId }) {
  const [query, setQuery] = useState('');
  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matches = (t) => {
    if (!q) return true;
    const hay = [t.title, t.concept, t.topic, ...conceptsOf(t).map((id) => getConcept(id)?.name || id)]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-zinc-900/25 p-6"
      onClick={onClose}
    >
      <div
        className="panel max-h-full w-full max-w-4xl animate-widget-in overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-950/10 surface-2 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">Find a challenge</h2>
            <p className="text-[11.5px] text-zinc-500">
              {TEMPLATES.length} recipes · {CONCEPTS.length} concepts · every one regenerates with fresh numbers
            </p>
          </div>
          <input
            className="field ml-auto max-w-[16rem]"
            placeholder="Search concepts or circuits..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="icon-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="space-y-6 p-5">
          {LEVELS.map((band) => {
            const templates = TEMPLATES.filter((t) => levelOf(t) === band.level && matches(t));
            if (!templates.length) return null;
            const isCurrent = level?.level === band.level;
            return (
              <section key={band.level}>
                <div className="mb-2 flex items-baseline gap-2">
                  <span
                    className={`chip ${isCurrent ? 'bg-accent text-on-accent' : 'bg-zinc-900/[0.06] text-zinc-600'}`}
                  >
                    Level {band.level}
                  </span>
                  <h3 className="text-[13.5px] font-semibold text-zinc-900">{band.name}</h3>
                  <span className="truncate text-[11.5px] text-zinc-500">{band.blurb}</span>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {templates.map((template) => {
                    const concepts = conceptsOf(template);
                    return (
                      <button
                        key={template.id}
                        onClick={() => onPick(template.id)}
                        className={`rounded-control px-3 py-2.5 text-left transition-all duration-200 ease-smooth active:scale-[0.99] ${
                          template.id === currentTemplateId
                            ? 'bg-zinc-900/[0.10] ring-1 ring-zinc-400'
                            : 'bg-zinc-900/[0.04] hover:bg-zinc-900/[0.07]'
                        }`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13.5px] font-medium text-zinc-900">{template.title}</span>
                          <span className="chip ml-auto shrink-0 surface-2 text-[10.5px] text-zinc-600">
                            {TOPICS[template.topic] || template.topic}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-600">{template.concept}</p>
                        {concepts.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {concepts.map((id) => {
                              const c = getConcept(id);
                              if (!c) return null;
                              const held = masteryOf(mastery, id) >= HOLD;
                              return (
                                <span
                                  key={id}
                                  title={`${DOMAINS[c.domain] || c.domain} · level ${c.level}`}
                                  className={`chip text-[10px] ${
                                    held ? 'bg-good/12 text-good' : 'bg-zinc-900/[0.06] text-zinc-500'
                                  }`}
                                >
                                  {held && '✓ '}
                                  {c.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
