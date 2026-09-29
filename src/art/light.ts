/**
 * Windowlight (DESIGN §10.4): one light source for the whole scene. By day it is the real window, and the sun
 * crosses it from left (morning) to right (evening). At night a lamp takes over from the right. Every standing
 * shape has a lit side and a hard-edged shade crescent on the side away from `from`, plus a flat contact shadow.
 * Art modules take a `Light` prop; only the scene decides what the light is.
 */
export type LightFrom = 'left' | 'top' | 'right';

export interface Light {
  from: LightFrom;
  /** Lamplight: dark coats get a rim light on the lamp side and the palette warms (DESIGN §10.1). */
  night: boolean;
}

export const DAY_LIGHT: Light = { from: 'left', night: false };
export const NIGHT_LIGHT: Light = { from: 'right', night: true };

/** Where a shade crescent sits for a given light, in the art's own (unflipped) frame. */
export function shadeSide(light: Light, facing: 'left' | 'right' = 'right'): 'left' | 'right' | 'under' {
  if (light.from === 'top') return 'under';
  const away = light.from === 'left' ? 'right' : 'left';
  // Art is drawn facing right; a left-facing pet is mirrored, so its shade must be authored on the other side.
  return facing === 'right' ? away : away === 'left' ? 'right' : 'left';
}

export type Hemisphere = 'north' | 'south';

/** Approximate sunrise / sunset (local clock hours, mid-latitudes, DST-adjusted) by month for the northern hemisphere. */
const SUNRISE = [7.25, 7, 7, 6.5, 6, 5.5, 5.75, 6.25, 6.75, 7.25, 6.75, 7.25];
const SUNSET = [17, 17.5, 19, 19.5, 20, 20.5, 20.5, 20, 19, 18.5, 16.75, 16.5];

export interface WindowLight extends Light {
  /** 0 at sunrise → 1 at sunset (clamped), in 15-minute steps. Drives the sunbeam's position. */
  sun: number;
}

/** The light through the window at `date`, quantized to 15 minutes so the scene re-renders at most 96 times a day. */
export function windowLight(date: Date, hemisphere: Hemisphere = 'north'): WindowLight {
  const month = (date.getMonth() + (hemisphere === 'south' ? 6 : 0)) % 12;
  const hour = date.getHours() + Math.floor(date.getMinutes() / 15) / 4;
  const rise = SUNRISE[month]!;
  const set = SUNSET[month]!;
  if (hour < rise || hour >= set) return { ...NIGHT_LIGHT, sun: hour < rise ? 0 : 1 };
  const sun = Math.round(((hour - rise) / (set - rise)) * 96) / 96;
  const from: LightFrom = sun < 0.4 ? 'left' : sun > 0.6 ? 'right' : 'top';
  return { from, night: false, sun };
}
