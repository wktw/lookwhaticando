/**
 * The small formatters that turn the view models' structured data into the words of the copy deck
 * (docs/VOICE.md). The view models (src/state/views) return kinds and numbers only; the screens
 * and the fx layer call these, so a line is worded in one place. Every template is in lines.ts.
 *
 * The rules they keep (VOICE.md §1–§3): numerals, never a 0 or a count of what's undone (a line
 * that would say one returns null, and the screen shows nothing), no deadline, "in a row" for a
 * run, "held off" for an avoid habit, "watered" for done.
 */
import type { HabitPhrase } from '@/domain/consistency';
import type { StreakUnit } from '@/domain/streaks';
import type { DateKey, TimeOfDay, Weekday } from '@/state/types';
import type { PlaceId } from './types';
import { MONTH_NAMES, MONTH_SHORT, WEEKDAY_NAMES, monthDayLabel, monthIndex, parseDateKey, shortDateLabel, weekday, weekdaysLabel, type WeekStart } from '@/domain/dates';
import {
  CONSISTENCY_LINES,
  COUNTS,
  MEMORIES,
  PERIOD_WORDS,
  PLACE_LINES,
  PROGRESS_LINES,
  RUN,
  STAGE_FORECAST,
  STAGE_NAMES,
  STATUS_LINE,
  TODAY_LINES,
  fillLine,
} from './lines';
import { PLACE_BY_ID } from './places';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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
      if (p.achieved < 1 || p.spanDays < 1) return null;
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
/* The card status line (DESIGN §9.1.1, VOICE.md §5)                   */
/* ------------------------------------------------------------------ */

/** A flexible rule's period: weekly every 1–4 weeks, monthly every 1/2/3/6/12 months. */
export interface PeriodRef {
  kind: 'weekly' | 'monthly';
  every: number;
}

/** "week" · "fortnight" · "month" · "quarter"… */
export function periodWord(p: PeriodRef): string {
  const table = PERIOD_WORDS[p.kind] as Record<number, string>;
  return table[p.every] ?? (p.kind === 'weekly' ? 'week' : 'month');
}

/**
 * The card's status line as data (first match wins). `none`: nothing true to say yet, so the card
 * shows no line (never a 0).
 */
export type StatusLine =
  | { kind: 'rested' }
  | { kind: 'count'; count: number; target: number; unit: string | null }
  | { kind: 'tiny' }
  /** A flexible period with at least one watering ("2 of 3 this week"; never "0 of 3"). */
  | { kind: 'period'; count: number; target: number; period: PeriodRef; current: boolean }
  | { kind: 'period-done'; period: PeriodRef }
  /** 3 or more in a row. */
  | ({ kind: 'streak' } & RunData)
  | { kind: 'consistency'; phrase: HabitPhrase }
  /** Waterings still needed to pot up ("Rooting · 2 more to pot up"). */
  | { kind: 'rooting'; count: number }
  | { kind: 'new' }
  | { kind: 'none' };

export type StatusKind = StatusLine['kind'];

/** The status line in words (VOICE.md §5), or null for `none`. */
export function statusLine(line: StatusLine, weekStart: WeekStart = 1): string | null {
  switch (line.kind) {
    case 'rested':
      return STATUS_LINE.rested;
    case 'count':
      return fillLine(line.unit ? STATUS_LINE.count : STATUS_LINE.countBare, { count: num(line.count), target: num(line.target), unit: line.unit ?? '' });
    case 'tiny':
      return STATUS_LINE.tiny;
    case 'period':
      if (line.count < 1) return null;
      return fillLine(line.current ? STATUS_LINE.period : STATUS_LINE.periodThen, { count: num(Math.min(line.count, line.target)), target: num(line.target), period: periodWord(line.period) });
    case 'period-done':
      return fillLine(STATUS_LINE.periodDone, { period: periodWord(line.period) });
    case 'streak':
      return runText(line, 'card');
    case 'consistency':
      return consistencyText(line.phrase, weekStart);
    case 'rooting':
      return line.count > 0 ? fillLine(STATUS_LINE.rooting, { count: num(line.count) }) : null;
    case 'new':
      return STATUS_LINE.new;
    case 'none':
      return null;
  }
}

/**
 * A card's screen-reader name: "Drink water, 5 of 8 glasses" for a count habit with a watering, else
 * the name (the pressed state says the rest; never "0 of 8").
 */
export function cardAriaLabel(card: { name: string; count: number; target: number; unit: string | null; flexible: boolean }): string {
  if (card.flexible || card.target <= 1 || card.count < 1) return card.name;
  return fillLine(card.unit ? TODAY_LINES.cardAria : TODAY_LINES.cardAriaBare, { habit: card.name, count: num(card.count), target: num(card.target), unit: card.unit ?? '' });
}

/* ------------------------------------------------------------------ */
/* Plants                                                              */
/* ------------------------------------------------------------------ */

/**
 * Habit Detail's forecast (VOICE.md §7): "4 more waterings to Blooming." · at Evergreen "Evergreen.
 * Small visitors arrive from here on." Never a date.
 */
export function forecastLine(plant: { displayStage: number; checkinsToNext: number | null; nextName: string | null }): string | null {
  if (plant.displayStage >= STAGE_NAMES.length - 1) return STAGE_FORECAST.evergreen;
  if (plant.checkinsToNext === null || !plant.nextName) return null;
  const n = Math.max(1, plant.checkinsToNext);
  return fillLine(n === 1 ? STAGE_FORECAST.one : STAGE_FORECAST.other, { count: num(n), stage: plant.nextName });
}

/* ------------------------------------------------------------------ */
/* Today                                                               */
/* ------------------------------------------------------------------ */

export const blockLabel = (id: TimeOfDay): string => TODAY_LINES.blocks[id];

/** A folded block: "Morning 3/3" (just "Morning" before anything in it is watered: never "0/3"). */
export function blockSummary(block: { id: TimeOfDay; done: number; total: number }): string {
  if (block.done < 1) return blockLabel(block.id);
  return fillLine(TODAY_LINES.blockSummary, { block: blockLabel(block.id), done: num(block.done), total: num(block.total) });
}

/**
 * The vine chip on the sill ledge: "3 of 5 · +18 coins", "3 of 5" before any coins (or with Quiet
 * rewards), "2 watered" with only flexible habits watered, and null with nothing watered yet or
 * nothing on (never "0 of 5").
 */
export function vineChip(p: { done: number; total: number; flexibleCheckins: number }, coins = 0): string | null {
  if (p.total > 0 && p.done > 0) {
    if (coins > 0) return fillLine(plural(coins, TODAY_LINES.vineCoins), { done: num(p.done), total: num(p.total), coins: num(coins) });
    return fillLine(TODAY_LINES.vine, { done: num(p.done), total: num(p.total) });
  }
  return p.flexibleCheckins > 0 ? fillLine(TODAY_LINES.vineFlexible, { count: num(p.flexibleCheckins) }) : null;
}

/**
 * The day's progressbar value text: "3 of 5 watered". Null before the first watering or with nothing
 * on (never "0 of 5"): the screen then gives the bar no value text.
 */
export function dayProgressAria(p: { done: number; total: number }): string | null {
  return p.total > 0 && p.done > 0 ? fillLine(TODAY_LINES.dayAria, { done: num(p.done), total: num(p.total) }) : null;
}

/** A week-strip day for screen readers: "Saturday, September 27, 3 of 5 watered", or just the date (nothing on, or nothing watered). */
export function weekDayAria(day: { date: DateKey; done: number; due: number }): string {
  const date = longDateLabel(day.date);
  return day.due > 0 && day.done > 0 ? fillLine(TODAY_LINES.weekDayAria, { date, done: num(day.done), total: num(day.due) }) : date;
}

/** "Resting: 2 habits · back Oct 6" (the date only when every paused habit has one). */
export function restingRow(p: { count: number; back: DateKey | null }): string {
  const resting = fillLine(plural(p.count, TODAY_LINES.resting), { count: num(p.count) });
  return p.back ? fillLine(TODAY_LINES.restingBack, { resting, date: monthDayLabel(p.back) }) : resting;
}

/** The sticky banner for a selected past day: "Logging for Sat, Sep 27". */
export const backdatingBanner = (date: DateKey): string => fillLine(TODAY_LINES.backdating, { date: shortDateLabel(date) });

/** A button's name while a past day is selected: "Walk for Saturday". */
export const forDayLabel = (habit: string, date: DateKey): string => fillLine(TODAY_LINES.forDay, { habit, weekday: weekdayName(date) });

/* ------------------------------------------------------------------ */
/* Progress (VOICE.md §6)                                              */
/* ------------------------------------------------------------------ */

/** "You showed up 26 of the last 30 days" (null before the first day showing up). */
export function showedUpLine(p: { days: number; span: number }): string | null {
  return p.days > 0 && p.span > 0 ? fillLine(PROGRESS_LINES.showedUp, { days: num(p.days), span: num(p.span) }) : null;
}

/** "September so far: 22 of 29 days". */
export function monthSoFarLine(p: { month: string; days: number; span: number }): string | null {
  return p.days > 0 && p.span > 0 ? fillLine(PROGRESS_LINES.monthSoFar, { Month: MONTH_NAMES[monthIndex(p.month) % 12]!, days: num(p.days), span: num(p.span) }) : null;
}

/** Below 10 expected, no percentage: "4 of 4 so far". */
export function soFarLine(t: { achieved: number; expected: number }): string | null {
  return t.achieved > 0 && t.expected > 0 ? fillLine(PROGRESS_LINES.soFar, { count: num(t.achieved), span: num(t.expected) }) : null;
}

/** "6 of 7 this week". */
export function weekLine(t: { achieved: number; expected: number }): string | null {
  return t.achieved > 0 && t.expected > 0 ? fillLine(PROGRESS_LINES.week, { count: num(t.achieved), span: num(t.expected) }) : null;
}

/** A month's best fact, shown when the month is quieter than the same days last month. */
export interface BestFact {
  month: string;
  /** The month is still going ("so far"). */
  current: boolean;
  waterings: number;
  /** The steadiest habit's name, if one stood out. */
  steadiest: string | null;
}

/** "62 waterings so far in September. Walk is the steadiest." (null for a month with none). */
export function bestFactLine(f: BestFact): string | null {
  if (f.waterings < 1) return null;
  const Month = MONTH_NAMES[monthIndex(f.month) % 12]!;
  const head = fillLine(plural(f.waterings, PROGRESS_LINES.fact[f.current ? 'current' : 'closed']), { count: num(f.waterings), Month });
  return f.steadiest ? `${head} ${fillLine(PROGRESS_LINES.steadiest[f.current ? 'current' : 'closed'], { habit: f.steadiest })}` : head;
}

/** Month-to-date against the same days last month: only up or level is said; lower shows the best fact. */
export type TrendData = { kind: 'up' | 'level' | 'none' } | { kind: 'fact'; fact: BestFact };

export function trendLine(t: TrendData): string | null {
  switch (t.kind) {
    case 'up':
      return PROGRESS_LINES.up;
    case 'level':
      return PROGRESS_LINES.level;
    case 'fact':
      return bestFactLine(t.fact);
    case 'none':
      return null;
  }
}

/** "3 goals on track" (null when none are). */
export function goalsLine(g: { onTrack: number }): string | null {
  return g.onTrack > 0 ? fillLine(plural(g.onTrack, PROGRESS_LINES.goals), { count: num(g.onTrack) }) : null;
}

/** "2 rests · 1 day off" (null with neither). */
export function restsLine(r: { rests: number; offDays: number }): string | null {
  const bits = [
    r.rests > 0 ? fillLine(plural(r.rests, PROGRESS_LINES.rests), { count: num(r.rests) }) : null,
    r.offDays > 0 ? fillLine(plural(r.offDays, PROGRESS_LINES.offDays), { count: num(r.offDays) }) : null,
  ].filter((b): b is string => b !== null);
  return bits.length > 0 ? bits.join(' · ') : null;
}

/** A recent month's bar label: "Aug · 24 days" (just "Aug" for a month with none). */
export function monthBarLabel(m: { month: string; days: number }): string {
  const Mon = MONTH_SHORT[monthIndex(m.month) % 12]!;
  return m.days > 0 ? fillLine(plural(m.days, PROGRESS_LINES.monthBar), { Mon, days: num(m.days) }) : Mon;
}

/** The year strip's summary: "312 waterings in 2025, across 180 days" (null for a year with none). */
export function yearSummaryLine(y: { year: number; checkins: number; daysShowedUp: number }): string | null {
  if (y.checkins < 1) return null;
  return fillLine(PROGRESS_LINES.year, { waterings: counted(y.checkins, COUNTS.waterings), year: String(y.year), days: counted(Math.max(1, y.daysShowedUp), COUNTS.days) });
}

/** The Records rows, leaving out any that would say 0. */
export function recordLines(r: {
  totalCheckins: number;
  tinyCheckins: number;
  bestStreak: ({ name: string } & RunData) | null;
  bestMonth: { month: string } | null;
  perfectDays: number;
  showUpDays: number;
}): string[] {
  const R = PROGRESS_LINES.records;
  const out: string[] = [];
  if (r.totalCheckins > 0) out.push(fillLine(R.waterings, { count: num(r.totalCheckins) }));
  if (r.tinyCheckins > 0) out.push(fillLine(R.tiny, { count: num(r.tinyCheckins) }));
  if (r.bestStreak && r.bestStreak.length > 0) out.push(fillLine(R.longest, { habit: r.bestStreak.name, run: runText(r.bestStreak, 'long') }));
  if (r.bestMonth) out.push(fillLine(R.bestMonth, { Month: MONTH_NAMES[monthIndex(r.bestMonth.month) % 12]! }));
  if (r.perfectDays > 0) out.push(fillLine(plural(r.perfectDays, R.perfectDays), { count: num(r.perfectDays) }));
  if (r.showUpDays > 0) out.push(fillLine(R.showUpDays, { count: num(r.showUpDays) }));
  return out;
}

/** The Insights rows. */
export function insightLines(i: {
  strongestWeekday: { weekday: number } | null;
  mostConsistent: { name: string } | null;
  busiestTime: { block: 'morning' | 'midday' | 'evening' | 'night' } | null;
}): string[] {
  const I = PROGRESS_LINES.insights;
  const out: string[] = [];
  if (i.strongestWeekday) out.push(fillLine(I.weekday, { weekday: WEEKDAY_NAMES[i.strongestWeekday.weekday]! }));
  if (i.mostConsistent && i.mostConsistent.name) out.push(fillLine(I.habit, { habit: i.mostConsistent.name }));
  if (i.busiestTime) out.push(I.time[i.busiestTime.block]);
  return out;
}

/* ------------------------------------------------------------------ */
/* Pets and places                                                     */
/* ------------------------------------------------------------------ */

/** A place with its article, for a sentence: "the Saucer Pond", "the Sill", "the Quilt". */
export function placePhrase(place: PlaceId): string {
  const name = PLACE_BY_ID.get(place)?.name ?? place;
  return name.startsWith('The ') ? `the ${name.slice(4)}` : `the ${name}`;
}

/** "{name} moved to the Saucer Pond." / "{name} moved back to the Sill." */
export function movedToPlaceLine(name: string, place: PlaceId): string {
  return place === 'sill' ? fillLine(PLACE_LINES.movedHome, { name }) : fillLine(PLACE_LINES.moved, { name, place: placePhrase(place) });
}

/** A dated Memory on the Pet Card (the kinds of `PetMemory`). */
export interface MemoryData {
  kind: keyof typeof MEMORIES;
  date: DateKey;
  /** 'bloomed': the habit's name; 'moved-in': the {plant} phrase; 'favourite': the treat, lower case. */
  habit?: string;
  plant?: string;
  treat?: string;
}

/** "Came home Sep 29" · "The day Read bloomed" · "Best friends, Nov 2". */
export function memoryText(m: MemoryData): string {
  return fillLine(MEMORIES[m.kind], { date: monthDayLabel(m.date), habit: m.habit ?? '', plant: m.plant ?? '', treat: m.treat ?? '', weekday: weekdayName(m.date) });
}
