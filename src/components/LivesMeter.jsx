import React, { useEffect, useRef, useState } from 'react';

/**
 * Three lives, drawn as circuits.
 *
 * The heart is routed, not drawn: straight runs joined by 45° mitres, with a
 * via at each lobe, the same geometry rule the PCB background follows. It
 * should read as copper that happens to be heart-shaped, rather than a
 * valentine with a wire theme applied on top.
 *
 * A live heart is a closed loop with current running round it. A lost one is an
 * open circuit: the trace breaks at the bottom point, the charge drains out and
 * what is left is a dashed outline: the schematic convention for something
 * that is not really there.
 *
 * ## Why the loss animation is triggered here rather than passed in
 *
 * The parent knows how many lives are gone; it does not know which one just
 * went, and making it track that would put a piece of animation state into the
 * app's core. The meter compares `used` against its own previous value, so the
 * only thing that has to be true is that the number went up.
 */

const TOTAL = 3;
const FLASH_MS = 720; // must match .life-lost in index.css

/**
 * A heart routed like a trace. Every turn is 90° or 45°, on a 24×22 field.
 * Starts at the bottom point and runs anticlockwise.
 *
 * Exported because the full-screen loss draws the same heart at ten times the
 * size. Two definitions would drift, and the whole point is that the big one is
 * unmistakably the small one.
 */
export const HEART = 'M12 20.4 L2.4 10.8 L2.4 7.2 L5.4 4.2 L9 4.2 L12 7.2 L15 4.2 L18.6 4.2 L21.6 7.2 L21.6 10.8 Z';

/** The same route, opened at the bottom point, an incomplete circuit. */
export const HEART_BROKEN =
  'M10.6 19 L2.4 10.8 L2.4 7.2 L5.4 4.2 L9 4.2 L12 7.2 L15 4.2 L18.6 4.2 L21.6 7.2 L21.6 10.8 L13.4 19';

export default function LivesMeter({ used = 0, total = TOTAL, className = '' }) {
  const [breaking, setBreaking] = useState(-1);
  const previous = useRef(used);

  useEffect(() => {
    if (used > previous.current) {
      setBreaking(used - 1);
      previous.current = used;
      const timer = window.setTimeout(() => setBreaking(-1), FLASH_MS);
      return () => window.clearTimeout(timer);
    }
    previous.current = used;
    return undefined;
  }, [used]);

  const left = Math.max(0, total - used);

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      // One label rather than three, because three "life" images announced
      // separately is noise; what matters is the count.
      role="img"
      aria-label={`${left} of ${total} attempts remaining`}
      title={`${left} of ${total} attempts remaining: the reference circuit is shown when they run out`}
    >
      {Array.from({ length: total }, (_, i) => (
        <Life key={i} alive={i >= used} breaking={i === breaking} index={i} />
      ))}
    </div>
  );
}

function Life({ alive, breaking, index }) {
  return (
    <svg
      width="19"
      height="18"
      viewBox="0 0 24 22"
      fill="none"
      aria-hidden="true"
      className={breaking ? 'life-lost' : alive ? 'life-pulse' : ''}
      // Out-of-phase resting beats, so three hearts read as three circuits
      // rather than one animation applied three times.
      style={alive && !breaking ? { animationDelay: `${index * 0.42}s` } : undefined}
    >
      {/* Body. Present while the life is, and drained on the way out. */}
      {(alive || breaking) && (
        <path
          d={HEART}
          fill="rgb(var(--bad))"
          fillOpacity={breaking ? 0.22 : 0.16}
          className={breaking ? 'life-drain' : ''}
        />
      )}

      {/* The route itself. Solid while the loop is closed, dashed once it is not. */}
      <path
        d={alive || breaking ? HEART : HEART_BROKEN}
        stroke={alive || breaking ? 'rgb(var(--bad))' : 'currentColor'}
        strokeOpacity={alive || breaking ? 1 : 0.3}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={alive || breaking ? undefined : '2.6 2.6'}
      />

      {/* Current, running the closed loop. */}
      {alive && !breaking && (
        <path
          d={HEART}
          stroke="rgb(var(--bad))"
          strokeOpacity="0.85"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeDasharray="7 57"
          className="life-flow"
          style={{ animationDelay: `${index * 0.42}s` }}
        />
      )}

      {/* Vias at the lobes, the pads that make it a board and not a shape. */}
      {(alive || breaking) && (
        <>
          <circle cx="7.2" cy="7.2" r="1.5" fill="rgb(var(--bad))" fillOpacity="0.9" />
          <circle cx="16.8" cy="7.2" r="1.5" fill="rgb(var(--bad))" fillOpacity="0.9" />
        </>
      )}

      {/* The arc across the break, at the instant it opens. */}
      {breaking && (
        <g className="life-arc" stroke="rgb(var(--warn))" strokeWidth="1.6" strokeLinecap="round">
          <path d="M10.6 19 L12 16.4 L13.4 19" fill="none" />
          <path d="M8.6 21 L10.2 18.2M15.4 21 L13.8 18.2" />
        </g>
      )}
    </svg>
  );
}
