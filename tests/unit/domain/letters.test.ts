import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { bouquetStars, stemsFor, weeklyStars } from '@/domain/letters';
import * as logging from '@/domain/logging';
import { Game } from './game';

const T = (achieved: number, expected: number) => ({ achieved, expected, tiny: 0 });

describe('Weekly Letter stars (DESIGN §13.10)', () => {
  it.each([
    [T(0, 7), 0, 0],
    [T(1, 7), 1, 1],
    [T(4, 7), 4, 1], // 57%
    [T(5, 7), 5, 2], // 71% ≥ 60
    [T(6, 7), 6, 3], // 86% ≥ 85
    [T(4, 4), 4, 1], // 100%, but the bonus tiers need ≥ 5 expected
  ])('%o over %i show-up days → %i★', (tally, days, stars) => {
    expect(weeklyStars(tally, days)).toBe(stars);
  });
});

describe('Monthly Bouquet stars and stems (DESIGN §13.10)', () => {
  it.each([
    [T(0, 30), 0, null, 0, false],
    [T(9, 30), 9, null, 1, false],
    [T(21, 30), 21, null, 2, false], // 70%
    [T(26, 30), 26, null, 3, false], // 87%
    [T(26, 30), 26, T(24, 30), 4, true], // 87% vs 80%: Growing
    [T(26, 30), 26, T(25, 30), 3, false], // 87% vs 83%: +4 pts
    [T(9, 9), 9, T(1, 20), 1, false], // < 10 expected: no bonus tiers
  ])('%o, %i check-ins, previous %o → %i★ (growing %s)', (tally, checkins, prev, stars, growing) => {
    expect(bouquetStars(tally, checkins, prev)).toEqual({ stars, growing });
  });

  it('stems: clamp(round(checkIns / 4), 1, 7)', () => {
    expect([0, 1, 5, 6, 12, 26, 28, 31].map(stemsFor)).toEqual([0, 1, 1, 2, 3, 7, 7, 7]);
  });
});

describe('letters on the first open of a new week / month', () => {
  it('writes last week’s letter once, with its facts, and pays its stars', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday
    const a = g.addHabit();
    for (let d = 0; d < 7; d++) {
      g.checkIn(a);
      if (d === 2) g.run((tx) => logging.setNote(tx, a, g.today, 'Felt great'));
      if (d === 3) {
        g.run((tx) => logging.setNote(tx, a, g.today, 'Private, not starred'));
        g.run((tx) => logging.starNote(tx, a, '2026-03-04', true));
      }
      g.advance(1);
    }
    const letter = g.state.inbox.find((l) => l.id === 'weekly-2026-03-02');
    // Only a starred note is quoted (the newer note wasn't starred), and the Sunday Note carries its contents.
    expect(letter).toMatchObject({
      kind: 'weekly',
      weekStart: '2026-03-02',
      achieved: 7,
      expected: 7,
      stars: 3,
      showUpDays: 7,
      bestHabitId: a,
      quote: { habitId: a, date: '2026-03-04', text: 'Felt great' },
      waterings: 7,
    });
    expect((letter as { highlights: unknown[] }).highlights[0]).toMatchObject({ kind: 'stageUp', habitId: a });
    expect(g.allOf('letter')).toEqual([{ type: 'letter', letterId: 'weekly-2026-03-02' }]);
    expect(g.allOf('stars').filter((e) => e.reason === 'letter').map((e) => e.amount)).toEqual([3]);
    g.advance(1);
    expect(g.state.inbox.filter((l) => l.kind === 'weekly')).toHaveLength(1);
  });

  it('pays upward differences when a backfill raises the tier, never downward', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    for (let d = 0; d < 6; d++) {
      if (d % 3 !== 2) g.checkIn(a); // 4 of the first 6 days
      g.advance(1);
    }
    g.advance(1); // Monday Mar 9: Sunday Mar 8 was missed → 4/7 = 57% → 1★
    expect(g.state.inbox[0]).toMatchObject({ stars: 1, achieved: 4, expected: 7 });
    g.checkIn(a, '2026-03-08'); // 5/7 = 71% → 2★
    expect(g.state.inbox[0]).toMatchObject({ stars: 2, achieved: 5 });
    expect(g.lastOf('stars').filter((e) => e.reason === 'letter')).toEqual([{ type: 'stars', amount: 1, reason: 'letter' }]);
    expect(g.state.ledger.once['weekly|2026-03-02']).toBe(2);
    g.undo(a, '2026-03-08');
    expect(g.state.inbox[0]).toMatchObject({ stars: 2 });
  });

  it('skips a week without check-ins and never writes a backlog after a break', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.checkIn(a);
    g.goTo('2026-03-30'); // four weeks later
    expect(g.state.inbox).toEqual([]); // the week of Mar 23 had no check-ins; older weeks are never written
    g.checkIn(a);
    g.goTo('2026-04-06');
    expect(g.state.inbox.map((l) => l.id)).toEqual(['weekly-2026-03-30', 'bouquet-2026-03']);
  });

  it('the Monthly Bouquet: stems per habit, stars, Growing, Steady Month', () => {
    const g = new Game({ start: '2026-02-01' });
    const a = g.addHabit({ name: 'Walk' });
    const b = g.addHabit({ name: 'Read', plant: 'begonia' });
    for (let d = '2026-02-01'; d < '2026-03-01'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(a);
      if (d.endsWith('0') || d.endsWith('5')) g.checkIn(b);
    }
    for (let d = '2026-03-01'; d < '2026-04-01'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(a);
      g.checkIn(b);
    }
    g.goTo('2026-04-01');
    const feb = g.state.inbox.find((l) => l.id === 'bouquet-2026-02')!;
    const mar = g.state.inbox.find((l) => l.id === 'bouquet-2026-03')!;
    // The Herbarium page: pressings sized by waterings (clamp(round(n/4), 1, 7)); the first page is marked.
    expect(feb).toMatchObject({
      kind: 'monthly',
      firstPage: true,
      pressings: [
        { habitId: a, plant: 'pothos', waterings: 28, rests: 0, size: 7 },
        { habitId: b, plant: 'begonia', waterings: 5, rests: 0, size: 1 },
      ],
    });
    expect(mar).toMatchObject({ kind: 'monthly', stars: 4, growingBonus: true, achieved: 62, expected: 62, firstPage: false, pressings: [{ habitId: a, size: 7 }, { habitId: b, size: 7 }] });
    expect(g.state.badges['steady-month']).toBeDefined();
  });

  it('writes nothing before onboarding', () => {
    const g = new Game({ start: '2026-03-02', onboard: false });
    g.goTo('2026-04-20');
    expect(g.state.inbox).toEqual([]);
  });
});
