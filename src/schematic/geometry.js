/**
 * Grid + transform maths for the schematic editor.
 *
 * Coordinate system
 * -----------------
 * Everything internal is in "schematic units" where GRID = 10 units = one grid
 * pitch (the 0.1in / 2.54mm pitch real schematics snap to). Every symbol pin
 * sits on a multiple of GRID relative to its symbol origin, and every placement
 * is snapped to GRID, so after any 90° rotation or mirror, pins still land
 * exactly on grid intersections. That exactness is what lets net extraction be
 * a plain coordinate-key comparison instead of a fuzzy proximity search.
 */

export const GRID = 10;

export function snap(n) {
  return Math.round(n / GRID) * GRID;
}

export function snapPoint(x, y) {
  return { x: snap(x), y: snap(y) };
}

/** Stable string key for a point, the join key for net extraction. */
export function key(x, y) {
  return `${Math.round(x)},${Math.round(y)}`;
}

export function parseKey(k) {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
}

/**
 * Apply a symbol instance transform to a local point.
 * Mirror is applied first (about the local Y axis), then rotation, then translation.
 * `rot` is in degrees, one of 0 / 90 / 180 / 270.
 */
export function transformPoint(local, instance) {
  const mx = instance.mirror ? -local.x : local.x;
  const my = local.y;
  const rot = ((instance.rot || 0) % 360 + 360) % 360;
  let rx = mx;
  let ry = my;
  if (rot === 90) {
    rx = -my;
    ry = mx;
  } else if (rot === 180) {
    rx = -mx;
    ry = -my;
  } else if (rot === 270) {
    rx = my;
    ry = -mx;
  }
  return { x: rx + instance.x, y: ry + instance.y };
}

/** SVG transform string matching `transformPoint` exactly. */
export function svgTransform(instance) {
  const parts = [`translate(${instance.x}, ${instance.y})`, `rotate(${instance.rot || 0})`];
  if (instance.mirror) parts.push('scale(-1, 1)');
  return parts.join(' ');
}

/** Rotate a direction letter (L/R/U/D) through an instance transform. */
export function transformOrient(orient, instance) {
  const map = { L: 'L', R: 'R', U: 'U', D: 'D' };
  let o = map[orient] || 'R';
  if (instance.mirror) o = o === 'L' ? 'R' : o === 'R' ? 'L' : o;
  const rot = ((instance.rot || 0) % 360 + 360) % 360;
  const cw = { R: 'D', D: 'L', L: 'U', U: 'R' };
  const turns = rot / 90;
  for (let i = 0; i < turns; i++) o = cw[o];
  return o;
}

/** Unit vector for a pin orientation (direction the pin stub points, away from the body). */
export function orientVector(orient) {
  switch (orient) {
    case 'L':
      return { x: -1, y: 0 };
    case 'R':
      return { x: 1, y: 0 };
    case 'U':
      return { x: 0, y: -1 };
    default:
      return { x: 0, y: 1 };
  }
}

export function pointsEqual(a, b) {
  return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

/** True when p lies strictly between the endpoints of segment (a,b), a T-contact. */
export function pointOnSegmentInterior(p, a, b) {
  if (pointsEqual(p, a) || pointsEqual(p, b)) return false;
  return pointOnSegment(p, a, b);
}

/** True when p lies anywhere on segment (a,b), endpoints included. */
export function pointOnSegment(p, a, b) {
  const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > 0.5) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  if (dot < -0.5) return false;
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= lenSq + 0.5;
}

/** Distance from point p to segment (a,b), used for wire hit-testing. */
export function distanceToSegment(p, a, b) {
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

/** Axis-aligned bounding box of a list of points, padded. */
export function bbox(points, pad = 0) {
  if (!points.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
}

/**
 * Route an orthogonal (Manhattan) two-segment path between two grid points.
 * `horizontalFirst` picks which elbow, matching how EDA tools route wires.
 */
export function routeOrthogonal(from, to, horizontalFirst = true) {
  const pts = [from];
  if (from.x !== to.x && from.y !== to.y) {
    pts.push(horizontalFirst ? { x: to.x, y: from.y } : { x: from.x, y: to.y });
  }
  if (from.x !== to.x || from.y !== to.y) pts.push(to);
  return pts;
}
