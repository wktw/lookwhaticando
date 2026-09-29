import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { ledgerKey } from '@/domain/economy';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { HARVEST_BY_PLANT, EVERGREEN_CROWN_ID, MOCHI_ID } from '@/catalog/collectibles';
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

describe('plants: one stage per check-in, stage events, Evergreen Crown, harvest', () => {
  it('a faithful monthly habit climbs one stage per check-in to Evergreen and gets the crown', () => {
    const g = new Game({ start: '2026-01-01' });
    const m = g.addHabit({ name: 'Deep clean', plant: 'tulip', schedule: { kind: 'monthly', times: 1, every: 1 } });
    const stages: number[] = [];
    for (let i = 0; i < 7; i++) {
      g.goTo(`2026-0${i + 1}-15`);
      g.checkIn(m);
      stages.push(...g.lastOf('plantStage').map((e) => e.stage));
    }
    expect(stages).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(g.state.ledger.bestStage[m]).toBe(7);
    expect(g.allOf('exclusive').map((e) => e.collectibleId)).toContain(EVERGREEN_CROWN_ID);
    expect(g.state.collection[EVERGREEN_CROWN_ID]?.count).toBe(1);
    expect(g.state.badges['first-bloom']).toBeDefined();
    expect(g.state.badges['first-evergreen']).toBeDefined();
    const harvests = g.allOf('harvest');
    expect(harvests[0]).toMatchObject({ habitId: m, treatId: HARVEST_BY_PLANT.tulip, firstTime: true });
    expect(harvests).toHaveLength(3); // Blooming, Flourishing, Evergreen check-ins
    expect(g.state.badges['first-harvest']).toBeDefined();
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
});

describe('buddy XP (+1 per completing check-in, max 10 a day)', () => {
  it('caps at 10 a day and resets on a new app day', () => {
    const g = new Game();
    const ids = Array.from({ length: 12 }, (_, i) => g.addHabit({ name: `H${i}` }));
    for (const id of ids) g.checkIn(id);
    expect(g.state.pets[MOCHI_ID]!.xp).toBe(10);
    g.advance(1);
    g.checkIn(ids[0]!);
    expect(g.state.pets[MOCHI_ID]!.xp).toBe(11);
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
