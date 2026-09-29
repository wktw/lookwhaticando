import { describe, expect, it } from 'vitest';
import { withRuleEdit } from '@/domain/rules';
import { attributionMonth, evaluatePeriod, flexPeriodAt, flexPeriodsOverlapping, periodEvaluations, periodPace } from '@/domain/periods';
import { DAILY, REST, ctx, habit, logs, monthly, on, range, rule, tiny, weekly } from './helpers';

/** Evaluates the flexible period containing `date` as of `today`. */
function periodAt(h: ReturnType<typeof habit>, l: ReturnType<typeof logs>, date: string, today: string, weekStart: 0 | 1 = 1, offDays: string[] = []) {
  const c = ctx(today, { weekStart, offDays });
  const p = flexPeriodAt(h, date, weekStart);
  if (!p) throw new Error('no flexible period');
  return evaluatePeriod(h, l, p, c);
}

describe('closed periods: target / achieved / expected (DESIGN §13.3)', () => {
  const h = habit({ startedOn: '2026-08-03', schedule: weekly(3) });

  it.each([
    ['one check-in', ['2026-09-08'], { target: 3, achieved: 1, expected: 3, met: false }],
    ['exactly met', ['2026-09-07', '2026-09-09', '2026-09-13'], { target: 3, achieved: 3, expected: 3, met: true }],
    ['beyond times is capped', ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'], { target: 3, achieved: 3, expected: 3, met: true }],
    ['nothing', [], { target: 3, achieved: 0, expected: 3, met: false, skipped: false }],
  ])('%s', (_name, dates, expected) => {
    expect(periodAt(h, logs(on(dates)), '2026-09-09', '2026-09-20')).toMatchObject({ state: 'closed', ...expected });
  });

  it('created mid-week: activeFrac = 5/7 → target round(3 × 5/7) = 2', () => {
    const mid = habit({ startedOn: '2026-09-09', schedule: weekly(3) }); // Wednesday
    const e = periodAt(mid, logs(on(['2026-09-10', '2026-09-12'])), '2026-09-09', '2026-09-20');
    expect(e).toMatchObject({ key: '2026-09-07', from: '2026-09-07', to: '2026-09-13', totalDays: 7, activeDays: 5, target: 2, achieved: 2, expected: 2, met: true });
    expect(e.activeFrac).toBeCloseTo(5 / 7, 12);
  });

  it('pauses and off days shrink the goal; check-ins on them still count', () => {
    const paused = habit({ startedOn: '2026-08-03', schedule: weekly(3), pauses: [{ start: '2026-09-07', end: '2026-09-10' }] });
    const e = periodAt(paused, logs(on(['2026-09-08', '2026-09-12'])), '2026-09-09', '2026-09-20', 1, ['2026-09-11']);
    expect(e).toMatchObject({ activeDays: 2, target: 1, checkinDays: 2, achieved: 2, expected: 2 });
  });

  it('a fully paused period is skipped; target 0 with a check-in still counts', () => {
    const paused = habit({ startedOn: '2026-08-03', schedule: weekly(1), pauses: [{ start: '2026-09-07', end: '2026-09-13' }] });
    expect(periodAt(paused, logs(), '2026-09-09', '2026-09-20')).toMatchObject({ target: 0, achieved: 0, expected: 0, skipped: true, met: false });
    const late = habit({ startedOn: '2026-09-25', schedule: monthly(1) }); // 6 of 30 days → round(0.2) = 0
    expect(periodAt(late, logs(on(['2026-09-27'])), '2026-09-27', '2026-10-05')).toMatchObject({ target: 0, achieved: 1, expected: 1, skipped: false, met: true });
  });

  it('tiny: counts as showing up; the split prefers full check-ins', () => {
    const e = periodAt(h, logs(on(['2026-09-07', '2026-09-08']), on(['2026-09-09', '2026-09-10'], tiny())), '2026-09-09', '2026-09-20');
    expect(e).toMatchObject({ fullDays: 2, tinyDays: 2, checkinDays: 4, achieved: 3, tinyAchieved: 1, met: true, metOn: '2026-09-09' });
  });

  it('rest logs are not check-ins on flexible habits', () => {
    expect(periodAt(h, logs(on(['2026-09-08'], REST)), '2026-09-09', '2026-09-20')).toMatchObject({ checkinDays: 0, activeDays: 7 });
  });
});

describe('current period: only an impossible shortfall counts (DESIGN §13.3)', () => {
  const h = habit({ startedOn: '2026-08-03', schedule: weekly(3) });
  const oneOnMonday = logs(on(['2026-09-28']));

  it.each([
    // today, remaining active days (today…Sun; today only while it can still take a check-in), expected
    ['2026-09-28', 6, 1], // Monday, already checked in: today is used up
    ['2026-10-01', 4, 1], // Thursday
    ['2026-10-03', 2, 1], // Saturday: 3 − 1 − 2 = 0 shortfall → 1 of 1
    ['2026-10-04', 1, 2], // Sunday: one check-in can no longer happen → 1 of 2
  ])('3×/week, 1 done, today %s → remaining %i, expected %i', (today, remaining, expected) => {
    expect(periodAt(h, oneOnMonday, '2026-09-28', today)).toMatchObject({ state: 'current', target: 3, achieved: 1, remainingActiveDays: remaining, expected });
  });

  it('once closed, the full target counts', () => {
    expect(periodAt(h, oneOnMonday, '2026-09-28', '2026-10-05')).toMatchObject({ state: 'closed', expected: 3 });
  });

  it('checking in today helps immediately and never counts against', () => {
    // Sunday, Monday done: 1 of 2 so far (today could still take one of the 2 missing).
    expect(periodAt(h, oneOnMonday, '2026-09-28', '2026-10-04')).toMatchObject({ achieved: 1, expected: 2 });
    // Checking in raises achieved and leaves the shortfall where it was: a used-up today can't take a
    // second check-in, so the week reads 2 of 3, not a false 2 of 2 (stage-3 decision, periods.ts).
    const l = logs(on(['2026-09-28', '2026-10-04']));
    expect(periodAt(h, l, '2026-09-28', '2026-10-04')).toMatchObject({ achieved: 2, expected: 3, remainingActiveDays: 0 });
  });

  it('a day off or a pause never raises the current expectation (DESIGN §13.2 "transparent for every habit")', () => {
    const friday = '2026-10-02';
    const plain = periodAt(h, logs(), '2026-09-28', friday);
    const off = evaluatePeriod(h, logs(), flexPeriodAt(h, friday, 1)!, ctx(friday, { offDays: [friday] }));
    const paused = periodAt(habit({ startedOn: '2026-08-03', schedule: weekly(3), pauses: [{ start: friday, end: friday }] }), logs(), '2026-09-28', friday);
    expect(plain).toMatchObject({ target: 3, expected: 0 });
    // round(3 × 6/7) is still 3, but the day taken off still counts as open until the week closes.
    for (const e of [off, paused]) expect(e).toMatchObject({ activeDays: 6, target: 3, remainingActiveDays: 2, openDays: 3, expected: 0 });
  });

  it('a planned pause lowers both the goal and the remaining days', () => {
    const away = habit({ startedOn: '2026-08-03', schedule: weekly(3), pauses: [{ start: '2026-10-03', end: '2026-10-04' }] });
    expect(periodAt(away, oneOnMonday, '2026-09-28', '2026-10-01')).toMatchObject({ activeDays: 5, target: 2, remainingActiveDays: 2, expected: 1 });
    expect(periodAt(away, oneOnMonday, '2026-09-28', '2026-10-02')).toMatchObject({ remainingActiveDays: 1, expected: 1 });
    expect(periodAt(away, oneOnMonday, '2026-09-28', '2026-10-05')).toMatchObject({ state: 'closed', expected: 2 });
  });

  it('check-ins after today are ignored', () => {
    expect(periodAt(h, logs(on(['2026-09-28', '2026-10-02'])), '2026-09-28', '2026-10-01')).toMatchObject({ checkinDays: 1 });
  });
});

describe('period boundaries', () => {
  it('follow the week start', () => {
    const h = habit({ startedOn: '2026-08-02', schedule: weekly(2) });
    expect(flexPeriodAt(h, '2026-10-04', 1)).toMatchObject({ start: '2026-09-28', end: '2026-10-04' });
    expect(flexPeriodAt(h, '2026-10-04', 0)).toMatchObject({ start: '2026-10-04', end: '2026-10-10' });
  });

  it('every 2 weeks: anchored at the rule start week', () => {
    const h = habit({ startedOn: '2026-08-12', schedule: weekly(1, 2) });
    expect(flexPeriodsOverlapping(h, '2026-09-01', '2026-09-30', 1).map((p) => [p.start, p.end])).toEqual([
      ['2026-08-24', '2026-09-06'],
      ['2026-09-07', '2026-09-20'],
      ['2026-09-21', '2026-10-04'],
    ]);
    const e = periodAt(h, logs(on(['2026-09-25'])), '2026-09-25', '2026-10-05');
    expect(e).toMatchObject({ totalDays: 14, target: 1, achieved: 1, expected: 1, met: true, every: 2 });
  });

  it('quarterly: 3 calendar months from the rule start month', () => {
    const h = habit({ startedOn: '2026-02-10', schedule: monthly(1, 3) });
    const e = periodAt(h, logs(on(['2026-09-15'])), '2026-09-15', '2026-11-01');
    expect(e).toMatchObject({ start: '2026-08-01', end: '2026-10-31', totalDays: 92, target: 1, met: true, state: 'closed' });
    // The first quarter began before startedOn: Feb 10–Apr 30 is 80 of 89 days.
    expect(periodAt(h, logs(), '2026-02-20', '2026-06-01')).toMatchObject({ start: '2026-02-01', end: '2026-04-30', totalDays: 89, activeDays: 80, target: 1 });
  });

  it('a period spanning two months is attributed to the month of its last day', () => {
    const h = habit({ startedOn: '2026-08-03', schedule: weekly(3) });
    const week = flexPeriodAt(h, '2026-09-29', 1)!;
    expect([week.start, week.end, attributionMonth(week)]).toEqual(['2026-09-28', '2026-10-04', '2026-10']);
  });

  it('future periods are not evaluated', () => {
    const h = habit({ startedOn: '2026-09-01', schedule: weekly(3) });
    expect(periodEvaluations(h, logs(), '2026-09-01', '2026-12-31', ctx('2026-09-30')).map((e) => e.key).at(-1)).toBe('2026-09-28');
  });
});

describe('rule versions clip periods', () => {
  it('day-based → weekly mid-week: the first week counts from the switch', () => {
    const h = habit({ startedOn: '2026-08-01', rules: [rule('2026-08-01', DAILY), rule('2026-09-30', weekly(3))] });
    const e = periodAt(h, logs(on(['2026-09-28', '2026-09-30'])), '2026-09-30', '2026-10-05');
    // Monday's check-in belongs to the daily rule; Wed–Sun = 5 of 7 days → target 2.
    expect(e).toMatchObject({ key: '2026-09-28', from: '2026-09-30', to: '2026-10-04', activeDays: 5, target: 2, checkinDays: 1, expected: 2 });
  });

  it('weekly → day-based mid-week: the last week is cut the day before the switch and judged as it stood', () => {
    const h = habit({ startedOn: '2026-08-03', rules: [rule('2026-08-03', weekly(3)), rule('2026-09-30', DAILY)] });
    const e = periodAt(h, logs(on(['2026-09-29'])), '2026-09-29', '2026-09-30');
    // On Wednesday the week stood at 1 of 3 with 5 days to go: nothing was settled yet, so the cut
    // week is neither met nor short (the edit can't create a shortfall), and it keeps its full goal.
    expect(e).toMatchObject({ from: '2026-09-28', to: '2026-09-29', state: 'closed', cut: true, activeDays: 7, target: 3, achieved: 1, openDays: 5, expected: 1, met: false, short: false });
    expect(flexPeriodAt(h, '2026-09-30', 1)).toBeNull();
    // Had the goal already been out of reach on the day of the cut, that shortfall stays settled.
    const late = habit({ startedOn: '2026-08-03', rules: [rule('2026-08-03', weekly(3)), rule('2026-10-04', DAILY)] });
    expect(periodAt(late, logs(), '2026-09-29', '2026-10-05')).toMatchObject({ cut: true, openDays: 1, expected: 2, short: true });
  });

  it('graduating a weekly habit mid-week cuts its period tonight: it is met only by its full goal', () => {
    const h = habit({ startedOn: '2026-08-03', schedule: weekly(3) });
    const grown = withRuleEdit(h, { schedule: weekly(4), target: 1, step: 1 }, '2026-09-30', 'tomorrow', 1);
    const l = logs(on(['2026-09-28', '2026-10-02']));
    // Mon–Wed under 3×, 1 of 3 with Thu–Sun lost to the new rule: not met, not short (a cheaper
    // "scaled" goal would let any mid-period edit collect a period-goal bonus). Thu–Sun under 4×:
    // round(4 × 4/7) = 2.
    expect(periodAt(grown, l, '2026-09-29', '2026-10-05')).toMatchObject({ from: '2026-09-28', to: '2026-09-30', cut: true, target: 3, achieved: 1, met: false, short: false });
    expect(periodAt(grown, logs(on(['2026-09-28', '2026-09-29', '2026-09-30'])), '2026-09-29', '2026-10-05')).toMatchObject({ cut: true, met: true });
    expect(periodAt(grown, l, '2026-10-02', '2026-10-05')).toMatchObject({ from: '2026-10-01', to: '2026-10-04', cut: false, target: 2, achieved: 1, expected: 2 });
  });

  it('archiving mid-week shrinks the last period', () => {
    const h = habit({ startedOn: '2026-08-03', schedule: weekly(3), archivedOn: '2026-09-29' });
    expect(periodAt(h, logs(on(['2026-09-28'])), '2026-09-28', '2026-10-06')).toMatchObject({ activeDays: 2, target: 1, achieved: 1, expected: 1 });
  });
});

describe('pace ("goals on track")', () => {
  const h = habit({ startedOn: '2026-08-03', schedule: weekly(3) });
  const oneOnMonday = logs(on(['2026-09-28']));
  it.each([
    // today, onTrack, possible, needed
    ['2026-09-28', true, true, 2],
    ['2026-10-02', true, true, 2], // Fri: floor(3 × 4/7) = 1 → on pace
    ['2026-10-03', false, true, 2], // Sat: floor(3 × 5/7) = 2 → behind pace, still possible
    ['2026-10-04', false, false, 2], // Sun: two needed, one day left
  ])('3×/week with 1 done on %s', (today, onTrack, possible, needed) => {
    expect(periodPace(h, oneOnMonday, ctx(today))).toMatchObject({ onTrack, possible, needed, deadline: '2026-10-04' });
  });

  it('met goals are on track; monthly 1× stays on track until it closes; day-based has no pace', () => {
    expect(periodPace(h, logs(range('2026-09-28', '2026-09-30')), ctx('2026-09-30'))).toMatchObject({ met: true, onTrack: true, needed: 0 });
    const m = habit({ startedOn: '2026-08-01', schedule: monthly(1) });
    expect(periodPace(m, logs(), ctx('2026-09-30'))).toMatchObject({ onTrack: true, needed: 1, remainingActiveDays: 1 });
    expect(periodPace(habit({ startedOn: '2026-08-01' }), logs(), ctx('2026-09-30'))).toBeNull();
  });
});
