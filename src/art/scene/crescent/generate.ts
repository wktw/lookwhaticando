/**
 * OFFLINE crescent generator. Never imported by the app: `crescents.test.ts` runs it to check (or,
 * with WRITE_CRESCENTS=1, to rewrite) the committed strings in `./data.ts`.
 *
 * A shade crescent is a shape minus itself shifted toward the light (DESIGN §10.4): a hard sliver on
 * the side away from the window. Every part is convex, so the difference is one sliver bounded by
 * the part's own edge (outside the shifted copy) and the shifted copy's edge (inside the part).
 */
import type { LightFrom } from '@/art/light';
import { LIGHT_FROMS, towardLight } from '../lighting';

export type Pt = readonly [number, number];

/* ── Flattening absolute M/L/H/V/C/Q/Z paths into polygons ───────────────────────────────── */

const TOKEN = /([MLHVCQZ])|(-?\d*\.?\d+(?:e-?\d+)?)/gi;

/** A closed convex subpath as a polygon. Curves are sampled; only absolute commands are allowed. */
export function flatten(d: string, steps = 6): Pt[] {
  const tokens = [...d.matchAll(TOKEN)].map((m) => m[0]);
  const pts: [number, number][] = [];
  let i = 0;
  let cmd = '';
  let cur: [number, number] = [0, 0];
  const num = () => {
    const t = tokens[i++];
    if (t === undefined || /[a-z]/i.test(t)) throw new Error(`crescent: bad path ${d}`);
    return Number(t);
  };
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/[a-z]/i.test(t)) {
      cmd = t;
      i++;
      if (cmd !== cmd.toUpperCase()) throw new Error(`crescent: relative commands are not supported (${d})`);
      if (cmd === 'Z') continue;
    }
    switch (cmd) {
      case 'M':
      case 'L':
        cur = [num(), num()];
        pts.push(cur);
        break;
      case 'H':
        cur = [num(), cur[1]];
        pts.push(cur);
        break;
      case 'V':
        cur = [cur[0], num()];
        pts.push(cur);
        break;
      case 'Q': {
        const c: Pt = [num(), num()];
        const e: [number, number] = [num(), num()];
        for (let s = 1; s <= steps; s++) {
          const u = s / steps;
          const a = (1 - u) * (1 - u);
          const b = 2 * (1 - u) * u;
          const w = u * u;
          pts.push([a * cur[0] + b * c[0] + w * e[0], a * cur[1] + b * c[1] + w * e[1]]);
        }
        cur = e;
        break;
      }
      case 'C': {
        const c1: Pt = [num(), num()];
        const c2: Pt = [num(), num()];
        const e: [number, number] = [num(), num()];
        for (let s = 1; s <= steps; s++) {
          const u = s / steps;
          const a = (1 - u) ** 3;
          const b = 3 * (1 - u) ** 2 * u;
          const c = 3 * (1 - u) * u * u;
          const w = u ** 3;
          pts.push([a * cur[0] + b * c1[0] + c * c2[0] + w * e[0], a * cur[1] + b * c1[1] + c * c2[1] + w * e[1]]);
        }
        cur = e;
        break;
      }
      default:
        throw new Error(`crescent: unsupported command ${cmd} in ${d}`);
    }
  }
  // Drop a closing point that repeats the first, and near-duplicates.
  const out: Pt[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && out.length > 1 && Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6) out.pop();
  return out;
}

/* ── Convex polygon helpers ─────────────────────────────────────────────────────────────── */

export function signedArea(poly: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

const EPS = 1e-7;

/** Inside (or, unless `strict`, on the edge of) a convex polygon with positive signed area. */
function inside(poly: readonly Pt[], p: Pt, strict = false): boolean {
  const lim = strict ? 1e-5 : -EPS;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (strict ? cross <= lim * Math.hypot(b[0] - a[0], b[1] - a[1]) : cross < lim) return false;
  }
  return true;
}

/** The last point of segment p→q still inside convex `poly` (p must be inside). Cyrus–Beck. */
function exitPoint(poly: readonly Pt[], p: Pt, q: Pt): Pt {
  let tOut = 1;
  const d: Pt = [q[0] - p[0], q[1] - p[1]];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    // Inward normal of a convex CCW (positive-area) polygon edge in this orientation.
    const n: Pt = [-(b[1] - a[1]), b[0] - a[0]];
    const num = n[0] * (p[0] - a[0]) + n[1] * (p[1] - a[1]);
    const den = n[0] * d[0] + n[1] * d[1];
    if (den < -EPS) tOut = Math.min(tOut, -num / den);
  }
  return [p[0] + d[0] * tOut, p[1] + d[1] * tOut];
}

/**
 * `poly` minus `poly` shifted by `by` (both convex), as one polygon; null when they do not overlap
 * or the shift is zero. Assumes the shift is small next to the shape.
 */
/** Long straight edges split into short ones, so a small shift always leaves some corners inside. */
export function densify(poly: readonly Pt[], step = 1.5): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

export function crescentPolygon(input: readonly Pt[], by: Pt): Pt[] | null {
  if (Math.hypot(by[0], by[1]) < EPS || input.length < 3) return null;
  const dense = densify(input, Math.max(0.5, Math.hypot(by[0], by[1]) * 0.6));
  const poly = signedArea(dense) >= 0 ? dense : dense.reverse();
  const moved = poly.map((p) => [p[0] + by[0], p[1] + by[1]] as Pt);
  const n = poly.length;
  const out = poly.map((p) => !inside(moved, p));
  if (out.every(Boolean) || !out.some(Boolean)) return null;

  // Walk the part's own edge from where it leaves the shifted copy to where it re-enters.
  let start = out.findIndex((o, i) => o && !out[(i - 1 + n) % n]);
  const chain: Pt[] = [];
  const prev = poly[(start - 1 + n) % n]!;
  chain.push(exitPoint(moved, prev, poly[start]!));
  let i = start;
  while (out[i]) {
    chain.push(poly[i]!);
    i = (i + 1) % n;
  }
  const lastOut = poly[(i - 1 + n) % n]!;
  const reenter = exitPoint(moved, poly[i]!, lastOut);
  chain.push(reenter);

  // Then back along the shifted copy's edge, through its corners that lie inside the part.
  const inner = moved.map((p) => inside(poly, p, true));
  const run: Pt[] = [];
  start = inner.findIndex((v, k) => v && !inner[(k - 1 + n) % n]);
  if (start >= 0) {
    for (let k = start; inner[k % n] && run.length < n; k++) run.push(moved[k % n]!);
  }
  const a = chain[chain.length - 1]!;
  const b = chain[0]!;
  const dist = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const fwd = run.length ? dist(a, run[0]!) + dist(run[run.length - 1]!, b) : 0;
  const rev = run.length ? dist(a, run[run.length - 1]!) + dist(run[0]!, b) : 0;
  return chain.concat(fwd <= rev ? run : run.reverse());
}

const r1 = (n: number) => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? 0 : v;
};

/** Ramer–Douglas–Peucker on an open polyline: drop points closer than `eps` to the simplified line. */
function simplify(pts: readonly Pt[], eps: number): Pt[] {
  if (pts.length < 3) return [...pts];
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
  let far = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const d = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len;
    if (d > far) {
      far = d;
      at = i;
    }
  }
  if (far <= eps) return [a, b];
  return simplify(pts.slice(0, at + 1), eps).slice(0, -1).concat(simplify(pts.slice(at), eps));
}

/** A polygon as compact absolute path data: simplified, rounded, collinear points dropped. */
export function polygonPath(input: readonly Pt[]): string {
  // Split the ring at its two farthest-apart points so both halves simplify well.
  let poly: readonly Pt[] = input;
  if (input.length > 4) {
    const first = input[0]!;
    let k = 0;
    input.forEach((p, i) => {
      if (Math.hypot(p[0] - first[0], p[1] - first[1]) > Math.hypot(input[k]![0] - first[0], input[k]![1] - first[1])) k = i;
    });
    poly = simplify(input.slice(0, k + 1), 0.08).slice(0, -1).concat(simplify([...input.slice(k), first], 0.08).slice(0, -1));
  }
  const pts = poly.map((p) => [r1(p[0]), r1(p[1])] as Pt).filter((p, i, all) => {
    const q = all[(i - 1 + all.length) % all.length]!;
    return p[0] !== q[0] || p[1] !== q[1];
  });
  const keep = pts.filter((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length]!;
    const b = pts[(i + 1) % pts.length]!;
    return Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) > 1e-3;
  });
  if (keep.length < 3) return '';
  return `M${keep.map((p) => `${p[0]} ${p[1]}`).join('L')}Z`;
}

/** One piece of scenery: its convex parts (non-overlapping, so they share one crescent path) and reach. */
export interface CrescentSpec {
  parts: readonly string[];
  /** How far the light shifts the shape, in the piece's own units. */
  k: number;
}

export type CrescentTable = Record<string, Record<LightFrom, string>>;

export function crescentFor(spec: CrescentSpec, from: LightFrom): string {
  const [x, y] = towardLight(from);
  return spec.parts
    .map((d) => crescentPolygon(flatten(d), [x * spec.k, y * spec.k]))
    .filter((p): p is Pt[] => !!p)
    .map(polygonPath)
    .join('');
}

export function buildCrescents(specs: Record<string, CrescentSpec>): CrescentTable {
  const table: CrescentTable = {};
  for (const [id, spec] of Object.entries(specs)) {
    table[id] = Object.fromEntries(LIGHT_FROMS.map((f) => [f, crescentFor(spec, f)])) as Record<LightFrom, string>;
  }
  return table;
}
