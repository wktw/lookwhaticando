/**
 * Rituals: the Sunday Note (weekly; internally the "weekly letter") and the Herbarium page
 * (monthly; internally the "bouquet": its once-key is still `bloom|<YYYY-MM>`), DESIGN §6 and §13.
 * Their contents (highlights, the P.S., pressings, the margin note) come from rituals.ts.
 *
 * - The Sunday Note arrives on the week's last day (a Sunday for a Monday week), from 18:00
 *   (`SUNDAY_NOTE_HOUR`; the small hours before the day start still belong to that evening), if the
 *   week had any check-in: 1 stamp for showing up, +1 at ≥ 60%, +1 at ≥ 85% (the bonus tiers need
 *   ≥ 5 expected). Waterings later that evening top it up like a backfill. A week whose last evening
 *   passed without an open gets its note on the first open of the next week, as before.
 *   Contents: waterings, two highlights, a starred note quoted, a P.S. (rituals.ts), show-up days.
 * - On the first open of a new month, last month's page is always given (once the profile existed
 *   that month): every habit watered or rested that month is pressed, sized by its waterings.
 *   Stamps: 1 for showing up, +1 ≥ 70%, +1 ≥ 85%, +1 when ≥ 5 pts above the month before; the bonus
 *   tiers need ≥ 10 expected (both months, for the last one).
 * - Both store the stars paid (`once['weekly|<weekStart>']`, `once['bloom|<YYYY-MM>']`) and pay
 *   only **upward differences** when a backfill inside the 6-day window raises the tier; never down.
 *   A top-up applies exactly the change that reward-path action made to the letter's tally (the
 *   habit's tally with the new log minus with the old one) to the tally the letter already holds,
 *   so nothing else moves a letter after it is written: not history edits of older days (v1 §13.2
 *   "never touch the wallet"), not deleting a poorly kept habit, and not an un-check followed by
 *   the same re-check.
 * - Only the most recent closed week/month is ever written (no backlog after a long break), and
 *   nothing is written or topped up while the clock guard pauses rewards.
 * - Percentages use the displayed (rounded) consistency, so the stars match what the user sees.
 */
import type { AppState, BouquetStem, DateKey, Letter } from '@/state/types';
import { evaluateBadges } from './badges';
import { aggregateTally, evalContext, habitTally, isPctReady, logsFor, monthWindow, percent, trackingOf, weekWindow, type StatWindow, type Tally } from './consistency';
import { inLifetime, logStatus, showedUp } from './activity';
import { addDays, eachDay, endOfMonth, minDateKey, monthFromIndex, monthIndex, startOfWeek, type MonthKey } from './dates';
import { memoByHabit } from './economy';
import { plantStage, sunshineFromHistory } from './growth';
import { checkinCounts } from './insights';
import { ruleAt } from './rules';
import { arrivalDay, movedInOn } from './eventDays';
import { herbariumFacts, starredNote, sundayNoteFacts } from './rituals';
import type { Tx } from './tx';
import { grantStars, hasOnce, rewardsPaused, setOnce } from './wallet';

export const WEEKLY_LETTER = { showUpStars: 1, minExpected: 5, tiers: [60, 85] } as const;
export const MONTHLY_BOUQUET = { showUpStars: 1, minExpected: 10, tiers: [70, 85], growingPts: 5, perStem: 4, maxStems: 7 } as const;
/** Steady Month badge: ≥ 80% in a closed month with ≥ 10 expected (the Steady Month pin, §9.2). */
export const STEADY_MONTH_PCT = 80;

type Weekly = Extract<Letter, { kind: 'weekly' }>;
type Monthly = Extract<Letter, { kind: 'monthly' }>;

/** Stars for a week: 1 for any check-in, then +1 per tier reached (needs ≥ 5 expected). */
export function weeklyStars(tally: Tally, showUpDays: number): number {
  if (showUpDays < 1) return 0;
  let stars = WEEKLY_LETTER.showUpStars;
  if (tally.expected >= WEEKLY_LETTER.minExpected) {
    const pct = percent(tally)!;
    for (const t of WEEKLY_LETTER.tiers) if (pct >= t) stars++;
  }
  return stars;
}

/** Stars for a month (see module doc). `previous` is last month's tally. */
export function bouquetStars(tally: Tally, checkins: number, previous: Tally | null): { stars: number; growing: boolean } {
  return bouquetStarsVs(tally, checkins, previous && isPctReady(previous) ? percent(previous) : null);
}

/** Stars for a month against the month before's displayed percent (null when it had < 10 expected). */
function bouquetStarsVs(tally: Tally, checkins: number, previousPct: number | null): { stars: number; growing: boolean } {
  if (checkins < 1) return { stars: 0, growing: false };
  let stars = MONTHLY_BOUQUET.showUpStars;
  let growing = false;
  if (isPctReady(tally)) {
    const pct = percent(tally)!;
    for (const t of MONTHLY_BOUQUET.tiers) if (pct >= t) stars++;
    if (previousPct !== null && pct - previousPct >= MONTHLY_BOUQUET.growingPts) {
      growing = true;
      stars++;
    }
  }
  return { stars, growing };
}

/** Bouquet stems for a habit with `checkins` check-ins that month. */
export function stemsFor(checkins: number): number {
  return checkins < 1 ? 0 : Math.min(MONTHLY_BOUQUET.maxStems, Math.max(1, Math.round(checkins / MONTHLY_BOUQUET.perStem)));
}

/* ------------------------------------------------------------------ */
/* Letter facts (pure)                                                 */
/* ------------------------------------------------------------------ */

const profileCreatedOn = (s: AppState, tx: Tx): DateKey => movedInOn(s, tx.env.local);

/** Everything a weekly letter says about the week starting `weekStart`, as of `today`. */
export function weeklyFacts(s: AppState, weekStart: DateKey, today: DateKey, local: Tx['env']['local']): Omit<Weekly, 'id' | 'kind' | 'stars'> {
  const t = trackingOf(s);
  const end = addDays(weekStart, 6);
  const tally = aggregateTally(t, weekWindow(weekStart, s.settings.weekStart), today).total;
  const counts = checkinCounts(t, weekStart, end, today);
  let bestHabitId: string | undefined;
  let bestCount = 0;
  for (const h of [...s.habits].sort((a, b) => a.order - b.order)) {
    const n = counts[h.id]?.checkins ?? 0;
    if (n > bestCount) [bestHabitId, bestCount] = [h.id, n];
  }
  const newFriends = Object.values(s.pets)
    .filter((p) => {
      const d = arrivalDay(s, p, local);
      return d >= weekStart && d <= end;
    })
    .map((p) => p.id);
  const before = { today: addDays(weekStart, -1), weekStart: s.settings.weekStart, offDays: s.offDays };
  const after = { today: end, weekStart: s.settings.weekStart, offDays: s.offDays };
  const plantsGrown = s.habits
    .filter((h) => h.startedOn <= end)
    .filter((h) => {
      // History-derived stages at the week's edges (memoised: the same walks recur daily and on top-ups).
      const logs = logsFor(t, h.id);
      const stageAt = (ctx: typeof before) =>
        memoByHabit(h, logs, ctx, 'stage-at', () => {
          const x = sunshineFromHistory(h, logs, ctx);
          return plantStage(x.sunshine, x.completedOccurrences);
        });
      return stageAt(after) > stageAt(before);
    })
    .map((h) => h.id);
  const quote = starredNote(s, weekStart, end);
  const note = sundayNoteFacts(s, weekStart, today, local);
  return {
    weekStart,
    achieved: tally.achieved,
    expected: tally.expected,
    showUpDays: showUpDaysIn(s, weekStart, end, today),
    ...(bestHabitId ? { bestHabitId } : {}),
    ...(quote ? { quote } : {}),
    newFriends,
    plantsGrown,
    waterings: note.waterings,
    highlights: note.highlights,
    ...(note.ps ? { ps: note.ps } : {}),
  };
}

/** Days in [start, min(end, today)] with at least one check-in (done or tiny) on any habit. */
export function showUpDaysIn(s: AppState, start: DateKey, end: DateKey, today: DateKey): number {
  let n = 0;
  for (const d of eachDay(start, minDateKey(end, today))) {
    if (s.habits.some((h) => inLifetime(h, d) && showedUp(logStatus(s.logs[h.id]?.[d], ruleAt(h, d), d < today)))) n++;
  }
  return n;
}

export interface MonthFacts {
  tally: Tally;
  previous: Tally;
  checkins: number;
  stems: BouquetStem[];
}

export function monthFacts(s: AppState, month: MonthKey, today: DateKey): MonthFacts {
  const t = trackingOf(s);
  const i = monthIndex(month);
  const tally = aggregateTally(t, monthWindow(month), today).total;
  const previous = aggregateTally(t, monthWindow(monthFromIndex(i - 1)), today).total;
  const counts = checkinCounts(t, `${month}-01`, endOfMonth(`${month}-01`), today);
  let checkins = 0;
  const stems: BouquetStem[] = [];
  for (const h of [...s.habits].sort((a, b) => a.order - b.order)) {
    const n = counts[h.id]?.checkins ?? 0;
    checkins += n;
    if (n > 0) stems.push({ habitId: h.id, plant: h.plant, count: stemsFor(n) });
  }
  return { tally, previous, checkins, stems };
}

/* ------------------------------------------------------------------ */
/* Writing & topping up                                                */
/* ------------------------------------------------------------------ */

function upsertLetter(tx: Tx, letter: Letter): void {
  const inbox = tx.section('inbox');
  const i = inbox.findIndex((l) => l.id === letter.id);
  if (i >= 0) inbox[i] = letter;
  else inbox.push(letter);
}

/**
 * A letter already covers some of these days: changing the week-start setting regroups weeks, and a
 * week overlapping an earlier letter's week gets no second letter (v1 §13.10 letters are once per week).
 */
function overlapsLetteredWeek(s: AppState, weekStart: DateKey): boolean {
  for (let d = -6; d <= 6; d++) if (d !== 0 && s.ledger.once[`weekly|${addDays(weekStart, d)}`] !== undefined) return true;
  return false;
}

/** The hour the Sunday Note arrives on the week's last day (§13: it is a Sunday Note, not a Monday one). */
export const SUNDAY_NOTE_HOUR = 18;

/**
 * The week whose Sunday Note may arrive now, early: the current week, on its last app day from
 * 18:00 (or in the small hours before the day start, which still belong to that evening). Null
 * otherwise.
 */
export function earlyNoteWeek(s: Pick<AppState, 'settings'>, today: DateKey, now: number, local: Tx['env']['local']): DateKey | null {
  const weekStart = startOfWeek(today, s.settings.weekStart);
  if (addDays(weekStart, 6) !== today) return null;
  const t = local(now);
  const minutes = t.hour * 60 + t.minute;
  return minutes >= SUNDAY_NOTE_HOUR * 60 || minutes < s.settings.dayStartsAt ? weekStart : null;
}

/** Writes last week's note once (its first open), unless it arrived early. Later changes come only through `topUpLetters`. */
export function ensureWeeklyLetter(tx: Tx): void {
  writeWeeklyLetter(tx, addDays(startOfWeek(tx.env.today, tx.s.settings.weekStart), -7));
}

/** The Sunday Note for this week, from 18:00 on its last day (once; later waterings top it up). */
export function ensureEarlyWeeklyNote(tx: Tx): void {
  if (!tx.s.profile.onboarded || rewardsPaused(tx.s, tx.env.now)) return;
  const week = earlyNoteWeek(tx.s, tx.env.today, tx.env.now, tx.env.local);
  if (week !== null && tx.s.ledger.once[`weekly|${week}`] === undefined) writeWeeklyLetter(tx, week);
}

function writeWeeklyLetter(tx: Tx, weekStart: DateKey): void {
  const s = tx.s;
  const today = tx.env.today;
  const key = `weekly|${weekStart}`;
  if (s.ledger.once[key] !== undefined) return;
  if (profileCreatedOn(s, tx) > addDays(weekStart, 6) || !s.habits.some((h) => h.startedOn <= addDays(weekStart, 6))) return;
  const facts = weeklyFacts(s, weekStart, today, tx.env.local);
  if (facts.showUpDays < 1 || overlapsLetteredWeek(s, weekStart)) return;
  const stars = weeklyStars({ achieved: facts.achieved, expected: facts.expected, tiny: 0 }, facts.showUpDays);
  const id = `weekly-${weekStart}`;
  setOnce(tx, key, stars);
  upsertLetter(tx, { kind: 'weekly', id, ...facts, stars });
  tx.emit({ type: 'letter', letterId: id, kind: 'sundayNote' });
  grantStars(tx, stars, 'letter');
}

/** Writes last month's bouquet once (its first open). Later changes come only through `topUpLetters`. */
export function ensureMonthlyBouquet(tx: Tx): void {
  const s = tx.s;
  const today = tx.env.today;
  const month = monthFromIndex(monthIndex(today) - 1);
  const monthStart = `${month}-01`;
  const monthEnd = endOfMonth(monthStart);
  const key = `bloom|${month}`;
  if (s.ledger.once[key] !== undefined) return;
  if (profileCreatedOn(s, tx) > monthEnd || !s.habits.some((h) => h.startedOn <= monthEnd)) return;
  const f = monthFacts(s, month, today);
  const page = herbariumFacts(s, month, today, tx.env.local);
  const prevPct = isPctReady(f.previous) ? percent(f.previous) : null;
  const { stars, growing } = bouquetStarsVs(f.tally, f.checkins, prevPct);
  const pct = percent(f.tally);
  const id = `bouquet-${month}`;
  setOnce(tx, key, stars);
  upsertLetter(tx, {
    kind: 'monthly',
    id,
    month,
    achieved: f.tally.achieved,
    expected: f.tally.expected,
    stars,
    ...(prevPct !== null ? { previousPct: prevPct } : {}),
    growingBonus: growing,
    pressings: page.pressings,
    ...(page.margin ? { margin: page.margin } : {}),
    firstPage: page.firstPage,
  });
  tx.emit({ type: 'letter', letterId: id, kind: 'herbarium' });
  grantStars(tx, stars, 'herbarium');
  if (isPctReady(f.tally) && pct !== null && pct >= STEADY_MONTH_PCT) evaluateBadges(tx, { steadyMonth: true });
}

/**
 * Letters for the most recent closed week and month, written on the first open of a new week /
 * month (reward-path changes top them up through `topUpLetters`). No-op before onboarding or while
 * paused.
 */
export function ensureLetters(tx: Tx): void {
  if (!tx.s.profile.onboarded || rewardsPaused(tx.s, tx.env.now)) return;
  ensureWeeklyLetter(tx);
  ensureMonthlyBouquet(tx);
  ensureEarlyWeeklyNote(tx);
}

/**
 * A reward-path change to one habit's log on `date` (`before` = the state before it). When `date`
 * lies in last week or last month, that letter takes the change's delta: written now if it wasn't
 * yet (a backfill can bring last week's first check-in), otherwise topped up by upward differences.
 */
export function topUpLetters(tx: Tx, before: AppState, habitId: string, date: DateKey): void {
  const s = tx.s;
  if (!s.profile.onboarded || rewardsPaused(s, tx.env.now)) return;
  const today = tx.env.today;
  const lastWeek = addDays(startOfWeek(today, s.settings.weekStart), -7);
  if (date >= lastWeek && date <= addDays(lastWeek, 6)) {
    if (!hasOnce(s, `weekly|${lastWeek}`)) ensureWeeklyLetter(tx);
    else topUpWeekly(tx, lastWeek, habitDelta(tx, before, habitId, weekWindow(lastWeek, s.settings.weekStart)), showUpDelta(tx, before, date));
  }
  // This week's note, when it arrived early (its last evening): a later watering that day tops it up.
  const thisWeek = startOfWeek(today, s.settings.weekStart);
  if (date >= thisWeek) {
    if (hasOnce(s, `weekly|${thisWeek}`)) topUpWeekly(tx, thisWeek, habitDelta(tx, before, habitId, weekWindow(thisWeek, s.settings.weekStart)), showUpDelta(tx, before, date));
    else ensureEarlyWeeklyNote(tx);
  }
  const month = monthFromIndex(monthIndex(today) - 1);
  if (date.startsWith(`${month}-`)) {
    if (!hasOnce(s, `bloom|${month}`)) ensureMonthlyBouquet(tx);
    else topUpBouquet(tx, month, habitDelta(tx, before, habitId, monthWindow(month)), date);
  }
}

/** The change in one habit's tally over a window between `before` and now (as of today). */
function habitDelta(tx: Tx, before: AppState, habitId: string, w: StatWindow): Tally {
  const now = tx.s.habits.find((h) => h.id === habitId);
  const then = before.habits.find((h) => h.id === habitId);
  const tallyOf = (st: AppState, h: typeof now) => (h ? habitTally(h, logsFor(trackingOf(st), h.id), w, evalContext(trackingOf(st), tx.env.today)) : null);
  const a = tallyOf(before, then);
  const b = tallyOf(tx.s, now);
  return { achieved: (b?.achieved ?? 0) - (a?.achieved ?? 0), expected: (b?.expected ?? 0) - (a?.expected ?? 0), tiny: (b?.tiny ?? 0) - (a?.tiny ?? 0) };
}

/** Did `date` gain (+1) or lose (−1) its only check-in across habits? */
function showUpDelta(tx: Tx, before: AppState, date: DateKey): number {
  const today = tx.env.today;
  return showUpDaysIn(tx.s, date, date, today) - showUpDaysIn(before, date, date, today);
}

function topUpWeekly(tx: Tx, weekStart: DateKey, delta: Tally, showUps: number): void {
  const key = `weekly|${weekStart}`;
  const id = `weekly-${weekStart}`;
  const i = tx.s.inbox.findIndex((l) => l.id === id);
  const letter = tx.s.inbox[i];
  if (!letter || letter.kind !== 'weekly') return;
  const tally: Tally = { achieved: Math.max(0, letter.achieved + delta.achieved), expected: Math.max(0, letter.expected + delta.expected), tiny: 0 };
  const showUpDays = Math.max(0, letter.showUpDays + showUps);
  const inbox = tx.section('inbox');
  inbox[i] = { ...letter, achieved: tally.achieved, expected: tally.expected, showUpDays };
  const paid = tx.s.ledger.once[key];
  const before = typeof paid === 'number' ? paid : 0;
  const stars = weeklyStars(tally, showUpDays);
  if (stars <= before) return;
  setOnce(tx, key, stars);
  inbox[i] = { ...inbox[i]!, stars } as Weekly;
  grantStars(tx, stars - before, 'letter');
}

function topUpBouquet(tx: Tx, month: MonthKey, delta: Tally, date: DateKey): void {
  const key = `bloom|${month}`;
  const id = `bouquet-${month}`;
  const i = tx.s.inbox.findIndex((l) => l.id === id);
  const letter = tx.s.inbox[i];
  if (!letter || letter.kind !== 'monthly') return;
  const tally: Tally = { achieved: Math.max(0, letter.achieved + delta.achieved), expected: Math.max(0, letter.expected + delta.expected), tiny: 0 };
  // The show-up star needs a check-in that month: the letter's own, or the one just made.
  const checkedIn = (letter.stems?.length ?? 0) > 0 || (letter.pressings ?? []).some((p) => p.waterings > 0) || letter.stars > 0 || showedUpOn(tx.s, date, tx.env.today);
  const { stars, growing } = bouquetStarsVs(tally, checkedIn ? 1 : 0, letter.previousPct ?? null);
  const inbox = tx.section('inbox');
  inbox[i] = { ...letter, achieved: tally.achieved, expected: tally.expected };
  const paid = tx.s.ledger.once[key];
  const before = typeof paid === 'number' ? paid : 0;
  const pct = percent(tally);
  if (isPctReady(tally) && pct !== null && pct >= STEADY_MONTH_PCT) evaluateBadges(tx, { steadyMonth: true });
  if (stars <= before) return;
  setOnce(tx, key, stars);
  inbox[i] = { ...inbox[i]!, stars, growingBonus: growing } as Monthly;
  grantStars(tx, stars - before, 'herbarium');
}

/** Any habit shows up on `date`. */
function showedUpOn(s: AppState, date: DateKey, today: DateKey): boolean {
  return showUpDaysIn(s, date, date, today) > 0;
}

/** Marks a Sunday Note or Herbarium page as read (it stays on the memory shelf forever). */
export function readLetter(tx: Tx, id: string): boolean {
  const i = tx.s.inbox.findIndex((l) => l.id === id);
  if (i < 0 || tx.s.inbox[i]!.readAt !== undefined) return false;
  const inbox = tx.section('inbox');
  inbox[i] = { ...inbox[i]!, readAt: tx.env.now };
  return true;
}
