import { describe, expect, it } from 'vitest';
import { RUNGS, nextRung, rungTier, rungsReached, streakInfo, streakUnitOf } from '@/domain/streaks';
import { DAILY, REST, ctx, habit, logs, monthly, on, onDays, partial, range, rule, tiny, weekly, without } from './helpers';

describe('day-based streaks', () => {
  const h = habit({ startedOn: '2026-09-01' });

  it('today pending never breaks the streak; today done extends it', () => {
    const l = logs(range('2026-09-20', '2026-09-28'));
    expect(streakInfo(h, l, ctx('2026-09-29')).current).toEqual({ length: 9, occurrences: 9, unit: 'days', start: '2026-09-20', end: '2026-09-28' });
    expect(streakInfo(h, logs(l, on(['2026-09-29'])), ctx('2026-09-29')).current?.length).toBe(10);
    expect(streakInfo(h, l, ctx('2026-09-30')).current).toBeNull(); // yesterday unfinished
  });

  it('allowed rests, pauses and off days are transparent (neither extend nor break)', () => {
    const paused = habit({ startedOn: '2026-09-01', pauses: [{ start: '2026-09-25', end: '2026-09-26' }] });
    const l = logs(without(range('2026-09-20', '2026-09-28'), '2026-09-25', '2026-09-26', '2026-09-27'), on(['2026-09-22'], REST));
    const info = streakInfo(paused, l, ctx('2026-09-29', { offDays: ['2026-09-27'] }));
    // Sep 20, 21, 23, 24, 28 done; 22 rest, 25–26 paused, 27 off.
    expect(info.current).toMatchObject({ length: 5, start: '2026-09-20', end: '2026-09-28' });
  });

  it('an over-allowance rest counts as not done and ends the run', () => {
    const l = logs(range('2026-09-14', '2026-09-28'), on(['2026-09-21', '2026-09-22', '2026-09-23'], REST));
    const info = streakInfo(h, l, ctx('2026-09-29'));
    expect(info.current).toMatchObject({ length: 5, start: '2026-09-24' });
    expect(info.best).toMatchObject({ length: 7, start: '2026-09-14', end: '2026-09-20' });
  });

  it('partial days end the run; tiny days extend it', () => {
    const l = logs(range('2026-09-20', '2026-09-28'), on(['2026-09-23'], partial(0)), on(['2026-09-25'], tiny()));
    // Sep 23 is empty (count 0) → run restarts on Sep 24; Sep 25 tiny counts.
    expect(streakInfo(h, l, ctx('2026-09-29')).current).toMatchObject({ length: 5, start: '2026-09-24' });
  });

  it('certain days: unscheduled days are transparent; unit "times"', () => {
    const mwf = habit({ startedOn: '2026-09-01', schedule: onDays(1, 3, 5) });
    const l = logs(on(['2026-09-14', '2026-09-16', '2026-09-18', '2026-09-21', '2026-09-23', '2026-09-25', '2026-09-28']));
    const info = streakInfo(mwf, l, ctx('2026-09-29'));
    expect(info.unit).toBe('times');
    expect(info.current).toMatchObject({ length: 7, unit: 'times', start: '2026-09-14' });
  });

  it('continues across day-based edits (daily → Mon/Wed/Fri → new target)', () => {
    const edited = habit({
      startedOn: '2026-09-01',
      rules: [rule('2026-09-01', DAILY), rule('2026-09-21', onDays(1, 3, 5)), rule('2026-09-25', DAILY, { target: 2 })],
    });
    const l = logs(range('2026-09-17', '2026-09-20'), on(['2026-09-21', '2026-09-23']), range('2026-09-25', '2026-09-28', { kind: 'log', count: 2 }));
    const info = streakInfo(edited, l, ctx('2026-09-29'));
    expect(info.current).toMatchObject({ length: 10, unit: 'days', start: '2026-09-17', end: '2026-09-28' });
    expect(info.newRhythm).toBe(false);
  });
});

describe('rhythm changes ("New rhythm")', () => {
  it('a kind change starts a new streak and keeps the old one as best', () => {
    const h = habit({ startedOn: '2026-08-01', rules: [rule('2026-08-01', DAILY), rule('2026-09-14', weekly(2))] });
    const l = logs(range('2026-08-01', '2026-09-13'), on(['2026-09-15', '2026-09-17', '2026-09-22', '2026-09-23']));
    const info = streakInfo(h, l, ctx('2026-09-29'));
    expect(info).toMatchObject({ unit: 'weeks', newRhythm: true, rhythmStart: '2026-09-14' });
    expect(info.current).toMatchObject({ length: 2, occurrences: 4, unit: 'weeks', start: '2026-09-14', end: '2026-09-27' });
    expect(info.best).toMatchObject({ length: 44, occurrences: 44, unit: 'days', end: '2026-09-13' });
  });

  it('a fresh rhythm with nothing yet has no current streak (the card shows consistency)', () => {
    const h = habit({ startedOn: '2026-08-01', rules: [rule('2026-08-01', DAILY), rule('2026-09-28', weekly(2))] });
    const info = streakInfo(h, logs(range('2026-08-01', '2026-09-27')), ctx('2026-09-29'));
    expect(info.current).toBeNull();
    expect(info.newRhythm).toBe(true);
    expect(info.best?.length).toBe(58);
  });
});

describe('flexible streaks', () => {
  const h = habit({ startedOn: '2026-08-31', schedule: weekly(2) });
  const fourWeeks = logs(on(['2026-08-31', '2026-09-02', '2026-09-07', '2026-09-09', '2026-09-14', '2026-09-16', '2026-09-21', '2026-09-23']));

  it('the current period counts only once met', () => {
    expect(streakInfo(h, logs(fourWeeks, on(['2026-09-28'])), ctx('2026-09-30')).current).toMatchObject({ length: 4, occurrences: 8, unit: 'weeks' });
    expect(streakInfo(h, logs(fourWeeks, on(['2026-09-28', '2026-09-30'])), ctx('2026-09-30')).current).toMatchObject({ length: 5, occurrences: 10, end: '2026-10-04' });
  });

  it('an unmet closed week ends the run; a fully paused week is transparent', () => {
    const paused = habit({ startedOn: '2026-08-31', schedule: weekly(2), pauses: [{ start: '2026-09-14', end: '2026-09-20' }] });
    const l = logs(on(['2026-08-31', '2026-09-02', '2026-09-07', '2026-09-09', '2026-09-21', '2026-09-23']));
    expect(streakInfo(paused, l, ctx('2026-09-30')).current).toMatchObject({ length: 3, start: '2026-08-31' });
    const missed = logs(on(['2026-08-31', '2026-09-02', '2026-09-07', '2026-09-21', '2026-09-23']));
    expect(streakInfo(h, missed, ctx('2026-09-30')).current).toMatchObject({ length: 1, start: '2026-09-21' });
  });

  it('every 2 weeks: length in weeks, occurrences in check-ins', () => {
    const bi = habit({ startedOn: '2026-08-10', schedule: weekly(1, 2) });
    const l = logs(on(['2026-08-12', '2026-08-30', '2026-09-10']));
    expect(streakInfo(bi, l, ctx('2026-09-30')).current).toMatchObject({ length: 6, occurrences: 3, unit: 'weeks' });
  });

  it('monthly streaks count months', () => {
    const m = habit({ startedOn: '2026-05-01', schedule: monthly(2) });
    const l = logs(on(['2026-06-01', '2026-06-20', '2026-07-04', '2026-07-05', '2026-08-30', '2026-08-31', '2026-09-03']));
    expect(streakInfo(m, l, ctx('2026-09-29')).current).toMatchObject({ length: 3, occurrences: 6, unit: 'months', start: '2026-06-01', end: '2026-08-31' });
  });
});

describe('edges', () => {
  it('before the habit starts there is nothing', () => {
    const info = streakInfo(habit({ startedOn: '2026-10-01' }), logs(), ctx('2026-09-29'));
    expect(info).toMatchObject({ current: null, best: null, newRhythm: false, rhythmStart: '2026-10-01' });
  });

  it('units per schedule kind', () => {
    expect([DAILY, onDays(1), weekly(1), monthly(1)].map((s) => streakUnitOf({ schedule: s }))).toEqual(['days', 'times', 'weeks', 'months']);
  });
});

describe('rung ladder (DESIGN §13.5)', () => {
  it('matches the table', () => {
    expect(RUNGS.map((r) => [r.tier, r.coins])).toEqual([
      [3, 10],
      [7, 20],
      [14, 30],
      [21, 35],
      [30, 40],
      [45, 50],
      [60, 60],
      [90, 80],
      [120, 100],
      [180, 150],
      [365, 250],
    ]);
  });

  it.each([
    [0, null, 3],
    [2, null, 3],
    [3, 3, 7],
    [6, 3, 7],
    [7, 7, 14],
    [89, 60, 90],
    [364, 180, 365],
    [365, 365, null],
    [1000, 365, null],
  ])('occurrences %i → tier %s, next %s', (occ, tier, next) => {
    expect(rungTier(occ)?.tier ?? null).toBe(tier);
    expect(nextRung(occ)?.tier ?? null).toBe(next);
  });

  it('flexible streaks use periods × times', () => {
    // 4 met weeks of a 2×/week habit → 8 occurrences → tier 7.
    const h = habit({ startedOn: '2026-08-31', schedule: weekly(2) });
    const l = logs(on(['2026-08-31', '2026-09-02', '2026-09-07', '2026-09-09', '2026-09-14', '2026-09-16', '2026-09-21', '2026-09-23']));
    const run = streakInfo(h, l, ctx('2026-09-28')).current!;
    expect(rungTier(run.occurrences)?.tier).toBe(7);
    expect(rungsReached(run.occurrences).map((r) => r.tier)).toEqual([3, 7]);
  });
});
