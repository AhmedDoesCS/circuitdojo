import React from 'react';

/**
 * The floating panel every piece of UI lives in.
 *
 * The canvas owns the whole screen; widgets sit above it, translucent, rounded
 * and dismissible. Keeping the shell in one place is what makes them all feel
 * like one system rather than five different panels.
 */
export default function Widget({
  title,
  subtitle,
  onClose,
  actions = null,
  children,
  className = '',
  bodyClassName = '',
  compact = false,
}) {
  return (
    <section className={`panel panel-float pointer-events-auto flex animate-widget-in flex-col overflow-hidden ${className}`}>
      {(title || onClose || actions) && (
        <header
          className={`flex items-center gap-2 border-b border-zinc-950/10 ${
            compact ? 'px-3 py-2' : 'px-4 py-2.5'
          }`}
        >
          <div className="min-w-0">
            {title && <h2 className="widget-title truncate">{title}</h2>}
            {subtitle && <p className="truncate text-[11px] text-ink-500">{subtitle}</p>}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {actions}
            {onClose && (
              <button className="icon-btn" onClick={onClose} title="Hide">
                <CloseIcon />
              </button>
            )}
          </div>
        </header>
      )}
      <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
