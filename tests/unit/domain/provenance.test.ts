/**
 * Check-in provenance (WP-B4; audit domain-d2, HM3, P-history-02): `DayLog.first` is the day's
 * first live check-in and `DayLog.done` the live check-in that made the day count. Both are
 * optional (absent means unknown; an older build's day is read from its stamps) and are never
 * dropped by the 24-stamp cap; when a day's stamps are compacted after 120 days, what they prove
 * for habit stacking is folded into `DayLog.beforeAnchor` first. No schema change: the fields ride
 * in the same envelope and pass the same decoder.
 */
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type AppState, type DayLog } from '@/state/types';
import { encodeEnvelope, parseEnvelope } from '@/state/persist';
import { validateState } from '@/state/validate';
import { addDays } from '@/domain/dates';
import { compactSave, openDay } from '@/domain/rollover';
import { transact } from '@/domain/tx';
import * as logging from '@/domain/logging';
import { eligibleTimes } from '@/domain/signature';
import { keptTogetherDays } from '@/domain/stacking';
import { Game, at, deepFreeze } from './game';

const D = '2026-03-02';
const t = (h: number, m = 0) => at(D, h, m);
const logOf = (g: Game, id: string, date = D): DayLog | undefined => g.state.logs[id]?.[date];

describe('first and done are written by live check-ins only', () => {
  it('first at the first live tap, done at the tap that completes the day; extras move neither', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 3 });
    g.goTo(D, 8);
    g.checkIn(a);
    expect(logOf(g, a)).toMatchObject({ count: 1, first: t(8) });
    expect(logOf(g, a)).not.toHaveProperty('done');
    g.goTo(D, 8, 5);
    g.checkIn(a);
    g.goTo(D, 8, 10);
    g.checkIn(a);
    expect(logOf(g, a)).toMatchObject({ count: 3, first: t(8), done: t(8, 10) });
    g.goTo(D, 20);
    g.checkIn(a);
    g.goTo(D, 20, 30);
    g.setCount(a, D, 9);
    expect(logOf(g, a)).toMatchObject({ count: 9, first: t(8), done: t(8, 10) });
  });

  it('a number-pad entry that completes the day is its done; the tiny version is too', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 8 });
    const b = g.addHabit({ name: 'Walk', tiny: { label: 'Shoes on' } });
    g.goTo(D, 9);
    g.setCount(a, D, 8);
    g.tiny(b);
    g.goTo(D, 18);
    g.checkIn(b); // the full version, later
    expect(logOf(g, a)).toMatchObject({ count: 8, first: t(9), done: t(9) });
    expect(logOf(g, b)).toMatchObject({ count: 1, first: t(9), done: t(9) });
  });

  it('backfill, history edits and a paused clock write neither', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Walk' });
    g.goTo('2026-03-20', 9);
    g.checkIn(a, '2026-03-19'); // backfill in the window
    g.run((tx) => logging.editHistory(tx, a, '2026-03-05', true)); // a history edit
    g.setCount(a, '2026-03-18', 1); // the pad on a past day
    for (const d of ['2026-03-19', '2026-03-05', '2026-03-18']) {
      expect(logOf(g, a, d)).toMatchObject({ count: 1 });
      expect(logOf(g, a, d)).not.toHaveProperty('first');
      expect(logOf(g, a, d)).not.toHaveProperty('done');
    }
    // The clock reads more than 36 h earlier than catkin last saw: today's check-in is not live.
    const p = new Game({ start: '2026-03-22', hour: 9 });
    const b = p.addHabit({ name: 'Walk' });
    p.goTo('2026-03-24', 12);
    p.now = at('2026-03-22', 10);
    p.checkIn(b);
    expect(logOf(p, b, '2026-03-24')).toMatchObject({ count: 1 });
    expect(logOf(p, b, '2026-03-24')).not.toHaveProperty('first');
    expect(logOf(p, b, '2026-03-24')).not.toHaveProperty('done');
  });

  it('undo keeps them while a check-in or a live stamp remains, and removes them when none does (a note stays)', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 3 });
    const b = g.addHabit({ name: 'Walk' });
    for (const m of [0, 5, 10]) {
      g.goTo(D, 8, m);
      g.checkIn(a);
    }
    g.goTo(D, 9);
    g.undo(a); // 2 of 3
    expect(logOf(g, a)).toMatchObject({ count: 2, first: t(8), done: t(8, 10) });
    g.undo(a);
    g.undo(a);
    expect(logOf(g, a)).toBeUndefined();
    g.run((tx) => logging.setNote(tx, b, D, 'Rain.'));
    g.checkIn(b);
    expect(logOf(g, b)).toMatchObject({ first: t(9), done: t(9) });
    g.goTo(D, 9, 5);
    g.undo(b);
    expect(logOf(g, b)).toEqual({ kind: 'log', count: 0, note: 'Rain.' });
    g.goTo(D, 19);
    g.checkIn(b);
    expect(logOf(g, b)).toMatchObject({ first: t(19), done: t(19), at: [t(19)] });
  });

  it('completing the day again after it stopped counting moves done to the new completion', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 3 });
    for (const m of [0, 5, 10]) {
      g.goTo(D, 8, m);
      g.checkIn(a);
    }
    g.goTo(D, 12);
    g.setCount(a, D, 1);
    expect(logOf(g, a)).toMatchObject({ count: 1, first: t(8), done: t(8, 10) }); // not read: the day does not count
    g.goTo(D, 19);
    g.setCount(a, D, 3);
    expect(logOf(g, a)).toMatchObject({ count: 3, first: t(8), done: t(19) });
  });

  it('a rest day carries neither', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Walk' });
    g.goTo(D, 8);
    g.checkIn(a);
    expect(g.rest(a, D)).toBe(true);
    expect(logOf(g, a)).toEqual({ kind: 'rest' });
  });
});

describe('compaction: what the stamps prove is written down before they go', () => {
  it('within 120 days both are kept; after, they go with the stamps and a day kept in order needs nothing', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 2 });
    for (const m of [0, 5, 30]) {
      g.goTo(D, 8, m);
      g.checkIn(a);
    }
    g.goTo(addDays(D, 120));
    expect(logOf(g, a)).toMatchObject({ first: t(8), done: t(8, 5) });
    g.goTo(addDays(D, 121));
    expect(logOf(g, a)).toEqual({ kind: 'log', count: 3 });
  });

  it('a follower checked in before its anchor keeps that verdict, beyond the 24-stamp cap', () => {
    const g = new Game({ start: D, hour: 7 });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk, target: 25 });
    g.goTo(D, 8);
    g.checkIn(stretch); // before Walk
    g.goTo(D, 8, 5);
    g.checkIn(walk);
    for (let i = 0; i < 24; i++) {
      g.goTo(D, 9, i);
      g.checkIn(stretch); // the first stamp falls off the list
    }
    g.goTo(addDays(D, 121));
    expect(logOf(g, stretch)).toEqual({ kind: 'log', count: 25, beforeAnchor: walk });
    expect(logOf(g, walk)).toEqual({ kind: 'log', count: 1 });
  });

  /** A save as an older build wrote it: stamps, no provenance. Stretch follows Walk, checked in before it. */
  function legacy() {
    const g = new Game({ start: D, hour: 7 });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
    const tea = g.addHabit({ name: 'Tea', anchorHabitId: walk });
    const logs: AppState['logs'] = {
      [walk]: { [D]: { kind: 'log', count: 1, at: [t(8, 30)] } },
      [stretch]: { [D]: { kind: 'log', count: 1, at: [t(8)] } },
      [tea]: { [D]: { kind: 'log', count: 1, at: [t(9)] }, '2026-03-03': { kind: 'log', count: 1 } },
    };
    g.state = deepFreeze({ ...g.state, logs });
    return { g, walk, stretch, tea };
  }

  it('an older build’s reversed day is read from its stamps, and keeps its verdict when they go', () => {
    const { g, walk, stretch, tea } = legacy();
    g.goTo(addDays(D, 121));
    expect(logOf(g, stretch)).toEqual({ kind: 'log', count: 1, beforeAnchor: walk });
    expect(logOf(g, tea)).toEqual({ kind: 'log', count: 1 }); // after Walk: nothing to keep
    expect(logOf(g, walk)).toEqual({ kind: 'log', count: 1 });
  });

  it('is idempotent: a second pass writes nothing, and a stale writer’s replay is folded the same way', () => {
    const { g } = legacy();
    const before = g.state;
    const env = { ...g.env(), today: addDays(D, 121), now: at(addDays(D, 121), 12) };
    const compact = (s: AppState) =>
      transact(s, env, (tx) => {
        compactSave(tx);
        return {};
      }).state;
    const once = compact(before);
    expect(once.logs).not.toBe(before.logs);
    expect(compact(once).logs).toBe(once.logs);
    const replay = transact(before, env, (tx) => {
      openDay(tx);
      return {};
    }).state;
    expect(replay.logs).toEqual(once.logs);
  });
});

describe('the edges of the read-time fallbacks and of the fold', () => {
  const minute = (h: number, m = 0) => h * 60 + m;
  const habitOf = (g: Game, id: string) => g.state.habits.find((h) => h.id === id)!;
  const times = (g: Game, id: string) => eligibleTimes(g.state, habitOf(g, id), g.today, g.local);
  const kept = (g: Game, id: string) => keptTogetherDays(g.state, habitOf(g, id), g.today);
  const withLogs = (g: Game, logs: AppState['logs']) => (g.state = deepFreeze({ ...g.state, logs: { ...g.state.logs, ...logs } }));

  it('an older build’s step-10 day, ten counted per live stamp, reads the stamp that reached the target', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Push-ups', target: 30, step: 10 });
    g.goTo(addDays(D, 1), 12);
    withLogs(g, { [a]: { [D]: { kind: 'log', count: 50, at: [t(8), t(8, 5), t(8, 10), t(8, 15), t(8, 20)] } } });
    expect(times(g, a)).toEqual([{ date: D, minute: minute(8, 10) }]);
  });

  it('an older build’s flexible day with two stamps (the tiny version, then the full one) is unknown; one stamp is read', () => {
    const g = new Game({ start: D, hour: 7 });
    const flexible = { schedule: { kind: 'weekly', times: 3, every: 1 }, tiny: { label: 'Shoes on' } } as const;
    const a = g.addHabit({ name: 'Run', ...flexible });
    const b = g.addHabit({ name: 'Swim', ...flexible });
    g.goTo(addDays(D, 1), 12);
    withLogs(g, {
      [a]: { [D]: { kind: 'log', count: 1, at: [t(8), t(18)] } },
      [b]: { [D]: { kind: 'log', count: 1, at: [t(8)] } },
    });
    expect(times(g, a)).toEqual([]);
    expect(times(g, b)).toEqual([{ date: D, minute: minute(8) }]);
  });

  it('on the day an older build’s save is opened, a follower’s first check-in is still its earliest stamp, before its anchor', () => {
    const g = new Game({ start: D, hour: 7 });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk, target: 3 });
    g.goTo(D, 8, 30);
    // As an older build wrote them, earlier today: Stretch at 07:00, before Walk at 08:00.
    withLogs(g, {
      [walk]: { [D]: { kind: 'log', count: 1, at: [t(8)] } },
      [stretch]: { [D]: { kind: 'log', count: 1, at: [t(7)] } },
    });
    for (const m of [0, 5]) {
      g.goTo(D, 9, m);
      g.checkIn(stretch); // this build's first taps on that day
    }
    expect(logOf(g, stretch)).toMatchObject({ count: 3, first: t(7), done: t(9, 5) });
    expect(kept(g, stretch)).toBe(0);
    g.goTo(addDays(D, 121));
    expect(logOf(g, stretch)).toEqual({ kind: 'log', count: 3, beforeAnchor: walk });
    expect(kept(g, stretch)).toBe(0);
  });

  it('a log left with first and done but no stamps (a pad entry, then an undo) loses them after 120 days too', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 3 });
    g.goTo(D, 9);
    g.setCount(a, D, 5);
    g.goTo(D, 9, 5);
    g.undo(a);
    expect(logOf(g, a)).toEqual({ kind: 'log', count: 4, first: t(9), done: t(9) });
    g.goTo(addDays(D, 120));
    expect(logOf(g, a)).toEqual({ kind: 'log', count: 4, first: t(9), done: t(9) });
    g.goTo(addDays(D, 121));
    expect(logOf(g, a)).toEqual({ kind: 'log', count: 4 });
  });

  it('a follower checked in at the same instant as its anchor is kept together, before and after compaction', () => {
    const g = new Game({ start: D, hour: 7 });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
    g.goTo(D, 8);
    g.checkIn(walk);
    g.checkIn(stretch); // the same millisecond
    expect(logOf(g, stretch)).toMatchObject({ first: t(8) });
    expect(logOf(g, walk)).toMatchObject({ first: t(8) });
    expect(kept(g, stretch)).toBe(1);
    g.goTo(addDays(D, 121));
    expect(logOf(g, stretch)).toEqual({ kind: 'log', count: 1 });
    expect(kept(g, stretch)).toBe(1);
  });
});

describe('no schema change: the fields pass the decoder and survive a save round trip', () => {
  it('check in, serialise, reload: first and done come back, and the save still validates', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 2 });
    for (const m of [0, 5]) {
      g.goTo(D, 8, m);
      g.checkIn(a);
    }
    expect(g.state.version).toBe(SCHEMA_VERSION);
    const loaded = parseEnvelope(encodeEnvelope(g.state, 3, g.now, 'test'));
    expect(loaded.kind).toBe('ok');
    const state = (loaded as { state: AppState }).state;
    expect(state.logs[a]![D]).toEqual({ kind: 'log', count: 2, at: [t(8), t(8, 5)], first: t(8), done: t(8, 5) });
    expect(state).toEqual(g.state);
  });

  it('a compacted verdict comes back too', () => {
    const g = new Game({ start: D, hour: 7 });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', anchorHabitId: walk });
    g.goTo(D, 8);
    g.checkIn(stretch);
    g.goTo(D, 9);
    g.checkIn(walk);
    g.goTo(addDays(D, 121));
    const loaded = parseEnvelope(encodeEnvelope(g.state, 3, g.now, 'test'));
    expect(loaded.kind).toBe('ok');
    expect((loaded as { state: AppState }).state.logs[stretch]![D]).toEqual({ kind: 'log', count: 1, beforeAnchor: walk });
  });

  it('the validator accepts real timestamps and rejects anything else in first or done', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Walk' });
    g.goTo(D, 8);
    g.checkIn(a);
    const withLog = (log: Record<string, unknown>) => ({ ...g.state, logs: { ...g.state.logs, [a]: { [D]: log } } });
    expect(validateState(g.state).ok).toBe(true);
    expect(validateState(withLog({ kind: 'log', count: 1, first: t(8), done: t(8) })).ok).toBe(true);
    for (const bad of ['8:00', -1, Infinity, null, true]) {
      for (const field of ['first', 'done']) {
        expect(validateState(withLog({ kind: 'log', count: 1, [field]: bad })).ok, `${field}: ${String(bad)}`).toBe(false);
      }
    }
    expect(validateState(withLog({ kind: 'log', count: 1, beforeAnchor: 'h-00000001' })).ok).toBe(true);
    expect(validateState(withLog({ kind: 'log', count: 1, beforeAnchor: 7 })).ok).toBe(false);
  });
});
