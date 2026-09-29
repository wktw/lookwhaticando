/**
 * Consistency = achieved occurrences ÷ expected occurrences over a window, where nothing that has
 * not had a chance to happen yet counts against you (DESIGN §5.3 as amended by §13.3).
 *
 * - Day-based: every scheduled day ≤ today counts (see activity.ts); today only once done.
 * - Flexible: whole periods count (see periods.ts), attributed to the window containing their
 *   **last day**, even while current (a week spanning Sep/Oct belongs to October).
 *   `trailing` windows (rolling "last 30 days") also include the current period (§5.3).
 * - Percentages are shown only once a window has ≥ 10 expected occurrences ("4 of 4 so far").
 * - Month-to-date is compared with the same elapsed span of last month, evaluated as of that day.
 *
 * Every result is structured data (numbers + units). English helpers are provided for convenience,
 * but the UI owns the copy (never "down", never red).
 */
import type { AppState, DateKey, Habit, Weekday } from '@/state/types';
import {
  addDays,
  daysInRange,
  endOfWeek,
  firstDayOfMonthIndex,
  lastDayOfMonthIndex,
  maxDateKey,
  minDateKey,
  monthFromIndex,
  monthIndex,
  parseDateKey,
  startOfWeek,
  weekdaysLabel,
  type MonthKey,
  type WeekStart,
} from './dates';
import { EMPTY_LOGS, dayEvaluations, evaluateDay, inLifetime, showedUp, type EvalContext, type HabitLogs, type TrackingContext } from './activity';
import { periodEvaluations, type PeriodEvaluation } from './periods';
import { rhythmSpanAt, ruleAt } from './rules';
import { everyOf, isDayBased, scheduledWeekdays } from './schedule';

/* ------------------------------------------------------------------ */
/* Tallies                                                             */
/* ------------------------------------------------------------------ */

export interface Tally {
  achieved: number;
  expected: number;
  /** Achieved occurrences that were the tiny version ("26 of 30 days · 8 tiny"). */
  tiny: number;
}

export const EMPTY_TALLY: Readonly<Tally> = Object.freeze({ achieved: 0, expected: 0, tiny: 0 });

export function addTally(a: Tally, b: Tally): Tally {
  return { achieved: a.achieved + b.achieved, expected: a.expected + b.expected, tiny: a.tiny + b.tiny };
}

/** Percentages stay hidden below this many expected occurrences (DESIGN §13.3). */
export const MIN_EXPECTED_FOR_PCT = 10;

/** achieved ÷ expected, or null when nothing was expected (show "—", never "0%"). */
export function ratio(t: Tally): number | null {
  return t.expected > 0 ? t.achieved / t.expected : null;
}

/** Whole percent (0–100), or null when nothing was expected. */
export function percent(t: Tally): number | null {
  const r = ratio(t);
  return r === null ? null : Math.round(r * 100);
}

/** True once the window has enough expected occurrences to show a percentage. */
export function isPctReady(t: Tally): boolean {
  return t.expected >= MIN_EXPECTED_FOR_PCT;
}

/* ------------------------------------------------------------------ */
/* Windows                                                             */
/* ------------------------------------------------------------------ */

/**
 * 'calendar': a flexible period belongs to the window containing its last day (weeks, months).
 * 'trailing': as calendar, plus the current period when today is inside the window (rolling windows).
 */
export type Attribution = 'calendar' | 'trailing';

export interface StatWindow {
  start: DateKey;
  end: DateKey;
  attribution: Attribution;
}

/** The calendar week containing `date` ("6 / 7 this week"). */
export function weekWindow(date: DateKey, weekStart: WeekStart): StatWindow {
  return { start: startOfWeek(date, weekStart), end: endOfWeek(date, weekStart), attribution: 'calendar' };
}

/** A calendar month, from a MonthKey or any date in it. */
export function monthWindow(month: MonthKey | DateKey): StatWindow {
  const i = monthIndex(month);
  return { start: firstDayOfMonthIndex(i), end: lastDayOfMonthIndex(i), attribution: 'calendar' };
}

/** The last `days` days ending today, inclusive (rolling 30 = trailingWindow(today, 30)). */
export function trailingWindow(today: DateKey, days: number): StatWindow {
  return { start: addDays(today, -(days - 1)), end: today, attribution: 'trailing' };
}

/** Whether a flexible period counts toward a window (see Attribution). */
export function includesPeriod(w: StatWindow, p: Pick<PeriodEvaluation, 'state' | 'to'>, today: DateKey): boolean {
  if (p.state === 'future') return false;
  if (p.to >= w.start && p.to <= w.end) return true;
  return w.attribution === 'trailing' && p.state === 'current' && today >= w.start && today <= w.end;
}

/* ------------------------------------------------------------------ */
/* Tracking snapshot                                                   */
/* ------------------------------------------------------------------ */

/** The slice of AppState the tracking math reads. */
export interface Tracking extends TrackingContext {
  readonly habits: readonly Habit[];
  readonly logs: Readonly<Record<string, HabitLogs | undefined>>;
}

export function trackingOf(state: Pick<AppState, 'habits' | 'logs' | 'offDays' | 'settings'>): Tracking {
  return { habits: state.habits, logs: state.logs, offDays: state.offDays, weekStart: state.settings.weekStart };
}

export function evalContext(t: TrackingContext, today: DateKey): EvalContext {
  return { weekStart: t.weekStart, offDays: t.offDays, today };
}

export function logsFor(t: Pick<Tracking, 'logs'>, habitId: string): HabitLogs {
  return t.logs[habitId] ?? EMPTY_LOGS;
}

/* ------------------------------------------------------------------ */
/* Per-habit and aggregate consistency                                 */
/* ------------------------------------------------------------------ */

/** One habit's achieved / expected occurrences in a window, as of `ctx.today`. */
export function habitTally(habit: Habit, logs: HabitLogs, w: StatWindow, ctx: EvalContext): Tally {
  let achieved = 0;
  let expected = 0;
  let tiny = 0;
  for (const ev of dayEvaluations(habit, logs, w.start, w.end, ctx)) {
    if (ev.outcome === 'achieved') {
      achieved++;
      expected++;
      if (ev.tiny) tiny++;
    } else if (ev.outcome === 'missed') {
      expected++;
    }
  }
  for (const pe of periodEvaluations(habit, logs, w.start, w.end, ctx)) {
    if (pe.skipped || !includesPeriod(w, pe, ctx.today)) continue;
    achieved += pe.achieved;
    expected += pe.expected;
    tiny += pe.tinyAchieved;
  }
  return { achieved, expected, tiny };
}

export interface AggregateTally {
  /** Σachieved ÷ Σexpected across the included habits (occurrence-weighted). */
  total: Tally;
  byHabit: Record<string, Tally>;
}

/** Aggregate consistency (archived habits keep contributing their history unless filtered out). */
export function aggregateTally(t: Tracking, w: StatWindow, today: DateKey, include: (h: Habit) => boolean = () => true): AggregateTally {
  const ctx = evalContext(t, today);
  let total: Tally = { ...EMPTY_TALLY };
  const byHabit: Record<string, Tally> = {};
  for (const h of t.habits) {
    if (!include(h)) continue;
    const tally = habitTally(h, logsFor(t, h.id), w, ctx);
    byHabit[h.id] = tally;
    total = addTally(total, tally);
  }
  return { total, byHabit };
}

/* ------------------------------------------------------------------ */
/* Month-to-date vs the same span of last month; monthly series        */
/* ------------------------------------------------------------------ */

export interface MonthComparison {
  current: { month: MonthKey; tally: Tally };
  /** Last month, evaluated as of the same day of the month ("vs Sep 1–12"). */
  previous: { month: MonthKey; start: DateKey; asOf: DateKey; tally: Tally };
  /** Whole-point difference of the displayed percentages; null unless both have ≥ 10 expected. */
  deltaPts: number | null;
}

/**
 * Month-to-date compared with the same elapsed span of last month (DESIGN §13.3). Last month is
 * evaluated *as of* its matching day (clamped to its length: Mar 31 → Feb 28/29), so both sides
 * see the same rules for today-pending days and current periods.
 */
export function monthToDateComparison(t: Tracking, today: DateKey, include?: (h: Habit) => boolean): MonthComparison {
  const cur = monthIndex(today);
  const currentTally = aggregateTally(t, monthWindow(today), today, include).total;
  const start = firstDayOfMonthIndex(cur - 1);
  const asOf = minDateKey(addDays(start, parseDateKey(today).day - 1), lastDayOfMonthIndex(cur - 1));
  const previousTally = aggregateTally(t, monthWindow(start), asOf, include).total;
  const both = isPctReady(currentTally) && isPctReady(previousTally);
  return {
    current: { month: monthFromIndex(cur), tally: currentTally },
    previous: { month: monthFromIndex(cur - 1), start, asOf, tally: previousTally },
    deltaPts: both ? percent(currentTally)! - percent(previousTally)! : null,
  };
}

export interface MonthPoint {
  month: MonthKey;
  tally: Tally;
  /** Whole percent, or null when nothing was expected. */
  percent: number | null;
  /** ≥ 10 expected: the percentage may be shown. */
  ready: boolean;
  /** The current month so far (month-to-date); every other point is a closed month. */
  current: boolean;
}

/**
 * Recent months, oldest first: `months` closed months, then (optionally) the current month-to-date
 * flagged `current` ("81% → 87% → 91%"). Whole months are compared only once they close.
 */
export function monthlySeries(
  t: Tracking,
  today: DateKey,
  opts: { months?: number; includeCurrent?: boolean; include?: (h: Habit) => boolean } = {},
): MonthPoint[] {
  const { months = 6, includeCurrent = true, include } = opts;
  const cur = monthIndex(today);
  const out: MonthPoint[] = [];
  const point = (i: number, current: boolean): MonthPoint => {
    const tally = aggregateTally(t, monthWindow(monthFromIndex(i)), today, include).total;
    return { month: monthFromIndex(i), tally, percent: percent(tally), ready: isPctReady(tally), current };
  };
  for (let i = cur - months; i < cur; i++) out.push(point(i, false));
  if (includeCurrent) out.push(point(cur, true));
  return out;
}

/* ------------------------------------------------------------------ */
/* Per-habit headline phrases (DESIGN §13.3)                           */
/* ------------------------------------------------------------------ */

/** Days looked back by the day-based phrases. */
export const PHRASE_DAYS = 30;
/** Periods looked back by the flexible phrases. */
export const PHRASE_WEEKS = 4;
export const PHRASE_MONTHS = 6;

export type HabitPhrase =
  /** daily: "N of the last 30 days" (spanDays < 30 while the rhythm is younger). */
  | { kind: 'days'; achieved: number; expected: number; tiny: number; spanDays: number }
  /** certain days: "N of your last K Mon/Wed/Fri" (K = expected occurrences in the last 30 days). */
  | { kind: 'weekdays'; achieved: number; expected: number; tiny: number; spanDays: number; days: Weekday[] }
  /** weekly: "N of the last 4 weeks"; monthly: "N of the last 6 months". `of` counts the periods looked at. */
  | { kind: 'weeks' | 'months'; met: number; of: number; span: number; every: number };

/**
 * The habit card's consistency phrase for the rhythm in effect today. Looks back no further than
 * the current rhythm (a kind change starts a "New rhythm"). Day-based phrases look at the last 30
 * days ending today once today counts (done or tiny), otherwise ending yesterday: a pending today
 * never costs a day of the span ("30 of the last 30 days" every morning for someone who never
 * misses; §5.3 "Today is never held against you"; upstream §13.11 "Rolling windows end today if
 * today already counts, else yesterday"). Flexible phrases look at the latest periods that count:
 * transparent periods (nothing expected) are skipped, and the current period is included only once
 * met.
 */
export function habitPhrase(habit: Habit, logs: HabitLogs, ctx: EvalContext): HabitPhrase | null {
  const T = ctx.today;
  if (T < habit.startedOn) return null;
  const rule = ruleAt(habit, T);
  const spanStart = maxDateKey(rhythmSpanAt(habit, T).start ?? habit.startedOn, habit.startedOn);
  if (isDayBased(rule)) {
    const end = evaluateDay(habit, logs, T, ctx).outcome === 'achieved' ? T : addDays(T, -1);
    const start = maxDateKey(addDays(end, -(PHRASE_DAYS - 1)), spanStart);
    const tally = start <= end ? habitTally(habit, logs, { start, end, attribution: 'trailing' }, ctx) : EMPTY_TALLY;
    const base = { achieved: tally.achieved, expected: tally.expected, tiny: tally.tiny, spanDays: start <= end ? daysInRange(start, end) : 0 };
    return rule.schedule.kind === 'daily'
      ? { kind: 'days', ...base }
      : { kind: 'weekdays', ...base, days: [...scheduledWeekdays(rule)].sort((a, b) => a - b) };
  }
  const monthly = rule.schedule.kind === 'monthly';
  const span = monthly ? PHRASE_MONTHS : PHRASE_WEEKS;
  let met = 0;
  let of = 0;
  const periods = periodEvaluations(habit, logs, spanStart, T, ctx);
  for (let i = periods.length - 1; i >= 0 && of < span; i--) {
    const p = periods[i]!;
    if (p.skipped || (p.state === 'current' && !p.met)) continue;
    of++;
    if (p.met) met++;
  }
  return { kind: monthly ? 'months' : 'weeks', met, of, span, every: everyOf(rule) };
}

const WEEK_UNITS: Record<number, [string, string]> = {
  1: ['week', 'weeks'],
  2: ['fortnight', 'fortnights'],
  3: ['3-week stretch', '3-week stretches'],
  4: ['4-week stretch', '4-week stretches'],
};
const MONTH_UNITS: Record<number, [string, string]> = {
  1: ['month', 'months'],
  2: ['2-month stretch', '2-month stretches'],
  3: ['quarter', 'quarters'],
  6: ['half-year', 'half-years'],
  12: ['year', 'years'],
};

/** Plain-English rendering of a phrase (the UI may use its own copy from the same numbers). */
export function formatHabitPhrase(p: HabitPhrase, weekStart: WeekStart): string {
  const tiny = (n: number) => (n > 0 ? ` · ${n} tiny` : '');
  switch (p.kind) {
    case 'days':
      return `${p.achieved} of the last ${p.spanDays} ${p.spanDays === 1 ? 'day' : 'days'}${tiny(p.tiny)}`;
    case 'weekdays':
      return `${p.achieved} of your last ${p.expected} ${weekdaysLabel(p.days, weekStart)}${tiny(p.tiny)}`;
    case 'weeks':
    case 'months': {
      const units = (p.kind === 'weeks' ? WEEK_UNITS : MONTH_UNITS)[p.every] ?? ['period', 'periods'];
      if (p.of === p.span) return `${p.met} of the last ${p.span} ${units[1]}`;
      return `${p.met} of ${p.of} ${p.of === 1 ? units[0] : units[1]} so far`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Graduation offers (DESIGN §13.2 "Tiny version")                     */
/* ------------------------------------------------------------------ */

export const GRADUATION = {
  /** Look-back, and the time the current rule must have been in effect. */
  days: 28,
  /** Offer "Ready to grow?" at or above this rate… */
  growAt: 0.85,
  /** …when at most this share of the check-ins were the tiny version. */
  maxTinyShare: 0.25,
  /** Offer "Make it tinier?" below this rate. */
  tinierBelow: 0.4,
  /** Minimum evidence (a 1×/week habit has 4 in 28 days). */
  minExpected: 4,
} as const;

/**
 * What the habit detail may *offer* (never automatic): 'grow' at ≥ 85% over the last 28 days with
 * ≤ 25% tiny, 'tinier' below 40%, otherwise null. Only once the current rule has been in effect for
 * the whole 28 days, so accepting an offer (a new rule from tomorrow) is not followed by the same
 * offer the next day.
 */
export function graduationOffer(habit: Habit, logs: HabitLogs, ctx: EvalContext): 'grow' | 'tinier' | null {
  const T = ctx.today;
  if (habit.archivedOn !== undefined && habit.archivedOn < T) return null;
  const start = addDays(T, -(GRADUATION.days - 1));
  if (habit.startedOn > start || ruleAt(habit, T).from > start) return null;
  const t = habitTally(habit, logs, { start, end: T, attribution: 'trailing' }, ctx);
  if (t.expected < GRADUATION.minExpected) return null;
  const r = t.achieved / t.expected;
  if (r >= GRADUATION.growAt && t.tiny <= GRADUATION.maxTinyShare * t.achieved) return 'grow';
  if (r < GRADUATION.tinierBelow) return 'tinier';
  return null;
}

/* ------------------------------------------------------------------ */
/* One day across habits (calendar circles, quilt patches)             */
/* ------------------------------------------------------------------ */

export interface DayCompletion {
  /** Day-based occurrences that count that day (achieved + missed + pending). */
  due: number;
  /** Achieved day-based occurrences (tiny included). */
  done: number;
  tiny: number;
  /** Today's scheduled day-based habits not done yet. */
  pending: number;
  /** Check-ins on flexible habits that day. */
  flexibleCheckins: number;
}

/** How a single day went across all habits, as of `today` (future days are empty). */
export function dayCompletion(t: Tracking, date: DateKey, today: DateKey): DayCompletion {
  const ctx = evalContext(t, today);
  const out: DayCompletion = { due: 0, done: 0, tiny: 0, pending: 0, flexibleCheckins: 0 };
  if (date > today) return out;
  for (const h of t.habits) {
    if (!inLifetime(h, date)) continue;
    const ev = evaluateDay(h, logsFor(t, h.id), date, ctx);
    if (!ev.dayBased) {
      if (showedUp(ev.status)) out.flexibleCheckins++;
      continue;
    }
    if (ev.outcome === 'achieved') {
      out.due++;
      out.done++;
      if (ev.tiny) out.tiny++;
    } else if (ev.outcome === 'missed') out.due++;
    else if (ev.outcome === 'pending') {
      out.due++;
      out.pending++;
    }
  }
  return out;
}
