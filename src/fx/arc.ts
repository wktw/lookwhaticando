import type { Point } from './layer';

/** Point on a quadratic Bézier at t ∈ [0,1]. */
export function quadAt(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}

/**
 * Control point for a friendly arc from `from` to `to`: it rises above the higher of the two
 * points by `lift` and leans sideways by `lean` (px, signed) so parallel flights fan out.
 * Never above `ceiling`, so flights to a wallet at the top edge stay on screen.
 */
export function arcControl(from: Point, to: Point, lift: number, lean = 0, ceiling = 16): Point {
  return { x: (from.x + to.x) / 2 + lean, y: Math.max(ceiling, Math.min(from.y, to.y) - lift) };
}

/** Ease-in-out cubic: coins hang for a beat, then whoosh home. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** How many sprites to fly for an amount: 1 per ~4, at least 1, at most 8. */
export function spriteCount(amount: number): number {
  if (!(amount > 0)) return 0;
  return Math.max(1, Math.min(8, Math.ceil(amount / 4)));
}
