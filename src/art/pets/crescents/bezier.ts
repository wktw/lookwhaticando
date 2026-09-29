/**
 * Offline path geometry for the Windowlight crescents: parse SVG path data into cubic Bézier
 * contours, transform them, and compute exact boolean differences and intersections.
 *
 * This file is only used by `generate.ts` (and its freshness test). Nothing here runs in the app:
 * the crescents ship as committed path strings (DESIGN §10.4, "no runtime clip math").
 */

export type Pt = readonly [number, number];
export type Cubic = readonly [Pt, Pt, Pt, Pt];
/** A closed contour: each cubic starts where the previous one ends, and the last ends at the first. */
export type Contour = Cubic[];
/** A 2D affine matrix [a, b, c, d, e, f], as in SVG `matrix()`. */
export type Matrix = readonly [number, number, number, number, number, number];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const line = (a: Pt, b: Pt): Cubic => [a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b];

/* ------------------------------------------------------------------ parsing */

function arcToCubics(p0: Pt, rx: number, ry: number, phiDeg: number, large: boolean, sweep: boolean, p1: Pt): Cubic[] {
  if (rx === 0 || ry === 0) return [line(p0, p1)];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2;
  const dy = (p0[1] - p1[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (k * rx * y1) / ry;
  const cy1 = (-k * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0[0] + p1[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (p0[1] + p1[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2)));
  const step = dt / n;
  const alpha = (4 / 3) * Math.tan(step / 4);
  const out: Cubic[] = [];
  const at = (t: number): Pt => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const der = (t: number): Pt => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  let a = t1;
  let pa = p0;
  for (let i = 0; i < n; i++) {
    const b = a + step;
    const pb = i === n - 1 ? p1 : at(b);
    const da = der(a);
    const db = der(b);
    out.push([pa, [pa[0] + alpha * da[0], pa[1] + alpha * da[1]], [pb[0] - alpha * db[0], pb[1] - alpha * db[1]], pb]);
    a = b;
    pa = pb;
  }
  return out;
}

/** Parses SVG path data (every command, absolute or relative) into closed cubic contours. */
export function parsePath(d: string): Contour[] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const out: Contour[] = [];
  let cur: Contour = [];
  let i = 0;
  let cmd = '';
  let p: Pt = [0, 0];
  let start: Pt = [0, 0];
  let lastCtrl: Pt | null = null;
  let lastQuad: Pt | null = null;
  const num = () => Number(tokens[i++]);
  const close = () => {
    if (cur.length) {
      const first = cur[0]![0];
      if (Math.hypot(p[0] - first[0], p[1] - first[1]) > 1e-9) cur.push(line(p, first));
      out.push(cur);
    }
    cur = [];
    p = start;
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? p[0] : 0;
    const oy = rel ? p[1] : 0;
    let ctrl: Pt | null = null;
    let quad: Pt | null = null;
    switch (C) {
      case 'M': {
        if (cur.length) close();
        p = [ox + num(), oy + num()];
        start = p;
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        const q: Pt = [ox + num(), oy + num()];
        cur.push(line(p, q));
        p = q;
        break;
      }
      case 'H': {
        const q: Pt = [(rel ? p[0] : 0) + num(), p[1]];
        cur.push(line(p, q));
        p = q;
        break;
      }
      case 'V': {
        const q: Pt = [p[0], (rel ? p[1] : 0) + num()];
        cur.push(line(p, q));
        p = q;
        break;
      }
      case 'C': {
        const c1: Pt = [ox + num(), oy + num()];
        const c2: Pt = [ox + num(), oy + num()];
        const q: Pt = [ox + num(), oy + num()];
        cur.push([p, c1, c2, q]);
        ctrl = c2;
        p = q;
        break;
      }
      case 'S': {
        const c1: Pt = lastCtrl ? [2 * p[0] - lastCtrl[0], 2 * p[1] - lastCtrl[1]] : p;
        const c2: Pt = [ox + num(), oy + num()];
        const q: Pt = [ox + num(), oy + num()];
        cur.push([p, c1, c2, q]);
        ctrl = c2;
        p = q;
        break;
      }
      case 'Q':
      case 'T': {
        const c: Pt = C === 'Q' ? [ox + num(), oy + num()] : lastQuad ? [2 * p[0] - lastQuad[0], 2 * p[1] - lastQuad[1]] : p;
        const q: Pt = [ox + num(), oy + num()];
        cur.push([p, lerp(p, c, 2 / 3), lerp(q, c, 2 / 3), q]);
        quad = c;
        p = q;
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rot = num();
        const large = num() !== 0;
        const sweep = num() !== 0;
        const q: Pt = [ox + num(), oy + num()];
        cur.push(...arcToCubics(p, rx, ry, rot, large, sweep, q));
        p = q;
        break;
      }
      case 'Z':
        close();
        break;
      default:
        throw new Error(`Unsupported path command ${cmd}`);
    }
    lastCtrl = ctrl;
    lastQuad = quad;
  }
  if (cur.length) close();
  return out;
}

/* --------------------------------------------------------------- transforms */

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export const translation = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
export const scaling = (sx: number, sy = sx): Matrix => [sx, 0, 0, sy, 0, 0];
export function rotation(deg: number, cx = 0, cy = 0): Matrix {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return multiply(translation(cx, cy), multiply([c, s, -s, c, 0, 0], translation(-cx, -cy)));
}

const apply = (m: Matrix, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

export function transform(cs: Contour[], m: Matrix): Contour[] {
  return cs.map((c) => c.map((s) => s.map((p) => apply(m, p)) as unknown as Cubic));
}

/* ------------------------------------------------------------- evaluation */

export function evalCubic(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
}

export function splitCubic(c: Cubic, t: number): [Cubic, Cubic] {
  const [p0, p1, p2, p3] = c;
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const cc = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, cc, t);
  const f = lerp(d, e, t);
  return [
    [p0, a, d, f],
    [f, e, cc, p3],
  ];
}

/** The piece of `c` between parameters t0 < t1. */
export function subCubic(c: Cubic, t0: number, t1: number): Cubic {
  if (t0 <= 0 && t1 >= 1) return c;
  const right = t0 > 0 ? splitCubic(c, t0)[1] : c;
  if (t1 >= 1) return right;
  return splitCubic(right, (t1 - t0) / (1 - t0))[0];
}

function bbox(c: Cubic): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of c) {
    x0 = Math.min(x0, p[0]);
    y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0]);
    y1 = Math.max(y1, p[1]);
  }
  return [x0, y0, x1, y1];
}

function flatness(c: Cubic): number {
  const [p0, p1, p2, p3] = c;
  const dx = p3[0] - p0[0];
  const dy = p3[1] - p0[1];
  const len = Math.hypot(dx, dy) || 1e-12;
  const dist = (p: Pt) => Math.abs((p[0] - p0[0]) * dy - (p[1] - p0[1]) * dx) / len;
  return Math.max(dist(p1), dist(p2));
}

/** Samples a contour set as closed polylines (for inside tests and areas). */
export function flatten(cs: Contour[], per = 24): Pt[][] {
  return cs.map((c) => c.flatMap((s) => Array.from({ length: per }, (_, i) => evalCubic(s, i / per))));
}

/** Even-odd inside test against flattened contours. */
export function inside(polys: Pt[][], p: Pt): boolean {
  let hit = false;
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const b = poly[j]!;
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
  }
  return hit;
}

/** Signed area of flattened contours (positive = clockwise in SVG's y-down frame). */
export function area(cs: Contour[]): number {
  let total = 0;
  for (const poly of flatten(cs, 32)) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) total += (poly[j]![0] - poly[i]![0]) * (poly[j]![1] + poly[i]![1]);
  }
  return total / 2;
}

/** Orients every contour clockwise (positive area in SVG's frame), so booleans can mix sources. */
export function clockwise(cs: Contour[]): Contour[] {
  return cs.map((c) => (area([c]) < 0 ? c.slice().reverse().map((s) => [s[3], s[2], s[1], s[0]] as Cubic) : c));
}

/* ------------------------------------------------------------ intersections */

interface Hit {
  t: number;
  u: number;
}

function intersectCubics(p: Cubic, q: Cubic, t0: number, t1: number, u0: number, u1: number, depth: number, out: Hit[]) {
  const a = bbox(p);
  const b = bbox(q);
  if (a[2] < b[0] - 1e-9 || b[2] < a[0] - 1e-9 || a[3] < b[1] - 1e-9 || b[3] < a[1] - 1e-9) return;
  if (depth > 48 || (flatness(p) < 1e-4 && flatness(q) < 1e-4)) {
    const [x1, y1] = p[0];
    const [x2, y2] = p[3];
    const [x3, y3] = q[0];
    const [x4, y4] = q[3];
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-14) return;
    const s = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const r = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (s < -1e-9 || s > 1 + 1e-9 || r < -1e-9 || r > 1 + 1e-9) return;
    out.push({ t: t0 + (t1 - t0) * Math.min(1, Math.max(0, s)), u: u0 + (u1 - u0) * Math.min(1, Math.max(0, r)) });
    return;
  }
  const [p0, p1] = splitCubic(p, 0.5);
  const [q0, q1] = splitCubic(q, 0.5);
  const tm = (t0 + t1) / 2;
  const um = (u0 + u1) / 2;
  intersectCubics(p0, q0, t0, tm, u0, um, depth + 1, out);
  intersectCubics(p0, q1, t0, tm, um, u1, depth + 1, out);
  intersectCubics(p1, q0, tm, t1, u0, um, depth + 1, out);
  intersectCubics(p1, q1, tm, t1, um, u1, depth + 1, out);
}

/* ----------------------------------------------------------------- booleans */

interface Seg {
  side: 0 | 1;
  contour: number;
  index: number;
  cubic: Cubic;
}

interface Event {
  id: number;
  point: Pt;
}

interface Chain {
  side: 0 | 1;
  pieces: Cubic[];
  from: number | null;
  to: number | null;
}

function chainsOf(side: 0 | 1, cs: Contour[], cuts: Map<string, { t: number; ev: number }[]>): Chain[] {
  const chains: Chain[] = [];
  cs.forEach((contour, ci) => {
    // Walk the contour, cutting segments at their events, collecting pieces between events.
    const pieces: { cubic: Cubic; endEv: number | null }[] = [];
    let firstEv: number | null = null;
    contour.forEach((cubic, si) => {
      const list = (cuts.get(`${side}:${ci}:${si}`) ?? []).slice().sort((a, b) => a.t - b.t);
      let t = 0;
      for (const cut of list) {
        if (cut.t - t > 1e-7) pieces.push({ cubic: subCubic(cubic, t, cut.t), endEv: cut.ev });
        else if (pieces.length) pieces[pieces.length - 1]!.endEv = cut.ev;
        else firstEv = cut.ev;
        t = cut.t;
      }
      if (1 - t > 1e-7) pieces.push({ cubic: subCubic(cubic, t, 1), endEv: null });
      else if (t >= 1 - 1e-7 && list.length && pieces.length === 0) firstEv = list[list.length - 1]!.ev;
    });
    const evIdx = pieces.map((p, i) => (p.endEv !== null ? i : -1)).filter((i) => i >= 0);
    if (evIdx.length === 0 && firstEv === null) {
      chains.push({ side, pieces: pieces.map((p) => p.cubic), from: null, to: null });
      return;
    }
    // Rotate so the walk starts just after an event.
    let startAt: number;
    let startEv: number;
    if (firstEv !== null) {
      startAt = 0;
      startEv = firstEv;
    } else {
      startAt = (evIdx[evIdx.length - 1]! + 1) % pieces.length;
      startEv = pieces[evIdx[evIdx.length - 1]!]!.endEv!;
    }
    let cur: Cubic[] = [];
    let from = startEv;
    for (let k = 0; k < pieces.length; k++) {
      const piece = pieces[(startAt + k) % pieces.length]!;
      cur.push(piece.cubic);
      if (piece.endEv !== null) {
        chains.push({ side, pieces: cur, from, to: piece.endEv });
        cur = [];
        from = piece.endEv;
      }
    }
    if (cur.length) chains.push({ side, pieces: cur, from, to: startEv });
  });
  return chains;
}

function chainMid(chain: Chain): Pt {
  const piece = chain.pieces[Math.floor(chain.pieces.length / 2)]!;
  return evalCubic(piece, chain.pieces.length % 2 ? 0.5 : 0.02);
}

const reverseCubic = (c: Cubic): Cubic => [c[3], c[2], c[1], c[0]];

function boolean(a: Contour[], b: Contour[], op: 'difference' | 'intersection'): Contour[] {
  const segs: Seg[] = [];
  a.forEach((c, ci) => c.forEach((cubic, index) => segs.push({ side: 0, contour: ci, index, cubic })));
  b.forEach((c, ci) => c.forEach((cubic, index) => segs.push({ side: 1, contour: ci, index, cubic })));
  const segA = segs.filter((s) => s.side === 0);
  const segB = segs.filter((s) => s.side === 1);
  const events: Event[] = [];
  const cuts = new Map<string, { t: number; ev: number }[]>();
  const addCut = (s: Seg, t: number, ev: number) => {
    const key = `${s.side}:${s.contour}:${s.index}`;
    const list = cuts.get(key) ?? [];
    list.push({ t, ev });
    cuts.set(key, list);
  };
  for (const sa of segA) {
    for (const sb of segB) {
      const hits: Hit[] = [];
      intersectCubics(sa.cubic, sb.cubic, 0, 1, 0, 1, 0, hits);
      for (const h of hits) {
        const pa = evalCubic(sa.cubic, h.t);
        const pb = evalCubic(sb.cubic, h.u);
        const point: Pt = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
        if (events.some((e) => Math.hypot(e.point[0] - point[0], e.point[1] - point[1]) < 2e-3)) continue;
        const ev = events.length;
        events.push({ id: ev, point });
        // A hit at a segment's end belongs to the start of the next segment, so cuts stay interior.
        addCut(sa, h.t, ev);
        addCut(sb, h.u, ev);
      }
    }
  }
  const polyA = flatten(a);
  const polyB = flatten(b);
  const chains = [...chainsOf(0, a, cuts), ...chainsOf(1, b, cuts)];
  const keep: Chain[] = [];
  for (const ch of chains) {
    const mid = chainMid(ch);
    if (ch.side === 0) {
      const inB = inside(polyB, mid);
      if (op === 'difference' ? !inB : inB) keep.push(ch);
    } else if (inside(polyA, mid)) {
      keep.push(op === 'difference' ? { side: 1, pieces: ch.pieces.map(reverseCubic).reverse(), from: ch.to, to: ch.from } : ch);
    }
  }
  const out: Contour[] = [];
  const open = keep.filter((c) => c.from !== null);
  for (const ch of keep) if (ch.from === null) out.push(ch.pieces);
  const byStart = new Map<number, Chain[]>();
  for (const ch of open) byStart.set(ch.from!, [...(byStart.get(ch.from!) ?? []), ch]);
  const used = new Set<Chain>();
  for (const ch of open) {
    if (used.has(ch)) continue;
    const loop: Cubic[] = [];
    let cur: Chain | undefined = ch;
    let guard = 0;
    while (cur && !used.has(cur) && guard++ < 1000) {
      used.add(cur);
      const snapped = cur.pieces.slice();
      const s = events[cur.from!]!.point;
      const e = events[cur.to!]!.point;
      const first = snapped[0]!;
      const last = snapped[snapped.length - 1]!;
      snapped[0] = [s, first[1], first[2], first[3]];
      snapped[snapped.length - 1] = [snapped[snapped.length - 1]![0], last[1], last[2], e];
      if (snapped.length === 1) snapped[0] = [s, first[1], first[2], e];
      loop.push(...snapped);
      const next: Chain[] = (byStart.get(cur.to!) ?? []).filter((c) => !used.has(c));
      cur = next[0];
    }
    if (loop.length) out.push(loop);
  }
  return out;
}

/** a − b, exact on the curves. Both inputs must be simple, non-self-intersecting closed contours. */
export const difference = (a: Contour[], b: Contour[]) => boolean(a, b, 'difference');
/** a ∩ b, exact on the curves. */
export const intersection = (a: Contour[], b: Contour[]) => boolean(a, b, 'intersection');

/* ------------------------------------------------------------------ output */

const fmt = (n: number, dp: number) => {
  const s = n.toFixed(dp).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

/**
 * Serializes contours as compact relative path data (m, c, l, z), dropping slivers under
 * `minArea`. Offsets are taken from the rounded previous point, so rounding never drifts.
 */
export function toPath(cs: Contour[], dp = 1, minArea = 0.05): string {
  const k = 10 ** dp;
  const q = (n: number) => Math.round(n * k) / k;
  // Minified numbers: no separator before a sign, or before '.5' when the last number has a point.
  let last = '';
  const num = (n: number, first: boolean) => {
    const s = fmt(n, dp).replace(/^(-?)0\./, '$1.');
    const sep = first || s.startsWith('-') || (s.startsWith('.') && last.includes('.')) ? '' : ' ';
    last = s;
    return sep + s;
  };
  const pair = (x: number, y: number, first: boolean) => num(x, first) + num(y, false);
  return cs
    .filter((c) => Math.abs(area([c])) >= minArea)
    .map((c) => {
      let px = q(c[0]![0][0]);
      let py = q(c[0]![0][1]);
      let s = `M${pair(px, py, true)}`;
      for (const cub of c) {
        const ex = q(cub[3][0]);
        const ey = q(cub[3][1]);
        if (flatness(cub) < 1e-4) {
          if (ex !== px || ey !== py) s += `l${pair(ex - px, ey - py, true)}`;
        } else {
          s += `c${pair(q(cub[1][0]) - px, q(cub[1][1]) - py, true)}${pair(q(cub[2][0]) - px, q(cub[2][1]) - py, false)}${pair(ex - px, ey - py, false)}`;
        }
        px = ex;
        py = ey;
      }
      return `${s}z`;
    })
    .join('');
}
