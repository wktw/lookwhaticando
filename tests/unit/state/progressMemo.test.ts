import { describe, expect, it } from 'vitest';
import { buildDemo } from '@/state/demo';
import { progressVM } from '@/state/views/progress';
import { zonedLocalTime, type LocalTimeReader } from '@/domain/dates';

const UTC: LocalTimeReader = (ms) => {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
};
const TODAY = '2026-09-29';
const NOW = Date.UTC(2026, 8, 29, 16, 30);

describe('progressVM keeps its parts until their own inputs change', () => {
  const s = buildDemo({ today: TODAY, now: NOW, local: UTC });
  const env = { today: TODAY, now: NOW, local: UTC };
  const first = progressVM(s, env);

  it('a coin or a pet moving recomputes nothing that walks the history', () => {
    const coins = progressVM({ ...s, wallet: { ...s.wallet, coins: s.wallet.coins + 5 } }, env);
    expect(coins.hero).toBe(first.hero);
    expect(coins.recentMonths).toBe(first.recentMonths);
    expect(coins.insights).toBe(first.insights);
    expect(coins.garden).toBe(first.garden);
    expect(coins).toEqual(first);
  });

  it('a change to the logs recomputes', () => {
    const habit = s.habits.find((h) => h.archivedOn === undefined)!;
    const logs = { ...s.logs, [habit.id]: { ...(s.logs[habit.id] ?? {}), '2026-09-01': { kind: 'rest' as const } } };
    const next = { ...s, logs };
    const warm = progressVM(next, env);
    expect(warm.hero).not.toBe(first.hero);
    expect(warm.rests.rests).toBeGreaterThanOrEqual(first.rests.rests);
  });

  it('the same save read in another zone recomputes the times of day (P-history-04, WP-B3)', () => {
    // The device's own reader is one function wherever the device is: only the zone tells them apart.
    let zone = 'UTC';
    const device: LocalTimeReader = (ms) => zonedLocalTime(zone)(ms);
    const here = progressVM(s, { ...env, local: device, timeZone: zone });
    expect(here.insights.busiestTime).toEqual(first.insights.busiestTime);
    zone = 'Pacific/Chatham'; // +13:45
    const there = progressVM(s, { ...env, local: device, timeZone: zone });
    expect(there.insights.busiestTime).toEqual(progressVM(s, { ...env, local: zonedLocalTime(zone), timeZone: zone }).insights.busiestTime);
    expect(there.insights.busiestTime?.peakHour).not.toBe(here.insights.busiestTime?.peakHour);
  });
});
