import { describe, expect, it } from 'vitest';
import { getMachine } from '@/catalog/machines';
import { dayKeyOf, inSeason, seasonHasVisited } from './season';

describe('seasonal editions', () => {
  it('stand on the counter only inside their window, and numbered series always', () => {
    const autumn = getMachine('autumn');
    expect(inSeason(autumn, '2026-09-29')).toBe(true);
    expect(inSeason(autumn, '2026-11-10')).toBe(true);
    expect(inSeason(autumn, '2026-11-11')).toBe(false);
    expect(inSeason(autumn, '2026-08-31')).toBe(false);
    expect(inSeason(getMachine('cats'), '2026-02-14')).toBe(true);
  });

  it('handles a window that wraps the new year', () => {
    const winter = getMachine('winter');
    expect(inSeason(winter, '2026-12-25')).toBe(true);
    expect(inSeason(winter, '2027-01-14')).toBe(true);
    expect(inSeason(winter, '2027-01-15')).toBe(false);
  });

  it('the Memories rule: orderable once the season has visited since the profile began', () => {
    const winter = getMachine('winter');
    expect(seasonHasVisited(winter, '2026-09-01', '2026-11-10')).toBe(false);
    expect(seasonHasVisited(winter, '2026-09-01', '2026-11-11')).toBe(true);
    expect(seasonHasVisited(winter, '2026-12-01', '2027-03-01')).toBe(true);
    expect(seasonHasVisited(getMachine('summer'), '2025-01-01', '2026-01-02')).toBe(true);
    expect(seasonHasVisited(getMachine('dogs'), '2026-09-01', '2026-09-01')).toBe(true);
  });

  it('keys a moment by the app day, which starts at the day-start preference', () => {
    const oneAm = new Date(2026, 10, 11, 1, 0).getTime();
    expect(dayKeyOf(oneAm)).toBe('2026-11-11');
    // With the default 3 am day start, 1 am on Nov 11 is still Nov 10: the autumn edition is still in.
    expect(dayKeyOf(oneAm, 180)).toBe('2026-11-10');
    expect(dayKeyOf(new Date(2026, 10, 11, 3, 0).getTime(), 180)).toBe('2026-11-11');
    expect(dayKeyOf(new Date(2026, 0, 1, 2, 0).getTime(), 180)).toBe('2025-12-31');
  });
});
