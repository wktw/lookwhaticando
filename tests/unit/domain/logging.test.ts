import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { Game, at } from './game';

describe('taps and counts', () => {
  it('a one-tap habit toggles via check/undo; count habits add step and may go over target', () => {
    const g = new Game();
    const a = g.addHabit();
    const w = g.addHabit({ name: 'Water', target: 8, step: 2, unit: 'glasses' });
    expect(g.checkIn(a)).toMatchObject({ completed: true });
    expect(g.checkIn(a)).toMatchObject({ completed: false, rewarded: false });
    expect(g.state.logs[a]![g.today]).toMatchObject({ count: 1 });
    for (let i = 0; i < 5; i++) g.checkIn(w);
    expect(g.state.logs[w]![g.today]).toMatchObject({ count: 10 });
    g.undo(w);
    expect(g.state.logs[w]![g.today]).toMatchObject({ count: 8 });
  });

  it('live check-ins record their time (max 24); backfills and undone taps do not keep one', () => {
    const g = new Game({ start: '2026-03-02', hour: 8 });
    const w = g.addHabit({ name: 'Water', target: 30 });
    for (let i = 0; i < 26; i++) {
      g.now = at('2026-03-02', 8, i);
      g.checkIn(w);
    }
    const at1 = (g.state.logs[w]!['2026-03-02'] as { at: number[] }).at;
    expect(at1).toHaveLength(24);
    expect(at1.at(-1)).toBe(at('2026-03-02', 8, 25));
    g.undo(w);
    expect((g.state.logs[w]!['2026-03-02'] as { at: number[] }).at).toHaveLength(23);
    const b = g.addHabit({ name: 'Read' });
    g.goTo('2026-03-03');
    g.checkIn(b, '2026-03-02'); // a backfill carries no stamp
    expect(g.state.logs[b]!['2026-03-02']).toEqual({ kind: 'log', count: 1 });
  });

  it('setCount sets exact values (flexible clamps to 0/1) and an increase counts as a check-in', () => {
    const g = new Game();
    const w = g.addHabit({ name: 'Water', target: 8 });
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    g.setCount(w, g.today, 8);
    expect(g.lastOf('checkin')).toMatchObject([{ completed: true, count: 8 }]);
    g.setCount(w, g.today, 3);
    expect(g.lastOf('coins')).toMatchObject([{ reason: 'refund' }]);
    g.setCount(y, g.today, 5);
    expect(g.state.logs[y]![g.today]).toMatchObject({ count: 1 });
    g.setCount(y, g.today, Number.NaN);
    expect(g.state.logs[y]![g.today]).toMatchObject({ count: 1 });
  });

  it('archived habits accept logs up to their archive day only', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.goTo('2026-03-04');
    g.run((tx) => habits.archiveHabit(tx, a));
    g.goTo('2026-03-06');
    expect(g.checkIn(a, '2026-03-04').completed).toBe(true);
    expect(g.checkIn(a, '2026-03-05').completed).toBe(false);
  });
});

describe('rests', () => {
  it('day-based only; replaces a check-in (refunding it) and keeps the note', () => {
    const g = new Game();
    const a = g.addHabit();
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    expect(g.rest(y, g.today)).toBe(false);
    g.checkIn(a);
    g.run((tx) => logging.setNote(tx, a, g.today, 'tired'));
    const coins = g.coins;
    expect(g.rest(a, g.today)).toBe(true);
    expect(g.state.logs[a]![g.today]).toEqual({ kind: 'rest', note: 'tired' });
    expect(g.coins).toBeLessThan(coins);
    expect(g.state.badges['first-rest']).toBeDefined();
    expect(g.rest(a, g.today)).toBe(true);
    expect(g.state.logs[a]![g.today]).toEqual({ kind: 'log', count: 0, note: 'tired' });
  });

  it('can be planned up to 14 days ahead, and set back into the 6-day window', () => {
    const g = new Game({ start: '2026-03-01' });
    const a = g.addHabit();
    g.goTo('2026-03-10');
    expect(g.rest(a, '2026-03-24')).toBe(true);
    expect(g.rest(a, '2026-03-25')).toBe(false);
    expect(g.rest(a, '2026-03-04')).toBe(true);
    expect(g.rest(a, '2026-03-03')).toBe(false);
  });
});

describe('days off (max 4 per calendar month)', () => {
  it('today or up to 14 ahead; the fifth in a month is refused; removing is always allowed', () => {
    const g = new Game({ start: '2026-03-27' });
    const off = (d: string) => g.run((tx) => logging.toggleOffDay(tx, d));
    expect(off('2026-03-26')).toEqual({ ok: false, remaining: 4 }); // the past
    expect(off('2026-03-27')).toEqual({ ok: true, remaining: 3 });
    expect(off('2026-03-28')).toEqual({ ok: true, remaining: 2 });
    expect(off('2026-03-29')).toEqual({ ok: true, remaining: 1 });
    expect(off('2026-03-30')).toEqual({ ok: true, remaining: 0 });
    expect(off('2026-03-31')).toEqual({ ok: false, remaining: 0 }); // a fifth in March
    expect(off('2026-04-01')).toEqual({ ok: true, remaining: 3 }); // April has its own four
    expect(off('2026-03-28')).toEqual({ ok: true, remaining: 1 }); // removing is always allowed
    expect(off('2026-04-11')).toEqual({ ok: false, remaining: 3 }); // more than 14 days ahead
  });
});

describe('notes and history edits', () => {
  it('notes: ≤ 280 characters (emoji-safe), empty removes, never a check-in', () => {
    const g = new Game();
    const a = g.addHabit();
    g.run((tx) => logging.setNote(tx, a, g.today, `  ${'🌿'.repeat(300)}  `));
    const note = (g.state.logs[a]![g.today] as { note: string }).note;
    expect(Array.from(note)).toHaveLength(280);
    expect(g.state.lifetime.checkins).toBe(0);
    g.run((tx) => logging.setNote(tx, a, g.today, '   '));
    expect(g.state.logs[a]?.[g.today]).toBeUndefined();
    g.run((tx) => logging.setNote(tx, a, addDays(g.today, 1), 'future'));
    expect(g.state.logs[a]?.[addDays(g.today, 1)]).toBeUndefined();
  });

  it('history edits never touch rewards; days inside the window go through the check-in path instead', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.goTo('2026-03-20');
    const old = '2026-03-10';
    const before = { wallet: g.state.wallet, ledger: g.state.ledger, lifetime: g.state.lifetime, badges: g.state.badges };
    expect(g.run((tx) => logging.editHistory(tx, a, old, true))).toBe(true);
    expect(g.state.logs[a]![old]).toEqual({ kind: 'log', count: 1 });
    expect({ wallet: g.state.wallet, ledger: g.state.ledger, lifetime: g.state.lifetime, badges: g.state.badges }).toEqual(before);
    expect(g.run((tx) => logging.editHistory(tx, a, old, false))).toBe(true);
    expect(g.state.logs[a]?.[old]).toBeUndefined();
    // Inside the 6-day window a calendar edit would hide a paid check-in (§13.2 "the Progress
    // calendar edits older days"): refused, nothing changes.
    for (const d of [g.today, '2026-03-14']) {
      expect(g.run((tx) => logging.editHistory(tx, a, d, true))).toBe(false);
      expect(g.state.logs[a]?.[d]).toBeUndefined();
    }
  });

  it('a flexible check-in can\'t be un-ticked in the calendar while its period still reaches into the window', () => {
    const g = new Game({ start: '2026-08-03' });
    const y = g.addHabit({ name: 'Deep clean', schedule: { kind: 'monthly', times: 1, every: 1 } });
    g.goTo('2026-09-02');
    g.checkIn(y);
    g.goTo('2026-09-20'); // Sep 2 is history, but September can still be paid through the window
    expect(g.run((tx) => logging.editHistory(tx, y, '2026-09-02', false))).toBe(false);
    expect(g.run((tx) => logging.editHistory(tx, y, '2026-09-05', true))).toBe(true); // adding is fine
    g.goTo('2026-10-08'); // September has left the window
    expect(g.run((tx) => logging.editHistory(tx, y, '2026-09-02', false))).toBe(true);
  });

  it('every entry point refuses a key that is not a real day', () => {
    const g = new Game({ start: '2026-09-20' });
    const a = g.addHabit({ target: 3 });
    const before = g.state;
    for (const bad of ['2026-09-19x', '2026-9-19', '2026-02-30', ' 2026-09-19', '']) {
      g.checkIn(a, bad);
      g.tiny(a, bad);
      g.undo(a, bad);
      g.setCount(a, bad, 2);
      g.rest(a, bad);
      g.run((tx) => logging.setNote(tx, a, bad, 'hi'));
      g.run((tx) => logging.editHistory(tx, a, bad, true));
      expect(g.run((tx) => logging.toggleOffDay(tx, bad))).toEqual({ ok: false, remaining: 0 });
    }
    expect(g.state.logs).toEqual(before.logs);
    expect(g.state.ledger).toEqual(before.ledger);
    expect(g.state.offDays).toEqual(before.offDays);
  });
});

describe('Welcome home after a partial tap (M1 audit)', () => {
  it('a partial tap on a count habit after time away doesn’t use up the welcome: the next completing watering pays it', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit();
    const water = g.addHabit({ name: 'Drink water', icon: 'water', target: 8, unit: 'glasses' });
    g.checkIn(walk);
    g.goTo('2026-03-07'); // four quiet days (Mar 3–6)
    const tickets = g.state.wallet.tickets;
    const partial = g.checkIn(water); // glass 1 of 8
    expect(partial).toMatchObject({ partial: true, completed: false });
    expect(g.lastOf('welcomeHome')).toEqual([]);
    g.checkIn(walk);
    expect(g.lastOf('welcomeHome')).toEqual([{ type: 'welcomeHome', coins: 20, tickets: 1 }]);
    expect(g.lastOf('coins').filter((e) => e.reason === 'home')).toEqual([{ type: 'coins', amount: 20, reason: 'home' }]);
    expect(g.state.wallet.tickets).toBe(tickets + 1);
  });

  it('a completing watering still records the time, so the next day is an ordinary day', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit();
    g.checkIn(walk);
    g.goTo('2026-03-07');
    g.checkIn(walk);
    expect(g.lastOf('welcomeHome')).toHaveLength(1);
    g.goTo('2026-03-08');
    g.checkIn(walk);
    expect(g.lastOf('welcomeHome')).toEqual([]);
  });
});
