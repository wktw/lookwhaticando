import { describe, expect, it } from 'vitest';
import type { DayLog } from '@/state/types';
import {
  canLogOn,
  canSetRest,
  dayEvaluations,
  evaluateDay,
  inLifetime,
  inactiveReason,
  isActiveDay,
  isInBackfillWindow,
  lifetimeEnd,
  logStatus,
  offDaysRemaining,
  offDaysUsedInMonth,
  restStanding,
  showedUp,
  type LogStatus,
} from '@/domain/activity';
import { DAILY, REST, ctx, done, habit, logs, on, onDays, partial, rule, tiny, weekly } from './helpers';

describe('lifetime', () => {
  const h = habit({ startedOn: '2026-09-10', archivedOn: '2026-09-20' });
  it('is inclusive of startedOn and archivedOn', () => {
    expect([inLifetime(h, '2026-09-09'), inLifetime(h, '2026-09-10'), inLifetime(h, '2026-09-20'), inLifetime(h, '2026-09-21')]).toEqual([false, true, true, false]);
    expect(lifetimeEnd(h, '2026-09-30')).toBe('2026-09-20');
    expect(lifetimeEnd(h, '2026-09-15')).toBe('2026-09-15');
    expect(lifetimeEnd(h, '2026-09-01')).toBeNull();
  });
});

describe('inactive reasons (precedence: lifetime → pause → off → allowed rest)', () => {
  const h = habit({ startedOn: '2026-09-10', archivedOn: '2026-10-20', pauses: [{ start: '2026-09-20', end: '2026-09-22' }] });
  const l = logs(on(['2026-09-21', '2026-09-24', '2026-09-25'], REST));
  const c = ctx('2026-09-30', { offDays: ['2026-09-22', '2026-09-24'] });
  it.each([
    ['2026-09-09', 'before-start'],
    ['2026-10-21', 'archived'],
    ['2026-09-21', 'paused'], // rest on a paused day: paused wins
    ['2026-09-22', 'paused'], // off day inside a pause
    ['2026-09-24', 'off'], // rest on an off day
    ['2026-09-25', 'rest'],
    ['2026-09-26', null],
  ])('%s → %s', (date, reason) => {
    expect(inactiveReason(h, l, date, c)).toBe(reason);
    expect(isActiveDay(h, l, date, c)).toBe(reason === null);
  });
});

describe('rest allowance (DESIGN §13.2)', () => {
  it('daily: 2 per week, in date order; the third is over', () => {
    const h = habit({ startedOn: '2026-09-01' });
    const l = logs(on(['2026-09-28', '2026-09-29', '2026-09-30'], REST));
    const c = ctx('2026-10-02');
    expect(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'].map((d) => restStanding(h, l, d, c))).toEqual(['allowed', 'allowed', 'over', null]);
    expect(isActiveDay(h, l, '2026-09-30', c)).toBe(true); // over-allowance rest stays active
  });

  it('is evaluated per calendar week of the rest, for either week start', () => {
    const h = habit({ startedOn: '2026-09-01' });
    const l = logs(on(['2026-09-27', '2026-09-28', '2026-09-29'], REST)); // Sun, Mon, Tue
    const days = ['2026-09-27', '2026-09-28', '2026-09-29'];
    expect(days.map((d) => restStanding(h, l, d, ctx('2026-10-01', { weekStart: 1 })))).toEqual(['allowed', 'allowed', 'allowed']);
    expect(days.map((d) => restStanding(h, l, d, ctx('2026-10-01', { weekStart: 0 })))).toEqual(['allowed', 'allowed', 'over']);
  });

  it('Mon/Wed/Fri: 1 per week; rests on unscheduled, paused or off days do not use it', () => {
    const h = habit({ startedOn: '2026-09-01', schedule: onDays(1, 3, 5), pauses: [{ start: '2026-09-21', end: '2026-09-21' }] });
    const l = logs(on(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-25', '2026-09-28', '2026-09-30'], REST));
    const c = ctx('2026-10-02', { offDays: ['2026-09-28'] });
    // week of Sep 21: Mon paused, Tue unscheduled → Wed is the first counted rest, Fri is over.
    expect(restStanding(h, l, '2026-09-21', c)).toBeNull();
    expect(restStanding(h, l, '2026-09-22', c)).toBeNull();
    expect(restStanding(h, l, '2026-09-23', c)).toBe('allowed');
    expect(restStanding(h, l, '2026-09-25', c)).toBe('over');
    // week of Sep 28: Mon is an off day → Wed is allowed.
    expect(restStanding(h, l, '2026-09-28', c)).toBeNull();
    expect(restStanding(h, l, '2026-09-30', c)).toBe('allowed');
  });

  it('uses the rule in effect on each rest day', () => {
    // Mon/Wed/Fri (allowance 1) until Tue Sep 29, daily (allowance 2) from Wed Sep 30.
    const h = habit({ startedOn: '2026-09-01', rules: [rule('2026-09-01', onDays(1, 3, 5)), rule('2026-09-30', DAILY)] });
    const l = logs(on(['2026-09-28', '2026-10-01', '2026-10-02'], REST));
    const c = ctx('2026-10-04');
    expect(['2026-09-28', '2026-10-01', '2026-10-02'].map((d) => restStanding(h, l, d, c))).toEqual(['allowed', 'allowed', 'over']);
  });

  it('flexible habits have no rest days', () => {
    const h = habit({ startedOn: '2026-09-01', schedule: weekly(3) });
    expect(restStanding(h, logs(on(['2026-09-28'], REST)), '2026-09-28', ctx('2026-09-30'))).toBeNull();
  });
});

describe('logStatus', () => {
  const count8 = { schedule: DAILY, target: 8, tiny: { label: '4 glasses', count: 4 } };
  it.each<[string, DayLog | undefined, boolean, LogStatus]>([
    ['nothing', undefined, true, 'none'],
    ['rest', REST, true, 'rest'],
    ['zero count', partial(0), true, 'none'],
    ['partial today', partial(5), false, 'partial'],
    ['tiny reached at day end', partial(5), true, 'tiny'],
    ['below tiny at day end', partial(3), true, 'partial'],
    ['target reached', done(8), false, 'done'],
    ['over target', done(10), true, 'done'],
    ['explicit tiny wins', tiny(8), false, 'tiny'],
  ])('%s', (_name, log, dayIsOver, status) => {
    expect(logStatus(log, count8, dayIsOver)).toBe(status);
  });

  it('flexible check-ins complete at 1; tiny counts as showing up', () => {
    expect(logStatus(done(1), { schedule: weekly(3), target: 1 }, false)).toBe('done');
    expect(logStatus(tiny(), { schedule: weekly(3), target: 1 }, false)).toBe('tiny');
    expect([showedUp('done'), showedUp('tiny'), showedUp('partial'), showedUp('rest'), showedUp('none')]).toEqual([true, true, false, false, false]);
  });
});

describe('evaluateDay (day-based occurrences)', () => {
  const h = habit({ startedOn: '2026-09-01', schedule: onDays(1, 2, 3, 4, 5), target: 2, pauses: [{ start: '2026-09-14', end: '2026-09-15' }] });
  const l = logs(
    on(['2026-09-07', '2026-09-15', '2026-09-17', '2026-09-29'], done(2)),
    on(['2026-09-08'], partial(1)),
    on(['2026-09-09'], tiny()),
    on(['2026-09-21', '2026-09-22'], REST), // allowance for 5 days/week is 1: Tue is over
  );
  const c = ctx('2026-09-29', { offDays: ['2026-09-17', '2026-09-18'] });
  it.each([
    ['2026-08-31', 'transparent'], // before start
    ['2026-09-06', 'transparent'], // Sunday: unscheduled
    ['2026-09-07', 'achieved'],
    ['2026-09-08', 'missed'], // partial
    ['2026-09-09', 'achieved'], // tiny
    ['2026-09-10', 'missed'],
    ['2026-09-14', 'transparent'], // paused
    ['2026-09-15', 'achieved'], // done on a paused day still counts
    ['2026-09-17', 'achieved'], // done on an off day still counts
    ['2026-09-18', 'transparent'], // off day
    ['2026-09-21', 'transparent'], // allowed rest
    ['2026-09-22', 'missed'], // over-allowance rest
    ['2026-09-28', 'missed'],
    ['2026-09-29', 'achieved'], // today, done
    ['2026-09-30', 'upcoming'],
  ])('%s → %s', (date, outcome) => {
    expect(evaluateDay(h, l, date, c).outcome).toBe(outcome);
  });

  it('today pending until done', () => {
    expect(evaluateDay(h, logs(), '2026-09-29', c).outcome).toBe('pending');
    expect(evaluateDay(h, logs(on(['2026-09-29'], REST)), '2026-09-29', c).outcome).toBe('transparent');
  });

  it('flags tiny achievements', () => {
    expect(evaluateDay(h, l, '2026-09-09', c).tiny).toBe(true);
    expect(evaluateDay(h, l, '2026-09-07', c).tiny).toBe(false);
  });

  it('dayEvaluations: lifetime- and today-bounded, day-based days only', () => {
    const mixed = habit({ startedOn: '2026-09-25', rules: [rule('2026-09-25', DAILY), rule('2026-09-28', weekly(2))], archivedOn: '2026-10-10' });
    const evs = dayEvaluations(mixed, logs(), '2026-09-01', '2026-12-31', ctx('2026-09-30'));
    expect(evs.map((e) => e.date)).toEqual(['2026-09-25', '2026-09-26', '2026-09-27']);
    expect(dayEvaluations(mixed, logs(), '2026-09-01', '2026-12-31', ctx('2026-09-20'))).toEqual([]);
  });
});

describe('logging windows (DESIGN §5.2, §13.2)', () => {
  const today = '2026-09-29';
  it.each([
    ['2026-09-22', false, true, false], // 7 days back: history only
    ['2026-09-23', true, true, true], // today − 6
    ['2026-09-29', true, true, true],
    ['2026-09-30', false, false, true], // future: rest only
    ['2026-10-13', false, false, true], // today + 14
    ['2026-10-14', false, false, false],
  ])('%s → backfill %s, log %s, rest %s', (date, backfill, log, rest) => {
    expect(isInBackfillWindow(date, today)).toBe(backfill);
    expect(canLogOn(date, today)).toBe(log);
    expect(canSetRest(date, today)).toBe(rest);
  });

  it('off days: 4 per calendar month', () => {
    const offDays = { '2026-09-01': true, '2026-09-15': true, '2026-09-28': true, '2026-10-01': true } as const;
    expect(offDaysUsedInMonth(offDays, '2026-09-29')).toBe(3);
    expect(offDaysRemaining(offDays, '2026-09-29')).toBe(1);
    expect(offDaysRemaining(offDays, '2026-10-05')).toBe(3);
    expect(offDaysRemaining({ ...offDays, '2026-09-02': true, '2026-09-03': true }, '2026-09-29')).toBe(0);
  });
});
