import { describe, expect, it } from 'vitest';
import type { DayLog, Habit } from '@/state/types';
import type { HabitLogs } from '@/domain/activity';
import type { Tracking } from '@/domain/consistency';
import { eachDay, weekday, zonedLocalTime } from '@/domain/dates';
import { monthWindow } from '@/domain/consistency';
import {
  busiestTimeOfDay,
  checkinCounts,
  firstTrackedDay,
  goalsOnTrack,
  mostCheckedHabit,
  mostConsistentHabit,
  records,
  showedUpDays,
  strongestWeekday,
  timeBlockOf,
} from '@/domain/insights';
import { habit, logs, monthly, on, onDays, range, tiny, weekly, without } from './helpers';

function tracking(entries: [Habit, HabitLogs][], weekStart: 0 | 1 = 1): Tracking {
  return {
    habits: entries.map(([h]) => h),
    logs: Object.fromEntries(entries.map(([h, l]) => [h.id, l])),
    offDays: {},
    weekStart,
  };
}

describe('showed up N of the last 30 days', () => {
  it('counts days with any check-in, across habits', () => {
    const a = habit({ id: 'a', startedOn: '2026-08-01' });
    const b = habit({ id: 'b', startedOn: '2026-08-01', schedule: weekly(2) });
    const t = tracking([
      [a, logs(range('2026-09-01', '2026-09-10'), on(['2026-09-12'], { kind: 'log', count: 0 }))],
      [b, logs(on(['2026-09-10', '2026-09-20']), on(['2026-09-21'], tiny()))],
    ]);
    // Aug 31–Sep 29: Sep 1–10 (10) + Sep 20 + Sep 21 = 12 days.
    expect(showedUpDays(t, '2026-09-29')).toEqual({ days: 12, span: 30 });
  });

  it('the span is clipped while the meadow is young; empty without habits', () => {
    const t = tracking([[habit({ startedOn: '2026-09-25' }), logs(range('2026-09-25', '2026-09-29'))]]);
    expect(showedUpDays(t, '2026-09-29')).toEqual({ days: 5, span: 5 });
    expect(showedUpDays(tracking([]), '2026-09-29')).toEqual({ days: 0, span: 0 });
    expect(firstTrackedDay(t)).toBe('2026-09-25');
  });
});

describe('check-in counts (Monthly Bouquet, most-checked habit)', () => {
  const walk = habit({ id: 'walk', startedOn: '2026-08-01', order: 1 });
  const read = habit({ id: 'read', startedOn: '2026-08-01', order: 0, archivedOn: '2026-09-20' });
  const t = tracking([
    [walk, logs(range('2026-09-01', '2026-09-10'), on(['2026-09-11'], tiny()), on(['2026-09-12'], { kind: 'log', count: 0 }))],
    [read, logs(range('2026-08-01', '2026-09-30'))],
  ]);

  it('counts done and tiny days per habit inside the window and lifetime', () => {
    expect(checkinCounts(t, '2026-09-01', '2026-09-30', '2026-09-30')).toEqual({
      walk: { checkins: 11, tiny: 1 },
      read: { checkins: 20, tiny: 0 }, // archived on Sep 20
    });
    expect(checkinCounts(t, '2026-09-01', '2026-09-30', '2026-09-05').walk).toEqual({ checkins: 5, tiny: 0 });
  });

  it('most-checked habit over all time (archived included); null before any check-in', () => {
    expect(mostCheckedHabit(t, '2026-09-30')).toEqual({ habitId: 'read', checkins: 51 });
    expect(mostCheckedHabit(tracking([[habit({ startedOn: '2026-09-01' }), logs()]]), '2026-09-30')).toBeNull();
  });
});

describe('weekly & monthly goals on track', () => {
  it('counts live flexible goals that are met or at pace', () => {
    const today = '2026-10-03'; // Saturday, week Sep 28–Oct 4
    const t = tracking([
      [habit({ id: 'met', startedOn: '2026-08-01', schedule: weekly(2) }), logs(on(['2026-09-28', '2026-09-30']))],
      [habit({ id: 'pace', startedOn: '2026-08-01', schedule: weekly(3) }), logs(on(['2026-09-28', '2026-09-29']))],
      [habit({ id: 'behind', startedOn: '2026-08-01', schedule: weekly(3) }), logs(on(['2026-09-28']))],
      [habit({ id: 'monthly', startedOn: '2026-08-01', schedule: monthly(1) }), logs()],
      [habit({ id: 'daily', startedOn: '2026-08-01' }), logs()],
      [habit({ id: 'archived', startedOn: '2026-08-01', schedule: weekly(1), archivedOn: '2026-09-01' }), logs()],
      [habit({ id: 'away', startedOn: '2026-08-01', schedule: weekly(1), pauses: [{ start: '2026-09-27' }] }), logs()],
    ]);
    const g = goalsOnTrack(t, today);
    expect(g.paces.map((p) => [p.habitId, p.onTrack])).toEqual([
      ['met', true],
      ['pace', true],
      ['behind', false],
      ['monthly', true],
    ]);
    expect([g.onTrack, g.total]).toEqual([3, 4]);
  });
});

describe('strongest weekday', () => {
  it('finds the weekday with the best day-based rate', () => {
    const h = habit({ startedOn: '2026-06-01' });
    // Last 84 days: everything done except most Mondays and a couple of Fridays.
    const days = eachDay('2026-07-07', '2026-09-28');
    const missed = days.filter((d, i) => weekday(d) === 1 || (weekday(d) === 5 && i % 2 === 0));
    const t = tracking([[h, without(logs(on(days)), ...missed)]]);
    const s = strongestWeekday(t, '2026-09-29')!;
    // Tue, Wed, Thu, Sat and Sun are all 100%. The tie goes to the most evidence: today (a Tuesday)
    // is still pending, so Wednesday has 12 done days to Tuesday's 11.
    expect(s.weekday).toBe(3);
    expect(s.tie).toBe(true);
    expect([s.byWeekday[2]!.achieved, s.byWeekday[3]!.achieved]).toEqual([11, 12]);
    expect(s.byWeekday[1]!.achieved).toBe(0);
  });

  it('needs enough evidence', () => {
    const t = tracking([[habit({ startedOn: '2026-09-25' }), logs(range('2026-09-25', '2026-09-29'))]]);
    expect(strongestWeekday(t, '2026-09-29')).toBeNull();
  });

  it('a clear winner is not a tie', () => {
    const h = habit({ startedOn: '2026-07-01', schedule: onDays(2, 4) });
    const days = eachDay('2026-07-07', '2026-09-29').filter((d) => weekday(d) === 2 || weekday(d) === 4);
    const thursdaysMissed = days.filter((d) => weekday(d) === 4).slice(0, 3);
    const s = strongestWeekday(tracking([[h, without(logs(on(days)), ...thursdaysMissed)]]), '2026-09-29')!;
    expect([s.weekday, s.tie, s.percent]).toEqual([2, false, 100]);
  });
});

describe('most consistent habit', () => {
  it('picks the best rate among habits with ≥ 10 expected', () => {
    const t = tracking([
      [habit({ id: 'walk', startedOn: '2026-07-01', order: 0 }), without(logs(range('2026-07-01', '2026-09-29')), '2026-09-01', '2026-09-02')],
      [habit({ id: 'read', startedOn: '2026-07-01', order: 1, schedule: onDays(1, 3, 5) }), logs(range('2026-07-01', '2026-09-29'))],
      [habit({ id: 'budget', startedOn: '2026-07-01', order: 2, schedule: monthly(1) }), logs(on(['2026-07-02', '2026-08-02', '2026-09-02']))],
    ]);
    const best = mostConsistentHabit(t, '2026-09-29')!;
    expect(best.habitId).toBe('read');
    expect(best.percent).toBe(100);
  });

  it('null when nothing qualifies', () => {
    expect(mostConsistentHabit(tracking([[habit({ startedOn: '2026-09-25' }), logs()]]), '2026-09-29')).toBeNull();
  });

  it('can look at a closed month, including habits archived since ("best fact")', () => {
    const t = tracking([
      [habit({ id: 'walk', startedOn: '2026-07-01', order: 0 }), without(logs(range('2026-07-01', '2026-09-29')), '2026-08-03')],
      [habit({ id: 'read', startedOn: '2026-07-01', order: 1, archivedOn: '2026-09-01' }), logs(range('2026-07-01', '2026-09-01'))],
    ]);
    expect(mostConsistentHabit(t, '2026-09-29')!.habitId).toBe('walk');
    expect(mostConsistentHabit(t, '2026-09-29', { window: monthWindow('2026-08') })).toMatchObject({ habitId: 'read', percent: 100 });
  });
});

describe('busiest time of day (live stamps only)', () => {
  const ny = zonedLocalTime('America/New_York');
  const stamped = (date: string, hoursUtc: number[]): DayLog => ({ kind: 'log', count: hoursUtc.length, at: hoursUtc.map((h) => Date.parse(`${date}T${String(h).padStart(2, '0')}:30:00Z`)) });

  it('each habit-day weighs 1, so an 8-tap water habit does not drown out a walk', () => {
    const walkDays = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
    const waterDays = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'];
    const t = tracking([
      [habit({ id: 'walk', startedOn: '2026-09-01' }), logs(Object.fromEntries(walkDays.map((d) => [d, stamped(d, [11])])))], // 7:30 EDT
      [habit({ id: 'water', startedOn: '2026-09-01', target: 8 }), logs(Object.fromEntries(waterDays.map((d) => [d, stamped(d, [22, 22, 22, 22, 23, 23, 23, 23])])))], // 18:30–19:30
      [habit({ id: 'old', startedOn: '2026-09-01' }), logs(on(['2026-09-26']))], // backfill: no stamps
    ]);
    const b = busiestTimeOfDay(t, '2026-09-29', ny)!;
    expect(b.block).toBe('morning');
    expect(b.peakHour).toBe(7);
    expect(b.total).toBe(10);
    expect(b.blocks.morning).toBeCloseTo(6, 9);
    expect(b.blocks.evening).toBeCloseTo(4, 9);
  });

  it('null with too little data; blocks by wall-clock hour', () => {
    expect(busiestTimeOfDay(tracking([[habit({ startedOn: '2026-09-01' }), logs()]]), '2026-09-29', ny)).toBeNull();
    expect([4, 5, 10, 11, 16, 17, 21, 22, 0].map(timeBlockOf)).toEqual(['night', 'morning', 'morning', 'midday', 'midday', 'evening', 'evening', 'night', 'night']);
  });
});

describe('records', () => {
  it('total check-ins, best streak (+ habit), best closed month', () => {
    const walk = habit({ id: 'walk', startedOn: '2026-07-01' });
    const yoga = habit({ id: 'yoga', startedOn: '2026-07-01', schedule: weekly(1) });
    const t = tracking([
      // July: 31/31 → best month; August has two gaps; September so far is perfect but not closed.
      [walk, without(logs(range('2026-07-01', '2026-09-28')), '2026-08-10', '2026-08-20')],
      [yoga, logs(on(['2026-07-01', '2026-07-08']), on(['2026-07-15'], tiny()))],
    ]);
    const r = records(t, '2026-09-29');
    expect(r.totalCheckins).toBe(90 - 2 + 3);
    expect(r.tinyCheckins).toBe(1);
    // Runs: Jul 1–Aug 9 (40), Aug 11–19 (9), Aug 21–Sep 28 (39, current).
    expect(r.bestStreak).toEqual({ habitId: 'walk', run: { length: 40, occurrences: 40, unit: 'days', start: '2026-07-01', end: '2026-08-09' } });
    expect(r.bestMonth?.month).toBe('2026-07');
  });

  it('empty meadow', () => {
    expect(records(tracking([]), '2026-09-29')).toEqual({ totalCheckins: 0, tinyCheckins: 0, bestStreak: null, bestMonth: null });
  });
});
