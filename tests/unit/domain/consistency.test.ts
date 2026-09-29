import { describe, expect, it } from 'vitest';
import type { Habit } from '@/state/types';
import {
  aggregateTally,
  dayCompletion,
  formatHabitPhrase,
  graduationOffer,
  habitPhrase,
  habitTally,
  includesPeriod,
  isPctReady,
  monthToDateComparison,
  monthWindow,
  monthlySeries,
  percent,
  ratio,
  trackingOf,
  trailingWindow,
  weekWindow,
  type Tracking,
} from '@/domain/consistency';
import type { HabitLogs } from '@/domain/activity';
import { createInitialState } from '@/state/defaults';
import { DAILY, REST, ctx, habit, logs, monthly, on, onDays, range, rule, tiny, weekly, without } from './helpers';

function tracking(entries: [Habit, HabitLogs][], opts: { weekStart?: 0 | 1; offDays?: string[] } = {}): Tracking {
  return {
    habits: entries.map(([h]) => h),
    logs: Object.fromEntries(entries.map(([h, l]) => [h.id, l])),
    offDays: Object.fromEntries((opts.offDays ?? []).map((d) => [d, true as const])),
    weekStart: opts.weekStart ?? 1,
  };
}


describe('tally helpers', () => {
  it('ratio / percent / readiness', () => {
    expect(ratio({ achieved: 0, expected: 0, tiny: 0 })).toBeNull();
    expect(percent({ achieved: 26, expected: 30, tiny: 0 })).toBe(87);
    expect(isPctReady({ achieved: 4, expected: 9, tiny: 0 })).toBe(false);
    expect(isPctReady({ achieved: 4, expected: 10, tiny: 0 })).toBe(true);
  });

  it('trackingOf reads the AppState slice', () => {
    const s = createInitialState(0);
    expect(trackingOf(s)).toEqual({ habits: [], logs: {}, offDays: {}, weekStart: 1 });
  });
});

describe('day-based consistency', () => {
  const h = habit({ startedOn: '2026-09-01' });
  const month = without(range('2026-09-01', '2026-09-29'), '2026-09-05', '2026-09-10');

  it('today counts only once done', () => {
    // Sep 29 not logged yet, evaluated on Sep 29: pending → Sep 1–28 only.
    expect(habitTally(h, without(month, '2026-09-29'), monthWindow('2026-09'), ctx('2026-09-29'))).toEqual({ achieved: 26, expected: 28, tiny: 0 });
    // Logged on Sep 29: today counts.
    expect(habitTally(h, month, monthWindow('2026-09'), ctx('2026-09-29'))).toEqual({ achieved: 27, expected: 29, tiny: 0 });
    expect(habitTally(h, month, monthWindow('2026-09'), ctx('2026-09-30'))).toEqual({ achieved: 27, expected: 29, tiny: 0 });
    expect(habitTally(h, logs(month, on(['2026-09-30'])), monthWindow('2026-09'), ctx('2026-09-30'))).toEqual({ achieved: 28, expected: 30, tiny: 0 });
  });

  it('off days, pauses and allowed rests are transparent; over-allowance rests count', () => {
    const paused = habit({ startedOn: '2026-09-01', pauses: [{ start: '2026-09-14', end: '2026-09-16' }] });
    // Done every day except: paused Sep 14–16, off day Sep 20, rests Mon–Wed Sep 21–23 (allowance 2).
    const l = logs(
      without(range('2026-09-01', '2026-09-30'), '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'),
      on(['2026-09-21', '2026-09-22', '2026-09-23'], REST),
    );
    const c = ctx('2026-09-30', { offDays: ['2026-09-20'] });
    // 30 days − 3 paused − 1 off − 2 allowed rests = 24 expected; the third rest (Sep 23) is not done.
    expect(habitTally(paused, l, monthWindow('2026-09'), c)).toEqual({ achieved: 23, expected: 24, tiny: 0 });
  });

  it('a habit created mid-month only counts from its start', () => {
    const late = habit({ startedOn: '2026-09-21' });
    expect(habitTally(late, range('2026-09-21', '2026-09-30'), monthWindow('2026-09'), ctx('2026-09-30'))).toEqual({ achieved: 10, expected: 10, tiny: 0 });
  });

  it('tiny days count as achieved and are split out', () => {
    const l = logs(range('2026-09-01', '2026-09-10'), on(['2026-09-03', '2026-09-04'], tiny()));
    expect(habitTally(h, l, { start: '2026-09-01', end: '2026-09-10', attribution: 'calendar' }, ctx('2026-09-11'))).toEqual({ achieved: 10, expected: 10, tiny: 2 });
  });

  it('certain-days habits only expect their weekdays', () => {
    const mwf = habit({ startedOn: '2026-09-01', schedule: onDays(1, 3, 5) });
    // September 2026 has 13 Mon/Wed/Fri; all done but the first.
    const l = on(['2026-09-04', '2026-09-07', '2026-09-09', '2026-09-11', '2026-09-14', '2026-09-16', '2026-09-18', '2026-09-21', '2026-09-23', '2026-09-25', '2026-09-28', '2026-09-30']);
    expect(habitTally(mwf, l, monthWindow('2026-09'), ctx('2026-10-01'))).toEqual({ achieved: 12, expected: 13, tiny: 0 });
  });
});

describe('flexible attribution: by last day (calendar) vs incl. current (trailing)', () => {
  // Weekly 2×, Monday weeks; today Tue Sep 29, inside the week Sep 28–Oct 4.
  const h = habit({ startedOn: '2026-08-03', schedule: weekly(2) });
  const l = logs(on(['2026-08-25', '2026-08-27', '2026-09-01', '2026-09-03', '2026-09-08', '2026-09-15', '2026-09-17', '2026-09-22', '2026-09-24', '2026-09-28']));
  const c = ctx('2026-09-29');

  it('September counts the weeks ending in September, not the current week (it belongs to October)', () => {
    // Weeks ending Sep 6, 13, 20, 27: 2 + 1 + 2 + 2 achieved of 8.
    expect(habitTally(h, l, monthWindow('2026-09'), c)).toEqual({ achieved: 7, expected: 8, tiny: 0 });
    // October so far: the current week (1 check-in, still possible) → 1 of 1.
    expect(habitTally(h, l, monthWindow('2026-10'), c)).toEqual({ achieved: 1, expected: 1, tiny: 0 });
  });

  it('rolling 30 days includes the current week', () => {
    // Window Aug 31–Sep 29: weeks ending Sep 6…27 (7 of 8) + current (1 of 1).
    expect(habitTally(h, l, trailingWindow('2026-09-29', 30), c)).toEqual({ achieved: 8, expected: 9, tiny: 0 });
  });

  it('includesPeriod implements both rules', () => {
    const w = monthWindow('2026-09');
    expect(includesPeriod(w, { state: 'closed', to: '2026-09-27' }, '2026-09-29')).toBe(true);
    expect(includesPeriod(w, { state: 'current', to: '2026-10-04' }, '2026-09-29')).toBe(false);
    expect(includesPeriod({ ...w, attribution: 'trailing' }, { state: 'current', to: '2026-10-04' }, '2026-09-29')).toBe(true);
    expect(includesPeriod(w, { state: 'future', to: '2026-09-30' }, '2026-09-29')).toBe(false);
  });

  it('this week follows the week start', () => {
    expect(weekWindow('2026-09-29', 1)).toEqual({ start: '2026-09-28', end: '2026-10-04', attribution: 'calendar' });
    expect(weekWindow('2026-09-29', 0)).toEqual({ start: '2026-09-27', end: '2026-10-03', attribution: 'calendar' });
  });
});

describe('aggregate consistency', () => {
  const walk = habit({ id: 'walk', startedOn: '2026-09-01' });
  const yoga = habit({ id: 'yoga', startedOn: '2026-09-01', schedule: weekly(2), archivedOn: '2026-09-20' });
  const t = tracking([
    [walk, logs(range('2026-09-01', '2026-09-30'))],
    [yoga, logs(on(['2026-09-01', '2026-09-08', '2026-09-09']))],
  ]);

  it('sums achieved and expected across habits (archived history included)', () => {
    const a = aggregateTally(t, monthWindow('2026-09'), '2026-09-30');
    // yoga: weeks ending Sep 6 (1/2), Sep 13 (2/2), Sep 20 archived on Sun: full week → 0/2. Week Sep 21–27: inactive.
    expect(a.byHabit).toEqual({ walk: { achieved: 30, expected: 30, tiny: 0 }, yoga: { achieved: 3, expected: 6, tiny: 0 } });
    expect(a.total).toEqual({ achieved: 33, expected: 36, tiny: 0 });
    expect(aggregateTally(t, monthWindow('2026-09'), '2026-09-30', (h) => h.archivedOn === undefined).total.expected).toBe(30);
  });
});

describe('month-to-date vs the same span of last month (DESIGN §13.3)', () => {
  const h = habit({ startedOn: '2026-07-01' });
  const l = logs(without(range('2026-07-01', '2026-09-30'), '2026-08-03', '2026-08-05', '2026-09-02'));

  it('compares Sep 1–12 with Aug 1–12 evaluated as of Aug 12', () => {
    const cmp = monthToDateComparison(tracking([[h, without(l, '2026-09-13')]]), '2026-09-12');
    expect(cmp.current).toEqual({ month: '2026-09', tally: { achieved: 11, expected: 12, tiny: 0 } });
    expect(cmp.previous).toEqual({ month: '2026-08', start: '2026-08-01', asOf: '2026-08-12', tally: { achieved: 10, expected: 12, tiny: 0 } });
    expect(cmp.deltaPts).toBe(92 - 83);
  });

  it('clamps the span to a shorter previous month and hides deltas below 10 expected', () => {
    const d = habit({ startedOn: '2026-01-01' });
    const cmp = monthToDateComparison(tracking([[d, logs(range('2026-01-01', '2026-03-31'))]]), '2026-03-31');
    expect(cmp.previous.asOf).toBe('2026-02-28');
    expect(cmp.previous.tally.expected).toBe(28);
    const early = monthToDateComparison(tracking([[d, logs(range('2026-01-01', '2026-03-05'))]]), '2026-03-05');
    expect(early.current.tally.expected).toBe(5);
    expect(early.deltaPts).toBeNull();
  });
});

describe('monthly series', () => {
  it('closed months, oldest first, then the current month flagged', () => {
    const h = habit({ startedOn: '2026-08-01' });
    const l = logs(without(range('2026-08-01', '2026-09-29'), '2026-08-10', '2026-08-11'));
    const s = monthlySeries(tracking([[h, l]]), '2026-09-29', { months: 3 });
    expect(s.map((p) => [p.month, p.percent, p.ready, p.current])).toEqual([
      ['2026-06', null, false, false],
      ['2026-07', null, false, false],
      ['2026-08', 94, true, false], // 29 of 31
      ['2026-09', 100, true, true], // month to date
    ]);
    expect(monthlySeries(tracking([[h, l]]), '2026-09-29', { months: 2, includeCurrent: false }).map((p) => p.month)).toEqual(['2026-07', '2026-08']);
  });
});

describe('per-habit phrases (structured, DESIGN §13.3)', () => {
  it('daily: N of the last 30 days (fewer while young)', () => {
    const h = habit({ startedOn: '2026-08-01' });
    const l = logs(without(range('2026-08-01', '2026-09-29'), '2026-09-10', '2026-09-11'));
    const p = habitPhrase(h, l, ctx('2026-09-30'));
    // Today (Sep 30) is pending, so the window ends yesterday: Aug 31–Sep 29, Sep 10 and 11 not done.
    expect(p).toEqual({ kind: 'days', achieved: 28, expected: 30, tiny: 0, spanDays: 30 });
    expect(formatHabitPhrase(p!, 1)).toBe('28 of the last 30 days');
    // Once today counts, the window ends today (Sep 1–30).
    expect(habitPhrase(h, logs(l, on(['2026-09-30'])), ctx('2026-09-30'))).toEqual({ kind: 'days', achieved: 28, expected: 30, tiny: 0, spanDays: 30 });
    const young = habitPhrase(habit({ startedOn: '2026-09-25' }), logs(range('2026-09-25', '2026-09-30'), on(['2026-09-26'], tiny())), ctx('2026-09-30'));
    expect(young).toEqual({ kind: 'days', achieved: 6, expected: 6, tiny: 1, spanDays: 6 });
    expect(formatHabitPhrase(young!, 1)).toBe('6 of the last 6 days · 1 tiny');
  });

  it('certain days: N of your last K Mon/Wed/Fri', () => {
    const h = habit({ startedOn: '2026-08-01', schedule: onDays(5, 1, 3) });
    const p = habitPhrase(h, logs(range('2026-08-01', '2026-09-29')), ctx('2026-09-30'));
    // Today (Wed) is pending, so the window is Aug 30–Sep 29: 13 Mon/Wed/Fri, all done.
    expect(p).toEqual({ kind: 'weekdays', achieved: 13, expected: 13, tiny: 0, spanDays: 30, days: [1, 3, 5] });
    expect(formatHabitPhrase(p!, 1)).toBe('13 of your last 13 Mon/Wed/Fri');
  });

  it('weekly: the last 4 weeks that count (paused weeks skipped, current only once met)', () => {
    const h = habit({ startedOn: '2026-08-03', schedule: weekly(2), pauses: [{ start: '2026-09-14', end: '2026-09-20' }] });
    const base = logs(on(['2026-08-25', '2026-08-27', '2026-09-01', '2026-09-03', '2026-09-08', '2026-09-22', '2026-09-24', '2026-09-28']));
    expect(habitPhrase(h, base, ctx('2026-09-30'))).toEqual({ kind: 'weeks', met: 3, of: 4, span: 4, every: 1 });
    const metNow = logs(base, on(['2026-09-30']));
    expect(habitPhrase(h, metNow, ctx('2026-09-30'))).toEqual({ kind: 'weeks', met: 3, of: 4, span: 4, every: 1 });
    expect(formatHabitPhrase(habitPhrase(h, metNow, ctx('2026-09-30'))!, 1)).toBe('3 of the last 4 weeks');
  });

  it('monthly and every-n phrases', () => {
    const m = habit({ startedOn: '2026-01-01', schedule: monthly(1) });
    // Last 6 closed months Mar–Aug: Apr and May had no check-in; September (current, not met) is left out.
    const p = habitPhrase(m, logs(on(['2026-03-03', '2026-06-06', '2026-07-07', '2026-08-08'])), ctx('2026-09-30'));
    expect(p).toEqual({ kind: 'months', met: 4, of: 6, span: 6, every: 1 });
    expect(formatHabitPhrase(p!, 1)).toBe('4 of the last 6 months');
    const q = habit({ startedOn: '2026-01-01', schedule: monthly(1, 3) });
    const qp = habitPhrase(q, logs(on(['2026-02-02', '2026-05-05'])), ctx('2026-09-30'));
    expect(qp).toEqual({ kind: 'months', met: 2, of: 2, span: 6, every: 3 });
    expect(formatHabitPhrase(qp!, 1)).toBe('2 of 2 quarters so far');
  });

  it('a new rhythm looks back only to its own start', () => {
    const h = habit({ startedOn: '2026-08-01', rules: [rule('2026-08-01', DAILY), rule('2026-09-14', weekly(3))] });
    const l = logs(range('2026-08-01', '2026-09-13'), on(['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-22']));
    expect(habitPhrase(h, l, ctx('2026-09-30'))).toEqual({ kind: 'weeks', met: 1, of: 2, span: 4, every: 1 });
    expect(formatHabitPhrase({ kind: 'weeks', met: 1, of: 1, span: 4, every: 2 }, 1)).toBe('1 of 1 fortnight so far');
  });

  it('nothing before the habit starts', () => {
    expect(habitPhrase(habit({ startedOn: '2026-10-01' }), logs(), ctx('2026-09-30'))).toBeNull();
  });
});

describe('graduation offers (DESIGN §13.2)', () => {
  const T = '2026-09-30';
  const window = (log = range('2026-09-03', '2026-09-30')) => logs(log);

  it('offers "Ready to grow?" at ≥ 85% with ≤ 25% tiny', () => {
    const h = habit({ startedOn: '2026-08-01' });
    expect(graduationOffer(h, window(), ctx(T))).toBe('grow');
    const mostlyTiny = logs(range('2026-09-03', '2026-09-30'), range('2026-09-03', '2026-09-12', tiny()));
    expect(graduationOffer(h, mostlyTiny, ctx(T))).toBeNull(); // 10 of 28 tiny
    const sometimes = without(range('2026-09-03', '2026-09-30'), '2026-09-05', '2026-09-10', '2026-09-15', '2026-09-20', '2026-09-25');
    expect(graduationOffer(h, logs(sometimes), ctx(T))).toBeNull(); // 23 of 28 = 82%
  });

  it('offers "Make it tinier?" below 40%', () => {
    const h = habit({ startedOn: '2026-08-01' });
    expect(graduationOffer(h, logs(on(['2026-09-05', '2026-09-12', '2026-09-19'])), ctx(T))).toBe('tinier');
  });

  it('waits until the current rule has 28 days of history', () => {
    const young = habit({ startedOn: '2026-09-10' });
    expect(graduationOffer(young, window(), ctx(T))).toBeNull();
    const regrown = habit({ startedOn: '2026-08-01', rules: [rule('2026-08-01', DAILY), rule('2026-09-20', DAILY, { target: 2 })] });
    expect(graduationOffer(regrown, window(), ctx(T))).toBeNull();
    const weekly1 = habit({ startedOn: '2026-08-01', schedule: weekly(1) });
    expect(graduationOffer(weekly1, logs(on(['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'])), ctx(T))).toBe('grow');
    const monthly1 = habit({ startedOn: '2026-01-01', schedule: monthly(1) });
    expect(graduationOffer(monthly1, logs(), ctx(T))).toBeNull(); // too little evidence either way
  });
});

describe('day completion (calendar circles)', () => {
  it('counts due/done/pending across habits and flexible check-ins separately', () => {
    const t = tracking([
      [habit({ id: 'a', startedOn: '2026-09-01' }), logs(on(['2026-09-29']))],
      [habit({ id: 'b', startedOn: '2026-09-01', target: 8 }), logs(on(['2026-09-29'], { kind: 'log', count: 3 }))],
      [habit({ id: 'c', startedOn: '2026-09-01', schedule: onDays(1) }), logs()],
      [habit({ id: 'd', startedOn: '2026-09-01', schedule: weekly(2) }), logs(on(['2026-09-29']))],
      [habit({ id: 'e', startedOn: '2026-09-01' }), logs(on(['2026-09-29'], tiny()))],
    ]);
    expect(dayCompletion(t, '2026-09-29', '2026-09-29')).toEqual({ due: 3, done: 2, tiny: 1, pending: 1, flexibleCheckins: 1 });
    expect(dayCompletion(t, '2026-09-29', '2026-09-30')).toEqual({ due: 3, done: 2, tiny: 1, pending: 0, flexibleCheckins: 1 });
    expect(dayCompletion(t, '2026-10-01', '2026-09-30').due).toBe(0);
  });
});
