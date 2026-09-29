/**
 * Shared drawing kit for habit icons (32-unit canvas). One line weight for every outline and
 * one for inner details keeps the 48 icons feeling drawn by the same hand.
 */
import type { JSX } from 'preact';
import { ACCENT } from '@/art/icons/palette';
import { sparklePath } from '@/art/icons/shapes';

/** Colors handed to every renderer: the tone's 300 (fill) and 100 (soft) shades plus cocoa ink. */
export interface HabitColors {
  fill: string;
  soft: string;
  ink: string;
}

export type HabitDrawing = (c: HabitColors) => JSX.Element;

/** Main outline weight. */
export const LINE = 1.9;
/** Inner detail weight (seams, veins, laces). */
export const FINE = 1.4;

/** The soft top-left highlight: a short white stroke. */
export function Shine({ d, width = 1.5 }: { d: string; width?: number }) {
  return <path d={d} fill="none" stroke="#fff" stroke-width={width} opacity={0.85} />;
}

/** Two little cocoa eyes, open. */
export function Eyes({ l, r, y, ink }: { l: number; r: number; y: number; ink: string }) {
  return (
    <g fill={ink} stroke="none">
      <ellipse cx={l} cy={y} rx={1} ry={1.25} />
      <ellipse cx={r} cy={y} rx={1} ry={1.25} />
    </g>
  );
}

/** Two happy closed eyes (^ ^), or sleepy ones (u u) when `sleepy`. */
export function ClosedEyes({ l, r, y, sleepy = false }: { l: number; r: number; y: number; sleepy?: boolean }) {
  const arc = (x: number) => (sleepy ? `M${x - 1.5} ${y - 0.4}q1.5 1.6 3 0` : `M${x - 1.5} ${y + 0.6}q1.5 -1.8 3 0`);
  return <path d={`${arc(l)}${arc(r)}`} fill="none" stroke-width={FINE} />;
}

/** Blush ellipses, the brand's cheek pink. */
export function Cheeks({ l, r, y }: { l: number; r: number; y: number }) {
  return (
    <g fill={ACCENT.cheek} opacity={0.75} stroke="none">
      <ellipse cx={l} cy={y} rx={1.5} ry={0.9} />
      <ellipse cx={r} cy={y} rx={1.5} ry={0.9} />
    </g>
  );
}

/** A small tiny-smile mouth. */
export function Smile({ x, y, w = 2.4 }: { x: number; y: number; w?: number }) {
  return <path d={`M${x - w / 2} ${y}q${w / 2} ${w * 0.6} ${w} 0`} fill="none" stroke-width={FINE} />;
}

/** A ✦ sparkle with an outline. */
export function Sparkle({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return <path d={sparklePath(x, y, r, 0.24)} fill={fill} stroke-width={FINE} />;
}

/** A tube drawn as an outlined stroke (straws, handles, frames): crisp at every size. */
export function Tube({ d, color, width = 2.2, ink }: { d: string; color: string; width?: number; ink: string }) {
  return (
    <g fill="none">
      <path d={d} stroke={ink} stroke-width={width + LINE * 2} />
      <path d={d} stroke={color} stroke-width={width} />
    </g>
  );
}
