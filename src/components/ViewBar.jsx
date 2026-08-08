import React from 'react';

/**
 * Widget switchboard: every panel in the app is a toggle here, plus Focus,
 * which strips the screen back to just what a challenge needs: canvas, tools
 * and the brief.
 */

const S = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };

export default function ViewBar({ widgets, toggle, focus, onToggleFocus, onOpenProfile, guestLabel }) {
  return (
    <div className="pointer-events-auto flex animate-widget-in items-center gap-2">
      {/* Toggles stay available in focus view: the brief has to be reachable
          while solving, otherwise "minimal" just means "unusable". */}
      <div className="panel-pill panel-float flex items-center gap-0.5 p-1">
        <Toggle active={widgets.brief} onClick={() => toggle('brief')} title="Challenge brief">
          <BriefIcon />
        </Toggle>
        <Toggle active={widgets.palette} onClick={() => toggle('palette')} title="Components">
          <PartsIcon />
        </Toggle>
        <Toggle active={widgets.properties} onClick={() => toggle('properties')} title="Properties">
          <SlidersIcon />
        </Toggle>
        <Toggle active={widgets.reference} onClick={() => toggle('reference')} title="Reference">
          <BookIcon />
        </Toggle>
        <Toggle active={widgets.status} onClick={() => toggle('status')} title="Status readout">
          <GaugeIcon />
        </Toggle>
      </div>

      <button
        onClick={onToggleFocus}
        title={focus ? 'Leave focus view' : 'Focus view, hide everything but the essentials'}
        className={`panel-pill panel-float flex h-11 items-center gap-2 px-4 text-[13px] font-medium transition-all duration-200 ease-smooth active:scale-[0.97] ${
          focus ? 'bg-accent text-on-accent' : 'text-ink-700 hover:text-ink-950'
        }`}
      >
        <FocusIcon />
        {focus ? 'Focused' : 'Focus'}
      </button>

      {!focus && (
        <button
          onClick={onOpenProfile}
          title="Progress and account"
          className="panel-pill panel-float flex h-11 items-center gap-2 px-4 text-[13px] font-medium text-ink-700 transition-all duration-200 ease-smooth hover:text-ink-950 active:scale-[0.97]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
            {guestLabel.slice(0, 1).toUpperCase()}
          </span>
          {guestLabel}
        </button>
      )}
    </div>
  );
}

function Toggle({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-smooth active:scale-[0.94] ${
        active ? 'bg-accent text-on-accent shadow-[0_2px_8px_-2px_rgba(0,113,227,0.5)]' : 'text-ink-600 hover:bg-zinc-950/[0.05] hover:text-ink-950'
      }`}
    >
      {children}
    </button>
  );
}

function BriefIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3.5 2.5h9v11h-9z" {...S} />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" {...S} />
    </svg>
  );
}
function PartsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 8h2l1.2-3 1.6 6 1.6-6L9.6 8H14" {...S} />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 5h12M2 11h12" {...S} />
      <circle cx="6" cy="5" r="1.9" {...S} />
      <circle cx="10.5" cy="11" r="1.9" {...S} />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2.5 3.5h4a2 2 0 012 2v7a1.6 1.6 0 00-1.6-1.4H2.5z" {...S} />
      <path d="M13.5 3.5h-4a2 2 0 00-2 2v7a1.6 1.6 0 011.6-1.4h4.4z" {...S} />
    </svg>
  );
}
function GaugeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2.5 11a5.5 5.5 0 1111 0" {...S} />
      <path d="M8 11l2.6-3.2" {...S} />
    </svg>
  );
}
function FocusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 5.5V3a1 1 0 011-1h2.5M14 5.5V3a1 1 0 00-1-1h-2.5M2 10.5V13a1 1 0 001 1h2.5M14 10.5V13a1 1 0 01-1 1h-2.5" {...S} />
    </svg>
  );
}
