/**
 * Time of day and season drive the sky, the room's colours and what the pets get up to
 * (DESIGN §8.2, §9.4, §14.3). The light itself comes from `windowLight` in `@/art/light`.
 */
import { windowLight, type Hemisphere, type WindowLight } from '@/art/light';

export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'night';

export const TIMES_OF_DAY: readonly TimeOfDay[] = ['dawn', 'day', 'golden', 'night'] as const;

/** dawn 5–8 · day 8–17 · golden hour 17–20 · night 20–5 (local clock, ignoring the season). */
export function timeOfDayAt(date: Date): TimeOfDay {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'golden';
  return 'night';
}

/** The sky's mood for a window light: the first and last fifth of daylight are dawn and golden hour. */
export function skyTime(light: WindowLight): TimeOfDay {
  if (light.night) return 'night';
  if (light.sun < 0.2) return 'dawn';
  if (light.sun > 0.8) return 'golden';
  return 'day';
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'] as const;

/** Meteorological seasons, hemisphere-correct (DESIGN §14.3). */
export function seasonAt(date: Date, hemisphere: Hemisphere = 'north'): Season {
  const month = (date.getMonth() + (hemisphere === 'south' ? 6 : 0)) % 12;
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/** Everything the room needs to know about a moment: the light, the sky and the season. */
export interface Moment {
  light: WindowLight;
  time: TimeOfDay;
  season: Season;
  /** Local clock hour with minutes as a fraction (drives the pets' routines). */
  hour: number;
}

export function momentAt(date: Date, hemisphere: Hemisphere = 'north'): Moment {
  const light = windowLight(date, hemisphere);
  return { light, time: skyTime(light), season: seasonAt(date, hemisphere), hour: date.getHours() + date.getMinutes() / 60 };
}
