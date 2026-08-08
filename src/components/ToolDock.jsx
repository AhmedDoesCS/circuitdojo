import React from 'react';
import LivesMeter from './LivesMeter.jsx';

/**
 * The floating tool dock.
 *
 * One pill at the bottom of the screen carries everything needed to draw, so
 * the canvas keeps the entire window. Labels appear on the active tool only,
 * enough to stay learnable without a permanent wall of text.
 */

const TOOLS = [
  { id: 'select', label: 'Select', hint: 'S', Icon: CursorIcon },
  { id: 'wire', label: 'Wire', hint: 'W', Icon: WireIcon },
  { id: 'junction', label: 'Junction', hint: 'J', Icon: JunctionIcon },
  { id: 'label', label: 'Label', hint: 'L', Icon: LabelIcon },
  { id: 'noconnect', label: 'No-connect', hint: 'Q', Icon: NoConnectIcon },
];

export default function ToolDock({
  tool,
  setTool,
  schematic,
  onRunCheck,
  checking,
  hasSelection,
  tries = 0,
  maxTries = 3,
  compact = false,
}) {
  return (
    <div className="pointer-events-auto flex animate-widget-in items-center gap-2">
      <div className="panel-pill panel-float flex items-center gap-0.5 p-1">
        {TOOLS.map(({ id, label, hint, Icon }) => {
          const active = tool === id;
          return (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={`${label} (${hint})`}
              className={`btn-tool ${active ? 'btn-tool-active' : ''}`}
            >
              <Icon />
              {active && <span className="pr-0.5">{label}</span>}
            </button>
          );
        })}

        <span className="mx-1 h-5 w-px bg-zinc-950/[0.08]" />

        <IconButton title="Undo (Ctrl+Z)" onClick={schematic.undo} disabled={!schematic.canUndo}>
          <UndoIcon />
        </IconButton>
        <IconButton title="Redo (Ctrl+Shift+Z)" onClick={schematic.redo} disabled={!schematic.canRedo}>
          <RedoIcon />
        </IconButton>

        {!compact && (
          <>
            <span className="mx-1 h-5 w-px bg-zinc-950/[0.08]" />
            <IconButton
              title="Rotate selection (R)"
              onClick={() => schematic.rotate(schematic.selection)}
              disabled={!hasSelection}
            >
              <RotateIcon />
            </IconButton>
            <IconButton
              title="Mirror selection (X)"
              onClick={() => schematic.mirror(schematic.selection)}
              disabled={!hasSelection}
            >
              <MirrorIcon />
            </IconButton>
            <IconButton
              title="Delete selection (Del)"
              onClick={() => schematic.remove(schematic.selection)}
              disabled={!hasSelection}
            >
              <TrashIcon />
            </IconButton>
          </>
        )}
      </div>

      {/* Lives sit against the button that spends them. Anywhere else and the
          break plays somewhere the eye is not, the results panel arrives in
          the same frame and would take the attention. */}
      <div className="panel-pill panel-float flex h-11 items-center px-3">
        <LivesMeter used={tries} total={maxTries} />
      </div>

      <button
        onClick={onRunCheck}
        disabled={checking}
        className="btn-primary h-11 min-w-[7.5rem] rounded-control px-5 text-[14px]"
      >
        {checking ? 'Checking...' : 'Run Check'}
      </button>
    </div>
  );
}

function IconButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-all duration-200 ease-smooth hover:bg-zinc-950/[0.05] hover:text-ink-950 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- icons */
const S = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };

function CursorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 2l4.2 11 1.8-4.4L13.4 7z" {...S} />
    </svg>
  );
}
function WireIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 11h4V5h4v6h4" {...S} />
    </svg>
  );
}
function JunctionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M8 2v12M2 8h12" {...S} />
      <circle cx="8" cy="8" r="2.6" fill="currentColor" />
    </svg>
  );
}
function LabelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2.5 6.5h7l3.5 3-3.5 3h-7z" {...S} />
      <circle cx="2.5" cy="9.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
function NoConnectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M4 4l8 8M12 4l-8 8" {...S} />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M4 7h6a3 3 0 010 6H7" {...S} />
      <path d="M6.5 4.5L4 7l2.5 2.5" {...S} />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M12 7H6a3 3 0 000 6h3" {...S} />
      <path d="M9.5 4.5L12 7l-2.5 2.5" {...S} />
    </svg>
  );
}
function RotateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M13 8a5 5 0 11-1.6-3.7" {...S} />
      <path d="M13 2.5V5h-2.5" {...S} />
    </svg>
  );
}
function MirrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M8 2v12" {...S} strokeDasharray="2 2" />
      <path d="M6 5L3 8l3 3zM10 5l3 3-3 3z" {...S} />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" {...S} />
    </svg>
  );
}
