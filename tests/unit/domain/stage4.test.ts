/**
 * Stage-4 fixes after the adversarial audits (math + exploit), for the findings no adversarial
 * test pinned down: permanent Flourishes, pity that only counts while its tier is armed, the
 * week-start regrouping guard on period-goal keys, and the neutral day vine when nothing is due.
 */
import { describe, expect, it } from 'vitest';
import type { AppState } from '@/state/types';
import { bestFlourishes, flourishKey, onceKeyExpired } from '@/domain/economy';
import { growthInfo } from '@/domain/growth';
import { machinePool, pityOf, pull } from '@/domain/gacha';
import { addDays, dayNumber } from '@/domain/dates';
import { plantVM } from '@/state/views/common';
import { todayVM } from '@/state/views/today';
import { Game, UTC, deepFreeze } from './game';

const patch = (g: Game, f: (s: AppState) => AppState): void => {
  g.state = deepFreeze(f(g.state));
};

describe('Flourishes are permanent visitors (DESIGN §13.10 "one of 8 permanent visitors")', () => {
  it('growthInfo never shows fewer Flourishes than the plant has had', () => {
    expect(growthInfo({ sunshine: 200, completedOccurrences: 300, bestStage: 7 }).flourishes).toBe(0);
    expect(growthInfo({ sunshine: 200, completedOccurrences: 300, bestStage: 7, bestFlourishes: 2 }).flourishes).toBe(2);
    expect(growthInfo({ sunshine: 400, completedOccurrences: 300, bestStage: 7, bestFlourishes: 1 }).flourishes).toBe(3);
    // Capped at 8, and nothing before Evergreen.
    expect(growthInfo({ sunshine: 200, completedOccurrences: 300, bestStage: 7, bestFlourishes: 12 }).flourishes).toBe(8);
    expect(growthInfo({ sunshine: 100, completedOccurrences: 300, bestStage: 5, bestFlourishes: 2 }).flourishes).toBe(0);
  });

  it('un-checking inside the refund window takes the sunshine back but not the visitor', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    // An Evergreen plant one sunshine short of its first Flourish (180 + 60).
    patch(g, (s) => ({ ...s, ledger: { ...s.ledger, sunshine: { ...s.ledger.sunshine, [a]: 239.5 }, bestStage: { ...s.ledger.bestStage, [a]: 7 } } }));
    g.checkIn(a);
    expect(g.state.ledger.sunshine[a]).toBeCloseTo(240.5);
    expect(bestFlourishes(g.state, a)).toBe(1);
    g.undo(a);
    expect(g.state.ledger.sunshine[a]).toBeCloseTo(239.5);
    expect(g.state.ledger.once[flourishKey(a)]).toBe(1);
    expect(plantVM(g.state, g.state.habits[0]!, g.today, UTC).flourishes).toBe(1);
  });
});

describe('pity counts only while its tier is armed (DESIGN §13.6 "a counter is hidden once its tier is fully owned")', () => {
  it('a fully owned tier keeps its counter at 0, so it can never fire the moment a new item joins', () => {
    const g = new Game({ start: '2026-03-02' });
    const rares = machinePool('cats', {}).filter((p) => p.rarity === 'rare');
    expect(rares.length).toBeGreaterThan(0);
    patch(g, (s) => ({
      ...s,
      wallet: { ...s.wallet, coins: 1000 },
      lifetime: { ...s.lifetime, pulls: 1 }, // past the onboarding capsule
      collection: { ...s.collection, ...Object.fromEntries(rares.map((r) => [r.id, { count: 1, firstAt: g.now }])) },
    }));
    let sinceUltra = 0;
    for (let i = 0; i < 12; i++) {
      const out = g.run((tx) => {
        const o = pull(tx, 'cats');
        tx.set('pendingReveal', undefined);
        return o;
      });
      if (!out.ok) throw new Error('pull failed');
      expect(pityOf(g.state, 'cats').sinceRare).toBe(0);
      expect(out.pity.rareIn).toBeNull();
      // The ultra tier still has something unowned: its counter runs as usual.
      sinceUltra = out.rarity === 'ultra' ? 0 : sinceUltra + 1;
      expect(pityOf(g.state, 'cats').sinceUltra).toBe(sinceUltra);
    }
  });

  it('while the tier is armed the counter runs as before', () => {
    const g = new Game({ start: '2026-03-02' });
    patch(g, (s) => ({ ...s, wallet: { ...s.wallet, coins: 1000 }, lifetime: { ...s.lifetime, pulls: 1 } }));
    let expected = 0;
    for (let i = 0; i < 5; i++) {
      const out = g.run((tx) => {
        const o = pull(tx, 'cats');
        tx.set('pendingReveal', undefined);
        return o;
      });
      if (!out.ok) throw new Error('pull failed');
      expected = out.rarity === 'rare' || out.rarity === 'ultra' ? 0 : expected + 1;
      expect(pityOf(g.state, 'cats').sinceRare).toBe(expected);
    }
  });
});

describe('period-goal keys outlive a week-start regrouping (DESIGN §13.5 "paid once per (habit, periodStart)")', () => {
  it('a paid week is remembered while any week holding a window day could overlap it', () => {
    const g = new Game({ start: '2026-09-01' });
    const y = g.addHabit({ schedule: { kind: 'weekly', times: 1, every: 1 } });
    const today = '2026-09-29';
    const key = (start: string) => `period|${y}|${start}`;
    // A week holding today−6 can start as early as today−12 (Sep 17) under another week start.
    expect(onceKeyExpired(g.state, key('2026-09-11'), dayNumber('2026-09-17'), today)).toBe(false);
    expect(onceKeyExpired(g.state, key('2026-09-10'), dayNumber('2026-09-16'), today)).toBe(false);
    expect(onceKeyExpired(g.state, key('2026-09-09'), dayNumber(addDays(today, -14)), today)).toBe(true);
  });
});

describe('the day vine when nothing day-based is due (§9.1 day progress)', () => {
  it('a flexible-only day is neutral until something is checked in, never a free full bloom', () => {
    const g = new Game({ start: '2026-03-02' });
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    const env = { today: g.today, now: g.now, local: UTC };
    expect(todayVM(g.state, env).progress).toMatchObject({ total: 0, nothingDue: true, fraction: 0, label: 'Nothing due' });
    g.checkIn(y);
    expect(todayVM(g.state, { ...env, now: g.now }).progress).toMatchObject({ total: 0, nothingDue: true, fraction: 1, label: '1 checked in' });
  });
});
