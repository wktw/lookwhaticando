/**
 * Rituals: the Weekly Letter and the Monthly Bouquet (DESIGN §13.10 "Rituals", overriding the
 * §13.5 letter/bloom stars; top-up mechanics from §13.5).
 *
 * - On the first open of a new week, last week's letter is written (if that week had any check-in):
 *   1★ for showing up, +1★ at ≥ 60%, +1★ at ≥ 85% (the bonus tiers need ≥ 5 expected).
 *   Contents: top habit by check-ins, plant stage-ups, new friends, a quoted note, show-up days.
 * - On the first open of a new month, last month's bouquet is always given (once the meadow existed
 *   that month): every habit with ≥ 1 check-in adds clamp(round(checkIns/4), 1, 7) stems.
 *   Stars: 1★ for showing up, +1★ ≥ 70%, +1★ ≥ 85%, +1★ "Growing" (≥ 5 pts above the month before);
 *   the bonus tiers need ≥ 10 expected (both months, for Growing).
 * - Both store the stars paid (`once['weekly|<weekStart>']`, `once['bloom|<YYYY-MM>']`) and pay
 *   only **upward differences** when a backfill inside the 6-day window raises the tier; never down.
 * - Only the most recent closed week/month is ever written (no backlog after a long break), and
 *   nothing is written or topped up while the clock guard pauses rewards.
 * - Percentages use the displayed (rounded) consistency, so the stars match what the user sees.
 */
import type { AppState, BouquetStem, DateKey, Letter } from '@/state/types';
import { evaluateBadges } from './badges';
import { aggregateTally, isPctReady, logsFor, monthWindow, percent, trackingOf, weekWindow, type Tally } from './consistency';
import { inLifetime, logStatus, showedUp } from './activity';
import { addDays, appDayKey, eachDay, endOfMonth, minDateKey, monthFromIndex, monthIndex, startOfMonth, startOfWeek, type MonthKey } from './dates';
import { memoByHabit } from './economy';
import { plantStage, sunshineFromHistory } from './growth';
import { checkinCounts } from './insights';
import { ruleAt } from './rules';
import type { Tx } from './tx';
import { grantStars, rewardsPaused, setOnce } from './wallet';

export const WEEKLY_LETTER = { showUpStars: 1, minExpected: 5, tiers: [60, 85] } as const;
export const MONTHLY_BOUQUET = { showUpStars: 1, minExpected: 10, tiers: [70, 85], growingPts: 5, perStem: 4, maxStems: 7 } as const;
/** Steady Month badge: ≥ 80% in a closed month with ≥ 10 expected (§6.5). */
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
  if (checkins < 1) return { stars: 0, growing: false };
  let stars = MONTHLY_BOUQUET.showUpStars;
  let growing = false;
  if (isPctReady(tally)) {
    const pct = percent(tally)!;
    for (const t of MONTHLY_BOUQUET.tiers) if (pct >= t) stars++;
    if (previous && isPctReady(previous) && pct - percent(previous)! >= MONTHLY_BOUQUET.growingPts) {
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

const profileCreatedOn = (s: AppState, tx: Tx): DateKey => appDayKey(s.profile.createdAt, s.settings.dayStartsAt, tx.env.local);

/** The most recent note written in [start, end] (quoted back warmly). */
function newestNote(s: AppState, start: DateKey, end: DateKey): Weekly['quote'] {
  let best: Weekly['quote'];
  for (const h of s.habits) {
    for (const [date, log] of Object.entries(s.logs[h.id] ?? {})) {
      const text = log.note?.trim();
      if (!text || date < start || date > end) continue;
      if (!best || date > best.date) best = { habitId: h.id, date, text };
    }
  }
  return best;
}

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
      const d = appDayKey(p.obtainedAt, s.settings.dayStartsAt, local);
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
  const quote = newestNote(s, weekStart, end);
  return {
    weekStart,
    achieved: tally.achieved,
    expected: tally.expected,
    showUpDays: showUpDaysIn(s, weekStart, end, today),
    ...(bestHabitId ? { bestHabitId } : {}),
    ...(quote ? { quote } : {}),
    newFriends,
    plantsGrown,
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
 * week overlapping an earlier letter's week gets no second letter (§13.10 letters are once per week).
 */
function overlapsLetteredWeek(s: AppState, weekStart: DateKey): boolean {
  for (let d = -6; d <= 6; d++) if (d !== 0 && s.ledger.once[`weekly|${addDays(weekStart, d)}`] !== undefined) return true;
  return false;
}

/** Writes last week's letter, or tops it up. */
export function ensureWeeklyLetter(tx: Tx): void {
  const s = tx.s;
  const today = tx.env.today;
  const weekStart = addDays(startOfWeek(today, s.settings.weekStart), -7);
  if (profileCreatedOn(s, tx) > addDays(weekStart, 6) || !s.habits.some((h) => h.startedOn <= addDays(weekStart, 6))) return;
  const key = `weekly|${weekStart}`;
  const paid = s.ledger.once[key];
  const facts = weeklyFacts(s, weekStart, today, tx.env.local);
  const stars = weeklyStars({ achieved: facts.achieved, expected: facts.expected, tiny: 0 }, facts.showUpDays);
  const id = `weekly-${weekStart}`;
  if (paid === undefined) {
    if (facts.showUpDays < 1 || overlapsLetteredWeek(s, weekStart)) return;
    setOnce(tx, key, stars);
    upsertLetter(tx, { kind: 'weekly', id, ...facts, stars });
    tx.emit({ type: 'letter', letterId: id });
    grantStars(tx, stars, 'letter');
    return;
  }
  const before = typeof paid === 'number' ? paid : 0;
  if (stars <= before) return;
  setOnce(tx, key, stars);
  const existing = s.inbox.find((l) => l.id === id);
  upsertLetter(tx, { kind: 'weekly', id, ...facts, stars, ...(existing?.readAt !== undefined ? { readAt: existing.readAt } : {}) });
  grantStars(tx, stars - before, 'letter');
}

/** Writes last month's bouquet, or tops it up. */
export function ensureMonthlyBouquet(tx: Tx): void {
  const s = tx.s;
  const today = tx.env.today;
  const month = monthFromIndex(monthIndex(today) - 1);
  const monthStart = `${month}-01`;
  const monthEnd = endOfMonth(monthStart);
  if (profileCreatedOn(s, tx) > monthEnd || !s.habits.some((h) => h.startedOn <= monthEnd)) return;
  const key = `bloom|${month}`;
  const paid = s.ledger.once[key];
  const f = monthFacts(s, month, today);
  const { stars, growing } = bouquetStars(f.tally, f.checkins, f.previous);
  const pct = percent(f.tally);
  const prevPct = isPctReady(f.previous) ? percent(f.previous) : null;
  const id = `bouquet-${month}`;
  const existing = s.inbox.find((l) => l.id === id);
  const letter: Monthly = {
    kind: 'monthly',
    id,
    month,
    achieved: f.tally.achieved,
    expected: f.tally.expected,
    stars,
    ...(prevPct !== null ? { previousPct: prevPct } : {}),
    growingBonus: growing,
    stems: f.stems,
    ...(existing?.readAt !== undefined ? { readAt: existing.readAt } : {}),
  };
  const steady = isPctReady(f.tally) && pct !== null && pct >= STEADY_MONTH_PCT;
  if (paid === undefined) {
    setOnce(tx, key, stars);
    upsertLetter(tx, letter);
    tx.emit({ type: 'letter', letterId: id });
    grantStars(tx, stars, 'bloom');
  } else {
    const before = typeof paid === 'number' ? paid : 0;
    if (stars <= before) {
      if (steady) evaluateBadges(tx, { steadyMonth: true });
      return;
    }
    setOnce(tx, key, stars);
    upsertLetter(tx, letter);
    grantStars(tx, stars - before, 'bloom');
  }
  if (steady) evaluateBadges(tx, { steadyMonth: true });
}

/**
 * Letters for the most recent closed week and month: written on the first open of a new week /
 * month, topped up after reward-path changes inside them. No-op before onboarding or while paused.
 */
export function ensureLetters(tx: Tx): void {
  if (!tx.s.profile.onboarded || rewardsPaused(tx.s, tx.env.now)) return;
  ensureWeeklyLetter(tx);
  ensureMonthlyBouquet(tx);
}

/** Whether a reward-path change on `date` can move a letter (it lies in last week or last month). */
export function touchesLetters(s: AppState, date: DateKey, today: DateKey): boolean {
  return date < startOfWeek(today, s.settings.weekStart) || date < startOfMonth(today);
}

/** Marks a letter as read (it stays in the Letterbox forever). */
export function readLetter(tx: Tx, id: string): boolean {
  const i = tx.s.inbox.findIndex((l) => l.id === id);
  if (i < 0 || tx.s.inbox[i]!.readAt !== undefined) return false;
  const inbox = tx.section('inbox');
  inbox[i] = { ...inbox[i]!, readAt: tx.env.now };
  return true;
}
