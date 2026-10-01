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
 * - P-history-01 (DEC-P12d): "Start tracking from…" moves `startedOn` (and the first rule's `from`)
 *   to the exact date, while a flexible first rule keeps the period grid it had (`gridFrom`), so
 *   no existing period regroups and no grant moves.
 * - P-history-03 (DEC-P12g): backdating is bounded to ten years before today, and never before
 *   2000-01-01.
 */
import { describe, expect, it } from 'vitest';
import type { AppState, DateKey, Habit } from '@/state/types';
import type { HabitInput } from '@/state/api';
import { encodeEnvelope, parseEnvelope } from '@/state/persist';
import { validateState } from '@/state/validate';
import { addDays } from '@/domain/dates';
import { evaluateDay, inLifetime, lifetimeEnd } from '@/domain/activity';
import { habitTally, trackingOf, dayCompletion } from '@/domain/consistency';
import { deservedLevel, logsOf, streakOf, trackingCtx } from '@/domain/economy';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { flexPeriodAt, flexPeriodsOverlapping, periodEvaluations, type PeriodEvaluation } from '@/domain/periods';
import { chance, mulberry32, pick, randomInt, type Rng } from '@/domain/rng';
import { retireWithRibbon } from '@/domain/seasonReview';
import { transact, type Env, type Tx } from '@/domain/tx';
import { Game, UTC, at } from './game';
import { randomContent } from './random';

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
/* Property: random sequences never change a closed period's verdict   */
/* ------------------------------------------------------------------ */

type ActionName = 'edit' | 'finish' | 'archive' | 'restore' | 'pause' | 'resume' | 'off' | 'backdate' | 'checkin' | 'none';

/** Runs one reducer on a plain state (no openDay: only the action itself changes the save). */
function act<R>(s: AppState, today: DateKey, rng: Rng, body: (tx: Tx) => R): AppState {
  const env: Env = { now: at(today, 12), today, local: UTC, rng };
  return transact(s, env, (tx) => ({ r: body(tx) })).state;
}

/** Every closed flexible period of the habit as of `today`, by identity. */
function closedVerdicts(s: AppState, id: string, today: DateKey): Map<string, ReturnType<typeof verdict> & { start: DateKey }> {
  const h = s.habits.find((x) => x.id === id)!;
  const out = new Map<string, ReturnType<typeof verdict> & { start: DateKey }>();
  for (const e of periodEvaluations(h, logsOf(s, id), h.startedOn, today, trackingCtx(s, today))) {
    if (e.state !== 'closed') continue;
    out.set(`${e.key}|${e.from}|${e.unit}${e.every}x${e.times}`, { ...verdict(e), start: e.start });
  }
  return out;
}

describe('property: random edit, Finish, Archive, Restore, pause, resume, day-off and backdate sequences never change a closed period (WP-B5)', () => {
  it('holds over 40 seeded histories of 150 days', { timeout: 120_000 }, () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = mulberry32(seed * 7919);
      const g = new Game({ start: '2026-03-02', seed });
      const flexible = chance(rng, 0.8);
      const schedule = flexible ? (chance(rng, 0.5) ? weekly(randomInt(rng, 1, 5), pick(rng, [1, 2, 3, 4] as const)) : monthly(randomInt(rng, 1, 3), pick(rng, [1, 2, 3, 6, 12] as const))) : { kind: 'daily' as const };
      const id = g.addHabit({ name: 'Walk', schedule });
      let s = g.state;
      const seen = new Map<string, ReturnType<typeof verdict> & { start: DateKey }>();
      let today = '2026-03-02';
      for (let day = 0; day < 150; day++) {
        today = addDays('2026-03-02', day);
        const h = () => s.habits.find((x) => x.id === id)!;
        const live = h().archivedOn === undefined;
        const r = rng();
        const action: ActionName =
          r < 0.45 ? (live ? 'checkin' : 'none')
          : r < 0.55 ? (live ? 'edit' : 'restore')
          : r < 0.6 ? 'finish'
          : r < 0.64 ? 'archive'
          : r < 0.7 ? 'restore'
          : r < 0.76 ? 'pause'
          : r < 0.81 ? 'resume'
          : r < 0.86 ? 'off'
          : r < 0.9 ? 'backdate'
          : 'none';
        const before = closedVerdicts(s, id, today);
        const startedBefore = h().startedOn;
        const where = `seed ${seed}, ${today}, ${action}`;
        switch (action) {
          case 'checkin':
            s = act(s, today, rng, (tx) => logging.checkIn(tx, id));
            break;
          case 'edit': {
            const c = randomContent(rng);
            const timing = pick(rng, ['today', 'today', 'next-period', 'tomorrow'] as const);
            s = act(s, today, rng, (tx) => habits.updateHabit(tx, id, { schedule: c.schedule, target: c.target, step: c.step, tiny: c.tiny }, timing));
            break;
          }
          case 'finish':
            s = act(s, today, rng, (tx) => retireWithRibbon(tx, id));
            break;
          case 'archive':
            s = act(s, today, rng, (tx) => habits.archiveHabit(tx, id));
            break;
          case 'restore':
            s = act(s, today, rng, (tx) => habits.restoreHabit(tx, id));
            break;
          case 'pause': {
            const start = addDays(today, randomInt(rng, 0, 4));
            const end = chance(rng, 0.7) ? addDays(start, randomInt(rng, 0, 9)) : undefined;
            s = act(s, today, rng, (tx) => habits.pauseHabit(tx, id, start, end));
            break;
          }
          case 'resume':
            s = act(s, today, rng, (tx) => habits.resumeHabit(tx, id));
            break;
          case 'off':
            s = act(s, today, rng, (tx) => logging.toggleOffDay(tx, today));
            break;
          case 'backdate':
            s = act(s, today, rng, (tx) => habits.setStartedOn(tx, id, addDays(startedBefore, -randomInt(rng, 1, 40))));
            break;
          case 'none':
            break;
        }
        expect(validateState(s).ok, where).toBe(true);
        const after = closedVerdicts(s, id, today);
        const backdated = h().startedOn < startedBefore;
        for (const [k, v] of before) {
          // Backdating adds tracked days to the period holding the old first day: that period may
          // change (its documented effect). Every later period keeps its place and its verdict.
          if (backdated && v.start < startedBefore) {
            seen.delete(k);
            continue;
          }
          // Undoing an edit on the day it was made removes its cut: the period is current again.
          if (!after.has(k) && action === 'edit' && v.to === addDays(today, -1)) {
            seen.delete(k);
            continue;
          }
          expect(after.get(k), `${where}: ${k}`).toEqual(v);
        }
        // Closed periods stay as they were first seen, whatever happened since.
        for (const [k, v] of after) {
          const first = seen.get(k);
          if (first) expect(v, `${where}: ${k} since first seen`).toEqual(first);
          else seen.set(k, v);
        }
      }
    }
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

/* ------------------------------------------------------------------ */
/* P-history-01: backdating keeps the period grid                      */
/* ------------------------------------------------------------------ */

describe('P-history-01: "Start tracking from…" keeps every existing period and grant (WP-B5, DEC-P12d)', () => {
  it("the audit's case: Sep 13 (in target) and Sep 14 (over) stay in one biweekly period after backdating to Aug 31", () => {
    const g = new Game({ start: '2026-09-07' }); // Monday
    const id = g.addHabit({ name: 'Run', schedule: weekly(1, 2) });
    g.goTo('2026-09-13').checkIn(id);
    g.goTo('2026-09-14').checkIn(id);
    const levelBefore = deservedLevel(g.state, habitOf(g, id), '2026-09-14', g.today);
    expect(levelBefore).toBe('over');
    expect(g.run((tx) => habits.setStartedOn(tx, id, '2026-08-31'))).toBe(true);
    const h = habitOf(g, id);
    expect(h.startedOn).toBe('2026-08-31');
    expect(h.rules[0]!.from).toBe('2026-08-31');
    expect(validateState(g.state).ok).toBe(true);
    expect(flexPeriodAt(h, '2026-09-13', 1)).toMatchObject({ key: '2026-09-07', start: '2026-09-07', end: '2026-09-20' });
    expect(flexPeriodAt(h, '2026-09-14', 1)!.key).toBe('2026-09-07');
    // The new days get the period before, on the same grid.
    expect(flexPeriodAt(h, '2026-08-31', 1)).toMatchObject({ key: '2026-08-24', start: '2026-08-24', end: '2026-09-06', from: '2026-08-24' });
    expect(deservedLevel(g.state, h, '2026-09-14', g.today)).toBe(levelBefore);
  });

  const cases = [
    ...([2, 3, 4] as const).map((every) => ({ name: `weekly every ${every}`, schedule: weekly(1, every), back: [1, 6, 7, 13, 20, 27] })),
    ...([2, 3, 6, 12] as const).map((every) => ({ name: `monthly every ${every}`, schedule: monthly(1, every), back: [1, 15, 31, 45, 75, 200] })),
  ];

  for (const c of cases) {
    it(`${c.name}: periods from the old first day on keep their keys and bounds, and the grants stand`, () => {
      const start = '2026-05-13'; // a Wednesday, mid-month
      for (const back of c.back) {
        const g = new Game({ start });
        const id = g.addHabit({ name: 'Run', schedule: c.schedule });
        // Check in once every 10 days for 400 days (later days are in the future and ignored).
        for (let d = 0; d < 120; d += 10) g.goTo(addDays(start, d)).checkIn(id);
        const today = g.today;
        const h0 = habitOf(g, id);
        const before = flexPeriodsOverlapping(h0, start, addDays(today, 400), 1).map(({ key, start, end, from, to }) => ({ key, start, end, from, to }));
        const once = Object.keys(g.state.ledger.once).filter((k) => k.startsWith(`period|${id}|`));
        const coins = g.coins;
        const levels = Object.keys(logsOf(g.state, id)).map((d) => deservedLevel(g.state, h0, d, today));
        const date = addDays(start, -back);
        expect(g.run((tx) => habits.setStartedOn(tx, id, date)), `${c.name} −${back}`).toBe(true);
        const h = habitOf(g, id);
        expect(h.startedOn).toBe(date);
        expect(h.rules[0]!.from).toBe(date);
        expect(validateState(g.state).ok).toBe(true);
        const after = flexPeriodsOverlapping(h, start, addDays(today, 400), 1).map(({ key, start, end, from, to }) => ({ key, start, end, from, to }));
        // The first old period now starts at its nominal start (the habit's days begin earlier).
        expect(after.slice(1), `${c.name} −${back}`).toEqual(before.slice(1));
        expect(after[0]!.key).toBe(before[0]!.key);
        expect(Object.keys(g.state.ledger.once).filter((k) => k.startsWith(`period|${id}|`))).toEqual(once);
        expect(g.coins).toBe(coins);
        expect(Object.keys(logsOf(g.state, id)).map((d) => deservedLevel(g.state, h, d, today))).toEqual(levels);
      }
    });
  }

  it('a "this period" edit on a backdated habit takes over the period of the kept grid', () => {
    const g = new Game({ start: '2026-09-07' });
    const id = g.addHabit({ name: 'Run', schedule: weekly(1, 2) });
    g.run((tx) => habits.setStartedOn(tx, id, '2026-08-31'));
    g.goTo('2026-09-15').run((tx) => habits.updateHabit(tx, id, { schedule: weekly(2, 2) }, 'today'));
    const h = habitOf(g, id);
    expect(h.rules.map((r) => r.from)).toEqual(['2026-08-31', '2026-09-07']);
    expect(flexPeriodAt(h, '2026-09-15', 1)).toMatchObject({ key: '2026-09-07', from: '2026-09-07', to: '2026-09-20', times: 2 });
    expect(flexPeriodAt(h, '2026-09-01', 1)).toMatchObject({ key: '2026-08-24', from: '2026-08-24', to: '2026-09-06', times: 1 });
  });

  it('an edit replacing the whole first rule with the same geometry keeps the grid', () => {
    const g = new Game({ start: '2026-09-09' }); // Wednesday
    const id = g.addHabit({ name: 'Run', schedule: weekly(1, 2) });
    g.run((tx) => habits.setStartedOn(tx, id, '2026-09-07'));
    // Backdated by two days only: the first period [Sep 7, Sep 20] is still current, so a
    // "this period" edit replaces the first rule.
    g.run((tx) => habits.updateHabit(tx, id, { schedule: weekly(2, 2) }, 'today'));
    const h = habitOf(g, id);
    expect(h.rules).toHaveLength(1);
    expect(h.rules[0]!.from).toBe('2026-09-07');
    expect(flexPeriodAt(h, '2026-09-20', 1)).toMatchObject({ key: '2026-09-07', end: '2026-09-20', times: 2 });
  });

  it('the kept grid passes the decoder and survives a save round trip; a bad one is rejected', () => {
    const g = new Game({ start: '2026-09-09' });
    const id = g.addHabit({ name: 'Run', schedule: weekly(1, 3) });
    g.run((tx) => habits.setStartedOn(tx, id, '2026-08-20'));
    const loaded = parseEnvelope(encodeEnvelope(g.state, 3, g.now, 'test'));
    expect(loaded.kind).toBe('ok');
    expect((loaded as { state: AppState }).state).toEqual(g.state);
    const withFirst = (patch: Record<string, unknown>) => ({
      ...g.state,
      habits: g.state.habits.map((h) => (h.id === id ? { ...h, rules: [{ ...h.rules[0]!, ...patch }, ...h.rules.slice(1)] } : h)),
    });
    expect(validateState(withFirst({})).ok).toBe(true);
    expect(validateState(withFirst({ gridFrom: 'soon' })).ok).toBe(false);
    expect(validateState(withFirst({ gridFrom: 20260909 })).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* P-history-03 / DEC-P12g: a lower bound on backdating                */
/* ------------------------------------------------------------------ */

describe('backdating is bounded: ten years back at most, and never before 2000 (WP-B5, DEC-P12g)', () => {
  it('ten years before today is the earliest start; a day earlier is refused', () => {
    const g = new Game({ start: '2026-09-07' });
    const id = g.addHabit({ name: 'Walk' });
    expect(habits.earliestStartedOn('2026-09-07')).toBe('2016-09-07');
    expect(g.run((tx) => habits.setStartedOn(tx, id, '2016-09-06'))).toBe(false);
    expect(habitOf(g, id).startedOn).toBe('2026-09-07');
    expect(g.run((tx) => habits.setStartedOn(tx, id, '2016-09-07'))).toBe(true);
    expect(habitOf(g, id).startedOn).toBe('2016-09-07');
  });

  it('never before 2000-01-01, and a leap day maps to the last day of February', () => {
    expect(habits.earliestStartedOn('2008-06-01')).toBe('2000-01-01');
    expect(habits.earliestStartedOn('2028-02-29')).toBe('2018-02-28');
  });
});
