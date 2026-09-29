import { blob, ellipse, fmt, type P } from '../shape';

/**
 * Marking shapes shared by the species. Everything is deterministic (seeded by the arguments),
 * static, and built once per render from a handful of numbers.
 */

/** A seeded pseudo-random stream. */
export function rng(seed: number): () => number {
  let t = Math.floor(seed * 1000) >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stripe from (u, v0) down to (u + bend, v1): `w0` wide at the top, tapering to a round end. */
export function band(u: number, w0: number, w1: number, v0: number, v1: number, bend = 0): string {
  const a0 = u - w0 / 2;
  const b0 = u + w0 / 2;
  const a1 = u + bend - w1 / 2;
  const b1 = u + bend + w1 / 2;
  const vm = (v0 + v1) / 2;
  return (
    `M${fmt(a0)} ${fmt(v0)}C${fmt(a0 + bend * 0.2)} ${fmt(vm)} ${fmt(a1)} ${fmt(vm + (v1 - vm) * 0.5)} ${fmt(a1)} ${fmt(v1)}` +
    `C${fmt(a1)} ${fmt(v1 + w1 * 0.7)} ${fmt(b1)} ${fmt(v1 + w1 * 0.7)} ${fmt(b1)} ${fmt(v1)}` +
    `C${fmt(b1)} ${fmt(vm + (v1 - vm) * 0.5)} ${fmt(b0 + bend * 0.2)} ${fmt(vm)} ${fmt(b0)} ${fmt(v0)}Z`
  );
}

/** An organic patch around (u, v), roughly w × h, turned by `rot` radians. */
export function blotch(u: number, v: number, w: number, h: number, rot = 0, n = 7): string {
  const rand = rng(u * 7.31 + v * 3.17 + w + h * 0.5);
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rot;
    const k = 0.8 + rand() * 0.34;
    pts.push([u + Math.cos(a) * (w / 2) * k, v + Math.sin(a) * (h / 2) * k]);
  }
  return blob(pts);
}

/** `n` small round spots scattered in a box, as one path. */
export function dots(u0: number, v0: number, w: number, h: number, n: number, r: number, seed: number, squash = 0.8): string {
  const rand = rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const cols = Math.ceil(Math.sqrt((n * w) / h));
    const cx = u0 + ((i % cols) + 0.2 + rand() * 0.6) * (w / cols);
    const cy = v0 + (Math.floor(i / cols) + 0.2 + rand() * 0.6) * (h / Math.ceil(n / cols));
    const rr = r * (0.7 + rand() * 0.6);
    d += ellipse(cx, cy, rr, rr * squash);
  }
  return d;
}

/** A soft heart centred on (u, v). */
export function heart(u: number, v: number, w: number, h: number): string {
  const x = (k: number) => fmt(u + (k * w) / 2);
  const y = (k: number) => fmt(v + (k * h) / 2);
  return (
    `M${x(0)} ${y(1)}C${x(-0.5)} ${y(0.6)} ${x(-1)} ${y(0.1)} ${x(-1)} ${y(-0.4)}` +
    `C${x(-1)} ${y(-0.95)} ${x(-0.35)} ${y(-1.15)} ${x(0)} ${y(-0.55)}` +
    `C${x(0.35)} ${y(-1.15)} ${x(1)} ${y(-0.95)} ${x(1)} ${y(-0.4)}` +
    `C${x(1)} ${y(0.1)} ${x(0.5)} ${y(0.6)} ${x(0)} ${y(1)}Z`
  );
}

/** A four-point star, for the Night-sky Cow's field. */
export function star(cx: number, cy: number, r: number): string {
  const k = r * 0.28;
  return `M${fmt(cx)} ${fmt(cy - r)}L${fmt(cx + k)} ${fmt(cy - k)}L${fmt(cx + r)} ${fmt(cy)}L${fmt(cx + k)} ${fmt(cy + k)}L${fmt(cx)} ${fmt(cy + r)}L${fmt(cx - k)} ${fmt(cy + k)}L${fmt(cx - r)} ${fmt(cy)}L${fmt(cx - k)} ${fmt(cy - k)}Z`;
}
