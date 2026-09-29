/**
 * Pauses ("vacation mode", DESIGN §5.2 + v1 §13.2 "Rest, off days, pauses"): inclusive date ranges,
 * open-ended while `end` is undefined. Paused days are transparent to consistency and streaks, and
 * for flexible habits they shrink the period's goal.
 *
 * Rules implemented here:
 * - Pauses may start today or later ("Back on Oct 6"); overlapping or touching pauses merge.
 * - Resume sets end = yesterday on the pause covering today (a pause that starts today disappears).
 * - Restoring an archived habit adds a pause covering the archived stretch.
 */
import type { DateKey, Pause } from '@/state/types';
import { addDays } from './dates';

const covers = (p: Pause, date: DateKey): boolean => p.start <= date && (p.end === undefined || date <= p.end);

/** True when any pause covers `date` (works on unmerged lists too). */
export function isPausedOn(pauses: readonly Pause[], date: DateKey): boolean {
  for (const p of pauses) if (covers(p, date)) return true;
  return false;
}

/** The pause covering `date`, if any (the widest one when unmerged pauses overlap). */
export function pauseCovering(pauses: readonly Pause[], date: DateKey): Pause | undefined {
  return mergePauses(pauses).find((p) => covers(p, date));
}

/**
 * Canonical pause list: sorted by start, invalid ranges (end < start) dropped, and overlapping or
 * back-to-back ranges merged into one. An open-ended pause absorbs every later one.
 */
export function mergePauses(pauses: readonly Pause[]): Pause[] {
  const sorted = pauses.filter((p) => p.end === undefined || p.end >= p.start).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const out: Pause[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && (last.end === undefined || p.start <= addDays(last.end, 1))) {
      if (last.end !== undefined) {
        if (p.end === undefined) delete last.end;
        else if (p.end > last.end) last.end = p.end;
      }
    } else {
      out.push(p.end === undefined ? { start: p.start } : { start: p.start, end: p.end });
    }
  }
  return out;
}

/** Adds a pause from `start` (inclusive) until `end` (inclusive, or open-ended), merging overlaps. */
export function addPause(pauses: readonly Pause[], start: DateKey, end?: DateKey): Pause[] {
  return mergePauses([...pauses, end === undefined ? { start } : { start, end }]);
}

/**
 * Resume on `today` (DESIGN v1 §13.2): the pause covering today now ends yesterday, and one that only
 * started today is removed. Past and future pauses are kept.
 */
export function resumePauses(pauses: readonly Pause[], today: DateKey): Pause[] {
  const yesterday = addDays(today, -1);
  const out: Pause[] = [];
  for (const p of mergePauses(pauses)) {
    if (!covers(p, today)) out.push(p);
    else if (p.start <= yesterday) out.push({ start: p.start, end: yesterday });
  }
  return out;
}

/**
 * When a paused habit comes back, as seen on `today`: the first day after the covering pause
 * ("back Oct 6"), null while the pause is open-ended, undefined when not paused today.
 */
export function pauseReturnDay(pauses: readonly Pause[], today: DateKey): DateKey | null | undefined {
  const p = pauseCovering(pauses, today);
  if (!p) return undefined;
  return p.end === undefined ? null : addDays(p.end, 1);
}

/**
 * The pause that covers the stretch a habit spent archived, restored on `restoreDay` (DESIGN v1 §13.2).
 * `archivedOn` itself was still an active day, so the stretch is (archivedOn, restoreDay); null when empty.
 */
export function archivedStretchPause(archivedOn: DateKey, restoreDay: DateKey): Pause | null {
  const start = addDays(archivedOn, 1);
  const end = addDays(restoreDay, -1);
  return start <= end ? { start, end } : null;
}
