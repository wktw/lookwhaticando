/** Time of day drives the sky, light and palette of every scene (DESIGN §9.4). */
export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'night';

export const TIMES_OF_DAY: readonly TimeOfDay[] = ['dawn', 'day', 'golden', 'night'] as const;

/** dawn 5–8 · day 8–17 · golden hour 17–20 · night 20–5 (local time). */
export function timeOfDayAt(date: Date): TimeOfDay {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'golden';
  return 'night';
}
