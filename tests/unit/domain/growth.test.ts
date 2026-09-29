import { describe, expect, it } from 'vitest';
import {
  MEADOW_SPROUT_THRESHOLDS,
  STAGE_NAMES,
  STAGE_THRESHOLDS,
  bloomsFor,
  displayStage,
  flourishesFor,
  growthInfo,
  meadowSprout,
  plantStage,
  stageFromSunshine,
  stageName,
  stageProgress,
  stagesCrossed,
  sunshineFromHistory,
  sunshinePerOccurrence,
  sunshineToNextStage,
} from '@/domain/growth';
import { addDays } from '@/domain/dates';
import { DAILY, ctx, habit, logs, monthly, on, onDays, range, tiny, weekly } from './helpers';

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
    expect(STAGE_NAMES).toEqual(['Seed', 'Sprout', 'Seedling', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen']);
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
    expect(stageProgress(7, 2)).toBeCloseTo(0.5, 12); // Seedling 4 → 10
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
    expect(bloomsFor(s, stage)).toBe(blooms);
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
      blooms: 0,
      flourishes: 0,
      heldBack: false,
      paced: false,
    });
    const monthlyFirst = growthInfo({ sunshine: sunshinePerOccurrence({ schedule: monthly(1) }), completedOccurrences: 1 });
    expect(monthlyFirst).toMatchObject({ stage: 1, name: 'Sprout', heldBack: true, sunshineToNext: 0, progress: 1 });
    expect(growthInfo({ sunshine: 5, completedOccurrences: 5, bestStage: 6 })).toMatchObject({ stage: 2, displayStage: 6, name: 'Flourishing' });
  });
});

describe("Mochi's sprout: a whole-meadow gauge (DESIGN §13.10)", () => {
  it.each([
    [0, 0, 'Seed', false],
    [4.9, 0, 'Seed', false],
    [5, 1, 'Sprout', false],
    [20, 2, 'Seedling', false],
    [104, 3, 'Leafy', false],
    [105, 4, 'Budding', false],
    [210, 5, 'Blooming', true],
    [450, 6, 'Flourishing', true],
    [900, 7, 'Evergreen', true],
  ] as const)('%d lifetime sunshine → stage %i %s', (s, stage, name, blooming) => {
    expect(meadowSprout(s)).toMatchObject({ stage, name, blooming });
  });

  it('progress runs within each sprout stage', () => {
    expect(MEADOW_SPROUT_THRESHOLDS).toEqual([0, 5, 20, 50, 105, 210, 450, 900]);
    expect(meadowSprout(35).progress).toBeCloseTo(0.5, 12);
    expect(meadowSprout(2000).progress).toBe(1);
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
