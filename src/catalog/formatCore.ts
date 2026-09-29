/**
 * The formatters the first paint needs (the view models' schedule and consistency words, the fx
 * layer's runs), with the helpers every formatter shares. format.ts re-exports all of it; screens
 * import from `@/catalog/format`, and first-paint code (src/domain, src/state, src/fx) from here,
 * so the rest of the formatters and their copy load with the screens.
 */
import type { HabitPhrase } from '@/domain/consistency';
import type { StreakUnit } from '@/domain/streaks';
import type { DateKey, Schedule, Weekday } from '@/state/types';
import { MONTH_NAMES, WEEKDAY_NAMES, parseDateKey, weekday, weekdaysLabel, type WeekStart } from '@/domain/dates';
import { fillLine } from './lineKit';
import { CONSISTENCY_LINES, RUN, SCHEDULE_LINES, STATUS_LINE } from './linesCore';

/** Picks the `one` or `other` template for a count. */
export function plural<T extends string>(n: number, forms: { readonly one: T; readonly other: T }): T {
  return n === 1 ? forms.one : forms.other;
}

/** 1,204 (numerals, with a thousands comma). */
export const num = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** "1 watering" · "12 waterings" (a COUNTS entry filled). */
export const counted = (n: number, forms: { readonly one: string; readonly other: string }): string => fillLine(plural(n, forms), { count: num(n) });

/** "Saturday, September 27". */
export function longDateLabel(date: DateKey): string {
  const { month, day } = parseDateKey(date);
  return `${WEEKDAY_NAMES[weekday(date)]}, ${MONTH_NAMES[month - 1]} ${day}`;
}

/** "Saturday". */
export const weekdayName = (date: DateKey): string => WEEKDAY_NAMES[weekday(date)]!;

/* ------------------------------------------------------------------ */
/* Runs ("in a row") and the rolling phrase                            */
/* ------------------------------------------------------------------ */

export type Polarity = 'build' | 'avoid';

/** A run of the habit ("12 days in a row"); `length` ≥ 1. */
export interface RunData {
  length: number;
  unit: StreakUnit;
  polarity: Polarity;
}

/**
 * A run in words. `card` is the status line's own daily form ("12 days"); everywhere else a run
 * says "in a row" ("12 days in a row"). An avoid habit is "held off" ("Held off 12 days").
 */
export function runText(run: RunData, form: 'card' | 'long' = 'long'): string {
  const n = run.length;
  let text: string;
  if (run.unit === 'days') text = plural(n, RUN.days[form === 'card' ? 'short' : 'long']);
  else text = plural(n, RUN[run.unit]);
  text = fillLine(text, { count: num(n) });
  return run.polarity === 'avoid' ? fillLine(STATUS_LINE.heldOff, { run: text }) : text;
}

/**
 * The rolling phrase ("26 of the last 30 days", "11 of your last 13 Mon/Wed/Fri", "3 of the last 4
 * weeks"). Null when it would say 0.
 */
export function consistencyText(p: HabitPhrase, weekStart: WeekStart): string | null {
  let text: string;
  switch (p.kind) {
    case 'days':
      // A one-day window says nothing worth a line ("1 of the last 1 day").
      if (p.achieved < 1 || p.spanDays < 2) return null;
      text = fillLine(plural(p.spanDays, CONSISTENCY_LINES.days), { count: num(p.achieved), span: num(p.spanDays) });
      break;
    case 'weekdays':
      if (p.achieved < 1 || p.expected < 1) return null;
      text = fillLine(CONSISTENCY_LINES.weekdays, { count: num(p.achieved), span: num(p.expected), days: weekdaysLabel(p.days as Weekday[], weekStart) });
      break;
    case 'weeks':
    case 'months': {
      if (p.met < 1 || p.of < 1) return null;
      const table = CONSISTENCY_LINES[p.kind] as Record<number, { full: string; soFar: { one: string; other: string } }>;
      const forms = table[p.every] ?? table[1]!;
      const tmpl = p.of === p.span ? forms.full : plural(p.of, forms.soFar);
      return fillLine(tmpl, { count: num(p.met), span: num(p.of === p.span ? p.span : p.of) });
    }
  }
  return p.tiny > 0 ? fillLine(CONSISTENCY_LINES.tiny, { phrase: text, tiny: num(p.tiny) }) : text;
}

/* ------------------------------------------------------------------ */
/* How often (the Habit Editor, Habit Detail)                          */
/* ------------------------------------------------------------------ */

/** "Every day" · "Mon/Wed/Fri" · "3 times a week" · "Once every 2 weeks" · "Twice a month" · "Once a quarter". */
export function scheduleText(schedule: Schedule, weekStart: WeekStart = 1): string {
  switch (schedule.kind) {
    case 'daily':
      return SCHEDULE_LINES.daily;
    case 'days':
      return schedule.days.length === 7 ? SCHEDULE_LINES.daily : weekdaysLabel(schedule.days, weekStart);
    case 'weekly':
    case 'monthly': {
      const t = SCHEDULE_LINES.times as Record<number | 'other', string>;
      const times = fillLine(t[schedule.times] ?? t.other, { count: num(schedule.times) });
      const table = SCHEDULE_LINES[schedule.kind] as Record<number, string>;
      const every = table[schedule.every] ?? table[1]!;
      return fillLine(SCHEDULE_LINES.flexible, { times, every });
    }
  }
}
