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

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes two #RRGGBB colors (k = 0 → a, 1 → b). */
export function mix(a: string, b: string, k: number): string {
  const ca = channels(a);
  const cb = channels(b);
  const out = ca.map((c, i) => Math.round(lerp(c, cb[i]!, clamp01(k))));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
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
