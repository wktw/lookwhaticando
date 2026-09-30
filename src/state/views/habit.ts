/**
 * Habit Detail sheet (DESIGN §9.2 "Habit Detail", v1 §13.2 tiny/graduation/notes, v1 §13.5 rungs,
 * v1 §13.11 "Legible economy").
 */
import type { AppState, DateKey, Habit, HabitRule, PlantLook } from '../types';
import { logStatus, showedUp } from '@/domain/activity';
import { habitTally, monthWindow, weekWindow, habitPhrase, type HabitPhrase, type Tally } from '@/domain/consistency';
import { monthDayLabel, monthFromIndex, monthIndex, monthLabel, shortDateLabel, type MonthKey, type WeekStart } from '@/domain/dates';
import { habitCreatedOn, logsOf, streakOf, trackingCtx } from '@/domain/economy';
import { RUNGS } from '@/domain/streaks';
import { MAX_BIG_HABITS, bigHabitCount, currentOffer, habitInputFromTemplate, habitInputOf, validateHabitInput, type HabitIssue } from '@/domain/habits';
import { ownedPlantSpecies, ownedPots } from '@/domain/collection';
import { TEMPLATES } from '@/catalog/templates';
import { ruleChangeText, type RuleChange } from '@/catalog/format';
import type { HabitInput } from '../api';
import { pauseCovering, pauseReturnDay } from '@/domain/pauses';
import { ruleAt, ruleSegments } from '@/domain/rules';
import { calendarMonthVM, tallyVM, type CalendarMonthVM, type TallyVM } from './calendar';
import { checkinsToStage, plantVM, scheduleLabel, streakVM, type PlantVM, type StreakVM, type ViewEnv } from './common';
import { companionVM, keepsakeVM, type CompanionVM, type KeepsakeVM } from './company';
import { BLOOMING } from '@/domain/growth';
import { gardenJournal, type JournalEntry } from '@/domain/journal';
import { dueRead, looksOf, timeNudge, type TimeNudge } from '@/domain/signature';
import { keptTogetherDays } from '@/domain/stacking';
import { freshStartOptions, hemisphereOf, justThisSeasonEnd, type FreshStartOptions } from '@/domain/seasonReview';

export interface RungVM {
  /** Occurrence-equivalent needed. */
  tier: number;
  coins: number;
  /** The best streak has reached it (a paid rung always counts as reached). */
  reached: boolean;
  /** Its coins were paid (a rung reached only through history edits counts as reached but unpaid). */
  paid: boolean;
}

export interface MomentVM {
  date: DateKey;
  /** "Tue, Sep 22" */
  label: string;
  text: string;
  /** How the day went (done / tiny / rest…). */
  status: ReturnType<typeof logStatus>;
}

export interface HabitDetailVM {
  habit: Habit;
  /** The rule in effect today. */
  rule: HabitRule;
  /** "Every day" · "Mon/Wed/Fri" · "3 times a week"… (`scheduleText(rule.schedule, weekStart)`). */
  scheduleLabel: string;
  /**
   * A rule edit waiting to start (next period, tomorrow, or after today's rewarded check-in), as data
   * (`change`, worded by `ruleChangeText`) and in words: "From Oct 1: Mon/Wed/Fri".
   */
  upcoming: { from: DateKey; rule: HabitRule; change: RuleChange; label: string } | null;
  archived: boolean;
  /** First day rewards can pay for (the creation day). */
  createdOn: DateKey;
  plant: PlantVM;
  stats: {
    current: StreakVM | null;
    best: StreakVM | null;
    /** A kind change started a new rhythm: label a young current streak "New rhythm" (never "0"). */
    newRhythm: boolean;
    /** Check-in days ever (tiny included) and how many were tiny. */
    total: { checkins: number; tiny: number };
    /** The rolling phrase as data: `consistencyText(phrase, weekStart)` → "26 of the last 30 days · 3 tiny". */
    phrase: HabitPhrase | null;
  };
  thisWeek: TallyVM;
  thisMonth: TallyVM;
  /** Six months, oldest first (current month last, month-to-date). */
  months: { month: MonthKey; label: string; tally: TallyVM; current: boolean }[];
  calendar: CalendarMonthVM;
  ladder: { rungs: RungVM[]; next: RungVM | null; bestOccurrences: number };
  /** Notes, newest first ("Moments"). */
  moments: MomentVM[];
  /** "A bigger pot?" / "Make it tinier?" (never automatic). */
  offer: 'grow' | 'tinier' | null;
  /** Paused: "{habit} is resting until {date}." (CHECKIN_TOASTS.paused / pausedOpen). */
  pause: { paused: boolean; back: DateKey | null; upcoming: { start: DateKey; end?: DateKey } | null };
  /** The habit's rule history, oldest first, as data (`change`) and in words (`ruleChangeText`: "Since Sep 22: Mon/Wed/Fri"). */
  history: { from: DateKey | null; change: RuleChange; label: string }[];
  /** "Why it matters" (§14.1), editable from day 0. */
  why: string | null;
  /** Keeping Company (§14.1): the companion, its stories and today's routine. */
  companion: CompanionVM | null;
  /** Keepsakes left by this plant's pot, oldest first. */
  keepsakes: KeepsakeVM[];
  /** Blooms Like You (§14.2): the looks earned (only ever added), the one shown, and the plant tag. */
  looks: LooksVM;
  /** The Garden Journal (§14.2): up to five sentences, inked or pencilled. */
  journal: JournalEntry[];
  /** "You set Walk for mornings but usually water it after 6 pm. Move it to Evening?" (offered once). */
  timeNudge: TimeNudge | null;
  /** Habit stacking (§14.2): the habit it follows, and the kept-together count. */
  after: { habitId: string; name: string; keptTogether: number } | null;
  /** Habits that follow this one. */
  followers: string[];
  /** Check-ins still needed to reach Blooming (null once there). */
  checkinsToBlooming: number | null;
  /** "Just this season": its last day; retired with a ribbon: its last day. */
  endsOn: DateKey | null;
  ribbon: DateKey | null;
  /** "Tune my habits" (§14.3): the fresh-start chips for this habit (null when archived). */
  tune: FreshStartOptions | null;
}

export interface LooksVM {
  looks: PlantLook[];
  /** Index of the look shown; null = Classic (always available). */
  shown: number | null;
  /** The plant tag in plain words: the shown look's (or, on Classic, the latest look's) facts. */
  tag: PlantLook | null;
  /** A read is due (Blooming / Evergreen) and waits for 10 eligible live check-in days. */
  waiting: 'bloom' | 'evergreen' | null;
}

/** A rule as a history row's data (RuleChange, src/catalog/format.ts). */
function changeOf(habit: Habit, date: DateKey, rule: Pick<HabitRule, 'schedule' | 'target'>, first: boolean): RuleChange {
  return { date, first, schedule: rule.schedule, target: rule.target, unit: habit.unit ?? null };
}
const withLabel = <T extends { change: RuleChange }>(row: T, weekStart: WeekStart): T & { label: string } => ({ ...row, label: ruleChangeText(row.change, weekStart) });

export function habitDetailVM(s: AppState, env: ViewEnv, id: string): HabitDetailVM | null {
  const habit = s.habits.find((h) => h.id === id);
  if (!habit) return null;
  const today = env.today;
  const logs = logsOf(s, id);
  const ctx = trackingCtx(s, today);
  const rule = ruleAt(habit, today);
  const streak = streakOf(habit, logs, ctx);

  let checkins = 0;
  let tiny = 0;
  const moments: MomentVM[] = [];
  for (const [date, log] of Object.entries(logs)) {
    if (date > today) continue;
    const st = logStatus(log, ruleAt(habit, date), date < today);
    if (showedUp(st) && date >= habit.startedOn) {
      checkins++;
      if (st === 'tiny') tiny++;
    }
    if (log.note) moments.push({ date, label: shortDateLabel(date), text: log.note, status: st });
  }
  moments.sort((a, b) => (a.date < b.date ? 1 : -1));

  const tally = (t: Tally) => tallyVM(t);
  const cur = monthIndex(today);
  const months = Array.from({ length: 6 }, (_, k) => {
    const m = monthFromIndex(cur - 5 + k);
    return { month: m, label: monthLabel(m, 'short'), tally: tally(habitTally(habit, logs, monthWindow(m), ctx)), current: k === 5 };
  });

  const best = streak.best?.occurrences ?? 0;
  const rungs: RungVM[] = RUNGS.map((r) => {
    const paid = s.ledger.once[`rung|${id}|${r.tier}`] !== undefined;
    // A paid rung was reached, even if a later edit (or un-check) shortened the best streak since.
    return { tier: r.tier, coins: r.coins, reached: paid || best >= r.tier, paid };
  });
  const phrase = habitPhrase(habit, logs, ctx);
  const covering = pauseCovering(habit.pauses, today);
  const upcoming = habit.pauses.filter((p) => p.start > today).sort((a, b) => (a.start < b.start ? -1 : 1))[0] ?? null;
  const back = pauseReturnDay(habit.pauses, today) ?? null;

  const pending = habit.rules.find((r) => r.from > today);
  const plant = plantVM(s, habit, today, env.local);
  const checkinsToBlooming = checkinsToStage(s, habit, today, env.local, BLOOMING);
  const pl = looksOf(s, id);
  const anchor = habit.anchorHabitId === undefined ? undefined : s.habits.find((h) => h.id === habit.anchorHabitId);
  const due = dueRead(pl, plant.displayStage);
  return {
    habit,
    rule,
    scheduleLabel: scheduleLabel(rule.schedule, s.settings.weekStart),
    upcoming: pending ? withLabel({ from: pending.from, rule: pending, change: changeOf(habit, pending.from, pending, false) }, s.settings.weekStart) : null,
    archived: habit.archivedOn !== undefined,
    createdOn: habitCreatedOn(habit, s.settings.dayStartsAt, env.local),
    plant,
    stats: {
      current: streakVM(streak.current, habit.polarity),
      best: streakVM(streak.best, habit.polarity),
      newRhythm: streak.newRhythm,
      total: { checkins, tiny },
      phrase,
    },
    thisWeek: tally(habitTally(habit, logs, weekWindow(today, s.settings.weekStart), ctx)),
    thisMonth: tally(habitTally(habit, logs, monthWindow(today), ctx)),
    months,
    calendar: calendarMonthVM(s, env, id, today.slice(0, 7)),
    ladder: { rungs, next: rungs.find((r) => !r.reached) ?? null, bestOccurrences: best },
    moments,
    offer: currentOffer(s, habit, today),
    pause: {
      paused: covering !== undefined,
      back,
      upcoming: upcoming ? { start: upcoming.start, ...(upcoming.end ? { end: upcoming.end } : {}) } : null,
    },
    history: ruleSegments(habit).map((seg) => withLabel({ from: seg.start, change: changeOf(habit, seg.start ?? habit.startedOn, seg.rule, !seg.start) }, s.settings.weekStart)),
    why: habit.why ?? null,
    companion: companionVM(s, env, habit),
    keepsakes: (s.keepsakes ?? []).filter((k) => k.habitId === id).map((k) => keepsakeVM(s, k)),
    looks: {
      looks: pl.looks,
      shown: pl.shown,
      tag: pl.shown !== null ? (pl.looks[pl.shown] ?? null) : (pl.looks[pl.looks.length - 1] ?? null),
      waiting: due,
    },
    journal: gardenJournal(s, habit, { today, local: env.local, timeZone: env.timeZone, weekStart: s.settings.weekStart, checkinsToBlooming }),
    timeNudge: timeNudge(s, habit, today, env.local, env.timeZone),
    after: anchor ? { habitId: anchor.id, name: anchor.name, keptTogether: keptTogetherDays(s, habit, today) } : null,
    followers: s.habits.filter((h) => h.anchorHabitId === id).map((h) => h.id),
    checkinsToBlooming,
    endsOn: habit.endsOn ?? null,
    ribbon: habit.ribbon ?? null,
    tune: habit.archivedOn === undefined ? freshStartOptions(s, habit, today, hemisphereOf(s, env.timeZone)) : null,
  };
}

/* ------------------------------------------------------------------ */
/* The Habit Editor (DESIGN §5.1, §14.1 "Who keeps it company?")      */
/* ------------------------------------------------------------------ */

/** A new habit's starting values when no template is chosen (the watering can suits anything). */
export const BLANK_HABIT: HabitInput = {
  name: '',
  icon: 'watering-can',
  color: 'sage',
  plant: 'pothos',
  pot: 'terracotta',
  schedule: { kind: 'daily' },
  target: 1,
  step: 1,
  effort: 'light',
  timeOfDay: 'anytime',
  polarity: 'build',
};

export interface HabitEditorVM {
  mode: 'new' | 'edit';
  habitId: string | null;
  /** The form's values: the habit as it stands today, a template's, or BLANK_HABIT. */
  input: HabitInput;
  /** Plants and pots she owns (the free starters, and any from the Garden series). */
  plants: string[];
  pots: string[];
  /** "Who keeps it company?": the pets as chips, with the habit each already keeps company (it would move). */
  companions: { petId: string; name: string; keepsHabitId: string | null }[];
  /** The habit's companion now (null = "No one, for now"). */
  companion: string | null;
  /** Habits it can follow ("After…"): live habits, not itself and not one that follows it. */
  anchors: { habitId: string; name: string }[];
  /** "Longer" is taken 3 times already: "3 long habits is the most at once." */
  bigAtLimit: boolean;
  /** "Just this season": the season's last day, for `endsOn`. */
  seasonEnds: DateKey;
  /** Problems with `input` as it stands (empty for a fresh form with a name still to type). */
  issues: HabitIssue[];
}

/** The Habit Editor's data: a new habit (optionally from a template) or an existing one. */
export function habitEditorVM(s: AppState, env: ViewEnv, habitId: string | null, templateId?: string): HabitEditorVM | null {
  const today = env.today;
  const habit = habitId ? s.habits.find((h) => h.id === habitId) : undefined;
  if (habitId && !habit) return null;
  const template = templateId ? TEMPLATES.find((t) => t.id === templateId) : undefined;
  const input = habit ? habitInputOf(habit, today) : template ? habitInputFromTemplate(template) : { ...BLANK_HABIT };
  const followers = new Set<string>();
  if (habit) {
    const queue = [habit.id];
    while (queue.length > 0) {
      const id = queue.pop()!;
      for (const h of s.habits) if (h.anchorHabitId === id && !followers.has(h.id)) (followers.add(h.id), queue.push(h.id));
    }
  }
  const byOrder = [...s.habits].sort((a, b) => a.order - b.order);
  return {
    mode: habit ? 'edit' : 'new',
    habitId: habit?.id ?? null,
    input,
    plants: ownedPlantSpecies(s.collection),
    pots: ownedPots(s.collection),
    companions: Object.values(s.pets)
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1))
      .map((p) => ({ petId: p.id, name: p.name, keepsHabitId: s.habits.find((h) => h.companionId === p.id && h.archivedOn === undefined)?.id ?? null })),
    companion: habit?.companionId ?? null,
    anchors: byOrder.filter((h) => h.archivedOn === undefined && h.id !== habit?.id && !followers.has(h.id)).map((h) => ({ habitId: h.id, name: h.name })),
    bigAtLimit: bigHabitCount(s, habit?.id) >= MAX_BIG_HABITS,
    seasonEnds: justThisSeasonEnd(s, today, env.timeZone),
    issues: input.name.trim() === '' ? [] : validateHabitInput(s, input, habit?.id, today),
  };
}
