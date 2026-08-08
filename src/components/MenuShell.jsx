import React from 'react';

/**
 * The full-screen "menu" shell shared by the home screen, the onboarding flow
 * and the challenge brief.
 *
 * Design intent: this is a game menu, not a web page:
 *
 *  - **Locked viewport.** `fixed inset-0` + `overflow-hidden`. Nothing scrolls,
 *    nothing shifts. A menu that can be scrolled feels like a document.
 *  - **Generous safe area.** Margins scale with the viewport
 *    (`clamp(2.5rem, 8vw, 10rem)`), so the content sits in the middle of a
 *    large calm field instead of hugging the edges like a website header.
 *  - **Fluid type.** Every size is a `clamp()`, so the layout fits at 1280×720
 *    and at 4K without a media query or a scrollbar.
 *  - **Ambient board.** A flat printed circuit behind the content gives the
 *    screen life without asking for attention. Drawn, not blurred.
 */
/**
 * Safe-area presets.
 *
 * `calm` is the wide field the home screen sits in. `tight` hugs the edges the
 * way a game HUD does, and is what the brief uses: when the content is a single
 * centred column, the margin that matters is the one around the column, not the
 * one around the screen, so the frame can come in close without crowding
 * anything. Both are symmetric, so the inset reads as one consistent margin
 * rather than four different ones.
 */
const PAD = {
  calm: { paddingInline: 'clamp(2.5rem, 8vw, 10rem)', paddingBlock: 'clamp(2rem, 7vh, 5.5rem)' },
  tight: { paddingInline: 'clamp(1.1rem, 3vw, 2.5rem)', paddingBlock: 'clamp(1.1rem, 3vh, 2.5rem)' },
};

export default function MenuShell({
  children,
  onBackdropClick = null,
  ambient = true,
  className = '',
  pad = 'calm',
}) {
  return (
    <div
      className={`fixed inset-0 z-40 overflow-hidden bg-zinc-150 ${className}`}
      onClick={onBackdropClick || undefined}
    >
      {ambient && <AmbientBoard />}

      {/* The safe area. Content is centred and never touches the edges. */}
      <div className="relative z-10 flex h-full w-full flex-col justify-center" style={PAD[pad] || PAD.calm}>
        {children}
      </div>
    </div>
  );
}

/**
 * One entrance beat for every menu screen.
 *
 * Home, brief and placement all count in the same 50ms unit, in reading order,
 * so moving between them feels like one product rather than three screens that
 * happen to share a shell. `at(2.5)` is "two and a half beats in", fractional
 * steps let a stack tighten to half a beat without a second timing system.
 *
 * ## Why there is a lead-in
 *
 * These screens mount at the *midpoint* of the iris wipe, while the cover is
 * still closed. Without a lead-in the whole entrance plays behind that cover
 * and the screen is simply there when the iris opens, all the choreography,
 * none of it seen. `LEAD_IN` holds the first element back until the iris has
 * started revealing, so the cascade happens in front of the viewer.
 *
 * It is deliberately shorter than the full reveal: the elements should be
 * arriving *as* the screen opens, not waiting politely for it to finish.
 *
 * This lives here rather than in each screen because three copies of a timing
 * constant is three chances for them to drift apart.
 */
const LEAD_IN = 0.2;
export const BEAT = 0.05;
export const at = (step) => ({ animationDelay: `${(LEAD_IN + step * BEAT).toFixed(3)}s` });

/**
 * One row in a menu: a mono index, a label, a hint, and optional trailing meta.
 *
 * This replaced an oversized row with a growing leading rule, the affordance
 * of a 2015 landing page. Games number their options, and the number doubles as
 * the digit shortcut, so the badge is documentation rather than decoration.
 *
 * `emphasis="primary"` scales it up for the one action a screen exists for; the
 * anatomy stays identical, which is what makes a stack of these read as a
 * single menu with a clear first choice.
 */
export function MenuOption({
  index,
  label,
  hint,
  meta,
  onClick,
  active = false,
  disabled = false,
  emphasis = 'secondary',
  /**
   * Drop the hint on short windows. Set it on long lists: six rows carrying a
   * second line each is 90px that a 520px-tall window does not have, and the
   * labels alone still say what every option is. Degrading by shedding detail
   * beats degrading by pushing the last option off the screen.
   */
  compact = false,
  onHover,
  buttonRef,
  delay,
}) {
  const primary = emphasis === 'primary';

  return (
    /**
     * The entrance lives on a wrapper, not on the button.
     *
     * `animate-enter-up` animates `transform`, and so does the hover lift. A
     * filled keyframe animation outranks a plain declaration, so the two were
     * fighting over the same property: the lift was applied, dropped or
     * half-applied depending on where the entrance had got to, which is what
     * made hovering an option judder. One element, one owner of `transform`.
     */
    <div className="animate-enter-up" style={delay}>
      <button
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={onHover}
        disabled={disabled}
        className={`${primary ? 'panel' : 'panel-pill'} group flex w-full items-center text-left
        transition-[transform,background-color,color,border-color] duration-300 ease-smooth
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/45
        disabled:pointer-events-none disabled:opacity-40
        ${primary ? 'gap-[clamp(0.75rem,1.4vw,1.15rem)] p-[clamp(0.7rem,1.5vh,1.05rem)] active:scale-[0.99]' : 'gap-3 px-4 py-[clamp(0.5rem,1.2vh,0.7rem)] active:scale-[0.98]'}
        ${active ? '-translate-y-0.5' : ''}`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-full font-mono transition-colors duration-300
            ${primary ? 'text-[12px]' : 'h-6 w-6 text-[10px]'}
            ${active || primary ? 'bg-accent text-on-accent' : 'bg-zinc-900/[0.06] text-zinc-500'}`}
          style={primary ? { height: 'clamp(2.25rem,4.4vh,2.9rem)', width: 'clamp(2.25rem,4.4vh,2.9rem)' } : undefined}
        >
          {index}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate font-semibold tracking-[-0.01em] transition-transform duration-300 ease-smooth
              ${primary ? 'text-zinc-900' : 'text-[13px] text-zinc-800'}
              ${active ? (primary ? 'translate-x-1' : 'translate-x-0.5') : ''}`}
            style={primary ? { fontSize: 'clamp(1.05rem, min(1.9vw, 3.2vh), 1.45rem)' } : undefined}
          >
            {label}
          </span>
          {hint && (
            <span
              className={`block truncate text-zinc-500 ${primary ? 'mt-0.5 text-[12px]' : 'text-[11px]'} ${
                compact ? '[@media(max-height:560px)]:hidden' : ''
              }`}
            >
              {hint}
            </span>
          )}
        </span>

        {meta && <span className="shrink-0 font-mono text-[11px] text-zinc-500">{meta}</span>}
      </button>
    </div>
  );
}

/**
 * The primary action, divided in two.
 *
 * Once there is a sheet in progress there are two leading actions, not one, and
 * they are not equals: continuing is what the learner almost always wants, and
 * starting over throws work away. Two separate full-width rows would say they
 * are alternatives of equal weight and would push the menu down a row. One
 * primary-sized panel split unevenly: continue taking the majority and the
 * badge, start-new taking the end: says "same decision, two answers" and costs
 * the layout nothing.
 *
 * Each half is its own button so the keyboard walk still visits both.
 */
export function MenuSplit({ left, right, delay }) {
  return (
    <div
      className="panel animate-enter-up flex w-full items-stretch overflow-hidden"
      style={delay}
    >
      <button
        ref={left.buttonRef}
        onClick={left.onClick}
        onMouseEnter={left.onHover}
        onFocus={left.onHover}
        className={`group flex min-w-0 flex-1 items-center text-left focus:outline-none
          transition-[transform,background-color,color] duration-300 ease-smooth focus-visible:ring-2 focus-visible:ring-accent/45
          gap-[clamp(0.75rem,1.4vw,1.15rem)] p-[clamp(0.7rem,1.5vh,1.05rem)] active:scale-[0.99]
          ${left.active ? '-translate-y-0.5' : ''}`}
      >
        <span
          className="flex shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[12px] text-on-accent"
          style={{ height: 'clamp(2.25rem,4.4vh,2.9rem)', width: 'clamp(2.25rem,4.4vh,2.9rem)' }}
        >
          {left.index}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate font-semibold tracking-[-0.01em] text-zinc-900 transition-transform duration-300 ease-smooth ${
              left.active ? 'translate-x-1' : ''
            }`}
            style={{ fontSize: 'clamp(1.05rem, min(1.9vw, 3.2vh), 1.45rem)' }}
          >
            {left.label}
          </span>
          {left.hint && <span className="mt-0.5 block truncate text-[12px] text-zinc-500">{left.hint}</span>}
        </span>
      </button>

      <span className="my-[clamp(0.55rem,1.2vh,0.9rem)] w-px shrink-0 bg-zinc-950/10" />

      <button
        ref={right.buttonRef}
        onClick={right.onClick}
        onMouseEnter={right.onHover}
        onFocus={right.onHover}
        className={`group flex min-w-0 shrink-0 basis-[38%] items-center gap-2.5 px-[clamp(0.75rem,1.4vw,1.15rem)] text-left
          transition-[transform,background-color,color] duration-300 ease-smooth active:scale-[0.99]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/45
          ${right.active ? '-translate-y-0.5' : ''}`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] transition-colors duration-300 ${
            right.active ? 'bg-accent text-on-accent' : 'bg-zinc-900/[0.06] text-zinc-500'
          }`}
        >
          {right.index}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] font-semibold tracking-[-0.01em] text-zinc-800 transition-transform duration-300 ease-smooth ${
              right.active ? 'translate-x-0.5' : ''
            }`}
          >
            {right.label}
          </span>
          {right.hint && (
            <span className="block truncate text-[11px] text-zinc-500 [@media(max-height:560px)]:hidden">
              {right.hint}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/** Small eyebrow label above a heading: sets context without stealing focus. */
export function Eyebrow({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 'clamp(0.6rem, 1.4vh, 1.1rem)' }}>
      {children}
    </div>
  );
}

/**
 * The board behind the menus: a printed circuit, drawn flat.
 *
 * This replaced three drifting blurred colour blobs. Those were the only soft
 * gradients left in the app, and at 38rem across with a 3xl blur they were the
 * single least flat thing on screen, a lava lamp behind a Material UI.
 *
 * What makes this read as a PCB rather than as generic "tech lines":
 *
 *  - **45° routing.** Copper never turns a sharp 90° corner, the etchant
 *    undercuts an acute angle and the corner traps flux. Every corner here is
 *    mitred by `route()`, which is the single detail that separates a real
 *    layout from a decorative circuit motif.
 *  - **Annular vias.** A via is a plated hole: a ring, not a dot. Drawn as a
 *    stroked circle so the barrel reads as hollow.
 *  - **Footprints, not symbols.** ICs are a silkscreen outline with pads down
 *    two sides; passives are two pads with a gap. A schematic symbol here would
 *    be a category error: this is the board, not the drawing of it.
 *  - **Ground pour.** Hatched fill, which is how a copper region is rendered on
 *    a fabrication plot.
 *
 * All flat: no blur, no gradient, no shadow. Colour comes from the schematic
 * tokens, so the board follows the theme instead of staying light-mode green on
 * a dark page.
 */

/**
 * Mitre a Manhattan waypoint list into a 45°-cornered copper route.
 *
 * Each interior corner is cut back along both legs by `chamfer`, and the two
 * cut points joined, turning every right angle into the diagonal a real
 * autorouter would lay down. The cut is clamped to half the shorter leg so
 * closely spaced waypoints degrade gracefully instead of overshooting.
 */
function route(points, chamfer = 16) {
  if (points.length < 2) return '';
  const d = [`M${points[0][0]} ${points[0][1]}`];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const c = Math.min(chamfer, inLen / 2, outLen / 2);
    d.push(`L${cx - Math.sign(cx - px) * c} ${cy - Math.sign(cy - py) * c}`);
    d.push(`L${cx + Math.sign(nx - cx) * c} ${cy + Math.sign(ny - cy) * c}`);
  }
  const [lx, ly] = points[points.length - 1];
  d.push(`L${lx} ${ly}`);
  return d.join(' ');
}

/** Signal routes. Waypoints only, `route()` supplies the 45° corners. */
const NETS = [
  [[-40, 168], [232, 168], [232, 296], [536, 296], [536, 128], [872, 128], [872, 392], [1240, 392]],
  [[-40, 624], [188, 624], [188, 472], [428, 472], [428, 688], [704, 688], [704, 528], [1240, 528]],
  [[168, -40], [168, 96], [352, 96], [352, 248], [288, 248], [288, 472]],
  [[1240, 236], [1048, 236], [1048, 448], [944, 448], [944, 616], [1112, 616], [1112, 840]],
  [[-40, 384], [128, 384], [128, 240], [312, 240]],
  [[600, 840], [600, 704], [788, 704], [788, 592]],
];

/** Plated through-holes, at points where a net would change layer. */
const VIAS = [
  [232, 296], [536, 128], [872, 392], [428, 472], [704, 528],
  [352, 248], [944, 448], [128, 240], [788, 592], [1048, 236],
];

/** Two-pad passives sitting on a net. [x, y, horizontal] */
const PASSIVES = [
  [400, 296, true], [700, 128, true], [560, 688, true],
  [288, 380, false], [1048, 340, false], [188, 552, false],
];

/** IC footprints: outline plus pads down two sides. */
const CHIPS = [
  { x: 452, y: 372, w: 148, h: 96, pins: 6 },
  { x: 936, y: 92, w: 112, h: 76, pins: 5 },
  { x: 116, y: 636, w: 124, h: 84, pins: 5 },
];

export function AmbientBoard({ dense = false }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* Faint enough to be texture rather than content. The board can afford
          more movement precisely because it sits this far back, at 17% the
          same animation read as traffic. */}
      <svg
        className={`absolute inset-0 h-full w-full ${dense ? 'opacity-[0.07]' : 'opacity-[0.09]'}`}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Copper pour, plotted as hatch the way a fab drawing renders it. */}
          <pattern id="pour-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="9" stroke="var(--sch-wire)" strokeWidth="1.1" />
          </pattern>
        </defs>

        {/* Ground pours, behind everything. */}
        <g opacity="0.5">
          <rect x="-20" y="-20" width="300" height="190" fill="url(#pour-hatch)" />
          <rect x="900" y="640" width="330" height="200" fill="url(#pour-hatch)" />
        </g>

        {/* Copper. One weight, mitred corners, square-cut ends like etched foil. */}
        <g fill="none" stroke="var(--sch-wire)" strokeWidth="2.4" strokeLinejoin="round">
          {NETS.map((net, i) => (
            <path key={i} d={route(net)} opacity="0.6" />
          ))}

          {/* Current on every net, each at its own rate and phase. Prime-ish
              durations keep the packets from syncing up into a visible pulse.
              The dash period matches the keyframe's 300 offset, so a packet
              runs the whole route and restarts without a jump. */}
          {NETS.map((net, i) => (
            <path
              key={`flow-${i}`}
              d={route(net)}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="18 282"
              className="animate-trace-flow"
              style={{
                animationDuration: `${[5.5, 7, 6.2, 8.5, 4.8, 7.8][i]}s`,
                animationDelay: `${[0, 1.4, 2.9, 0.7, 3.6, 2.1][i]}s`,
              }}
            />
          ))}
        </g>

        {/* Vias: plated holes, so a ring rather than a dot. They breathe out of
            phase, which is what stops the board reading as a static wallpaper. */}
        <g fill="none" stroke="var(--sch-wire)" strokeWidth="2.2">
          {VIAS.map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="5.5"
              className="animate-via-pulse"
              style={{ animationDuration: `${3.2 + (i % 5) * 0.9}s`, animationDelay: `${(i % 7) * 0.55}s` }}
            />
          ))}
        </g>

        {/* Passive footprints: two pads and the gap the body bridges. */}
        <g fill="var(--sch-body)">
          {PASSIVES.map(([x, y, horizontal], i) =>
            horizontal ? (
              <g key={i}>
                <rect x={x - 26} y={y - 7} width="16" height="14" rx="1.5" />
                <rect x={x + 10} y={y - 7} width="16" height="14" rx="1.5" />
              </g>
            ) : (
              <g key={i}>
                <rect x={x - 7} y={y - 26} width="14" height="16" rx="1.5" />
                <rect x={x - 7} y={y + 10} width="14" height="16" rx="1.5" />
              </g>
            )
          )}
        </g>

        {/* ICs: silkscreen outline, pin-1 mark, and pads down both sides. */}
        {CHIPS.map((chip, i) => {
          const pitch = chip.h / (chip.pins + 1);
          return (
            <g key={i}>
              <rect
                x={chip.x}
                y={chip.y}
                width={chip.w}
                height={chip.h}
                rx="3"
                fill="none"
                stroke="var(--sch-label)"
                strokeWidth="2"
                opacity="0.75"
              />
              <circle cx={chip.x + 14} cy={chip.y + 14} r="4" fill="var(--sch-label)" opacity="0.75" />
              {Array.from({ length: chip.pins }, (_, p) => {
                const py = chip.y + pitch * (p + 1) - 5;
                return (
                  <g key={p} fill="var(--sch-body)">
                    <rect x={chip.x - 16} y={py} width="16" height="10" rx="1.5" />
                    <rect x={chip.x + chip.w} y={py} width="16" height="10" rx="1.5" />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Wordmark glyph: a junction dot on a trace. */
export function LogoMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M1.5 12.5h3.5V6h4v6.5h3.5" stroke="var(--sch-wire)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="6" r="2.1" fill="var(--sch-body)" />
    </svg>
  );
}
