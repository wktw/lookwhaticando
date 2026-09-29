/** Dates for You › Data and the profile card, VOICE style: "Sep 20", with the year only when it isn't this one. */
import { formatDateKey, monthDayLabel } from '@/domain/dates';

export function dayOf(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const label = monthDayLabel(formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  return d.getFullYear() === new Date(now).getFullYear() ? label : `${label}, ${d.getFullYear()}`;
}
