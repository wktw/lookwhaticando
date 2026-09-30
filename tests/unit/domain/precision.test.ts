/**
 * The sunshine precision contract's helpers (WP-B2, domain-d1). The behaviour they give the plant,
 * the stories and The Cutting is tested through real check-ins in growth.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { THRESHOLD_EPS, addToTotal, occurrencesToReach, reaches, sameAmount, shortfall, stepsReached } from '@/domain/precision';

describe('the sunshine precision contract (precision.ts)', () => {
  it('the tolerance is far below the smallest grant and above any float error', () => {
    expect(THRESHOLD_EPS).toBeLessThan(0.5 / 100);
    expect(THRESHOLD_EPS).toBeGreaterThan(1e-9);
    // Under one rule an exact sum falls short of a whole threshold by at least 1/720.
    expect(1 / 720).toBeGreaterThan(THRESHOLD_EPS);
  });

  it.each([
    [20.999997, 21, true], // nine grants each rounded to 2.333333 by an older build
    [20.999999999999996, 21, true], // nine unrounded 7/3 in float
    [21, 21, true],
    [20.9995, 21, true],
    [20.998, 21, false],
    [20.99, 21, false],
    [42 - 1 / 720, 42, false],
  ])('reaches(%d, %d) = %s', (sun, threshold, want) => {
    expect(reaches(sun, threshold)).toBe(want);
  });

  it('shortfall is 0 once a threshold is reached, the plain difference before', () => {
    expect(shortfall(20.999997, 21)).toBe(0);
    expect(shortfall(18.666664, 21)).toBeCloseTo(2.333336, 9);
    expect(shortfall(30, 21)).toBe(0);
  });

  it('whole steps past a base (extra blooms, Flourishes)', () => {
    expect(stepsReached(179, 180, 30)).toBe(0);
    expect(stepsReached(209.99999, 180, 30)).toBe(1);
    expect(stepsReached(239.9, 180, 60)).toBe(0);
    expect(stepsReached(419.99999, 180, 60)).toBe(4);
  });

  it('occurrences to reach a threshold count no check-in for a rounding residue', () => {
    const per = 7 / 3;
    expect(occurrencesToReach(8 * 2.333333, 21, per)).toBe(1);
    expect(occurrencesToReach(8 * per, 21, per)).toBe(1);
    expect(occurrencesToReach(0, 21, per)).toBe(9);
    expect(occurrencesToReach(20.999997, 21, per)).toBe(0);
    expect(occurrencesToReach(6.999999, 7, per)).toBe(0);
    expect(occurrencesToReach(2 * 2.333333, 7, per)).toBe(1);
    expect(occurrencesToReach(0, 42, 0.5)).toBe(84);
  });

  it('a total never goes below 0, and float residue from taking grants back is cleared', () => {
    expect(addToTotal(0, 7 / 3)).toBe(7 / 3);
    expect(addToTotal(7 / 3, -7 / 3)).toBe(0);
    expect(addToTotal(0.1 + 0.2, -0.3)).toBe(0);
    expect(addToTotal(1, -2)).toBe(0);
    expect(addToTotal(2, -1)).toBe(1);
  });

  it('a grant an older build stored rounded to 6 places is the same amount as the exact one', () => {
    expect(sameAmount(2.333333, 7 / 3)).toBe(true);
    expect(sameAmount(1.166667, 7 / 6)).toBe(true);
    expect(sameAmount(7 / 3, 1)).toBe(false);
    expect(sameAmount(7 / 3, 7 / 3.001)).toBe(false);
  });
});
