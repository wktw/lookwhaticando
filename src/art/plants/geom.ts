/**
 * Path builders for the plant art. They return plain path strings and run once, on constants, at module load (pots,
 * leaves), so a render never does geometry beyond placing shapes with transforms.
 *
 * Shade crescents (DESIGN §10.4) are the part of a shape the window cannot reach: the shape minus itself shifted
 * toward the light. For tapered bodies and rounded bands that difference has a closed form, so it is written out here
 * as exact path data for each light position; rounder pots author theirs beside their shapes (`pots.tsx`).
 * No clip paths, masks or filters.
 */
import type { LightFrom } from '../light';
import { f } from './math';

export type Pt = readonly [number, number];

/** An ellipse as a path (two arcs), so it can share a <path> with other shapes. */
export const ell = (cx: number, cy: number, rx: number, ry = rx) =>
  `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`;

/** A rounded rectangle. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + q)}V${f(y + h - q)}Q${f(x + w)} ${f(y + h)} ${f(x + w - q)} ${f(y + h)}H${f(x + q)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - q)}V${f(y + q)}Q${f(x)} ${f(y)} ${f(x + q)} ${f(y)}Z`;
}

/** A smooth curve through `pts` (Catmull-Rom as cubic Béziers). `closed` joins the last point to the first. */
export function smooth(pts: readonly Pt[], closed = true, tension = 1): string {
  const n = pts.length;
  if (n < 2) return '';
  const at = (i: number): Pt => (closed ? pts[(i + n) % n]! : pts[Math.max(0, Math.min(n - 1, i))]!);
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    d += `C${f(p1[0] + (p2[0] - p0[0]) * k)} ${f(p1[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p1[0]) * k)} ${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** Points of a closed outline given as a half-width profile along the y axis (base at 0, tip at -len). */
export function profile(len: number, widths: readonly (readonly [k: number, hw: number])[], lean = 0): Pt[] {
  const pts: Pt[] = widths.map(([k, hw]) => [hw + lean * k * len, -k * len]);
  for (let i = widths.length - 1; i >= 0; i--) {
    const [k, hw] = widths[i]!;
    // A zero width is a single point (a tip or a stalk), already on the right-hand side.
    if (hw > 0) pts.push([-hw + lean * k * len, -k * len]);
  }
  return pts;
}

/**
 * Rounds a constant shape's numbers to one decimal. Leaf and segment shapes are drawn many times at small scales,
 * where a tenth of a unit is under half a pixel, so this keeps repeated path data short.
 */
export const tidy = (d: string) => d.replace(/-?\d*\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));

/** Moves every point of a path written with absolute M/L/C/Q/Z commands. */
export function mapPath(d: string, fn: (x: number, y: number) => Pt): string {
  return d.replace(/(-?\d*\.?\d+(?:e[-+]?\d+)?)[ ,]+(-?\d*\.?\d+(?:e[-+]?\d+)?)/g, (_, x: string, y: string) => {
    const [px, py] = fn(Number(x), Number(y));
    return `${f(px)} ${f(py)}`;
  });
}

/** Keyed by where the light comes from: the crescent for a window on the left sits on the right, and so on. */
export type ByLight = Readonly<Record<LightFrom, string>>;

/** A pot body that tapers from `top` (half-width `a`) to a foot at `bottom` (half-width `b`), foot corners rounded. */
export interface Taper {
  top: number;
  bottom: number;
  a: number;
  b: number;
  r: number;
  cx?: number;
}

export function taperD({ top, bottom, a, b, r, cx = 50 }: Taper): string {
  return `M${f(cx - a)} ${f(top)}H${f(cx + a)}L${f(cx + b)} ${f(bottom - r)}Q${f(cx + b)} ${f(bottom)} ${f(cx + b - r)} ${f(bottom)}H${f(cx - b + r)}Q${f(cx - b)} ${f(bottom)} ${f(cx - b)} ${f(bottom - r)}Z`;
}

/** Half-width of a taper at height y. */
const taperAt = ({ top, bottom, a, b }: Taper, y: number) => a + ((b - a) * (y - top)) / (bottom - top);

/**
 * Crescents of a tapered body: a band `d` wide along the far side (following the foot corner), or for a light from
 * the top, a band `d` tall along the foot.
 */
export function taperCrescents(t: Taper, d: number): ByLight {
  const { top, bottom, a, b, r, cx = 50 } = t;
  const side = (s: 1 | -1) => {
    const X = (x: number) => f(cx + s * x);
    return `M${X(a)} ${f(top)}L${X(b)} ${f(bottom - r)}Q${X(b)} ${f(bottom)} ${X(b - r)} ${f(bottom)}H${X(b - r - d)}Q${X(b - d)} ${f(bottom)} ${X(b - d)} ${f(bottom - r)}L${X(a - d)} ${f(top)}Z`;
  };
  const y = bottom - d;
  const w = taperAt(t, y);
  return {
    left: side(1),
    right: side(-1),
    top: `M${f(cx - w)} ${f(y)}H${f(cx + w)}L${f(cx + b)} ${f(bottom - r)}Q${f(cx + b)} ${f(bottom)} ${f(cx + b - r)} ${f(bottom)}H${f(cx - b + r)}Q${f(cx - b)} ${f(bottom)} ${f(cx - b)} ${f(bottom - r)}Z`,
  };
}

/** The shadow a rim throws on the body just under it: a band `h` tall across the top of a taper. */
export function underRim(t: Taper, h: number): string {
  const { top, cx = 50 } = t;
  const a = t.a;
  const w = taperAt(t, top + h);
  return `M${f(cx - a)} ${f(top)}H${f(cx + a)}L${f(cx + w)} ${f(top + h)}H${f(cx - w)}Z`;
}

/** Crescents of a rounded band (a rim): `d` wide at the far end, or `d` tall along the bottom when lit from above. */
export function bandCrescents(x: number, y: number, w: number, h: number, r: number, d: number): ByLight {
  const q = Math.min(r, w / 2, h / 2);
  const side = (s: 1 | -1) => {
    const e = s > 0 ? x + w : x;
    const X = (dx: number) => f(e - s * dx);
    return `M${X(q)} ${f(y)}Q${X(0)} ${f(y)} ${X(0)} ${f(y + q)}V${f(y + h - q)}Q${X(0)} ${f(y + h)} ${X(q)} ${f(y + h)}H${X(q + d)}Q${X(d)} ${f(y + h)} ${X(d)} ${f(y + h - q)}V${f(y + q)}Q${X(d)} ${f(y)} ${X(q + d)} ${f(y)}Z`;
  };
  const b = y + h;
  return {
    left: side(1),
    right: side(-1),
    top: `M${f(x)} ${f(b - d - q)}V${f(b - q)}Q${f(x)} ${f(b)} ${f(x + q)} ${f(b)}H${f(x + w - q)}Q${f(x + w)} ${f(b)} ${f(x + w)} ${f(b - q)}V${f(b - d - q)}Q${f(x + w)} ${f(b - d)} ${f(x + w - q)} ${f(b - d)}H${f(x + q)}Q${f(x)} ${f(b - d)} ${f(x)} ${f(b - d - q)}Z`,
  };
}

/** A 2D affine transform [a, b, c, d, e, f], as in SVG's matrix(). */
export type Affine = readonly [number, number, number, number, number, number];

/** The matrix of `place(x, y, a, s, sx)`: translate, rotate `a` degrees clockwise, scale (sx, s). */
export function placeMatrix(x: number, y: number, a: number, s: number, sx = s): Affine {
  const r = (a * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [cos * sx, sin * sx, -sin * s, cos * s, x, y];
}

/**
 * Bakes a transform into path data, so many placed copies of one shape can share a single <path> (one DOM node per
 * ink instead of one group per leaf). Handles absolute and relative M L H V C S Q T A Z; arcs keep their shape under
 * uniform scales, rotations and mirrors, which is all the plant art uses.
 */
export function bake(d: string, m: Affine): string {
  const [a, b, c, dd, e, ff] = m;
  // One decimal: a tenth of a unit is under half a pixel even at 400 px, and it halves the markup.
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const P = (x: number, y: number) => `${r1(a * x + c * y + e)} ${r1(b * x + dd * y + ff)}`;
  const det = a * dd - b * c;
  const scale = Math.sqrt(Math.abs(det));
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let out = '';
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M':
        x = ox + num();
        y = oy + num();
        sx = x;
        sy = y;
        out += `M${P(x, y)}`;
        cmd = rel ? 'l' : 'L';
        break;
      case 'L':
      case 'T':
        x = ox + num();
        y = oy + num();
        out += `${cmd.toUpperCase()}${P(x, y)}`;
        break;
      case 'H':
        x = ox + num();
        out += `L${P(x, y)}`;
        break;
      case 'V':
        y = oy + num();
        out += `L${P(x, y)}`;
        break;
      case 'C':
      case 'S':
      case 'Q': {
        const n = cmd.toUpperCase() === 'C' ? 3 : 2;
        const pts: string[] = [];
        for (let j = 0; j < n; j++) {
          const px = ox + num();
          const py = oy + num();
          pts.push(P(px, py));
          if (j === n - 1) [x, y] = [px, py];
        }
        out += `${cmd.toUpperCase()}${pts.join(' ')}`;
        break;
      }
      case 'A': {
        const [rx, ry, xr, large, sweep] = [num(), num(), num(), num(), num()];
        x = ox + num();
        y = oy + num();
        // The ellipse's own x axis, carried through the transform (an ellipse turned 180° is the same ellipse).
        const r = (xr * Math.PI) / 180;
        const turned = (Math.atan2(b * Math.cos(r) + dd * Math.sin(r), a * Math.cos(r) + c * Math.sin(r)) * 180) / Math.PI;
        out += `A${f(rx * scale)} ${f(ry * scale)} ${f(((turned % 180) + 180) % 180)} ${large} ${det < 0 ? 1 - sweep : sweep} ${P(x, y)}`;
        break;
      }
      case 'Z':
        x = sx;
        y = sy;
        out += 'Z';
        break;
      default:
        i++;
    }
  }
  return out;
}

/** m then n: the transform of a shape placed by `n` inside a group placed by `m`. */
export function compose(m: Affine, n: Affine): Affine {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
