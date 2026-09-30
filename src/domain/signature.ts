/**
 * Blooms Like You (DESIGN §14.2): a plant's look comes from *how* she keeps the habit.
 *
 * ## The colour: when she usually waters it
 * - Only live check-in stamps (`DayLog.at`) count: backfill and history edits never write them.
 *   A day's time is its last stamp (the check-in that completed it; a count habit's last glass).
 * - Dropped: catch-up bursts (the stamp sits in a 120-second window holding check-ins of ≥ 3
 *   habits, this one included, measured in time across app days: logging a morning's worth at
 *   once says nothing about the morning)
 *   and anything from 23:00 to 03:59 (late catch-ups; the app day starts at 3 am by default).
 * - Only the stamps still kept (the last 120 days, logging.ts `STAMP_DAYS`) are read, so a re-read
 *   reflects how she keeps it now.
 * - At least 10 eligible days are needed. Bands: **Dawn** before 9:00 · **Sunlit** 9:00–17:59 ·
 *   **Twilight** 18:00 and after. The colour is a band holding ≥ 60% of the eligible days ("you
 *   usually water it…"); otherwise **Wildflower** ("at all sorts of times").
 *
 * ## The shape
 * **Paired** when stacked on ≥ 14 kept-together days (stacking.ts), else **Petite** when the tiny
 * version counted on ≥ 25% of the days it was done and on at least 5 days, else **Classic**.
 * Paired wins over Petite: the pair is the rarer, more specific story.
 *
 * ## Reads
 * Computed when the plant first shows Blooming and re-read at Evergreen. A read with fewer than 10
 * eligible days waits and is retried on each later check-in (it never guesses a colour). Looks are
 * only ever added (a re-read that matches an existing look adds nothing), a new look is shown unless
 * she has chosen one herself, and Classic (`shown: null`) is always available. It pays nothing: no
 * performance-graded looks.
 *
 * ## The nudge
 * "You set Walk for mornings but usually water it after 6 pm. Move it to Evening?": when ≥ 60% of
 * the eligible days (≥ 10) fall in another time block than the habit's (the Today blocks, by
 * Today's own rule: morning from the day start until 11:00, midday until 17:00, then evening, and
 * the hours before the day start are the previous day's evening). Offered once: either answer
 * closes it.
 */
import type { AppState, BloomColour, BloomShape, DateKey, Habit, PlantLook, PlantLooks, TimeBand, TimeOfDay } from '@/state/types';
import { inLifetime, logStatus, showedUp } from './activity';
import { addDays, zoneKey, type LocalTimeReader } from './dates';
import { BLOOMING, EVERGREEN } from './growth';
import { ruleAt } from './rules';
import { keptTogetherDays } from './stacking';
import { seal, type Tx } from './tx';

export const SIGNATURE = {
  burstHabits: 3,
  burstMs: 120_000,
  /** Stamps from 23:00 to 03:59 are dropped. */
  lateFrom: 23,
  earlyUntil: 4,
  minEligibleDays: 10,
  bandShare: 0.6,
  dawnBefore: 9 * 60,
  twilightFrom: 18 * 60,
  petiteShare: 0.25,
  petiteMinDays: 5,
  pairedMinDays: 14,
  /** Live stamps are kept this long (logging.ts STAMP_DAYS). */
  stampDays: 120,
} as const;

const COLOUR_OF: Readonly<Record<Exclude<TimeBand, 'all-sorts'>, BloomColour>> = { dawn: 'dawn', sunlit: 'sunlit', twilight: 'twilight' };

export interface EligibleTime {
  date: DateKey;
  /** Minutes after local midnight. */
  minute: number;
}

/* ------------------------------------------------------------------ */
/* Eligible check-in times                                             */
/* ------------------------------------------------------------------ */

/**
 * Whether the stamp `t` of `habitId` on `date` sits in a catch-up burst (≥ 3 habits within 120 s).
 * A burst is measured in time, not per app day: stamps filed under the neighbouring app days count
 * too (a burst can straddle the day start, which may be as late as 6:00).
 */
export function inBurst(s: Pick<AppState, 'habits' | 'logs'>, date: DateKey, habitId: string, t: number): boolean {
  const near: { ms: number; h: string }[] = [];
  const days = [addDays(date, -1), date, addDays(date, 1)];
  for (const h of s.habits) {
    if (h.id === habitId) continue;
    for (const d of days) {
      const log = s.logs[h.id]?.[d];
      if (log?.kind !== 'log' || !log.at) continue;
      for (const ms of log.at) if (Math.abs(ms - t) <= SIGNATURE.burstMs) near.push({ ms, h: h.id });
    }
  }
  if (new Set(near.map((n) => n.h)).size < SIGNATURE.burstHabits - 1) return false;
  // The tightest window holding a set starts at its earliest stamp: t itself or a stamp before it.
  const starts = [t, ...near.filter((n) => n.ms <= t).map((n) => n.ms)];
  for (const start of starts) {
    const inside = new Set(near.filter((n) => n.ms >= start && n.ms <= start + SIGNATURE.burstMs).map((n) => n.h));
    if (inside.size >= SIGNATURE.burstHabits - 1) return true;
  }
  return false;
}

const memo = new WeakMap<object, WeakMap<object, Map<string, EligibleTime[]>>>();

/**
 * The habit's eligible live check-in times over the kept stamps, oldest first (see module doc).
 * Memoised by the identity of the habit and of the whole logs section (bursts read other habits),
 * the day, and the zone the stamps are read in (`zoneKey`: `timeZone` when known, and the reader's
 * offsets), so a reading made before the device moved zone is never served after it (P-history-04).
 */
export function eligibleTimes(s: Pick<AppState, 'habits' | 'logs'>, habit: Habit, today: DateKey, local: LocalTimeReader, timeZone?: string): EligibleTime[] {
  // Sealed: a transaction copies them before writing, so a memoised reading can never go stale.
  seal(habit);
  seal(s.logs);
  let byLogs = memo.get(habit);
  if (!byLogs) memo.set(habit, (byLogs = new WeakMap()));
  let map = byLogs.get(s.logs);
  if (!map) byLogs.set(s.logs, (map = new Map()));
  const key = `${today}|${zoneKey(local, timeZone)}`;
  const hit = map.get(key);
  if (hit) return hit;
  const horizon = addDays(today, -SIGNATURE.stampDays);
  const out: EligibleTime[] = [];
  for (const [date, log] of Object.entries(s.logs[habit.id] ?? {})) {
    if (date < horizon || date > today || log.kind !== 'log' || !log.at || log.at.length === 0 || !inLifetime(habit, date)) continue;
    if (!showedUp(logStatus(log, ruleAt(habit, date), date < today))) continue;
    const t = log.at[log.at.length - 1]!;
    if (!Number.isFinite(t)) continue;
    const clock = local(t);
    if (clock.hour >= SIGNATURE.lateFrom || clock.hour < SIGNATURE.earlyUntil) continue;
    if (inBurst(s, date, habit.id, t)) continue;
    out.push({ date, minute: clock.hour * 60 + clock.minute });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (map.size > 16) map.clear();
  map.set(key, out);
  return out;
}

export function bandOf(minute: number): Exclude<TimeBand, 'all-sorts'> {
  return minute < SIGNATURE.dawnBefore ? 'dawn' : minute < SIGNATURE.twilightFrom ? 'sunlit' : 'twilight';
}

/**
 * The Today time block a minute of the day falls in, by Today's own rule (views/today.ts
 * `currentBlock`): the minutes before the day start belong to the previous app day's evening.
 */
export function blockOfMinute(minute: number, dayStartsAt = 0): Exclude<TimeOfDay, 'anytime'> {
  return minute < dayStartsAt ? 'evening' : minute < 11 * 60 ? 'morning' : minute < 17 * 60 ? 'midday' : 'evening';
}

export interface TimeReading {
  eligibleDays: number;
  /** The usual band, or 'all-sorts' (also while there are fewer than 10 eligible days). */
  band: TimeBand;
  bandDays: number;
  /** The colour it reads as; null with fewer than 10 eligible days. */
  colour: BloomColour | null;
  /** The usual block (≥ 60% of eligible days), for the nudge; null when none or too few days. */
  block: Exclude<TimeOfDay, 'anytime'> | null;
  /** Median time (of the usual band's days when there is one), rounded to 15 minutes; null without days. */
  usualMinute: number | null;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const a = [...xs].sort((x, y) => x - y);
  const mid = a.length >> 1;
  return a.length % 2 ? a[mid]! : (a[mid - 1]! + a[mid]!) / 2;
}

const round15 = (m: number): number => Math.min(23 * 60 + 45, Math.round(m / 15) * 15);

/** Reads the usual time from eligible check-in times (`dayStartsAt` places them in Today's blocks). */
export function readTimes(times: readonly EligibleTime[], dayStartsAt = 0): TimeReading {
  const n = times.length;
  const counts = { dawn: 0, sunlit: 0, twilight: 0 };
  const blocks = { morning: 0, midday: 0, evening: 0 };
  for (const t of times) {
    counts[bandOf(t.minute)]++;
    blocks[blockOfMinute(t.minute, dayStartsAt)]++;
  }
  const enough = n >= SIGNATURE.minEligibleDays;
  let band: TimeBand = 'all-sorts';
  let bandDays = 0;
  for (const b of ['dawn', 'sunlit', 'twilight'] as const) {
    if (enough && counts[b] >= SIGNATURE.bandShare * n - 1e-9) [band, bandDays] = [b, counts[b]];
  }
  let block: TimeReading['block'] = null;
  for (const b of ['morning', 'midday', 'evening'] as const) if (enough && blocks[b] >= SIGNATURE.bandShare * n - 1e-9) block = b;
  const pool = band === 'all-sorts' ? times : times.filter((t) => bandOf(t.minute) === band);
  const med = median(pool.map((t) => t.minute));
  return {
    eligibleDays: n,
    band,
    bandDays,
    colour: !enough ? null : band === 'all-sorts' ? 'wildflower' : COLOUR_OF[band],
    block,
    usualMinute: med === null ? null : round15(med),
  };
}

/* ------------------------------------------------------------------ */
/* Shape                                                               */
/* ------------------------------------------------------------------ */

export interface ShapeReading {
  shape: BloomShape;
  doneDays: number;
  tinyDays: number;
  keptTogether?: { habitId: string; days: number };
}

/** Days it was done and days the tiny version counted, over its lifetime up to `today`. */
export function doneAndTinyDays(s: Pick<AppState, 'logs'>, habit: Habit, today: DateKey): { done: number; tiny: number } {
  let done = 0;
  let tiny = 0;
  for (const [date, log] of Object.entries(s.logs[habit.id] ?? {})) {
    if (date > today || !inLifetime(habit, date)) continue;
    const st = logStatus(log, ruleAt(habit, date), date < today);
    if (showedUp(st)) done++;
    if (st === 'tiny') tiny++;
  }
  return { done, tiny };
}

export function readShape(s: Pick<AppState, 'habits' | 'logs'>, habit: Habit, today: DateKey): ShapeReading {
  const { done, tiny } = doneAndTinyDays(s, habit, today);
  const kept = habit.anchorHabitId !== undefined ? { habitId: habit.anchorHabitId, days: keptTogetherDays(s, habit, today) } : undefined;
  const shape: BloomShape =
    kept && kept.days >= SIGNATURE.pairedMinDays
      ? 'paired'
      : tiny >= SIGNATURE.petiteMinDays && tiny >= SIGNATURE.petiteShare * done - 1e-9
        ? 'petite'
        : 'classic';
  return { shape, doneDays: done, tinyDays: tiny, ...(kept ? { keptTogether: kept } : {}) };
}

/* ------------------------------------------------------------------ */
/* Reading the look                                                    */
/* ------------------------------------------------------------------ */

/** The look the plant reads as now, or null with too few eligible days (the read waits). */
export function readLook(s: Pick<AppState, 'habits' | 'logs'>, habit: Habit, today: DateKey, local: LocalTimeReader, read: PlantLook['read'], timeZone?: string): PlantLook | null {
  const time = readTimes(eligibleTimes(s, habit, today, local, timeZone));
  if (time.colour === null || time.usualMinute === null) return null;
  const shape = readShape(s, habit, today);
  return {
    colour: time.colour,
    shape: shape.shape,
    read,
    on: today,
    evidence: {
      band: time.band,
      eligibleDays: time.eligibleDays,
      bandDays: time.bandDays,
      usualMinute: time.usualMinute,
      tinyDays: shape.tinyDays,
      doneDays: shape.doneDays,
      ...(shape.keptTogether ? { keptTogether: shape.keptTogether } : {}),
    },
  };
}

const EMPTY_LOOKS: PlantLooks = { looks: [], shown: null, reads: {} };

export function looksOf(s: Pick<AppState, 'plantLooks'>, habitId: string): PlantLooks {
  return s.plantLooks?.[habitId] ?? EMPTY_LOOKS;
}

/** The read due for a plant showing `displayStage`, if one is still to be made. */
export function dueRead(looks: PlantLooks, displayStage: number): PlantLook['read'] | null {
  if (displayStage >= EVERGREEN) return looks.reads.evergreen ? null : 'evergreen';
  if (displayStage >= BLOOMING) return looks.reads.bloom ? null : 'bloom';
  return null;
}

/**
 * Makes the read that is due (economy.updatePlantStage calls it after every stage update): adds
 * the look if it is new, shows it unless she chose one herself, and records the read. Nothing
 * happens while too few eligible days are known.
 */
export function readPlantLook(tx: Tx, habitId: string, displayStage: number): void {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  if (!habit) return;
  const cur = looksOf(tx.s, habitId);
  const due = dueRead(cur, displayStage);
  if (!due) return;
  const look = readLook(tx.s, habit, tx.env.today, tx.env.local, due, tx.env.timeZone);
  if (!look) return;
  const today = tx.env.today;
  const reads = due === 'evergreen' ? { bloom: cur.reads.bloom ?? today, evergreen: today } : { ...cur.reads, bloom: today };
  const exists = cur.looks.findIndex((l) => l.colour === look.colour && l.shape === look.shape);
  const looks = exists >= 0 ? cur.looks : [...cur.looks, look];
  const shown = exists < 0 && !cur.chosen ? looks.length - 1 : cur.shown;
  const next: PlantLooks = { looks, shown, reads, ...(cur.chosen ? { chosen: true } : {}) };
  tx.set('plantLooks', { ...tx.s.plantLooks, [habitId]: next });
  if (exists < 0) tx.emit({ type: 'look', habitId, colour: look.colour, shape: look.shape, read: due });
}

/** "Show this look" (an index into the plant's looks) or "Classic" (null). */
export function setPlantLook(tx: Tx, habitId: string, index: number | null): boolean {
  const cur = tx.s.plantLooks?.[habitId];
  if (!cur || (index !== null && (!Number.isInteger(index) || index < 0 || index >= cur.looks.length))) return false;
  tx.set('plantLooks', { ...tx.s.plantLooks, [habitId]: { ...cur, shown: index, chosen: true } });
  return true;
}

/* ------------------------------------------------------------------ */
/* The nudge                                                           */
/* ------------------------------------------------------------------ */

export interface TimeNudge {
  from: Exclude<TimeOfDay, 'anytime'>;
  to: Exclude<TimeOfDay, 'anytime'>;
  band: TimeBand;
  usualMinute: number;
}

/** "Move it to Evening?" (see module doc), or null. */
export function timeNudge(s: Pick<AppState, 'habits' | 'logs' | 'settings'>, habit: Habit, today: DateKey, local: LocalTimeReader, timeZone?: string): TimeNudge | null {
  if (habit.timeNudge !== undefined || habit.timeOfDay === 'anytime' || habit.archivedOn !== undefined) return null;
  const r = readTimes(eligibleTimes(s, habit, today, local, timeZone), s.settings.dayStartsAt);
  if (r.block === null || r.block === habit.timeOfDay || r.usualMinute === null) return null;
  return { from: habit.timeOfDay, to: r.block, band: r.band, usualMinute: r.usualMinute };
}

/** Answers the nudge: move the habit to its usual block, or leave it (either way it is never offered again). */
export function answerTimeNudge(tx: Tx, habitId: string, move: boolean): boolean {
  const habit = tx.s.habits.find((h) => h.id === habitId);
  if (!habit) return false;
  const nudge = timeNudge(tx.s, habit, tx.env.today, tx.env.local, tx.env.timeZone);
  if (!nudge) return false;
  const h = tx.habit(habitId);
  if (move) h.timeOfDay = nudge.to;
  h.timeNudge = move ? 'moved' : 'left';
  return true;
}
