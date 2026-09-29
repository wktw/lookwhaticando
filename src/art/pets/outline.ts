/**
 * Silhouette utilities for traits that reshape a body: sampling our simple absolute
 * M/C/L/Z body paths, smoothing point loops, and scalloping an outline into fluff.
 */
export type Pt = [number, number];

const f = (n: number) => +n.toFixed(2);

/** Densely sample a closed path made of absolute M, C, L and Z commands. */
function densePoints(d: string, per = 24): Pt[] {
  const toks = d.match(/[MCLZ]|-?\d*\.?\d+/g) ?? [];
  const pts: Pt[] = [];
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  let cmd = '';
  let i = 0;
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    const t = toks[i]!;
    if (/[MCLZ]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z') cur = start;
      continue;
    }
    if (cmd === 'M') {
      cur = [num(), num()];
      start = cur;
      pts.push(cur);
      cmd = 'L';
    } else if (cmd === 'L') {
      const p: Pt = [num(), num()];
      for (let k = 1; k <= per; k++) pts.push([cur[0] + ((p[0] - cur[0]) * k) / per, cur[1] + ((p[1] - cur[1]) * k) / per]);
      cur = p;
    } else if (cmd === 'C') {
      const a: Pt = [num(), num()];
      const b: Pt = [num(), num()];
      const c: Pt = [num(), num()];
      for (let k = 1; k <= per; k++) {
        const s = k / per;
        const u = 1 - s;
        pts.push([
          u * u * u * cur[0] + 3 * u * u * s * a[0] + 3 * u * s * s * b[0] + s * s * s * c[0],
          u * u * u * cur[1] + 3 * u * u * s * a[1] + 3 * u * s * s * b[1] + s * s * s * c[1],
        ]);
      }
      cur = c;
    } else {
      i++;
    }
  }
  return pts;
}

/** `n` points evenly spaced by arc length around a closed path. */
export function outlinePoints(d: string, n: number): Pt[] {
  const dense = densePoints(d);
  const lens = [0];
  for (let i = 1; i < dense.length; i++) lens.push(lens[i - 1]! + Math.hypot(dense[i]![0] - dense[i - 1]![0], dense[i]![1] - dense[i - 1]![1]));
  const total = lens[lens.length - 1]!;
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (k * total) / n;
    while (j < lens.length - 2 && lens[j + 1]! < target) j++;
    const t = (target - lens[j]!) / (lens[j + 1]! - lens[j]! || 1);
    out.push([dense[j]![0] + (dense[j + 1]![0] - dense[j]![0]) * t, dense[j]![1] + (dense[j + 1]![1] - dense[j]![1]) * t]);
  }
  return out;
}

/** A closed Catmull-Rom spline through the points, as cubic Béziers. */
export function smoothPath(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

/** Scallop an outline into `bumps` soft puffs that swell `amp` units outward (fluffy fur, clouds). */
export function scallopPath(d: string, bumps: number, amp: number): string {
  const pts = outlinePoints(d, bumps);
  const cx = pts.reduce((s, p) => s + p[0], 0) / bumps;
  const cy = pts.reduce((s, p) => s + p[1], 0) / bumps;
  let out = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 0; i < bumps; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % bumps]!;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    // Normal of the chord, flipped to point away from the centroid.
    let nx = b[1] - a[1];
    let ny = a[0] - b[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    if (nx * (mx - cx) + ny * (my - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    out += ` Q${f(mx + nx * amp * 2)} ${f(my + ny * amp * 2)} ${f(b[0])} ${f(b[1])}`;
  }
  return `${out} Z`;
}

/** Apply `fn` to every coordinate pair of an absolute M/C/L/Z path. */
export function mapPath(d: string, fn: (p: Pt) => Pt): string {
  return d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (_, x: string, y: string) => {
    const [nx, ny] = fn([Number(x), Number(y)]);
    return `${f(nx)} ${f(ny)}`;
  });
}
