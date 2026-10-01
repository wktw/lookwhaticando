/**
 * Season Review (DESIGN §14.3 — Stardew's seasons as chapters, Animal Crossing's real calendar).
 *
 * - **Hemisphere**: `settings.hemisphere`, else inferred from the device time zone (a southern zone
 *   list below; everything else, the tropics included, reads as north). Onboarding stores the
 *   inference so it doesn't move when she travels; "Where's your summer?" changes it.
 * - **Seasons** are meteorological, on real dates: in the north spring Mar 1, summer Jun 1, autumn
 *   Sep 1, winter Dec 1; in the south the same six months apart. (Capsule series keep their own
 *   fixed dates: seasons.ts.)
 * - **The review**: on the first open of a new season (`openDay`), the season just ended becomes a
 *   pending Today card, if she opened the app during it and at least one plant was watered in it:
 *   up to 8 plants, most watered first, with their stage at its start and end, their waterings and
 *   their companion; counts only. Seasons that passed without her opening the app (a long break),
 *   and a card still pending when yet another season begins, are filed on the memory shelf
 *   silently, never as a card. Every season is filed once (keyed by its first day), so opening the
 *   day again, or many times, changes nothing: the review is idempotent.
 * - **Fresh-start chips** per habit (also "Tune my habits", anytime): Keep going · Tinier · Grow ·
 *   Rest till next season · Finish; plus Keep everything. It pays nothing beyond Grow's stamp, and
 *   Grow pays only when "Ready to grow?" genuinely stands (habits.acceptGrowOffer).
 * - **"Just this season"** (`Habit.endsOn`): once the day after `endsOn` opens, the habit retires with
 *   a ribbon: archived as of `endsOn`, so no day after it is ever expected of it (never shown as
 *   incomplete).
 */
import type { HabitInput } from '@/state/api';
import type { AppState, DateKey, Habit, Hemisphere, SeasonName, SeasonPlant, SeasonRecord, SeasonShelf } from '@/state/types';
import { logStatus, showedUp } from './activity';
import { freeCompanion } from './company';
import { unstackFollowers } from './stacking';
import { addDays, addMonths, formatDateKey, parseDateKey } from './dates';
import { daysSinceCreation, habitCreatedOn, logsOf, memoByHabit, trackingCtx } from './economy';
import { plantStage, sunshineFromHistory } from './growth';
import { acceptGrowOffer, currentOffer, pauseHabit, updateHabit } from './habits';
import { checkinCounts } from './insights';
import { ruleAt } from './rules';
import { isBiggerRule, isDayBased, MONTHLY_EVERY, RULE_LIMITS, WEEKLY_EVERY } from './schedule';
import { trackingOf } from './consistency';
import type { Tx } from './tx';
import { hemisphereOf } from './hemisphere';

export { hemisphereOf, inferHemisphere } from './hemisphere';

export const SEASON_ORDER: readonly SeasonName[] = ['spring', 'summer', 'autumn', 'winter'];
/** First month of each season, north (the south is six months on). */
const NORTH_START: Readonly<Record<SeasonName, number>> = { spring: 3, summer: 6, autumn: 9, winter: 12 };
/** At most this many plants in a review's time-lapse. */
export const REVIEW_PLANTS = 8;
/** A long break files at most this many seasons (two years). */
export const MAX_FILED_AT_ONCE = 8;

/* ------------------------------------------------------------------ */
/* Season boundaries                                                   */
/* ------------------------------------------------------------------ */

export interface SeasonSpan {
  name: SeasonName;
  /** First and last day (inclusive). */
  start: DateKey;
  end: DateKey;
}

function startMonth(name: SeasonName, h: Hemisphere): number {
  const m = NORTH_START[name];
  return h === 'north' ? m : ((m + 5) % 12) + 1;
}

/** The season `date` falls in. */
export function seasonAt(date: DateKey, h: Hemisphere): SeasonSpan {
  const { year, month } = parseDateKey(date);
  let best: { name: SeasonName; start: DateKey } | null = null;
  for (const name of SEASON_ORDER) {
    const m = startMonth(name, h);
    const y = m <= month ? year : year - 1;
    const start = formatDateKey(y, m, 1);
    if (start <= date && (!best || start > best.start)) best = { name, start };
  }
  const start = best!.start;
  return { name: best!.name, start, end: addDays(addMonths(start, 3), -1) };
}

/** The first day of the next season after `date`'s ("Paused until Dec 1"). */
export function nextSeasonStart(date: DateKey, h: Hemisphere): DateKey {
  return addDays(seasonAt(date, h).end, 1);
}

/* ------------------------------------------------------------------ */
/* A season's plants                                                   */
/* ------------------------------------------------------------------ */

/**
 * A plant's shown stage at the end of `date`: from the recorded stage days (`stageDates`), or,
 * without them, from its history (as if every achieved occurrence had been rewarded).
 */
export function stageOnDate(s: AppState, habit: Habit, date: DateKey, local: Tx['env']['local']): number {
  if (date < habit.startedOn) return 0;
  const recorded = s.stageDates?.[habit.id];
  if (recorded) {
    let best = 0;
    for (const [st, d] of Object.entries(recorded)) if (d !== undefined && d <= date && Number(st) > best) best = Number(st);
    return best;
  }
  const logs = logsOf(s, habit.id);
  const ctx = trackingCtx(s, date);
  return memoByHabit(habit, logs, ctx, 'stage-on', () => {
    const x = sunshineFromHistory(habit, logs, ctx);
    const since = habitCreatedOn(habit, s.settings.dayStartsAt, local);
    return plantStage(x.sunshine, x.completedOccurrences, daysSinceCreation(since, date));
  });
}

/** The time-lapse plants of a season (up to 8, most watered first) and its total waterings. */
export function seasonPlants(s: AppState, span: SeasonSpan, today: DateKey, local: Tx['env']['local']): { plants: SeasonPlant[]; waterings: number } {
  const counts = checkinCounts(trackingOf(s), span.start, span.end, today);
  let waterings = 0;
  const rows: (SeasonPlant & { order: number })[] = [];
  for (const h of s.habits) {
    const n = counts[h.id]?.checkins ?? 0;
    waterings += n;
    if (n === 0 || h.startedOn > span.end || (h.archivedOn !== undefined && h.archivedOn < span.start)) continue;
    rows.push({
      habitId: h.id,
      plant: h.plant,
      fromStage: h.startedOn >= span.start ? 0 : stageOnDate(s, h, addDays(span.start, -1), local),
      toStage: stageOnDate(s, h, span.end, local),
      waterings: n,
      ...(h.companionId && s.pets[h.companionId] ? { petId: h.companionId } : {}),
      order: h.order,
    });
  }
  rows.sort((a, b) => b.waterings - a.waterings || a.order - b.order);
  return { plants: rows.slice(0, REVIEW_PLANTS).map(({ order: _o, ...p }) => p), waterings };
}

function shelfOf(s: Pick<AppState, 'seasons'>): SeasonShelf {
  return s.seasons ?? { filed: [] };
}

/** Whether a season (by its first day) is already filed or pending. */
function known(shelf: SeasonShelf, key: DateKey): boolean {
  return shelf.pending?.key === key || shelf.filed.some((r) => r.key === key);
}

/**
 * The season work of a new app day (rollover.openDay; `previous` = the last app day seen before
 * it): files what ended since, and raises the review card for the season just ended when she was
 * here during it. See the module doc.
 */
export function openSeason(tx: Tx, previous: DateKey, timeZone?: string): void {
  const s = tx.s;
  if (!s.profile.onboarded || previous === '' || previous >= tx.env.today) return;
  const h = hemisphereOf(s, timeZone);
  const cur = seasonAt(tx.env.today, h);
  const was = seasonAt(previous, h);
  if (was.start >= cur.start) return;
  let shelf: SeasonShelf = { ...shelfOf(s), filed: [...shelfOf(s).filed] };
  const lastEnded = seasonAt(addDays(cur.start, -1), h);
  // The seasons from the one she was last in to the one just ended, oldest first (bounded).
  const spans: SeasonSpan[] = [];
  for (let sp = lastEnded; sp.start >= was.start && spans.length < MAX_FILED_AT_ONCE; sp = seasonAt(addDays(sp.start, -1), h)) spans.unshift(sp);
  let changed = false;
  if (shelf.pending && shelf.pending.key < lastEnded.start) {
    shelf.filed.push({ ...shelf.pending, filed: 'skipped' });
    delete shelf.pending;
    changed = true;
  }
  for (const sp of spans) {
    if (known(shelf, sp.start)) continue;
    const { plants, waterings } = seasonPlants(tx.s, sp, tx.env.today, tx.env.local);
    if (plants.length === 0) continue;
    const record: SeasonRecord = { key: sp.start, name: sp.name, start: sp.start, end: sp.end, hemisphere: h, plants, waterings };
    changed = true;
    if (sp.start === lastEnded.start && was.start === lastEnded.start) {
      shelf = { ...shelf, pending: record };
      tx.emit({ type: 'seasonReview', season: sp.name, key: sp.start });
    } else shelf.filed.push({ ...record, filed: 'silent' });
  }
  if (changed) {
    shelf.filed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    tx.set('seasons', shelf);
  }
}

/* ------------------------------------------------------------------ */
/* Fresh-start chips                                                   */
/* ------------------------------------------------------------------ */

export type FreshStartChoice = 'keep' | 'tinier' | 'grow' | 'rest' | 'finish';

export interface FreshStartOptions {
  habitId: string;
  /** A smaller version of the rule in effect today, or null when there is none to suggest. */
  tinier: Partial<HabitInput> | null;
  /** A bigger version, and whether accepting it pays the Grow stamp ("Ready to grow?" stands). */
  grow: { patch: Partial<HabitInput>; pays: boolean } | null;
  /** "Rest till next season": paused through this day, back the day after. */
  restUntil: DateKey;
  /** "Finish": to the balcony shelf with a ribbon. */
  finish: true;
}

const nextOf = (list: readonly number[], v: number): number | null => list.find((x) => x > v) ?? null;

/** A smaller rule (see module doc of the chips): half the count, one fewer time, or a rarer rhythm. */
export function tinierPatch(habit: Habit, today: DateKey): Partial<HabitInput> | null {
  const r = ruleAt(habit, today);
  const s = r.schedule;
  if (isDayBased(s) && r.target > 1) {
    const target = Math.max(1, Math.ceil(r.target / 2));
    if (target >= r.target) return null;
    const tiny = r.tiny && r.tiny.count !== undefined && r.tiny.count >= target ? { label: r.tiny.label } : undefined;
    return { target, ...(tiny ? { tiny } : {}) };
  }
  if (s.kind === 'weekly' || s.kind === 'monthly') {
    if (s.times > 1) return { schedule: { ...s, times: s.times - 1 } as HabitInput['schedule'], target: 1 };
    const every = nextOf(s.kind === 'weekly' ? WEEKLY_EVERY : MONTHLY_EVERY, s.every);
    return every === null ? null : { schedule: { ...s, every } as HabitInput['schedule'], target: 1 };
  }
  if (s.kind === 'daily') return { schedule: { kind: 'weekly', times: 5, every: 1 }, target: 1 };
  if (s.kind === 'days' && s.days.length > 1) return { schedule: { kind: 'weekly', times: s.days.length - 1, every: 1 }, target: 1 };
  return null;
}

/** A bigger rule: one more step of the count, one more time a period, or one more day of the week. */
export function growPatch(habit: Habit, today: DateKey): Partial<HabitInput> | null {
  const r = ruleAt(habit, today);
  const s = r.schedule;
  if (isDayBased(s) && r.target > 1) return { target: Math.min(RULE_LIMITS.targetMax, r.target + Math.max(1, r.step)) };
  if (s.kind === 'weekly' && s.times < RULE_LIMITS.weeklyTimesPerWeek * s.every) return { schedule: { ...s, times: s.times + 1 }, target: 1 };
  if (s.kind === 'monthly' && s.times < RULE_LIMITS.monthlyTimesPerMonth * s.every) return { schedule: { ...s, times: s.times + 1 }, target: 1 };
  if (s.kind === 'days' && s.days.length < 7) {
    const add = ([1, 2, 3, 4, 5, 6, 0] as const).find((d) => !s.days.includes(d))!;
    return { schedule: { kind: 'days', days: [...s.days, add].sort((a, b) => a - b) } };
  }
  return null;
}

/** The chips for one live habit. */
export function freshStartOptions(s: AppState, habit: Habit, today: DateKey, h: Hemisphere): FreshStartOptions {
  const grow = growPatch(habit, today);
  const rule = ruleAt(habit, today);
  const bigger = grow !== null && isBiggerRule(rule, { schedule: grow.schedule ?? rule.schedule, target: grow.target ?? rule.target });
  return {
    habitId: habit.id,
    tinier: tinierPatch(habit, today),
    grow: grow && bigger ? { patch: grow, pays: currentOffer(s, habit, today) === 'grow' } : null,
    restUntil: addDays(nextSeasonStart(today, h), -1),
    finish: true,
  };
}

export interface FreshStartInput {
  habitId: string;
  choice: FreshStartChoice;
  /** Overrides the suggested rule for Tinier / Grow (the editor's own choice). */
  patch?: Partial<HabitInput>;
}

export interface FreshStartOutcome {
  habitId: string;
  choice: FreshStartChoice;
  ok: boolean;
}

/**
 * Applies fresh-start choices: Tinier edits the rule from today (this period), Grow applies the
 * bigger rule from tomorrow (+1 stamp only through a standing "Ready to grow?"), Rest pauses till
 * the next season, Finish retires with a ribbon. Keep changes nothing. Invalid choices are skipped.
 */
export function applyFreshStart(tx: Tx, choices: readonly FreshStartInput[], timeZone?: string): FreshStartOutcome[] {
  const out: FreshStartOutcome[] = [];
  const today = tx.env.today;
  const h = hemisphereOf(tx.s, timeZone);
  const seen = new Set<string>();
  for (const c of choices) {
    const habit = tx.s.habits.find((x) => x.id === c.habitId);
    if (!habit || habit.archivedOn !== undefined || seen.has(c.habitId)) {
      out.push({ habitId: c.habitId, choice: c.choice, ok: false });
      continue;
    }
    seen.add(c.habitId);
    let ok = true;
    try {
      switch (c.choice) {
        case 'keep':
          break;
        case 'tinier': {
          const patch = c.patch ?? tinierPatch(habit, today);
          if (patch) updateHabit(tx, habit.id, patch, 'today');
          else ok = false;
          break;
        }
        case 'grow': {
          const patch = c.patch ?? growPatch(habit, today);
          if (!patch) ok = false;
          else if (!acceptGrowOffer(tx, habit.id, patch)) updateHabit(tx, habit.id, patch, 'tomorrow');
          break;
        }
        case 'rest':
          ok = pauseHabit(tx, habit.id, today, addDays(nextSeasonStart(today, h), -1));
          break;
        case 'finish':
          ok = retireWithRibbon(tx, habit.id);
          break;
      }
    } catch {
      ok = false;
    }
    out.push({ habitId: c.habitId, choice: c.choice, ok });
  }
  return out;
}

/**
 * Closes the Season Review card: with choices (or none: "Keep everything") it is filed as
 * reviewed; `skip` ("Later") files it as skipped. False when no card is pending.
 */
export function resolveSeasonReview(tx: Tx, choices: readonly FreshStartInput[] | 'skip', timeZone?: string): FreshStartOutcome[] | false {
  const shelf = tx.s.seasons;
  const pending = shelf?.pending;
  if (!shelf || !pending) return false;
  const outcomes = choices === 'skip' ? [] : applyFreshStart(tx, choices, timeZone);
  const filed = [...shelf.filed, { ...pending, filed: choices === 'skip' ? ('skipped' as const) : ('reviewed' as const) }];
  filed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  tx.set('seasons', { filed });
  return outcomes;
}

/* ------------------------------------------------------------------ */
/* Retiring with a ribbon                                              */
/* ------------------------------------------------------------------ */

/**
 * "Finish": the habit retires to the balcony shelf with a ribbon, archived as of yesterday (today
 * too when today was already watered), so today is never an open day it could fall short on.
 * Finished before its first day had anything to show (the day it was created, nothing watered),
 * its lifetime is empty: `unstarted`, kept with `archivedOn = ribbon = startedOn` for older
 * validators, so its first day is never a missed day (WP-B5, domain-d6). Nothing is made up.
 */
export function retireWithRibbon(tx: Tx, habitId: string, lastDay?: DateKey): boolean {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  if (!habit || habit.archivedOn !== undefined) return false;
  const today = tx.env.today;
  let last = lastDay;
  if (last === undefined) {
    const doneToday = showedUp(logStatus(tx.s.logs[habitId]?.[today], ruleAt(habit, today), false));
    last = doneToday ? today : addDays(today, -1);
  }
  const unstarted = last < habit.startedOn;
  if (unstarted) last = habit.startedOn;
  freeCompanion(tx, habitId);
  unstackFollowers(tx, habitId);
  const w = tx.habit(habitId);
  w.archivedOn = last;
  w.ribbon = last;
  if (unstarted) w.unstarted = true;
  tx.emit({ type: 'retired', habitId, ribbon: true });
  return true;
}

/** "Just this season" habits whose last day has passed retire with a ribbon (rollover.openDay). */
export function retireEndedHabits(tx: Tx): void {
  for (const h of tx.s.habits) {
    if (h.endsOn === undefined || h.archivedOn !== undefined || h.endsOn >= tx.env.today) continue;
    retireWithRibbon(tx, h.id, h.endsOn);
  }
}

/** "Just this season": the last day of the season `today` is in. */
export function justThisSeasonEnd(s: Pick<AppState, 'settings'>, today: DateKey, timeZone?: string): DateKey {
  return seasonAt(today, hemisphereOf(s, timeZone)).end;
}
