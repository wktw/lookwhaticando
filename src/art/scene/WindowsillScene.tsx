/**
 * The Today header (DESIGN §13.1): a cream wood window with blush curtains tied back, the sky
 * outside following the time of day, and a sill across the bottom where the buddy and the
 * potted plants stand (pass them as `children`, placed with `sillSlotStyle`).
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
  /** The buddy and plants, each placed with `sillSlotStyle`. */
  children?: ComponentChildren;
  class?: string;
  style?: JSX.CSSProperties;
}

const CLOUDS: readonly CloudSpec[] = [
  { x: 18, top: 10, height: 19, duration: 110 },
  { x: 60, top: 30, height: 14, duration: 150 },
];
/** Sun or moon height in the window: high by day and night, low at dawn and golden hour. */
const ORB_Y: Record<TimeOfDay, string> = { dawn: '52%', day: '30%', golden: '52%', night: '30%' };

/** The sill's top surface, as % of the scene height from the top: things stand here. */
export const SILL_SURFACE = 88.5;
/** The sill fits up to this many things (the buddy plus five pots). */
export const SILL_MAX_ITEMS = 6;
/** Preferred distance between neighbours, in % of the scene height. */
const SILL_GAP = 46;
/** Share of the width the row may use before it squeezes together. */
const SILL_SPAN = 76;

/**
 * Absolute-position CSS for thing `index` of `count` on the sill. The row is centred, spaced
 * by the scene height, and squeezed to fit narrow windows. `size` is the thing's height in %
 * of the scene height (buddy ≈ 62, pots ≈ 50); art should stand on the bottom of its box.
 */
export function sillSlotStyle(index: number, count: number, size: number): JSX.CSSProperties {
  const n = Math.max(1, Math.min(count, SILL_MAX_ITEMS));
  const offset = index - (n - 1) / 2;
  const gap = n > 1 ? `min(${SILL_GAP}cqh, ${(SILL_SPAN / (n - 1)).toFixed(2)}cqw)` : '0px';
  return {
    position: 'absolute',
    left: `calc(50% + ${offset} * ${gap})`,
    top: `${SILL_SURFACE}%`,
    height: `${size}%`,
    aspectRatio: '1',
    translate: '-50% -100%',
  };
}

export function WindowsillScene({ time, children, class: cls, style }: WindowsillSceneProps) {
  const palette = PALETTES[time];
  return (
    <div class={cls ? `${s.scene} ${cls}` : s.scene} style={style}>
      <div class={s.frame} />
      <div class={s.glass}>
        <SkyGradient colors={palette.sky} horizon={0.9} />
        {palette.night && <Stars bottom={640} size={3.2} />}
        <Orb palette={palette} x="80%" y={ORB_Y[time]} size="74%" />
        <DriftingClouds palette={palette} clouds={palette.night ? CLOUDS.slice(1) : CLOUDS} line={7} />
        <OutsideView palette={palette} />
        <div class={s.shine} />
      </div>
      <Curtain side="left" />
      <Curtain side="right" />
      <div class={s.rod} />
      <div class={s.sill} />
      <div class={s.items}>{children}</div>
    </div>
  );
}
