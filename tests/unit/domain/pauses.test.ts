import { describe, expect, it } from 'vitest';
import type { Pause } from '@/state/types';
import { addPause, archivedStretchPause, isPausedOn, mergePauses, pauseCovering, pauseReturnDay, resumePauses } from '@/domain/pauses';

describe('isPausedOn', () => {
  const pauses: Pause[] = [{ start: '2026-09-10', end: '2026-09-12' }, { start: '2026-10-06' }];
  it.each([
    ['2026-09-09', false],
    ['2026-09-10', true], // inclusive start
    ['2026-09-12', true], // inclusive end
    ['2026-09-13', false],
    ['2026-10-05', false], // before a future pause
    ['2026-10-06', true], // open-ended
    ['2027-06-01', true],
  ])('%s → %s', (date, paused) => {
    expect(isPausedOn(pauses, date)).toBe(paused);
  });
});

describe('mergePauses', () => {
  it.each<[string, Pause[], Pause[]]>([
    ['overlapping', [{ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-03', end: '2026-09-08' }], [{ start: '2026-09-01', end: '2026-09-08' }]],
    ['back to back', [{ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-06', end: '2026-09-08' }], [{ start: '2026-09-01', end: '2026-09-08' }]],
    ['gap kept', [{ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-07', end: '2026-09-08' }], [{ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-07', end: '2026-09-08' }]],
    ['contained', [{ start: '2026-09-01', end: '2026-09-30' }, { start: '2026-09-10', end: '2026-09-12' }], [{ start: '2026-09-01', end: '2026-09-30' }]],
    ['open absorbs later', [{ start: '2026-09-01' }, { start: '2026-09-10', end: '2026-09-12' }], [{ start: '2026-09-01' }]],
    ['later open extends', [{ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-04' }], [{ start: '2026-09-01' }]],
    ['unsorted input', [{ start: '2026-09-07', end: '2026-09-08' }, { start: '2026-09-01', end: '2026-09-02' }], [{ start: '2026-09-01', end: '2026-09-02' }, { start: '2026-09-07', end: '2026-09-08' }]],
    ['invalid dropped', [{ start: '2026-09-05', end: '2026-09-01' }], []],
  ])('%s', (_name, input, expected) => {
    const copy = JSON.parse(JSON.stringify(input)) as Pause[];
    expect(mergePauses(input)).toEqual(expected);
    expect(input).toEqual(copy); // never mutates
  });

  it('addPause merges with existing pauses', () => {
    expect(addPause([{ start: '2026-09-01', end: '2026-09-05' }], '2026-09-04', '2026-09-10')).toEqual([{ start: '2026-09-01', end: '2026-09-10' }]);
    expect(addPause([], '2026-10-06')).toEqual([{ start: '2026-10-06' }]);
    expect(pauseCovering([{ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-04', end: '2026-09-09' }], '2026-09-02')).toEqual({ start: '2026-09-01', end: '2026-09-09' });
  });
});

describe('resume & return day', () => {
  const today = '2026-09-29';
  it('ends the covering pause yesterday; a pause starting today disappears; others stay', () => {
    expect(resumePauses([{ start: '2026-09-20' }], today)).toEqual([{ start: '2026-09-20', end: '2026-09-28' }]);
    expect(resumePauses([{ start: '2026-09-20', end: '2026-10-05' }], today)).toEqual([{ start: '2026-09-20', end: '2026-09-28' }]);
    expect(resumePauses([{ start: today }], today)).toEqual([]);
    expect(resumePauses([{ start: '2026-09-01', end: '2026-09-03' }, { start: '2026-10-10', end: '2026-10-12' }], today)).toEqual([
      { start: '2026-09-01', end: '2026-09-03' },
      { start: '2026-10-10', end: '2026-10-12' },
    ]);
  });

  it('"back Oct 6" / open-ended / not paused', () => {
    expect(pauseReturnDay([{ start: '2026-09-25', end: '2026-10-05' }], today)).toBe('2026-10-06');
    expect(pauseReturnDay([{ start: '2026-09-25' }], today)).toBeNull();
    expect(pauseReturnDay([{ start: '2026-10-01' }], today)).toBeUndefined();
  });

  it('restoring from the archive pauses the archived stretch', () => {
    expect(archivedStretchPause('2026-09-10', '2026-09-29')).toEqual({ start: '2026-09-11', end: '2026-09-28' });
    expect(archivedStretchPause('2026-09-28', '2026-09-29')).toBeNull();
  });
});
