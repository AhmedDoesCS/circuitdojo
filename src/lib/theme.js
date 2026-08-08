/**
 * Appearance: two independent axes, both stored in settings and both expressed
 * as attributes on <html>.
 *
 *   data-theme   light | dark      (what `system` resolves to)
 *   data-accent  graphite | cobalt | emerald | violet | amber | rose
 *
 * All the actual colour lives in `src/index.css`. This module only decides
 * which attributes are on the root element, which is deliberately the entire
 * mechanism: no component subscribes to a theme, and nothing re-renders when it
 * changes, the browser simply recomputes the custom properties.
 */

export const THEMES = [
  { id: 'light', label: 'Light', blurb: 'Paper-white chrome over a near-white sheet.' },
  { id: 'dark', label: 'Dark', blurb: 'Matte black chrome; the schematic palette lifts to match.' },
  { id: 'system', label: 'Match system', blurb: 'Follow the appearance setting of your OS.' },
];

/**
 * Graphite is the original neutral look and stays the default, so turning
 * accents on does not change anyone's app until they pick a colour.
 */
export const ACCENTS = [
  { id: 'graphite', label: 'Graphite', swatch: '#3f3f46', darkSwatch: '#d4d4d8' },
  { id: 'cobalt', label: 'Cobalt', swatch: '#2563eb', darkSwatch: '#6091f6' },
  { id: 'emerald', label: 'Emerald', swatch: '#0f7a3d', darkSwatch: '#3ecf7d' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed', darkSwatch: '#a77afa' },
  { id: 'amber', label: 'Amber', swatch: '#b45309', darkSwatch: '#f5a841' },
  { id: 'rose', label: 'Rose', swatch: '#be123c', darkSwatch: '#fb7185' },
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));
const ACCENT_IDS = new Set(ACCENTS.map((a) => a.id));

const prefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

/** `system` is not a value the stylesheet understands, resolve it to one. */
export function resolveTheme(theme) {
  const wanted = THEME_IDS.has(theme) ? theme : 'light';
  if (wanted === 'system') return prefersDark() ? 'dark' : 'light';
  return wanted;
}

export function applyAppearance({ theme, accent } = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolveTheme(theme));
  root.setAttribute('data-accent', ACCENT_IDS.has(accent) ? accent : 'cobalt');
}

/**
 * Track the OS setting while the user is on `system`. Returns an unsubscribe.
 * Called with no live preference, this is a no-op: the caller does not have to
 * care which theme is selected.
 */
export function watchSystemTheme(theme, onChange) {
  if (theme !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange(query.matches ? 'dark' : 'light');
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
