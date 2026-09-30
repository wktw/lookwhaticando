/**
 * The Progress screen view-model (DESIGN §9.2, with the phrases and comparisons of §5.4 and The
 * Cutting of §13). Lower numbers are never phrased as a loss: a quieter month shows its best fact
 * instead of the comparison, never in red and never the higher previous number.
 *
 * Numbers only: the words (VOICE.md §6) come from src/catalog/format.ts: `showedUpLine`,
 * `monthSoFarLine`, `soFarLine`, `weekLine`, `trendLine`, `goalsLine`, `restsLine`,
 * `monthBarLabel`, `recordLines`, `insightLines`, `forecastLine` (garden plants).
 */
import { BADGES } from '@/catalog/badges';
import type { AppState, DateKey, Habit } from '../types';
import { EMPTY_TALLY, addTally, aggregateTally, habitTally, isPctReady, monthToDateComparison, monthWindow, percent, trackingOf, weekWindow, trailingWindow, type Tally } from '@/domain/consistency';
import { WEEKDAY_NAMES, eachDay, endOfMonth, monthFromIndex, monthIndex, monthLabel, zoneKey, type MonthKey } from '@/domain/dates';
import type { BestFact, RunData, TrendData } from '@/catalog/format';
import type { CuttingVM } from '@/domain/growth';
import { busiestTimeOfDay, checkinCounts, firstTrackedDay, goalsOnTrack, mostConsistentHabit, showedUpDays, showedUpDaysIn, strongestWeekday, type TimeBlock } from '@/domain/insights';
import { inLifetime, logStatus, showedUp } from '@/domain/activity';
import { cuttingOf, logsOf, memoByHabit, streakOf, trackingCtx } from '@/domain/economy';
import { ruleAt } from '@/domain/rules';
import type { StreakRun } from '@/domain/streaks';
import { tallyVM, type TallyVM } from './calendar';
import { habitName, plantVM, type PlantVM, type ViewEnv } from './common';

export interface GardenPlantVM {
  habitId: string;
  habitName: string;
  icon: string;
  /** An archived habit: its plant lives on the balcony shelf for good (§8.4, §9.2). */
  retired: boolean;
  plant: PlantVM;
}

export interface ProgressVM {
  hero: {
    month: MonthKey;
    /** "September" */
    label: string;
    tally: TallyVM;
    /** Days showing up this month so far: `monthSoFarLine` → "September so far: 22 of 29 days". Below 10 expected, `soFarLine(tally)` → "4 of 4 so far". */
    daysSoFar: { days: number; span: number };
  };
  /** This week: `weekLine(week.tally)` → "6 of 7 this week". */
  week: { tally: TallyVM };
  /**
   * Month-to-date vs the same span of last month (`trendLine`): 'up' ("Up on the same days last
   * month"), 'level' ("Level with…"), or 'fact' when lower (the month's best fact; the higher
   * previous number is never printed). 'none' until both sides have ≥ 10 expected.
   */
  trend: TrendData & { deltaPts: number | null; previous: { start: DateKey; asOf: DateKey } };
  /** Up to six closed months (none before tracking began) then the current month-to-date, oldest first; `monthBarLabel(m)` → "Aug · 24 days". */
  recentMonths: { month: MonthKey; label: string; tally: TallyVM; current: boolean; days: number }[];
  /** `showedUpLine` → "You showed up 26 of the last 30 days". */
  showedUp: { days: number; span: number };
  /** `goalsLine` → "3 goals on track" (no line when none are). */
  goals: { onTrack: number; total: number };
  /** Rests in numbers, last 30 days: `restsLine` → "2 rests · 1 day off" (§5.4 "26 of 28 days · 2 rests"). */
  rests: { rests: number; offDays: number };
  /** `recordLines(records)`. */
  records: {
    totalCheckins: number;
    tinyCheckins: number;
    bestStreak: ({ habitId: string; name: string } & RunData) | null;
    bestMonth: { month: MonthKey; label: string; percent: number } | null;
    perfectDays: number;
    showUpDays: number;
  };
  /** `insightLines(insights)`. */
  insights: {
    strongestWeekday: { weekday: number; name: string; percent: number } | null;
    mostConsistent: { habitId: string; name: string; percent: number } | null;
    busiestTime: { block: TimeBlock; peakHour: number } | null;
  };
  /** Every habit's plant: live habits in order, then the retired ones on the balcony shelf. */
  garden: GardenPlantVM[];
  /** The Cutting (§13): the lifetime gauge on total sunshine across all habits, deleted ones included. */
  cutting: CuttingVM;
  /** Pins earned (§9.2). */
  badges: { earned: number; total: number };
}

/** A month's best fact (§5.4), for `bestFactLine`: "62 waterings so far in September. Walk is the steadiest." */
export function bestFact(s: AppState, month: MonthKey, today: DateKey, current: boolean): BestFact {
  const t = trackingOf(s);
  const start = `${month}-01`;
  const counts = checkinCounts(t, start, endOfMonth(start), today);
  const waterings = Object.values(counts).reduce((a, c) => a + c.checkins, 0);
  const steady = mostConsistentHabit(t, today, { window: monthWindow(month) });
  return { month, current, waterings, steadiest: steady ? habitName(s, steady.habitId) : null };
}

/** One habit's record material, memoised per (habit, logs, day): check-ins, best streak, closed-month tallies. */
interface HabitRecords {
  checkins: number;
  tiny: number;
  best: StreakRun | null;
  /** Tallies of the closed months of its lifetime (a closed month's tally never changes). */
  months: Map<MonthKey, Tally>;
}

function habitRecords(s: AppState, habit: Habit, today: DateKey): HabitRecords {
  const logs = logsOf(s, habit.id);
  const ctx = trackingCtx(s, today);
  return memoByHabit(habit, logs, ctx, 'records', () => {
    let checkins = 0;
    let tiny = 0;
    for (const [date, log] of Object.entries(logs)) {
      if (date > today || !inLifetime(habit, date)) continue;
      const st = logStatus(log, ruleAt(habit, date), date < today);
      if (showedUp(st)) checkins++;
      if (st === 'tiny') tiny++;
    }
    const months = new Map<MonthKey, Tally>();
    const last = monthIndex(today) - 1;
    const end = habit.archivedOn ? Math.min(last, monthIndex(habit.archivedOn)) : last;
    for (let i = monthIndex(habit.startedOn); i <= end; i++) {
      const m = monthFromIndex(i);
      months.set(m, habitTally(habit, logs, monthWindow(m), ctx));
    }
    return { checkins, tiny, best: streakOf(habit, logs, ctx).best, months };
  });
}

/** Records (§9.2) from the memoised per-habit bundles: same rules as insights.records. */
export function progressRecords(s: AppState, today: DateKey): { totalCheckins: number; tinyCheckins: number; best: { habit: Habit; run: StreakRun } | null; bestMonth: { month: MonthKey; tally: Tally } | null; closedMonths: Map<MonthKey, Tally> } {
  let totalCheckins = 0;
  let tinyCheckins = 0;
  let best: { habit: Habit; run: StreakRun } | null = null;
  const closedMonths = new Map<MonthKey, Tally>();
  for (const h of s.habits) {
    const r = habitRecords(s, h, today);
    totalCheckins += r.checkins;
    tinyCheckins += r.tiny;
    if (r.best && (!best || r.best.occurrences > best.run.occurrences || (r.best.occurrences === best.run.occurrences && r.best.end > best.run.end))) best = { habit: h, run: r.best };
    for (const [m, t] of r.months) closedMonths.set(m, addTally(closedMonths.get(m) ?? EMPTY_TALLY, t));
  }
  let bestMonth: { month: MonthKey; tally: Tally } | null = null;
  for (const m of [...closedMonths.keys()].sort()) {
    const t = closedMonths.get(m)!;
    if (!isPctReady(t)) continue;
    if (!bestMonth || t.achieved / t.expected >= bestMonth.tally.achieved / bestMonth.tally.expected - 1e-12) bestMonth = { month: m, tally: t };
  }
  return { totalCheckins, tinyCheckins, best, bestMonth, closedMonths };
}

/** A one-entry cache: the last value, kept while every part of its key is the same object or value. */
function lastOf<T>(): (key: readonly unknown[], fn: () => T) => T {
  let held: { key: readonly unknown[]; value: T } | null = null;
  return (key, fn) => {
    if (held && held.key.length === key.length && held.key.every((k, i) => k === key[i])) return held.value;
    const value = fn();
    held = { key, value };
    return value;
  };
}

type ProgressStats = Omit<ProgressVM, 'garden' | 'cutting' | 'badges' | 'records'> & { records: Omit<ProgressVM['records'], 'perfectDays' | 'showUpDays'> };
const statsMemo = lastOf<ProgressStats>();
const gardenMemo = lastOf<GardenPlantVM[]>();

/**
 * The Progress screen's numbers. Two parts walk the history, and each is kept until its own inputs
 * change (the save is copy-on-write, so an unchanged part keeps its identity): the statistics
 * (habits, logs, off days, the week's start, the day), and the plants (those, plus the growth
 * ledger), each also keyed by the zone the stamps are read in (`zoneKey`, P-history-04). A coin, a
 * pet moving or a pin costs nothing here.
 */
export function progressVM(s: AppState, env: ViewEnv): ProgressVM {
  const zone = zoneKey(env.local, env.timeZone);
  const stats = statsMemo([s.habits, s.logs, s.offDays, s.settings.weekStart, s.settings.dayStartsAt, env.today, env.local, zone], () => progressStats(s, env));
  const garden = gardenMemo([s.habits, s.logs, s.offDays, s.ledger, s.settings, env.today, env.local, zone], () => gardenOf(s, env));
  return {
    ...stats,
    records: { ...stats.records, perfectDays: s.lifetime.perfectDays, showUpDays: s.lifetime.showUpDays },
    garden,
    cutting: cuttingOf(s),
    badges: { earned: BADGES.filter((b) => s.badges[b.id] !== undefined).length, total: BADGES.length },
  };
}

/** Every habit's plant: live habits in order, then the retired ones on the balcony shelf. */
function gardenOf(s: AppState, env: ViewEnv): GardenPlantVM[] {
  const byOrder = [...s.habits].sort((a, b) => a.order - b.order);
  return [...byOrder.filter((h) => h.archivedOn === undefined), ...byOrder.filter((h) => h.archivedOn !== undefined)].map((h) => ({
    habitId: h.id,
    habitName: h.name,
    icon: h.icon,
    retired: h.archivedOn !== undefined,
    plant: plantVM(s, h, env.today, env.local),
  }));
}

function progressStats(s: AppState, env: ViewEnv): ProgressStats {
  const today = env.today;
  const t = trackingOf(s);
  const month = today.slice(0, 7);
  const monthTally = tallyVM(aggregateTally(t, monthWindow(month), today).total);
  const weekTally = tallyVM(aggregateTally(t, weekWindow(today, s.settings.weekStart), today).total);

  const cmp = monthToDateComparison(t, today);
  const previous = { start: cmp.previous.start, asOf: cmp.previous.asOf };
  let trend: ProgressVM['trend'];
  if (cmp.deltaPts === null) trend = { kind: 'none', deltaPts: null, previous };
  else if (cmp.deltaPts > 0) trend = { kind: 'up', deltaPts: cmp.deltaPts, previous };
  else if (cmp.deltaPts === 0) trend = { kind: 'level', deltaPts: 0, previous };
  else trend = { kind: 'fact', deltaPts: cmp.deltaPts, fact: bestFact(s, month, today, true), previous };

  const first = firstTrackedDay(t);
  const rec = progressRecords(s, today);
  const cur = monthIndex(today);
  const series: ProgressVM['recentMonths'] = [];
  for (let i = cur - 6; i <= cur; i++) {
    const m = monthFromIndex(i);
    if (first === null || m < first.slice(0, 7)) continue;
    const tally = i === cur ? monthTally : tallyVM(rec.closedMonths.get(m) ?? EMPTY_TALLY);
    const days = showedUpDaysIn(t, `${m}-01`, endOfMonth(`${m}-01`), today).days;
    series.push({ month: m, label: monthLabel(m, 'short'), tally, current: i === cur, days });
  }
  const shown = showedUpDays(t, today, 30);
  const goals = goalsOnTrack(t, today);

  const window30 = trailingWindow(today, 30);
  let rests = 0;
  for (const h of s.habits) for (const [d, log] of Object.entries(s.logs[h.id] ?? {})) if (log.kind === 'rest' && d >= window30.start && d <= today) rests++;
  const offDays = eachDay(window30.start, today).filter((d) => s.offDays[d]).length;

  const strongest = strongestWeekday(t, today);
  const steady = mostConsistentHabit(t, today);
  const busiest = busiestTimeOfDay(t, today, env.local);

  return {
    hero: {
      month,
      label: monthLabel(month),
      tally: monthTally,
      daysSoFar: (() => {
        const d = showedUpDaysIn(t, `${month}-01`, today, today);
        return { days: d.days, span: d.span };
      })(),
    },
    week: { tally: weekTally },
    trend,
    recentMonths: series,
    showedUp: { days: shown.days, span: shown.span },
    goals: { onTrack: goals.onTrack, total: goals.total },
    rests: { rests, offDays },
    records: {
      totalCheckins: rec.totalCheckins,
      tinyCheckins: rec.tinyCheckins,
      bestStreak: rec.best ? { habitId: rec.best.habit.id, name: rec.best.habit.name, length: rec.best.run.length, unit: rec.best.run.unit, polarity: rec.best.habit.polarity } : null,
      bestMonth: rec.bestMonth ? { month: rec.bestMonth.month, label: monthLabel(rec.bestMonth.month), percent: percent(rec.bestMonth.tally)! } : null,
    },
    insights: {
      strongestWeekday: strongest ? { weekday: strongest.weekday, name: WEEKDAY_NAMES[strongest.weekday]!, percent: strongest.percent } : null,
      mostConsistent: steady ? { habitId: steady.habitId, name: habitName(s, steady.habitId) ?? '', percent: steady.percent } : null,
      busiestTime: busiest ? { block: busiest.block, peakHour: busiest.peakHour } : null,
    },
  };
}
