/**
 * Small path builders for the pet rigs. They run once at module load (every rig is static
 * data), so the strings are effectively memoised; nothing here runs per frame or per render.
 */

export type P = readonly [number, number];

const f = (n: number) => {
  const s = n.toFixed(2).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

/** Kappa for a quarter-circle cubic. */
const K = 0.5523;

/** An ellipse as four cubics (not arcs, so the offline geometry and the renderer agree exactly). */
export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  const kx = rx * K;
  const ky = ry * K;
  return (
    `M${f(cx)} ${f(cy - ry)}` +
    `C${f(cx + kx)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - ky)} ${f(cx + rx)} ${f(cy)}` +
    `C${f(cx + rx)} ${f(cy + ky)} ${f(cx + kx)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}` +
    `C${f(cx - kx)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ky)} ${f(cx - rx)} ${f(cy)}` +
    `C${f(cx - rx)} ${f(cy - ky)} ${f(cx - kx)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)}Z`
  );
}

export const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);

/** A rounded rectangle; `r` may be a single radius or [top, bottom]. */
export function rrect(x: number, y: number, w: number, h: number, r: number | readonly [number, number]): string {
  const [rt0, rb0] = typeof r === 'number' ? [r, r] : r;
  const rt = Math.min(rt0, w / 2, h / 2);
  const rb = Math.min(rb0, w / 2, h / 2);
  const kt = rt * K;
  const kb = rb * K;
  return (
    `M${f(x + rt)} ${f(y)}H${f(x + w - rt)}` +
    `C${f(x + w - rt + kt)} ${f(y)} ${f(x + w)} ${f(y + rt - kt)} ${f(x + w)} ${f(y + rt)}` +
    `V${f(y + h - rb)}` +
    `C${f(x + w)} ${f(y + h - rb + kb)} ${f(x + w - rb + kb)} ${f(y + h)} ${f(x + w - rb)} ${f(y + h)}` +
    `H${f(x + rb)}` +
    `C${f(x + rb - kb)} ${f(y + h)} ${f(x)} ${f(y + h - rb + kb)} ${f(x)} ${f(y + h - rb)}` +
    `V${f(y + rt)}` +
    `C${f(x)} ${f(y + rt - kt)} ${f(x + rt - kt)} ${f(y)} ${f(x + rt)} ${f(y)}Z`
  );
}

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const norm = (a: P): P => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};

/** Catmull-Rom through points → cubic segments (tension 0.5), as [c1, c2, end] triples. */
function smooth(pts: readonly P[]): [P, P, P][] {
  const out: [P, P, P][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    out.push([add(p1, mul(sub(p2, p0), 1 / 6)), sub(p2, mul(sub(p3, p1), 1 / 6)), p2]);
  }
  return out;
}

/**
 * A soft tube along a spine: a tail, a leg, a duck's neck. The width tapers linearly from `w0`
 * at the first point to `w1` at the last; both ends are round. Flat fill, no stroke.
 */
export function tube(spine: readonly P[], w0: number, w1 = w0): string {
  const n = spine.length;
  const tangents = spine.map((p, i) => norm(sub(spine[Math.min(n - 1, i + 1)]!, spine[Math.max(0, i - 1)]!)));
  let total = 0;
  const along = spine.map((p, i) => (i === 0 ? 0 : (total += Math.hypot(...sub(p, spine[i - 1]!)))));
  const width = (i: number) => (w0 + (w1 - w0) * (total ? along[i]! / total : 0)) / 2;
  const left = spine.map((p, i) => add(p, mul([tangents[i]![1], -tangents[i]![0]], width(i))));
  const right = spine.map((p, i) => add(p, mul([-tangents[i]![1], tangents[i]![0]], width(i))));
  const cap = (p: P, t: P, r: number, from: P, to: P) => {
    // A half circle from `from` to `to` bulging along t.
    const k = r * 1.33;
    return `C${f(from[0] + t[0] * k)} ${f(from[1] + t[1] * k)} ${f(to[0] + t[0] * k)} ${f(to[1] + t[1] * k)} ${f(to[0])} ${f(to[1])}`;
  };
  let d = `M${f(left[0]![0])} ${f(left[0]![1])}`;
  for (const [c1, c2, e] of smooth(left)) d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])}`;
  d += cap(spine[n - 1]!, tangents[n - 1]!, width(n - 1), left[n - 1]!, right[n - 1]!);
  const back = smooth(right.slice().reverse());
  for (const [c1, c2, e] of back) d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])}`;
  d += cap(spine[0]!, mul(tangents[0]!, -1), width(0), right[0]!, left[0]!);
  return `${d}Z`;
}

/** A smooth closed blob through points (Catmull-Rom, closed). */
export function blob(pts: readonly P[]): string {
  const n = pts.length;
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** An SVG transform string for a placement. */
export const place = (x: number, y: number, s = 1, r = 0) =>
  `translate(${f(x)} ${f(y)})${r ? ` rotate(${f(r)})` : ''}${s !== 1 ? ` scale(${f(s)})` : ''}`;

export { f as fmt };

/**
 * The outline of two overlapping circles as one contour (a frog's eye bumps, a bear's ears on a
 * head): the outer arc of each circle, joined where they cross.
 */
export function twoCircles(c1: P, r1: number, c2: P, r2: number): string {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = c1[0] + (a * dx) / d;
  const my = c1[1] + (a * dy) / d;
  const p: P = [mx + (h * dy) / d, my - (h * dx) / d];
  const q: P = [mx - (h * dy) / d, my + (h * dx) / d];
  // Arc of circle 1 from p round the far side to q, then circle 2 from q back to p.
  const large1 = a > 0 ? 1 : 0;
  const large2 = d - a > 0 ? 1 : 0;
  return `M${f(p[0])} ${f(p[1])}A${f(r1)} ${f(r1)} 0 ${large1} 0 ${f(q[0])} ${f(q[1])}A${f(r2)} ${f(r2)} 0 ${large2} 0 ${f(p[0])} ${f(p[1])}Z`;
}

/** A soft scalloped ring of fur: `n` bumps round an ellipse (a lionhead's mane, an Angora's fluff). */
export function scallop(cx: number, cy: number, rx: number, ry: number, n: number, bump: number, phase = 0): string {
  const pts: P[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = phase + (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 1 - bump;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return blob(pts);
}
