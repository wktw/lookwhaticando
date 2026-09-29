import { afterEach, describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  appDayKey,
  clampDayStartsAt,
  daysInMonth,
  daysInRange,
  diffDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  formatDateKey,
  fromDayNumber,
  dayNumber,
  isClockRolledBack,
  isDateKey,
  isLeapYear,
  localHour,
  monotonicDayKey,
  monthDayLabel,
  monthFromIndex,
  monthIndex,
  monthKey,
  monthLabel,
  monthYearLabel,
  parseDateKey,
  runtimeLocalTime,
  shortDateLabel,
  spanLabel,
  startOfMonth,
  startOfWeek,
  tryParseDateKey,
  weekday,
  weekdayOrder,
  weekdaysLabel,
  zonedLocalTime,
  CLOCK_ROLLBACK_TOLERANCE_MS,
} from '@/domain/dates';

const utc = (iso: string) => Date.parse(iso);

describe('parse / format / validate', () => {
  it.each([
    ['2026-09-29', true],
    ['2024-02-29', true], // leap year
    ['2000-02-29', true], // divisible by 400
    ['1900-02-29', false], // century, not leap
    ['2026-02-29', false],
    ['2026-04-31', false],
    ['2026-13-01', false],
    ['2026-00-10', false],
    ['2026-9-29', false],
    ['2026-09-29T00:00', false],
    ['0999-01-01', false],
    ['', false],
    ['abcd-ef-gh', false],
  ])('isDateKey(%s) → %s', (key, ok) => {
    expect(isDateKey(key)).toBe(ok);
    expect(tryParseDateKey(key) !== null).toBe(ok);
  });

  it('rejects non-strings', () => {
    expect(isDateKey(20260929)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });

  it('parses and formats round-trip', () => {
    expect(parseDateKey('2026-09-29')).toEqual({ year: 2026, month: 9, day: 29 });
    expect(formatDateKey(2026, 9, 5)).toBe('2026-09-05');
    expect(() => parseDateKey('2026-02-30')).toThrow(RangeError);
    expect(() => formatDateKey(2026, 2, 29)).toThrow(RangeError);
  });

  it('knows leap years and month lengths', () => {
    expect([1900, 2000, 2024, 2026, 2100].map(isLeapYear)).toEqual([false, true, true, false, false]);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInMonth(2026, m))).toEqual([31, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  });
});

describe('day arithmetic (UTC noon)', () => {
  it.each([
    ['2026-09-29', 1, '2026-09-30'],
    ['2026-09-30', 1, '2026-10-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-02-29', 1, '2024-03-01'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2026-03-07', 1, '2026-03-08'], // US spring forward
    ['2026-03-08', 1, '2026-03-09'],
    ['2026-03-28', 2, '2026-03-30'], // EU spring forward
    ['2026-10-31', 2, '2026-11-02'], // US fall back
    ['2026-10-24', 2, '2026-10-26'], // EU fall back
    ['2026-01-01', 365, '2027-01-01'],
    ['2024-01-01', 366, '2025-01-01'],
    ['2026-09-29', 0, '2026-09-29'],
  ])('addDays(%s, %i) = %s', (key, n, expected) => {
    expect(addDays(key, n)).toBe(expected);
    expect(diffDays(key, expected)).toBe(n);
  });

  it('refuses fractional offsets and invalid keys', () => {
    expect(() => addDays('2026-09-29', 0.5)).toThrow(RangeError);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
  });

  it('day numbers are consistent with the Unix epoch', () => {
    expect(dayNumber('1970-01-01')).toBe(0);
    expect(fromDayNumber(0)).toBe('1970-01-01');
    expect(fromDayNumber(dayNumber('2026-09-29'))).toBe('2026-09-29');
  });

  it('diffDays across DST and years; daysInRange is inclusive', () => {
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31);
    expect(diffDays('2026-10-01', '2026-11-30')).toBe(60);
    expect(diffDays('2026-09-03', '2026-09-01')).toBe(-2);
    expect(daysInRange('2026-09-01', '2026-09-30')).toBe(30);
    expect(daysInRange('2026-09-02', '2026-09-01')).toBe(0);
  });

  it('eachDay is inclusive and empty for reversed ranges', () => {
    expect(eachDay('2024-02-27', '2024-03-01')).toEqual(['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']);
    expect(eachDay('2026-09-02', '2026-09-01')).toEqual([]);
    expect(eachDay('2026-12-31', '2027-01-01')).toEqual(['2026-12-31', '2027-01-01']);
  });
});

describe('weeks', () => {
  it.each([
    ['2026-09-29', 2],
    ['2026-01-01', 4],
    ['2024-02-29', 4],
    ['2026-03-08', 0],
    ['2026-09-26', 6],
    ['2027-01-01', 5],
  ])('weekday(%s) = %i', (key, wd) => {
    expect(weekday(key)).toBe(wd);
  });

  it.each([
    // date, Monday-start, Sunday-start
    ['2026-09-29', '2026-09-28', '2026-09-27'], // Tuesday
    ['2026-09-28', '2026-09-28', '2026-09-27'], // Monday
    ['2026-10-04', '2026-09-28', '2026-10-04'], // Sunday: last day (Mon) vs first day (Sun)
    ['2026-10-03', '2026-09-28', '2026-09-27'], // Saturday
    ['2027-01-01', '2026-12-28', '2026-12-27'], // across the year boundary
    ['2024-03-01', '2024-02-26', '2024-02-25'], // across Feb 29
  ])('startOfWeek(%s): Mon %s · Sun %s', (key, mon, sun) => {
    expect(startOfWeek(key, 1)).toBe(mon);
    expect(startOfWeek(key, 0)).toBe(sun);
    expect(endOfWeek(key, 1)).toBe(addDays(mon, 6));
    expect(endOfWeek(key, 0)).toBe(addDays(sun, 6));
  });

  it('orders weekdays by week start', () => {
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('months', () => {
  it('month bounds, keys and indices', () => {
    expect(startOfMonth('2024-02-17')).toBe('2024-02-01');
    expect(endOfMonth('2024-02-17')).toBe('2024-02-29');
    expect(endOfMonth('2026-02-17')).toBe('2026-02-28');
    expect(endOfMonth('2026-12-05')).toBe('2026-12-31');
    expect(monthKey('2026-09-29')).toBe('2026-09');
    expect(monthKey('2026-09')).toBe('2026-09');
    expect(monthFromIndex(monthIndex('2026-12') + 1)).toBe('2027-01');
    expect(monthFromIndex(monthIndex('2026-01-15') - 1)).toBe('2025-12');
    expect(() => monthIndex('2026-13')).toThrow(RangeError);
    expect(() => monthIndex('2026-02-30')).toThrow(RangeError);
  });

  it.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2024-01-31', 1, '2024-02-29'],
    ['2026-03-31', -1, '2026-02-28'],
    ['2026-11-15', 3, '2027-02-15'],
    ['2026-09-29', -12, '2025-09-29'],
  ])('addMonths(%s, %i) = %s (clamped)', (key, n, expected) => {
    expect(addMonths(key, n)).toBe(expected);
  });
});

describe('appDayKey (DESIGN §13.2 day boundary)', () => {
  const ny = zonedLocalTime('America/New_York');
  const london = zonedLocalTime('Europe/London');

  it.each([
    // instant (UTC), dayStartsAt, expected app day — New York
    ['2026-09-29T06:59:00Z', 180, '2026-09-28'], // 2:59 am EDT → still Monday
    ['2026-09-29T07:00:00Z', 180, '2026-09-29'], // 3:00 am EDT → Tuesday
    ['2026-09-29T04:00:00Z', 0, '2026-09-29'], // midnight with no offset
    ['2026-09-29T03:59:00Z', 0, '2026-09-28'],
    ['2026-09-29T09:59:00Z', 360, '2026-09-28'], // 5:59 am, day starts 6:00
    ['2026-09-29T10:00:00Z', 360, '2026-09-29'],
    // spring forward (Mar 8: 2:00 EST → 3:00 EDT): the day still starts at 3:00 on the wall clock
    ['2026-03-08T06:59:00Z', 180, '2026-03-07'], // 1:59 EST
    ['2026-03-08T07:00:00Z', 180, '2026-03-08'], // 3:00 EDT (only 2 real hours after midnight)
    ['2026-03-08T06:59:00Z', 150, '2026-03-07'], // 2:30 does not exist that night…
    ['2026-03-08T07:00:00Z', 150, '2026-03-08'], // …so the day starts at 3:00
    // fall back (Nov 1: 2:00 EDT → 1:00 EST): 1:00–1:59 happens twice, both before 3:00
    ['2026-11-01T05:30:00Z', 180, '2026-10-31'], // 1:30 EDT
    ['2026-11-01T06:30:00Z', 180, '2026-10-31'], // 1:30 EST
    ['2026-11-01T07:59:00Z', 180, '2026-10-31'], // 2:59 EST
    ['2026-11-01T08:00:00Z', 180, '2026-11-01'], // 3:00 EST
  ])('New York %s start %i → %s', (iso, start, expected) => {
    expect(appDayKey(utc(iso), start, ny)).toBe(expected);
  });

  it.each([
    ['2026-03-29T00:59:00Z', 60, '2026-03-28'], // 0:59 GMT
    ['2026-03-29T01:00:00Z', 60, '2026-03-29'], // 2:00 BST (1:00 never happened)
    ['2026-10-25T00:30:00Z', 180, '2026-10-24'], // 1:30 BST
    ['2026-10-25T01:30:00Z', 180, '2026-10-24'], // 1:30 GMT (again)
    ['2026-10-25T03:00:00Z', 180, '2026-10-25'], // 3:00 GMT
  ])('London %s start %i → %s', (iso, start, expected) => {
    expect(appDayKey(utc(iso), start, london)).toBe(expected);
  });

  it('can regress on a repeated wall-clock hour; the monotonic helper holds today steady', () => {
    // dayStartsAt 1:30 on the NY fall-back night: 1:30 EDT starts Nov 1, then the clock repeats 1:00.
    const first = appDayKey(utc('2026-11-01T05:30:00Z'), 90, ny);
    const repeated = appDayKey(utc('2026-11-01T06:00:00Z'), 90, ny);
    expect(first).toBe('2026-11-01');
    expect(repeated).toBe('2026-10-31');
    expect(monotonicDayKey(repeated, first)).toBe('2026-11-01');
  });

  it('clamps dayStartsAt to 0–360 whole minutes', () => {
    expect(clampDayStartsAt(-5)).toBe(0);
    expect(clampDayStartsAt(500)).toBe(360);
    expect(clampDayStartsAt(179.6)).toBe(180);
    expect(clampDayStartsAt(Number.NaN)).toBe(180);
    expect(appDayKey(utc('2026-09-29T11:00:00Z'), 999, ny)).toBe('2026-09-29'); // 7:00 ≥ 6:00
  });
});

describe('runtime local time (process TZ)', () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it('matches the zoned reader across DST nights in New York and London', () => {
    for (const [tz, isos] of [
      ['America/New_York', ['2026-03-08T06:59:00Z', '2026-03-08T07:00:00Z', '2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z', '2026-11-01T08:00:00Z']],
      ['Europe/London', ['2026-03-29T00:59:00Z', '2026-03-29T01:00:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z']],
    ] as const) {
      process.env.TZ = tz;
      const zoned = zonedLocalTime(tz);
      for (const iso of isos) {
        expect(runtimeLocalTime(utc(iso))).toEqual(zoned(utc(iso)));
        expect(appDayKey(utc(iso), 180)).toBe(appDayKey(utc(iso), 180, zoned));
        expect(localHour(utc(iso))).toBe(zoned(utc(iso)).hour);
      }
    }
  });

  it('date arithmetic never depends on the host zone', () => {
    const sample = () => [
      addDays('2026-03-07', 1),
      addDays('2026-10-31', 2),
      diffDays('2026-03-01', '2026-11-30'),
      weekday('2026-03-08'),
      startOfWeek('2026-11-01', 1),
      eachDay('2026-10-24', '2026-10-27').join(','),
      addMonths('2024-01-31', 1),
    ];
    process.env.TZ = 'UTC';
    const reference = sample();
    for (const tz of ['America/New_York', 'Europe/London', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Australia/Lord_Howe', 'America/Santiago']) {
      process.env.TZ = tz;
      expect(sample(), tz).toEqual(reference);
    }
  });
});

describe('clock guard', () => {
  it('monotonicDayKey never goes backwards and handles a fresh clock', () => {
    expect(monotonicDayKey('2026-09-29', '')).toBe('2026-09-29');
    expect(monotonicDayKey('2026-09-29', undefined)).toBe('2026-09-29');
    expect(monotonicDayKey('2026-09-28', '2026-09-29')).toBe('2026-09-29');
    expect(monotonicDayKey('2026-09-30', '2026-09-29')).toBe('2026-09-30');
  });

  it('flags a device clock more than 36 h behind the latest time seen', () => {
    const max = utc('2026-09-29T12:00:00Z');
    expect(isClockRolledBack(max - CLOCK_ROLLBACK_TOLERANCE_MS, max)).toBe(false);
    expect(isClockRolledBack(max - CLOCK_ROLLBACK_TOLERANCE_MS - 1, max)).toBe(true);
    expect(isClockRolledBack(max + 1000, max)).toBe(false);
  });
});

describe('labels', () => {
  it('months, dates and spans', () => {
    expect(monthLabel('2026-09')).toBe('September');
    expect(monthLabel('2026-09-29', 'short')).toBe('Sep');
    expect(monthYearLabel('2026-09')).toBe('September 2026');
    expect(shortDateLabel('2026-09-22')).toBe('Tue, Sep 22');
    expect(monthDayLabel('2026-10-06')).toBe('Oct 6');
    expect(spanLabel('2026-09-01', '2026-09-12')).toBe('Sep 1–12');
    expect(spanLabel('2026-08-30', '2026-09-05')).toBe('Aug 30–Sep 5');
    expect(spanLabel('2025-12-29', '2026-01-04')).toBe('Dec 29, 2025–Jan 4, 2026');
    expect(spanLabel('2026-09-01', '2026-09-01')).toBe('Sep 1');
  });

  it('weekday lists follow the week start', () => {
    expect(weekdaysLabel([5, 1, 3], 1)).toBe('Mon/Wed/Fri');
    expect(weekdaysLabel([0, 6], 1)).toBe('Sat/Sun');
    expect(weekdaysLabel([0, 6], 0)).toBe('Sun/Sat');
  });
});
