/** Habit stacking (DESIGN §14.2): anchors, the stacked order and the kept-together count. */
import { describe, expect, it } from 'vitest';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { anchorIssue, keptTogetherDays, stackOrder } from '@/domain/stacking';
import { liveHabits } from '@/state/views/common';
import { addDays } from '@/domain/dates';
import { readShape } from '@/domain/signature';
import { Game, at } from './game';

const habitOf = (s: AppState, id: string) => s.habits.find((h) => h.id === id)!;

describe('anchors', () => {
  it('must be another live habit, and may never lead back to the follower', () => {
    const g = new Game();
    const a = g.addHabit({ name: 'A' });
    const b = g.addHabit({ name: 'B', anchorHabitId: a });
    const c = g.addHabit({ name: 'C', anchorHabitId: b });
    expect(anchorIssue(g.state, a, a)).toBe('self');
    expect(anchorIssue(g.state, a, 'h-nope')).toBe('unknown');
    expect(anchorIssue(g.state, a, c)).toBe('cycle'); // c → b → a
    expect(anchorIssue(g.state, undefined, c)).toBeNull();
    expect(() => g.run((tx) => habits.updateHabit(tx, a, { anchorHabitId: c }))).toThrow(habits.HabitInputError);
    g.run((tx) => habits.archiveHabit(tx, a));
    expect(anchorIssue(g.state, undefined, a)).toBe('archived');
    expect(() => g.addHabit({ name: 'D', anchorHabitId: a })).toThrow(habits.HabitInputError);
    expect(validateState(g.state).ok).toBe(true);
  });

  it('deleting an anchor frees its followers; clearing an anchor is an edit like any other', () => {
    const g = new Game();
    const a = g.addHabit({ name: 'A' });
    const b = g.addHabit({ name: 'B', anchorHabitId: a });
    g.run((tx) => habits.updateHabit(tx, b, { anchorHabitId: undefined }));
    expect(habitOf(g.state, b).anchorHabitId).toBeUndefined();
    g.run((tx) => habits.updateHabit(tx, b, { anchorHabitId: a }));
    g.run((tx) => habits.deleteHabit(tx, a));
    expect(habitOf(g.state, b).anchorHabitId).toBeUndefined();
    expect(validateState(g.state).ok).toBe(true);
  });
});

describe('the follower sorts right after its anchor', () => {
  it('keeps chains together, in order, and survives a cycle in hand-made data', () => {
    const h = (id: string, order: number, anchorHabitId?: string) => ({ id, order, ...(anchorHabitId ? { anchorHabitId } : {}) });
    expect(stackOrder([h('a', 0), h('b', 1), h('c', 2, 'a'), h('d', 3, 'c'), h('e', 4)]).map((x) => x.id)).toEqual(['a', 'c', 'd', 'b', 'e']);
    expect(stackOrder([h('x', 0, 'gone'), h('y', 1)]).map((x) => x.id)).toEqual(['x', 'y']);
    expect(stackOrder([h('p', 0, 'q'), h('q', 1, 'p'), h('r', 2)]).map((x) => x.id)).toEqual(['r', 'p', 'q']);
    const g = new Game();
    const a = g.addHabit({ name: 'A' });
    const b = g.addHabit({ name: 'B' });
    const c = g.addHabit({ name: 'C', anchorHabitId: a });
    expect(liveHabits(g.state, g.today).map((x) => x.id)).toEqual([a, c, b]);
  });
});

describe('kept-together days', () => {
  it('both shown up that day; when both were live, the follower came at or after its anchor', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
    g.now = at('2026-03-02', 8);
    g.checkIn(walk);
    g.now = at('2026-03-02', 8, 20);
    g.checkIn(stretch); // after: counts
    g.now = at('2026-03-03', 8);
    g.checkIn(stretch);
    g.now = at('2026-03-03', 9);
    g.checkIn(walk); // stretch came first: not kept together
    g.now = at('2026-03-04', 12);
    g.checkIn(walk); // only the anchor
    g.now = at('2026-03-05', 12);
    g.checkIn(walk, '2026-03-04');
    g.checkIn(stretch, '2026-03-04'); // backfill (no stamps): counts on showing up alone
    const f = habitOf(g.state, stretch);
    expect(keptTogetherDays(g.state, f, g.today)).toBe(2);
    expect(keptTogetherDays(g.state, f, g.today, '2026-03-03', '2026-03-05')).toBe(1);
    // History edits of older days count too (it pays nothing).
    g.goTo('2026-03-20');
    g.run((tx) => logging.editHistory(tx, walk, '2026-03-06', true));
    g.run((tx) => logging.editHistory(tx, stretch, '2026-03-06', true));
    expect(keptTogetherDays(g.state, habitOf(g.state, stretch), g.today)).toBe(3);
  });
});

describe('an anchor leaving the sill', () => {
  it('archiving or retiring the anchor frees its followers, so their edits never trip over it', () => {
    const g = new Game();
    const a = g.addHabit({ name: 'A' });
    const b = g.addHabit({ name: 'B', anchorHabitId: a });
    g.run((tx) => habits.archiveHabit(tx, a));
    expect(habitOf(g.state, b).anchorHabitId).toBeUndefined();
    g.run((tx) => habits.updateHabit(tx, b, { name: 'B2' }));
    expect(habitOf(g.state, b).name).toBe('B2');
  });
});

/* ------------------------------------------------------------------ */
/* WP-B4: the kept-together count is a historical fact                 */
/* ------------------------------------------------------------------ */

/**
 * Stretch follows Walk. On each of `days` days from `start` both are checked in live, Walk first
 * when `order` is 'kept', Stretch first when it is 'reversed'.
 */
function stackedDays(order: 'kept' | 'reversed', days: number, start = '2026-03-02') {
  const g = new Game({ start });
  const walk = g.addHabit({ name: 'Walk' });
  const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
  const [first, second] = order === 'kept' ? [walk, stretch] : [stretch, walk];
  let last = start;
  for (let i = 0; i < days; i++) {
    last = addDays(start, i);
    g.goTo(last, 8);
    g.checkIn(first);
    g.goTo(last, 8, 30);
    g.checkIn(second);
  }
  const kept = () => keptTogetherDays(g.state, habitOf(g.state, stretch), g.today);
  return { g, walk, stretch, last, kept };
}

describe('kept-together days survive the 120-day stamp compaction (domain-d2, WP-B4)', () => {
  it('fourteen reversed live days stay 0 after their stamps are pruned (the audit’s 0 → 14)', () => {
    const { g, stretch, last, kept } = stackedDays('reversed', 14);
    expect(kept()).toBe(0);
    g.goTo(addDays(last, 121));
    expect(Object.values(g.state.logs[stretch]!).every((l) => l.kind === 'log' && l.at === undefined)).toBe(true); // compacted
    expect(kept()).toBe(0);
    expect(readShape(g.state, habitOf(g.state, stretch), g.today).shape).toBe('classic');
  });

  it('fourteen kept live days stay 14, and the Paired shape stays Paired, across the compaction', () => {
    const { g, stretch, last, kept } = stackedDays('kept', 14);
    expect(kept()).toBe(14);
    expect(readShape(g.state, habitOf(g.state, stretch), g.today).shape).toBe('paired');
    g.goTo(addDays(last, 121));
    expect(kept()).toBe(14);
    expect(readShape(g.state, habitOf(g.state, stretch), g.today).shape).toBe('paired');
  });

  it('the 120/121-day boundary: a reversed day reads the same the day before and the day after its stamps go', () => {
    const { g, stretch, last, kept } = stackedDays('reversed', 1);
    g.goTo(addDays(last, 120));
    expect(g.state.logs[stretch]![last]).toMatchObject({ at: [expect.any(Number)] }); // still kept on day 120
    expect(kept()).toBe(0);
    g.goTo(addDays(last, 121));
    expect(g.state.logs[stretch]![last]).not.toHaveProperty('at'); // gone on day 121
    expect(kept()).toBe(0);
  });

  it('one-sided backfill counts on showing up alone, before and after the compaction', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
    g.goTo('2026-03-03', 9);
    g.checkIn(walk); // live anchor
    g.goTo('2026-03-04', 8);
    g.checkIn(stretch, '2026-03-03'); // follower backfilled (no stamp)
    g.checkIn(stretch); // live follower
    g.goTo('2026-03-05', 8);
    g.checkIn(walk, '2026-03-04'); // anchor backfilled after the follower's live check-in
    const kept = () => keptTogetherDays(g.state, habitOf(g.state, stretch), g.today);
    expect(kept()).toBe(2);
    g.goTo('2026-07-10');
    expect(kept()).toBe(2);
  });

  it('days are read against the current anchor (DEC-P12h); a compacted day keeps its verdict against the anchor it had', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const tea = g.addHabit({ name: 'Tea' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
    for (let i = 0; i < 3; i++) {
      const d = addDays('2026-03-02', i);
      g.goTo(d, 8);
      g.checkIn(tea);
      g.goTo(d, 8, 10);
      g.checkIn(stretch); // after Tea, before Walk
      g.goTo(d, 8, 20);
      g.checkIn(walk);
    }
    const kept = () => keptTogetherDays(g.state, habitOf(g.state, stretch), g.today);
    const anchorTo = (id: string) => g.run((tx) => habits.updateHabit(tx, stretch, { anchorHabitId: id }));
    expect(kept()).toBe(0);
    anchorTo(tea);
    expect(kept()).toBe(3);
    anchorTo(walk);
    expect(kept()).toBe(0);
    g.goTo('2026-07-10'); // compacted while Stretch follows Walk
    expect(kept()).toBe(0);
    anchorTo(tea); // no verdict against Tea was kept: unknown, counts on showing up
    expect(kept()).toBe(3);
    anchorTo(walk);
    expect(kept()).toBe(0);
  });
});

/**
 * One day, 2026-03-02: `taps` live check-ins of a count habit whose target is `taps`, around one
 * check-in of a one-tap habit, at one-minute steps from 08:00.
 */
function cappedDay(capped: 'anchor' | 'follower', taps: number, order: 'kept' | 'reversed') {
  const g = new Game({ start: '2026-03-02', hour: 7 });
  const walk = g.addHabit({ name: 'Walk', ...(capped === 'anchor' ? { target: taps } : {}) });
  const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk, ...(capped === 'follower' ? { target: taps } : {}) });
  const many = capped === 'anchor' ? walk : stretch;
  const one = capped === 'anchor' ? stretch : walk;
  // The capped habit's first tap comes before the other habit's check-in when the order needs it.
  const manyFirst = (capped === 'anchor') === (order === 'kept');
  let t = at('2026-03-02', 8);
  const tap = (id: string) => {
    g.now = t;
    g.checkIn(id);
    t += 60_000;
  };
  if (manyFirst) {
    tap(many);
    tap(one);
    for (let i = 1; i < taps; i++) tap(many);
  } else {
    tap(one);
    for (let i = 0; i < taps; i++) tap(many);
  }
  const kept = () => keptTogetherDays(g.state, habitOf(g.state, stretch), g.today);
  return { g, walk, stretch, many, one, kept, tap, next: () => t };
}

describe('kept-together days are not changed by the 24-stamp cap (HM3, WP-B4)', () => {
  for (const taps of [24, 25, 26]) {
    it(`${taps} live taps on the anchor, in order: kept together, then and after the compaction`, () => {
      const { g, kept, many } = cappedDay('anchor', taps, 'kept');
      expect(g.state.logs[many]!['2026-03-02']).toMatchObject({ count: taps });
      expect(kept()).toBe(1);
      g.goTo('2026-07-10');
      expect(kept()).toBe(1);
    });

    it(`${taps} live taps on the anchor, the follower first: not kept together, then and after the compaction`, () => {
      const { g, kept } = cappedDay('anchor', taps, 'reversed');
      expect(kept()).toBe(0);
      g.goTo('2026-07-10');
      expect(kept()).toBe(0);
    });

    it(`${taps} live taps on the follower, its first before the anchor: not kept together, then and after the compaction`, () => {
      const { g, kept, many } = cappedDay('follower', taps, 'reversed');
      expect(g.state.logs[many]!['2026-03-02']).toMatchObject({ count: taps });
      expect(kept()).toBe(0);
      g.goTo('2026-07-10');
      expect(kept()).toBe(0);
    });

    it(`${taps} live taps on the follower, after the anchor: kept together, then and after the compaction`, () => {
      const { g, kept } = cappedDay('follower', taps, 'kept');
      expect(kept()).toBe(1);
      g.goTo('2026-07-10');
      expect(kept()).toBe(1);
    });
  }

  it('direct count entry: a number-pad entry is one live check-in, and it does not move the first one', () => {
    const a = cappedDay('anchor', 25, 'kept');
    a.g.now = a.next();
    a.g.setCount(a.many, '2026-03-02', 30); // after 25 taps, the pad
    expect(a.kept()).toBe(1);
    // The pad alone: Walk 08:00, Stretch 08:05, Walk's count set to 25 at 08:10.
    const g = new Game({ start: '2026-03-02', hour: 7 });
    const walk = g.addHabit({ name: 'Walk', target: 25 });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
    g.goTo('2026-03-02', 8);
    g.checkIn(walk);
    g.goTo('2026-03-02', 8, 5);
    g.checkIn(stretch);
    g.goTo('2026-03-02', 8, 10);
    g.setCount(walk, '2026-03-02', 25);
    expect(keptTogetherDays(g.state, habitOf(g.state, stretch), g.today)).toBe(1);
    // The follower's count entered before the anchor's first check-in: not kept together.
    const h = new Game({ start: '2026-03-02', hour: 7 });
    const w2 = h.addHabit({ name: 'Walk' });
    const s2 = h.addHabit({ name: 'Stretch', anchorHabitId: w2, target: 25 });
    h.goTo('2026-03-02', 7, 55);
    h.setCount(s2, '2026-03-02', 25);
    h.goTo('2026-03-02', 8);
    h.checkIn(w2);
    expect(keptTogetherDays(h.state, habitOf(h.state, s2), h.today)).toBe(0);
  });

  it('undo: un-checking an over-target tap keeps the first check-in; undoing the day and checking in again starts it over', () => {
    const a = cappedDay('anchor', 25, 'kept');
    a.tap(a.many); // 26 taps, over target
    a.g.now = a.next();
    a.g.undo(a.many); // back to 25: still done, still after its first tap
    expect(a.kept()).toBe(1);
    a.g.goTo('2026-07-10');
    expect(a.kept()).toBe(1);
    for (const note of [false, true]) {
      const g = new Game({ start: '2026-03-02', hour: 7 });
      const walk = g.addHabit({ name: 'Walk' });
      const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
      if (note) g.run((tx) => logging.setNote(tx, walk, '2026-03-02', 'Rain.'));
      g.goTo('2026-03-02', 8);
      g.checkIn(walk);
      g.goTo('2026-03-02', 8, 5);
      g.checkIn(stretch);
      g.goTo('2026-03-02', 8, 10);
      g.undo(walk);
      g.goTo('2026-03-02', 8, 15);
      g.checkIn(walk); // Walk's check-in now comes after Stretch's
      const kept = () => keptTogetherDays(g.state, habitOf(g.state, stretch), g.today);
      expect(kept()).toBe(0);
      g.goTo('2026-07-10');
      expect(kept()).toBe(0);
    }
  });
});
