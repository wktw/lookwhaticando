/** Habit stacking (DESIGN §14.2): anchors, the stacked order and the kept-together count. */
import { describe, expect, it } from 'vitest';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { anchorIssue, keptTogetherDays, stackOrder } from '@/domain/stacking';
import { liveHabits } from '@/state/views/common';
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
