/**
 * Calendar month grid and year quilt (DESIGN §9.2 "Calendar", "Quilt"; v1 §13.11 day-state glyphs and
 * "Quilt"). One habit or all habits.
 */
import type { AppState, DateKey, Habit } from '../types';
import { inLifetime, logStatus } from '@/domain/activity';
import { historyEdit, type HistoryEdit } from '@/domain/logging';
import { canStartFrom } from '@/domain/habits';
import { dayCompletion, habitTally, isPctReady, monthWindow, percent, trackingOf, aggregateTally, type Tally } from '@/domain/consistency';
import {
  MONTH_SHORT,
  WEEKDAY_LETTERS,
  addDays,
  diffDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  monthFromIndex,
  monthIndex,
  monthKey,
  monthYearLabel,
  parseDateKey,
  startOfWeek,
  weekdayOrder,
  type MonthKey,
} from '@/domain/dates';
import { logsOf, trackingCtx } from '@/domain/economy';
import { firstTrackedDay } from '@/domain/insights';
import { isPausedOn } from '@/domain/pauses';
import { ruleAt } from '@/domain/rules';
import { isDayBased, isScheduledDate } from '@/domain/schedule';
import type { ViewEnv } from './common';

/**
 * The shared day-state glyphs (v1 §13.11): done = sage disk + check · tiny = sage-300 disk + check ·
 * partial = arc · none = dashed ring (never red) · rest/off = lavender moon · paused = leaf ·
 * unscheduled = numeral only · future = faint numeral · before-start / archived = not drawn.
 */
export type DayState = 'done' | 'tiny' | 'partial' | 'none' | 'rest' | 'off' | 'paused' | 'unscheduled' | 'future' | 'before-start' | 'archived';

export interface CalendarCell {
  date: DateKey;
  day: number;
  isToday: boolean;
  state: DayState;
  /** Aggregate: done ÷ due (null when nothing was due). One habit: count ÷ target for count habits. */
  fraction: number | null;
  /** One habit: the day's count and target (day-based). */
  count?: number;
  target?: number;
  note?: string;
  /**
   * How the day can be edited: 'window' = the rewarding check-in path (6-day window), 'history' =
   * history-only calendar edit, 'start-earlier' = before startedOn ("Start tracking from…"),
   * null = not editable (future, or the aggregate calendar).
   */
  /** Domain permissions for this habit/day; null on the aggregate calendar. */
  history: HistoryEdit | null;
  edit: 'window' | 'history' | 'start-earlier' | null;
}

export interface TallyVM extends Tally {
  percent: number | null;
  /** ≥ 10 expected: the percentage may be shown ("4 of 4 so far" otherwise). */
  ready: boolean;
}

export const tallyVM = (t: Tally): TallyVM => ({ ...t, percent: percent(t), ready: isPctReady(t) });

export interface CalendarMonthVM {
  month: MonthKey;
  /** "September 2026" */
  label: string;
  habitId: string | null;
  /** Weekday letters in the user's week order. */
  weekdays: string[];
  /** Rows of 7; null pads days outside the month. */
  weeks: (CalendarCell | null)[][];
  tally: TallyVM;
  prev: MonthKey;
  /** null when the next month is still in the future. */
  next: MonthKey | null;
}

/** One habit's glyph for a day. */
export function habitDayState(s: AppState, habit: Habit, date: DateKey, today: DateKey): { state: DayState; count: number; target: number; fraction: number | null } {
  const logs = logsOf(s, habit.id);
  const rule = ruleAt(habit, date);
  const target = isDayBased(rule) ? Math.max(1, rule.target) : 1;
  const log = logs[date];
  const count = log?.kind === 'log' ? log.count : 0;
  const frac = target > 1 ? Math.min(1, count / target) : null;
  if (date > today) return { state: 'future', count, target, fraction: null };
  if (date < habit.startedOn) return { state: 'before-start', count, target, fraction: null };
  if (!inLifetime(habit, date)) return { state: 'archived', count, target, fraction: null };
  const status = logStatus(log, rule, date < today);
  if (status === 'done' || status === 'tiny') return { state: status, count, target, fraction: frac };
  if (status === 'rest') return { state: 'rest', count, target, fraction: null };
  if (s.offDays[date]) return { state: 'off', count, target, fraction: null };
  if (isPausedOn(habit.pauses, date)) return { state: 'paused', count, target, fraction: null };
  if (!isDayBased(rule) || !isScheduledDate(rule, date)) return { state: 'unscheduled', count, target, fraction: null };
  return { state: status === 'partial' ? 'partial' : 'none', count, target, fraction: frac };
}

/** All habits' glyph for a day. */
export function aggregateDayState(s: AppState, date: DateKey, today: DateKey, first: DateKey | null): { state: DayState; fraction: number | null } {
  if (date > today) return { state: 'future', fraction: null };
  if (first === null || date < first) return { state: 'before-start', fraction: null };
  if (s.offDays[date]) return { state: 'off', fraction: null };
  const c = dayCompletion(trackingOf(s), date, today);
  if (c.due === 0) return { state: c.flexibleCheckins > 0 ? 'done' : 'unscheduled', fraction: null };
  const fraction = c.done / c.due;
  if (c.done === c.due) return { state: c.tiny === c.done ? 'tiny' : 'done', fraction };
  return { state: c.done > 0 || c.pending > 0 ? 'partial' : 'none', fraction };
}

export function calendarMonthVM(s: AppState, env: ViewEnv, habitId: string | null, month: MonthKey): CalendarMonthVM {
  const today = env.today;
  const m = monthKey(month);
  const first = `${m}-01`;
  const last = endOfMonth(first);
  const habit = habitId ? s.habits.find((h) => h.id === habitId) ?? null : null;
  const firstTracked = firstTrackedDay(trackingOf(s));
  const cells = new Map<DateKey, CalendarCell>();
  for (const d of eachDay(first, last)) {
    const { day } = parseDateKey(d);
    const base = { date: d, day, isToday: d === today };
    if (habit) {
      const st = habitDayState(s, habit, d, today);
      const log = s.logs[habit.id]?.[d];
      const history = historyEdit(s, habit.id, d, today);
      const edit: CalendarCell['edit'] = history.reason === 'before-start' && canStartFrom(habit, d, today) ? 'start-earlier' : history.reason === 'window' ? 'window' : history.canAdd || history.canRemove ? 'history' : null;
      cells.set(d, { ...base, state: st.state, fraction: st.fraction, count: st.count, target: st.target, ...(log?.note ? { note: log.note } : {}), edit, history });
    } else {
      const st = aggregateDayState(s, d, today, firstTracked);
      cells.set(d, { ...base, state: st.state, fraction: st.fraction, edit: null, history: null });
    }
  }
  const weeks: (CalendarCell | null)[][] = [];
  for (let w = startOfWeek(first, s.settings.weekStart); w <= last; w = addDays(w, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => cells.get(addDays(w, i)) ?? null));
  }
  const ctx = trackingCtx(s, today);
  const tally = habit ? habitTally(habit, logsOf(s, habit.id), monthWindow(m), ctx) : aggregateTally(trackingOf(s), monthWindow(m), today).total;
  const idx = monthIndex(m);
  return {
    month: m,
    label: monthYearLabel(m),
    habitId: habit?.id ?? null,
    weekdays: weekdayOrder(s.settings.weekStart).map((d) => WEEKDAY_LETTERS[d]),
    weeks,
    tally: tallyVM(tally),
    prev: monthFromIndex(idx - 1),
    next: idx + 1 <= monthIndex(today) ? monthFromIndex(idx + 1) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Year quilt                                                          */
/* ------------------------------------------------------------------ */

export interface QuiltPatch {
  date: DateKey;
  /** Pastel intensity 0..4 (0 = nothing done on a due day; 4 = everything). */
  level: 0 | 1 | 2 | 3 | 4;
  fraction: number | null;
  state: DayState;
}

export interface YearQuiltVM {
  year: number;
  /** Columns = weeks (user's week start), rows = weekdays; null = not drawn (outside the year, before tracking, future). */
  weeks: (QuiltPatch | null)[][];
  /** Where each month begins (for the month initials / bands that open the calendar). */
  months: { month: MonthKey; label: string; column: number }[];
  /** For the text summary (the grid itself is aria-hidden): `yearSummaryLine({ year, ...summary })` → "312 waterings in 2025, across 180 days". */
  summary: { checkins: number; daysShowedUp: number };
  /** Column holding today (the strip opens there on narrow screens). */
  todayColumn: number | null;
}

const levelOf = (fraction: number | null, state: DayState): QuiltPatch['level'] => {
  if (state === 'done' || state === 'tiny') return fraction === null || fraction >= 1 ? 4 : 3;
  if (fraction === null) return 0;
  if (fraction >= 1) return 4;
  if (fraction >= 0.7) return 3;
  if (fraction >= 0.4) return 2;
  return fraction > 0 ? 1 : 0;
};

export function yearQuiltVM(s: AppState, env: ViewEnv, year: number, habitId: string | null = null): YearQuiltVM {
  const today = env.today;
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const habit = habitId ? s.habits.find((h) => h.id === habitId) ?? null : null;
  const firstTracked = firstTrackedDay(trackingOf(s));
  const start = startOfWeek(jan1, s.settings.weekStart);
  const end = endOfWeek(dec31, s.settings.weekStart);
  const weeks: (QuiltPatch | null)[][] = [];
  const months: YearQuiltVM['months'] = [];
  let checkins = 0;
  const shownUp = new Set<DateKey>();
  let todayColumn: number | null = null;
  for (let w = start, col = 0; w <= end; w = addDays(w, 7), col++) {
    const column: (QuiltPatch | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(w, i);
      if (d === today) todayColumn = col;
      const { day, month } = parseDateKey(d);
      if (d >= jan1 && d <= dec31 && day === 1) months.push({ month: `${year}-${String(month).padStart(2, '0')}`, label: MONTH_SHORT[month - 1]!, column: col });
      if (d < jan1 || d > dec31 || d > today) {
        column.push(null);
        continue;
      }
      const st = habit ? habitDayState(s, habit, d, today) : aggregateDayState(s, d, today, firstTracked);
      if (st.state === 'before-start' || st.state === 'archived') {
        column.push(null);
        continue;
      }
      column.push({ date: d, level: levelOf(st.fraction, st.state), fraction: st.fraction, state: st.state });
    }
    weeks.push(column);
  }
  for (const h of habit ? [habit] : s.habits) {
    for (const [d, log] of Object.entries(s.logs[h.id] ?? {})) {
      if (d < jan1 || d > dec31 || d > today || log.kind !== 'log') continue;
      const st = logStatus(log, ruleAt(h, d), d < today);
      if (st === 'done' || st === 'tiny') {
        checkins++;
        shownUp.add(d);
      }
    }
  }
  return { year, weeks, months, summary: { checkins, daysShowedUp: shownUp.size }, todayColumn };
}
