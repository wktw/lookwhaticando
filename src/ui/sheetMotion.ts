/** Pure gesture math for bottom sheets (tested in tests/unit/ui/sheetMotion.test.ts). */

/**
 * iOS-style rubber band: the further you pull past an edge, the less it gives.
 * `overshoot` px past the edge → displayed px, approaching `dimension` asymptotically.
 */
export function rubberBand(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  const x = Math.abs(overshoot);
  return Math.sign(overshoot) * (1 - 1 / ((x * constant) / dimension + 1)) * dimension;
}

/** Distance a flick carries with a per-ms deceleration factor (0.99 ≈ UIKit "fast"). */
export function projection(velocity: number, deceleration = 0.99): number {
  return (velocity * deceleration) / (1 - deceleration);
}

/** Index of the snap point nearest to where the release would coast to. */
export function pickSnap(points: readonly number[], position: number, velocity: number): number {
  const target = position + projection(velocity);
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i]! - target) < Math.abs(points[best]! - target)) best = i;
  }
  return best;
}

/** Velocity (px/ms) from recent samples, ignoring anything older than `windowMs`. */
export function velocityOf(samples: readonly { y: number; t: number }[], windowMs = 90): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  let first = last;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (last.t - samples[i]!.t > windowMs) break;
    first = samples[i]!;
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}
