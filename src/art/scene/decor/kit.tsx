/**
 * Drawing kit for decor art: the brand outline, a ground shadow, the soft top-left shine,
 * warm glows and sparkles. Decor is drawn on the 100×100 canvas, standing on y ≈ 93 and
 * centred on x = 50, so the same art works as an icon and placed in the Meadow.
 */
import type { JSX } from 'preact';
import { OUTLINE, STROKE } from '@/art/pets/geometry';
import { SPARKLE } from '../paths';

export { OUTLINE, STROKE };

export interface DecorArtOptions {
  /** Night scene: lights, lamps and windows glow brighter. */
  night?: boolean;
}

/** Draws one decor item on the 100×100 canvas (no <svg> wrapper). */
export type DecorRenderer = (opts?: DecorArtOptions) => JSX.Element;

/** Attributes for an outlined shape in the brand style. */
export const INK = { stroke: OUTLINE, 'stroke-width': STROKE, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' } as const;

/** A thinner line for inner details (seams, planks, stitching). */
export const DETAIL = { stroke: OUTLINE, 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', fill: 'none' } as const;

export function Shadow({ cx = 50, cy = 93.5, rx, ry = 3.6 }: { cx?: number; cy?: number; rx: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={OUTLINE} opacity={0.12} />;
}

/** The one soft top-left highlight every object gets. */
export function Shine({ cx, cy, rx, ry, rotate = -30, opacity = 0.5 }: { cx: number; cy: number; rx: number; ry: number; rotate?: number; opacity?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rotate} ${cx} ${cy})`} fill="#fff" opacity={opacity} />;
}

/** A warm light halo made of stacked translucent discs (no filters, no gradient ids). */
export function Glow({ cx, cy, r, color = '#FFE59A', strong }: { cx: number; cy: number; r: number; color?: string; strong?: boolean }) {
  const k = strong ? 1.6 : 1;
  return (
    <g fill={color}>
      <circle cx={cx} cy={cy} r={r} opacity={0.12 * k} />
      <circle cx={cx} cy={cy} r={r * 0.68} opacity={0.16 * k} />
      <circle cx={cx} cy={cy} r={r * 0.4} opacity={0.22 * k} />
    </g>
  );
}

export function Sparkle({ x, y, r, fill = '#FFE593' }: { x: number; y: number; r: number; fill?: string }) {
  return <path d={SPARKLE} transform={`translate(${x} ${y}) scale(${r})`} fill={fill} stroke="#fff" stroke-width={0.5 / r} />;
}

/** A plump heart centred on 0,0 about 12 wide; place it with a transform. */
export const HEART = 'M0 5 C-1.4 3.7 -6 0.7 -6 -2.2 C-6 -4.6 -4 -6 -2.4 -6 C-1.1 -6 -0.4 -5.3 0 -4.4 C0.4 -5.3 1.1 -6 2.4 -6 C4 -6 6 -4.6 6 -2.2 C6 0.7 1.4 3.7 0 5 Z';
