/** B5 acceptance: real zone clocks feed lifecycle reducers at day/week/month boundaries. */
import { describe, expect, it } from 'vitest';
import type { AppState, DateKey } from '@/state/types';
import type { HabitInput } from '@/state/api';
import { createInitialState } from '@/state/defaults';
import { validateState } from '@/state/validate';
import { appDayKey, monotonicDayKey, zonedLocalTime } from '@/domain/dates';
import { evaluateDay, lifetimeEnd } from '@/domain/activity';
import { deservedLevel, logsOf, trackingCtx } from '@/domain/economy';
import * as habits from '@/domain/habits';
import { checkIn } from '@/domain/logging';
import { flexPeriodAt, periodEvaluations } from '@/domain/periods';
import { openDay } from '@/domain/rollover';
import { retireWithRibbon } from '@/domain/seasonReview';
import { mulberry32 } from '@/domain/rng';
import { transact, type Tx } from '@/domain/tx';
import { baseInput } from './game';

/** The production day-selection seam followed by the real opening/action transaction. */
class ZonedHistory {
  state: AppState;
  now: number;
  rng = mulberry32(71);
  constructor(public zone: string, instant: string) {
    this.now = Date.parse(instant);
    const initial = createInitialState(this.now);
    this.state = { ...initial, settings: { ...initial.settings, dayStartsAt: 210, weekStart: 1 } };
    this.run((tx) => habits.completeOnboarding(tx, { name: 'Sam', templateIds: [] }));
  }
  get local() { return zonedLocalTime(this.zone); }
  get today() { return monotonicDayKey(appDayKey(this.now, 210, this.local), this.state.clock.maxDateKey); }
  run<T>(action: (tx: Tx) => T): T {
    const out = transact(this.state, { now: this.now, today: this.today, local: this.local, timeZone: this.zone, rng: this.rng }, (tx) => {
      openDay(tx);
      return { result: action(tx) };
    });
    this.state = out.state;
    expect(validateState(this.state).ok).toBe(true);
    return out.result;
  }
  at(instant: string) { this.now = Date.parse(instant); this.run(() => undefined); return this; }
  add(schedule: HabitInput['schedule'] = { kind: 'daily' }) { return this.run((tx) => habits.createHabit(tx, baseInput({ schedule }))); }
  habit(id: string) { return this.state.habits.find((h) => h.id === id)!; }
  period(id: string, day: DateKey) {
    const h = this.habit(id);
    const p = flexPeriodAt(h, day, 1)!;
    const e = periodEvaluations(h, logsOf(this.state, id), p.from, p.from, trackingCtx(this.state, this.today))[0]!;
    return { key: e.key, from: e.from, to: e.to, target: e.target, achieved: e.achieved, expected: e.expected, openDays: e.openDays, met: e.met, short: e.short, state: e.state };
  }
}

// Literal UTC instants and expected civil dates are intentional: no inverse of appDayKey builds
// the oracle. Chatham is already +13:45; Lord Howe changes +10:30 → +11 on October 4.
const ZONES = [
  { zone: 'Asia/Kathmandu', start: '2026-09-28T06:15:00Z', cut: '2026-09-30T21:45:00Z', monday: '2026-10-04T21:45:00Z', jan: '2028-01-01T06:15:00Z', feb28: '2028-02-28T06:15:00Z', march: '2028-02-29T21:45:00Z' },
  { zone: 'Asia/Kolkata', start: '2026-09-28T06:30:00Z', cut: '2026-09-30T22:00:00Z', monday: '2026-10-04T22:00:00Z', jan: '2028-01-01T06:30:00Z', feb28: '2028-02-28T06:30:00Z', march: '2028-02-29T22:00:00Z' },
  { zone: 'Pacific/Chatham', start: '2026-09-27T22:15:00Z', cut: '2026-09-30T13:45:00Z', monday: '2026-10-04T13:45:00Z', jan: '2027-12-31T22:15:00Z', feb28: '2028-02-27T22:15:00Z', march: '2028-02-29T13:45:00Z' },
  { zone: 'Australia/Lord_Howe', start: '2026-09-28T01:30:00Z', cut: '2026-09-30T17:00:00Z', monday: '2026-10-04T16:30:00Z', jan: '2028-01-01T01:00:00Z', feb28: '2028-02-28T01:00:00Z', march: '2028-02-29T16:30:00Z' },
] as const;
const minuteBefore = (instant: string) => new Date(Date.parse(instant) - 60_000).toISOString();
const cutWeek = { key: '2026-09-28', from: '2026-09-28', to: '2026-09-30', target: 3, achieved: 0, expected: 0, openDays: 4, met: false, short: false, state: 'closed' };

describe.each(ZONES)('$zone: B5 through the 03:30 app-day boundary', (row) => {
  it('a Thursday cut survives opening Monday and Finish; a habit created and finished on that Monday has no missed day', () => {
    const g = new ZonedHistory(row.zone, row.start);
    expect(g.today).toBe('2026-09-28');
    const id = g.add({ kind: 'weekly', times: 3, every: 1 });
    g.at(row.cut);
    expect(g.today).toBe('2026-10-01');
    g.run((tx) => habits.updateHabit(tx, id, { schedule: { kind: 'daily' } }, 'today'));
    expect(g.habit(id).rules.map((r) => r.from)).toEqual(['2026-09-28', '2026-10-01']);
    expect(g.period(id, '2026-09-29')).toEqual(cutWeek);
    const rules = structuredClone(g.habit(id).rules);

    g.at(minuteBefore(row.monday));
    expect(g.local(g.now)).toMatchObject({ hour: 3, minute: 29 });
    expect(g.today).toBe('2026-10-04');
    g.at(row.monday);
    expect(g.local(g.now)).toMatchObject({ hour: 3, minute: 30 });
    expect(g.today).toBe('2026-10-05');
    expect(g.state.clock.maxDateKey).toBe('2026-10-05');
    expect(g.habit(id).rules).toEqual(rules); // a clock boundary cannot rewrite an old rule
    expect(g.run((tx) => retireWithRibbon(tx, id))).toBe(true);
    expect(g.habit(id).archivedOn).toBe('2026-10-04');
    expect(g.period(id, '2026-09-29')).toEqual(cutWeek);

    const empty = g.add();
    expect(g.run((tx) => retireWithRibbon(tx, empty))).toBe(true);
    expect(g.habit(empty)).toMatchObject({ startedOn: '2026-10-05', archivedOn: '2026-10-05', unstarted: true });
    expect(lifetimeEnd(g.habit(empty), '2026-10-05')).toBeNull();
    for (const day of ['2026-10-05', '2026-10-06']) {
      expect(evaluateDay(g.habit(empty), {}, day, trackingCtx(g.state, '2026-10-06')).outcome).toBe('transparent');
    }
  });

  it('the leap-month closes at 03:30; backdating keeps its bi-monthly grid, verdict and grants', () => {
    const g = new ZonedHistory(row.zone, row.jan);
    expect(g.today).toBe('2028-01-01');
    const id = g.add({ kind: 'monthly', times: 1, every: 2 });
    g.at(row.feb28).run((tx) => checkIn(tx, id));
    expect(g.today).toBe('2028-02-28');
    g.at(minuteBefore(row.march)).run((tx) => checkIn(tx, id));
    expect(g.today).toBe('2028-02-29');
    expect(g.period(id, '2028-02-29')).toMatchObject({ key: '2028-01-01', to: '2028-02-29', state: 'current' });
    expect(deservedLevel(g.state, g.habit(id), '2028-02-29', g.today)).toBe('over');
    g.at(row.march);
    expect(g.today).toBe('2028-03-01');
    const closed = { key: '2028-01-01', from: '2028-01-01', to: '2028-02-29', target: 1, achieved: 1, expected: 1, openDays: 0, met: true, short: false, state: 'closed' };
    expect(g.period(id, '2028-02-29')).toEqual(closed);
    expect(flexPeriodAt(g.habit(id), '2028-03-01', 1)).toMatchObject({ key: '2028-03-01', start: '2028-03-01', end: '2028-04-30' });
    const once = structuredClone(g.state.ledger.once);
    const coins = g.state.wallet.coins;
    expect(g.run((tx) => habits.setStartedOn(tx, id, '2027-12-01'))).toBe(true);
    expect(g.habit(id).rules[0]).toMatchObject({ from: '2027-12-01', gridFrom: '2028-01-01' });
    expect(g.period(id, '2028-02-29')).toEqual(closed);
    expect(flexPeriodAt(g.habit(id), '2028-03-01', 1)).toMatchObject({ key: '2028-03-01', end: '2028-04-30' });
    expect(deservedLevel(g.state, g.habit(id), '2028-02-29', g.today)).toBe('over');
    expect(g.state.ledger.once).toEqual(once);
    expect(g.state.wallet.coins).toBe(coins);
  });
});

it('Lord Howe’s half-hour spring jump keeps the old app day until 03:30, then Finish uses October 3', () => {
  const g = new ZonedHistory('Australia/Lord_Howe', '2026-10-03T15:29:00Z');
  expect(g.local(g.now)).toMatchObject({ day: 4, hour: 1, minute: 59 });
  expect(g.today).toBe('2026-10-03');
  const id = g.add();
  g.run((tx) => checkIn(tx, id));
  g.at('2026-10-03T15:30:00Z');
  expect(g.local(g.now)).toMatchObject({ day: 4, hour: 2, minute: 30 });
  expect(g.today).toBe('2026-10-03');
  g.at('2026-10-03T16:29:00Z');
  expect(g.today).toBe('2026-10-03');
  g.at('2026-10-03T16:30:00Z');
  expect(g.today).toBe('2026-10-04');
  expect(g.run((tx) => retireWithRibbon(tx, id))).toBe(true);
  expect(g.habit(id)).toMatchObject({ archivedOn: '2026-10-03', ribbon: '2026-10-03' });
  expect(g.habit(id).unstarted).toBeUndefined();
  expect(evaluateDay(g.habit(id), logsOf(g.state, id), '2026-10-03', trackingCtx(g.state, g.today)).outcome).toBe('achieved');
});

it('date-line travel holds the latest app day and the old cut; only a deliberate edit adds a rule', () => {
  const g = new ZonedHistory('Pacific/Kiritimati', '2026-09-27T22:00:00Z');
  expect(g.today).toBe('2026-09-28');
  const id = g.add({ kind: 'weekly', times: 3, every: 1 });
  g.at('2026-09-30T10:30:00Z'); // Oct 1 00:30 on Kiritimati, still the Sep 30 app day
  expect(g.local(g.now)).toMatchObject({ month: 10, day: 1, hour: 0, minute: 30 });
  expect(g.today).toBe('2026-09-30');
  g.run((tx) => habits.updateHabit(tx, id, { schedule: { kind: 'daily' } }, 'today'));
  const cut = { ...cutWeek, to: '2026-09-29', openDays: 5 };
  expect(g.period(id, '2026-09-29')).toEqual(cut);
  const rules = structuredClone(g.habit(id).rules);
  const logs = structuredClone(g.state.logs);
  g.zone = 'Pacific/Honolulu'; // same instant: Sep 30 00:30, raw app day Sep 29
  expect(appDayKey(g.now, 210, g.local)).toBe('2026-09-29');
  g.run(() => undefined);
  expect(g.today).toBe('2026-09-30');
  expect(g.state.clock.maxDateKey).toBe('2026-09-30');
  expect(g.habit(id).rules).toEqual(rules);
  expect(g.state.logs).toEqual(logs);
  expect(g.period(id, '2026-09-29')).toEqual(cut);
  g.at('2026-10-01T13:30:00Z'); // Honolulu Oct 1 03:30
  expect(g.today).toBe('2026-10-01');
  expect(g.run((tx) => retireWithRibbon(tx, id))).toBe(true);
  expect(g.habit(id).archivedOn).toBe('2026-09-30');
  expect(g.period(id, '2026-09-29')).toEqual(cut);
  expect(g.habit(id).rules).toEqual(rules);
});
