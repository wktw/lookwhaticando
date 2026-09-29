import { describe, expect, it } from 'vitest';
import { buildDemo } from '@/state/demo';
import { progressVM } from '@/state/views/progress';
import type { LocalTimeReader } from '@/domain/dates';

const UTC: LocalTimeReader = (ms) => {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
};
const TODAY = '2026-09-29';
const NOW = Date.UTC(2026, 8, 29, 16, 30);

describe('progressVM keeps its parts until their own inputs change (NOTES-w2-progress request 11)', () => {
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
});
