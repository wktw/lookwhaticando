/**
 * Progress-screen insights and records (DESIGN §9.2 "Records" / "Insights", v1 §13.3 aggregate lines).
 * All results are structured data; none of them is ever phrased negatively by the domain.
 *
 * - "You showed up N of the last 30 days": days with ≥ 1 check-in (done or tiny) on any habit, over
 *   the 30 days ending today once today has a check-in, otherwise ending yesterday (a pending today
 *   never costs a day of the span; upstream v1 §13.11 "Rolling windows end today if today already
 *   counts, else yesterday").
 * - "Weekly & monthly goals: 3 of 5 on track": current flexible periods that are met or at pace.
 * - Strongest weekday, most consistent habit, busiest time of day (from live `at` stamps only).
 * - Records: total check-ins, best streak ever (+ habit), best closed month. (Perfect days are an
 *   economy counter: Lifetime.perfectDays.)
 * - Check-in counts per habit: monthly counts feed the Herbarium page (pressings sized by waterings)
 *   and a quieter month's "best fact" (§5.4).
 */
import type { DateKey, Habit, Weekday } from '@/state/types';
import {
  addDays,
  daysInRange,
  eachDay,
  isDateKey,
  maxDateKey,
  monthFromIndex,
  monthIndex,
  runtimeLocalTime,
  weekday,
  weekdayOrder,
  type LocalTimeReader,
  type MonthKey,
} from './dates';
import { dayEvaluations, inLifetime, lifetimeEnd, logStatus, showedUp } from './activity';
import {
  EMPTY_TALLY,
  MIN_EXPECTED_FOR_PCT,
  addTally,
  aggregateTally,
  evalContext,
  habitTally,
  isPctReady,
  logsFor,
  monthWindow,
  percent,
  ratio,
  trailingWindow,
  type StatWindow,
  type Tally,
  type Tracking,
} from './consistency';
import { periodPace, type PeriodPace } from './periods';
import { ruleAt } from './rules';
import { streakInfo, type StreakRun } from './streaks';

/** First day any habit counts (null without habits). */
export function firstTrackedDay(t: Pick<Tracking, 'habits'>): DateKey | null {
  let first: DateKey | null = null;
  for (const h of t.habits) if (first === null || h.startedOn < first) first = h.startedOn;
  return first;
}

/** Still in play today: started and not archived before today. */
const liveOn = (h: Habit, today: DateKey): boolean => h.startedOn <= today && (h.archivedOn === undefined || h.archivedOn >= today);

/* ------------------------------------------------------------------ */
/* Showing up                                                          */
/* ------------------------------------------------------------------ */

export interface ShowUpSummary {
  /** Days in the span with at least one check-in. */
  days: number;
  /** Days looked at: `days` requested, fewer while the profile is younger. */
  span: number;
}

/** "You showed up N of the last 30 days" (DESIGN v1 §13.3; see module doc for the window). */
export function showedUpDays(t: Tracking, today: DateKey, days = 30): ShowUpSummary {
  const first = firstTrackedDay(t);
  if (first === null || first > today) return { days: 0, span: 0 };
  const shownOn = (d: DateKey): boolean =>
    t.habits.some((h) => inLifetime(h, d) && showedUp(logStatus(logsFor(t, h.id)[d], ruleAt(h, d), d < today)));
  const last = shownOn(today) ? today : addDays(today, -1);
  const start = maxDateKey(addDays(last, -(days - 1)), first);
  if (start > last) return { days: 0, span: 0 };
  const seen = new Set<DateKey>();
  for (const h of t.habits) {
    const logs = logsFor(t, h.id);
    const end = lifetimeEnd(h, last);
    if (end === null) continue;
    for (const d of eachDay(maxDateKey(start, h.startedOn), end)) {
      if (!seen.has(d) && showedUp(logStatus(logs[d], ruleAt(h, d), d < today))) seen.add(d);
    }
  }
  return { days: seen.size, span: daysInRange(start, last) };
}

/**
 * Days in [start, end] (never past today) with at least one check-in (done or tiny) on any habit,
 * and the span they are out of: from `start` (or the first tracked day) to `end`, where today
 * counts only once it has a check-in ("September so far: 22 of 29 days", "Aug · 24 days").
 */
export function showedUpDaysIn(t: Tracking, start: DateKey, end: DateKey, today: DateKey): ShowUpSummary {
  const first = firstTrackedDay(t);
  if (first === null) return { days: 0, span: 0 };
  const from = maxDateKey(start, first);
  let last = end < today ? end : today;
  const seen = new Set<DateKey>();
  for (const h of t.habits) {
    const logs = logsFor(t, h.id);
    for (const [d, log] of Object.entries(logs)) {
      if (d < from || d > last || seen.has(d) || !inLifetime(h, d)) continue;
      if (showedUp(logStatus(log, ruleAt(h, d), d < today))) seen.add(d);
    }
  }
  if (last === today && !seen.has(today)) last = addDays(today, -1);
  if (from > last) return { days: seen.size, span: 0 };
  return { days: seen.size, span: daysInRange(from, last) };
}

/* ------------------------------------------------------------------ */
/* Check-in counts                                                     */
/* ------------------------------------------------------------------ */

export interface CheckinCount {
  /** Days showing up (done or tiny). */
  checkins: number;
  tiny: number;
}

/**
 * Check-in days per habit in [start, min(end, today)], inside each habit's lifetime (archived
 * habits included). Habits without check-ins are listed with zeros.
 */
export function checkinCounts(t: Tracking, start: DateKey, end: DateKey, today: DateKey): Record<string, CheckinCount> {
  const last = end < today ? end : today;
  const out: Record<string, CheckinCount> = {};
  for (const h of t.habits) {
    const c: CheckinCount = { checkins: 0, tiny: 0 };
    for (const [date, log] of Object.entries(logsFor(t, h.id))) {
      if (date < start || date > last || !inLifetime(h, date) || !isDateKey(date)) continue;
      const s = logStatus(log, ruleAt(h, date), date < today);
      if (showedUp(s)) c.checkins++;
      if (s === 'tiny') c.tiny++;
    }
    out[h.id] = c;
  }
  return out;
}

/** The habit with the most check-ins ever (ties → listed first); null before any check-in. */
export function mostCheckedHabit(t: Tracking, today: DateKey): { habitId: string; checkins: number } | null {
  const first = firstTrackedDay(t);
  if (first === null) return null;
  const counts = checkinCounts(t, first, today, today);
  let best: { habitId: string; checkins: number } | null = null;
  for (const h of [...t.habits].sort((a, b) => a.order - b.order)) {
    const n = counts[h.id]!.checkins;
    if (n > 0 && (!best || n > best.checkins)) best = { habitId: h.id, checkins: n };
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Goals on track                                                      */
/* ------------------------------------------------------------------ */

export interface HabitPace extends PeriodPace {
  habitId: string;
}

export interface GoalsOnTrack {
  onTrack: number;
  total: number;
  /** One entry per live flexible habit whose current period asks for ≥ 1 check-in. */
  paces: HabitPace[];
}

/** "Weekly & monthly goals: 3 of 5 on track" (see PeriodPace.onTrack for the gentle pace rule). */
export function goalsOnTrack(t: Tracking, today: DateKey): GoalsOnTrack {
  const ctx = evalContext(t, today);
  const paces: HabitPace[] = [];
  for (const h of t.habits) {
    if (!liveOn(h, today)) continue;
    const pace = periodPace(h, logsFor(t, h.id), ctx);
    if (pace && pace.target >= 1) paces.push({ habitId: h.id, ...pace });
  }
  return { onTrack: paces.filter((p) => p.onTrack).length, total: paces.length, paces };
}

/* ------------------------------------------------------------------ */
/* Strongest weekday & most consistent habit                           */
/* ------------------------------------------------------------------ */

export interface WeekdayInsight {
  weekday: Weekday;
  tally: Tally;
  percent: number;
  /** Another weekday shares the top rate (the UI may say "every day is strong"). */
  tie: boolean;
  /** Day-based tallies per weekday (index 0 = Sunday). */
  byWeekday: Tally[];
}

/**
 * The weekday with the best day-based consistency over the last `days` days (flexible habits have
 * no per-weekday expectation). Needs ≥ 10 expected overall and `minPerWeekday` per weekday.
 * Ties go to the higher count, then to the earlier day in the user's week.
 */
export function strongestWeekday(t: Tracking, today: DateKey, opts: { days?: number; minPerWeekday?: number } = {}): WeekdayInsight | null {
  const { days = 84, minPerWeekday = 3 } = opts;
  const ctx = evalContext(t, today);
  const w = trailingWindow(today, days);
  const byWeekday: Tally[] = Array.from({ length: 7 }, () => ({ ...EMPTY_TALLY }));
  for (const h of t.habits) {
    for (const ev of dayEvaluations(h, logsFor(t, h.id), w.start, w.end, ctx)) {
      const b = byWeekday[weekday(ev.date)]!;
      if (ev.outcome === 'achieved') {
        b.achieved++;
        b.expected++;
        if (ev.tiny) b.tiny++;
      } else if (ev.outcome === 'missed') b.expected++;
    }
  }
  const total = byWeekday.reduce(addTally, { ...EMPTY_TALLY });
  if (total.expected < MIN_EXPECTED_FOR_PCT) return null;
  let best: Weekday | null = null;
  for (const d of weekdayOrder(t.weekStart)) {
    const b = byWeekday[d]!;
    if (b.expected < minPerWeekday) continue;
    if (best === null) {
      best = d;
      continue;
    }
    const cur = byWeekday[best]!;
    const diff = ratio(b)! - ratio(cur)!;
    if (diff > 1e-12 || (Math.abs(diff) <= 1e-12 && b.achieved > cur.achieved)) best = d;
  }
  if (best === null) return null;
  const top = byWeekday[best]!;
  const tie = weekdayOrder(t.weekStart).some(
    (d) => d !== best && byWeekday[d]!.expected >= minPerWeekday && Math.abs(ratio(byWeekday[d]!)! - ratio(top)!) <= 1e-12,
  );
  return { weekday: best, tally: top, percent: percent(top)!, tie, byWeekday };
}

export interface HabitInsight {
  habitId: string;
  tally: Tally;
  percent: number;
}

/**
 * The habit with the best consistency among those with ≥ 10 expected occurrences. By default: live
 * habits over the last `days` days. With an explicit `window` (e.g. a closed month, for its "best
 * fact"): every habit whose lifetime overlaps it. Ties go to more evidence (expected), then to the
 * habit listed first.
 */
export function mostConsistentHabit(t: Tracking, today: DateKey, opts: { days?: number; window?: StatWindow } = {}): HabitInsight | null {
  const { days = 90 } = opts;
  const ctx = evalContext(t, today);
  const w = opts.window ?? trailingWindow(today, days);
  const eligible = (h: Habit): boolean =>
    opts.window ? h.startedOn <= w.end && (h.archivedOn === undefined || h.archivedOn >= w.start) : liveOn(h, today);
  let best: HabitInsight | null = null;
  for (const h of [...t.habits].sort((a, b) => a.order - b.order)) {
    if (!eligible(h)) continue;
    const tally = habitTally(h, logsFor(t, h.id), w, ctx);
    if (!isPctReady(tally)) continue;
    if (best) {
      const diff = ratio(tally)! - ratio(best.tally)!;
      if (diff < -1e-12 || (Math.abs(diff) <= 1e-12 && tally.expected <= best.tally.expected)) continue;
    }
    best = { habitId: h.id, tally, percent: percent(tally)! };
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Busiest time of day                                                 */
/* ------------------------------------------------------------------ */

export type TimeBlock = 'morning' | 'midday' | 'evening' | 'night';
export const TIME_BLOCKS: readonly TimeBlock[] = ['morning', 'midday', 'evening', 'night'];

/** Wall-clock blocks: morning 5–11, midday 11–17, evening 17–22, night 22–5. */
export function timeBlockOf(hour: number): TimeBlock {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export interface TimeOfDayInsight {
  block: TimeBlock;
  /** Local hour (0–23) with the most check-ins. */
  peakHour: number;
  /** Weighted check-ins per block and per hour (each habit-day weighs 1, split across its taps). */
  blocks: Record<TimeBlock, number>;
  hours: number[];
  /** Habit-days with live stamps in the window. */
  total: number;
}

/**
 * When check-ins happen, from live `at` stamps only (backfills carry none, DESIGN v1 §13.2). Each
 * habit-day weighs 1, split across its taps, so an 8-glass water habit does not drown out a walk.
 * Null with fewer than `minCheckins` habit-days.
 */
export function busiestTimeOfDay(
  t: Tracking,
  today: DateKey,
  local: LocalTimeReader = runtimeLocalTime,
  opts: { days?: number; minCheckins?: number } = {},
): TimeOfDayInsight | null {
  const { days = 90, minCheckins = 5 } = opts;
  const start = addDays(today, -(days - 1));
  const blocks: Record<TimeBlock, number> = { morning: 0, midday: 0, evening: 0, night: 0 };
  const hours = new Array<number>(24).fill(0);
  let total = 0;
  for (const h of t.habits) {
    for (const [date, log] of Object.entries(logsFor(t, h.id))) {
      if (date < start || date > today || log.kind !== 'log' || !log.at || log.at.length === 0 || !isDateKey(date)) continue;
      const weight = 1 / log.at.length;
      for (const ms of log.at) {
        if (!Number.isFinite(ms)) continue;
      const hour = local(ms).hour;
        hours[hour]! += weight;
        blocks[timeBlockOf(hour)] += weight;
      }
      total++;
    }
  }
  if (total < minCheckins) return null;
  const block = TIME_BLOCKS.reduce((a, b) => (blocks[b] > blocks[a] + 1e-9 ? b : a));
  let peakHour = 0;
  for (let hr = 1; hr < 24; hr++) if (hours[hr]! > hours[peakHour]! + 1e-9) peakHour = hr;
  return { block, peakHour, blocks, hours, total };
}

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export interface Records {
  /** Days showing up (done or tiny) summed over every habit, archived included. */
  totalCheckins: number;
  tinyCheckins: number;
  /** Best streak of any habit, by occurrence-equivalent (ties → the more recent). */
  bestStreak: { habitId: string; run: StreakRun } | null;
  /** Best closed month with ≥ 10 expected (ties → the more recent). */
  bestMonth: { month: MonthKey; tally: Tally; percent: number } | null;
}

export function records(t: Tracking, today: DateKey): Records {
  const ctx = evalContext(t, today);
  const first = firstTrackedDay(t);
  let totalCheckins = 0;
  let tinyCheckins = 0;
  for (const c of Object.values(first === null ? {} : checkinCounts(t, first, today, today))) {
    totalCheckins += c.checkins;
    tinyCheckins += c.tiny;
  }
  let bestStreak: Records['bestStreak'] = null;
  for (const h of t.habits) {
    const run = streakInfo(h, logsFor(t, h.id), ctx).best;
    if (run && (!bestStreak || run.occurrences > bestStreak.run.occurrences || (run.occurrences === bestStreak.run.occurrences && run.end > bestStreak.run.end))) {
      bestStreak = { habitId: h.id, run };
    }
  }
  let bestMonth: Records['bestMonth'] = null;
  if (first !== null) {
    for (let i = monthIndex(first); i < monthIndex(today); i++) {
      const tally = aggregateTally(t, monthWindow(monthFromIndex(i)), today).total;
      if (!isPctReady(tally)) continue;
      if (!bestMonth || ratio(tally)! >= ratio(bestMonth.tally)! - 1e-12) bestMonth = { month: monthFromIndex(i), tally, percent: percent(tally)! };
    }
  }
  return { totalCheckins, tinyCheckins, bestStreak, bestMonth };
}
