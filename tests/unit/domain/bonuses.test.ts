import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { CUTTING_KEY, cuttingOf, ledgerKey } from '@/domain/economy';
import * as gacha from '@/domain/gacha';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { HARVEST_BY_PLANT, LAUREL_SPRIG_ID } from '@/catalog/collectibles';
import { Game, at } from './game';

describe('Welcome home (≥ 3 quiet days, 20 coins + 1 ticket, once per 14 days)', () => {
  it('pays after three quiet days, never after two, and mentions no gap', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.checkIn(a);
    g.goTo('2026-03-05'); // 2 quiet days (3rd, 4th)
    g.checkIn(a);
    expect(g.allOf('welcomeHome')).toHaveLength(0);
    g.goTo('2026-03-09'); // 3 quiet days (6th, 7th, 8th)
    g.checkIn(a);
    expect(g.lastOf('welcomeHome')).toEqual([{ type: 'welcomeHome', coins: 20, tickets: 1 }]);
    expect(g.state.wallet.tickets).toBe(1);
    expect(g.state.badges['comeback']).toBeDefined();
  });

  it('is limited to once per 14 days', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.checkIn(a);
    g.goTo('2026-03-06');
    g.checkIn(a); // home #1 (quiet 3rd–5th)
    g.goTo('2026-03-10');
    g.checkIn(a); // quiet again, but within 14 days
    expect(g.allOf('welcomeHome')).toHaveLength(1);
    g.goTo('2026-03-24');
    g.checkIn(a);
    expect(g.allOf('welcomeHome')).toHaveLength(2);
  });
});

describe('period goal (+10 weekly / +20 monthly, once per period)', () => {
  it('pays in the first full period after creation, once', () => {
    const g = new Game({ start: '2026-03-04' }); // a Wednesday
    g.setWallet({ coins: 50 });
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    g.checkIn(y);
    g.goTo('2026-03-05');
    g.checkIn(y);
    expect(g.allOf('periodGoal')).toHaveLength(0); // created mid-week: no goal bonus that week
    g.goTo('2026-03-09');
    g.checkIn(y);
    g.goTo('2026-03-10');
    g.checkIn(y);
    expect(g.allOf('periodGoal')).toEqual([{ type: 'periodGoal', habitId: y, period: 'week', coins: 10 }]);
    g.undo(y);
    g.checkIn(y);
    expect(g.allOf('periodGoal')).toHaveLength(1);
  });

  it('monthly kinds pay +20', () => {
    const g = new Game({ start: '2026-03-20' });
    const m = g.addHabit({ name: 'Deep clean', schedule: { kind: 'monthly', times: 1, every: 1 } });
    g.goTo('2026-04-03');
    g.checkIn(m);
    expect(g.lastOf('periodGoal')).toEqual([{ type: 'periodGoal', habitId: m, period: 'month', coins: 20 }]);
  });

  it('switching weekly ↔ monthly "this period" cannot mint extra bonuses', () => {
    const g = new Game({ start: '2026-02-02' });
    g.setWallet({ coins: 100 });
    const h = g.addHabit({ name: 'Flex', schedule: { kind: 'weekly', times: 1, every: 1 } });
    g.goTo('2026-03-02'); // a Monday, long after creation
    g.checkIn(h);
    expect(g.allOf('periodGoal')).toHaveLength(1);
    g.goTo('2026-03-03');
    for (let i = 0; i < 3; i++) {
      g.run((tx) => habits.updateHabit(tx, h, { schedule: { kind: 'monthly', times: 1, every: 1 } }, 'today'));
      g.checkIn(h);
      g.undo(h);
      g.run((tx) => habits.updateHabit(tx, h, { schedule: { kind: 'weekly', times: 1, every: 1 } }, 'today'));
      g.checkIn(h);
      g.undo(h);
    }
    expect(g.allOf('periodGoal')).toHaveLength(1);
  });

  it('deleting and re-creating a habit cannot repeat a period bonus', () => {
    const g = new Game({ start: '2026-02-02' });
    g.goTo('2026-03-02');
    for (let i = 0; i < 3; i++) {
      const h = g.addHabit({ name: 'Flex', schedule: { kind: 'weekly', times: 1, every: 1 } });
      g.checkIn(h);
      g.run((tx) => habits.deleteHabit(tx, h));
    }
    expect(g.allOf('periodGoal')).toHaveLength(0);
  });
});

describe('changing the week start cannot pay the same days twice', () => {
  it('no second goal bonus for a regrouped week, no second letter for an overlapping week', async () => {
    const { updateSettings } = await import('@/domain/profile');
    const g = new Game({ start: '2026-02-02' });
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 1, every: 1 } });
    g.goTo('2026-03-03'); // Tuesday; week Mon Mar 2 – Sun Mar 8
    g.checkIn(y);
    expect(g.allOf('periodGoal')).toHaveLength(1);
    g.goTo('2026-03-04');
    g.run((tx) => updateSettings(tx, { weekStart: 0 })); // now Sun Mar 1 – Sat Mar 7
    g.undo(y, '2026-03-03');
    g.checkIn(y);
    expect(g.allOf('periodGoal')).toHaveLength(1);
    // Letters: Monday weeks first…
    g.run((tx) => updateSettings(tx, { weekStart: 1 }));
    g.goTo('2026-03-09');
    expect(g.state.inbox.map((l) => l.id)).toContain('weekly-2026-03-02');
    // …then Sunday weeks: the week of Sun Mar 8 overlaps nothing, the week of Sun Mar 1 would.
    g.run((tx) => updateSettings(tx, { weekStart: 0 }));
    g.goTo('2026-03-10');
    expect(g.state.inbox.filter((l) => l.kind === 'weekly').map((l) => l.id)).toEqual(['weekly-2026-03-02']);
  });
});

describe('streak rungs (coins only, once per habit and tier)', () => {
  it('pays 3 → 10 and 7 → 20, once', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    for (let d = 0; d < 7; d++) {
      g.checkIn(a);
      if (d < 6) g.advance(1);
    }
    expect(g.allOf('rung').map((e) => [e.tierDays, e.coins, e.streak, e.unit])).toEqual([
      [3, 10, 3, 'days'],
      [7, 20, 7, 'days'],
    ]);
    g.undo(a);
    g.checkIn(a);
    expect(g.allOf('rung')).toHaveLength(2);
  });

  it('rungs first reached through history edits count as reached but unpaid', () => {
    const g = new Game({ start: '2026-03-01' });
    const a = g.addHabit();
    g.goTo('2026-03-20');
    for (let d = '2026-03-01'; d <= '2026-03-13'; d = addDays(d, 1)) g.run((tx) => logging.editHistory(tx, a, d, true));
    expect(g.coins).toBe(0);
    g.checkIn(a, '2026-03-14');
    expect(g.allOf('rung').map((e) => e.tierDays)).toEqual([14]);
  });

  it('weekly streaks use the occurrence-equivalent (periods × times)', () => {
    const g = new Game({ start: '2026-03-02' });
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 3, every: 1 } });
    for (const d of ['2026-03-02', '2026-03-03', '2026-03-04']) {
      g.goTo(d);
      g.checkIn(y);
    }
    expect(g.lastOf('rung')).toEqual([{ type: 'rung', habitId: y, streak: 1, unit: 'weeks', tierDays: 3, coins: 10 }]);
  });
});

describe('plants: one stage per check-in, stage events, the Laurel Sprig, harvest', () => {
  it('a faithful monthly habit climbs one stage per check-in to Evergreen; the first Evergreen grants the Laurel Sprig', () => {
    const g = new Game({ start: '2026-01-01' });
    const m = g.addHabit({ name: 'Deep clean', plant: 'catgrass', schedule: { kind: 'monthly', times: 1, every: 1 } });
    const n = g.addHabit({ name: 'Filters', plant: 'pothos', schedule: { kind: 'monthly', times: 1, every: 1 } });
    const stages: number[] = [];
    for (let i = 0; i < 7; i++) {
      g.goTo(`2026-0${i + 1}-15`);
      g.checkIn(m);
      stages.push(...g.lastOf('plantStage').filter((e) => e.habitId === m).map((e) => e.stage));
      g.checkIn(n);
    }
    expect(stages).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(g.allOf('plantStage').filter((e) => e.habitId === m).map((e) => e.stageName)).toEqual(['Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen']);
    expect(g.state.ledger.bestStage[m]).toBe(7);
    expect(g.state.ledger.bestStage[n]).toBe(7); // a second Evergreen plant…
    expect(g.allOf('exclusive').filter((e) => e.collectibleId === LAUREL_SPRIG_ID)).toHaveLength(1); // …grants nothing more
    expect(g.state.collection[LAUREL_SPRIG_ID]?.count).toBe(1);
    expect(g.state.badges['first-bloom']).toBeDefined();
    expect(g.state.badges['first-evergreen']).toBeDefined();
    const harvests = g.allOf('harvest');
    expect(harvests[0]).toMatchObject({ habitId: m, treatId: HARVEST_BY_PLANT.catgrass, firstTime: true });
    expect(harvests).toHaveLength(3); // Blooming, Flourishing, Evergreen check-ins; the pothos is not edible
    expect(harvests.every((h) => h.habitId === m)).toBe(true);
    expect(g.state.badges['first-harvest']).toBeDefined();
  });

  it('harvest: only edible plants, only from Blooming, at most one per plant per day', () => {
    expect(Object.keys(HARVEST_BY_PLANT).sort()).toEqual(['catgrass', 'catnip', 'lavender', 'strawberry']);
    const g = new Game({ start: '2026-03-02' });
    const grass = g.addHabit({ name: 'Water', plant: 'catgrass', target: 3 });
    // Grow it to Blooming the honest way (42 daily check-ins).
    for (let i = 0; i < 42; i++) {
      for (let k = 0; k < 3; k++) g.checkIn(grass);
      g.advance(1);
    }
    const before = g.allOf('harvest').length;
    expect(g.state.ledger.bestStage[grass]).toBeGreaterThanOrEqual(5);
    for (let k = 0; k < 3; k++) g.checkIn(grass);
    g.undo(grass);
    g.checkIn(grass);
    expect(g.allOf('harvest').length - before).toBe(1); // one a day, however often the day completes
  });

  it('plants never shrink: un-checking keeps the best stage on display', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.checkIn(a);
    expect(g.state.ledger.bestStage[a]).toBe(1);
    g.undo(a);
    expect(g.state.ledger.sunshine[a]).toBe(0);
    expect(g.state.ledger.bestStage[a]).toBe(1);
  });

  it('The Cutting never shrinks either: an un-check keeps the stage it reached', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    for (let i = 0; i < 5; i++) {
      g.checkIn(a);
      if (i < 4) g.advance(1);
    }
    expect(cuttingOf(g.state)).toMatchObject({ stage: 1, toNext: 15 }); // 5 lifetime sunshine: roots
    g.undo(a);
    expect(cuttingOf(g.state)).toMatchObject({ stage: 1, progress: 0, toNext: 16 }); // 4 sunshine, still rooted
    expect(g.state.ledger.once[CUTTING_KEY]).toBe(1);
  });
});

describe('no buddy: check-ins give no pet XP until Keeping Company pairs a pet with a habit (§8.2, §14.1)', () => {
  it('a day of check-ins leaves every pet’s XP where it was', () => {
    const g = new Game();
    g.run((tx) => (gacha.pull(tx, 'cats', { free: true }), gacha.finishReveal(tx)));
    const ids = Array.from({ length: 12 }, (_, i) => g.addHabit({ name: `H${i}` }));
    for (const id of ids) g.checkIn(id);
    expect(Object.values(g.state.pets).map((p) => p.xp)).toEqual([0]);
    expect(g.allOf('petLevel')).toEqual([]);
  });
});

describe('tiny at day end (§13.2)', () => {
  it('a count habit that reached its tiny count is paid as tiny once the day closes', () => {
    const g = new Game({ start: '2026-03-02' });
    const w = g.addHabit({ name: 'Water', effort: 'light', target: 8, tiny: { label: '4 glasses', count: 4 } });
    for (let i = 0; i < 5; i++) g.checkIn(w);
    expect(g.state.ledger.recent[ledgerKey(w, '2026-03-02')]).toBeUndefined();
    const coins = g.coins;
    g.advance(1);
    expect(g.state.ledger.recent[ledgerKey(w, '2026-03-02')]).toMatchObject({ lvl: 'tiny', coins: 2 });
    expect(g.coins).toBe(coins + 2);
  });
});

describe('clock guard (§13.2)', () => {
  it('pays nothing while the clock is > 36 h behind, and never moves today backwards', () => {
    const g = new Game({ start: '2026-03-10' });
    const a = g.addHabit();
    const before = g.state.clock.lastCheckinAt;
    g.now = at('2026-03-08', 12); // 48 h back
    expect(g.today).toBe('2026-03-10');
    const r = g.checkIn(a);
    expect(r).toMatchObject({ completed: true, rewarded: false, coins: 0 });
    expect(g.coins).toBe(0);
    expect(g.state.logs[a]!['2026-03-10']).toEqual({ kind: 'log', count: 1 }); // no live stamp
    expect(g.state.clock.lastCheckinAt).toBe(before);
    g.now = at('2026-03-10', 13); // caught up
    g.undo(a);
    g.checkIn(a);
    expect(g.coins).toBeGreaterThan(0);
  });

  it('a small (< 36 h) rollback keeps paying but the budget day never goes back', () => {
    const g = new Game({ start: '2026-03-10' });
    const a = g.addHabit();
    g.now = at('2026-03-09', 12); // 24 h back
    g.checkIn(a);
    expect(Object.keys(g.state.ledger.daily)).toEqual(['2026-03-10']);
  });
});

describe('delete & recreate', () => {
  it('refunds what it can and never inflates lifetime check-ins', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    for (let i = 0; i < 5; i++) {
      const h = g.addHabit({ name: 'Farm' });
      g.checkIn(h);
      g.run((tx) => habits.deleteHabit(tx, h));
    }
    expect(g.coins).toBe(100);
    expect(g.state.lifetime.checkins).toBe(0);
    expect(g.state.badges['checkins-10']).toBeUndefined();
  });
});

describe('perfect week badge', () => {
  it('is earned when every day of a calendar week is a perfect day', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday (week starts Monday)
    const ids = [g.addHabit(), g.addHabit({ name: 'Read' })];
    for (let d = 0; d < 7; d++) {
      for (const id of ids) g.checkIn(id);
      if (d < 6) g.advance(1);
    }
    expect(g.state.lifetime.perfectDays).toBe(7);
    expect(g.state.badges['perfect-week']).toBeDefined();
  });
});
