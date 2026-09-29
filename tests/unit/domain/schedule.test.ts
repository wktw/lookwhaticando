import { describe, expect, it } from 'vitest';
import type { Schedule } from '@/state/types';
import {
  effectiveTarget,
  everyOf,
  expectedPerWeek,
  isDayBased,
  isFlexible,
  isScheduledDate,
  normalizeRuleContent,
  periodGrid,
  periodSlot,
  periodSlotAt,
  restAllowancePerWeek,
  rhythmOf,
  sameRuleContent,
  scheduledDaysPerWeek,
  validateRuleContent,
  type RuleContent,
} from '@/domain/schedule';
import { DAILY, monthly, onDays, weekly } from './helpers';

const content = (schedule: Schedule, extra: Partial<RuleContent> = {}): RuleContent => ({ schedule, target: 1, step: 1, ...extra });

describe('schedule kinds', () => {
  it.each([
    [DAILY, true, 'day'],
    [onDays(1, 3, 5), true, 'day'],
    [weekly(3), false, 'week'],
    [monthly(1, 3), false, 'month'],
  ] as const)('%o → dayBased %s, rhythm %s', (s, dayBased, rhythm) => {
    expect(isDayBased(s)).toBe(dayBased);
    expect(isFlexible(s)).toBe(!dayBased);
    expect(isDayBased({ schedule: s })).toBe(dayBased);
    expect(rhythmOf(s)).toBe(rhythm);
  });

  it('every defaults to 1 for day-based or malformed schedules', () => {
    expect(everyOf(DAILY)).toBe(1);
    expect(everyOf(weekly(1, 2))).toBe(2);
    expect(everyOf({ kind: 'weekly', times: 1, every: 5 as 1 })).toBe(1);
    expect(everyOf({ kind: 'monthly', times: 1, every: 4 as 1 })).toBe(1);
  });
});

describe('expectedPerWeek (DESIGN §13.2)', () => {
  it.each([
    [DAILY, 7],
    [onDays(1, 3, 5), 3],
    [onDays(1, 1, 3), 2], // duplicates don't count twice
    [weekly(3), 3],
    [weekly(1, 2), 0.5],
    [weekly(4, 4), 1],
    [monthly(1), 12 / 52],
    [monthly(2), 24 / 52],
    [monthly(1, 3), 12 / 52 / 3], // quarterly
    [monthly(1, 12), 12 / 52 / 12], // yearly
  ] as const)('%o → %d', (s, epw) => {
    expect(expectedPerWeek(s)).toBeCloseTo(epw, 12);
  });

  it('scheduled days and weekday membership', () => {
    expect(scheduledDaysPerWeek(DAILY)).toBe(7);
    expect(scheduledDaysPerWeek(onDays(0, 6))).toBe(2);
    expect(scheduledDaysPerWeek(weekly(3))).toBe(0);
    expect(isScheduledDate(onDays(1, 3, 5), '2026-09-28')).toBe(true); // Monday
    expect(isScheduledDate(onDays(1, 3, 5), '2026-09-29')).toBe(false); // Tuesday
    expect(isScheduledDate(weekly(7), '2026-09-29')).toBe(false); // flexible: no fixed days
  });
});

describe('rest allowance: max(1, floor(days/3)) (DESIGN §13.2)', () => {
  it.each([
    [DAILY, 2],
    [onDays(1), 1],
    [onDays(1, 3), 1],
    [onDays(1, 3, 5), 1],
    [onDays(1, 2, 3, 4, 5), 1],
    [onDays(1, 2, 3, 4, 5, 6), 2],
    [weekly(3), 0],
    [monthly(2), 0],
  ] as const)('%o → %i', (s, n) => {
    expect(restAllowancePerWeek(s)).toBe(n);
  });
});

describe('effectiveTarget', () => {
  it('uses the day-based target and 1 for flexible rules', () => {
    expect(effectiveTarget({ schedule: DAILY, target: 8 })).toBe(8);
    expect(effectiveTarget({ schedule: weekly(3), target: 5 })).toBe(1);
    expect(effectiveTarget({ schedule: DAILY, target: 0 })).toBe(1);
  });
});

describe('period grid (every-multipliers anchored at the rule start period)', () => {
  it('weekly periods follow the week start', () => {
    const mon = periodGrid(weekly(3), '2026-09-30', 1);
    const sun = periodGrid(weekly(3), '2026-09-30', 0);
    expect(periodSlotAt(mon, '2026-10-04')).toMatchObject({ start: '2026-09-28', end: '2026-10-04', index: 0 });
    expect(periodSlotAt(sun, '2026-10-04')).toMatchObject({ start: '2026-10-04', end: '2026-10-10', index: 1 });
  });

  it('every 2 weeks alternates from the week the rule began, in both directions', () => {
    const g = periodGrid(weekly(1, 2), '2026-08-12', 1); // Wed → anchor Mon Aug 10
    expect(g.anchor).toBe('2026-08-10');
    expect(periodSlotAt(g, '2026-09-30')).toEqual({ index: 3, start: '2026-09-21', end: '2026-10-04' });
    expect(periodSlotAt(g, '2026-08-09')).toEqual({ index: -1, start: '2026-07-27', end: '2026-08-09' });
    expect(periodSlot(g, 4)).toEqual({ index: 4, start: '2026-10-05', end: '2026-10-18' });
  });

  it('quarterly and yearly periods are anchored at the rule start month', () => {
    const q = periodGrid(monthly(1, 3), '2026-02-10', 1);
    expect(periodSlotAt(q, '2026-09-30')).toEqual({ index: 2, start: '2026-08-01', end: '2026-10-31' });
    expect(periodSlotAt(q, '2026-01-31')).toEqual({ index: -1, start: '2025-11-01', end: '2026-01-31' });
    const y = periodGrid(monthly(2, 12), '2024-02-29', 1);
    expect(periodSlotAt(y, '2025-01-31')).toEqual({ index: 0, start: '2024-02-01', end: '2025-01-31' });
    expect(periodSlotAt(y, '2025-02-01')).toEqual({ index: 1, start: '2025-02-01', end: '2026-01-31' });
  });

  it('monthly periods respect month lengths and leap years', () => {
    const m = periodGrid(monthly(2), '2024-01-15', 1);
    expect(periodSlotAt(m, '2024-02-10')).toMatchObject({ start: '2024-02-01', end: '2024-02-29' });
    expect(periodSlotAt(m, '2026-02-10')).toMatchObject({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('day-based schedules have no grid', () => {
    expect(() => periodGrid(DAILY, '2026-09-01', 1)).toThrow();
  });
});

describe('rule content validation', () => {
  it.each([
    ['daily ok', content(DAILY), []],
    ['count ok', content(DAILY, { target: 8, step: 2 }), []],
    ['target 0', content(DAILY, { target: 0 }), ['target-range']],
    ['target too big', content(DAILY, { target: 100_001 }), ['target-range']],
    ['fractional target', content(DAILY, { target: 1.5 }), ['target-range']],
    ['step 0', content(DAILY, { step: 0 }), ['step-range']],
    ['no days', content(onDays()), ['days-empty']],
    ['bad day', content({ kind: 'days', days: [7 as 0] }), ['days-invalid']],
    ['weekly 8x', content(weekly(8)), ['times-range']],
    ['biweekly 14x ok', content(weekly(14, 2)), []],
    ['weekly 0x', content(weekly(0)), ['times-range']],
    ['monthly 11x', content(monthly(11)), ['times-range']],
    ['quarterly 30x ok', content(monthly(30, 3)), []],
    ['bad every', content({ kind: 'monthly', times: 1, every: 4 as 1 }), ['every-invalid']],
    ['flexible target', content(weekly(3), { target: 2 }), ['flexible-target']],
    ['tiny ok', content(DAILY, { target: 8, tiny: { label: '4 glasses', count: 4 } }), []],
    ['tiny blank', content(DAILY, { tiny: { label: '  ' } }), ['tiny-label']],
    ['tiny count ≥ target', content(DAILY, { target: 8, tiny: { label: 'x', count: 8 } }), ['tiny-count-range']],
    ['tiny count on target 1', content(DAILY, { tiny: { label: 'x', count: 1 } }), ['tiny-count-range']],
  ])('%s', (_name, c, codes) => {
    expect(validateRuleContent(c).map((i) => i.code)).toEqual(codes);
  });

  it('normalises days, flexible target, step and tiny label', () => {
    expect(normalizeRuleContent(content({ kind: 'days', days: [5, 1, 3, 1] }, { step: 0, tiny: { label: ' one page ' } }))).toEqual(
      content(onDays(1, 3, 5), { step: 1, tiny: { label: 'one page' } }),
    );
    expect(normalizeRuleContent(content(weekly(3), { target: 4 })).target).toBe(1);
  });

  it('sameRuleContent ignores day order and from, but not target/step/tiny', () => {
    expect(sameRuleContent(content(onDays(1, 3)), content(onDays(3, 1)))).toBe(true);
    expect(sameRuleContent(content(weekly(2)), content(weekly(2, 2)))).toBe(false);
    expect(sameRuleContent(content(DAILY, { target: 8 }), content(DAILY, { target: 6 }))).toBe(false);
    expect(sameRuleContent(content(DAILY, { tiny: { label: 'a' } }), content(DAILY))).toBe(false);
    expect(sameRuleContent(content(DAILY), content(onDays(0, 1, 2, 3, 4, 5, 6)))).toBe(false);
  });
});
