/**
 * Logging actions: check-in, tiny, undo, exact count, rest, day off, notes, history edits
 * (DESIGN §5.2, v1 §13.2 "Targets and taps", "Tiny version", "Rest, off days, pauses", "Backfill &
 * history", "Notes & moments").
 *
 * Every action writes the log first, then — only for rewardable days (see economy.ts) — runs one
 * *reward pass*: settle the occurrence (pay / refund), then the bonuses its change can trigger.
 * History edits (`editHistory`, and any log change outside the rewarding window) never touch the
 * wallet, sunshine, once-keys or badges. Every entry point refuses a `date` that is not a real
 * 'YYYY-MM-DD' day (a malformed key would be a fresh ledger slot and fail validation on reload).
 *
 * Taps: a target-1 habit toggles (checkIn when not done, undoCheckIn when done); a count habit adds
 * `step` per tap and may go over target ("10 / 8", no extra coins); flexible habits are one check-in
 * per day. A check-in on a day logged as the tiny version upgrades it to the full version. Live
 * check-ins (on today, clock trusted) record an `at` stamp (max 24 per day); they are what Early
 * bird / Wind-Down and the busiest-time insight read. Future days can't be logged. Taps are
 * monotone for the ledger: a tap that adds never refunds, an un-check never pays.
 *
 * The tiny version (v1 §13.2) is a *level* ("stored as level:'tiny'"): logging it never changes the
 * count, so Undo restores the day exactly (a count habit's tiny tap used to add `tiny.count`, which
 * Undo kept, and the day-end rule then re-recorded the day as tiny and paid it again).
 */
import type { CheckInResult } from '@/state/api';
import type { AppState, DateKey, DayLog, Habit } from '@/state/types';
import { BACKFILL_DAYS, canLogOn, canSetRest, inLifetime, isInBackfillWindow, logStatus, offDaysRemaining, showedUp } from './activity';
import { evaluateBadges, type BadgeTrigger } from './badges';
import { addDays, isDateKey } from './dates';
import {
  bestStreakOccurrences,
  countShowUpDay,
  findHabit,
  isPerfectWeek,
  isRewardableDay,
  levelRank,
  payFirstSprout,
  payPerfectDay,
  payPeriodGoal,
  payRungs,
  payWelcomeHome,
  promoteOverDays,
  settleOccurrence,
  updatePlantStage,
  type Settlement,
} from './economy';
import { leaveFoundThing } from './friendship';
import { BLOOMING } from './growth';
import { topUpLetters } from './letters';
import { harvest } from './pantry';
import { ruleAt } from './rules';
import { effectiveTarget, isDayBased } from './schedule';
import { flexPeriodAt } from './periods';
import type { Tx } from './tx';
import { rewardsPaused } from './wallet';

export const MAX_STAMPS_PER_DAY = 24;
export const MAX_NOTE_LENGTH = 280;
/** Sanity cap for count logs (targets go up to 100 000). */
export const MAX_COUNT = 1_000_000;

type Log = Extract<DayLog, { kind: 'log' }>;

/* ------------------------------------------------------------------ */
/* Writing logs                                                        */
/* ------------------------------------------------------------------ */

/** Writes (or, for an empty log, deletes) a day's log. */
function writeLog(tx: Tx, habitId: string, date: DateKey, next: DayLog | undefined): void {
  const logs = tx.logs(habitId);
  if (next === undefined || isEmptyLog(next)) delete logs[date];
  else logs[date] = next;
}

/** A log that carries nothing: no count, level, stamps or note. */
function isEmptyLog(log: DayLog): boolean {
  return log.kind === 'log' && log.count <= 0 && log.level === undefined && (log.at === undefined || log.at.length === 0) && !log.note;
}

function asLog(log: DayLog | undefined): Log {
  if (log?.kind === 'log') return { ...log };
  return { kind: 'log', count: 0, ...(log?.note ? { note: log.note } : {}) };
}

function withStamp(log: Log, now: number): Log {
  const at = [...(log.at ?? []), now];
  return { ...log, at: at.length > MAX_STAMPS_PER_DAY ? at.slice(at.length - MAX_STAMPS_PER_DAY) : at };
}

function withoutLastStamp(log: Log): Log {
  if (!log.at || log.at.length === 0) return log;
  const at = log.at.slice(0, -1);
  const out = { ...log };
  if (at.length > 0) out.at = at;
  else delete out.at;
  return out;
}

/** The habit and day accept a log: a real day, exists, not in the future, inside its lifetime. */
function loggable(tx: Tx, habitId: string, date: DateKey): Habit | null {
  const habit = findHabit(tx.s, habitId);
  if (!habit || !isDateKey(date) || !canLogOn(date, tx.env.today) || !inLifetime(habit, date)) return null;
  return habit;
}

/** A live check-in: on the app day itself with a trusted clock. */
const isLive = (tx: Tx, date: DateKey): boolean => date === tx.env.today && !rewardsPaused(tx.s, tx.env.now);

/* ------------------------------------------------------------------ */
/* The reward pass                                                     */
/* ------------------------------------------------------------------ */

export interface RewardPass {
  /** Coins were earned by this change (a re-check of coins never refunded earns none). */
  rewarded: boolean;
  settlement: Settlement | null;
  /** Coins granted by this pass (check-in + every bonus). */
  coins: number;
}

export interface PassOptions {
  /** A user action (enables the per-action gifts: Welcome home, First Sprout, show-up, found things, harvest). */
  user: boolean;
  /** The habit's best streak before the change (rung measure). */
  bestBefore: number;
  trigger?: BadgeTrigger;
  /** The state before the log changed: last week's letter and last month's bouquet take the change's delta. */
  before?: AppState;
  /** The log only grew ('up') or only shrank ('down'): the settlement may only move that way. */
  direction?: 'up' | 'down';
}

const coinsIn = (tx: Tx, from: number): number =>
  tx.events.slice(from).reduce((a, e) => (e.type === 'coins' && e.amount > 0 ? a + e.amount : a), 0);

/**
 * Settles one rewardable (habit, date) after its log changed and pays what the change unlocked:
 * - up: per-action gifts (user only: Welcome home, First Sprout, the show-up day, the day's found
 *   thing), period goal (in-target flexible), plant stages, harvest on a Blooming+ edible plant,
 *   perfect day, streak rungs;
 * - down: refund (economy.ts) and promotion of over-target flexible days.
 * Then last week's letter / last month's bouquet take the change's delta (letters.ts) and badges
 * are evaluated.
 */
export function rewardPass(tx: Tx, habitId: string, date: DateKey, opts: PassOptions): RewardPass {
  const habit = findHabit(tx.s, habitId);
  if (!habit || !isRewardableDay(tx.s, habit, date, tx.env)) return { rewarded: false, settlement: null, coins: 0 };
  const mark = tx.events.length;
  const st = settleOccurrence(tx, habitId, date, opts.direction ? { only: opts.direction } : {});
  const up = levelRank(st.next) > levelRank(st.prev);
  const flexible = !isDayBased(ruleAt(habit, date));
  if (!up && flexible && (st.prev === 'tiny' || st.prev === 'full')) promoteOverDays(tx, habitId, date);

  let trigger: BadgeTrigger = { ...opts.trigger };
  if (up && opts.user) {
    if (payWelcomeHome(tx)) trigger = { ...trigger, welcomeHome: true };
    payFirstSprout(tx);
    countShowUpDay(tx);
    leaveFoundThing(tx);
  }
  if (up && flexible && st.next !== 'over') payPeriodGoal(tx, habitId, date);
  const stage = updatePlantStage(tx, habitId);
  if (up && opts.user && st.next !== 'over' && stage >= BLOOMING && harvest(tx, habit)) trigger = { ...trigger, harvested: true };
  if (up && payPerfectDay(tx, date) && isPerfectWeek(tx.s, date)) trigger = { ...trigger, perfectWeek: true };
  payRungs(tx, habitId, opts.bestBefore);
  if (opts.before) topUpLetters(tx, opts.before, habitId, date);
  evaluateBadges(tx, trigger);
  const coins = coinsIn(tx, mark);
  return { rewarded: coins > 0, settlement: st, coins };
}

/** Records a check-in action's time for Welcome home (after the pass read the previous one). */
function recordCheckinTime(tx: Tx): void {
  if (rewardsPaused(tx.s, tx.env.now)) return;
  const clock = tx.section('clock');
  clock.lastCheckinAt = Math.max(clock.lastCheckinAt, tx.env.now);
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

const NOT_LOGGED: Omit<CheckInResult, 'events'> = { coins: 0, completed: false, partial: false, rewarded: false };

/** Applies a new log for a user check-in action and runs the pass; builds the CheckInResult. */
function applyCheckin(tx: Tx, habit: Habit, date: DateKey, next: Log, stamped: boolean): Omit<CheckInResult, 'events'> {
  const rule = ruleAt(habit, date);
  const target = effectiveTarget(rule);
  const today = tx.env.today;
  const before = logStatus(tx.s.logs[habit.id]?.[date], rule, date < today);
  const bestBefore = bestStreakOccurrences(tx.s, habit.id, today, tx.env.local);
  const prior = tx.s;
  writeLog(tx, habit.id, date, next);
  const after = logStatus(next, rule, date < today);
  const completed = !showedUp(before) && showedUp(after);
  tx.emit({ type: 'checkin', habitId: habit.id, date, completed, tiny: after === 'tiny', count: next.count, target });
  const pass = rewardPass(tx, habit.id, date, { user: true, bestBefore, before: prior, direction: 'up', ...(stamped ? { trigger: { liveCheckinAt: tx.env.now } } : {}) });
  recordCheckinTime(tx);
  return { coins: pass.coins, completed, partial: !showedUp(after) && next.count > 0, rewarded: pass.rewarded };
}

/** Tap: +step toward the target (day-based) or mark the day (flexible). */
export function checkIn(tx: Tx, habitId: string, date: DateKey = tx.env.today): Omit<CheckInResult, 'events'> {
  const habit = loggable(tx, habitId, date);
  if (!habit) return NOT_LOGGED;
  const rule = ruleAt(habit, date);
  const target = effectiveTarget(rule);
  const cur = asLog(tx.s.logs[habitId]?.[date]);
  const flexible = !isDayBased(rule);
  const upgrade = cur.level === 'tiny' && (flexible || target === 1);
  if ((flexible || target === 1) && cur.count >= 1 && !upgrade) return NOT_LOGGED;
  // One tap = one step; on a tiny-logged one-tap habit it upgrades to the full version (pays the difference).
  let next: Log = { ...cur, count: flexible || upgrade ? Math.max(1, cur.count) : Math.min(MAX_COUNT, cur.count + Math.max(1, rule.step)) };
  if (next.count >= target) delete next.level;
  const stamped = isLive(tx, date);
  if (stamped) next = withStamp(next, tx.env.now);
  return applyCheckin(tx, habit, date, next, stamped);
}

/**
 * Logs the tiny version (counts as showing up; half coins, half sunshine). Only for a rule that has
 * one; no-op once shown up. Day-based: sets the level and leaves the count as it was (see module doc).
 */
export function checkInTiny(tx: Tx, habitId: string, date: DateKey = tx.env.today): Omit<CheckInResult, 'events'> {
  const habit = loggable(tx, habitId, date);
  if (!habit) return NOT_LOGGED;
  const rule = ruleAt(habit, date);
  if (!rule.tiny) return NOT_LOGGED;
  const cur = asLog(tx.s.logs[habitId]?.[date]);
  if (showedUp(logStatus(cur, rule, date < tx.env.today))) return NOT_LOGGED;
  const flexible = !isDayBased(rule);
  let next: Log = { ...cur, count: flexible ? 1 : cur.count, level: 'tiny' };
  const stamped = isLive(tx, date);
  if (stamped) next = withStamp(next, tx.env.now);
  return applyCheckin(tx, habit, date, next, stamped);
}

/** −step (day-based; a tiny log first loses its tiny level) or un-mark (flexible). Refunds if affordable. */
export function undoCheckIn(tx: Tx, habitId: string, date: DateKey = tx.env.today): { refunded: number } {
  const habit = loggable(tx, habitId, date);
  const log = tx.s.logs[habitId]?.[date];
  if (!habit || log?.kind !== 'log') return { refunded: 0 };
  const rule = ruleAt(habit, date);
  let next: Log = { ...log };
  if (!isDayBased(rule)) {
    next.count = 0;
    delete next.level;
  } else if (next.level === 'tiny') delete next.level;
  else next.count = Math.max(0, next.count - Math.max(1, rule.step));
  if (next.count === log.count && next.level === log.level) return { refunded: 0 };
  if (date === tx.env.today) next = withoutLastStamp(next);
  const bestBefore = bestStreakOccurrences(tx.s, habitId, tx.env.today, tx.env.local);
  const prior = tx.s;
  writeLog(tx, habitId, date, next);
  const pass = rewardPass(tx, habitId, date, { user: true, bestBefore, before: prior, direction: 'down' });
  const refunded = pass.settlement?.refunded ?? 0;
  tx.emit({ type: 'uncheck', habitId, date, refunded });
  return { refunded };
}

/** Sets an exact count (the detail view / number pad). Flexible habits clamp to 0/1. */
export function setCount(tx: Tx, habitId: string, date: DateKey, count: number): void {
  const habit = loggable(tx, habitId, date);
  if (!habit || !Number.isFinite(count)) return;
  const rule = ruleAt(habit, date);
  const flexible = !isDayBased(rule);
  const cur = asLog(tx.s.logs[habitId]?.[date]);
  const value = flexible ? (count >= 1 ? 1 : 0) : Math.min(MAX_COUNT, Math.max(0, Math.round(count)));
  if (value === cur.count && tx.s.logs[habitId]?.[date]?.kind === 'log') return;
  let next: Log = { ...cur, count: value };
  if (value >= effectiveTarget(rule) || (flexible && value === 0)) delete next.level;
  const increased = value > cur.count;
  const stamped = increased && isLive(tx, date);
  if (stamped) next = withStamp(next, tx.env.now);
  if (increased) {
    applyCheckin(tx, habit, date, next, stamped);
    return;
  }
  const bestBefore = bestStreakOccurrences(tx.s, habitId, tx.env.today, tx.env.local);
  const prior = tx.s;
  writeLog(tx, habitId, date, next);
  rewardPass(tx, habitId, date, { user: true, bestBefore, before: prior, direction: 'down' });
}

/**
 * Rest day toggle (day-based habits only; within the 6-day window, today, or up to 14 days ahead).
 * Setting a rest replaces the day's log (a day is logged or rested, never both; a note is kept) and
 * refunds a paid check-in if affordable. An allowed rest can complete a perfect day.
 */
export function toggleRest(tx: Tx, habitId: string, date: DateKey): boolean {
  const habit = findHabit(tx.s, habitId);
  if (!habit || !isDateKey(date) || !canSetRest(date, tx.env.today) || date < habit.startedOn) return false;
  if (habit.archivedOn !== undefined && date > habit.archivedOn) return false;
  if (!isDayBased(ruleAt(habit, date))) return false;
  const cur = tx.s.logs[habitId]?.[date];
  const bestBefore = bestStreakOccurrences(tx.s, habitId, tx.env.today, tx.env.local);
  const prior = tx.s;
  const resting = cur?.kind !== 'rest';
  const next: DayLog | undefined = resting
    ? { kind: 'rest', ...(cur?.note ? { note: cur.note } : {}) }
    : cur?.note
      ? { kind: 'log', count: 0, note: cur.note }
      : undefined;
  writeLog(tx, habitId, date, next);
  const trigger: BadgeTrigger = resting ? { rested: true } : {};
  const pass = date <= tx.env.today ? rewardPass(tx, habitId, date, { user: true, bestBefore, trigger, before: prior }) : null;
  if (!pass?.settlement) evaluateBadges(tx, trigger); // the pass didn't run (a future or non-rewardable day)
  if (pass?.settlement && payPerfectDay(tx, date) && isPerfectWeek(tx.s, date)) evaluateBadges(tx, { perfectWeek: true });
  return true;
}

/**
 * "Take today off" (global, max 4 per calendar month): today or a day up to 14 ahead. Removing an
 * off day is always allowed. Returns the off days left in that month. A day off is transparent for
 * every habit, so it is never a perfect day either (economy.ts): toggling it pays nothing.
 */
export function toggleOffDay(tx: Tx, date: DateKey): { ok: boolean; remaining: number } {
  const today = tx.env.today;
  if (!isDateKey(date)) return { ok: false, remaining: 0 };
  if (date < today || date > addDays(today, 14)) return { ok: false, remaining: offDaysRemaining(tx.s.offDays, date) };
  const off = tx.section('offDays');
  if (off[date]) delete off[date];
  else {
    if (offDaysRemaining(tx.s.offDays, date) <= 0) return { ok: false, remaining: 0 };
    off[date] = true;
  }
  return { ok: true, remaining: offDaysRemaining(tx.s.offDays, date) };
}

/** A note for a day (≤ 280 characters; empty removes it). Never rewards anything. */
export function setNote(tx: Tx, habitId: string, date: DateKey, note: string): void {
  const habit = loggable(tx, habitId, date);
  if (!habit) return;
  const text = Array.from(note.trim()).slice(0, MAX_NOTE_LENGTH).join('');
  const cur = tx.s.logs[habitId]?.[date];
  const next: DayLog = cur ? { ...cur } : { kind: 'log', count: 0 };
  if (text) next.note = text;
  else delete next.note;
  writeLog(tx, habitId, date, next);
}

/**
 * Calendar history edit: marks a day done / not done without any reward effect in either
 * direction (v1 §13.2 "The Progress calendar edits older days as history only"). Days before
 * `startedOn` need `setStartedOn` first. Refused (returns false, nothing changes):
 * - days inside the 6-day window: they go through the check-in path (checkIn / undoCheckIn /
 *   setCount), which pays and refunds; a history edit there would hide a paid check-in and free
 *   its flexible slot for another full grant;
 * - un-ticking a flexible check-in whose period still reaches into the window: the week strip can
 *   still pay that period, so removing an older check-in would free a slot it already paid for
 *   (and once compacted, that grant is no longer visible to stop a second one).
 */
export function editHistory(tx: Tx, habitId: string, date: DateKey, done: boolean): boolean {
  const habit = loggable(tx, habitId, date);
  if (!habit || isInBackfillWindow(date, tx.env.today)) return false;
  const rule = ruleAt(habit, date);
  if (!done && !isDayBased(rule)) {
    const p = flexPeriodAt(habit, date, tx.s.settings.weekStart);
    if (p && p.to >= addDays(tx.env.today, -BACKFILL_DAYS)) return false;
  }
  const cur = asLog(tx.s.logs[habitId]?.[date]);
  const next: Log = { ...cur, count: done ? Math.max(cur.count, effectiveTarget(rule)) : 0 };
  delete next.level;
  writeLog(tx, habitId, date, next);
  return true;
}

/* ------------------------------------------------------------------ */
/* Compaction                                                          */
/* ------------------------------------------------------------------ */

/**
 * Live `at` stamps are kept for 120 days: they feed the 90-day "busiest time of day" insight and the
 * live Early bird / Wind-Down checks, and nothing else. Older days keep their count, level and note.
 * This keeps a years-old save small (DESIGN v1 §13.8).
 */
export const STAMP_DAYS = 120;

export function pruneOldStamps(tx: Tx): void {
  const horizon = addDays(tx.env.today, -STAMP_DAYS);
  for (const [habitId, logs] of Object.entries(tx.s.logs)) {
    let writable: Record<DateKey, DayLog> | null = null;
    for (const [date, log] of Object.entries(logs)) {
      if (date >= horizon || log.kind !== 'log' || log.at === undefined) continue;
      writable ??= tx.logs(habitId);
      const { at: _dropped, ...rest } = log;
      writable[date] = rest;
    }
  }
}
