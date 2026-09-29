/**
 * Streaks (DESIGN §5.4 as amended by §13.2, §13.3 and §13.5).
 *
 * - Day-based: consecutive done scheduled days. Allowed rests, off days, pauses and unscheduled days
 *   are transparent; an over-allowance rest or an unfinished past day ends the run; today pending
 *   never breaks it (the count starts from today if done, otherwise from yesterday).
 * - Flexible: consecutive met periods. A period with target 0 and no check-ins is transparent; the
 *   current period counts only once met. Length is reported in weeks/months (Σ every), so a
 *   biweekly streak of 3 periods reads "6 weeks".
 * - Across rule versions: a streak continues across edits within a rhythm (e.g. daily → Mon/Wed/Fri,
 *   a new target) and restarts when the rhythm changes (day-based ↔ weekly ↔ monthly). The old run
 *   is kept as the best, and the UI labels the new one "New rhythm" (never "0").
 * - Rungs: tier = the largest rung ≤ the occurrence-equivalent (day-based: the streak count;
 *   flexible: Σ times over the streak's periods), paid once per (habit, tier) (§13.5).
 */
import type { DateKey, Habit, HabitRule } from '@/state/types';
import { maxDateKey, minDateKey } from './dates';
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
  /** In `unit`: occurrences for day-based runs, Σ every (weeks/months) for flexible runs. */
  length: number;
  /** Occurrence-equivalent, the rung measure (day-based: length; flexible: Σ times). */
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
    const extend = (start: DateKey, end: DateKey, length: number, occurrences: number, rule: HabitRule): void => {
      run = run
        ? { ...run, end, length: run.length + length, occurrences: run.occurrences + occurrences, unit: streakUnitOf(rule) }
        : { start, end, length, occurrences, unit: streakUnitOf(rule) };
    };
    const close = (): void => {
      if (run && (!best || run.occurrences >= best.occurrences)) best = run;
      run = null;
    };

    if (span.rhythm === 'day') {
      for (const ev of dayEvaluations(habit, logs, lo, hi, ctx)) {
        if (ev.outcome === 'achieved') extend(ev.date, ev.date, 1, 1, ev.rule);
        else if (ev.outcome === 'missed') close();
      }
    } else {
      for (const p of periodEvaluations(habit, logs, lo, hi, ctx)) {
        if (p.met) extend(p.from, p.to, p.every, p.times, p.rule);
        else if (p.state === 'closed' && !p.skipped) close();
      }
    }
    if (i === spanAtT) current = run;
    close();
  });

  const rhythmStart = maxDateKey(spans[spanAtT]?.start ?? habit.startedOn, habit.startedOn);
  return { unit: streakUnitOf(ruleAt(habit, T)), current, best, rhythmStart, newRhythm: spanAtT > 0 };
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
