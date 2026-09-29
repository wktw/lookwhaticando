/**
 * Adversarial math review: consistency, flexible periods and rule edits against DESIGN §5.3, §13.2
 * and §13.3, to the letter. Tests marked [FAILS] are evidence of a defect (kept on purpose); the
 * others pin invariants the existing suite did not cover.
 */
import { describe, expect, it } from 'vitest';
import type { DateKey, Habit } from '@/state/types';
import { evaluateDay, type EvalContext, type HabitLogs } from '@/domain/activity';
import { habitTally, monthWindow, weekWindow, type StatWindow, type Tally } from '@/domain/consistency';
import { addDays, eachDay, firstDayOfMonthIndex, lastDayOfMonthIndex, monthIndex, startOfWeek } from '@/domain/dates';
import { periodEvaluations } from '@/domain/periods';
import { mulberry32, randomInt } from '@/domain/rng';
import { withRuleEdit } from '@/domain/rules';
import { streakInfo } from '@/domain/streaks';
import * as habitsDomain from '@/domain/habits';
import { logsOf, trackingCtx } from '@/domain/economy';
import { ctx, habit, monthly, on, weekly } from '../helpers';
import { randomEdits, randomWorld, type World } from '../random';
import { Game } from '../game';

const SEEDS = Array.from({ length: 40 }, (_, i) => 2027 + i * 104_729);
const ctxOf = (w: World, today: DateKey): EvalContext => ({ today, weekStart: w.weekStart, offDays: w.offDays });

/**
 * "Missed debt" settled before `c.today`: past day-based occurrences that count as not done, plus
 * the unmet part (expected − achieved) of every flexible period that closed before today.
 */
function settledDebt(h: Habit, logs: HabitLogs, c: EvalContext): { days: DateKey[]; periods: string[]; total: number } {
  const days: DateKey[] = [];
  for (const d of eachDay(h.startedOn, addDays(c.today, -1))) if (evaluateDay(h, logs, d, c).outcome === 'missed') days.push(d);
  const periods: string[] = [];
  let total = days.length;
  for (const p of periodEvaluations(h, logs, h.startedOn, addDays(c.today, -1), c)) {
    if (p.state !== 'closed' || p.skipped || p.expected === p.achieved) continue;
    periods.push(`${p.from}…${p.to} ${p.achieved}/${p.expected}`);
    total += p.expected - p.achieved;
  }
  return { days, periods, total };
}

const debt = (t: Tally) => t.expected - t.achieved;

/* ------------------------------------------------------------------ */
/* Rule edits made "this period" must not reach back into history      */
/* ------------------------------------------------------------------ */

describe('rule edits never create debt in the past (DESIGN §13.2 "edits never rewrite history", §5.3 "nothing that has not had a chance to happen counts against you")', () => {
  it('[FAILS] monthly → daily edited on Sep 29 "this period": Sep 1–28 must not become 27 missed daily days', () => {
    const g = new Game({ start: '2026-08-03' });
    const id = g.addHabit({ name: 'Deep clean', schedule: { kind: 'monthly', times: 1, every: 1 } });
    g.goTo('2026-09-03');
    g.checkIn(id); // September's goal is met
    g.goTo('2026-09-29');
    const sep = () => habitTally(g.state.habits.find((h) => h.id === id)!, logsOf(g.state, id), monthWindow('2026-09'), trackingCtx(g.state, g.today));
    expect(sep()).toEqual({ achieved: 1, expected: 1, tiny: 0 });

    g.run((tx) => habitsDomain.updateHabit(tx, id, { schedule: { kind: 'daily' } }, 'today'));

    // Sep 1–28 were never daily occurrences: the user had no chance to do them "daily".
    // Observed: the new daily rule is back-dated to Sep 1 → { achieved: 1, expected: 28 } (1 of 28 = 4%).
    expect(debt(sep())).toBe(0);
  });

  it('[FAILS] monthly 2× → weekly 3× edited on Sep 29 "this period": the weeks that already closed must not count as unmet', () => {
    const g = new Game({ start: '2026-08-03' });
    const id = g.addHabit({ name: 'Yoga', schedule: { kind: 'monthly', times: 2, every: 1 } });
    g.goTo('2026-09-03');
    g.checkIn(id);
    g.goTo('2026-09-10');
    g.checkIn(id); // monthly goal met (2 of 2)
    g.goTo('2026-09-29');
    const h = () => g.state.habits.find((x) => x.id === id)!;
    const sep = () => habitTally(h(), logsOf(g.state, id), monthWindow('2026-09'), trackingCtx(g.state, g.today));
    expect(sep()).toEqual({ achieved: 2, expected: 2, tiny: 0 });
    const before = settledDebt(h(), logsOf(g.state, id), trackingCtx(g.state, g.today));

    g.run((tx) => habitsDomain.updateHabit(tx, id, { schedule: { kind: 'weekly', times: 3, every: 1 } }, 'today'));

    // Observed: the weekly rule starts Sep 1, so Sep 1–6, 7–13, 14–20 and 21–27 become *closed*
    // weekly periods the user never had → September reads { achieved: 2, expected: 12 } (17%).
    const after = settledDebt(h(), logsOf(g.state, id), trackingCtx(g.state, g.today));
    expect(after.periods.filter((p) => !before.periods.includes(p))).toEqual([]);
    expect(debt(sep())).toBe(0);
  });

  it('[FAILS] property: for random habits and edit sequences, an edit never adds settled debt before the edit day', () => {
    const offenders: string[] = [];
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const w = randomWorld(rng);
      let h = w.habit;
      for (const edit of randomEdits(rng, w)) {
        const c = ctxOf(w, edit.day);
        const before = settledDebt(h, w.logs, c);
        const next = withRuleEdit(h, edit.content, edit.day, edit.timing, w.weekStart);
        const after = settledDebt(next, w.logs, c);
        if (after.total > before.total) {
          const from = next.rules.find((r) => !h.rules.includes(r))?.from ?? '?';
          offenders.push(`seed ${seed}: ${h.rules.at(-1)!.schedule.kind}→${edit.content.schedule.kind} on ${edit.day} (${edit.timing}, from ${from}): debt ${before.total}→${after.total}`);
        }
        h = next;
      }
    }
    // Observed: every offender is a 'today' ("this period") edit of a flexible habit whose new rule
    // is back-dated to the start of the old period and changes the day/period geometry.
    expect(offenders).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Off days are transparent                                            */
/* ------------------------------------------------------------------ */

describe('"Take today off" is transparent for every habit (DESIGN §13.2)', () => {
  it('[FAILS] taking today (Friday) off never raises this week\'s expected check-ins of a 3×/week habit', () => {
    const h = habit({ startedOn: '2026-09-21', schedule: weekly(3) }); // Monday
    const w = weekWindow('2026-09-25', 1);
    const plain = habitTally(h, {}, w, ctx('2026-09-25'));
    const off = habitTally(h, {}, w, ctx('2026-09-25', { offDays: ['2026-09-25'] }));
    expect(plain).toEqual({ achieved: 0, expected: 0, tiny: 0 });
    // Observed: { achieved: 0, expected: 1 }. With the day off, target = round(3 × 6/7) = 3 still,
    // but only Sat and Sun remain, so the §13.3 current-period shortfall becomes 1: the day off makes
    // the week look *worse* than not taking it. (§13.3's rounding conflicts with §13.2's promise.)
    expect(off.expected).toBeLessThanOrEqual(plain.expected);
  });

  it('a day off never raises expected occurrences of a closed period or a day-based habit (passes)', () => {
    for (const seed of SEEDS.slice(0, 15)) {
      const rng = mulberry32(seed);
      const w = randomWorld(rng);
      const T = addDays(w.habit.startedOn, randomInt(rng, 20, 140));
      const day = addDays(T, -randomInt(rng, 1, 60));
      if (w.offDays[day]) continue;
      const withOff = { ...w.offDays, [day]: true as const };
      // Calendar attribution with a window ending yesterday: only past days and periods that closed
      // before T count (the current period's last day is ≥ T, outside the window).
      const win: StatWindow = { start: addDays(T, -90), end: addDays(T, -1), attribution: 'calendar' };
      const a = habitTally(w.habit, w.logs, win, ctxOf(w, T));
      const b = habitTally(w.habit, w.logs, win, { ...ctxOf(w, T), offDays: withOff });
      expect(debt(b), `seed ${seed} off ${day}`).toBeLessThanOrEqual(debt(a));
    }
  });
});

/* ------------------------------------------------------------------ */
/* Invariants that hold (not covered elsewhere)                        */
/* ------------------------------------------------------------------ */

describe('attribution partitions time exactly (DESIGN §13.3: a period belongs to the month of its last day)', () => {
  it.each(SEEDS.slice(0, 20))('seed %i: consecutive month tallies add up to the tally of their union', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng);
    let h = w.habit;
    for (const e of randomEdits(rng, w)) h = withRuleEdit(h, e.content, e.day, e.timing, w.weekStart);
    const T = addDays(h.startedOn, randomInt(rng, 30, 150));
    const c = ctxOf(w, T);
    const first = monthIndex(h.startedOn) - 1;
    const last = monthIndex(T) + 1;
    let sum: Tally = { achieved: 0, expected: 0, tiny: 0 };
    for (let i = first; i <= last; i++) {
      const t = habitTally(h, w.logs, monthWindow(firstDayOfMonthIndex(i)), c);
      sum = { achieved: sum.achieved + t.achieved, expected: sum.expected + t.expected, tiny: sum.tiny + t.tiny };
    }
    const union = habitTally(h, w.logs, { start: firstDayOfMonthIndex(first), end: lastDayOfMonthIndex(last), attribution: 'calendar' }, c);
    expect(sum).toEqual(union);
  });

  it.each(SEEDS.slice(0, 20))('seed %i: consecutive calendar-week tallies add up to the tally of their union', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng);
    const T = addDays(w.habit.startedOn, randomInt(rng, 30, 150));
    const c = ctxOf(w, T);
    const start = startOfWeek(addDays(T, -70), w.weekStart);
    let sum: Tally = { achieved: 0, expected: 0, tiny: 0 };
    for (let d = start; d <= T; d = addDays(d, 7)) {
      const t = habitTally(w.habit, w.logs, weekWindow(d, w.weekStart), c);
      sum = { achieved: sum.achieved + t.achieved, expected: sum.expected + t.expected, tiny: sum.tiny + t.tiny };
    }
    const union = habitTally(w.habit, w.logs, { start, end: addDays(startOfWeek(T, w.weekStart), 6), attribution: 'calendar' }, c);
    expect(sum).toEqual(union);
  });
});

describe('a check-in only ever helps (DESIGN §3.1 growth is monotonic; §5.3)', () => {
  it.each(SEEDS.slice(0, 25))('seed %i: adding a check-in never adds debt, never lowers achieved, never shortens a streak', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng);
    let h = w.habit;
    for (const e of randomEdits(rng, w)) h = withRuleEdit(h, e.content, e.day, e.timing, w.weekStart);
    for (let i = 0; i < 6; i++) {
      const T = addDays(h.startedOn, randomInt(rng, 10, 150));
      const d = addDays(T, -randomInt(rng, 0, 40));
      if (d < h.startedOn) continue;
      const c = ctxOf(w, T);
      const logs2: HabitLogs = { ...w.logs, [d]: { kind: 'log', count: 100 } };
      for (const win of [monthWindow(d), weekWindow(d, w.weekStart), { start: addDays(T, -29), end: T, attribution: 'trailing' as const }]) {
        const a = habitTally(h, w.logs, win, c);
        const b = habitTally(h, logs2, win, c);
        expect(b.achieved, `seed ${seed} +${d} achieved`).toBeGreaterThanOrEqual(a.achieved);
        expect(debt(b), `seed ${seed} +${d} debt`).toBeLessThanOrEqual(debt(a));
      }
      const s1 = streakInfo(h, w.logs, c);
      const s2 = streakInfo(h, logs2, c);
      expect(s2.best?.occurrences ?? 0, `seed ${seed} +${d} best`).toBeGreaterThanOrEqual(s1.best?.occurrences ?? 0);
      expect(s2.current?.occurrences ?? 0, `seed ${seed} +${d} current`).toBeGreaterThanOrEqual(s1.current?.occurrences ?? 0);
    }
  });
});

describe('date boundaries (DESIGN §11 dates, §13.3 attribution)', () => {
  it('a week spanning New Year belongs to January; December is not charged for it', () => {
    // Mon-start week Dec 28 2026 – Jan 3 2027; a 2×/week habit with one check-in on Dec 29.
    const h = habit({ startedOn: '2026-12-07', schedule: weekly(2) });
    const l = on(['2026-12-08', '2026-12-09', '2026-12-15', '2026-12-16', '2026-12-22', '2026-12-23', '2026-12-29']);
    const c = ctx('2027-01-05');
    expect(habitTally(h, l, monthWindow('2026-12'), c)).toEqual({ achieved: 6, expected: 6, tiny: 0 });
    expect(habitTally(h, l, monthWindow('2027-01'), c)).toMatchObject({ achieved: 1, expected: 2 });
  });

  it('Feb 29: a leap-year monthly period has 29 days and still expects `times` when fully active', () => {
    const h = habit({ startedOn: '2028-01-10', schedule: monthly(3) });
    const c = ctx('2028-03-02');
    const feb = periodEvaluations(h, {}, '2028-02-01', '2028-02-29', c).find((p) => p.key === '2028-02-01')!;
    expect(feb).toMatchObject({ totalDays: 29, activeDays: 29, target: 3, expected: 3, state: 'closed' });
    // Paused Feb 15–29 (15 of 29 days): round(3 × 14/29) = round(1.45) = 1.
    const paused = habit({ startedOn: '2028-01-10', schedule: monthly(3), pauses: [{ start: '2028-02-15', end: '2028-02-29' }] });
    expect(periodEvaluations(paused, {}, '2028-02-01', '2028-02-29', c)[0]).toMatchObject({ activeDays: 14, target: 1 });
  });
});
