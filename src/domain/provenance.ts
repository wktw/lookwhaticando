/**
 * Check-in provenance (WP-B4; DESIGN §14.2): two optional facts on a logged day that the 24-stamp
 * cap never drops (logging.ts `MAX_STAMPS_PER_DAY`).
 *
 * - `first`: the day's first live check-in. Habit stacking compares it (stacking.ts).
 * - `done`: the live check-in that made the day count as showing up (the completing tap, or the
 *   tiny version). Blooms Like You reads it as the day's time (signature.ts; DEC-P11: completion,
 *   not last activity).
 *
 * Absent means unknown: never live (backfill, history edits, a paused clock), or an older build's
 * day. A reader then falls back to what the stamps still say (`firstCheckinAt`, `completedAt`),
 * which is what an older build's day was always read from. Both go with the stamps after 120 days
 * (`pruneOldStamps`), which first writes down the one fact a later reader needs: a follower's day
 * checked in before its anchor (`DayLog.beforeAnchor`). No schema change: all three are optional,
 * the validator checks only their type, and older builds carry them along.
 */
import type { DayLog, HabitRule } from '@/state/types';
import { logStatus, showedUp } from './activity';
import { isDayBased } from './schedule';

type Log = Extract<DayLog, { kind: 'log' }>;
type Rule = Pick<HabitRule, 'schedule' | 'target' | 'step' | 'tiny'>;

const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The day's first live check-in: `first`, else the earliest stamp kept; null when never live or unknown. */
export function firstCheckinAt(log: DayLog | undefined): number | null {
  if (log?.kind !== 'log') return null;
  if (isTime(log.first)) return log.first;
  if (!log.at || log.at.length === 0) return null;
  let min = Infinity;
  for (const t of log.at) if (t < min) min = t;
  return Number.isFinite(min) ? min : null;
}

/**
 * The live check-in that made the day count, from the stamps alone, or null when that is
 * ambiguous. It is settled only when every counted tap was live and nothing was taken back:
 * - one live stamp on a flexible day or a tiny-version day (that tap is what counted);
 * - a day-based day with no level and exactly `step` counted per stamp (`at.length × step ===
 *   count`; the plan's "at.length === count" for step 1): the k-th stamp brought the count to
 *   k × step, so the first stamp at which the day shows up is the one, judged as today's
 *   check-ins are (the target), and, for a day that is over and never reached it, by its tiny count.
 * A number-pad entry, a decrease, a tiny-then-full day or a capped list breaks the equality.
 */
function derivedCompletion(log: Log, rule: Rule, dayIsOver: boolean): number | null {
  const at = log.at;
  if (!at || at.length === 0 || !at.every(isTime)) return null;
  if (!showedUp(logStatus(log, rule, dayIsOver))) return null;
  if (log.level === 'tiny' || !isDayBased(rule)) return at.length === 1 && (log.level === 'tiny' || log.count === 1) ? at[0]! : null;
  if (log.level !== undefined) return null;
  const step = Math.max(1, rule.step);
  if (at.length * step !== log.count) return null;
  for (const over of dayIsOver ? [false, true] : [false]) {
    for (let k = 1; k <= at.length; k++) {
      if (showedUp(logStatus({ kind: 'log', count: k * step }, rule, over))) return at[k - 1]!;
    }
  }
  return null;
}

/** The live check-in that made the day count: `done`, else settled from the stamps; null when not counted or unknown. */
export function completedAt(log: DayLog | undefined, rule: Rule, dayIsOver: boolean): number | null {
  if (log?.kind !== 'log' || !showedUp(logStatus(log, rule, dayIsOver))) return null;
  if (isTime(log.done)) return log.done;
  return derivedCompletion(log, rule, dayIsOver);
}

/** A logged day that holds no check-in and no live stamp carries no provenance (every live trace was taken back). */
export function withoutStaleProvenance(log: Log): Log {
  if (log.first === undefined && log.done === undefined) return log;
  if (log.count > 0 || log.level !== undefined || (log.at !== undefined && log.at.length > 0)) return log;
  const { first: _first, done: _done, ...rest } = log;
  return rest;
}
