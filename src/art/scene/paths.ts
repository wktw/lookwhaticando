/** Small geometry helpers for building scene paths. */

export type Pt = readonly [number, number];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A smooth open curve through `pts` (Catmull-Rom converted to cubic Béziers). */
function smoothCurve(pts: readonly Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${r1(pts[0]![0])} ${r1(pts[0]![1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

/** A filled band: the smooth ridge line through `pts`, closed down to `bottom`. */
export function ridge(pts: readonly Pt[], bottom: number): string {
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  return `${smoothCurve(pts)} L${last[0]} ${bottom} L${first[0]} ${bottom} Z`;
}

/** Deterministic PRNG (mulberry32) so scattered details never move between renders. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Four-point ✦ sparkle centred on 0,0 with radius 1 (scale it with a transform). */
export const SPARKLE = 'M0 -1 C0.14 -0.25 0.25 -0.14 1 0 C0.25 0.14 0.14 0.25 0 1 C-0.14 0.25 -0.25 0.14 -1 0 C-0.25 -0.14 -0.14 -0.25 0 -1 Z';

/** Crescent moon: a disc (r 20 at 50,50) with a disc (r 17 at 59,43) bitten out of its top-right. */
export const CRESCENT = 'M47.9 30.1 A20 20 0 1 0 68.8 56.9 A17 17 0 0 1 47.9 30.1 Z';
