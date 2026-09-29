/**
 * Adversarial math review: streaks (DESIGN §5.4 as amended by §13.2/§13.3) and plant growth
 * (§5.5 as amended by §13.4 and §13.10). Tests marked [FAILS] are evidence of a defect; the others
 * pin invariants the existing suite did not cover.
 */
import { describe, expect, it } from 'vitest';
import type { DateKey } from '@/state/types';
import type { EvalContext } from '@/domain/activity';
import { addDays, diffDays, eachDay, startOfWeek } from '@/domain/dates';
import { logsOf, trackingCtx } from '@/domain/economy';
import {
  MEADOW_SPROUT_THRESHOLDS,
  STAGE_THRESHOLDS,
  bloomsFor,
  flourishesFor,
  meadowSprout,
  plantStage,
  sunshinePerOccurrence,
} from '@/domain/growth';
import * as habitsDomain from '@/domain/habits';
import * as logging from '@/domain/logging';
import { mulberry32, randomInt } from '@/domain/rng';
import { withRuleEdit } from '@/domain/rules';
import { isScheduledDate } from '@/domain/schedule';
import { ruleAt } from '@/domain/rules';
import { streakInfo, type StreakRun } from '@/domain/streaks';
import { progressVM, type ViewEnv } from '@/state/selectors';
import { ctx, habit, on, rule, weekly } from '../helpers';
import { randomEdits, randomWorld, type World } from '../random';
import { Game, UTC } from '../game';

const SEEDS = Array.from({ length: 30 }, (_, i) => 31_337 + i * 7_919);
const envOf = (g: Game): ViewEnv => ({ today: g.today, now: g.now, local: UTC });
const ctxOf = (w: World, today: DateKey): EvalContext => ({ today, weekStart: w.weekStart, offDays: w.offDays });

/** Calendar weeks touched by [start, end] for a week start. */
const weeksSpanned = (run: StreakRun, weekStart: 0 | 1): number =>
  diffDays(startOfWeek(run.start, weekStart), startOfWeek(run.end, weekStart)) / 7 + 1;

/* ------------------------------------------------------------------ */
/* Streak units                                                        */
/* ------------------------------------------------------------------ */

describe('weekly streaks count weeks (DESIGN §5.4 "Weekly: consecutive weeks where the period target was met. Unit: weeks")', () => {
  it('[FAILS] accepting "Ready to grow?" mid-week (new rule from tomorrow, §13.2) must not turn one week into two', () => {
    // 1×/week since Mon Aug 3, met every week; on Sat Sep 12 the habit grows to 2×/week from Sun Sep 13.
    const base = habit({ startedOn: '2026-08-03', schedule: weekly(1) });
    const grown = withRuleEdit(base, { schedule: weekly(2), target: 1, step: 1 }, '2026-09-12', 'tomorrow', 1);
    expect(grown.rules.map((r) => r.from)).toEqual(['2026-08-03', '2026-09-13']);
    const l = on(['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-13', '2026-09-14']);
    const s = streakInfo(grown, l, ctx('2026-09-14'));
    // Aug 3 … Sep 13 is exactly six calendar weeks. Observed: length 7 ("7 weeks") and a rung
    // measure of 8, because the stub Sep 13 (1 day, target 0) counts as a whole met week.
    expect(s.current!.start).toBe('2026-08-03');
    expect(s.current!.length).toBeLessThanOrEqual(weeksSpanned(s.current!, 1));
    expect(s.current!.length).toBe(6);
  });

  it('[FAILS] property: a weekly-rhythm streak never claims more weeks than the calendar weeks it spans', () => {
    const offenders: string[] = [];
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const w = randomWorld(rng, { days: 200 });
      let h = w.habit;
      for (const e of randomEdits(rng, w)) h = withRuleEdit(h, e.content, e.day, e.timing, w.weekStart);
      for (let i = 0; i < 10; i++) {
        const s = streakInfo(h, w.logs, ctxOf(w, addDays(h.startedOn, randomInt(rng, 7, 200))));
        for (const run of [s.current, s.best]) {
          if (run?.unit !== 'weeks') continue;
          const span = weeksSpanned(run, w.weekStart);
          if (run.length > span) offenders.push(`seed ${seed}: ${run.length} weeks over ${run.start}…${run.end} (${span} calendar weeks)`);
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it('day-based streaks never exceed the scheduled days they span (passes)', () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const w = randomWorld(rng, { days: 160 });
      let h = w.habit;
      for (const e of randomEdits(rng, w)) h = withRuleEdit(h, e.content, e.day, e.timing, w.weekStart);
      const s = streakInfo(h, w.logs, ctxOf(w, addDays(h.startedOn, randomInt(rng, 7, 160))));
      for (const run of [s.current, s.best]) {
        if (run?.unit !== 'days' && run?.unit !== 'times') continue;
        const scheduled = eachDay(run.start, run.end).filter((d) => isScheduledDate(ruleAt(h, d), d)).length;
        expect(run.length, `seed ${seed}`).toBeLessThanOrEqual(scheduled);
        expect(run.occurrences).toBe(run.length);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Plant growth                                                        */
/* ------------------------------------------------------------------ */

describe('plant stages (DESIGN §13.4)', () => {
  it('[FAILS] "a monthly habit can\'t jump from Seed to Budding": history filled in via the calendar, then one check-in', () => {
    const g = new Game({ start: '2026-09-29' });
    const id = g.addHabit({ name: 'Deep clean', schedule: { kind: 'monthly', times: 1, every: 1 } });
    // "Start tracking from Mar 1?" then the Progress calendar fills in six past months: history only,
    // no sunshine (§13.2).
    g.run((tx) => habitsDomain.setStartedOn(tx, id, '2026-03-01'));
    for (const d of ['2026-03-05', '2026-04-05', '2026-05-05', '2026-06-05', '2026-07-05', '2026-08-05']) g.run((tx) => logging.editHistory(tx, id, d, true));
    expect(g.state.ledger.sunshine[id] ?? 0).toBe(0);
    expect(g.state.ledger.bestStage[id] ?? 0).toBe(0);

    g.checkIn(id); // the first rewarded check-in: 7 / (12/52) ≈ 30.3 sunshine

    // Observed: stage = min(stageFromSunshine(30.3) = 4, completed = 7) = 4 → Seed → Budding in one
    // check-in, with plantStage events for 1, 2, 3 and 4.
    expect(g.lastOf('plantStage').length).toBeLessThanOrEqual(1);
    expect(g.state.ledger.bestStage[id] ?? 0).toBeLessThanOrEqual(1);
  });

  it('a faithful monthly habit reaches each stage one check-in at a time, Evergreen on the 7th (passes)', () => {
    const per = sunshinePerOccurrence({ schedule: { kind: 'monthly', times: 1, every: 1 } });
    const stages = Array.from({ length: 8 }, (_, n) => plantStage(per * n, n));
    expect(stages).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('blooms, flourishes and Mochi\'s sprout switch exactly at their thresholds (passes)', () => {
    // §13.4 blooms = min(6, floor((sunshine − 180) / 30)); §13.10 a Flourish every +60 after Evergreen (8 visitors).
    const table: [number, number, number][] = [
      [180, 0, 0],
      [209.999, 0, 0],
      [210, 1, 0],
      [239.999, 1, 0],
      [240, 2, 1],
      [360, 6, 3],
      [10_000, 6, 8],
    ];
    for (const [sun, blooms, flourishes] of table) {
      expect(bloomsFor(sun, 7), `blooms @${sun}`).toBe(blooms);
      expect(flourishesFor(sun, 7), `flourishes @${sun}`).toBe(flourishes);
      expect(bloomsFor(sun, 6)).toBe(0);
    }
    // 9 × 7/3 (a Mon/Wed/Fri habit) reaches Budding's 21 despite floating-point error.
    expect(plantStage(9 * sunshinePerOccurrence({ schedule: { kind: 'days', days: [1, 3, 5] } }), 9)).toBe(4);
    MEADOW_SPROUT_THRESHOLDS.forEach((t, stage) => {
      expect(meadowSprout(t).stage).toBe(stage);
      if (stage > 0) expect(meadowSprout(t - 1e-6).stage).toBe(stage - 1);
    });
    expect(STAGE_THRESHOLDS).toEqual([0, 1, 4, 10, 21, 42, 90, 180]);
  });
});

describe('Mochi\'s sprout is a lifetime gauge (DESIGN §13.10 "lifetime sunshine across all habits"; §3.1 growth is monotonic)', () => {
  it('[FAILS] deleting a habit (whose check-ins are all outside the refund window) never shrinks Mochi\'s sprout', () => {
    const g = new Game({ start: '2026-08-03' });
    const walk = g.addHabit({ name: 'Walk' });
    g.addHabit({ name: 'Read' });
    for (let i = 0; i < 30; i++) {
      g.checkIn(walk);
      g.advance(1);
    }
    g.advance(10); // every Walk grant is now older than the 7-day refund window
    const before = progressVM(g.state, envOf(g)).sprout;
    expect(before.stage).toBe(2); // 30 sunshine ≥ 20 (Seedling)
    g.run((tx) => habitsDomain.deleteHabit(tx, walk)); // "Keep the plant in the greenhouse?" defaults to yes (§13.10)
    const after = progressVM(g.state, envOf(g)).sprout;
    // Observed: 0 (Seed): the sprout sums ledger.sunshine over *existing* habits only.
    expect(after.stage).toBeGreaterThanOrEqual(before.stage);
  });
});

describe('growth stays within its rule (passes)', () => {
  it('sunshine per occurrence normalises every rhythm to 7 per faithful week (§5.5, §13.2 expectedPerWeek)', () => {
    const perWeek = (s: Parameters<typeof sunshinePerOccurrence>[0]['schedule'], n: number) => sunshinePerOccurrence({ schedule: s }) * n;
    expect(perWeek({ kind: 'daily' }, 7)).toBeCloseTo(7, 9);
    expect(perWeek({ kind: 'days', days: [1, 3, 5] }, 3)).toBeCloseTo(7, 9);
    expect(perWeek({ kind: 'weekly', times: 3, every: 2 }, 3) / 2).toBeCloseTo(7, 9);
    // Quarterly 2×: 2 check-ins per 13 weeks.
    expect(perWeek({ kind: 'monthly', times: 2, every: 3 }, 2) / 13).toBeCloseTo(7, 9);
    // A rule from `rule()` helper stays flexible target 1.
    expect(rule('2026-01-01', { kind: 'weekly', times: 2, every: 1 }).target).toBe(1);
  });

  it('a tiny check-in grows half as much (§13.2)', () => {
    const r = { schedule: { kind: 'daily' as const } };
    expect(sunshinePerOccurrence(r, true)).toBe(sunshinePerOccurrence(r) / 2);
  });

  it('logsOf/trackingCtx are the state slices the economy reads (sanity for the scenarios above)', () => {
    const g = new Game({ start: '2026-09-28' });
    const id = g.addHabit();
    g.checkIn(id);
    expect(logsOf(g.state, id)['2026-09-28']).toMatchObject({ kind: 'log', count: 1 });
    expect(trackingCtx(g.state, g.today)).toMatchObject({ today: '2026-09-28', weekStart: 1 });
  });
});
