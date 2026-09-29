/**
 * Shared building blocks for view-models: the view environment, habit cards, plants and streaks.
 * Everything is a pure function of (state, view env).
 *
 * Structured data only for anything the copy deck governs: the card's status line is a
 * `StatusLine` (kind and numbers), a run is `{ length, unit, polarity }`, the forecast is
 * `checkinsToNext` + `nextName`. The words come from src/catalog/format.ts (`statusLine`,
 * `runText`, `forecastLine`, `cardAriaLabel`), which the screens and the fx layer share.
 */
import type { AppState, BloomColour, BloomShape, DateKey, DayLog, Habit, Schedule } from '../types';
import { longDateLabel, scheduleText } from '@/catalog/formatCore';
import type { PeriodRef, StatusLine } from '@/catalog/format';
import { companionOf, routineOn, type RoutineOn } from '@/domain/company';
import { stackOrder } from '@/domain/stacking';
import type { LocalTimeReader } from '@/domain/dates';
import { addDays, monthDayLabel, startOfWeek, type WeekStart } from '@/domain/dates';
import { canSetRest, logStatus, restStanding, showedUp, type LogStatus } from '@/domain/activity';
import { habitPhrase, habitTally, trailingWindow, isPctReady, type HabitPhrase } from '@/domain/consistency';
import { bestFlourishes, completedOccurrences, daysSinceCreation, habitCreatedOn, logsOf, memoByHabit, streakOf, trackingCtx } from '@/domain/economy';
import { POTTED, ROOTING, STAGE_THRESHOLDS, artBlooms, growthInfo, sunshinePerOccurrence, type GrowthInfo } from '@/domain/growth';
import { evaluatePeriod, flexPeriodAt } from '@/domain/periods';
import { isPausedOn, pauseReturnDay } from '@/domain/pauses';
import { ruleAt, scheduleStatusOn } from '@/domain/rules';
import { effectiveTarget, everyOf, isDayBased, restAllowancePerWeek } from '@/domain/schedule';
import type { StreakRun, StreakUnit } from '@/domain/streaks';

/** What every view needs besides the state: the app day, the wall clock and the local-time reader. */
export interface ViewEnv {
  today: DateKey;
  now: number;
  local: LocalTimeReader;
  /** The device's IANA time zone (the hemisphere is inferred from it when not set, §14.3). */
  timeZone?: string;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/**
 * "Every day" · "Mon/Wed/Fri" · "3 times a week" · "Once every 2 weeks" · "Twice a month" · "Once a
 * quarter" (`scheduleText` in src/catalog/format.ts, SCHEDULE_LINES in lines.ts).
 */
export function scheduleLabel(schedule: Schedule, weekStart: WeekStart): string {
  return scheduleText(schedule, weekStart);
}

/** "Sep 27" / "Saturday, September 27" helpers re-exported for screens. */
export { monthDayLabel, longDateLabel };

/** A run of the habit (never 0): worded by `runText(streak)` ("12 days in a row", "Held off 12 days"). */
export interface StreakVM {
  length: number;
  unit: StreakUnit;
  polarity: Habit['polarity'];
  start: DateKey;
  end: DateKey;
}

export function streakVM(run: StreakRun | null, polarity: Habit['polarity']): StreakVM | null {
  if (!run || run.length < 1) return null;
  return { length: run.length, unit: run.unit, polarity, start: run.start, end: run.end };
}

/* ------------------------------------------------------------------ */
/* Plants                                                              */
/* ------------------------------------------------------------------ */

export interface PlantVM extends GrowthInfo {
  species: Habit['plant'];
  pot: Habit['pot'];
  /**
   * What PlantArt / SillPot take as `blooms`: undefined below Evergreen (the art follows the stage:
   * Blooming and Flourishing show their flowers), the art's 5 plus `extraBlooms` at Evergreen.
   */
  blooms: number | undefined;
  /**
   * Waterings still needed for the next stage (1 when only a watering is missing); null at
   * Evergreen. Worded by `forecastLine(plant)`: "4 more waterings to Blooming." (never sunshine,
   * never a date, §9.2).
   */
  checkinsToNext: number | null;
}

/**
 * Check-ins still needed for the plant to show `stage` (the Garden Journal's forecast, the stories'
 * "at Blooming"): enough sunshine at the rule of the next check-in, and one check-in per stage.
 * Null once it shows that stage. Never a date: rests and pauses only make it later.
 */
export function checkinsToStage(s: AppState, habit: Habit, today: DateKey, local: LocalTimeReader, stage: number): number | null {
  const plant = plantVM(s, habit, today, local);
  if (plant.displayStage >= stage) return null;
  const logs = logsOf(s, habit.id);
  const since = habitCreatedOn(habit, s.settings.dayStartsAt, local);
  const completed = completedOccurrences(habit, logs, trackingCtx(s, today), since);
  const nextDay = showedUp(logStatus(logs[today], ruleAt(habit, today), false)) ? addDays(today, 1) : today;
  const per = sunshinePerOccurrence(ruleAt(habit, nextDay));
  const sun = s.ledger.sunshine[habit.id] ?? 0;
  const bySun = Math.ceil(Math.max(0, STAGE_THRESHOLDS[stage]! - sun) / per - 1e-9);
  return Math.max(1, bySun, stage - completed);
}

export function plantVM(s: AppState, habit: Habit, today: DateKey, local: LocalTimeReader): PlantVM {
  const logs = logsOf(s, habit.id);
  const since = habitCreatedOn(habit, s.settings.dayStartsAt, local);
  const info = growthInfo({
    sunshine: s.ledger.sunshine[habit.id] ?? 0,
    completedOccurrences: completedOccurrences(habit, logs, trackingCtx(s, today), since),
    bestStage: s.ledger.bestStage[habit.id],
    bestFlourishes: bestFlourishes(s, habit.id),
    elapsedDays: daysSinceCreation(since, today),
  });
  let checkinsToNext: number | null = null;
  if (info.sunshineToNext !== null) {
    // Priced at the rule of the next check-in: tomorrow's once today is done (an edit may be pending).
    const nextDay = showedUp(logStatus(logs[today], ruleAt(habit, today), false)) ? addDays(today, 1) : today;
    const per = sunshinePerOccurrence(ruleAt(habit, nextDay));
    checkinsToNext = info.heldBack || info.paced || info.sunshineToNext <= 1e-9 ? 1 : Math.max(1, Math.ceil(info.sunshineToNext / per - 1e-9));
  }
  return {
    ...info,
    species: habit.plant,
    pot: habit.pot,
    blooms: artBlooms(info.displayStage, info.extraBlooms),
    checkinsToNext,
  };
}

/* ------------------------------------------------------------------ */
/* Habit cards                                                         */
/* ------------------------------------------------------------------ */

export type SubtitleKind = StatusLine['kind'];

/**
 * Where a flexible habit's period stands, as data: "2 of 3 this week" (`statusLine`). There is no
 * deadline and no count of what's left (VOICE.md §2): only what was watered.
 */
export interface PaceVM {
  /** Watering days in the period so far (capped at the goal when shown). */
  checkins: number;
  /** The period's goal (never 0). */
  target: number;
  met: boolean;
  /** The period's rhythm ("week", "fortnight", "month"…, `periodWord`). */
  period: PeriodRef;
  /** The period is the current one (a selected past day may sit in a closed one: "that week"). */
  current: boolean;
  /** First and last day of the period. */
  from: DateKey;
  to: DateKey;
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
  /** The status line under the name (§9.1.1, first match wins), as data: `statusLine(card.subtitle)`. */
  subtitle: StatusLine;
  /** Flexible habits: where the period stands ("2 of 3 this week"). */
  pace: PaceVM | null;
  /** The live streak (null rather than 0). */
  streak: StreakVM | null;
  plant: PlantVM;
  /** Flexible goal met for the current period ("Done for the week" fold; still tappable). */
  met: boolean;
  /** Damp soil: watered on `date` (§14.2; there is no dry state). */
  damp: boolean;
  /**
   * Keeping Company (§14.1): the companion peeking from the pot, and its routine that day (null on
   * a day without one, which looks like any ordinary day). Null without a companion, or when
   * "Show companions" is off.
   */
  companion: { petId: string; routine: RoutineOn | null } | null;
  /** Habit stacking (§14.2): the habit this one follows ("After Walk"). */
  after: { habitId: string; name: string } | null;
  /** The plant's shown look (§14.2); null = Classic. */
  look: { colour: BloomColour; shape: BloomShape } | null;
  /** "Just this season": its last day. */
  endsOn: DateKey | null;
  /**
   * A counter that rises with every watering tap (each step of a count habit, each check), for the
   * plant art's `pulse` (replay the watering when it rises). Lifetime taps on live days + today's.
   */
  waterings: number;
}

/** A flexible schedule's period ({kind, every}); null for day-based rules. */
export function periodOf(schedule: Schedule): PeriodRef | null {
  return schedule.kind === 'weekly' || schedule.kind === 'monthly' ? { kind: schedule.kind, every: everyOf(schedule) } : null;
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
  const weekStartDay = startOfWeek(date, s.settings.weekStart);
  for (let i = 0; i < 7; i++) if (restStanding(habit, logs, addDays(weekStartDay, i), ctx) === 'allowed') usedRests++;

  let pace: PaceVM | null = null;
  let met = false;
  const periodRef = periodOf(rule.schedule);
  if (flexible && periodRef) {
    // The period containing `date` (a selected past day may sit in an earlier period), as of today.
    const period = flexPeriodAt(habit, date, s.settings.weekStart);
    if (period) {
      const e = evaluatePeriod(habit, logs, period, ctx);
      met = e.met;
      pace = { checkins: e.checkinDays, target: Math.max(1, e.target), met: e.met, period: periodRef, current: e.state === 'current', from: e.from, to: e.to };
    }
  }

  const streak = streakVM(streakOf(habit, logs, ctx).current, habit.polarity);
  const plant = plantVM(s, habit, today, env.local);
  const petId = s.settings.showCompanions === false ? null : companionOf(s, habit);
  const anchor = habit.anchorHabitId === undefined ? undefined : s.habits.find((h) => h.id === habit.anchorHabitId);
  const looks = s.plantLooks?.[habit.id];
  const shownLook = looks && looks.shown !== null ? looks.looks[looks.shown] : undefined;
  const subtitle = cardSubtitle({ habit, rule, count, target, status, flexible, pace, streak, s, env, plant, rested });
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
    plant,
    met,
    damp: done,
    companion: petId ? { petId, routine: routineOn(s, habit, date, plant.displayStage, today) } : null,
    after: anchor ? { habitId: anchor.id, name: anchor.name } : null,
    look: shownLook ? { colour: shownLook.colour, shape: shownLook.shape } : null,
    endsOn: habit.endsOn ?? null,
    waterings: memoByHabit(habit, logs, ctx, 'waterings', () => wateringsOf(logs, today)),
  };
}

/** Lifetime watering taps up to `today`: each logged day's count, and 1 for a tiny logged with no count. */
function wateringsOf(logs: Readonly<Record<DateKey, DayLog>>, today: DateKey): number {
  let n = 0;
  for (const [d, log] of Object.entries(logs)) if (d <= today && log.kind === 'log') n += Math.max(0, log.count) + (log.level === 'tiny' && log.count === 0 ? 1 : 0);
  return n;
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
  /** The habit's plant as of today (computed when absent). */
  plant?: PlantVM;
  /** Logged as a rest day on the card's day. */
  rested?: boolean;
}

/** The phrase says something (never "0 of the last 30 days"). */
function phraseHasSome(p: HabitPhrase): boolean {
  return p.kind === 'days' || p.kind === 'weekdays' ? p.achieved > 0 : p.met > 0;
}

/**
 * Card status line (DESIGN §9.1.1, first match wins), as data; `statusLine()` words it:
 * resting "Resting today" · count in progress "5/8 glasses" · tiny logged "Tiny version ✓" ·
 * flexible "2 of 3 this week" (from the first watering of the period; nothing after it) /
 * "Watered for the week ✓" · 3 or more in a row "12 days" ("12 in a row", "4 weeks in a row",
 * "Held off 12 days") · ≥ 10 expected "26 of the last 30 days" · a new plant "Rooting · 2 more to
 * pot up" while it roots, or "Just planted" while it is a cutting · otherwise the rolling phrase
 * if it has something to say ("5 of the last 8 days"), else no line (`none`), never a 0.
 */
export function cardSubtitle(i: SubtitleInput): StatusLine {
  if (i.rested) return { kind: 'rested' };
  if (!i.flexible && i.target > 1 && i.count > 0 && i.count < i.target && i.status !== 'tiny') {
    return { kind: 'count', count: i.count, target: i.target, unit: i.habit.unit ?? null };
  }
  if (i.status === 'tiny') return { kind: 'tiny' };
  if (i.flexible && i.pace) {
    if (i.pace.met) return { kind: 'period-done', period: i.pace.period };
    if (i.pace.checkins > 0) return { kind: 'period', count: Math.min(i.pace.checkins, i.pace.target), target: i.pace.target, period: i.pace.period, current: i.pace.current };
  }
  if (i.streak && i.streak.length >= 3) return { kind: 'streak', length: i.streak.length, unit: i.streak.unit, polarity: i.habit.polarity };
  const ctx = trackingCtx(i.s, i.env.today);
  const logs = logsOf(i.s, i.habit.id);
  // Both walk the habit's history: memoised by the identity of (habit, logs, off days), so a warm
  // Today re-renders without re-walking (a check-in replaces only that habit's logs).
  const t = memoByHabit(i.habit, logs, ctx, 'card-tally30', () => habitTally(i.habit, logs, trailingWindow(i.env.today, 30), ctx));
  const phraseOf = () => memoByHabit(i.habit, logs, ctx, 'card-phrase', () => habitPhrase(i.habit, logs, ctx));
  let phrase: HabitPhrase | null | undefined;
  if (isPctReady(t)) {
    phrase = phraseOf();
    if (phrase && phraseHasSome(phrase)) return { kind: 'consistency', phrase };
  }
  const plant = i.plant ?? plantVM(i.s, i.habit, i.env.today, i.env.local);
  if (plant.displayStage >= ROOTING && plant.displayStage < POTTED && plant.checkinsToNext !== null) return { kind: 'rooting', count: plant.checkinsToNext };
  if (plant.displayStage < ROOTING) return { kind: 'new' };
  if (phrase === undefined) phrase = phraseOf();
  if (phrase && phraseHasSome(phrase)) return { kind: 'consistency', phrase };
  return { kind: 'none' };
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Habits alive on `date` (started, not archived before it), in display order: followers right after their anchors (§14.2). */
export function liveHabits(s: AppState, date: DateKey): Habit[] {
  return stackOrder(s.habits.filter((h) => h.startedOn <= date && (h.archivedOn === undefined || h.archivedOn >= date)));
}

export function habitName(s: AppState, id: string | undefined): string | null {
  return s.habits.find((h) => h.id === id)?.name ?? null;
}

/** A paused habit's return day ("back Oct 6"), or null while open-ended. */
export function returnDay(habit: Habit, today: DateKey): DateKey | null {
  return pauseReturnDay(habit.pauses, today) ?? null;
}

