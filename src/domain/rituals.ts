/**
 * Ritual contents (DESIGN §13): what a Sunday Note and a Herbarium page say, the birthday cards,
 * came-home days and the moving-in anniversary. Data only: the voice layer words them
 * (`SUNDAY_NOTE`, `HERBARIUM` in lines.ts). letters.ts writes the notes and pages and pays their
 * stamps (§6); this module works out their contents, frozen when written.
 *
 * - **Sunday Note**: the week's waterings; up to two highlights, most specific first: a plant
 *   stage-up (with its companion, when that pet has kept it company since that day), a newcomer
 *   (and the plant it moved into), a habit watered every day or else the most watered, a new
 *   plant, tiny-version days (≥ 2), kept-together days (≥ 3); a quoted note only if she starred it
 *   (and "Quote my notes" is on); a P.S.: the pet and habit that shared the most days that week
 *   (days the habit showed up, the pet kept it company at the day's close and its routine had
 *   started at Potted; stints.ts), with its routine, else a found thing. Never a percentage.
 *   WP-B6: the routine (the habit's icon) and the plant species are frozen into the letter, so an
 *   icon or plant edit never rewrites what a written note says (names still follow renames).
 * - **Herbarium page**: every habit watered or rested that month is pressed, sized by waterings
 *   (1–7; 0 with only rest days, which press as small flowers); one margin note if true (a plant
 *   reached Blooming, a pet came home, a plant was planted); the very first page is marked.
 * - **Birthday**: each pet out on the Shelf leaves a one-line card; the cake and ticket come from
 *   rollover.birthdaySurprise.
 * - **Came-home days**: a pet's arrival day comes round each year (Feb 29 falls on Feb 28).
 * - **Moving-in anniversary**: a yearly note on the anniversary of the profile's first day,
 *   written on the first open within a week of it. It pays nothing.
 * Arrival and moving-in days are the days stored at the event (eventDays.ts, WP-B6).
 */
import type { AppState, DateKey, Habit, HerbariumMargin, HerbariumPressing, Letter, SundayHighlight, SundayPS } from '@/state/types';
import { inLifetime, logStatus, showedUp } from './activity';
import { companionOf, companyOf, pairOf } from './company';
import { addDays, eachDay, endOfMonth, parseDateKey, recurringDay, type LocalTimeReader, type MonthKey } from './dates';
import { arrivalDay, movedInOn } from './eventDays';
import { habitCreatedOn } from './economy';
import { BLOOMING, POTTED } from './growth';
import { checkinCounts } from './insights';
import { trackingOf } from './consistency';
import { ruleAt } from './rules';
import { keptTogetherDays } from './stacking';
import { currentStintFrom, keptCompanyOn } from './stints';
import type { Tx } from './tx';
import { hasOnce, rewardsPaused, setOnce } from './wallet';

export const SUNDAY_NOTE_RULES = { highlights: 2, tinyMin: 2, keptMin: 3 } as const;
/** An anniversary note is written on the first open within this many days of the day. */
export const ANNIVERSARY_GRACE_DAYS = 7;

type Weekly = Extract<Letter, { kind: 'weekly' }>;

export { arrivalDay, movedInOn };

/** The newest note she starred in [start, end] (the only kind a Sunday Note quotes). */
export function starredNote(s: Pick<AppState, 'habits' | 'logs' | 'settings'>, start: DateKey, end: DateKey): Weekly['quote'] {
  if (s.settings.quoteNotes === false) return undefined;
  let best: Weekly['quote'];
  for (const h of s.habits) {
    for (const [date, log] of Object.entries(s.logs[h.id] ?? {})) {
      const text = log.note?.trim();
      if (!text || !log.starred || date < start || date > end) continue;
      if (!best || date > best.date) best = { habitId: h.id, date, text };
    }
  }
  return best;
}

/** The highest stage a plant first reached in [start, end], and the day (from `stageDates`). */
function stageUpIn(s: Pick<AppState, 'stageDates'>, habitId: string, start: DateKey, end: DateKey): { stage: number; date: DateKey } | null {
  let best: { stage: number; date: DateKey } | null = null;
  for (const [st, d] of Object.entries(s.stageDates?.[habitId] ?? {})) {
    if (d === undefined || d < start || d > end) continue;
    if (!best || Number(st) > best.stage) best = { stage: Number(st), date: d };
  }
  return best;
}

/** Whether the companion's routine had started on `date`: the plant was Potted (routines start there). */
function routineStarted(s: Pick<AppState, 'stageDates' | 'ledger'>, habitId: string, date: DateKey): boolean {
  const potted = s.stageDates?.[habitId]?.[POTTED];
  // Potted before stage days were recorded: the day is unknown, so it counts as started.
  return potted !== undefined ? date >= potted : (s.ledger.bestStage[habitId] ?? 0) >= POTTED;
}

/**
 * The P.S.'s companion (domain-d3): the pet × habit that shared the most days in [start, last],
 * a day counting when the habit showed up, the pet kept it company at the day's close and the
 * routine had started. Habits in display order, the current companion before other pets; ties go
 * to the first.
 */
function companionPS(s: AppState, habits: Habit[], start: DateKey, last: DateKey, today: DateKey): SundayPS | undefined {
  let ps: SundayPS | undefined;
  let bestDays = 0;
  const pairs = Object.values(companyOf(s).pairs);
  for (const h of habits) {
    const mine = pairs.filter((p) => p.habitId === h.id && s.pets[p.petId]);
    if (mine.length === 0) continue;
    const days = start > last ? [] : eachDay(start, last).filter((d) => inLifetime(h, d) && routineStarted(s, h.id, d) && showedUp(logStatus(s.logs[h.id]?.[d], ruleAt(h, d), d < today)));
    mine.sort((a, b) => Number(b.petId === h.companionId) - Number(a.petId === h.companionId) || (a.petId < b.petId ? -1 : 1));
    for (const p of mine) {
      const n = days.filter((d) => keptCompanyOn(p, h, d)).length;
      if (n <= bestDays) continue;
      bestDays = n;
      ps = { kind: 'companion', petId: p.petId, habitId: h.id, days: n, timeOfDay: h.timeOfDay, icon: h.icon };
    }
  }
  return ps;
}

/** The Sunday Note's contents for the week [weekStart, weekStart+6] (see module doc). */
export function sundayNoteFacts(s: AppState, weekStart: DateKey, today: DateKey, local: LocalTimeReader): { waterings: number; highlights: SundayHighlight[]; ps?: SundayPS } {
  const end = addDays(weekStart, 6);
  const t = trackingOf(s);
  const counts = checkinCounts(t, weekStart, end, today);
  const habits = [...s.habits].sort((a, b) => a.order - b.order);
  let waterings = 0;
  for (const h of habits) waterings += counts[h.id]?.checkins ?? 0;
  const cands: SundayHighlight[] = [];

  // A plant stage-up: the biggest stage reached that week.
  let up: SundayHighlight | null = null;
  for (const h of habits) {
    const st = stageUpIn(s, h.id, weekStart, end);
    if (!st || st.stage < 1 || (up?.kind === 'stageUp' && st.stage <= up.stage)) continue;
    // Its companion only if it has kept the plant company since that day (it napped there "since").
    const petId = companionOf(s, h);
    const pair = petId ? pairOf(s, petId, h.id) : null;
    const since = pair ? currentStintFrom(pair, h) : null;
    up = { kind: 'stageUp', habitId: h.id, stage: st.stage, date: st.date, ...(petId && since !== null && since <= st.date ? { petId } : {}), plant: h.plant };
  }
  if (up) cands.push(up);

  // A newcomer (the first pet to come home that week), and the plant it moved into.
  const newcomer = Object.values(s.pets)
    .map((p) => ({ p, d: arrivalDay(s, p, local) }))
    .filter((x) => x.d >= weekStart && x.d <= end)
    .sort((a, b) => a.p.obtainedAt - b.p.obtainedAt)[0];
  if (newcomer) {
    const home = s.habits.find((h) => h.companionId === newcomer.p.id && h.archivedOn === undefined);
    cands.push({ kind: 'newcomer', petId: newcomer.p.id, date: newcomer.d, ...(home ? { habitId: home.id, plant: home.plant } : {}) });
  }

  // A habit watered every day, else the most watered.
  const everyDay = habits.find((h) => h.startedOn <= weekStart && eachDay(weekStart, end).every((d) => d <= today && inLifetime(h, d) && showedUp(logStatus(s.logs[h.id]?.[d], ruleAt(h, d), d < today))));
  if (everyDay) cands.push({ kind: 'everyDay', habitId: everyDay.id });
  else {
    let top: { id: string; n: number } | null = null;
    for (const h of habits) {
      const n = counts[h.id]?.checkins ?? 0;
      if (n > 0 && (!top || n > top.n)) top = { id: h.id, n };
    }
    if (top) cands.push({ kind: 'topHabit', habitId: top.id, days: top.n });
  }

  // A new plant.
  const planted = habits.find((h) => {
    const d = habitCreatedOn(h, s.settings.dayStartsAt, local);
    return d >= weekStart && d <= end;
  });
  if (planted) cands.push({ kind: 'newHabit', habitId: planted.id, date: habitCreatedOn(planted, s.settings.dayStartsAt, local), plant: planted.plant });

  // The tiny version, and a stack kept together.
  const tiny = habits.map((h) => ({ h, n: counts[h.id]?.tiny ?? 0 })).sort((a, b) => b.n - a.n)[0];
  if (tiny && tiny.n >= SUNDAY_NOTE_RULES.tinyMin) cands.push({ kind: 'tiny', habitId: tiny.h.id, days: tiny.n });
  for (const h of habits) {
    if (h.anchorHabitId === undefined) continue;
    const n = keptTogetherDays(s, h, today, weekStart, end);
    if (n >= SUNDAY_NOTE_RULES.keptMin) {
      cands.push({ kind: 'kept', habitId: h.id, anchorHabitId: h.anchorHabitId, days: n });
      break;
    }
  }

  // The P.S.: a companion's routine (the pair that shared the most days), else a found thing.
  let ps = companionPS(s, habits, weekStart, end < today ? end : today, today);
  if (!ps) {
    const found = [...(s.found ?? [])].filter((f) => f.date >= weekStart && f.date <= end).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (found) ps = { kind: 'found', petId: found.petId, date: found.date, seed: found.seed };
  }
  return { waterings, highlights: cands.slice(0, SUNDAY_NOTE_RULES.highlights), ...(ps ? { ps } : {}) };
}

/** A pressing's size: clamp(round(waterings / 4), 1, 7), 0 with only rest days. */
export function pressingSize(waterings: number): number {
  return waterings < 1 ? 0 : Math.min(7, Math.max(1, Math.round(waterings / 4)));
}

/** The Herbarium page's contents for `month` (see module doc). */
export function herbariumFacts(s: AppState, month: MonthKey, today: DateKey, local: LocalTimeReader): { pressings: HerbariumPressing[]; margin?: HerbariumMargin; firstPage: boolean } {
  const start = `${month}-01`;
  const end = endOfMonth(start);
  const counts = checkinCounts(trackingOf(s), start, end, today);
  const pressings: HerbariumPressing[] = [];
  for (const h of [...s.habits].sort((a, b) => a.order - b.order)) {
    const waterings = counts[h.id]?.checkins ?? 0;
    let rests = 0;
    for (const [d, log] of Object.entries(s.logs[h.id] ?? {})) if (log.kind === 'rest' && d >= start && d <= end && d <= today && inLifetime(h, d)) rests++;
    if (waterings > 0 || rests > 0) pressings.push({ habitId: h.id, plant: h.plant, waterings, rests, size: pressingSize(waterings) });
  }
  let margin: HerbariumMargin | undefined;
  for (const h of s.habits) {
    const d = s.stageDates?.[h.id]?.[BLOOMING];
    if (d && d >= start && d <= end && (!margin || d < margin.date)) margin = { kind: 'bloomed', habitId: h.id, date: d, plant: h.plant };
  }
  if (!margin) {
    const pet = Object.values(s.pets)
      .map((p) => ({ id: p.id, d: arrivalDay(s, p, local), at: p.obtainedAt }))
      .filter((x) => x.d >= start && x.d <= end)
      .sort((a, b) => a.at - b.at)[0];
    if (pet) margin = { kind: 'cameHome', petId: pet.id, date: pet.d };
  }
  if (!margin) {
    const h = [...s.habits].sort((a, b) => a.createdAt - b.createdAt).find((x) => {
      const d = habitCreatedOn(x, s.settings.dayStartsAt, local);
      return d >= start && d <= end;
    });
    if (h) margin = { kind: 'planted', habitId: h.id, date: habitCreatedOn(h, s.settings.dayStartsAt, local), plant: h.plant };
  }
  const firstPage = !s.inbox.some((l) => l.kind === 'monthly' && l.month < month);
  return { pressings, ...(margin ? { margin } : {}), firstPage };
}

/* ------------------------------------------------------------------ */
/* Birthday, came-home days, the moving-in anniversary                 */
/* ------------------------------------------------------------------ */

/** Whether `today` is the yearly return of `day` (and how many years on), or null. */
export function anniversaryOf(day: DateKey, today: DateKey): number | null {
  const a = parseDateKey(day);
  const t = parseDateKey(today);
  const years = t.year - a.year;
  if (years < 1) return null;
  return recurringDay(a.month, a.day, t.year) === today ? years : null;
}

/** Pets whose came-home day it is today (a small bow on the pot), with the years since. */
export function cameHomeToday(s: Pick<AppState, 'pets' | 'settings'>, today: DateKey, local: LocalTimeReader): { petId: string; years: number }[] {
  const out: { petId: string; years: number }[] = [];
  for (const p of Object.values(s.pets)) {
    const years = anniversaryOf(arrivalDay(s, p, local), today);
    if (years !== null) out.push({ petId: p.id, years });
  }
  return out.sort((a, b) => (a.petId < b.petId ? -1 : 1));
}

/** The pets that leave a birthday card (§13 "each pet leaves a one-line card"): every pet, out or indoors, by who came home first. */
export function birthdayCards(s: Pick<AppState, 'pets'>): string[] {
  return Object.values(s.pets)
    .sort((a, b) => a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1))
    .map((p) => p.id);
}

/**
 * The moving-in anniversary note: written once a year, on the first open within a week of the
 * anniversary (rollover.openDay). Returns whether one was written.
 */
export function anniversaryNote(tx: Tx): boolean {
  const s = tx.s;
  if (!s.profile.onboarded || rewardsPaused(s, tx.env.now)) return false;
  const moved = movedInOn(s, tx.env.local);
  const today = tx.env.today;
  for (let back = 0; back < ANNIVERSARY_GRACE_DAYS; back++) {
    const day = addDays(today, -back);
    const years = anniversaryOf(moved, day);
    if (years === null) continue;
    const key = `anniversary|${parseDateKey(day).year}`;
    if (hasOnce(s, key)) return false;
    setOnce(tx, key);
    const first = [...s.habits].sort((a, b) => a.createdAt - b.createdAt)[0];
    const letter: Letter = { kind: 'anniversary', id: `anniversary-${day}`, date: day, years, ...(first ? { firstHabitId: first.id } : {}), waterings: s.lifetime.checkins, stars: 0 };
    tx.section('inbox').push(letter);
    tx.emit({ type: 'letter', letterId: letter.id, kind: 'anniversary' });
    return true;
  }
  return false;
}
