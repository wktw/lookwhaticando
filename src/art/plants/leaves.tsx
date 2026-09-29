/**
 * Shared plant anatomy: placing leaves, drawing stems, and the growth clock every species runs on.
 *
 * A species is authored as its mature form: every leaf, flower and vine segment has a birth time on the growth
 * clock `t` (stage + progress, 0..8). At any moment a part is drawn only once it is born, and it grows in over
 * about one stage. So each stage adds visible growth, progress adds detail within a stage, and nothing ever shrinks.
 */
import { easeOut, f, lerp, ramp } from './math';
import type { Pt } from './geom';

/** How far along a part is: 0 before `birth`, easing to 1 over `span` of the growth clock. */
export const grown = (t: number, birth: number, span = 0.9) => easeOut(ramp(t, birth, birth + span));

/** A transform that places a part drawn at the origin pointing up: move, turn (degrees clockwise), scale. */
export const place = (x: number, y: number, a: number, s: number, sx = s) =>
  `translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(sx)} ${f(s)})`;

/** A point `len` along a heading of `a` degrees clockwise from straight up. */
export const toward = ([x, y]: Pt, a: number, len: number): Pt => {
  const r = (a * Math.PI) / 180;
  return [x + Math.sin(r) * len, y - Math.cos(r) * len];
};

/** A gently arching stem from `from` to `to`; `bow` pushes the middle sideways (positive = right). */
export function stemD(from: Pt, to: Pt, bow = 0, lift = 0.55): string {
  const cx = lerp(from[0], to[0], 0.2) + bow;
  const cy = lerp(from[1], to[1], lift);
  return `M${f(from[0])} ${f(from[1])}Q${f(cx)} ${f(cy)} ${f(to[0])} ${f(to[1])}`;
}

/** Many stems as one stroked path (thin things are the only strokes in the art). */
export function Stems({ d, color, w }: { d: string; color: string; w: number }) {
  if (!d) return null;
  return <path d={d} fill="none" stroke={color} stroke-width={w} stroke-linecap="round" stroke-linejoin="round" />;
}

/** Points along a smooth open curve, for hanging things along vines and stems. */
export function along(pts: readonly Pt[], k: number): Pt {
  const n = pts.length - 1;
  const u = Math.max(0, Math.min(n, k * n));
  const i = Math.min(n - 1, Math.floor(u));
  const r = u - i;
  const a = pts[i]!;
  const b = pts[i + 1]!;
  return [lerp(a[0], b[0], r), lerp(a[1], b[1], r)];
}

/** The first `len` (0..n) segments of a polyline, the last one partial: a vine or stem that is still growing. */
export function partial(pts: readonly Pt[], len: number): Pt[] {
  const n = Math.max(0, Math.min(pts.length - 1, len));
  const whole = Math.floor(n);
  const out = pts.slice(0, whole + 1);
  if (n > whole && whole + 1 < pts.length) {
    const a = pts[whole]!;
    const b = pts[whole + 1]!;
    out.push([lerp(a[0], b[0], n - whole), lerp(a[1], b[1], n - whole)]);
  }
  return out;
}


/**
 * A cane: a stem that lengthens over time and carries leaves at its nodes (pothos vines, begonia canes, hoya,
 * catnip, lavender). `pts` is the fully grown stem relative to the soil point; each vertex after the first is a
 * node. The stem grows `rate` nodes per stage from `born`, and each node's leaf grows in as the tip passes it.
 */
export interface Cane {
  pts: readonly Pt[];
  born: number;
  rate: number;
}

export interface CaneAt {
  /** The stem as grown so far (a smooth open path). */
  d: string;
  /** Nodes reached so far, with how grown each one's leaf is (0..1). */
  nodes: { i: number; at: Pt; g: number }[];
  tip: Pt;
  /** Segments grown (0..pts.length - 1). */
  grown: number;
}

export function caneAt(c: Cane, t: number, base: Pt, sx = 1, sy = 1): CaneAt | null {
  const n = Math.min(c.pts.length - 1, (t - c.born) * c.rate);
  if (n <= 0.05) return null;
  const abs = c.pts.map(([x, y]) => [base[0] + x * sx, base[1] + y * sy] as Pt);
  const vis = partial(abs, n);
  const nodes: CaneAt['nodes'] = [];
  for (let i = 1; i < abs.length; i++) {
    // A leaf starts as a bud just behind the growing tip and opens over the next node and a half.
    const g = easeOut(ramp(n, i - 0.4, i + 1.1));
    if (g > 0) nodes.push({ i, at: i <= n ? abs[i]! : vis.at(-1)!, g });
  }
  return { d: smoothOpen(vis), nodes, tip: vis.at(-1)!, grown: n };
}

/** A smooth open curve through points (quadratic midpoints: never overshoots, cheap). */
function smoothOpen(pts: readonly Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  if (pts.length === 2) return `${d}L${f(pts[1]![0])} ${f(pts[1]![1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!;
    const [nx, ny] = pts[i + 1]!;
    const last = i === pts.length - 2;
    d += `Q${f(x)} ${f(y)} ${f(last ? nx : (x + nx) / 2)} ${f(last ? ny : (y + ny) / 2)}`;
  }
  return d;
}

/** The heading (degrees clockwise from up) of a polyline at vertex i. */
export function headingAt(pts: readonly Pt[], i: number): number {
  const a = pts[Math.max(0, i - 1)]!;
  const b = pts[Math.min(pts.length - 1, i + 1)]!;
  return (Math.atan2(b[0] - a[0], a[1] - b[1]) * 180) / Math.PI;
}

/**
 * Where a fraction `k` of a polyline's length falls: the point, and the same place as a vertex index (0..n), so it can
 * be compared with how far a `partial` stem has grown. Spacing things by length keeps them evenly apart however
 * unevenly the vertices are placed.
 */
export function alongLength(pts: readonly Pt[], k: number): { at: Pt; u: number } {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let left = Math.max(0, Math.min(1, k)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i]! || i === lens.length - 1) {
      const r = lens[i]! ? Math.min(1, left / lens[i]!) : 0;
      const a = pts[i]!;
      const b = pts[i + 1]!;
      return { at: [lerp(a[0], b[0], r), lerp(a[1], b[1], r)], u: i + r };
    }
    left -= lens[i]!;
  }
  return { at: pts[0]!, u: 0 };
}
