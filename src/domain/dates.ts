/**
 * Calendar math on DateKey strings ('YYYY-MM-DD', the user's local *app day*).
 *
 * Rule (DESIGN §11 "Dates"): every calculation runs on keys through UTC-noon arithmetic, so no
 * result can depend on the device time zone or on a DST transition. A key is converted to a
 * *day number* (whole days since 1970-01-01, computed at 12:00 UTC) and back; UTC has no DST, so
 * adding N days always moves exactly N calendar days.
 *
 * The only functions here that read local wall-clock time are `appDayKey` and `localHour`; they
 * take the local-time reader as an injectable dependency (`runtimeLocalTime` in the app, a fixed
 * zone in tests), so the rest of the domain stays deterministic.
 */
import type { DateKey, Weekday } from '@/state/types';

/** 0 = weeks start on Sunday, 1 = on Monday (Settings.weekStart). */
export type WeekStart = 0 | 1;
/** 'YYYY-MM' */
export type MonthKey = string;

export interface YMD {
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
}

export const DAY_MS = 86_400_000;
const NOON_MS = 12 * 3_600_000;
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})/;

/* ------------------------------------------------------------------ */
/* Parse, format, validate                                             */
/* ------------------------------------------------------------------ */

/** Gregorian leap year: divisible by 4, except centuries not divisible by 400. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Days in a month (month 1..12). */
export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  const n = MONTH_LENGTHS[month - 1];
  if (n === undefined) throw new RangeError(`Invalid month ${month}`);
  return n;
}

function validYmd(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1000 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

/** Parses a DateKey, or returns null when it is malformed or not a real calendar date. */
export function tryParseDateKey(key: string): YMD | null {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return validYmd(year, month, day) ? { year, month, day } : null;
}

/** Parses a DateKey; throws a RangeError for anything that is not a real 'YYYY-MM-DD' date. */
export function parseDateKey(key: DateKey): YMD {
  const ymd = tryParseDateKey(key);
  if (!ymd) throw new RangeError(`Invalid DateKey "${key}"`);
  return ymd;
}

/** True for a well-formed key naming a real calendar date (e.g. rejects '2026-02-29'). */
export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && tryParseDateKey(value) !== null;
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Formats a calendar date (month 1..12) as a DateKey; throws if it is not a real date. */
export function formatDateKey(year: number, month: number, day: number): DateKey {
  if (!validYmd(year, month, day)) throw new RangeError(`Invalid date ${year}-${month}-${day}`);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/* ------------------------------------------------------------------ */
/* Day numbers & arithmetic (UTC noon)                                 */
/* ------------------------------------------------------------------ */

function assertInt(n: number, what: string): void {
  if (!Number.isInteger(n)) throw new RangeError(`${what} must be an integer, got ${n}`);
}

/*
 * Key ↔ day-number conversions are memoised: stats walk the same few thousand dates for every
 * habit and window, and parsing/formatting dominated the profile. The caches are pure (same input,
 * same output), hold only valid keys, and are bounded.
 */
const CACHE_LIMIT = 20_000;
const dayNumberCache = new Map<DateKey, number>();
const keyCache = new Map<number, DateKey>();

function remember<K, V>(cache: Map<K, V>, k: K, v: V): V {
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(k, v);
  return v;
}

/** Whole days since 1970-01-01 (computed at 12:00 UTC, so DST can never shift it). */
export function dayNumber(key: DateKey): number {
  const hit = dayNumberCache.get(key);
  if (hit !== undefined) return hit;
  const { year, month, day } = parseDateKey(key);
  return remember(dayNumberCache, key, Math.floor(Date.UTC(year, month - 1, day, 12) / DAY_MS));
}

/** Inverse of `dayNumber`. */
export function fromDayNumber(n: number): DateKey {
  const hit = keyCache.get(n);
  if (hit !== undefined) return hit;
  assertInt(n, 'day number');
  const d = new Date(n * DAY_MS + NOON_MS);
  return remember(keyCache, n, formatDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
}

/**
 * A yearly date (birthday, came-home day, anniversary) on `year`: Feb 29 falls on Feb 28 in other
 * years. Null for a month/day that never exists.
 */
export function recurringDay(month: number, day: number, year: number): DateKey | null {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1) return null;
  const d = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return validYmd(year, month, d) ? formatDateKey(year, month, d) : null;
}

/** `key` moved by `n` calendar days (n may be negative). */
export function addDays(key: DateKey, n: number): DateKey {
  assertInt(n, 'addDays offset');
  return fromDayNumber(dayNumber(key) + n);
}

/** Calendar days from `a` to `b` (b − a): diffDays('2026-09-01', '2026-09-03') === 2. */
export function diffDays(a: DateKey, b: DateKey): number {
  return dayNumber(b) - dayNumber(a);
}

/** Number of days in the inclusive range [start, end] (0 when end < start). */
export function daysInRange(start: DateKey, end: DateKey): number {
  return Math.max(0, diffDays(start, end) + 1);
}

/** DateKeys order lexicographically; this is a typed comparator for sort(). */
export function compareDateKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const minDateKey = (a: DateKey, b: DateKey): DateKey => (a <= b ? a : b);
export const maxDateKey = (a: DateKey, b: DateKey): DateKey => (a >= b ? a : b);

/** start ≤ date ≤ end (inclusive). */
export function isWithin(date: DateKey, start: DateKey, end: DateKey): boolean {
  return date >= start && date <= end;
}

/** Every day in [start, end], inclusive; empty when end < start. */
export function eachDay(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const a = dayNumber(start);
  const b = dayNumber(end);
  for (let n = a; n <= b; n++) out.push(fromDayNumber(n));
  return out;
}

/* ------------------------------------------------------------------ */
/* Weeks                                                               */
/* ------------------------------------------------------------------ */

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: DateKey): Weekday {
  // 1970-01-01 (day 0) was a Thursday.
  return ((((dayNumber(key) + 4) % 7) + 7) % 7) as Weekday;
}

/** First day of the week containing `key`, for the user's week start. */
export function startOfWeek(key: DateKey, weekStart: WeekStart): DateKey {
  const back = (weekday(key) - weekStart + 7) % 7;
  return addDays(key, -back);
}

/** Last day of the week containing `key`. */
export function endOfWeek(key: DateKey, weekStart: WeekStart): DateKey {
  return addDays(startOfWeek(key, weekStart), 6);
}

/** The seven weekdays in display order for a week start: Mon-start → [1,2,3,4,5,6,0]. */
export function weekdayOrder(weekStart: WeekStart): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => ((i + weekStart) % 7) as Weekday);
}

/* ------------------------------------------------------------------ */
/* Months                                                              */
/* ------------------------------------------------------------------ */

/** 'YYYY-MM' of a DateKey (or of a MonthKey, which passes through). */
export function monthKey(key: DateKey | MonthKey): MonthKey {
  return monthFromIndex(monthIndex(key));
}

/** Months since year 0 (year × 12 + month − 1); accepts 'YYYY-MM' or 'YYYY-MM-DD'. */
export function monthIndex(key: DateKey | MonthKey): number {
  const m = MONTH_RE.exec(key);
  const year = Number(m?.[1]);
  const month = Number(m?.[2]);
  if (!m || !validYmd(year, month, 1) || (key.length !== 7 && !isDateKey(key))) {
    throw new RangeError(`Invalid month or date key "${key}"`);
  }
  return year * 12 + month - 1;
}

/** Inverse of `monthIndex`. */
export function monthFromIndex(index: number): MonthKey {
  assertInt(index, 'month index');
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return `${year}-${pad2(month)}`;
}

/** First day of the month with this index. */
export function firstDayOfMonthIndex(index: number): DateKey {
  return `${monthFromIndex(index)}-01`;
}

/** Last day of the month with this index. */
export function lastDayOfMonthIndex(index: number): DateKey {
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return formatDateKey(year, month, daysInMonth(year, month));
}

export function startOfMonth(key: DateKey): DateKey {
  return firstDayOfMonthIndex(monthIndex(key));
}

export function endOfMonth(key: DateKey): DateKey {
  return lastDayOfMonthIndex(monthIndex(key));
}

/** `key` moved by `n` months, clamping the day to the target month's length (Jan 31 + 1 → Feb 28/29). */
export function addMonths(key: DateKey, n: number): DateKey {
  assertInt(n, 'addMonths offset');
  const { day } = parseDateKey(key);
  const idx = monthIndex(key) + n;
  const year = Math.floor(idx / 12);
  const month = idx - year * 12 + 1;
  return formatDateKey(year, month, Math.min(day, daysInMonth(year, month)));
}

/* ------------------------------------------------------------------ */
/* App day & clock guard (DESIGN v1 §13.2 "Day boundary")                 */
/* ------------------------------------------------------------------ */

/** A wall-clock reading in some time zone. */
export interface LocalTimeParts {
  year: number;
  /** 1..12 */
  month: number;
  day: number;
  /** 0..23 */
  hour: number;
  minute: number;
}

/** Reads the local wall clock for an instant. Injected so the domain never depends on the host zone. */
export type LocalTimeReader = (epochMs: number) => LocalTimeParts;

/** The device's own local time zone (what the app uses in production). */
export const runtimeLocalTime: LocalTimeReader = (epochMs) => {
  const d = new Date(epochMs);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
};

/** A reader for a named IANA zone (tests, diagnostics). Independent of the host zone. */
export function zonedLocalTime(timeZone: string): LocalTimeReader {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  return (epochMs) => {
    const parts: Record<string, number> = {};
    for (const p of fmt.formatToParts(epochMs)) if (p.type !== 'literal') parts[p.type] = Number(p.value);
    return { year: parts.year!, month: parts.month!, day: parts.day!, hour: parts.hour! % 24, minute: parts.minute! };
  };
}

/** A reader's offset from UTC at an instant, in minutes (+345 in Kathmandu, −150 in St John's in summer). */
export function utcOffsetMinutes(local: LocalTimeReader, epochMs: number): number {
  const t = local(epochMs);
  return Math.round((Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute) - epochMs) / 60_000);
}

/** Mid-January and mid-July, noon UTC: a zone's winter and summer offsets both show. */
const ZONE_PROBES = [Date.UTC(2026, 0, 15, 12), Date.UTC(2026, 6, 15, 12)] as const;

/**
 * Which zone a reader reads in, as a memo key (audit P-history-04): the IANA name when known, and
 * the reader's offsets at two fixed instants. The device's reader is one function wherever the
 * device is, so a memo keyed by the reader alone would keep a reading made before a move; the
 * offsets tell zones apart even when the name is unknown.
 */
export function zoneKey(local: LocalTimeReader, timeZone?: string): string {
  return `${timeZone ?? ''}@${utcOffsetMinutes(local, ZONE_PROBES[0])}/${utcOffsetMinutes(local, ZONE_PROBES[1])}`;
}

export const DAY_STARTS_AT_MIN = 0;
export const DAY_STARTS_AT_MAX = 360;

/** Clamps Settings.dayStartsAt to its valid range (0–360 minutes, whole minutes). */
export function clampDayStartsAt(minutes: number): number {
  if (!Number.isFinite(minutes)) return 180;
  return Math.min(DAY_STARTS_AT_MAX, Math.max(DAY_STARTS_AT_MIN, Math.round(minutes)));
}

/**
 * The *app day* for an instant (DESIGN v1 §13.2): the local calendar date, minus one day while the
 * local wall clock is still before `dayStartsAt` (minutes after midnight). So with the default
 * 180, 2:59 am on Tuesday still logs to Monday and 3:00 am starts Tuesday.
 *
 * This is "local date of (now − dayStartsAt)" measured on the wall clock rather than on the
 * elapsed-time axis: on a DST night the boundary stays at 3:00 am as displayed, instead of
 * drifting to 2:00 or 4:00. Wall clocks can repeat an hour (fall back), so callers keep the
 * result monotonic with `monotonicDayKey`.
 */
export function appDayKey(epochMs: number, dayStartsAt: number, local: LocalTimeReader = runtimeLocalTime): DateKey {
  const t = local(epochMs);
  const key = formatDateKey(t.year, t.month, t.day);
  return t.hour * 60 + t.minute < clampDayStartsAt(dayStartsAt) ? addDays(key, -1) : key;
}

/** `today` never moves backwards (DESIGN v1 §13.2): the later of the candidate and clock.maxDateKey. */
export function monotonicDayKey(candidate: DateKey, maxDateKey: DateKey | '' | undefined): DateKey {
  return maxDateKey && maxDateKey > candidate ? maxDateKey : candidate;
}

/** How far the device clock may lag the latest time ever seen before rewards pause. */
export const CLOCK_ROLLBACK_TOLERANCE_MS = 36 * 3_600_000;

/**
 * True when the device clock is more than 36 h behind `clock.maxEpochMs` (DESIGN v1 §13.2): the app
 * shows a calm banner and pays no rewards until the clock catches up.
 */
export function isClockRolledBack(epochMs: number, maxEpochMs: number): boolean {
  return maxEpochMs - epochMs > CLOCK_ROLLBACK_TOLERANCE_MS;
}

/** Local wall-clock hour (0–23) of an instant, for time-of-day insights and early-bird badges. */
export function localHour(epochMs: number, local: LocalTimeReader = runtimeLocalTime): number {
  return local(epochMs).hour;
}

/* ------------------------------------------------------------------ */
/* Labels (English, deterministic; no Intl so tests are stable)        */
/* ------------------------------------------------------------------ */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** 'September' / 'Sep' for a MonthKey or DateKey. */
export function monthLabel(key: DateKey | MonthKey, style: 'long' | 'short' = 'long'): string {
  const i = monthIndex(key) % 12;
  return (style === 'long' ? MONTH_NAMES : MONTH_SHORT)[i]!;
}

/** 'September 2026' */
export function monthYearLabel(key: DateKey | MonthKey, style: 'long' | 'short' = 'long'): string {
  return `${monthLabel(key, style)} ${Math.floor(monthIndex(key) / 12)}`;
}

/** 'Tue, Sep 22' */
export function shortDateLabel(key: DateKey): string {
  const { month, day } = parseDateKey(key);
  return `${WEEKDAY_SHORT[weekday(key)]}, ${MONTH_SHORT[month - 1]} ${day}`;
}

/** 'Sep 22' */
export function monthDayLabel(key: DateKey): string {
  const { month, day } = parseDateKey(key);
  return `${MONTH_SHORT[month - 1]} ${day}`;
}

/** A compact range: 'Sep 1–12', 'Aug 30–Sep 5', 'Dec 29, 2025–Jan 4, 2026' (en dash). */
export function spanLabel(start: DateKey, end: DateKey): string {
  const a = parseDateKey(start);
  const b = parseDateKey(end);
  if (start === end) return monthDayLabel(start);
  if (a.year !== b.year) return `${monthDayLabel(start)}, ${a.year}–${monthDayLabel(end)}, ${b.year}`;
  if (a.month === b.month) return `${MONTH_SHORT[a.month - 1]} ${a.day}–${b.day}`;
  return `${monthDayLabel(start)}–${monthDayLabel(end)}`;
}

/** 'Mon/Wed/Fri', ordered for the user's week start. */
export function weekdaysLabel(days: readonly Weekday[], weekStart: WeekStart): string {
  const set = new Set(days);
  return weekdayOrder(weekStart)
    .filter((d) => set.has(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join('/');
}
