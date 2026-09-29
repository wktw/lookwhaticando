/**
 * Scene-side helpers for Windowlight (the shared contract lives in `@/art/light`): which way the
 * light points, how far the crescents reach, and the light a scene hands to every child.
 */
import { NIGHT_LIGHT, type Light, type LightFrom, type WindowLight } from '@/art/light';

/** Every light position, in the order the crescent tables are authored. */
export const LIGHT_FROMS: readonly LightFrom[] = ['left', 'top', 'right'];

/**
 * A unit step toward the light in art space (y down). Side light also comes from a little above,
 * so shade sits on the far side and slightly underneath.
 */
export function towardLight(from: LightFrom): readonly [number, number] {
  if (from === 'top') return [0, -1];
  return from === 'left' ? [-0.81, -0.59] : [0.81, -0.59];
}

/** The light every child of a scene gets: the window by day, the lamp from the right after dark. */
export function childLight(light: Light): Light {
  return light.night ? NIGHT_LIGHT : { from: light.from, night: false };
}

/** A window light for the gallery and tests: `sun` 0 (morning) … 1 (evening), or night. */
export function lightAtSun(sun: number, night = false): WindowLight {
  if (night) return { ...NIGHT_LIGHT, sun: 1 };
  const s = Math.max(0, Math.min(1, sun));
  return { from: s < 0.4 ? 'left' : s > 0.6 ? 'right' : 'top', night: false, sun: s };
}
