/** Small numeric helpers shared by the plant renderers. */

/** Clamps to 0..1; NaN becomes 0 so bad input can never leak into path data. */
export const clamp01 = (v: number) => (v > 0 ? (v < 1 ? v : 1) : 0);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0 → 1 as `t` moves from `a` to `b` (clamped). */
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
/** Rounds for compact path strings. */
export const f = (n: number) => Math.round(n * 100) / 100;
/** Ease-out for growth: quick to appear, slow to settle. */
export const easeOut = (k: number) => 1 - (1 - clamp01(k)) ** 2;

export type Rgb = [number, number, number];

export function channels(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;

/** RGB (0..255) to hue (0..360), saturation and lightness (0..1). */
export function toHsl([r, g, b]: Rgb): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}

export function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

/** Mixes two #RRGGBB colors (k = 0 → a, 1 → b). */
export function mix(a: string, b: string, k: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return hex(ca.map((c, i) => lerp(c, cb[i]!, clamp01(k))));
}

/** Stable pseudo-random 0..1 from a string (desynchronises idle timings between plants). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** A small deterministic generator (mulberry32) for authored scatter: flecks, seeds, blades. */
export function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
