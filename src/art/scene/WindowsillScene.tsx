/**
 * The Today header (DESIGN §13.1): a cream wood window with blush curtains tied back, the sky
 * outside following the time of day, and a sill across the bottom where the buddy and the
 * potted plants stand (pass them as `children`, placed with `sillLayout` or `sillSlotStyle`).
 * Fills its container: give it a width and a height (≈150–190 px on phones).
 */
import type { ComponentChildren, JSX } from 'preact';
import { PALETTES } from './palette';
import type { TimeOfDay } from './time';
import { SkyGradient } from './sky/SkyGradient';
import { Stars } from './sky/Stars';
import { Orb } from './sky/Orb';
import { DriftingClouds, type CloudSpec } from './sky/Clouds';
import { OutsideView } from './sill/OutsideView';
import { Curtain } from './sill/Curtain';
import s from './sill/sill.module.css';

export interface WindowsillSceneProps {
  time: TimeOfDay;
  /** The buddy and plants, each placed with `sillLayout` / `sillSlotStyle`. */
  children?: ComponentChildren;
  class?: string;
  style?: JSX.CSSProperties;
}

const CLOUDS: readonly CloudSpec[] = [
  { x: 18, top: 10, height: 19, duration: 110 },
  { x: 60, top: 30, height: 14, duration: 150 },
];
/** Sun or moon height in the window: high by day and night, low at dawn and golden hour. */
const ORB_Y: Record<TimeOfDay, string> = { dawn: '42%', day: '30%', golden: '50%', night: '30%' };
/** …and across: the dawn sun rises on the left pane, the others sit on the right. */
const ORB_X: Record<TimeOfDay, string> = { dawn: '22%', day: '80%', golden: '80%', night: '80%' };

/** The sill's top surface, as % of the scene height from the top: things stand here. */
export const SILL_SURFACE = 88.5;
/** The sill fits up to this many things (the buddy plus five pots). */
export const SILL_MAX_ITEMS = 6;
/** Neighbours stand this share of their average height apart (before squeezing). */
const SILL_PACK = 0.86;
/** Share of the width the row may use before it squeezes together. */
const SILL_SPAN = 76;
/** Equal spacing used by `sillSlotStyle`, in % of the scene height. */
const SILL_GAP = 46;

export interface SillRow {
  /** Each thing's centre, relative to the middle of the row (in % of the scene height, unsqueezed). */
  offsets: number[];
  /** Distance from the first centre to the last. */
  span: number;
}

/** The pure spacing math: neighbours get room in proportion to their sizes, centred on 0. */
export function sillRow(sizes: readonly number[]): SillRow {
  const shown = sizes.slice(0, SILL_MAX_ITEMS);
  const at: number[] = [0];
  for (let i = 1; i < shown.length; i++) at.push(at[i - 1]! + ((shown[i - 1]! + shown[i]!) / 2) * SILL_PACK);
  const span = at[at.length - 1] ?? 0;
  return { offsets: at.map((a) => a - span / 2), span };
}

function slotStyle(offset: number, span: number, size: number, zIndex: number): JSX.CSSProperties {
  const unit = span > 0 ? `min(1cqh, ${+(SILL_SPAN / span).toFixed(4)}cqw)` : '1cqh';
  return {
    position: 'absolute',
    left: `calc(50% + ${+offset.toFixed(2)} * ${unit})`,
    top: `${SILL_SURFACE}%`,
    height: `${size}%`,
    aspectRatio: '1',
    translate: '-50% -100%',
    zIndex,
  };
}

/**
 * Absolute-position CSS for each thing on the sill, left to right. `sizes` are their heights in %
 * of the scene height (buddy ≈ 60, pots ≈ 46): bigger things get more room. The row is centred
 * and squeezes together to fit narrow windows; the thing at `front` (the buddy) is drawn over
 * its neighbours. Art should stand on the bottom of its box.
 */
export function sillLayout(sizes: readonly number[], front = -1): JSX.CSSProperties[] {
  const { offsets, span } = sillRow(sizes);
  return offsets.map((o, i) => slotStyle(o, span, sizes[i]!, i === front ? 2 : 1));
}

/**
 * Absolute-position CSS for thing `index` of `count` on the sill, evenly spaced. `size` is its
 * height in % of the scene height; pass `front` for the one drawn over its neighbours (the buddy).
 * Prefer `sillLayout`, which gives bigger things more room.
 */
export function sillSlotStyle(index: number, count: number, size: number, front = false): JSX.CSSProperties {
  const n = Math.max(1, Math.min(count, SILL_MAX_ITEMS));
  return slotStyle((index - (n - 1) / 2) * SILL_GAP, (n - 1) * SILL_GAP, size, front ? 2 : 1);
}

export function WindowsillScene({ time, children, class: cls, style }: WindowsillSceneProps) {
  const palette = PALETTES[time];
  return (
    <div class={cls ? `${s.scene} ${cls}` : s.scene} style={style}>
      <div class={s.frame} />
      <div class={s.glass}>
        <SkyGradient colors={palette.sky} horizon={0.9} />
        {palette.night && <Stars bottom={640} size={3.2} />}
        <Orb palette={palette} x={ORB_X[time]} y={ORB_Y[time]} size="74%" />
        <DriftingClouds palette={palette} clouds={palette.night ? CLOUDS.slice(1) : CLOUDS} line={7} />
        <OutsideView palette={palette} />
        <div class={palette.night ? `${s.shine} ${s.shineNight}` : s.shine} />
        <div class={s.mullion} />
      </div>
      <Curtain side="left" />
      <Curtain side="right" />
      <div class={s.rod} />
      <div class={s.sill} />
      <div class={s.items}>{children}</div>
    </div>
  );
}
