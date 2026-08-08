import React, { useEffect, useRef } from 'react';

/**
 * Full-screen celebration when a challenge passes.
 *
 * The confetti is drawn as tiny schematic glyphs: resistors, capacitors, LEDs,
 * chips, sparks and lightning bolts in the schematic palette, so the reward
 * belongs to the subject matter rather than being generic paper squares.
 *
 * Everything is canvas-drawn: no libraries, no images, and it stops on its own.
 */

const TYPES = ['resistor', 'capacitor', 'led', 'chip', 'bolt', 'spark', 'wire'];

/**
 * Confetti colours, read from the theme at spawn time.
 *
 * Canvas cannot inherit a custom property the way SVG can, so the palette has
 * to be sampled rather than referenced. Hardcoding it meant the celebration
 * fired light-mode maroon and forest green over a near-black scrim, where half
 * the particles simply did not show up.
 */
function paletteFromTheme() {
  const style = getComputedStyle(document.documentElement);
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return [
    read('--sch-body', '#8b1a1a'),
    read('--sch-wire', '#0f7a3d'),
    read('--sch-label', '#0d6e6e'),
    read('--sch-selected', '#1d6ff2'),
    `rgb(${read('--warn', '180 83 9')})`,
    `rgb(${read('--good', '21 128 61')})`,
  ];
}

export default function SuccessOverlay({ result, challenge, onNext, onStay }) {
  const canvasRef = useRef(null);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const stop = runConfetti(canvas);
    return stop;
  }, [reduced]);

  const stats = result?.stats || { components: 0, nets: 0 };
  const checksPassed = result?.correct?.length ?? 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden">
      {/* Flat scrim. This carried a 42rem blurred green glow behind it; the
          expanding rings below already say "passed" without a light source. */}
      <div className="absolute inset-0 animate-fade-in bg-zinc-200/[0.94]" />

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

      <div className="relative mx-6 w-full max-w-lg text-center">
        <div className="relative mx-auto mb-7 h-28 w-28">
          {!reduced && (
            <>
              <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-good/50" />
              <span
                className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-good/40"
                style={{ animationDelay: '0.6s' }}
              />
            </>
          )}
          <div className="animate-seal-pop absolute inset-0 flex items-center justify-center rounded-full surface-solid shadow-e3">
            <VerifiedMark />
          </div>
        </div>

        <h1
          className="animate-rise-in text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-950"
          style={{ animationDelay: '0.15s' }}
        >
          Circuit verified
        </h1>
        <p className="animate-rise-in mt-2 text-[15px] text-ink-600" style={{ animationDelay: '0.25s' }}>
          {challenge?.title}: it meets the specification and passes the electrical rules check.
        </p>

        <div
          className="animate-rise-in mt-7 flex items-center justify-center gap-8"
          style={{ animationDelay: '0.35s' }}
        >
          <Stat value={checksPassed} label="checks passed" />
          <Stat value={stats.components} label="components" />
          <Stat value={stats.nets} label="nets" />
        </div>

        <div
          className="animate-rise-in mt-9 flex items-center justify-center gap-2"
          style={{ animationDelay: '0.45s' }}
        >
          <button className="btn-primary px-5 py-2.5 text-[14px]" onClick={onNext}>
            Next challenge
          </button>
          <button className="btn-quiet px-5 py-2.5 text-[14px]" onClick={onStay}>
            Stay on this sheet
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="text-[26px] font-semibold tracking-[-0.02em] text-ink-950">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.08em] text-ink-500">{label}</div>
    </div>
  );
}

/** A tick drawn as a circuit trace, with junction dots at the corners. */
function VerifiedMark() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <path
        d="M12 30 H20 L25 39 L36 17 H44"
        stroke="var(--good)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="30" r="3.2" fill="var(--good)" />
      <circle cx="36" cy="17" r="3.2" fill="var(--good)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

function runConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  const COLORS = paletteFromTheme();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const particles = [];

  const spawn = (x, y, angle, spread, count, power) => {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const speed = power * (0.55 + Math.random() * 0.75);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.22,
        size: 7 + Math.random() * 9,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        type: TYPES[(Math.random() * TYPES.length) | 0],
        life: 0,
        ttl: 200 + Math.random() * 160,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  };

  // Two corner cannons plus a burst from the badge: the classic shape, in
  // schematic parts.
  spawn(0, height, -Math.PI / 3.1, 0.7, 60, 17);
  spawn(width, height, -Math.PI + Math.PI / 3.1, 0.7, 60, 17);
  setTimeout(() => {
    spawn(width / 2, height * 0.42, -Math.PI / 2, Math.PI * 1.9, 55, 11);
  }, 260);
  setTimeout(() => {
    spawn(width * 0.2, height, -Math.PI / 2.4, 0.6, 32, 15);
    spawn(width * 0.8, height, -Math.PI + Math.PI / 2.4, 0.6, 32, 15);
  }, 620);

  let raf = null;
  let stopped = false;

  const frame = () => {
    if (stopped) return;
    ctx.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += 1;
      p.vy += 0.24; // gravity
      p.vx *= 0.988; // drag
      p.vy *= 0.988;
      p.wobble += 0.09;
      p.x += p.vx + Math.sin(p.wobble) * 0.5;
      p.y += p.vy;
      p.rot += p.vrot;

      if (p.y > height + 60 || p.life > p.ttl) {
        particles.splice(i, 1);
        continue;
      }

      const fade = p.life > p.ttl - 60 ? Math.max(0, (p.ttl - p.life) / 60) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      drawGlyph(ctx, p);
      ctx.restore();
    }

    if (particles.length === 0) {
      stopped = true;
      return;
    }
    raf = window.requestAnimationFrame(frame);
  };
  raf = window.requestAnimationFrame(frame);

  return () => {
    stopped = true;
    if (raf) window.cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}

/** Each confetto is a miniature schematic symbol. */
function drawGlyph(ctx, p) {
  const s = p.size;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  ctx.lineWidth = Math.max(1.4, s * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (p.type) {
    case 'resistor': {
      const w = s;
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.lineTo(-w * 0.6, 0);
      ctx.lineTo(-w * 0.45, -s * 0.42);
      ctx.lineTo(-w * 0.15, s * 0.42);
      ctx.lineTo(w * 0.15, -s * 0.42);
      ctx.lineTo(w * 0.45, s * 0.42);
      ctx.lineTo(w * 0.6, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
      break;
    }
    case 'capacitor': {
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(-s * 0.25, 0);
      ctx.moveTo(s * 0.25, 0);
      ctx.lineTo(s, 0);
      ctx.moveTo(-s * 0.25, -s * 0.55);
      ctx.lineTo(-s * 0.25, s * 0.55);
      ctx.moveTo(s * 0.25, -s * 0.55);
      ctx.lineTo(s * 0.25, s * 0.55);
      ctx.stroke();
      break;
    }
    case 'led': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.5);
      ctx.lineTo(-s * 0.5, s * 0.5);
      ctx.lineTo(s * 0.45, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.45, -s * 0.5);
      ctx.lineTo(s * 0.45, s * 0.5);
      ctx.stroke();
      break;
    }
    case 'chip': {
      const w = s * 0.9;
      const h = s * 0.62;
      ctx.beginPath();
      ctx.roundRect?.(-w / 2, -h / 2, w, h, 2);
      if (!ctx.roundRect) ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      ctx.beginPath();
      for (const dx of [-w * 0.28, 0, w * 0.28]) {
        ctx.moveTo(dx, -h / 2);
        ctx.lineTo(dx, -h / 2 - s * 0.22);
        ctx.moveTo(dx, h / 2);
        ctx.lineTo(dx, h / 2 + s * 0.22);
      }
      ctx.stroke();
      break;
    }
    case 'bolt': {
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.7);
      ctx.lineTo(-s * 0.42, s * 0.08);
      ctx.lineTo(-s * 0.04, s * 0.08);
      ctx.lineTo(-s * 0.16, s * 0.72);
      ctx.lineTo(s * 0.44, -s * 0.12);
      ctx.lineTo(s * 0.04, -s * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'wire': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, 0);
      ctx.lineTo(s * 0.8, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.8, 0, s * 0.17, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // spark
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}
