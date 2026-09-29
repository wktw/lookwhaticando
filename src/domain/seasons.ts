/**
 * Seasonal machines (DESIGN §6.2 "Seasons", §13.6 "Memories rule").
 *
 * - A season is an inclusive month/day window that recurs every year. A window whose start is after
 *   its end wraps the new year (Snow Globe: Nov 11 – Jan 14). A Feb 29 bound means the last day of
 *   February, so Love Letters runs Jan 15 – Feb 28 in non-leap years.
 * - Availability is judged on the app day, like everything else.
 * - Memories rule: a seasonal item becomes wishable only once its season has *started* on or after
 *   the day the profile was created ("wishable after its first visit"). Standard machines are
 *   always visited.
 */
import { MACHINES, getMachine } from '@/catalog/machines';
import type { MachineDef, MachineId } from '@/catalog/types';
import type { DateKey } from '@/state/types';
import { daysInMonth, formatDateKey, parseDateKey } from './dates';

export interface SeasonWindow {
  start: DateKey;
  end: DateKey;
}

type MonthDay = { month: number; day: number };

function onYear(year: number, md: MonthDay): DateKey {
  return formatDateKey(year, md.month, Math.min(md.day, daysInMonth(year, md.month)));
}

/** The season's window that starts in `year`. */
export function seasonWindowStartingIn(machine: MachineDef, year: number): SeasonWindow | null {
  const s = machine.seasonal;
  if (!s) return null;
  const wraps = s.start.month > s.end.month || (s.start.month === s.end.month && s.start.day > s.end.day);
  return { start: onYear(year, s.start), end: onYear(wraps ? year + 1 : year, s.end) };
}

/** The window containing `date`, if the season is on. */
export function activeWindow(machine: MachineDef, date: DateKey): SeasonWindow | null {
  const { year } = parseDateKey(date);
  for (const y of [year - 1, year]) {
    const w = seasonWindowStartingIn(machine, y);
    if (w && w.start <= date && date <= w.end) return w;
  }
  return null;
}

/** The next window starting after `date`. */
export function nextWindow(machine: MachineDef, date: DateKey): SeasonWindow | null {
  const { year } = parseDateKey(date);
  for (const y of [year, year + 1]) {
    const w = seasonWindowStartingIn(machine, y);
    if (w && w.start > date) return w;
  }
  return null;
}

/** The latest window that started on or before `date`. */
export function lastStartedWindow(machine: MachineDef, date: DateKey): SeasonWindow | null {
  const { year } = parseDateKey(date);
  for (const y of [year, year - 1]) {
    const w = seasonWindowStartingIn(machine, y);
    if (w && w.start <= date) return w;
  }
  return null;
}

export interface Availability {
  available: boolean;
  /** Seasonal and on: the last day of the current window. */
  activeUntil?: DateKey;
  /** Seasonal and off: the next opening day. */
  nextStart?: DateKey;
}

export function machineAvailability(id: MachineId, today: DateKey): Availability {
  const m = getMachine(id);
  if (!m.seasonal) return { available: true };
  const w = activeWindow(m, today);
  if (w) return { available: true, activeUntil: w.end };
  const next = nextWindow(m, today);
  return next ? { available: false, nextStart: next.start } : { available: false };
}

/** Machines that can be pulled on `today`, standard first, in catalog order. */
export function availableMachineIds(today: DateKey): MachineId[] {
  return MACHINES.filter((m) => machineAvailability(m.id, today).available).map((m) => m.id);
}

/** Memories rule: has this machine's season started at least once since `createdOn`? */
export function seasonVisited(id: MachineId, createdOn: DateKey, today: DateKey): boolean {
  const m = getMachine(id);
  if (!m.seasonal) return true;
  const w = lastStartedWindow(m, today);
  return w !== null && w.start >= createdOn;
}
