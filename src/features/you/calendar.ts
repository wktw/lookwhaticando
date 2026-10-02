/**
 * Watering time (DESIGN §11.1 Reminders, VOICE §20): a daily calendar event per Today block.
 *
 * The times on offer are 15-minute steps inside each block's hours. "Add to calendar" is a real
 * link, opened by her tap. In an installed iPhone or iPad app a generated (blob) file can't be
 * handed to Calendar, so there the link points at a static file shipped in public/cal
 * (scripts/generate-cal.mjs): the same event, with the block's plain description ("Morning
 * plants."). Everywhere else the file is made on the spot and names the block's habits.
 */
import type { WateringSlot } from '@/domain/profile';

export const WATERING_SLOTS: readonly WateringSlot[] = ['morning', 'midday', 'evening'];

/** Each block's hours for its watering time, [first, last] in minutes after midnight. */
export const SLOT_RANGES: Readonly<Record<WateringSlot, readonly [number, number]>> = {
  morning: [5 * 60, 11 * 60 + 45],
  midday: [11 * 60, 16 * 60 + 45],
  evening: [16 * 60, 23 * 60 + 45],
};


const pad2 = (n: number) => String(n).padStart(2, '0');

export const hhmm = (minutes: number): string => `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;

/** Every time on offer for a block ('HH:MM', 15-minute steps). */
export function slotTimes(slot: WateringSlot): string[] {
  const [a, b] = SLOT_RANGES[slot];
  const out: string[] = [];
  for (let m = a; m <= b; m += 15) out.push(hhmm(m));
  return out;
}

/** VOICE §1 times: "7 am", "7:30 am", "12 pm" (no ":00"). */
export function clockLabel(time: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return time;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${min ? `:${pad2(min)}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

/** Minutes after midnight as a clock label ("3 am"): the day-start options. */
export const minutesLabel = (minutes: number): string => clockLabel(hhmm(minutes));

/** The static calendar file for a block and time, relative to the app ("cal/morning-0730.ics"). */
export function staticCalPath(slot: WateringSlot, time: string): string {
  return `cal/${slot}-${time.replace(':', '')}.ics`;
}

export { isAppleTouch, wantsStaticCal } from '@/platform/web/environment';
