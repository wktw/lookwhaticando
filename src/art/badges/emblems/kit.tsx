/** Shared pieces for badge emblems, drawn in a 40×40 box (center 20,20; keep within r ≈ 20). */
import type { JSX } from 'preact';
import { sparklePath } from '@/art/icons/shapes';
import type { EmblemPalette } from '../palette';

export interface EmblemCtx {
  p: EmblemPalette;
  /** Unique id prefix for gradients inside this medal instance. */
  uid: string;
  earned: boolean;
}

export type Emblem = (ctx: EmblemCtx) => JSX.Element;

/** Emblem outline weight. */
export const EW = 2.2;
/** Emblem inner-detail weight. */
export const EF = 1.6;

/** The soft top-left highlight. */
export function Gleam({ d, width = 1.8 }: { d: string; width?: number }) {
  return <path d={d} fill="none" stroke="#fff" stroke-width={width} stroke-linecap="round" opacity={0.85} />;
}

/** A ✦ sparkle with a fine outline. */
export function Spark({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return <path d={sparklePath(x, y, r, 0.24)} fill={fill} stroke-width={1.3} />;
}

/** Two small cocoa eyes. */
export function Dots({ l, r, y, ink, size = 1 }: { l: number; r: number; y: number; ink: string; size?: number }) {
  return (
    <g fill={ink} stroke="none">
      <ellipse cx={l} cy={y} rx={1.05 * size} ry={1.3 * size} />
      <ellipse cx={r} cy={y} rx={1.05 * size} ry={1.3 * size} />
    </g>
  );
}

/** Blush cheeks. */
export function Blush({ l, r, y, color }: { l: number; r: number; y: number; color: string }) {
  return (
    <g fill={color} opacity={0.8} stroke="none">
      <ellipse cx={l} cy={y} rx={1.8} ry={1.1} />
      <ellipse cx={r} cy={y} rx={1.8} ry={1.1} />
    </g>
  );
}
