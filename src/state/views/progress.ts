/**
 * The Progress screen view-model (DESIGN §9.2, with the phrases and comparisons of §5.4 and The
 * Cutting of §13). Lower numbers are never phrased as a loss: a quieter month shows its best fact
 * instead of the comparison, never in red and never the higher previous number.
 */
import { BADGES } from '@/catalog/badges';
import type { AppState, DateKey, Habit } from '../types';
import { EMPTY_TALLY, addTally, aggregateTally, habitTally, isPctReady, monthToDateComparison, monthWindow, percent, trackingOf, weekWindow, trailingWindow, type Tally } from '@/domain/consistency';
import { WEEKDAY_NAMES, eachDay, endOfMonth, monthFromIndex, monthIndex, monthLabel, spanLabel, type MonthKey } from '@/domain/dates';
import type { CuttingVM } from '@/domain/growth';
import { busiestTimeOfDay, checkinCounts, firstTrackedDay, goalsOnTrack, mostConsistentHabit, showedUpDays, strongestWeekday, type TimeBlock } from '@/domain/insights';
import { inLifetime, logStatus, showedUp } from '@/domain/activity';
import { cuttingOf, logsOf, memoByHabit, streakOf, trackingCtx } from '@/domain/economy';
import { ruleAt } from '@/domain/rules';
import type { StreakRun } from '@/domain/streaks';
import { tallyVM, type TallyVM } from './calendar';
import { habitName, plantVM, streakLabel, type PlantVM, type ViewEnv } from './common';

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
    /** Before 10 expected: "4 of 4 so far" instead of a percentage. */
    soFar: string;
  };
  /** "6 / 7 this week" */
  week: { tally: TallyVM; label: string };
  /**
   * Month-to-date vs the same span of last month: 'up' ("↑ 6 pts vs Sep 1–12"), 'same', or 'fact'
   * when lower (the month's best fact; the higher previous number is never printed). 'none' until
   * both sides have ≥ 10 expected.
   */
  trend: { kind: 'up' | 'same' | 'fact' | 'none'; deltaPts: number | null; text: string | null; comparedWith: string };
  /** Up to six closed months (none before tracking began) then the current month-to-date, oldest first ("81% → 87% → 91%"). */
  recentMonths: { month: MonthKey; label: string; tally: TallyVM; current: boolean }[];
  /** "You showed up 26 of the last 30 days" */
  showedUp: { days: number; span: number; text: string };
  /** "Weekly & monthly goals: 3 of 5 on track" (null text when there are none). */
  goals: { onTrack: number; total: number; text: string | null };
  /** Rests in numbers, last 30 days: "2 rests · 1 day off" (§5.4 "26 of 28 days · 2 rests"). */
  rests: { rests: number; offDays: number; text: string | null };
  records: {
    totalCheckins: number;
    tinyCheckins: number;
    bestStreak: { habitId: string; name: string; label: string } | null;
    bestMonth: { month: MonthKey; label: string; percent: number } | null;
    perfectDays: number;
    showUpDays: number;
  };
  insights: {
    strongestWeekday: { weekday: number; name: string; percent: number } | null;
    mostConsistent: { habitId: string; name: string; percent: number } | null;
    busiestTime: { block: TimeBlock; label: string; peakHour: number } | null;
  };
  /** Every habit's plant: live habits in order, then the retired ones on the balcony shelf. */
  garden: GardenPlantVM[];
  /** The Cutting (§13): the lifetime gauge on total sunshine across all habits, deleted ones included. */
  cutting: CuttingVM;
  /** Pins earned (§9.2). */
  badges: { earned: number; total: number };
}

const BLOCK_LABEL: Record<TimeBlock, string> = { morning: 'Mornings', midday: 'Middays', evening: 'Evenings', night: 'Late nights' };

/** A month's best fact: "62 check-ins in September. Walk was your steadiest." (§5.4). */
export function bestFact(s: AppState, month: MonthKey, today: DateKey, current: boolean): string {
  const t = trackingOf(s);
  const start = `${month}-01`;
  const counts = checkinCounts(t, start, endOfMonth(start), today);
  const n = Object.values(counts).reduce((a, c) => a + c.checkins, 0);
  const steady = mostConsistentHabit(t, today, { window: monthWindow(month) });
  const name = monthLabel(month);
  const head = current ? `${n} check-ins so far in ${name}.` : `${n} check-ins in ${name}.`;
  const steadyName = steady ? habitName(s, steady.habitId) : null;
  return steadyName ? `${head} ${steadyName} ${current ? 'is' : 'was'} your steadiest.` : head;
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

export function progressVM(s: AppState, env: ViewEnv): ProgressVM {
  const today = env.today;
  const t = trackingOf(s);
  const month = today.slice(0, 7);
  const monthTally = tallyVM(aggregateTally(t, monthWindow(month), today).total);
  const weekTally = tallyVM(aggregateTally(t, weekWindow(today, s.settings.weekStart), today).total);

  const cmp = monthToDateComparison(t, today);
  const comparedWith = spanLabel(cmp.previous.start, cmp.previous.asOf);
  let trend: ProgressVM['trend'];
  if (cmp.deltaPts === null) trend = { kind: 'none', deltaPts: null, text: null, comparedWith };
  else if (cmp.deltaPts > 0) trend = { kind: 'up', deltaPts: cmp.deltaPts, text: `↑ ${cmp.deltaPts} pts vs ${comparedWith}`, comparedWith };
  else if (cmp.deltaPts === 0) trend = { kind: 'same', deltaPts: 0, text: `Right in step with ${comparedWith}`, comparedWith };
  else trend = { kind: 'fact', deltaPts: cmp.deltaPts, text: bestFact(s, month, today, true), comparedWith };

  const first = firstTrackedDay(t);
  const rec = progressRecords(s, today);
  const cur = monthIndex(today);
  const series: ProgressVM['recentMonths'] = [];
  for (let i = cur - 6; i <= cur; i++) {
    const m = monthFromIndex(i);
    if (first === null || m < first.slice(0, 7)) continue;
    const tally = i === cur ? monthTally : tallyVM(rec.closedMonths.get(m) ?? EMPTY_TALLY);
    series.push({ month: m, label: monthLabel(m, 'short'), tally, current: i === cur });
  }
  const shown = showedUpDays(t, today, 30);
  const goals = goalsOnTrack(t, today);

  const window30 = trailingWindow(today, 30);
  let rests = 0;
  for (const h of s.habits) for (const [d, log] of Object.entries(s.logs[h.id] ?? {})) if (log.kind === 'rest' && d >= window30.start && d <= today) rests++;
  const offDays = eachDay(window30.start, today).filter((d) => s.offDays[d]).length;
  const restBits = [rests > 0 ? `${rests} rest${rests === 1 ? '' : 's'}` : null, offDays > 0 ? `${offDays} day${offDays === 1 ? '' : 's'} off` : null].filter(Boolean);

  const strongest = strongestWeekday(t, today);
  const steady = mostConsistentHabit(t, today);
  const busiest = busiestTimeOfDay(t, today, env.local);

  const byOrder = [...s.habits].sort((a, b) => a.order - b.order);
  const garden: GardenPlantVM[] = [
    ...byOrder.filter((h) => h.archivedOn === undefined),
    ...byOrder.filter((h) => h.archivedOn !== undefined),
  ].map((h) => ({ habitId: h.id, habitName: h.name, icon: h.icon, retired: h.archivedOn !== undefined, plant: plantVM(s, h, today, env.local) }));

  return {
    hero: {
      month,
      label: monthLabel(month),
      tally: monthTally,
      soFar: `${monthTally.achieved} of ${monthTally.expected} so far`,
    },
    week: { tally: weekTally, label: `${weekTally.achieved} / ${weekTally.expected} this week` },
    trend,
    recentMonths: series,
    showedUp: { days: shown.days, span: shown.span, text: `You showed up ${shown.days} of the last ${shown.span} days` },
    goals: { onTrack: goals.onTrack, total: goals.total, text: goals.total > 0 ? `Weekly & monthly goals: ${goals.onTrack} of ${goals.total} on track` : null },
    rests: { rests, offDays, text: restBits.length > 0 ? restBits.join(' · ') : null },
    records: {
      totalCheckins: rec.totalCheckins,
      tinyCheckins: rec.tinyCheckins,
      bestStreak: rec.best ? { habitId: rec.best.habit.id, name: rec.best.habit.name, label: streakLabel(rec.best.run.length, rec.best.run.unit, rec.best.habit.polarity) } : null,
      bestMonth: rec.bestMonth ? { month: rec.bestMonth.month, label: monthLabel(rec.bestMonth.month), percent: percent(rec.bestMonth.tally)! } : null,
      perfectDays: s.lifetime.perfectDays,
      showUpDays: s.lifetime.showUpDays,
    },
    insights: {
      strongestWeekday: strongest ? { weekday: strongest.weekday, name: WEEKDAY_NAMES[strongest.weekday]!, percent: strongest.percent } : null,
      mostConsistent: steady ? { habitId: steady.habitId, name: habitName(s, steady.habitId) ?? '', percent: steady.percent } : null,
      busiestTime: busiest ? { block: busiest.block, label: BLOCK_LABEL[busiest.block], peakHour: busiest.peakHour } : null,
    },
    garden,
    cutting: cuttingOf(s),
    badges: { earned: BADGES.filter((b) => s.badges[b.id] !== undefined).length, total: BADGES.length },
  };
}
