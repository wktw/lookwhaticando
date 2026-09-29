/**
 * Drawing kit for decor art: the brand outline, a ground shadow, the soft top-left shine,
 * warm glows and sparkles. Decor is drawn on the 100×100 canvas, standing on y ≈ 93 and
 * centred on x = 50, so the same art works as an icon and placed in the Meadow.
 *
 * Every renderer paints through `paint(opts)`: surface colours sink toward the night sky at
 * night (lights stay bright, so they read as light sources), and line widths follow `line`,
 * which the Meadow sets so a big barn and a tiny tennis ball get the same outline as the pets.
 */
import type { JSX } from 'preact';
import { OUTLINE, STROKE } from '@/art/pets/geometry';
import { SPARKLE } from '../paths';

export { OUTLINE, STROKE };

export interface DecorArtOptions {
  /** Night scene: surfaces take on the moonlight, lamps and windows glow. */
  night?: boolean;
  /** Outline scale: 1 on the icon canvas; the Meadow passes PET_UNITS ÷ size. */
  line?: number;
}

/** Draws one decor item on the 100×100 canvas (no <svg> wrapper). */
export type DecorRenderer = (opts?: DecorArtOptions) => JSX.Element;

/** The night sky's deep lavender that surfaces lean toward after dark. */
const NIGHT_TINT = [63, 54, 121] as const;
const NIGHT_MIX = 0.3;
const NIGHT_DESATURATE = 0.18;

const toned = new Map<string, string>();

/** `hex` as it looks in the moonlight: a little greyer and mixed toward the night sky. */
export function nightTone(hex: string): string {
  const hit = toned.get(hex);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  const grey = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
  const out = rgb.map((v, i) => {
    const flat = v + (grey - v) * NIGHT_DESATURATE;
    return Math.round(flat + (NIGHT_TINT[i]! - flat) * NIGHT_MIX);
  });
  const result = `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  toned.set(hex, result);
  return result;
}

/** How one render paints. */
export interface Paint {
  night: boolean;
  /** A surface colour, toned for the time of day. Lights and flames skip this. */
  c: (hex: string) => string;
  /** A stroke width, scaled with the outline. */
  w: (width: number) => number;
  /** Outline attributes: the brand 2.4 cocoa line with round joins. */
  ink: { stroke: string; 'stroke-width': number; 'stroke-linejoin': 'round'; 'stroke-linecap': 'round' };
  /** A thinner line for inner details (seams, planks, stitching). */
  detail: { stroke: string; 'stroke-width': number; 'stroke-linejoin': 'round'; 'stroke-linecap': 'round'; fill: 'none' };
}

export function paint({ night = false, line = 1 }: DecorArtOptions = {}): Paint {
  const w = (width: number) => +(width * line).toFixed(3);
  return {
    night,
    c: night ? nightTone : (hex) => hex,
    w,
    ink: { stroke: OUTLINE, 'stroke-width': w(STROKE), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
    detail: { stroke: OUTLINE, 'stroke-width': w(1.6), 'stroke-linejoin': 'round', 'stroke-linecap': 'round', fill: 'none' },
  };
}

export function Shadow({ cx = 50, cy = 93.5, rx, ry = 3.6 }: { cx?: number; cy?: number; rx: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={OUTLINE} opacity={0.12} />;
}

interface ShineProps {
  p: Paint;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate?: number;
  opacity?: number;
}

/** The one soft top-left highlight every object gets (softer by moonlight). */
export function Shine({ p, cx, cy, rx, ry, rotate = -30, opacity = 0.5 }: ShineProps) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rotate} ${cx} ${cy})`} fill="#fff" opacity={p.night ? opacity * 0.55 : opacity} />;
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

const PETAL_ANGLES = [0, 72, 144, 216, 288].map((a) => (a * Math.PI) / 180);

/** A little five-petal flower centred on 0,0 (petal radius `r`, set `ring` from the centre). */
export function Flower({ p, petal, r = 2.2, ring = 2.6, line = 1 }: { p: Paint; petal: string; r?: number; ring?: number; line?: number }) {
  return (
    <g stroke={OUTLINE}>
      {PETAL_ANGLES.map((a) => (
        <circle key={a} cx={+(Math.sin(a) * ring).toFixed(2)} cy={+(-Math.cos(a) * ring).toFixed(2)} r={r} fill={p.c(petal)} stroke-width={p.w(line)} />
      ))}
      <circle r={+(r * 0.72).toFixed(2)} fill={p.c('#FFD65C')} stroke-width={p.w(line * 0.9)} />
    </g>
  );
}
