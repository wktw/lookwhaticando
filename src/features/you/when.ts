/** Dates for You › Data and the profile card, VOICE style: "Sep 20", with the year only when it isn't this one. */
import { formatDateKey, monthDayLabel } from '@/domain/dates';
import type { DateKey } from '@/state/types';

/** A remembered app day is already a date; never reinterpret it as an instant in a new zone. */
export function dayLabel(day: DateKey, now: number = Date.now()): string {
  const year = Number(day.slice(0, 4));
  const label = monthDayLabel(day);
  return year === new Date(now).getFullYear() ? label : `${label}, ${year}`;
}

export function dayOf(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  return dayLabel(formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()), now);
}
