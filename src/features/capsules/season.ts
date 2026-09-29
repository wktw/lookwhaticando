/**
 * Seasonal editions (DESIGN §7.1): fixed calendar windows that return every year. Only an
 * edition in season stands on the counter, and once its season has visited (since the profile
 * began), its lineup can be ordered at the counter any time: the Memories rule (§7.3).
 * Dates are app-day keys ('YYYY-MM-DD').
 */
import type { MachineDef } from '@/catalog/types';

type MonthDay = { month: number; day: number };

const mdKey = (md: MonthDay) => md.month * 100 + md.day;

function parts(dateKey: string): MonthDay & { time: number } {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  return { month: m, day: d, time: Date.UTC(y, m - 1, d, 12) };
}

/** Whether a month/day falls in the edition's yearly window (inclusive; a window may wrap the new year). */
export function inWindow(machine: MachineDef, md: MonthDay): boolean {
  const s = machine.seasonal;
  if (!s) return true;
  const k = mdKey(md);
  const a = mdKey(s.start);
  const b = mdKey(s.end);
  return a <= b ? k >= a && k <= b : k >= a || k <= b;
}

/** Whether the cabinet is on the counter on this app day. Numbered series always are. */
export function inSeason(machine: MachineDef, dateKey: string): boolean {
  return inWindow(machine, parts(dateKey));
}

const DAY = 86_400_000;

/**
 * Whether the edition's window has touched any day from `from` to `to` (both app-day keys):
 * its lineup can be ordered once that's true. A span of a year or more always has.
 */
export function seasonHasVisited(machine: MachineDef, from: string, to: string): boolean {
  if (!machine.seasonal) return true;
  const start = parts(from).time;
  const end = parts(to).time;
  if (end < start) return false;
  if (end - start >= 366 * DAY) return true;
  for (let t = start; t <= end; t += DAY) {
    const d = new Date(t);
    if (inWindow(machine, { month: d.getUTCMonth() + 1, day: d.getUTCDate() })) return true;
  }
  return false;
}

/** The app-day key of an epoch time, in local time. */
export function dayKeyOf(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
