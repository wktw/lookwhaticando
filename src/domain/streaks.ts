/**
 * Streaks (DESIGN §5.4 as amended by §13.2, §13.3 and §13.5).
 *
 * - Day-based: consecutive done scheduled days. Allowed rests, off days, pauses and unscheduled days
 *   are transparent; an over-allowance rest or an unfinished past day ends the run; today pending
 *   never breaks it (the count starts from today if done, otherwise from yesterday).
 * - Flexible: consecutive met periods. A period with target 0 and no check-ins is transparent; the
 *   current period counts only once met; only a *settled* shortfall ends the run (a period cut
 *   short by a rule edit whose goal could still have been made up is transparent, periods.ts).
 *   Length is the number of calendar weeks/months the run's met periods cover (a biweekly streak
 *   of 3 periods reads "6 weeks"), so two stubs of one week cut by a rule edit count once and a
 *   run never claims more weeks than it spans (§5.4 "Unit: weeks").
 * - Across rule versions: a streak continues across edits within a rhythm (e.g. daily → Mon/Wed/Fri,
 *   a new target) and restarts when the rhythm changes (day-based ↔ weekly ↔ monthly). The old run
 *   is kept as the best, and the UI labels the new one "New rhythm" (never "0").
 * - Rungs: tier = the largest rung ≤ the occurrence-equivalent (day-based: the streak count;
 *   flexible: the occurrences achieved in the streak's periods, Σ min(times, check-in days)), paid
 *   once per (habit, tier) (§13.5). §13.5's "streak periods × times" is the same number for every
 *   full period; a period whose goal was scaled down (created mid-week, paused, cut by an edit)
 *   counts what it actually asked for and got, so a 7×/week habit paused six days a week can't
 *   claim 7 occurrences per check-in (stage-3 decision).
 */
import type { DateKey, Habit, HabitRule } from '@/state/types';
import { addDays, maxDateKey, minDateKey, monthIndex, startOfWeek, type WeekStart } from './dates';
import { dayEvaluations, type EvalContext, type HabitLogs } from './activity';
import { periodEvaluations } from './periods';
import { rhythmSpans, ruleAt } from './rules';

type HabitDays = Pick<Habit, 'rules' | 'startedOn' | 'archivedOn' | 'pauses'>;

/** 'days' for daily, 'times' for certain days ("12 in a row"), 'weeks', 'months'. */
export type StreakUnit = 'days' | 'times' | 'weeks' | 'months';

export function streakUnitOf(rule: Pick<HabitRule, 'schedule'>): StreakUnit {
  switch (rule.schedule.kind) {
    case 'daily':
      return 'days';
    case 'days':
      return 'times';
    case 'weekly':
      return 'weeks';
    case 'monthly':
      return 'months';
  }
}

export interface StreakRun {
  /** In `unit`: occurrences for day-based runs, calendar weeks/months covered for flexible runs. */
  length: number;
  /** Occurrence-equivalent, the rung measure (day-based: length; flexible: Σ achieved). */
  occurrences: number;
  /** Unit of the run's latest occurrence. */
  unit: StreakUnit;
  /** First counted day (or first day of the first counted period). */
  start: DateKey;
  /** Last counted day (or last day of the latest counted period). */
  end: DateKey;
}

export interface StreakInfo {
  /** Unit of the rule in effect today (for labelling the current streak). */
  unit: StreakUnit;
  /** The live run, or null when there is none (the card shows consistency instead; never "0"). */
  current: StreakRun | null;
  /** The best run ever, across every rhythm, by occurrence-equivalent (ties → the latest). */
  best: StreakRun | null;
  /** First day of the rhythm in effect today. */
  rhythmStart: DateKey;
  /** The habit changed rhythm at some point; label a young current run "New rhythm". */
  newRhythm: boolean;
}

/** Current and best streaks of one habit as of `ctx.today`. */
export function streakInfo(habit: HabitDays, logs: HabitLogs, ctx: EvalContext): StreakInfo {
  const T = ctx.today;
  const spans = rhythmSpans(habit);
  let best: StreakRun | null = null;
  let current: StreakRun | null = null;
  let spanAtT = 0;

  spans.forEach((span, i) => {
    const lo = maxDateKey(span.start ?? habit.startedOn, habit.startedOn);
    const hi = span.end === null ? T : minDateKey(span.end, T);
    if (span.start === null || span.start <= T) spanAtT = i;
    if (lo > hi) {
      if (i === spanAtT) current = null;
      return;
    }

    let run: StreakRun | null = null;
    // Calendar units (week starts or month indexes) covered by the run's met periods.
    let units = new Set<string>();
    const extend = (start: DateKey, end: DateKey, length: number, occurrences: number, rule: HabitRule): void => {
      run = run
        ? { ...run, end, length: run.length + length, occurrences: run.occurrences + occurrences, unit: streakUnitOf(rule) }
        : { start, end, length, occurrences, unit: streakUnitOf(rule) };
    };
    const close = (): void => {
      if (run && (!best || run.occurrences >= best.occurrences)) best = run;
      run = null;
      units = new Set();
    };

    if (span.rhythm === 'day') {
      for (const ev of dayEvaluations(habit, logs, lo, hi, ctx)) {
        if (ev.outcome === 'achieved') extend(ev.date, ev.date, 1, 1, ev.rule);
        else if (ev.outcome === 'missed') close();
      }
    } else {
      for (const p of periodEvaluations(habit, logs, lo, hi, ctx)) {
        if (p.met) {
          const before = units.size;
          for (const u of calendarUnits(p.unit, p.from, p.to, ctx.weekStart)) units.add(u);
          extend(p.from, p.to, units.size - before, p.achieved, p.rule);
        } else if (p.short) close();
      }
    }
    if (i === spanAtT) current = run;
    close();
  });

  const rhythmStart = maxDateKey(spans[spanAtT]?.start ?? habit.startedOn, habit.startedOn);
  return { unit: streakUnitOf(ruleAt(habit, T)), current, best, rhythmStart, newRhythm: spanAtT > 0 };
}

/** The calendar weeks (their first days) or months (their indexes) that [from, to] touches. */
function calendarUnits(unit: 'week' | 'month', from: DateKey, to: DateKey, weekStart: WeekStart): string[] {
  const out: string[] = [];
  if (unit === 'week') {
    for (let w = startOfWeek(from, weekStart); w <= to; w = addDays(w, 7)) out.push(w);
  } else {
    for (let m = monthIndex(from), last = monthIndex(to); m <= last; m++) out.push(String(m));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rung ladder (DESIGN §13.5)                                          */
/* ------------------------------------------------------------------ */

export interface Rung {
  /** Occurrence-equivalent needed (the api's `tierDays`). */
  tier: number;
  coins: number;
}

/** Streak rungs, coins only, paid once per (habit, tier). */
export const RUNGS: readonly Rung[] = [
  { tier: 3, coins: 10 },
  { tier: 7, coins: 20 },
  { tier: 14, coins: 30 },
  { tier: 21, coins: 35 },
  { tier: 30, coins: 40 },
  { tier: 45, coins: 50 },
  { tier: 60, coins: 60 },
  { tier: 90, coins: 80 },
  { tier: 120, coins: 100 },
  { tier: 180, coins: 150 },
  { tier: 365, coins: 250 },
];

/** The largest rung ≤ the occurrence-equivalent, or null below the first rung. */
export function rungTier(occurrences: number): Rung | null {
  let hit: Rung | null = null;
  for (const r of RUNGS) if (r.tier <= occurrences) hit = r;
  return hit;
}

/** The next rung above the occurrence-equivalent (the ladder's "next"), or null at the top. */
export function nextRung(occurrences: number): Rung | null {
  return RUNGS.find((r) => r.tier > occurrences) ?? null;
}

/** Every rung reached by the occurrence-equivalent, lowest first. */
export function rungsReached(occurrences: number): Rung[] {
  return RUNGS.filter((r) => r.tier <= occurrences);
}
