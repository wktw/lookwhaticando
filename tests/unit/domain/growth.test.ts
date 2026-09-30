import { describe, expect, it } from 'vitest';
import {
  BLOOMING,
  BUDDING,
  CUTTING_THRESHOLDS,
  EVERGREEN,
  STAGE_NAMES,
  STAGE_THRESHOLDS,
  extraBloomsFor,
  artBlooms,
  MAX_BLOOMS,
  displayStage,
  flourishesFor,
  growthInfo,
  lifetimeSunshine,
  plantStage,
  stageFromSunshine,
  stageName,
  stageProgress,
  stagesCrossed,
  sunshineFromHistory,
  sunshinePerOccurrence,
  sunshineToNextStage,
  theCutting,
} from '@/domain/growth';
import { addDays } from '@/domain/dates';
import type { AppState, DateKey, Schedule } from '@/state/types';
import * as company from '@/domain/company';
import { compactLedger, cuttingOf, settleTo, CUTTING_KEY } from '@/domain/economy';
import { newPetState } from '@/domain/friendship';
import * as habits from '@/domain/habits';
import { mulberry32 } from '@/domain/rng';
import { transact } from '@/domain/tx';
import { checkinsToStage, plantVM } from '@/state/views/common';
import { companionVM } from '@/state/views/company';
import { DAILY, ctx, habit, logs, monthly, on, onDays, range, tiny, weekly } from './helpers';
import { Game, UTC, at } from './game';

describe('sunshine per occurrence = 7 / expectedPerWeek (DESIGN §13.4)', () => {
  it.each([
    ['daily', DAILY, 1],
    ['Mon/Wed/Fri', onDays(1, 3, 5), 7 / 3],
    ['3×/week', weekly(3), 7 / 3],
    ['every 2 weeks', weekly(1, 2), 14],
    ['monthly', monthly(1), 7 / (12 / 52)],
    ['quarterly', monthly(1, 3), 7 / (12 / 52 / 3)],
  ] as const)('%s', (_name, schedule, s) => {
    expect(sunshinePerOccurrence({ schedule })).toBeCloseTo(s, 10);
    expect(sunshinePerOccurrence({ schedule }, true)).toBeCloseTo(s / 2, 10);
  });

  it('frequency-normalised: 2×/week for 26 weeks grows like daily for 26 weeks', () => {
    const twice = habit({ startedOn: '2026-01-05', schedule: weekly(2) }); // a Monday
    const days = Array.from({ length: 26 }, (_, w) => [addDays('2026-01-05', 7 * w), addDays('2026-01-08', 7 * w)]).flat();
    const r = sunshineFromHistory(twice, logs(on(days)), ctx('2026-07-05'));
    expect(r).toEqual({ sunshine: 182, completedOccurrences: 52 });
    expect(plantStage(r.sunshine, r.completedOccurrences)).toBe(7);
  });

  it('a faithful monthly habit reaches Evergreen on its 7th check-in (one stage per check-in)', () => {
    const m = habit({ startedOn: '2026-01-01', schedule: monthly(1) });
    const l = logs(on(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15']));
    const six = sunshineFromHistory(m, l, ctx('2026-06-30'));
    expect(six.sunshine).toBeGreaterThan(180);
    expect(plantStage(six.sunshine, six.completedOccurrences)).toBe(6);
    const seven = sunshineFromHistory(m, l, ctx('2026-07-31'));
    expect(plantStage(seven.sunshine, seven.completedOccurrences)).toBe(7);
  });
});

describe('stages', () => {
  it('thresholds and names match the table', () => {
    expect(STAGE_THRESHOLDS).toEqual([0, 1, 4, 10, 21, 42, 90, 180]);
    expect(STAGE_NAMES).toEqual(['Cutting', 'Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen']);
    expect(stageName(9)).toBe('Evergreen');
  });

  it.each([
    [0, 0],
    [0.99, 0],
    [1, 1],
    [3.99, 1],
    [4, 2],
    [20.99, 3],
    [21, 4],
    [42, 5],
    [89.9, 5],
    [90, 6],
    [180, 7],
    [10_000, 7],
  ])('stageFromSunshine(%d) = %i', (s, stage) => {
    expect(stageFromSunshine(s)).toBe(stage);
  });

  it('floating-point sums land on thresholds (9 × 7/3 = 21 → Budding)', () => {
    let s = 0;
    for (let i = 0; i < 9; i++) s += 7 / 3;
    expect(stageFromSunshine(s)).toBe(4);
  });

  it('stage = min(stageFromSunshine, completed): a monthly habit grows one stage per check-in', () => {
    const per = sunshinePerOccurrence({ schedule: monthly(1) });
    expect([1, 2, 3, 4, 5, 6, 7].map((n) => plantStage(per * n, n))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(stageFromSunshine(per)).toBe(4); // would have jumped to Budding
    expect(plantStage(5, 0)).toBe(0);
  });

  it('display stage never shrinks', () => {
    expect(displayStage(3, 5)).toBe(5);
    expect(displayStage(6, 5)).toBe(6);
    expect(displayStage(2, undefined)).toBe(2);
  });

  it('stagesCrossed lists each stage to animate in turn', () => {
    expect(stagesCrossed(2, 5)).toEqual([3, 4, 5]);
    expect(stagesCrossed(5, 5)).toEqual([]);
    expect(stagesCrossed(5, 3)).toEqual([]);
  });
});

describe('progress, next stage and blooms', () => {
  it('progress within a stage', () => {
    expect(stageProgress(7, 2)).toBeCloseTo(0.5, 12); // Potted 4 → 10
    expect(stageProgress(4, 2)).toBe(0);
    expect(stageProgress(30.3, 1)).toBe(1); // held back by the one-stage rule: full
    expect(sunshineToNextStage(33, 4)).toBe(9); // "9 ☀ to Blooming"
    expect(sunshineToNextStage(200, 7)).toBeNull();
  });

  it.each([
    [180, 7, 0],
    [209.9, 7, 0],
    [210, 7, 1],
    [359, 7, 5],
    [360, 7, 6],
    [900, 7, 6], // capped
    [300, 6, 0], // not Evergreen yet (held back): no blooms
  ])('blooms at %d sunshine (stage %i) = %i', (s, stage, blooms) => {
    expect(extraBloomsFor(s, stage)).toBe(blooms);
  });

  it.each([
    [239.9, 7, 0],
    [240, 7, 1],
    [659, 7, 7],
    [660, 7, 8],
    [5000, 7, 8], // eight visitors at most
    [400, 6, 0],
  ])('flourishes at %d sunshine (stage %i) = %i (DESIGN §13.10)', (s, stage, n) => {
    expect(flourishesFor(s, stage)).toBe(n);
  });

  it('Evergreen progress runs toward the next bloom, then stays full', () => {
    expect(stageProgress(195, 7)).toBeCloseTo(0.5, 12);
    expect(stageProgress(225, 7)).toBeCloseTo(0.5, 12);
    expect(stageProgress(400, 7)).toBe(1);
  });

  it('growthInfo bundles it all', () => {
    expect(growthInfo({ sunshine: 33, completedOccurrences: 33, bestStage: 4 })).toEqual({
      stage: 4,
      displayStage: 4,
      name: 'Budding',
      progress: (33 - 21) / 21,
      sunshineToNext: 9,
      nextName: 'Blooming',
      extraBlooms: 0,
      flourishes: 0,
      heldBack: false,
      paced: false,
    });
    const monthlyFirst = growthInfo({ sunshine: sunshinePerOccurrence({ schedule: monthly(1) }), completedOccurrences: 1 });
    expect(monthlyFirst).toMatchObject({ stage: 1, name: 'Rooting', heldBack: true, sunshineToNext: 0, progress: 1 });
    expect(growthInfo({ sunshine: 5, completedOccurrences: 5, bestStage: 6 })).toMatchObject({ stage: 2, displayStage: 6, name: 'Flourishing' });
  });

  it('artBlooms leaves the art to follow the stage below Evergreen, and adds the extra blooms at Evergreen', () => {
    for (let stage = 0; stage < 7; stage++) expect(artBlooms(stage, 0), `stage ${stage}`).toBeUndefined();
    expect(artBlooms(7, 0)).toBe(5);
    expect(artBlooms(7, 1)).toBe(6);
    expect(artBlooms(7, 6)).toBe(MAX_BLOOMS);
  });
});

describe('The Cutting: the lifetime gauge (DESIGN §13)', () => {
  it.each([
    [0, 0, 5],
    [4.9, 0, 0.1],
    [5, 1, 15],
    [20, 2, 30],
    [104, 3, 1],
    [105, 4, 105],
    [210, 5, 240],
    [450, 6, 450],
    [900, 7, null],
    [5000, 7, null],
  ] as const)('%d lifetime sunshine → stage %i, %s to the next', (s, stage, toNext) => {
    const c = theCutting(s);
    expect(c.stage).toBe(stage);
    if (toNext === null) expect(c.toNext).toBeNull();
    else expect(c.toNext).toBeCloseTo(toNext, 9);
    expect(c.framed).toBe(stage === 7);
  });

  it('progress runs within each stage, and `overall` along the whole frame', () => {
    expect(CUTTING_THRESHOLDS).toEqual([0, 5, 20, 50, 105, 210, 450, 900]);
    expect(theCutting(35).progress).toBeCloseTo(0.5, 12);
    expect(theCutting(35).overall).toBeCloseTo(2.5 / 7, 12);
    expect(theCutting(0)).toMatchObject({ progress: 0, overall: 0 });
    expect(theCutting(2000)).toMatchObject({ progress: 1, overall: 1 });
  });

  it('never goes below its best stage (after an un-check)', () => {
    expect(theCutting(19, 2)).toMatchObject({ stage: 2, progress: 0, toNext: 31 });
    expect(theCutting(60, 2)).toMatchObject({ stage: 3 }); // the actual stage wins when higher
    expect(theCutting(0, 9).stage).toBe(7);
  });

  it('overall only rises with lifetime sunshine', () => {
    let prev = -1;
    for (let s = 0; s <= 1000; s += 0.5) {
      const o = theCutting(s).overall;
      expect(o).toBeGreaterThanOrEqual(prev);
      prev = o;
    }
  });

  it('sums every habit’s ledger total, deleted habits included', () => {
    expect(lifetimeSunshine({})).toBe(0);
    expect(lifetimeSunshine({ 'h-live': 12.5, 'h-deleted': 30 })).toBe(42.5);
  });
});

describe('sunshine from history', () => {
  it('day-based: achieved days, tiny at half', () => {
    const h = habit({ startedOn: '2026-09-01' });
    const l = logs(range('2026-09-01', '2026-09-20'), on(['2026-09-05', '2026-09-06'], tiny()));
    expect(sunshineFromHistory(h, l, ctx('2026-09-30'))).toEqual({ sunshine: 19, completedOccurrences: 20 });
  });

  it('flexible: only the first `times` check-in days of a period earn', () => {
    const h = habit({ startedOn: '2026-09-07', schedule: weekly(3) });
    const l = logs(on(['2026-09-07']), on(['2026-09-08'], tiny()), on(['2026-09-09', '2026-09-10', '2026-09-11']));
    const r = sunshineFromHistory(h, l, ctx('2026-09-30'));
    expect(r.completedOccurrences).toBe(3);
    expect(r.sunshine).toBeCloseTo((7 / 3) * 2.5, 10);
  });

  it('a faithful daily habit hits the design milestones: bud at 3 weeks, bloom at 6, Evergreen by ~6 months', () => {
    const h = habit({ startedOn: '2026-01-01' });
    const l = logs(range('2026-01-01', '2026-12-31'));
    const at = (days: number) => {
      const r = sunshineFromHistory(h, l, ctx(new Date(Date.UTC(2026, 0, days)).toISOString().slice(0, 10)));
      return plantStage(r.sunshine, r.completedOccurrences);
    };
    expect([at(1), at(21), at(42), at(90), at(180)]).toEqual([1, 4, 5, 6, 7]);
  });
});

/* ------------------------------------------------------------------ */
/* The sunshine precision contract (audit domain-d1, WP-B2)            */
/* ------------------------------------------------------------------ */

describe('the sunshine precision contract: repeating-fraction grants reach their thresholds on time (domain-d1, WP-B2)', () => {
  // Monday 2 March 2026; the first nine Mon/Wed/Fri days and the first nine Mon/Tue/Wed days.
  const MON = '2026-03-02';
  const MWF: DateKey[] = ['2026-03-02', '2026-03-04', '2026-03-06', '2026-03-09', '2026-03-11', '2026-03-13', '2026-03-16', '2026-03-18', '2026-03-20'];
  const MTW: DateKey[] = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-16', '2026-03-17', '2026-03-18'];
  /** What the build before WP-B2 stored for nine Mon/Wed/Fri grants: each 7/3 rounded to 2.333333. */
  const LEGACY_NINE = 9 * 2.333333;

  const habitOf = (g: Game, id: string) => g.state.habits.find((h) => h.id === id)!;
  const addPet = (g: Game, id: string): string => {
    g.state = { ...g.state, pets: { ...g.state.pets, [id]: newPetState(id, g.rng, g.now, g.today, true) } };
    return id;
  };
  const patch = (g: Game, f: (s: AppState) => AppState) => {
    g.state = f(g.state);
  };

  it('nine Mon/Wed/Fri check-ins reach Budding on the ninth, and the forecast never asks for a check-in more', () => {
    const g = new Game({ start: MON });
    const a = g.addHabit({ schedule: onDays(1, 3, 5) });
    MWF.forEach((d, i) => {
      g.goTo(d);
      // Before the ninth: one more check-in, not two for a rounding residue.
      if (i === 8) expect(plantVM(g.state, habitOf(g, a), g.today, UTC).checkinsToNext).toBe(1);
      g.checkIn(a);
    });
    expect(g.lastOf('plantStage').map((e) => e.stage)).toEqual([BUDDING]);
    expect(g.state.ledger.bestStage[a]).toBe(BUDDING);
    expect(g.state.stageDates?.[a]?.[BUDDING]).toBe('2026-03-20');
    const vm = plantVM(g.state, habitOf(g, a), g.today, UTC);
    expect(vm.displayStage).toBe(BUDDING);
    // Nine more at 7/3 are exactly Blooming's 42.
    expect(vm.checkinsToNext).toBe(9);
    expect(checkinsToStage(g.state, habitOf(g, a), g.today, UTC, BLOOMING)).toBe(9);
  });

  it('a total a few millionths short of a threshold reads as reaching it, with nothing left to go', () => {
    expect(stageFromSunshine(LEGACY_NINE)).toBe(BUDDING);
    expect(sunshineToNextStage(LEGACY_NINE, 3)).toBe(0);
    expect(growthInfo({ sunshine: LEGACY_NINE, completedOccurrences: 9, elapsedDays: 19 }).displayStage).toBe(BUDDING);
    // Well short is still short.
    expect(stageFromSunshine(20.99)).toBe(3);
  });

  it('a 3×/week flexible habit reaches Budding on its ninth check-in', () => {
    const g = new Game({ start: MON });
    const a = g.addHabit({ schedule: weekly(3) });
    const reached: number[] = [];
    MTW.forEach((d, i) => {
      g.goTo(d);
      g.checkIn(a);
      if (g.lastOf('plantStage').some((e) => e.stage === BUDDING)) reached.push(i + 1);
    });
    expect(reached).toEqual([9]);
    expect(plantVM(g.state, habitOf(g, a), g.today, UTC).displayStage).toBe(BUDDING);
  });

  it('a Mon/Wed/Fri companion tells its first story at the third check-in and the second at the ninth', () => {
    const g = new Game({ start: MON });
    const a = g.addHabit({ schedule: onDays(1, 3, 5) });
    const cat = addPet(g, 'pet-cat-tortie');
    g.run((tx) => company.setCompanion(tx, a, cat));
    const unlockedAt: Record<string, number> = {};
    MWF.forEach((d, i) => {
      g.goTo(d);
      if (i === 2) {
        const vm = companionVM(g.state, { today: g.today, now: g.now, local: UTC }, habitOf(g, a))!;
        expect(vm.stories[0]).toMatchObject({ id: 'start', unlocked: false, remaining: 1 });
      }
      g.checkIn(a);
      for (const e of g.lastOf('story')) unlockedAt[e.story] = i + 1;
    });
    expect(unlockedAt).toEqual({ start: 3, why: 9 });
  });

  it('The Cutting reaches its thresholds across habits (14 from Mon/Wed/Fri + 6 from a daily habit = 20)', () => {
    const g = new Game({ start: MON });
    const a = g.addHabit({ schedule: onDays(1, 3, 5) });
    const b = g.addHabit({ name: 'Yoga', icon: 'yoga' });
    for (const d of ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-09', '2026-03-11', '2026-03-13']) {
      g.goTo(d);
      if (d <= '2026-03-07') g.checkIn(b);
      if (MWF.includes(d)) g.checkIn(a);
    }
    expect(cuttingOf(g.state)).toMatchObject({ stage: 2 });
    expect(g.state.ledger.once[CUTTING_KEY]).toBe(2);
  });

  it('tiny → full, undo and re-check, and a rule repricing conserve sunshine exactly (plant and companion)', () => {
    const g = new Game({ start: MON });
    const a = g.addHabit({ schedule: weekly(3), tiny: { label: 'a lap' } });
    const cat = addPet(g, 'pet-cat-tortie');
    g.run((tx) => company.setCompanion(tx, a, cat));
    const sums = () => {
      const entries = Object.entries(g.state.ledger.recent).filter(([k]) => k.startsWith(`${a}|`)).map(([, e]) => e);
      return {
        total: g.state.ledger.sunshine[a] ?? 0,
        entries: entries.reduce((x, e) => x + e.sunshine, 0),
        pair: company.pairOf(g.state, cat, a)?.sunshine ?? 0,
        shares: entries.reduce((x, e) => x + (e.co?.sun ?? 0), 0),
      };
    };
    g.tiny(a); // 7/6
    g.checkIn(a); // up to 7/3
    g.undo(a);
    g.checkIn(a);
    g.goTo('2026-03-04');
    g.checkIn(a);
    // This week's two grants are repriced to 7×/week (1 each), then back to 3×/week (7/3 each).
    g.run((tx) => habits.updateHabit(tx, a, { schedule: weekly(7) }, 'today'));
    const mid = sums();
    expect(mid.total).toBeLessThan(14 / 3 - 0.5);
    expect(Math.abs(mid.total - mid.entries)).toBeLessThan(1e-9);
    g.run((tx) => habits.updateHabit(tx, a, { schedule: weekly(3) }, 'today'));
    const end = sums();
    expect(Math.abs(end.total - 14 / 3)).toBeLessThan(1e-9);
    expect(Math.abs(end.total - end.entries)).toBeLessThan(1e-9);
    expect(Math.abs(end.pair - 14 / 3)).toBeLessThan(1e-9);
    expect(Math.abs(end.pair - end.shares)).toBeLessThan(1e-9);
  });

  it('property: ten years of repeating-fraction grants read the same stage, blooms, flourishes and Cutting as the exact sum', () => {
    // Exact sums in 1/840ths (840 = lcm of every denominator below, tiny halves included).
    const D = 840;
    const rhythms: Schedule[] = [onDays(1, 3, 5), onDays(1, 2, 3, 4, 5, 6), weekly(3), weekly(5), weekly(2), monthly(1), DAILY];
    const g = new Game({ start: MON });
    const ids = rhythms.map((schedule, i) => g.addHabit({ name: `H${i}`, schedule, tiny: { label: 'a little' } }));
    const exact: number[] = ids.map(() => 0);
    const rng = mulberry32(2026);
    const stageExact = (th: readonly number[], n: number) => th.reduce((st, t, i) => (n >= t * D ? i : st), 0);
    const afterEvergreen = (n: number, per: number, max: number) => Math.max(0, Math.min(max, Math.floor((n - 180 * D) / (per * D))));
    const misses: string[] = [];
    let state = g.state;
    for (let day = 0; day < 3653 && misses.length < 5; day++) {
      const d = addDays(MON, day);
      const out = transact(state, { now: at(d), today: d, local: UTC, rng: g.rng }, (tx) => {
        ids.forEach((id, i) => {
          if (rng() < 0.45) return;
          const small = rng() < 0.2;
          const st = settleTo(tx, id, d, small ? 'tiny' : 'full');
          // The exact grant in 1/840ths (the settlement's own amount, whatever rounding it stored).
          exact[i]! += Math.round(st.sunshine * D);
        });
        compactLedger(tx);
        return {};
      });
      state = out.state;
      ids.forEach((id, i) => {
        const sun = state.ledger.sunshine[id] ?? 0;
        const n = exact[i]!;
        const got = [stageFromSunshine(sun), extraBloomsFor(sun, EVERGREEN), flourishesFor(sun, EVERGREEN)];
        const want = [stageExact(STAGE_THRESHOLDS, n), afterEvergreen(n, 30, 6), afterEvergreen(n, 60, 8)];
        if (got.join() !== want.join()) misses.push(`${d} ${rhythms[i]!.kind} ${sun}: [${got}] ≠ exact [${want}]`);
      });
      const lifetime = exact.reduce((x, n) => x + n, 0);
      const cutting = theCutting(lifetimeSunshine(state.ledger.sunshine)).stage;
      if (cutting !== stageExact(CUTTING_THRESHOLDS, lifetime)) misses.push(`${d} Cutting ${lifetimeSunshine(state.ledger.sunshine)}: ${cutting}`);
    }
    expect(misses).toEqual([]);
    // The run really crossed every threshold kind.
    expect(Math.min(...ids.map((id) => state.ledger.sunshine[id] ?? 0))).toBeGreaterThan(180 + 8 * 60);
  });

  it('an old save left a few millionths short is lifted quietly when the day opens: no celebration, no coins (DEC-P12a)', () => {
    const g = new Game({ start: MON });
    const a = g.addHabit({ schedule: onDays(1, 3, 5) });
    const cat = addPet(g, 'pet-cat-tortie');
    g.run((tx) => company.setCompanion(tx, a, cat));
    for (const d of MWF) {
      g.goTo(d);
      g.checkIn(a);
    }
    // The save as the build before WP-B2 left it: 20.999997 sunshine, the plant still Leafy, no Budding keepsake.
    patch(g, (s) => {
      const { [BUDDING]: _budding, ...dates } = s.stageDates?.[a] ?? {};
      return {
        ...s,
        ledger: { ...s.ledger, sunshine: { ...s.ledger.sunshine, [a]: LEGACY_NINE }, bestStage: { ...s.ledger.bestStage, [a]: 3 } },
        stageDates: { ...s.stageDates, [a]: dates },
        keepsakes: (s.keepsakes ?? []).filter((k) => k.id !== company.keepsakeId(a, BUDDING)),
      };
    });
    const coins = g.coins;
    g.goTo('2026-03-20', 13); // the same app day, a little later (the update has just loaded)
    expect(g.state.ledger.bestStage[a]).toBe(BUDDING);
    expect(g.state.stageDates?.[a]?.[BUDDING]).toBe('2026-03-20');
    expect((g.state.keepsakes ?? []).some((k) => k.id === company.keepsakeId(a, BUDDING))).toBe(true);
    expect(g.last.filter((e) => e.type === 'plantStage' || e.type === 'keepsake' || e.type === 'exclusive')).toEqual([]);
    expect(g.coins).toBe(coins);
    // Idempotent: opening again changes nothing.
    const lifted = g.state;
    g.run(() => undefined);
    expect(g.state).toBe(lifted);
    // The next check-in does not celebrate Budding a second time.
    g.goTo('2026-03-23');
    g.checkIn(a);
    expect(g.lastOf('plantStage')).toEqual([]);
  });

  it('guard: a stage held by the calendar pace is still celebrated at the next check-in, not lifted at day open', () => {
    const g = new Game({ start: MON });
    const a = g.addHabit();
    for (let d = MON; d <= '2026-03-15'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(a);
    }
    expect(g.state.ledger.bestStage[a]).toBe(3);
    // Sunshine banked ahead of the calendar (say by a rule flip): Budding's 21, but only 14 days old.
    patch(g, (s) => ({ ...s, ledger: { ...s.ledger, sunshine: { ...s.ledger.sunshine, [a]: 21 } } }));
    g.goTo('2026-03-16'); // day 15: the pace now allows Budding
    expect(g.state.ledger.bestStage[a]).toBe(3);
    expect(g.last.filter((e) => e.type === 'plantStage')).toEqual([]);
    g.checkIn(a);
    expect(g.lastOf('plantStage').map((e) => e.stage)).toEqual([BUDDING]);
  });
});
