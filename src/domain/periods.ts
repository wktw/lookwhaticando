/**
 * Flexible periods (DESIGN v1 §13.3 "Consistency & streak math (exact)").
 *
 * For a flexible period p (a week or month, `every`-aware, cut on the rule's grid):
 *   activeFrac_p = active days in p ÷ total days in p
 *   target_p     = round(times × activeFrac_p)
 *   achieved_p   = min(times, checkinDays_p)
 *   expected_p   = achieved_p + max(0, target_p − achieved_p − open_p)
 * where open_p counts the days that can still take a check-in (0 once the period closed, which
 * gives v1 §13.3's closed form max(target_p, achieved_p)). A period is skipped only when target_p and
 * achieved_p are both 0. Only a shortfall that can no longer be made up counts, so the current
 * period can only ever help.
 *
 * Open days (the v1 §13.3 remainingActiveDays(T…end), made exact; stage-3 decisions):
 * - today counts only while it can still take a check-in: once today is checked in it is used up
 *   (one check-in per day), so "3 of 3 by Sunday" can't read as reachable on a Sunday already
 *   ticked;
 * - future paused and off days count too. Take today off and pauses are "transparent for every
 *   habit" (v1 §13.2): they lower target_p when the period closes (round over active days), but they
 *   must never make the current period look worse than not taking them. Counting them as open
 *   keeps expected_p monotone: a day off or a pause can only lower it (the spec's letter,
 *   round(times × activeFrac) against active days only, could raise it: 3×/week with Friday off
 *   still rounds to 3 while one fewer day remains).
 *
 * Rule versions: each flexible rule cuts periods on its own grid, clipped to the days it governs.
 * Days of a period before its rule's start are inactive for it (exactly like days before
 * `startedOn` for a habit created mid-week), and check-ins there belong to the earlier rule.
 * A period **cut short** by a later rule (the next rule starts before its nominal end: a
 * geometry-changing "this period" edit, or a graduation from tomorrow) is evaluated as it stood on
 * the day of the cut: its goal is the one it had (target over the whole period from its rule's
 * start), and the days it lost to the next rule count as open. So an edit never turns a shortfall
 * that could still have been made up into a settled one, and a cut period is met only by its full
 * goal (so a mid-period switch can't cheapen a period-goal bonus). Those lost days are read in a
 * **cut-time view** (WP-B5, HM1): open whatever today is, and active or not as they stood when the
 * edit was made. The days already paused or off then are counted on the next rule
 * (`HabitRule.cutInactive`, stamped by `withCutStamp`); every other lost day is active whatever
 * later happens to the habit (Finish, Archive, Restore, pauses, days off). So the edit keeps the
 * goal the period had, and no later lifecycle action can move a cut period into, or out of, a
 * shortfall.
 * Grid: a rule's periods are cut from its `from` period, or from `gridFrom` when a backdated first
 * rule keeps the grid it had (WP-B5, P-history-01), so "Start tracking from…" regroups nothing.
 * Attribution: a period belongs to the month containing its last day (its last *governed* day for
 * a cut period), even while current.
 */
import type { DateKey, Habit, HabitRule } from '@/state/types';
import { addDays, daysInRange, eachDay, maxDateKey, minDateKey, monthKey, type MonthKey, type WeekStart } from './dates';
import { inLifetime, isFlexActiveDay, logStatus, type EvalContext, type HabitLogs, type TrackingContext } from './activity';
import { isPausedOn } from './pauses';
import { ruleSegments } from './rules';
import { isFlexible, periodSlot, periodSlotAt, ruleGrid, type FlexibleSchedule, type PeriodUnit } from './schedule';

type HabitDays = Pick<Habit, 'rules' | 'startedOn' | 'archivedOn' | 'unstarted' | 'pauses'>;

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
    const grid = ruleGrid(seg.rule, weekStart);
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
  /** Cut short by a later rule (to < end): evaluated as it stood on the day of the cut. */
  cut: boolean;
  /** Nominal length (the activeFrac denominator). */
  totalDays: number;
  /** Active days the goal is scaled by: [from, to], or [from, end] for a cut period. */
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
  /**
   * Active days from today to the period's end that can still take a check-in (today only while
   * not yet checked in; 0 once closed). What pace lines ("1 more by Sun") can count on.
   */
  remainingActiveDays: number;
  /** Days the shortfall may still be made up on (see module doc "Open days"). */
  openDays: number;
  expected: number;
  /** Goal met: check-in days ≥ max(1, target). */
  met: boolean;
  /** The day the goal was first met, if it has been. */
  metOn: DateKey | null;
  /** target 0 and nothing achieved: the period is left out (and is transparent to streaks). */
  skipped: boolean;
  /** A settled shortfall: closed and expected > achieved (the only kind that ends a streak). */
  short: boolean;
}

/** Evaluates a flexible period as of `ctx.today` (see module doc for the exact rules). */
export function evaluatePeriod(habit: HabitDays, logs: HabitLogs, p: FlexPeriod, ctx: EvalContext): PeriodEvaluation {
  const T = ctx.today;
  const state: PeriodState = p.to < T ? 'closed' : p.from > T ? 'future' : 'current';
  const cut = p.to < p.end;
  const totalDays = daysInRange(p.start, p.end);
  const checkins: { date: DateKey; tiny: boolean }[] = [];
  for (const d of eachDay(p.from, minDateKey(p.to, T))) {
    if (!inLifetime(habit, d)) continue;
    const s = logStatus(logs[d], p.rule, d < T);
    if (s === 'done' || s === 'tiny') checkins.push({ date: d, tiny: s === 'tiny' });
  }
  const usedToday = checkins.length > 0 && checkins[checkins.length - 1]!.date === T;
  // The days the period lost to a later rule (cut periods only), read in the cut-time view: open
  // whatever today is, and active unless already paused or off when the edit was made, whatever the
  // habit's lifecycle did to them afterwards (Finish, Archive, Restore, a pause, a resume, a day
  // off). The cut period is frozen as it stood on the day of the cut (HM1, WP-B5).
  const lost = cut ? daysInRange(addDays(p.to, 1), p.end) : 0;
  let activeDays = lost - lostInactive(habit, p);
  let remainingActiveDays = 0;
  let openDays = lost;
  for (const d of eachDay(p.from, p.to)) {
    const active = isFlexActiveDay(habit, d, ctx);
    if (active) activeDays++;
    // Days already lived under this rule are settled.
    if (d < T || (d === T && usedToday) || !inLifetime(habit, d)) continue;
    openDays++;
    if (active) remainingActiveDays++;
  }
  const target = Math.round((p.times * activeDays) / totalDays);
  const tinyDays = checkins.filter((c) => c.tiny).length;
  const fullDays = checkins.length - tinyDays;
  const checkinDays = checkins.length;
  const achieved = Math.min(p.times, checkinDays);
  const expected = state === 'future' ? 0 : achieved + Math.max(0, target - achieved - openDays);
  const goal = Math.max(1, target);
  return {
    ...p,
    state,
    cut,
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
    openDays,
    expected,
    met: checkinDays >= goal,
    metOn: checkins[goal - 1]?.date ?? null,
    skipped: target === 0 && achieved === 0,
    short: state === 'closed' && expected > achieved,
  };
}

/** Evaluations of the periods overlapping [start, end] that have begun by `ctx.today`. */
export function periodEvaluations(habit: HabitDays, logs: HabitLogs, start: DateKey, end: DateKey, ctx: EvalContext): PeriodEvaluation[] {
  return flexPeriodsOverlapping(habit, start, end, ctx.weekStart)
    .map((p) => evaluatePeriod(habit, logs, p, ctx))
    .filter((e) => e.state !== 'future');
}

/** The month a period is attributed to: the month of its last day (DESIGN v1 §13.3). */
export function attributionMonth(p: Pick<FlexPeriod, 'to'>): MonthKey {
  return monthKey(p.to);
}

/** Where the current flexible period stands, for pace lines ("1 more by Sun") and "goals on track". */
export interface PeriodPace {
  period: PeriodEvaluation;
  target: number;
  checkinDays: number;
  /** Check-in days still needed to meet the goal, max(1, target) (0 once met). */
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
  // The goal shown is max(1, target) ("0 of 1 this week"), so what is needed is measured against it.
  const needed = Math.max(0, Math.max(1, e.target) - e.checkinDays);
  const elapsed = Math.max(0, e.activeDays - e.remainingActiveDays - (e.cut ? activeAfter(habit, p) : 0));
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

/** Active days a cut period lost to the next rule (not "elapsed" for its pace), in the cut-time view. */
function activeAfter(habit: Pick<Habit, 'rules'>, p: FlexPeriod): number {
  return p.to < p.end ? daysInRange(addDays(p.to, 1), p.end) - lostInactive(habit, p) : 0;
}

/** How many of the days a cut period lost were already paused or off at the cut (0 when not cut). */
function lostInactive(habit: Pick<Habit, 'rules'>, p: FlexPeriod): number {
  if (!(p.to < p.end)) return 0;
  const n = habit.rules[p.ruleIndex + 1]?.cutInactive ?? 0;
  return Math.max(0, Math.min(daysInRange(addDays(p.to, 1), p.end), n));
}

/**
 * The habit after a rule edit (`next`, from `before`), with its newest rule stamped with how many
 * of the days it cuts from the previous rule's period are already paused or taken off
 * (`HabitRule.cutInactive`), so that period keeps the goal it had at the edit (WP-B5, HM1). The
 * goal it had is the one it read just before, so days an earlier edit had already cut from the
 * same period keep that edit's stamp: a rule replacing one that starts the same day (a second edit
 * that day) keeps its stamp as it is, and one replacing a later cut (a "this period" edit after
 * "Ready to grow?" was accepted for tomorrow) adds its own new days to it. Pure; returns `next`
 * when nothing changes.
 */
export function withCutStamp<H extends Pick<Habit, 'rules' | 'pauses'>>(next: H, before: Pick<Habit, 'rules'>, ctx: TrackingContext): H {
  if (next.rules === before.rules) return next;
  const idx = next.rules.length - 1;
  const last = next.rules[idx];
  if (!last || idx === 0) return next;
  const same = before.rules.find((r) => r.from === last.from);
  let n: number | undefined;
  if (same) n = same.cutInactive;
  else {
    const p = flexPeriodAt(next, addDays(last.from, -1), ctx.weekStart);
    if (!p || p.ruleIndex !== idx - 1 || !(p.to < p.end)) return next;
    // The first rule the edit superseded, when it had cut this same period later on.
    const replaced = before.rules.find((r) => r.from > last.from && r.from <= p.end);
    n = replaced?.cutInactive ?? 0;
    for (const d of eachDay(last.from, replaced ? addDays(replaced.from, -1) : p.end)) if (isPausedOn(next.pauses, d) || ctx.offDays[d] === true) n++;
  }
  if ((n ?? 0) === (last.cutInactive ?? 0)) return next;
  const stamped: HabitRule = { ...last };
  if (n !== undefined && n > 0) stamped.cutInactive = n;
  else delete stamped.cutInactive;
  return { ...next, rules: [...next.rules.slice(0, idx), stamped] };
}
