/** Absolute positioning in room units (1 unit = 1cqh of the scene). */
import type { JSX } from 'preact';

/** A room length as CSS. */
export const u = (n: number): string => `calc(${+n.toFixed(3)} * 1cqh)`;

/**
 * Style for art on a square canvas of `size` units whose feet are at `base` (0…100 down its canvas),
 * standing at (x, y). Uses `translate`/`scale` so `transform` stays free for motion.
 */
export function standAt(x: number, y: number, size: number, base: number, z: number, scale = 1): JSX.CSSProperties {
  return {
    position: 'absolute',
    left: u(x - size / 2),
    top: u(y - (size * base) / 100),
    width: u(size),
    height: u(size),
    zIndex: z,
    transformOrigin: `50% ${base}%`,
    scale: scale === 1 ? undefined : String(+scale.toFixed(3)),
  };
}

/** The transform that puts a canvas of `size` with feet at `base` onto (x, y), for elements positioned at 0,0. */
export function moveTo(x: number, y: number, size: number, base: number, scale = 1): string {
  return `translate3d(${u(x - size / 2)}, ${u(y - (size * base) / 100)}, 0) scale(${+scale.toFixed(3)})`;
}
