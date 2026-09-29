/**
 * The Progress screen view-model (DESIGN §9.2 as amended by §13.3 phrases/comparisons, §13.10
 * best fact and Mochi's sprout, §13.11 "Rests in numbers"). Lower numbers are never phrased as a
 * loss: a lower month shows its best fact instead of the comparison.
 */
import type { PastelKey } from '@/catalog/types';
import { BADGES } from '@/catalog/badges';
import type { AppState, DateKey } from '../types';
import { aggregateTally, monthToDateComparison, monthWindow, monthlySeries, trackingOf, weekWindow, trailingWindow } from '@/domain/consistency';
import { WEEKDAY_NAMES, eachDay, endOfMonth, monthLabel, spanLabel, type MonthKey } from '@/domain/dates';
import { meadowSprout, type MeadowSprout } from '@/domain/growth';
import { busiestTimeOfDay, checkinCounts, firstTrackedDay, goalsOnTrack, mostCheckedHabit, mostConsistentHabit, records, showedUpDays, strongestWeekday, type TimeBlock } from '@/domain/insights';
import { tallyVM, type TallyVM } from './calendar';
import { habitName, plantVM, streakLabel, type PlantVM, type ViewEnv } from './common';

export interface GardenPlantVM {
  habitId: string;
  habitName: string;
  icon: string;
  /** Archived habits live on the Greenhouse shelf as permanent trophies (§13.10). */
  greenhouse: boolean;
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
  /** Rests in numbers (§13.11), last 30 days: "2 rests · 1 day off". */
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
  /** Every habit's plant: the shelf (live habits in order), then the greenhouse (archived). */
  garden: GardenPlantVM[];
  /** Mochi's whole-meadow sprout, blooming in the colour of the most-checked habit (§13.10). */
  sprout: MeadowSprout & { color: PastelKey | null };
  badges: { earned: number; total: number };
}

const BLOCK_LABEL: Record<TimeBlock, string> = { morning: 'Mornings', midday: 'Middays', evening: 'Evenings', night: 'Late nights' };

/** A month's best fact: "62 check-ins in September. Walks were your steadiest 🌿" (§13.10). */
export function bestFact(s: AppState, month: MonthKey, today: DateKey, current: boolean): string {
  const t = trackingOf(s);
  const start = `${month}-01`;
  const counts = checkinCounts(t, start, endOfMonth(start), today);
  const n = Object.values(counts).reduce((a, c) => a + c.checkins, 0);
  const steady = mostConsistentHabit(t, today, { window: monthWindow(month) });
  const name = monthLabel(month);
  const head = current ? `${n} check-ins so far in ${name}.` : `${n} check-ins in ${name}.`;
  const steadyName = steady ? habitName(s, steady.habitId) : null;
  return steadyName ? `${head} ${steadyName} ${current ? 'is' : 'was'} your steadiest 🌿` : head;
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
  const series = monthlySeries(t, today, { months: 6 })
    .filter((p) => first !== null && p.month >= first.slice(0, 7))
    .map((p) => ({ month: p.month, label: monthLabel(p.month, 'short'), tally: tallyVM(p.tally), current: p.current }));
  const shown = showedUpDays(t, today, 30);
  const goals = goalsOnTrack(t, today);

  const window30 = trailingWindow(today, 30);
  let rests = 0;
  for (const h of s.habits) for (const [d, log] of Object.entries(s.logs[h.id] ?? {})) if (log.kind === 'rest' && d >= window30.start && d <= today) rests++;
  const offDays = eachDay(window30.start, today).filter((d) => s.offDays[d]).length;
  const restBits = [rests > 0 ? `${rests} rest${rests === 1 ? '' : 's'} 🌙` : null, offDays > 0 ? `${offDays} day${offDays === 1 ? '' : 's'} off` : null].filter(Boolean);

  const rec = records(t, today);
  const bestHabit = rec.bestStreak ? s.habits.find((h) => h.id === rec.bestStreak!.habitId) : undefined;
  const strongest = strongestWeekday(t, today);
  const steady = mostConsistentHabit(t, today);
  const busiest = busiestTimeOfDay(t, today, env.local);

  const byOrder = [...s.habits].sort((a, b) => a.order - b.order);
  const garden: GardenPlantVM[] = [
    ...byOrder.filter((h) => h.archivedOn === undefined),
    ...byOrder.filter((h) => h.archivedOn !== undefined),
  ].map((h) => ({ habitId: h.id, habitName: h.name, icon: h.icon, greenhouse: h.archivedOn !== undefined, plant: plantVM(s, h, today) }));

  const totalSunshine = Object.values(s.ledger.sunshine).reduce((a, b) => a + b, 0);
  const most = mostCheckedHabit(t, today);
  const mostColor = most ? s.habits.find((h) => h.id === most.habitId)?.color ?? null : null;

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
      bestStreak: rec.bestStreak && bestHabit ? { habitId: bestHabit.id, name: bestHabit.name, label: streakLabel(rec.bestStreak.run.length, rec.bestStreak.run.unit, bestHabit.polarity) } : null,
      bestMonth: rec.bestMonth ? { month: rec.bestMonth.month, label: monthLabel(rec.bestMonth.month), percent: rec.bestMonth.percent } : null,
      perfectDays: s.lifetime.perfectDays,
      showUpDays: s.lifetime.showUpDays,
    },
    insights: {
      strongestWeekday: strongest ? { weekday: strongest.weekday, name: WEEKDAY_NAMES[strongest.weekday]!, percent: strongest.percent } : null,
      mostConsistent: steady ? { habitId: steady.habitId, name: habitName(s, steady.habitId) ?? '', percent: steady.percent } : null,
      busiestTime: busiest ? { block: busiest.block, label: BLOCK_LABEL[busiest.block], peakHour: busiest.peakHour } : null,
    },
    garden,
    sprout: { ...meadowSprout(totalSunshine), color: mostColor },
    badges: { earned: BADGES.filter((b) => s.badges[b.id] !== undefined).length, total: BADGES.length },
  };
}
