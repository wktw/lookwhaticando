/**
 * What a schedule *means*, independent of any habit's version history (DESIGN v1 §13.2 "Schedules",
 * "Targets and taps", "Tiny version").
 *
 * - `daily` and `days` are **day-based**: each scheduled day is one occurrence with a count target.
 * - `weekly` and `monthly` are **flexible**: any day works; the goal is `times` check-in days per
 *   period of `every` weeks/months. Periods of a rule are cut on a grid anchored at the start of the
 *   week/month containing the rule's `from` (so every-2-weeks alternates from the week it began).
 */
import type { DateKey, HabitRule, Schedule, Weekday } from '@/state/types';
import {
  addDays,
  diffDays,
  firstDayOfMonthIndex,
  lastDayOfMonthIndex,
  monthIndex,
  startOfMonth,
  startOfWeek,
  weekday,
  type WeekStart,
} from './dates';

export type DayBasedSchedule = Extract<Schedule, { kind: 'daily' | 'days' }>;
export type FlexibleSchedule = Extract<Schedule, { kind: 'weekly' | 'monthly' }>;
/** A rule without its start date: the part a habit edit changes. */
export type RuleContent = Omit<HabitRule, 'from'>;
/**
 * Streak-compatible schedule families. Streaks continue across edits within a rhythm and restart
 * ("New rhythm") across rhythms (DESIGN v1 §13.2).
 */
export type Rhythm = 'day' | 'week' | 'month';

type ScheduleLike = Schedule | { readonly schedule: Schedule };
const scheduleOf = (x: ScheduleLike): Schedule => ('kind' in x ? x : x.schedule);

export const WEEKLY_EVERY = [1, 2, 3, 4] as const;
export const MONTHLY_EVERY = [1, 2, 3, 6, 12] as const;

/** Input limits (DESIGN §5.1 caps per week/month, scaled by `every`; v1 §13.2 target/step ranges). */
export const RULE_LIMITS = {
  targetMin: 1,
  targetMax: 100_000,
  stepMax: 100_000,
  weeklyTimesPerWeek: 7,
  monthlyTimesPerMonth: 10,
} as const;

/* ------------------------------------------------------------------ */
/* Kinds                                                               */
/* ------------------------------------------------------------------ */

/** daily / days: each scheduled day is an occurrence. */
export function isDayBased(x: ScheduleLike): boolean {
  const k = scheduleOf(x).kind;
  return k === 'daily' || k === 'days';
}

/** weekly / monthly: N check-in days per period. */
export function isFlexible(x: ScheduleLike): boolean {
  return !isDayBased(x);
}

export function rhythmOf(x: ScheduleLike): Rhythm {
  const k = scheduleOf(x).kind;
  return k === 'weekly' ? 'week' : k === 'monthly' ? 'month' : 'day';
}

/** Period length multiplier: the schedule's `every` (1 for day-based or malformed values). */
export function everyOf(x: ScheduleLike): number {
  const s = scheduleOf(x);
  if (s.kind === 'weekly') return (WEEKLY_EVERY as readonly number[]).includes(s.every) ? s.every : 1;
  if (s.kind === 'monthly') return (MONTHLY_EVERY as readonly number[]).includes(s.every) ? s.every : 1;
  return 1;
}

/** Weekdays on which a day-based schedule has an occurrence (empty for flexible schedules). */
export function scheduledWeekdays(x: ScheduleLike): ReadonlySet<Weekday> {
  const s = scheduleOf(x);
  if (s.kind === 'daily') return ALL_WEEKDAYS;
  if (s.kind === 'days') return new Set(s.days.filter(isWeekday));
  return NO_WEEKDAYS;
}
const ALL_WEEKDAYS: ReadonlySet<Weekday> = new Set<Weekday>([0, 1, 2, 3, 4, 5, 6]);
const NO_WEEKDAYS: ReadonlySet<Weekday> = new Set<Weekday>();
const isWeekday = (d: unknown): d is Weekday => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6;

/** True when a day-based schedule has an occurrence on `date` (always false for flexible schedules). */
export function isScheduledDate(x: ScheduleLike, date: DateKey): boolean {
  const s = scheduleOf(x);
  if (s.kind === 'daily') return true;
  if (s.kind === 'days') return s.days.includes(weekday(date));
  return false;
}

/** Scheduled days per week: daily 7, days |days|, flexible 0 (no fixed days). */
export function scheduledDaysPerWeek(x: ScheduleLike): number {
  return scheduledWeekdays(x).size;
}

/**
 * Occurrences expected in an average week (DESIGN v1 §13.2): 7 · |days| · times/every ·
 * times×12/52/every. Drives sunshine per occurrence (7 / expectedPerWeek) so every rhythm grows at
 * the same pace when kept faithfully.
 */
export function expectedPerWeek(x: ScheduleLike): number {
  const s = scheduleOf(x);
  switch (s.kind) {
    case 'daily':
      return 7;
    case 'days':
      return scheduledDaysPerWeek(s);
    case 'weekly':
      return s.times / everyOf(s);
    case 'monthly':
      return (s.times * 12) / 52 / everyOf(s);
  }
}

/**
 * Weekly rest allowance (DESIGN v1 §13.2): max(1, floor(scheduledDaysPerWeek / 3)) for day-based
 * habits (daily = 2, Mon/Wed/Fri = 1); flexible habits have no rest days.
 */
export function restAllowancePerWeek(x: ScheduleLike): number {
  return isDayBased(x) ? Math.max(1, Math.floor(scheduledDaysPerWeek(x) / 3)) : 0;
}

/** The count that completes a day: the rule's target for day-based rules, always 1 for flexible ones. */
export function effectiveTarget(rule: Pick<HabitRule, 'schedule' | 'target'>): number {
  return isDayBased(rule) ? Math.max(1, Math.floor(rule.target) || 1) : 1;
}

/* ------------------------------------------------------------------ */
/* Period geometry (flexible schedules)                                */
/* ------------------------------------------------------------------ */

export type PeriodUnit = 'week' | 'month';

/** How a flexible rule cuts time into periods. */
export interface PeriodGrid {
  unit: PeriodUnit;
  every: number;
  /** First day of period #0: the start of the week/month containing the rule's `from`. */
  anchor: DateKey;
}

/** One period on a grid (nominal bounds, inclusive). */
export interface PeriodSlot {
  /** Position relative to the anchor period (negative before it). */
  index: number;
  start: DateKey;
  end: DateKey;
}

/**
 * The grid for a flexible schedule whose rule starts on `from` (DESIGN v1 §13.2: "A period with
 * every > 1 starts at the start of the rule's from period").
 */
export function periodGrid(x: ScheduleLike, from: DateKey, weekStart: WeekStart): PeriodGrid {
  const s = scheduleOf(x);
  if (s.kind === 'weekly') return { unit: 'week', every: everyOf(s), anchor: startOfWeek(from, weekStart) };
  if (s.kind === 'monthly') return { unit: 'month', every: everyOf(s), anchor: startOfMonth(from) };
  throw new Error(`periodGrid: ${s.kind} schedules have no periods`);
}

/**
 * The grid a flexible rule cuts its periods on: from its `from` period, or from `gridFrom` when a
 * backdated first rule keeps the grid it had (WP-B5, P-history-01).
 */
export function ruleGrid(rule: Pick<HabitRule, 'schedule' | 'from' | 'gridFrom'>, weekStart: WeekStart): PeriodGrid {
  return periodGrid(rule, rule.gridFrom ?? rule.from, weekStart);
}

/** The period with this index. */
export function periodSlot(grid: PeriodGrid, index: number): PeriodSlot {
  if (grid.unit === 'week') {
    const len = 7 * grid.every;
    const start = addDays(grid.anchor, len * index);
    return { index, start, end: addDays(start, len - 1) };
  }
  const first = monthIndex(grid.anchor) + grid.every * index;
  return { index, start: firstDayOfMonthIndex(first), end: lastDayOfMonthIndex(first + grid.every - 1) };
}

/** The period containing `date`. */
export function periodSlotAt(grid: PeriodGrid, date: DateKey): PeriodSlot {
  const index =
    grid.unit === 'week'
      ? Math.floor(diffDays(grid.anchor, date) / (7 * grid.every))
      : Math.floor((monthIndex(date) - monthIndex(grid.anchor)) / grid.every);
  return periodSlot(grid, index);
}

/* ------------------------------------------------------------------ */
/* Rule content: validation, normalisation, equality                   */
/* ------------------------------------------------------------------ */

export type RuleIssueCode =
  | 'target-range'
  | 'step-range'
  | 'days-empty'
  | 'days-invalid'
  | 'times-range'
  | 'every-invalid'
  | 'flexible-target'
  | 'tiny-label'
  | 'tiny-count-range'
  | 'from-invalid'
  | 'rules-empty'
  | 'rules-order'
  | 'first-rule-start';

export interface RuleIssue {
  code: RuleIssueCode;
  message: string;
  /** Index into habit.rules when the issue concerns one rule. */
  index?: number;
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/** Every problem with a rule's content; an empty list means it is valid (DESIGN v1 §13.2). */
export function validateRuleContent(rule: RuleContent): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const s = rule.schedule;
  const flexible = s.kind === 'weekly' || s.kind === 'monthly';
  if (s.kind === 'days') {
    if (!Array.isArray(s.days) || s.days.length === 0) issues.push({ code: 'days-empty', message: 'Pick at least one day.' });
    else if (!s.days.every(isWeekday)) issues.push({ code: 'days-invalid', message: 'Days must be 0 (Sun) … 6 (Sat).' });
  }
  if (flexible) {
    const allowed: readonly number[] = s.kind === 'weekly' ? WEEKLY_EVERY : MONTHLY_EVERY;
    if (!allowed.includes(s.every)) issues.push({ code: 'every-invalid', message: `every must be one of ${allowed.join(', ')}.` });
    const perUnit = s.kind === 'weekly' ? RULE_LIMITS.weeklyTimesPerWeek : RULE_LIMITS.monthlyTimesPerMonth;
    const max = perUnit * everyOf(s);
    if (!isInt(s.times) || s.times < 1 || s.times > max) {
      issues.push({ code: 'times-range', message: `times must be a whole number from 1 to ${max}.` });
    }
    if (rule.target !== 1) issues.push({ code: 'flexible-target', message: 'Flexible habits always have target 1.' });
  } else if (!isInt(rule.target) || rule.target < RULE_LIMITS.targetMin || rule.target > RULE_LIMITS.targetMax) {
    issues.push({ code: 'target-range', message: `target must be a whole number from 1 to ${RULE_LIMITS.targetMax}.` });
  }
  if (!isInt(rule.step) || rule.step < 1 || rule.step > RULE_LIMITS.stepMax) {
    issues.push({ code: 'step-range', message: 'step must be a whole number of at least 1.' });
  }
  if (rule.tiny) {
    if (typeof rule.tiny.label !== 'string' || rule.tiny.label.trim() === '') {
      issues.push({ code: 'tiny-label', message: 'The tiny version needs a label.' });
    }
    const c = rule.tiny.count;
    if (c !== undefined && (!isInt(c) || c < 1 || c >= effectiveTarget(rule))) {
      issues.push({ code: 'tiny-count-range', message: 'The tiny count must be at least 1 and below the target.' });
    }
  }
  return issues;
}

/** Canonical form: sorted unique days, flexible target 1, whole step ≥ 1, trimmed tiny label. */
export function normalizeRuleContent<R extends RuleContent>(rule: R): R {
  const s = rule.schedule;
  const schedule: Schedule =
    s.kind === 'days' ? { kind: 'days', days: [...new Set(s.days.filter(isWeekday))].sort((a, b) => a - b) } : s;
  const out: R = {
    ...rule,
    schedule,
    target: isDayBased(schedule) ? rule.target : 1,
    step: isInt(rule.step) && rule.step >= 1 ? rule.step : 1,
  };
  if (rule.tiny) out.tiny = { ...rule.tiny, label: rule.tiny.label.trim() };
  return out;
}

function sameSchedule(a: Schedule, b: Schedule): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'daily':
      return true;
    case 'days': {
      const x = scheduledWeekdays(a);
      const y = scheduledWeekdays(b);
      return x.size === y.size && [...x].every((d) => y.has(d));
    }
    case 'weekly':
    case 'monthly': {
      const bb = b as FlexibleSchedule;
      return a.times === bb.times && everyOf(a) === everyOf(bb);
    }
  }
}

/**
 * Two flexible schedules cut time into the same periods (same unit and the same `every`), so one
 * can take over a period from the other without moving any period boundary; only `times` may
 * differ. False when either is day-based. Decides what "this period" means for an edit (rules.ts).
 */
export function samePeriodGeometry(a: ScheduleLike, b: ScheduleLike): boolean {
  const x = scheduleOf(a);
  const y = scheduleOf(b);
  if (x.kind !== y.kind || isDayBased(x)) return false;
  return everyOf(x) === everyOf(y);
}

/**
 * `next` asks for more than `prev`: at least as many occurrences per week and at least as big a
 * daily target, and strictly more of one of them. Accepting "Ready to grow?" needs such a rule
 * (DESIGN v1 §13.2 graduation); a cosmetic or smaller edit is not a graduation.
 */
export function isBiggerRule(prev: Pick<HabitRule, 'schedule' | 'target'>, next: Pick<HabitRule, 'schedule' | 'target'>): boolean {
  const eps = 1e-9;
  const e0 = expectedPerWeek(prev);
  const e1 = expectedPerWeek(next);
  const t0 = effectiveTarget(prev);
  const t1 = effectiveTarget(next);
  return e1 + eps >= e0 && t1 >= t0 && (e1 > e0 + eps || t1 > t0);
}

/** True when two rules would evaluate every day identically (ignores `from`). */
export function sameRuleContent(a: RuleContent, b: RuleContent): boolean {
  return (
    sameSchedule(a.schedule, b.schedule) &&
    effectiveTarget(a) === effectiveTarget(b) &&
    a.step === b.step &&
    (a.tiny?.label ?? null) === (b.tiny?.label ?? null) &&
    (a.tiny?.count ?? null) === (b.tiny?.count ?? null)
  );
}
