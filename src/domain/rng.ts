/**
 * Injectable randomness (DESIGN §11 "Randomness"). Domain functions never call Math.random; they
 * take an `Rng`. Production passes a crypto-backed source, tests a seeded mulberry32.
 */

/** Returns a float in [0, 1). */
export type Rng = () => number;

/** mulberry32: a tiny, fast, well-distributed seeded PRNG (deterministic across platforms). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** A uniformly chosen element (throws on an empty list). */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('pick: empty list');
  return items[Math.floor(rng() * items.length)]!;
}

/** True with probability p. */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}
