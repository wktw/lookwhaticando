/**
 * Shade crescents as plain path data (DESIGN §10.4): hard-edged shapes on the side away from
 * the light, painted over a part in the shade ink. Every crescent is exact geometry computed
 * from the part's own constants and memoised, so rendering never clips, masks or filters.
 *
 *   band()  the strip of a rounded rectangle on one side (a cabinet's side face, a plate's edge)
 *   moon()  a circle minus the same circle nudged toward the light (a capsule, a dial, a coin)
 */
import { radii, type Rect } from './geometry';

export type ShadeSide = 'left' | 'right' | 'under';

type Pt = readonly [number, number];
type Seg = { k: 'M' | 'L'; p: Pt } | { k: 'A'; r: number; p: Pt; large: 0 | 1; sweep: 0 | 1 };

const f = (n: number) => +n.toFixed(2);

function toPath(segs: Seg[], map: (p: Pt) => Pt, mirrored: boolean): string {
  return (
    segs
      .map((s) => {
        const [x, y] = map(s.p);
        if (s.k !== 'A') return `${s.k}${f(x)} ${f(y)}`;
        const sweep = mirrored ? 1 - s.sweep : s.sweep;
        return `A${f(s.r)} ${f(s.r)} 0 ${s.large} ${sweep} ${f(x)} ${f(y)}`;
      })
      .join(' ') + ' Z'
  );
}

/**
 * The right-hand strip x ≥ x1 − w of a rounded rect [x0, x1] × [y0, y1] whose right corners
 * have radii `rt` (top) and `rb` (bottom). Other sides are mapped onto this one.
 */
function rightStrip(x1: number, y0: number, y1: number, rt: number, rb: number, w: number): Seg[] {
  const xw = x1 - w;
  const segs: Seg[] = [];
  // Where the strip's inner edge meets the top boundary (on the corner arc, or the flat top).
  if (xw > x1 - rt) {
    const dx = xw - (x1 - rt);
    segs.push({ k: 'M', p: [xw, y0 + rt - Math.sqrt(rt * rt - dx * dx)] });
  } else {
    segs.push({ k: 'M', p: [xw, y0] });
    if (rt) segs.push({ k: 'L', p: [x1 - rt, y0] });
  }
  if (rt) segs.push({ k: 'A', r: rt, p: [x1, y0 + rt], large: 0, sweep: 1 });
  segs.push({ k: 'L', p: [x1, y1 - rb] });
  if (xw > x1 - rb) {
    const dx = xw - (x1 - rb);
    segs.push({ k: 'A', r: rb, p: [xw, y1 - rb + Math.sqrt(rb * rb - dx * dx)], large: 0, sweep: 1 });
  } else {
    if (rb) segs.push({ k: 'A', r: rb, p: [x1 - rb, y1], large: 0, sweep: 1 });
    segs.push({ k: 'L', p: [xw, y1] });
  }
  return segs;
}

const bandCache = new Map<string, string>();

/**
 * The strip of `rect` on `side` (`under` = along the bottom, `over` = along the top), `w` units
 * deep: the part of a raised shape that faces away from the light, or the lit-side wall's shadow
 * inside a recess.
 */
export function band(rect: Rect, side: ShadeSide | 'over', w: number): string {
  const key = `${rect.x},${rect.y},${rect.w},${rect.h},${radii(rect.r).join(',')},${side},${w}`;
  const hit = bandCache.get(key);
  if (hit) return hit;
  const [tl, tr, br, bl] = radii(rect.r);
  const { x, y } = rect;
  const x1 = x + rect.w;
  const y1 = y + rect.h;
  let d: string;
  if (side === 'right') {
    d = toPath(rightStrip(x1, y, y1, tr, br, w), (p) => p, false);
  } else if (side === 'left') {
    // Mirror x (x → −x): the left side becomes a right side with the left corners' radii.
    d = toPath(rightStrip(-x, y, y1, tl, bl, w), ([px, py]) => [-px, py], true);
  } else if (side === 'under') {
    // Transpose (x ↔ y): the bottom becomes a right side; its "top" corner is the bottom-left.
    d = toPath(rightStrip(y1, x, x1, bl, br, w), ([px, py]) => [py, px], true);
  } else {
    // Rotate a quarter turn ((x, y) → (−y, x)): the top becomes a right side, top-left corner first.
    d = toPath(rightStrip(-y, x, x1, tl, tr, w), ([px, py]) => [py, -px], false);
  }
  bandCache.set(key, d);
  return d;
}

const moonCache = new Map<string, string>();

/**
 * A hard-edged crescent on a circle: the circle (cx, cy, r) minus the same circle moved
 * `depth` units toward the light along (lx, ly). Depth is clamped below the diameter.
 */
export function moon(cx: number, cy: number, r: number, toward: Pt, depth: number): string {
  const key = `${cx},${cy},${r},${toward[0]},${toward[1]},${depth}`;
  const hit = moonCache.get(key);
  if (hit) return hit;
  const len = Math.hypot(toward[0], toward[1]) || 1;
  const ux = toward[0] / len;
  const uy = toward[1] / len;
  const d = Math.min(Math.max(depth, 0.01), r * 1.9);
  // The two circles cross on the perpendicular bisector of their centers.
  const mx = cx + (ux * d) / 2;
  const my = cy + (uy * d) / 2;
  const h = Math.sqrt(r * r - (d / 2) * (d / 2));
  const a: Pt = [mx - uy * h, my + ux * h];
  const b: Pt = [mx + uy * h, my - ux * h];
  // Outer edge: the long way round the circle, through the point farthest from the light.
  const far = sweepThrough(cx, cy, a, b, [cx - ux * r, cy - uy * r]);
  // Inner edge: back along the lit circle, through its point farthest from the light.
  const lx = cx + ux * d;
  const ly = cy + uy * d;
  const inner = sweepThrough(lx, ly, b, a, [lx - ux * r, ly - uy * r]);
  const path = `M${f(a[0])} ${f(a[1])} A${f(r)} ${f(r)} 0 1 ${far} ${f(b[0])} ${f(b[1])} A${f(r)} ${f(r)} 0 0 ${inner} ${f(a[0])} ${f(a[1])} Z`;
  moonCache.set(key, path);
  return path;
}

const lowerCache = new Map<string, string>();

/**
 * The shade crescent of the lower half of a circle (a capsule's opaque tinted half, whose
 * clear upper half takes no shade): the part of the disc below y = `top` (default the seam,
 * y = 0) minus the disc moved `depth` toward the light, which comes straight from the side or
 * from above. A `top` just below a seam bar keeps the crescent from peeking above it.
 */
export function lowerMoon(r: number, side: ShadeSide, depth: number, top = 0): string {
  const key = `${r},${side},${depth},${top}`;
  const hit = lowerCache.get(key);
  if (hit) return hit;
  const d = Math.min(Math.max(depth, 0.01), r * 0.9);
  let path: string;
  const t = Math.min(Math.max(top, 0), r * 0.5);
  if (side === 'under') {
    // The disc minus the same disc raised by d: the strip between the two lower arcs, below y = t.
    const w = Math.sqrt(r * r - t * t);
    const wi = Math.sqrt(Math.max(0, r * r - (t + d) * (t + d)));
    path = `M${f(-w)} ${f(t)} A${f(r)} ${f(r)} 0 0 0 ${f(w)} ${f(t)} H${f(wi)} A${f(r)} ${f(r)} 0 0 1 ${f(-wi)} ${f(t)} Z`;
  } else {
    const k = side === 'right' ? 1 : -1;
    const h = Math.sqrt(r * r - (d * d) / 4);
    // The outer circle and the light-shifted circle, each cut at y = t.
    const xo = Math.sqrt(r * r - t * t);
    const xi = Math.sqrt(r * r - t * t) - d;
    // Mirrored for a left-hand crescent, which flips both sweeps.
    const outer = k > 0 ? 1 : 0;
    const inner = k > 0 ? 0 : 1;
    path = `M${f(k * xi)} ${f(t)} H${f(k * xo)} A${f(r)} ${f(r)} 0 0 ${outer} ${f((-k * d) / 2)} ${f(h)} A${f(r)} ${f(r)} 0 0 ${inner} ${f(k * xi)} ${f(t)} Z`;
  }
  lowerCache.set(key, path);
  return path;
}

/** The side facing the light: where a recess (a window, a dish) holds its shadow. */
export function litSide(side: ShadeSide): ShadeSide | 'over' {
  return side === 'right' ? 'left' : side === 'left' ? 'right' : 'over';
}

/** The SVG sweep flag for an arc around (cx, cy) from `from` to `to` that passes through `via`. */
function sweepThrough(cx: number, cy: number, from: Pt, to: Pt, via: Pt): 0 | 1 {
  const ang = (p: Pt) => Math.atan2(p[1] - cy, p[0] - cx);
  const tau = Math.PI * 2;
  const norm = (a: number) => ((a % tau) + tau) % tau;
  const a0 = ang(from);
  // Sweep 1 runs with increasing angle (clockwise on screen, y down).
  const toEnd = norm(ang(to) - a0);
  const toVia = norm(ang(via) - a0);
  return toVia < toEnd ? 1 : 0;
}
