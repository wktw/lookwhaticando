import type { Anchors } from './geometry';

/** Reference head width (the cat's): head art is designed at this width and scaled to each species. */
export const HEAD_REF_WIDTH = 40;

/**
 * SVG transform placing head art drawn in local coordinates, where (0, 0) is the top-center of
 * the head and the design is HEAD_REF_WIDTH wide, onto a species' head anchor.
 */
export function headTransform(anchors: Anchors, opts: { dx?: number; dy?: number; rotate?: number; scale?: number } = {}): string {
  const { x, y, width } = anchors.head;
  const k = (width / HEAD_REF_WIDTH) * (opts.scale ?? 1);
  return `translate(${(x + (opts.dx ?? 0)).toFixed(2)} ${(y + (opts.dy ?? 0)).toFixed(2)}) rotate(${opts.rotate ?? 0}) scale(${k.toFixed(3)})`;
}
