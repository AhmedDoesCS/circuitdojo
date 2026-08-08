/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Every colour resolves through a custom property defined in index.css, so
      // `data-theme` on <html> repaints the app without any class changing. The
      // `<alpha-value>` placeholder is what keeps `bg-zinc-900/[0.06]` working:
      // Tailwind substitutes the opacity into the rgb() at build time.
      colors: {
        zinc: {
          25: 'rgb(var(--zinc-25) / <alpha-value>)',
          50: 'rgb(var(--zinc-50) / <alpha-value>)',
          100: 'rgb(var(--zinc-100) / <alpha-value>)',
          150: 'rgb(var(--zinc-150) / <alpha-value>)',
          200: 'rgb(var(--zinc-200) / <alpha-value>)',
          300: 'rgb(var(--zinc-300) / <alpha-value>)',
          400: 'rgb(var(--zinc-400) / <alpha-value>)',
          500: 'rgb(var(--zinc-500) / <alpha-value>)',
          600: 'rgb(var(--zinc-600) / <alpha-value>)',
          700: 'rgb(var(--zinc-700) / <alpha-value>)',
          800: 'rgb(var(--zinc-800) / <alpha-value>)',
          850: 'rgb(var(--zinc-850) / <alpha-value>)',
          900: 'rgb(var(--zinc-900) / <alpha-value>)',
          950: 'rgb(var(--zinc-950) / <alpha-value>)',
        },
        // Text and icons sitting on a solid ink surface. Not white: in dark
        // mode that surface is near-white and the label has to go dark.
        'on-solid': 'rgb(var(--on-solid) / <alpha-value>)',
        // Text and icons on a filled accent. Separate from on-solid because the
        // two stop agreeing the moment an accent is chosen that is light in
        // light mode.
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          deep: 'rgb(var(--accent-deep) / <alpha-value>)',
          tint: 'rgb(var(--accent-tint) / <alpha-value>)',
        },
        good: 'rgb(var(--good) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        sch: {
          body: 'rgb(var(--sch-body-rgb) / <alpha-value>)',
          bodyFill: 'var(--sch-body-fill)',
          wire: 'rgb(var(--sch-wire-rgb) / <alpha-value>)',
          label: 'rgb(var(--sch-label-rgb) / <alpha-value>)',
        },
      },
      // Softened, not rounded off. 24px on a panel reads as a capsule and dates
      // the whole surface; 16px still reads as deliberate at a glance. Circles
      // are kept only where the shape carries meaning: dots, avatars, knobs,
      // progress tracks, never for chrome.
      borderRadius: {
        widget: '16px', // panels, cards, modals
        bar: '14px', // horizontal bars: toolbars, the switchboard
        control: '10px', // buttons, fields, list rows
        chip: '8px', // chips, tags, key caps
      },
      // Three flat elevations, no inset highlights. A raised surface is read by
      // its tone first; the shadow only separates it from what is behind.
      boxShadow: {
        e1: 'var(--elev-1)',
        e2: 'var(--elev-2)',
        e3: 'var(--elev-3)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
      fontFamily: {
        // Inter for everything the user reads, JetBrains Mono for everything the
        // user measures. The system stacks stay behind each as fallbacks so the
        // app is fully legible before, or without, the webfonts arriving.
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        widgetIn: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        // No blur-in. A soft-focus reveal is the same vocabulary as the frosted
        // panels: it just happens over time instead of in space.
        introTitle: {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        introLine: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        introOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1.06)' },
        },
        traceDraw: { '0%': { strokeDashoffset: '1200' }, '100%': { strokeDashoffset: '0' } },
        sealPop: {
          '0%': { opacity: '0', transform: 'scale(0.4)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseRing: {
          '0%': { opacity: '0.5', transform: 'scale(0.6)' },
          '100%': { opacity: '0', transform: 'scale(2.4)' },
        },
        riseIn: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        // Attention: failed requirements breathe until they are dealt with.
        alertPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(190,18,60,0.0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(190,18,60,0.14)' },
        },
        alertGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
        // Home screen ambience: slow, looping, never distracting.
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-14px) translateX(6px)' },
        },
        driftSlow: {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(3%, -2%, 0) scale(1.06)' },
          '100%': { transform: 'translate3d(0,0,0) scale(1)' },
        },
        dashFlow: { '0%': { strokeDashoffset: '0' }, '100%': { strokeDashoffset: '-48' } },
        /* Current travelling a copper run. The offset must equal the dash
           period (18 + 282) or the packet jumps when the loop restarts. */
        traceFlow: { '0%': { strokeDashoffset: '0' }, '100%': { strokeDashoffset: '-300' } },
        /* Vias breathing, out of phase with each other. */
        viaPulse: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.85' },
        },
        /* Entrance choreography: everything arrives from below in reading
           order, panels arrive from the side. One easing, one distance. */
        enterUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        enterRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        'widget-in': 'widgetIn 0.28s cubic-bezier(0.32, 0.72, 0, 1) both',
        'fade-in': 'fadeIn 0.3s ease both',
        'intro-title': 'introTitle 0.58s cubic-bezier(0.22, 1, 0.36, 1) both',
        'intro-line': 'introLine 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'intro-out': 'introOut 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'trace-draw': 'traceDraw 2.4s ease-out both',
        'seal-pop': 'sealPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'pulse-ring': 'pulseRing 1.8s ease-out infinite',
        'rise-in': 'riseIn 0.44s cubic-bezier(0.22, 1, 0.36, 1) both',
        'alert-pulse': 'alertPulse 2s ease-in-out infinite',
        'alert-glow': 'alertGlow 1.6s ease-in-out infinite',
        float: 'float 9s ease-in-out infinite',
        'drift-slow': 'driftSlow 22s ease-in-out infinite',
        'dash-flow': 'dashFlow 1.6s linear infinite',
        'trace-flow': 'traceFlow 6s linear infinite',
        'via-pulse': 'viaPulse 4s ease-in-out infinite',
        'enter-up': 'enterUp 0.46s cubic-bezier(0.22, 1, 0.36, 1) both',
        'enter-right': 'enterRight 0.46s cubic-bezier(0.22, 1, 0.36, 1) both',
        sheen: 'sheen 2.6s cubic-bezier(0.32,0.72,0,1) infinite',
      },
    },
  },
  plugins: [],
};
