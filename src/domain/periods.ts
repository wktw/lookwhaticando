/**
 * Flexible periods (DESIGN §13.3 "Consistency & streak math (exact)").
 *
 * For a flexible period p (a week or month, `every`-aware, cut on the rule's grid):
 *   activeFrac_p = active days in p ÷ total days in p
 *   target_p     = round(times × activeFrac_p)
 *   achieved_p   = min(times, checkinDays_p)
 *   expected_p   = max(target_p, achieved_p)                         (closed periods)
 *   expected_p   = achieved_p + max(0, target_p − achieved_p − remainingActiveDays(T…end))   (current)
 * A period is skipped only when target_p and achieved_p are both 0. The current-period formula only
 * counts a shortfall that can no longer be made up (one check-in per day), so the current period
 * can only ever help.
 *
 * Rule versions: each flexible rule cuts periods on its own grid, clipped to the days it governs.
 * Days of a period outside its rule's range are inactive for that period (exactly like days before
 * `startedOn` for a habit created mid-week), and check-ins there belong to the other rule.
 * Attribution: a period belongs to the month containing its last day, even while current.
 */
import type { DateKey, Habit, HabitRule } from '@/state/types';
import { daysInRange, eachDay, maxDateKey, minDateKey, monthKey, type MonthKey, type WeekStart } from './dates';
import { inLifetime, isFlexActiveDay, logStatus, type EvalContext, type HabitLogs } from './activity';
import { ruleSegments } from './rules';
import { isFlexible, periodGrid, periodSlot, periodSlotAt, type FlexibleSchedule, type PeriodUnit } from './schedule';

type HabitDays = Pick<Habit, 'rules' | 'startedOn' | 'archivedOn' | 'pauses'>;

/** A flexible period of one rule. */
export interface FlexPeriod {
  /** Stable id: the nominal first day (ledger key 'period|<habitId>|<key>'). */
  key: DateKey;
  /** Nominal bounds on the rule's grid (inclusive). */
  start: DateKey;
  end: DateKey;
  /** Effective bounds: the nominal period clipped to the days its rule governs. */
  from: DateKey;
  to: DateKey;
  ruleIndex: number;
  rule: HabitRule;
  unit: PeriodUnit;
  every: number;
  times: number;
}

/**
 * Every flexible period (of any flexible rule) whose effective range overlaps [start, end], in
 * date order. Effective ranges may extend beyond [start, end].
 */
export function flexPeriodsOverlapping(habit: Pick<Habit, 'rules'>, start: DateKey, end: DateKey, weekStart: WeekStart): FlexPeriod[] {
  const out: FlexPeriod[] = [];
  if (end < start) return out;
  for (const seg of ruleSegments(habit)) {
    if (!isFlexible(seg.rule)) continue;
    const lo = seg.start === null ? start : maxDateKey(start, seg.start);
    const hi = seg.end === null ? end : minDateKey(end, seg.end);
    if (lo > hi) continue;
    const grid = periodGrid(seg.rule, seg.rule.from, weekStart);
    const times = (seg.rule.schedule as FlexibleSchedule).times;
    for (let k = periodSlotAt(grid, lo).index, last = periodSlotAt(grid, hi).index; k <= last; k++) {
      const slot = periodSlot(grid, k);
      out.push({
        key: slot.start,
        start: slot.start,
        end: slot.end,
        from: seg.start === null ? slot.start : maxDateKey(slot.start, seg.start),
        to: seg.end === null ? slot.end : minDateKey(slot.end, seg.end),
        ruleIndex: seg.index,
        rule: seg.rule,
        unit: grid.unit,
        every: grid.every,
        times,
      });
    }
  }
  return out;
}

/** The flexible period containing `date`, or null when a day-based rule governs it. */
export function flexPeriodAt(habit: Pick<Habit, 'rules'>, date: DateKey, weekStart: WeekStart): FlexPeriod | null {
  return flexPeriodsOverlapping(habit, date, date, weekStart)[0] ?? null;
}

export type PeriodState = 'closed' | 'current' | 'future';

export interface PeriodEvaluation extends FlexPeriod {
  /** closed: to < today · current: from ≤ today ≤ to · future: from > today. */
  state: PeriodState;
  /** Nominal length (the activeFrac denominator). */
  totalDays: number;
  activeDays: number;
  activeFrac: number;
  target: number;
  /** Days (≤ today) showing up: full + tiny. */
  checkinDays: number;
  fullDays: number;
  tinyDays: number;
  /** Check-in days in date order (first `times` of them earn sunshine). */
  checkins: { date: DateKey; tiny: boolean }[];
  achieved: number;
  /** Achieved occurrences that were tiny, counting full check-ins first ("26 of 30 · 8 tiny"). */
  tinyAchieved: number;
  /** Active days from today to the period's end (0 once closed). */
  remainingActiveDays: number;
  expected: number;
  /** Goal met: check-in days ≥ max(1, target). */
  met: boolean;
  /** The day the goal was first met, if it has been. */
  metOn: DateKey | null;
  /** target 0 and nothing achieved: the period is left out (and is transparent to streaks). */
  skipped: boolean;
}

/** Evaluates a flexible period as of `ctx.today` (see module doc for the exact rules). */
export function evaluatePeriod(habit: HabitDays, logs: HabitLogs, p: FlexPeriod, ctx: EvalContext): PeriodEvaluation {
  const T = ctx.today;
  const state: PeriodState = p.to < T ? 'closed' : p.from > T ? 'future' : 'current';
  const totalDays = daysInRange(p.start, p.end);
  let activeDays = 0;
  let remainingActiveDays = 0;
  const checkins: { date: DateKey; tiny: boolean }[] = [];
  for (const d of eachDay(p.from, p.to)) {
    if (isFlexActiveDay(habit, d, ctx)) {
      activeDays++;
      if (d >= T) remainingActiveDays++;
    }
    if (d <= T && inLifetime(habit, d)) {
      const s = logStatus(logs[d], p.rule, d < T);
      if (s === 'done' || s === 'tiny') checkins.push({ date: d, tiny: s === 'tiny' });
    }
  }
  const target = Math.round((p.times * activeDays) / totalDays);
  const tinyDays = checkins.filter((c) => c.tiny).length;
  const fullDays = checkins.length - tinyDays;
  const checkinDays = checkins.length;
  const achieved = Math.min(p.times, checkinDays);
  const expected =
    state === 'closed'
      ? Math.max(target, achieved)
      : state === 'current'
        ? achieved + Math.max(0, target - achieved - remainingActiveDays)
        : 0;
  const goal = Math.max(1, target);
  return {
    ...p,
    state,
    totalDays,
    activeDays,
    activeFrac: activeDays / totalDays,
    target,
    checkinDays,
    fullDays,
    tinyDays,
    checkins,
    achieved,
    tinyAchieved: Math.max(0, achieved - fullDays),
    remainingActiveDays,
    expected,
    met: checkinDays >= goal,
    metOn: checkins[goal - 1]?.date ?? null,
    skipped: target === 0 && achieved === 0,
  };
}

/** Evaluations of the periods overlapping [start, end] that have begun by `ctx.today`. */
export function periodEvaluations(habit: HabitDays, logs: HabitLogs, start: DateKey, end: DateKey, ctx: EvalContext): PeriodEvaluation[] {
  return flexPeriodsOverlapping(habit, start, end, ctx.weekStart)
    .map((p) => evaluatePeriod(habit, logs, p, ctx))
    .filter((e) => e.state !== 'future');
}

/** The month a period is attributed to: the month of its last day (DESIGN §13.3). */
export function attributionMonth(p: Pick<FlexPeriod, 'to'>): MonthKey {
  return monthKey(p.to);
}

/** Where the current flexible period stands, for pace lines ("1 more by Sun") and "goals on track". */
export interface PeriodPace {
  period: PeriodEvaluation;
  target: number;
  checkinDays: number;
  /** Check-in days still needed to meet the goal (0 once met). */
  needed: number;
  remainingActiveDays: number;
  /** The last day of the period ("by Sun"). */
  deadline: DateKey;
  met: boolean;
  /** The goal can still be met with one check-in per remaining active day. */
  possible: boolean;
  /**
   * Met, or at least at the pace of the days already behind us:
   * checkinDays ≥ floor(target × elapsedActiveDays ÷ activeDays). Gentle by design.
   */
  onTrack: boolean;
}

/** Pace of the flexible period containing `ctx.today` (null when a day-based rule is in effect). */
export function periodPace(habit: HabitDays, logs: HabitLogs, ctx: EvalContext): PeriodPace | null {
  const p = flexPeriodAt(habit, ctx.today, ctx.weekStart);
  if (!p) return null;
  const e = evaluatePeriod(habit, logs, p, ctx);
  const needed = Math.max(0, e.target - e.checkinDays);
  const elapsed = e.activeDays - e.remainingActiveDays;
  const paceSoFar = e.activeDays > 0 ? Math.floor((e.target * elapsed) / e.activeDays) : 0;
  return {
    period: e,
    target: e.target,
    checkinDays: e.checkinDays,
    needed,
    remainingActiveDays: e.remainingActiveDays,
    deadline: e.to,
    met: e.met,
    possible: needed <= e.remainingActiveDays,
    onTrack: e.met || e.checkinDays >= paceSoFar,
  };
}
