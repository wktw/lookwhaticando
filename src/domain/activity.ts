/**
 * Which days count, and how a day's log reads (DESIGN §5.3 "Active days", §13.2 "Rest, off days,
 * pauses" and "Tiny version", §13.3 day-based math).
 *
 * A day is **active** for a habit when it is inside the habit's lifetime (startedOn ≤ d ≤
 * archivedOn), not paused, not a global off day, and not an *allowed* rest. Inactive days are
 * transparent: they never count against the user. A rest beyond the weekly allowance still shows
 * the moon, but the day stays active and counts as not done.
 *
 * Day-based occurrence outcome for a scheduled day d evaluated on today T:
 * - done or tiny                      → achieved (counts 1/1, even on a paused or off day: showing up
 *                                        always counts; "done beats off")
 * - inactive (paused / off / allowed rest) → transparent
 * - d = T and not done                → pending (today is never held against you)
 * - otherwise (incl. over-allowance rest, partial) → missed (counts 0/1)
 */
import type { DateKey, DayLog, Habit, HabitRule } from '@/state/types';
import { addDays, eachDay, isDateKey, maxDateKey, minDateKey, monthKey, startOfWeek, type WeekStart } from './dates';
import { isPausedOn } from './pauses';
import { ruleAt } from './rules';
import { effectiveTarget, isDayBased, isScheduledDate, restAllowancePerWeek } from './schedule';

/** One habit's logs, by date. */
export type HabitLogs = Readonly<Record<DateKey, DayLog>>;

/** Account-wide inputs that shape every habit's math. */
export interface TrackingContext {
  readonly weekStart: WeekStart;
  /** Global "Take today off" days: transparent for every habit. */
  readonly offDays: Readonly<Record<DateKey, true>>;
}

/** A TrackingContext evaluated as of an app day. Check-ins after `today` are ignored. */
export interface EvalContext extends TrackingContext {
  readonly today: DateKey;
}

type HabitDays = Pick<Habit, 'rules' | 'startedOn' | 'archivedOn' | 'pauses'>;

export const EMPTY_LOGS: HabitLogs = Object.freeze({});

/* ------------------------------------------------------------------ */
/* Lifetime & activity                                                 */
/* ------------------------------------------------------------------ */

/** startedOn ≤ date ≤ archivedOn (the archive day itself still counts, DESIGN §5.3). */
export function inLifetime(habit: Pick<Habit, 'startedOn' | 'archivedOn'>, date: DateKey): boolean {
  return date >= habit.startedOn && (habit.archivedOn === undefined || date <= habit.archivedOn);
}

/** Last day of the lifetime that is ≤ `until`, or null when the habit has not started by then. */
export function lifetimeEnd(habit: Pick<Habit, 'startedOn' | 'archivedOn'>, until: DateKey): DateKey | null {
  const end = habit.archivedOn === undefined ? until : minDateKey(habit.archivedOn, until);
  return end >= habit.startedOn ? end : null;
}

export type InactiveReason = 'before-start' | 'archived' | 'paused' | 'off' | 'rest';

/**
 * Whether a rest log on `date` takes part in the weekly allowance: it must sit on a scheduled,
 * in-lifetime, not paused, not off day of a day-based rule. Rests anywhere else change nothing
 * (and flexible habits have no rest days at all).
 */
function restCounts(habit: HabitDays, logs: HabitLogs, date: DateKey, ctx: TrackingContext): boolean {
  return (
    logs[date]?.kind === 'rest' &&
    inLifetime(habit, date) &&
    !isPausedOn(habit.pauses, date) &&
    ctx.offDays[date] !== true &&
    isScheduledDate(ruleAt(habit, date), date)
  );
}

/**
 * How a rest day stands against the weekly allowance (DESIGN §13.2): max(1, floor(scheduled days
 * per week / 3)), counted per calendar week of the rest (user's week start), in date order, using
 * the rule in effect on the rest day. 'allowed' rests are fully transparent; 'over' rests count as
 * not done. null when `date` has no rest that matters.
 */
export function restStanding(habit: HabitDays, logs: HabitLogs, date: DateKey, ctx: TrackingContext): 'allowed' | 'over' | null {
  if (!restCounts(habit, logs, date, ctx)) return null;
  const allowance = restAllowancePerWeek(ruleAt(habit, date));
  let used = 0;
  for (let d = startOfWeek(date, ctx.weekStart); d <= date; d = addDays(d, 1)) {
    if (restCounts(habit, logs, d, ctx)) used++;
  }
  return used <= allowance ? 'allowed' : 'over';
}

/** Why `date` is transparent for the habit, or null when it is an active day. */
export function inactiveReason(habit: HabitDays, logs: HabitLogs, date: DateKey, ctx: TrackingContext): InactiveReason | null {
  if (date < habit.startedOn) return 'before-start';
  if (habit.archivedOn !== undefined && date > habit.archivedOn) return 'archived';
  if (isPausedOn(habit.pauses, date)) return 'paused';
  if (ctx.offDays[date] === true) return 'off';
  if (restStanding(habit, logs, date, ctx) === 'allowed') return 'rest';
  return null;
}

/** Active day predicate (DESIGN §5.3 as amended by §13.2). */
export function isActiveDay(habit: HabitDays, logs: HabitLogs, date: DateKey, ctx: TrackingContext): boolean {
  return inactiveReason(habit, logs, date, ctx) === null;
}

/**
 * Active for a flexible period's goal: in lifetime, not paused, not off. (Rests do not apply to
 * flexible habits.)
 */
export function isFlexActiveDay(habit: Pick<Habit, 'startedOn' | 'archivedOn' | 'pauses'>, date: DateKey, ctx: TrackingContext): boolean {
  return inLifetime(habit, date) && !isPausedOn(habit.pauses, date) && ctx.offDays[date] !== true;
}

/* ------------------------------------------------------------------ */
/* Date windows for logging (DESIGN §5.2, §13.2)                       */
/* ------------------------------------------------------------------ */

/** Days back from today that the Today week strip can log, with rewards (today−6 … today). */
export const BACKFILL_DAYS = 6;
/** How far ahead a rest day can be planned. */
export const REST_AHEAD_DAYS = 14;
/** Global "Take today off" days allowed per calendar month. */
export const OFF_DAYS_PER_MONTH = 4;

/*
 * Day keys are compared as strings, so each check below first insists on a real 'YYYY-MM-DD' day:
 * '2026-09-28x' sorts between two real days and would otherwise pass as one.
 */

/** Inside the rewarding backfill window (today−6 … today). Older edits are history-only. */
export function isInBackfillWindow(date: DateKey, today: DateKey): boolean {
  return isDateKey(date) && date <= today && date >= addDays(today, -BACKFILL_DAYS);
}

/** A real day, not in the future: future days can never be logged. */
export function canLogOn(date: DateKey, today: DateKey): boolean {
  return isDateKey(date) && date <= today;
}

/** Rests can be set within the backfill window, today, or up to 14 days ahead. */
export function canSetRest(date: DateKey, today: DateKey): boolean {
  return isDateKey(date) && date >= addDays(today, -BACKFILL_DAYS) && date <= addDays(today, REST_AHEAD_DAYS);
}

/** Off days already taken in the calendar month containing `date`. */
export function offDaysUsedInMonth(offDays: Readonly<Record<DateKey, true>>, date: DateKey): number {
  const month = monthKey(date);
  let n = 0;
  for (const d of Object.keys(offDays)) if (offDays[d] === true && d.startsWith(month)) n++;
  return n;
}

/** Off days still available in the month containing `date` (never negative). */
export function offDaysRemaining(offDays: Readonly<Record<DateKey, true>>, date: DateKey): number {
  return Math.max(0, OFF_DAYS_PER_MONTH - offDaysUsedInMonth(offDays, date));
}

/* ------------------------------------------------------------------ */
/* Log status                                                          */
/* ------------------------------------------------------------------ */

/**
 * - done: count ≥ target (flexible: count ≥ 1)
 * - tiny: logged as the tiny version, or (once the day is over) a count habit that reached
 *   `tiny.count` but not the target (DESIGN §13.2). Counts as done for streaks and consistency.
 * - partial: some progress, not complete
 * - none: nothing logged
 * - rest: a rest day
 */
export type LogStatus = 'done' | 'tiny' | 'partial' | 'none' | 'rest';

/**
 * Reads a day's log against the rule in effect that day. `dayIsOver` (date < today) enables the
 * day-end tiny rule; today stays 'partial' so there is still time to reach the full target.
 * An explicit `level: 'tiny'` wins over the count (the store clears it on a full completion).
 */
export function logStatus(log: DayLog | undefined, rule: Pick<HabitRule, 'schedule' | 'target' | 'tiny'>, dayIsOver: boolean): LogStatus {
  if (!log) return 'none';
  if (log.kind === 'rest') return 'rest';
  if (log.level === 'tiny') return 'tiny';
  const count = Number.isFinite(log.count) ? log.count : 0;
  if (count >= effectiveTarget(rule)) return 'done';
  const tinyCount = rule.tiny?.count;
  if (dayIsOver && tinyCount !== undefined && tinyCount >= 1 && count >= tinyCount) return 'tiny';
  return count > 0 ? 'partial' : 'none';
}

/** "Showed up": done or tiny. */
export function showedUp(status: LogStatus): boolean {
  return status === 'done' || status === 'tiny';
}

/* ------------------------------------------------------------------ */
/* Day-based occurrences                                               */
/* ------------------------------------------------------------------ */

/**
 * How a day counts in day-based consistency and streak math (see module doc). 'upcoming' is a
 * scheduled future day; 'transparent' covers unscheduled, inactive, out-of-lifetime and
 * flexible-rule days.
 */
export type DayOutcome = 'achieved' | 'missed' | 'pending' | 'transparent' | 'upcoming';

export interface DayEvaluation {
  date: DateKey;
  rule: HabitRule;
  /** The rule in effect is daily/days. Flexible days are evaluated per period (see periods.ts). */
  dayBased: boolean;
  /** Day-based rule with an occurrence on this weekday. */
  scheduled: boolean;
  status: LogStatus;
  inactive: InactiveReason | null;
  outcome: DayOutcome;
  /** Achieved via the tiny version. */
  tiny: boolean;
}

/** Evaluates one day for a habit as of `ctx.today`. */
export function evaluateDay(habit: HabitDays, logs: HabitLogs, date: DateKey, ctx: EvalContext): DayEvaluation {
  const rule = ruleAt(habit, date);
  const dayBased = isDayBased(rule);
  const scheduled = dayBased && isScheduledDate(rule, date);
  const status = logStatus(logs[date], rule, date < ctx.today);
  const inactive = inactiveReason(habit, logs, date, ctx);
  let outcome: DayOutcome;
  if (!scheduled || inactive === 'before-start' || inactive === 'archived') outcome = 'transparent';
  else if (date > ctx.today) outcome = 'upcoming';
  else if (showedUp(status)) outcome = 'achieved';
  else if (inactive !== null) outcome = 'transparent';
  else if (date === ctx.today) outcome = 'pending';
  else outcome = 'missed';
  return { date, rule, dayBased, scheduled, status, inactive, outcome, tiny: outcome === 'achieved' && status === 'tiny' };
}

/**
 * Day-based evaluations for every day in [start, min(end, today)] within the habit's lifetime whose
 * rule is day-based (flexible days are skipped: they count per period).
 */
export function dayEvaluations(habit: HabitDays, logs: HabitLogs, start: DateKey, end: DateKey, ctx: EvalContext): DayEvaluation[] {
  const last = lifetimeEnd(habit, minDateKey(end, ctx.today));
  if (last === null) return [];
  const out: DayEvaluation[] = [];
  for (const d of eachDay(maxDateKey(start, habit.startedOn), last)) {
    const ev = evaluateDay(habit, logs, d, ctx);
    if (ev.dayBased) out.push(ev);
  }
  return out;
}
