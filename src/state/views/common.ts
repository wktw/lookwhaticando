/**
 * Shared building blocks for view-models: the view environment, habit cards, plants, streaks and
 * the small English labels the screens print. Everything is a pure function of (state, view env).
 */
import type { AppState, DateKey, Habit, Schedule } from '../types';
import type { LocalTimeReader } from '@/domain/dates';
import {
  MONTH_SHORT,
  WEEKDAY_SHORT,
  addDays,
  diffDays,
  monthDayLabel,
  parseDateKey,
  weekday,
  weekdaysLabel,
  type WeekStart,
} from '@/domain/dates';
import { canSetRest, logStatus, restStanding, showedUp, type LogStatus } from '@/domain/activity';
import { formatHabitPhrase, habitPhrase, habitTally, trailingWindow, isPctReady } from '@/domain/consistency';
import { completedOccurrences, logsOf, streakOf, trackingCtx } from '@/domain/economy';
import { growthInfo, stageName, sunshinePerOccurrence, type GrowthInfo } from '@/domain/growth';
import { periodPace } from '@/domain/periods';
import { isPausedOn, pauseReturnDay } from '@/domain/pauses';
import { ruleAt, scheduleStatusOn } from '@/domain/rules';
import { effectiveTarget, everyOf, isDayBased, restAllowancePerWeek } from '@/domain/schedule';
import type { StreakRun, StreakUnit } from '@/domain/streaks';

/** What every view needs besides the state: the app day, the wall clock and the local-time reader. */
export interface ViewEnv {
  today: DateKey;
  now: number;
  local: LocalTimeReader;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

const TIMES_WORD: Record<number, string> = { 1: 'Once', 2: 'Twice' };
const timesWord = (n: number): string => TIMES_WORD[n] ?? `${n}×`;
const WEEK_EVERY: Record<number, string> = { 1: 'a week', 2: 'every 2 weeks', 3: 'every 3 weeks', 4: 'every 4 weeks' };
const MONTH_EVERY: Record<number, string> = { 1: 'a month', 2: 'every 2 months', 3: 'a quarter', 6: 'every 6 months', 12: 'a year' };

/** "Every day" · "Mon/Wed/Fri" · "3× a week" · "Once every 2 weeks" · "Twice a month" · "Once a quarter". */
export function scheduleLabel(schedule: Schedule, weekStart: WeekStart): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'days':
      return schedule.days.length === 7 ? 'Every day' : weekdaysLabel(schedule.days, weekStart);
    case 'weekly':
      return `${timesWord(schedule.times)} ${WEEK_EVERY[everyOf(schedule)]}`;
    case 'monthly':
      return `${timesWord(schedule.times)} ${MONTH_EVERY[everyOf(schedule)]}`;
  }
}

/** "Sun" for a day within the next week, otherwise "Oct 6". */
export function deadlineLabel(date: DateKey, today: DateKey): string {
  const d = diffDays(today, date);
  if (d === 0) return 'today';
  if (d > 0 && d < 7) return WEEKDAY_SHORT[weekday(date)]!;
  return monthDayLabel(date);
}

/** "Sep 27" / "Mon, Sep 22" helpers re-exported for screens. */
export { monthDayLabel };

export function streakLabel(length: number, unit: StreakUnit, polarity: Habit['polarity']): string {
  const word =
    unit === 'days' ? (length === 1 ? 'day' : 'days') : unit === 'times' ? 'in a row' : unit === 'weeks' ? (length === 1 ? 'week' : 'weeks') : length === 1 ? 'month' : 'months';
  const base = `${length} ${word}`;
  return polarity === 'avoid' ? `Kept it up ${base}` : base;
}

export interface StreakVM {
  length: number;
  unit: StreakUnit;
  /** "12 days" · "12 in a row" · "3 weeks" · "Kept it up 12 days". Never "0". */
  label: string;
  start: DateKey;
  end: DateKey;
}

export function streakVM(run: StreakRun | null, polarity: Habit['polarity']): StreakVM | null {
  if (!run || run.length < 1) return null;
  return { length: run.length, unit: run.unit, label: streakLabel(run.length, run.unit, polarity), start: run.start, end: run.end };
}

/* ------------------------------------------------------------------ */
/* Plants                                                              */
/* ------------------------------------------------------------------ */

export interface PlantVM extends GrowthInfo {
  species: Habit['plant'];
  pot: Habit['pot'];
  /** Full check-ins still needed for the next stage (1 when only a check-in is missing); null at Evergreen. */
  checkinsToNext: number | null;
  /** "4 more check-ins to Blooming" (sunshine is never shown as a number, §13.11); null at Evergreen. */
  nextLine: string | null;
}

export function plantVM(s: AppState, habit: Habit, today: DateKey): PlantVM {
  const logs = logsOf(s, habit.id);
  const info = growthInfo({
    sunshine: s.ledger.sunshine[habit.id] ?? 0,
    completedOccurrences: completedOccurrences(habit, logs, trackingCtx(s, today)),
    bestStage: s.ledger.bestStage[habit.id],
  });
  let checkinsToNext: number | null = null;
  if (info.sunshineToNext !== null) {
    const per = sunshinePerOccurrence(ruleAt(habit, today));
    checkinsToNext = info.heldBack || info.sunshineToNext <= 1e-9 ? 1 : Math.max(1, Math.ceil(info.sunshineToNext / per - 1e-9));
  }
  return {
    ...info,
    species: habit.plant,
    pot: habit.pot,
    checkinsToNext,
    nextLine: checkinsToNext === null || !info.nextName ? null : `${checkinsToNext} more check-in${checkinsToNext === 1 ? '' : 's'} to ${info.nextName}`,
  };
}

/* ------------------------------------------------------------------ */
/* Habit cards                                                         */
/* ------------------------------------------------------------------ */

export type SubtitleKind = 'count' | 'tiny' | 'period' | 'period-done' | 'streak' | 'consistency' | 'new';

export interface PaceVM {
  checkins: number;
  target: number;
  /** Check-ins still needed this period (0 once met). */
  needed: number;
  /** Last day of the period. */
  deadline: DateKey;
  /** "Sun" / "Oct 6". */
  deadlineLabel: string;
  met: boolean;
  /** "this week" · "this month" · "this fortnight"… */
  periodLabel: string;
  /** "2 of 3 this week" */
  progressText: string;
  /** "1 more by Sun" (null once met). */
  paceText: string | null;
}

export interface HabitCardVM {
  id: string;
  name: string;
  icon: string;
  color: Habit['color'];
  polarity: Habit['polarity'];
  /** Implementation-intention anchor shown as the card's second line. */
  anchor: string | null;
  unit: string | null;
  timeOfDay: Habit['timeOfDay'];
  order: number;
  /** The day this card logs to. */
  date: DateKey;
  kind: Schedule['kind'];
  flexible: boolean;
  /** Day-based rule with an occurrence on `date`. */
  scheduled: boolean;
  paused: boolean;
  count: number;
  /** Count that completes the day (1 for flexible habits). */
  target: number;
  /** Amount per tap. */
  step: number;
  status: LogStatus;
  /** Showed up (done or tiny): the check button shows as pressed. */
  done: boolean;
  /** Reached the full target. */
  full: boolean;
  tiny: boolean;
  /** Some progress below the target (ring tick, no celebration). */
  partial: boolean;
  /** Logged as a rest day (moon); `restState` says whether it is within the weekly allowance. */
  rested: boolean;
  restState: 'allowed' | 'over' | null;
  /** A rest can be set/unset on `date` (day-based, scheduled, inside the rest window). */
  restAllowed: boolean;
  /** Allowed rests still unused this calendar week (a rest beyond it still shows the moon, never red). */
  restsLeftThisWeek: number;
  /** The rule's tiny version ("Shoes on, step outside"), and whether it can be logged now. */
  tinyLabel: string | null;
  canTiny: boolean;
  /** That day's note. */
  note: string | null;
  /** The status line under the name (§13.11 card status line, first match wins). */
  subtitle: { kind: SubtitleKind; text: string };
  /** Flexible habits: where the period stands ("2 of 3 this week · 1 more by Sun"). */
  pace: PaceVM | null;
  /** The live streak (null rather than 0). */
  streak: StreakVM | null;
  plant: PlantVM;
  /** Flexible goal met for the current period ("Done for the week" fold; still tappable). */
  met: boolean;
  /** Screen-reader name: "Drink water, 5 of 8 glasses". */
  ariaLabel: string;
}

const WEEK_WORD: Record<number, string> = { 1: 'week', 2: 'fortnight', 3: '3 weeks', 4: '4 weeks' };
const MONTH_WORD: Record<number, string> = { 1: 'month', 2: '2 months', 3: 'quarter', 6: 'half-year', 12: 'year' };

export function periodWord(schedule: Schedule): string {
  if (schedule.kind === 'weekly') return WEEK_WORD[everyOf(schedule)] ?? 'week';
  if (schedule.kind === 'monthly') return MONTH_WORD[everyOf(schedule)] ?? 'month';
  return 'day';
}

/** The card for one habit on `date` (see HabitCardVM). */
export function habitCard(s: AppState, habit: Habit, date: DateKey, env: ViewEnv): HabitCardVM {
  const today = env.today;
  const logs = logsOf(s, habit.id);
  const ctx = trackingCtx(s, today);
  const rule = ruleAt(habit, date);
  const target = effectiveTarget(rule);
  const flexible = !isDayBased(rule);
  const log = logs[date];
  const status = logStatus(log, rule, date < today);
  const count = log?.kind === 'log' ? log.count : 0;
  const done = showedUp(status);
  const rested = log?.kind === 'rest';
  const restState = rested ? restStanding(habit, logs, date, ctx) : null;
  const paused = isPausedOn(habit.pauses, date);
  const scheduled = scheduleStatusOn(habit, date) === 'scheduled';
  const allowance = restAllowancePerWeek(rule);
  let usedRests = 0;
  const weekStartDay = addDays(date, -((weekday(date) - s.settings.weekStart + 7) % 7));
  for (let i = 0; i < 7; i++) if (restStanding(habit, logs, addDays(weekStartDay, i), ctx) === 'allowed') usedRests++;

  let pace: PaceVM | null = null;
  let met = false;
  if (flexible) {
    const p = periodPace(habit, logs, { ...ctx, today: date > today ? today : date });
    if (p) {
      const word = periodWord(rule.schedule);
      met = p.met;
      pace = {
        checkins: p.checkinDays,
        target: Math.max(1, p.target),
        needed: p.needed,
        deadline: p.deadline,
        deadlineLabel: deadlineLabel(p.deadline, today),
        met: p.met,
        periodLabel: `this ${word}`,
        progressText: `${Math.min(p.checkinDays, Math.max(1, p.target))} of ${Math.max(1, p.target)} this ${word}`,
        paceText: p.met ? null : `${p.needed} more by ${deadlineLabel(p.deadline, today)}`,
      };
    }
  }

  const streak = streakVM(streakOf(habit, logs, ctx).current, habit.polarity);
  const subtitle = cardSubtitle({ habit, rule, count, target, status, flexible, pace, streak, s, env });
  const unitWord = habit.unit ?? '';
  const aria =
    target > 1 && !flexible ? `${habit.name}, ${count} of ${target}${unitWord ? ` ${unitWord}` : ''}` : `${habit.name}${done ? (habit.polarity === 'avoid' ? ', kept it up' : ', done') : ''}`;
  return {
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    polarity: habit.polarity,
    anchor: habit.anchor ?? null,
    unit: habit.unit ?? null,
    timeOfDay: habit.timeOfDay,
    order: habit.order,
    date,
    kind: rule.schedule.kind,
    flexible,
    scheduled,
    paused,
    count,
    target,
    step: Math.max(1, rule.step),
    status,
    done,
    full: status === 'done',
    tiny: status === 'tiny',
    partial: status === 'partial',
    rested,
    restState,
    restAllowed: !flexible && scheduled && canSetRest(date, today) && !done,
    restsLeftThisWeek: Math.max(0, allowance - usedRests),
    tinyLabel: rule.tiny?.label ?? null,
    canTiny: !done && !rested && date <= today,
    note: log?.note ?? null,
    subtitle,
    pace,
    streak,
    plant: plantVM(s, habit, today),
    met,
    ariaLabel: aria,
  };
}

interface SubtitleInput {
  habit: Habit;
  rule: ReturnType<typeof ruleAt>;
  count: number;
  target: number;
  status: LogStatus;
  flexible: boolean;
  pace: PaceVM | null;
  streak: StreakVM | null;
  s: AppState;
  env: ViewEnv;
}

/**
 * Card status line (DESIGN §13.11, first match wins): count in progress "5/8 glasses" · tiny
 * logged "Tiny version ✓" · flexible "2 of 3 this week · 1 more by Sun" / "Done for the week ✓" ·
 * streak ≥ 3 "12 days" ("12 in a row", "Kept it up 12 days") · ≥ 10 expected "26 of the last 30
 * days" · otherwise "Just planted 🌱".
 */
export function cardSubtitle(i: SubtitleInput): { kind: SubtitleKind; text: string } {
  if (!i.flexible && i.target > 1 && i.count > 0 && i.count < i.target && i.status !== 'tiny') {
    return { kind: 'count', text: `${i.count}/${i.target}${i.habit.unit ? ` ${i.habit.unit}` : ''}` };
  }
  if (i.status === 'tiny') return { kind: 'tiny', text: 'Tiny version ✓' };
  if (i.flexible && i.pace) {
    if (i.pace.met) return { kind: 'period-done', text: `Done for the ${periodWord(i.rule.schedule)} ✓` };
    return { kind: 'period', text: `${i.pace.progressText}${i.pace.paceText ? ` · ${i.pace.paceText}` : ''}` };
  }
  if (i.streak && i.streak.length >= 3) return { kind: 'streak', text: i.streak.label };
  const ctx = trackingCtx(i.s, i.env.today);
  const logs = logsOf(i.s, i.habit.id);
  const t = habitTally(i.habit, logs, trailingWindow(i.env.today, 30), ctx);
  if (isPctReady(t)) {
    const phrase = habitPhrase(i.habit, logs, ctx);
    if (phrase) return { kind: 'consistency', text: formatHabitPhrase(phrase, i.s.settings.weekStart) };
  }
  return { kind: 'new', text: 'Just planted 🌱' };
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Habits alive on `date` (started, not archived before it), in display order. */
export function liveHabits(s: AppState, date: DateKey): Habit[] {
  return s.habits.filter((h) => h.startedOn <= date && (h.archivedOn === undefined || h.archivedOn >= date)).sort((a, b) => a.order - b.order);
}

export function habitName(s: AppState, id: string | undefined): string | null {
  return s.habits.find((h) => h.id === id)?.name ?? null;
}

/** "back Oct 6" for a paused habit, or null while open-ended. */
export function returnLabel(habit: Habit, today: DateKey): string | null {
  const back = pauseReturnDay(habit.pauses, today);
  return back ? `back ${monthDayLabel(back)}` : null;
}

export const stageLabel = stageName;

/** 'Sep 27' → 'Saturday, September 27'. */
export function longDateLabel(date: DateKey): string {
  const { month, day } = parseDateKey(date);
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[weekday(date)]}, ${months[month - 1]} ${day}`;
}

export const monthShort = (m: number): string => MONTH_SHORT[m - 1]!;
