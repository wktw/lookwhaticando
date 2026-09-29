/**
 * Shared pieces for pin emblems. Emblems are drawn as flat enamel shapes in a 44 × 44 box (centre 22,22)
 * unless a pin gives them a wider box. Parts wrapped in <Detail> (shade sides, seeds, highlights) are
 * left out of the unearned outline, so a "not yet" pin shows only the emblem's main shapes.
 */
import type { ComponentChildren, JSX } from 'preact';
import { flowerPath, memo } from '@/art/icons/shapes';
import { E, shade } from '../palette';
import { SHADE_INK as SHADE } from '@/art/icons/palette';
import css from '../badge.module.css';

export interface EmblemCtx {
  earned: boolean;
}

export type Emblem = (ctx: EmblemCtx) => JSX.Element;

/** Shade sides and small marks: drawn when earned, skipped in the unearned outline. */
export function Detail({ children }: { children: ComponentChildren }) {
  return <g class={css.detail}>{children}</g>;
}

/** A pointed leaf with its base at the origin and its tip at (0, −len). */
export const leafPath = memo(
  (len: number, width: number) =>
    `M0 0C${-width * 0.9} ${-len * 0.12} ${-width} ${-len * 0.6} 0 ${-len}C${width} ${-len * 0.6} ${width * 0.9} ${-len * 0.12} 0 0Z`,
);

/** The same leaf's far half (its shade side), for a two-tone botanical print. */
export const leafHalfPath = memo(
  (len: number, width: number) => `M0 0C${width * 0.9} ${-len * 0.12} ${width} ${-len * 0.6} 0 ${-len}C${width * 0.12} ${-len * 0.6} ${width * 0.12} ${-len * 0.3} 0 0Z`,
);

/** A two-tone leaf placed at (x, y), turned `a` degrees. */
export function Leaf({ x, y, a, len = 12, width = 5, color = E.leaf }: { x: number; y: number; a: number; len?: number; width?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={leafPath(len, width)} fill={color} />
      <Detail>
        <path d={leafHalfPath(len, width)} fill={shade(color)} />
      </Detail>
    </g>
  );
}

export const flower = memo((x: number, y: number, inner: number, outer: number, n: number) => flowerPath(x, y, inner, outer, n));

/** A five-petal flower with a centre. */
export function Flower({ x, y, r, color, centre = E.butterDeep }: { x: number; y: number; r: number; color: string; centre?: string }) {
  return (
    <g>
      <path d={flower(x, y, r * 0.42, r, 5)} fill={color} />
      <circle cx={x} cy={y} r={r * 0.34} fill={centre} />
    </g>
  );
}

/**
 * A side-view pot: a rim, a tapered body and its shade strip on the side away from the window.
 * (x, y) is the top-left of the rim; `w` its width and `h` the whole height.
 */
export function Pot({ x, y, w, h, color = E.terracotta, rim = E.terracottaRim }: { x: number; y: number; w: number; h: number; color?: string; rim?: string }) {
  const rh = h * 0.24;
  const inset = w * 0.1;
  const bx0 = x + w * 0.06;
  const bx1 = x + w * 0.94;
  const top = y + rh;
  const bottom = y + h;
  const body = `M${bx0} ${top}H${bx1}L${bx1 - inset} ${bottom - 1}Q${bx1 - inset - 0.2} ${bottom} ${bx1 - inset - 1.2} ${bottom}H${bx0 + inset + 1.2}Q${bx0 + inset + 0.2} ${bottom} ${bx0 + inset} ${bottom - 1}Z`;
  const sw = w * 0.2;
  const shadeStrip = `M${bx1 - sw} ${top}H${bx1}L${bx1 - inset} ${bottom - 1}Q${bx1 - inset - 0.2} ${bottom} ${bx1 - inset - 1.2} ${bottom}H${bx1 - sw - inset + 0.4}Z`;
  return (
    <g>
      <path d={body} fill={color} />
      <Detail>
        <path d={shadeStrip} fill={shade(color)} />
      </Detail>
      <rect x={x} y={y} width={w} height={rh} rx={Math.min(1.4, rh / 2)} fill={rim} />
      <Detail>
        <rect x={x + w - sw * 0.9} y={y} width={sw * 0.9} height={rh} rx={Math.min(1.4, rh / 2)} fill={shade(rim)} />
      </Detail>
    </g>
  );
}

/** A small round "window glint", the one allowed on a rare-reveal pin. */
export const glintPath = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`;

/** A paw print centred on its main pad. */
const PAW_PAD = 'M0-1C3-1 5.2 1.8 5.2 4.2c0 2-1.6 2.8-5.2 2.8S-5.2 6.2-5.2 4.2C-5.2 1.8-3-1 0-1z';
const PAW_TOES: [number, number, number][] = [
  [-5.3, -3.4, -25],
  [-2, -6.8, -8],
  [2, -6.8, 8],
  [5.3, -3.4, 25],
];
export function Paw({ x, y, a, color, s = 1 }: { x: number; y: number; a: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} fill={color}>
      <path d={PAW_PAD} />
      {PAW_TOES.map(([tx, ty, r]) => (
        <ellipse key={tx} cx={tx} cy={ty} rx={1.9} ry={2.4} transform={`rotate(${r} ${tx} ${ty})`} />
      ))}
    </g>
  );
}


/** A small black cat loafing, facing the window (base centre at the origin, about 13 × 11). */
export function LoafCat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5.2 0c-.6-4.2 2-6.8 6.6-6.8 4 0 6.4 2 6.4 5V0z" fill={E.plum} />
      <circle cx={-4} cy={-6.4} r={3.9} fill={E.plum} />
      <path d="M-7.3-7.6l-.5-4.4 3.6 2.6zM-3.1-9.6l3.4-2.4-.4 4.4z" fill={E.plum} />
      <circle cx={-5.3} cy={-6.4} r={0.8} fill={E.catEye} />
      <circle cx={-2.5} cy={-6.4} r={0.8} fill={E.catEye} />
    </g>
  );
}

/** The capsule's shade: its disc minus itself nudged toward the window (computed offline). */
const CAPSULE_SHADE = 'M12.5 30.87A13 13 0 1 0 29.7 11.53A13 13 0 0 1 12.5 30.87Z';
/** Holographic bands across the lower half (computed offline: horizontal slices of the disc). */
export const HOLO_BANDS = [
  'M9 22H35A13 13 0 0 1 34.74 24.6H9.26A13 13 0 0 1 9 22Z',
  'M9.26 24.6H34.74A13 13 0 0 1 33.91 27.2H10.09A13 13 0 0 1 9.26 24.6Z',
  'M10.09 27.2H33.91A13 13 0 0 1 32.4 29.8H11.6A13 13 0 0 1 10.09 27.2Z',
  'M11.6 29.8H32.4A13 13 0 0 1 29.8 32.4H14.2A13 13 0 0 1 11.6 29.8Z',
  'M14.2 32.4H29.8A13 13 0 0 1 22 35H22A13 13 0 0 1 14.2 32.4Z',
];
const HOLO_COLORS = [E.blush, E.butter, E.mint, E.sky, E.lavender];

/**
 * A capsule toy, drawn at (22, 22) r 13 and placed at (x, y) with radius r: one half clear glass,
 * one half coloured (or holographic stripes), a seam, and the shade on the side away from the window.
 */
export function Capsule({ x = 22, y = 22, r = 13, a = -16, color = E.blush, holo = false, cat = false }: { x?: number; y?: number; r?: number; a?: number; color?: string; holo?: boolean; cat?: boolean }) {
  const k = r / 13;
  return (
    <g transform={`translate(${x} ${y}) scale(${k}) translate(-22 -22)`}>
      <g transform={`rotate(${a} 22 22)`}>
        <path d="M9 22a13 13 0 0 1 26 0z" fill={E.glass} />
        {cat && <LoafCat x={23.4} y={22} s={0.9} />}
        {holo ? HOLO_BANDS.map((d, i) => <path key={d} d={d} fill={HOLO_COLORS[i]} />) : <path d="M9 22h26a13 13 0 0 1-26 0z" fill={color} />}
        <rect x={9} y={20.9} width={26} height={2.2} fill={holo ? E.lavenderDeep : shade(color)} />
      </g>
      <Detail>
        <path d={CAPSULE_SHADE} fill={SHADE} fill-opacity={0.14} />
      </Detail>
    </g>
  );
}
