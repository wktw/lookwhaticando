/**
 * WP-B5: lifetime, retirement and cut semantics.
 *
 * - HM1 (DEC-P12c, option A): a period cut short by a later rule is judged as it stood on the day of
 *   the cut. The days it lost to the next rule are read in a cut-time view: open, and active
 *   whatever the habit's later lifecycle does to them (Finish, Archive, Restore, a pause, a resume,
 *   a day off). So a later lifecycle action never turns a closed period into a shortfall, or out of
 *   one (R206 inverted).
 * - domain-d6 (DEC-P12b, option A): Finish (or Archive) before the habit's first day has passed
 *   leaves an empty lifetime: `unstarted: true`, with `archivedOn === startedOn` so older
 *   validators still accept the save. No day of an unstarted habit is in its lifetime, so the
 *   creation day is never a missed day.
 */
import { describe, expect, it } from 'vitest';
import type { AppState, DateKey, Habit } from '@/state/types';
import type { HabitInput } from '@/state/api';
import { encodeEnvelope, parseEnvelope } from '@/state/persist';
import { validateState } from '@/state/validate';
import { addDays } from '@/domain/dates';
import { evaluateDay, inLifetime, lifetimeEnd } from '@/domain/activity';
import { habitTally, trackingOf, dayCompletion } from '@/domain/consistency';
import { logsOf, streakOf, trackingCtx } from '@/domain/economy';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { flexPeriodAt, periodEvaluations, type PeriodEvaluation } from '@/domain/periods';
import { retireWithRibbon } from '@/domain/seasonReview';
import { transact, type Env } from '@/domain/tx';
import { Game, UTC, at } from './game';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const weekly = (times: number, every: 1 | 2 | 3 | 4 = 1) => ({ kind: 'weekly', times, every }) as const;
const monthly = (times: number, every: 1 | 2 | 3 | 6 | 12 = 1) => ({ kind: 'monthly', times, every }) as const;

const habitOf = (g: Game, id: string): Habit => g.state.habits.find((h) => h.id === id)!;

/** The flexible period containing `date`, evaluated on the game's state as of its today. */
function periodOn(g: Game, id: string, date: DateKey): PeriodEvaluation {
  const h = habitOf(g, id);
  const p = flexPeriodAt(h, date, g.state.settings.weekStart);
  if (!p) throw new Error(`no flexible period on ${date}`);
  return periodEvaluations(h, logsOf(g.state, id), p.from, p.from, trackingCtx(g.state, g.today)).find((e) => e.key === p.key)!;
}

/** What a closed period's verdict is made of (what the tally, streak and goal bonus read). */
const verdict = (e: PeriodEvaluation) => ({
  key: e.key,
  from: e.from,
  to: e.to,
  cut: e.cut,
  target: e.target,
  achieved: e.achieved,
  openDays: e.openDays,
  expected: e.expected,
  met: e.met,
  short: e.short,
});

/**
 * A weekly habit (`times` a week) started on Monday 3 August 2026 (Monday weeks), checked in on
 * `times` days of each of five weeks (five met weeks), and on `cutWeek` days of the week of
 * 7 September.
 */
function establishedWeekly(cutWeek: DateKey[] = [], times: 3 | 4 = 3): { g: Game; id: string } {
  const g = new Game({ start: '2026-08-03' });
  const id = g.addHabit({ name: 'Swim', schedule: weekly(times) });
  for (let w = 0; w < 5; w++) {
    for (const off of times === 3 ? [0, 2, 4] : [0, 1, 3, 5]) {
      g.goTo(addDays('2026-08-03', w * 7 + off));
      g.checkIn(id);
    }
  }
  for (const d of cutWeek) {
    g.goTo(d);
    g.checkIn(id);
  }
  return { g, id };
}

/* ------------------------------------------------------------------ */
/* HM1: a cut period is judged as it stood on the day of the cut       */
/* ------------------------------------------------------------------ */

describe('HM1: a later lifecycle action never changes a period cut by an earlier edit (WP-B5, DEC-P12c)', () => {
  it('R206 inverted: Finish the day after a weekly → daily switch leaves the cut week as the edit left it', () => {
    const g = new Game({ start: '2026-09-07' }); // Monday
    const id = g.addHabit({ name: 'Swim', schedule: weekly(3) });
    g.goTo('2026-09-10'); // Thursday
    g.run((tx) => habits.updateHabit(tx, id, { schedule: { kind: 'daily' } }, 'today'));
    const before = periodOn(g, id, '2026-09-08');
    expect(before).toMatchObject({ from: '2026-09-07', to: '2026-09-09', cut: true, state: 'closed', target: 3, openDays: 4, expected: 0, short: false });

    g.goTo('2026-09-11'); // Friday
    expect(g.run((tx) => retireWithRibbon(tx, id))).toBe(true);
    expect(habitOf(g, id).archivedOn).toBe('2026-09-10');
    // Before WP-B5: target 3 → 2, open days 4 → 1, expected 0 → 1, short.
    expect(verdict(periodOn(g, id, '2026-09-08'))).toEqual(verdict(before));
  });

  it('Finish on the day of the edit, and an ordinary Archive the day after, leave it too', () => {
    for (const act of ['finish-same-day', 'archive-next-day'] as const) {
      const g = new Game({ start: '2026-09-07' });
      const id = g.addHabit({ name: 'Swim', schedule: weekly(3) });
      g.goTo('2026-09-10');
      g.run((tx) => habits.updateHabit(tx, id, { schedule: { kind: 'daily' } }, 'today'));
      const before = verdict(periodOn(g, id, '2026-09-08'));
      if (act === 'finish-same-day') g.run((tx) => retireWithRibbon(tx, id));
      else g.goTo('2026-09-11').run((tx) => habits.archiveHabit(tx, id));
      g.goTo('2026-09-15');
      expect(verdict(periodOn(g, id, '2026-09-08')), act).toEqual(before);
    }
  });

  // Four a week, so every one of these actions moves the goal of the code before WP-B5 (with three,
  // one day lost to a pause or a day off still rounds to 3).
  const edits = [
    ['weekly → daily', { schedule: { kind: 'daily' } }],
    ['same rhythm, every 1 → 2', { schedule: weekly(4, 2) }],
    ['weekly → monthly', { schedule: monthly(2) }],
  ] as const satisfies readonly (readonly [string, Partial<HabitInput>])[];

  /** A later lifecycle action, possibly over several days; `check` runs after each step. */
  type Act = (g: Game, id: string, check: () => void) => void;
  const later: [string, Act][] = [
    ['Finish', (g, id) => g.run((tx) => retireWithRibbon(tx, id))],
    ['Archive', (g, id) => g.run((tx) => habits.archiveHabit(tx, id))],
    ['Finish, then Restore two days on', (g, id, check) => {
      g.run((tx) => retireWithRibbon(tx, id));
      check();
      g.goTo('2026-09-13').run((tx) => habits.restoreHabit(tx, id));
    }],
    ['Archive, then Restore the next day', (g, id, check) => {
      g.run((tx) => habits.archiveHabit(tx, id));
      check();
      g.goTo('2026-09-12').run((tx) => habits.restoreHabit(tx, id));
    }],
    ['a planned pause over the rest of the week', (g, id) => g.run((tx) => habits.pauseHabit(tx, id, '2026-09-11', '2026-09-13'))],
    ['a pause, then Resume the next day', (g, id, check) => {
      g.run((tx) => habits.pauseHabit(tx, id, '2026-09-11'));
      check();
      g.goTo('2026-09-12').run((tx) => habits.resumeHabit(tx, id));
    }],
    ['Take today off', (g) => g.run((tx) => logging.toggleOffDay(tx, '2026-09-11'))],
  ];

  for (const [editName, patch] of edits) {
    for (const [actName, act] of later) {
      it(`${editName}: ${actName}`, () => {
        const { g, id } = establishedWeekly([], 4);
        g.goTo('2026-09-10').run((tx) => habits.updateHabit(tx, id, patch, 'today'));
        g.goTo('2026-09-11');
        const before = verdict(periodOn(g, id, '2026-09-08'));
        expect(before).toMatchObject({ to: '2026-09-09', cut: true, target: 4, achieved: 0, openDays: 4, expected: 0, short: false });
        const check = () => expect(verdict(periodOn(g, id, '2026-09-08')), g.today).toEqual(before);
        act(g, id, check);
        check();
        g.goTo('2026-09-15');
        check();
      });
    }
  }

  it('a shortfall already settled at the cut stays settled after Finish and Restore', () => {
    const { g, id } = establishedWeekly();
    // Switch on Sunday: Mon–Sat governed with nothing logged, one day lost to the new rule.
    g.goTo('2026-09-13').run((tx) => habits.updateHabit(tx, id, { schedule: { kind: 'daily' } }, 'today'));
    g.goTo('2026-09-14');
    const before = verdict(periodOn(g, id, '2026-09-08'));
    expect(before).toMatchObject({ cut: true, target: 3, openDays: 1, expected: 2, short: true });
    g.run((tx) => retireWithRibbon(tx, id));
    expect(verdict(periodOn(g, id, '2026-09-08'))).toEqual(before);
    g.goTo('2026-09-16').run((tx) => habits.restoreHabit(tx, id));
    expect(verdict(periodOn(g, id, '2026-09-08'))).toEqual(before);
  });

  it('an ordinary archived period still prorates (no cut, nothing frozen)', () => {
    const { g, id } = establishedWeekly(['2026-09-07']);
    g.goTo('2026-09-09').run((tx) => habits.archiveHabit(tx, id)); // Wednesday
    g.goTo('2026-09-20');
    expect(periodOn(g, id, '2026-09-08')).toMatchObject({ cut: false, state: 'closed', activeDays: 3, target: 1, achieved: 1, met: true, short: false });
  });

  it('the visible tally and streak: Finish leaves the cut week, and the run through it, as they were', () => {
    // Same rhythm (weekly → every 2 weeks), so the run of met weeks continues through the cut week.
    const { g, id } = establishedWeekly();
    g.goTo('2026-09-10').run((tx) => habits.updateHabit(tx, id, { schedule: weekly(3, 2) }, 'today'));
    g.goTo('2026-09-11');
    const cutWeek = { start: '2026-09-07', end: '2026-09-09', attribution: 'calendar' } as const;
    const read = () => {
      const h = habitOf(g, id);
      const l = logsOf(g.state, id);
      const c = trackingCtx(g.state, g.today);
      const s = streakOf(h, l, c);
      return { tally: habitTally(h, l, cutWeek, c), current: s.current?.length ?? null, best: s.best?.length ?? null };
    };
    const before = read();
    expect(before).toEqual({ tally: { achieved: 0, expected: 0, tiny: 0 }, current: 5, best: 5 });
    g.run((tx) => retireWithRibbon(tx, id));
    // Before WP-B5: the cut week becomes 0 of 1, a settled shortfall, and the five-week run is no
    // longer current.
    expect(read()).toEqual(before);
    g.goTo('2026-09-14');
    expect(read()).toEqual(before);
  });

  it('a period cut tonight by graduation reads its lost days as open and active, whatever is planned for them', () => {
    const { g, id } = establishedWeekly(['2026-09-07']);
    g.goTo('2026-09-09').run((tx) => habits.updateHabit(tx, id, { schedule: weekly(4) }, 'tomorrow'));
    const before = verdict(periodOn(g, id, '2026-09-08'));
    expect(before).toMatchObject({ to: '2026-09-09', cut: true, target: 3, achieved: 1 });
    g.run((tx) => habits.pauseHabit(tx, id, '2026-09-10', '2026-09-13'));
    expect(verdict(periodOn(g, id, '2026-09-08'))).toEqual(before);
  });
});

/* ------------------------------------------------------------------ */
/* domain-d6: an empty lifetime                                        */
/* ------------------------------------------------------------------ */

describe('domain-d6: Finish on the first day leaves no missed day (WP-B5, DEC-P12b)', () => {
  const D = '2026-09-07';

  /** A save with one habit created on D (and a second, done, so a perfect day is possible). */
  function created(log: 'none' | 'partial' | 'tiny' | 'full'): { g: Game; id: string; other: string } {
    const g = new Game({ start: D });
    const other = g.addHabit({ name: 'Read' });
    const id = g.addHabit({ name: 'Water', target: 3, tiny: { label: 'One glass', count: 1 } });
    if (log === 'partial') g.checkIn(id);
    if (log === 'tiny') g.tiny(id);
    if (log === 'full') for (let i = 0; i < 3; i++) g.checkIn(id);
    return { g, id, other };
  }

  const readDay = (g: Game, id: string, date: DateKey) => {
    const h = habitOf(g, id);
    return evaluateDay(h, logsOf(g.state, id), date, trackingCtx(g.state, g.today));
  };
  const tally = (g: Game, id: string) => habitTally(habitOf(g, id), logsOf(g.state, id), { start: D, end: g.today, attribution: 'calendar' }, trackingCtx(g.state, g.today));

  for (const log of ['none', 'partial'] as const) {
    it(`same-day create and Finish with ${log === 'none' ? 'no check-in' : 'a partial count'}: an empty lifetime, no missed day today or tomorrow`, () => {
      const { g, id } = created(log);
      g.run((tx) => retireWithRibbon(tx, id));
      const h = habitOf(g, id);
      expect(h).toMatchObject({ startedOn: D, archivedOn: D, ribbon: D, unstarted: true });
      expect(validateState(g.state).ok).toBe(true);
      expect(inLifetime(h, D)).toBe(false);
      expect(lifetimeEnd(h, D)).toBeNull();
      expect(readDay(g, id, D)).toMatchObject({ outcome: 'transparent', inactive: 'archived' });
      expect(tally(g, id)).toEqual({ achieved: 0, expected: 0, tiny: 0 });
      expect(dayCompletion(trackingOf(g.state), D, D)).toMatchObject({ due: 1 });
      g.goTo(addDays(D, 1));
      expect(readDay(g, id, D).outcome).toBe('transparent');
      expect(tally(g, id)).toEqual({ achieved: 0, expected: 0, tiny: 0 });
      expect(streakOf(habitOf(g, id), logsOf(g.state, id), trackingCtx(g.state, g.today)).current).toBeNull();
      // No check-in, rest or history edit can land on a day outside the lifetime.
      expect(g.run((tx) => logging.editHistory(tx, id, D, true))).toBe(false);
      expect(g.run((tx) => logging.toggleRest(tx, id, D))).toBe(false);
      const logBefore = logsOf(g.state, id)[D];
      expect(g.checkIn(id, D)).toMatchObject({ completed: false, partial: false, rewarded: false });
      expect(logsOf(g.state, id)[D]).toEqual(logBefore);
    });
  }

  for (const log of ['tiny', 'full'] as const) {
    it(`same-day create and Finish after a ${log} check-in: today is its one day, achieved`, () => {
      const { g, id } = created(log);
      g.run((tx) => retireWithRibbon(tx, id));
      const h = habitOf(g, id);
      expect(h).toMatchObject({ startedOn: D, archivedOn: D, ribbon: D });
      expect(h.unstarted).toBeUndefined();
      expect(readDay(g, id, D)).toMatchObject({ outcome: 'achieved', tiny: log === 'tiny' });
      g.goTo(addDays(D, 1));
      expect(tally(g, id)).toEqual({ achieved: 1, expected: 1, tiny: log === 'tiny' ? 1 : 0 });
    });
  }

  it('the unstarted habit is not due today: the other habit done alone makes the perfect day it would have blocked', () => {
    const { g, id, other } = created('none');
    g.run((tx) => retireWithRibbon(tx, id));
    expect(dayCompletion(trackingOf(g.state), D, D).due).toBe(1);
    g.checkIn(other);
    expect(dayCompletion(trackingOf(g.state), D, D)).toMatchObject({ due: 1, done: 1 });
  });

  it('restored the same day: today is an open day again (pending, never missed); restored later: the creation day stays out', () => {
    {
      const { g, id } = created('none');
      g.run((tx) => retireWithRibbon(tx, id));
      g.run((tx) => habits.restoreHabit(tx, id));
      const h = habitOf(g, id);
      expect(h.unstarted).toBeUndefined();
      expect(h.archivedOn).toBeUndefined();
      expect(validateState(g.state).ok).toBe(true);
      expect(readDay(g, id, D).outcome).toBe('pending');
      g.checkIn(id);
      expect(logsOf(g.state, id)[D]).toMatchObject({ count: 1 });
    }
    {
      const { g, id } = created('none');
      g.run((tx) => retireWithRibbon(tx, id));
      g.goTo(addDays(D, 3)).run((tx) => habits.restoreHabit(tx, id));
      const h = habitOf(g, id);
      expect(h.unstarted).toBeUndefined();
      expect(h.pauses).toEqual([{ start: D, end: addDays(D, 2) }]);
      expect(readDay(g, id, D).outcome).toBe('transparent');
      expect(tally(g, id)).toEqual({ achieved: 0, expected: 0, tiny: 0 });
    }
  });

  it('restored the same day after a perfect day it did not block: the pause covers today and it is back tomorrow', () => {
    const { g, id, other } = created('none');
    const third = g.addHabit({ name: 'Stretch' });
    g.run((tx) => retireWithRibbon(tx, id));
    g.checkIn(other);
    g.checkIn(third);
    expect(g.state.ledger.once[`perfect|${D}`]).toBeDefined();
    g.run((tx) => habits.restoreHabit(tx, id));
    expect(habitOf(g, id).pauses).toEqual([{ start: D, end: D }]);
    expect(readDay(g, id, D).outcome).toBe('transparent');
  });

  it('Archive before the first day (a clock that went back): unstarted too', () => {
    const g = new Game({ start: D });
    const id = g.addHabit({ name: 'Water' });
    const env: Env = { now: at(addDays(D, -1)), today: addDays(D, -1), local: UTC, rng: g.rng };
    const s = transact(g.state, env, (tx) => ({ r: habits.archiveHabit(tx, id) })).state;
    const h = s.habits.find((x) => x.id === id)!;
    expect(h).toMatchObject({ archivedOn: D, unstarted: true });
    expect(inLifetime(h, D)).toBe(false);
    expect(validateState(s).ok).toBe(true);
  });

  it('an unstarted habit cannot be backdated (restore it first)', () => {
    const { g, id } = created('none');
    g.run((tx) => retireWithRibbon(tx, id));
    expect(g.run((tx) => habits.setStartedOn(tx, id, addDays(D, -7)))).toBe(false);
    expect(habitOf(g, id)).toMatchObject({ startedOn: D, archivedOn: D, unstarted: true });
  });

  it('the flag passes the decoder and survives a save round trip; the validator keeps it consistent', () => {
    const { g, id } = created('none');
    g.run((tx) => retireWithRibbon(tx, id));
    const loaded = parseEnvelope(encodeEnvelope(g.state, 3, g.now, 'test'));
    expect(loaded.kind).toBe('ok');
    expect((loaded as { state: AppState }).state).toEqual(g.state);
    const withHabit = (patch: Record<string, unknown>) => ({ ...g.state, habits: g.state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
    expect(validateState(withHabit({})).ok).toBe(true);
    expect(validateState(withHabit({ unstarted: false })).ok).toBe(false);
    expect(validateState(withHabit({ unstarted: 'yes' })).ok).toBe(false);
    expect(validateState(withHabit({ archivedOn: undefined, ribbon: undefined })).ok).toBe(false);
    expect(validateState(withHabit({ archivedOn: addDays(D, 1), ribbon: addDays(D, 1) })).ok).toBe(false);
  });
});
