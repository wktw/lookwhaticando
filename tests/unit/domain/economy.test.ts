import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { DAILY_BUDGET, PAY, SHOW_UP_LADDER, fullRateCoins, ledgerKey, perfectDayCoins, showUpRung, nextShowUpRung } from '@/domain/economy';
import { WINDOW_SEAT_ID } from '@/catalog/collectibles';
import * as habits from '@/domain/habits';
import { Game } from './game';

describe('check-in pay (DESIGN §13.5)', () => {
  it.each([
    ['light', 4, 2],
    ['steady', 5, 3],
    ['big', 7, 4],
  ] as const)('%s pays %i, tiny ⌈pay/2⌉ = %i', (effort, full, tiny) => {
    const g = new Game();
    const a = g.addHabit({ effort, tiny: { label: 'small' } });
    const b = g.addHabit({ name: 'Read', effort, tiny: { label: 'one page' } });
    const r = g.checkIn(a);
    expect(r).toMatchObject({ completed: true, rewarded: true });
    expect(g.lastOf('coins').filter((e) => e.reason === 'checkin').map((e) => e.amount)).toEqual([full]);
    const before = g.coins;
    g.tiny(b);
    expect(g.coins - before - g.lastOf('coins').filter((e) => e.reason !== 'checkin').reduce((x, e) => x + e.amount, 0)).toBe(tiny);
  });

  it('the first check-in ever tops the wallet up to exactly 25 (First Sprout)', () => {
    const g = new Game();
    const a = g.addHabit();
    g.checkIn(a);
    expect(g.coins).toBe(25);
    expect(g.lastOf('coins').map((e) => [e.reason, e.amount])).toEqual([
      ['checkin', 5],
      ['gift', 20],
    ]);
    const b = g.addHabit({ name: 'Read' });
    g.checkIn(b);
    // No second top-up: +5 for the check-in, +4 because both habits are done (a perfect day).
    expect(g.lastOf('coins').map((e) => [e.reason, e.amount])).toEqual([
      ['checkin', 5],
      ['perfect', 4],
    ]);
    expect(g.coins).toBe(34);
  });

  it('partial taps on a count habit pay nothing; completing pays once; over-target pays nothing more', () => {
    const g = new Game();
    const w = g.addHabit({ name: 'Water', target: 3, effort: 'light' });
    expect(g.checkIn(w)).toMatchObject({ partial: true, completed: false, rewarded: false });
    expect(g.checkIn(w)).toMatchObject({ partial: true, completed: false });
    const c = g.checkIn(w);
    expect(c).toMatchObject({ completed: true, rewarded: true });
    const coins = g.coins;
    g.checkIn(w); // 4 / 3
    expect(g.coins).toBe(coins);
    expect(g.state.logs[w]![g.today]).toMatchObject({ count: 4 });
  });
});

describe('uncheck / recheck / spend / refund (reward integrity)', () => {
  it('uncheck refunds when affordable and re-check pays again, never twice', () => {
    const g = new Game();
    const a = g.addHabit();
    g.checkIn(a); // 5 + 20 gift
    expect(g.coins).toBe(25);
    g.undo(a);
    expect(g.coins).toBe(20);
    expect(g.lastOf('uncheck')[0]).toMatchObject({ refunded: 5 });
    g.checkIn(a);
    expect(g.coins).toBe(25);
    for (let i = 0; i < 5; i++) {
      g.undo(a);
      g.checkIn(a);
    }
    expect(g.coins).toBe(25);
    expect(g.state.lifetime.checkins).toBe(1);
  });

  it('when the coins were spent, the grant stays recorded: no refund, and re-checking pays nothing', () => {
    const g = new Game();
    const a = g.addHabit();
    g.checkIn(a);
    g.setWallet({ coins: 2 }); // spent
    g.undo(a);
    expect(g.coins).toBe(2);
    expect(g.lastOf('uncheck')[0]).toMatchObject({ refunded: 0 });
    expect(g.state.ledger.recent[ledgerKey(a, g.today)]).toMatchObject({ coins: 5 });
    g.checkIn(a);
    expect(g.coins).toBe(2);
    expect(g.state.ledger.recent[ledgerKey(a, g.today)]).toMatchObject({ coins: 5, lvl: 'full' });
  });

  it('balances never go negative', () => {
    const g = new Game();
    const a = g.addHabit();
    g.checkIn(a);
    g.setWallet({ coins: 0 });
    g.undo(a);
    expect(g.coins).toBe(0);
  });

  it('effort edits cannot be farmed: a re-check pays min(original, current rate)', () => {
    const g = new Game();
    const a = g.addHabit({ effort: 'light' });
    g.checkIn(a);
    const base = g.coins;
    g.run((tx) => habits.updateHabit(tx, a, { effort: 'big' }));
    g.undo(a);
    expect(g.coins).toBe(base - 4);
    g.checkIn(a);
    expect(g.coins).toBe(base);
  });

  it('tapping past the target after an effort edit pays nothing', () => {
    const g = new Game();
    const w = g.addHabit({ name: 'Water', target: 2, effort: 'light' });
    g.checkIn(w);
    g.checkIn(w);
    const coins = g.coins;
    g.run((tx) => habits.updateHabit(tx, w, { effort: 'big' }));
    g.checkIn(w);
    expect(g.coins).toBe(coins);
  });

  it('tiny then full pays the difference; full then tiny-level count refunds the difference', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    const w = g.addHabit({ name: 'Water', target: 8, tiny: { label: '4 glasses', count: 4 }, effort: 'steady' });
    const coins0 = g.coins;
    g.tiny(w);
    // The tiny version is a level (§13.2 "stored as level:'tiny'"): the count is left as it was.
    expect(g.state.logs[w]![g.today]).toMatchObject({ count: 0, level: 'tiny' });
    const afterTiny = g.coins;
    expect(afterTiny - coins0).toBeGreaterThanOrEqual(3);
    g.setCount(w, g.today, 8);
    expect(g.state.logs[w]![g.today]).toEqual(expect.not.objectContaining({ level: 'tiny' }));
    expect(g.state.ledger.recent[ledgerKey(w, g.today)]).toMatchObject({ coins: 5, lvl: 'full' });
  });
});

describe('daily full-rate budget: 40 coins per wall-clock action day', () => {
  it('pays full rate up to 40, then 1 coin each', () => {
    expect(fullRateCoins('big', 0)).toBe(7);
    expect(fullRateCoins('big', 37)).toBe(3);
    expect(fullRateCoins('big', 40)).toBe(1);
    expect(fullRateCoins('light', 99)).toBe(1);
    const g = new Game();
    const ids = Array.from({ length: 12 }, (_, i) => g.addHabit({ name: `H${i}`, effort: 'steady' }));
    for (const id of ids) g.checkIn(id);
    const paid = g.allOf('coins').filter((e) => e.reason === 'checkin').map((e) => e.amount);
    expect(paid).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 1, 1]);
    expect(g.state.ledger.daily[g.today]).toBe(DAILY_BUDGET + 4);
  });

  it('is keyed by the action day, not the log date: backfilling a week shares one budget', () => {
    const g = new Game({ start: '2026-03-02' });
    const ids = Array.from({ length: 2 }, (_, i) => g.addHabit({ name: `H${i}`, effort: 'big' }));
    g.goTo('2026-03-09');
    for (let d = 1; d <= 6; d++) for (const id of ids) g.checkIn(id, addDays('2026-03-09', -d));
    const paid = g.allOf('coins').filter((e) => e.reason === 'checkin').map((e) => e.amount);
    expect(paid.reduce((a, b) => a + b, 0)).toBe(40 + 6);
    expect(Object.keys(g.state.ledger.daily)).toEqual(['2026-03-09']);
  });

  it('refunds free the budget of the day they happen', () => {
    const g = new Game();
    const a = g.addHabit({ effort: 'big' });
    g.checkIn(a);
    expect(g.state.ledger.daily[g.today]).toBe(7);
    g.undo(a);
    expect(g.state.ledger.daily[g.today]).toBe(0);
  });
});

describe('backfill limits and the createdAt guard (DESIGN §13.2)', () => {
  it('only the 6-day window pays; older days are history', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.goTo('2026-03-20');
    const coins = g.coins;
    expect(g.checkIn(a, '2026-03-13')).toMatchObject({ completed: true, rewarded: false });
    expect(g.coins).toBe(coins);
    expect(g.checkIn(a, '2026-03-14')).toMatchObject({ completed: true, rewarded: true });
  });

  it('days before the habit was created never pay, even inside the window', () => {
    const g = new Game({ start: '2026-03-10' });
    const a = g.addHabit();
    g.run((tx) => habits.setStartedOn(tx, a, '2026-03-05'));
    expect(g.checkIn(a, '2026-03-07')).toMatchObject({ completed: true, rewarded: false });
    expect(g.state.ledger.recent[ledgerKey(a, '2026-03-07')]).toBeUndefined();
    expect(g.checkIn(a, '2026-03-10')).toMatchObject({ rewarded: true });
  });

  it('future days cannot be logged', () => {
    const g = new Game();
    const a = g.addHabit();
    expect(g.checkIn(a, addDays(g.today, 1))).toMatchObject({ completed: false, rewarded: false });
    expect(g.state.logs[a]).toBeUndefined();
  });
});

describe('flexible habits beyond times', () => {
  it('pay 1 coin, no sunshine, no bonus; un-checking an in-target day promotes the over day', () => {
    const g = new Game({ start: '2026-03-02' }); // a Monday
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    g.goTo('2026-03-09'); // next Monday: a full period that began after creation
    g.setWallet({ coins: 100 });
    g.checkIn(y, '2026-03-09');
    g.goTo('2026-03-10');
    g.checkIn(y);
    expect(g.lastOf('periodGoal')).toEqual([{ type: 'periodGoal', habitId: y, period: 'week', coins: 10 }]);
    g.goTo('2026-03-11');
    const sun = g.state.ledger.sunshine[y];
    g.checkIn(y);
    expect(g.lastOf('coins').map((e) => [e.reason, e.amount])).toEqual([['checkin', 1]]);
    expect(g.state.ledger.sunshine[y]).toBe(sun);
    expect(g.state.ledger.recent[ledgerKey(y, '2026-03-11')]).toMatchObject({ lvl: 'over', coins: 1, sunshine: 0 });
    g.undo(y, '2026-03-09');
    expect(g.state.ledger.recent[ledgerKey(y, '2026-03-11')]).toMatchObject({ lvl: 'full', coins: 5 });
    expect(g.state.ledger.sunshine[y]).toBe(sun);
  });
});

describe('perfect day', () => {
  it('pays 2 × done clamped to 4..16, once per date', () => {
    expect([0, 1, 2, 5, 8, 9, 20].map(perfectDayCoins)).toEqual([4, 4, 4, 10, 16, 16, 16]);
    const g = new Game();
    const a = g.addHabit();
    const b = g.addHabit({ name: 'Read' });
    const c = g.addHabit({ name: 'Stretch' });
    g.checkIn(a);
    g.checkIn(b);
    expect(g.allOf('perfectDay')).toHaveLength(0);
    g.checkIn(c);
    expect(g.lastOf('perfectDay')).toEqual([{ type: 'perfectDay', date: g.today, coins: 6 }]);
    g.undo(c);
    g.checkIn(c);
    expect(g.allOf('perfectDay')).toHaveLength(1);
    expect(g.state.lifetime.perfectDays).toBe(1);
  });

  it('an allowed rest completes the day; needs at least 2 done', () => {
    const g = new Game();
    const a = g.addHabit();
    const b = g.addHabit({ name: 'Read' });
    const c = g.addHabit({ name: 'Stretch' });
    g.checkIn(a);
    g.rest(c, g.today);
    expect(g.allOf('perfectDay')).toHaveLength(0);
    g.checkIn(b);
    expect(g.allOf('perfectDay')).toHaveLength(1);
  });
});

describe('Showing-up ladder', () => {
  it('has exactly the §6 rungs, the Window Seat at 365, then 6 stamps + 1 ticket every +100', () => {
    // DESIGN §6: 7:1 · 14:2 · 21:2+🎟 · 30:3+🎟 · 45:3 · 60:4+🎟 · 90:5+🎟 · 120:5+🎟 · 180:6+2🎟 · 250:8+2🎟 · 365: 12 + 3🎟 + the Window Seat.
    expect(SHOW_UP_LADDER.map((r) => [r.days, r.stars, r.tickets])).toEqual([
      [7, 1, 0],
      [14, 2, 0],
      [21, 2, 1],
      [30, 3, 1],
      [45, 3, 0],
      [60, 4, 1],
      [90, 5, 1],
      [120, 5, 1],
      [180, 6, 2],
      [250, 8, 2],
      [365, 12, 3],
    ]);
    expect(SHOW_UP_LADDER.filter((r) => r.exclusive).map((r) => [r.days, r.exclusive])).toEqual([[365, WINDOW_SEAT_ID]]);
    expect(showUpRung(7)).toEqual({ days: 7, stars: 1, tickets: 0 });
    expect(showUpRung(21)).toEqual({ days: 21, stars: 2, tickets: 1 });
    expect(showUpRung(365)).toMatchObject({ stars: 12, tickets: 3, exclusive: 'decor-window-seat' });
    expect(showUpRung(465)).toEqual({ days: 465, stars: 6, tickets: 1 });
    expect(showUpRung(500)).toBeNull();
    expect(nextShowUpRung(365).days).toBe(465);
    expect(nextShowUpRung(0).days).toBe(7);
  });

  it('counts distinct action days with a rewarded check-in (not habits, not rests)', () => {
    const g = new Game({ start: '2026-03-02' });
    const ids = [g.addHabit(), g.addHabit({ name: 'B' }), g.addHabit({ name: 'C' })];
    for (let d = 0; d < 8; d++) {
      for (const id of ids) g.checkIn(id);
      g.advance(1);
    }
    expect(g.state.lifetime.showUpDays).toBe(8);
    expect(g.allOf('showUp').map((e) => e.days)).toEqual([7]);
    expect(g.state.wallet.stars).toBeGreaterThanOrEqual(1);
  });
});

describe('Showing-up ladder rewards', () => {
  it('pays stars at 7 and 14, stars + a ticket at 21', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    for (let d = 0; d < 21; d++) {
      g.checkIn(a);
      g.advance(1);
    }
    expect(g.allOf('showUp').map((e) => [e.days, e.stars, e.tickets])).toEqual([
      [7, 1, 0],
      [14, 2, 0],
      [21, 2, 1],
    ]);
    expect(g.state.wallet.tickets).toBe(1);
    expect(Object.keys(g.state.ledger.once).filter((k) => k.startsWith('showup|'))).toEqual(['showup|7', 'showup|14', 'showup|21']);
  });
});

describe('tiny → full', () => {
  it('a check-in on a tiny-logged one-tap habit upgrades it and pays only the difference', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    const a = g.addHabit({ tiny: { label: 'Shoes on' } });
    g.tiny(a);
    const afterTiny = g.coins;
    const r = g.checkIn(a);
    expect(r.completed).toBe(false); // it had already counted as showing up
    expect(g.state.logs[a]![g.today]).toMatchObject({ kind: 'log', count: 1 });
    expect(g.state.logs[a]![g.today]!).not.toHaveProperty('level');
    expect(g.coins - afterTiny).toBe(PAY.steady - Math.ceil(PAY.steady / 2));
    expect(g.checkIn(a).rewarded).toBe(false); // and only once
  });
});

describe('PAY table', () => {
  it('matches §13.5', () => expect(PAY).toEqual({ light: 4, steady: 5, big: 7 }));
});
