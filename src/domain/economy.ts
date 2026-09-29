/**
 * Check-in rewards and the reward ledger (DESIGN §6 "Earning", §5.3 "Backfill"; v1 §6.1 "Reward
 * integrity", v1 §13.2 "Backfill & history", v1 §13.4 "Growth", v1 §13.5 "Economy v2", v1 §13.10
 * "First Sprout").
 *
 * ## Which days pay
 * A (habit, date) occurrence can be rewarded only through the check-in path, only inside the 6-day
 * window (today−6 … today), only for days on/after the habit's creation day (`createdOn`, fixed at
 * creation so a later day-boundary change can't move it), inside its lifetime, and never while the
 * clock guard pauses rewards. Anything else is history: it changes stats but never the wallet,
 * sunshine or once-keys, in either direction. The measures rewards are paid on (streak rungs,
 * completed occurrences for plant stages) count only days since the creation day, so history
 * filled in before a habit existed can't unlock them either.
 *
 * ## The ledger entry: one per rewarded occurrence
 * `ledger.recent['<habitId>|<date>'] = { coins, sunshine, cap, lvl }` holds what the occurrence has
 * been paid. Every change to a rewardable day is *settled*: the level the day now deserves
 * ('none' < 'over' < 'tiny' < 'full') is compared with the level held.
 * - **Up** (none→tiny, tiny→full, over→tiny/full): pays the difference between what the new level
 *   is worth now and what is already held, so nothing is ever paid twice. A re-check after a refund
 *   is worth at most `cap`, the full rate of the first grant ("a re-check pays min(original,
 *   current rate)"), so effort edits and fresh daily budgets cannot be farmed.
 * - **Down** (un-check, or a full day lowered to tiny): refunds the difference *if the balance
 *   allows* (all or nothing). If the coins were already spent, the grant stays recorded, so a
 *   re-check pays nothing. Sunshine always follows the day (only un-checking inside the window
 *   removes it, v1 §13.4).
 * - **Same level**: no coins move (so tapping +1 past a target, or changing effort, pays nothing);
 *   only the sunshine is brought in line when a rule edit changed what the day is worth.
 * - Taps are monotone: a tap that adds never settles down and an un-check never settles up
 *   (`SettleOptions.only`).
 * - **Flexible slots** (v1 §5.1, §6.1): a flexible occurrence is a slot in its period. When a paid
 *   check-in is un-checked but its refund is blocked (coins spent), the grant stays recorded on
 *   that day as an *orphan*; the next check-in that takes the slot inherits the orphaned coins
 *   instead of being paid again, so moving a check-in to another day never pays the slot twice.
 * - **Rule edits** re-settle every rewardable day of the habit (`resettleHabit`), so a day always
 *   holds what it is worth under the rule governing it: a temporary rule can't leave sunshine or
 *   an in-target grant behind.
 *
 * ## What a level is worth
 * - Pay by effort: light 4 · steady 5 · big 7; tiny = ⌈pay/2⌉ (v1 §13.5) and 50% sunshine (v1 §13.2).
 * - Daily full-rate budget: 40 coins from check-ins per *action day* (the app day on which the
 *   check-in happens, by the device clock; not the log's date). A grant pays at most what is left of
 *   the budget, and at least 1 coin; once it is spent every check-in pays 1 coin. Refunds free the
 *   budget of the day they happen.
 * - Flexible check-ins beyond `times` in their period ('over'): 1 coin, no sunshine, no bonus. When
 *   an in-target day is un-checked, the earliest over day in that period is promoted.
 * - Unscheduled days of day-based habits are neutral: they log, but pay nothing (they are not
 *   occurrences, exactly as in consistency and growth).
 *
 * ## Bonuses (each once per key, never clawed back)
 * Period goal, perfect day, Welcome home, streak rungs, the Showing-up ladder, First Sprout, plant
 * stages and the Laurel Sprig — see each function below.
 */
import { LAUREL_SPRIG_ID, WINDOW_SEAT_ID } from '@/catalog/collectibles';
import type { AppState, DateKey, Effort, Habit } from '@/state/types';
import {
  BACKFILL_DAYS,
  EMPTY_LOGS,
  evaluateDay,
  inLifetime,
  isInBackfillWindow,
  logStatus,
  restStanding,
  showedUp,
  type EvalContext,
  type HabitLogs,
} from './activity';
import { addDays, appDayKey, dayNumber, eachDay, minDateKey, startOfWeek, type LocalTimeReader } from './dates';
import {
  CUTTING_THRESHOLDS,
  EVERGREEN,
  flourishesFor,
  lifetimeSunshine,
  plantStage,
  stageName,
  stagesCrossed,
  sunshineFromHistory,
  sunshinePerOccurrence,
  theCutting,
  type CuttingVM,
} from './growth';
import { evaluatePeriod, flexPeriodAt, type FlexPeriod } from './periods';
import { ruleAt } from './rules';
import { isDayBased, restAllowancePerWeek } from './schedule';
import { RUNGS, streakInfo, type StreakInfo } from './streaks';
import { seal, type Tx } from './tx';
import { leaveKeepsakes, shareWithCompanion } from './company';
import { readPlantLook } from './signature';
import { grantCoins, grantExclusive, grantStars, grantTickets, hasOnce, refundCoins, rewardsPaused, setOnce } from './wallet';

/* ------------------------------------------------------------------ */
/* Constants (DESIGN v1 §13.5)                                            */
/* ------------------------------------------------------------------ */

export const PAY: Readonly<Record<Effort, number>> = { light: 4, steady: 5, big: 7 };
/** Full-rate check-in coins per action day; beyond it each check-in pays 1 coin. */
export const DAILY_BUDGET = 40;
export const BEYOND_BUDGET_PAY = 1;
/** A flexible check-in beyond `times` in its period. */
export const OVER_TARGET_PAY = 1;
export const PERIOD_GOAL_COINS = { week: 10, month: 20 } as const;
export const PERFECT_DAY = { perDone: 2, minCoins: 4, maxCoins: 16, minDone: 2, share: 2 / 3 } as const;
export const WELCOME_HOME = { quietDays: 3, coins: 20, tickets: 1, cooldownDays: 14 } as const;
/** First Sprout: the first check-in ever tops the wallet up to exactly one capsule (v1 §13.10). */
export const FIRST_SPROUT_COINS = 25;
/** Ledger entries older than today−7 are folded into the totals (v1 §13.8). */
export const LEDGER_DAYS = 7;
/** After "Ready to grow?" is accepted, the offer stays closed this long (its 28-day look-back). */
export const GROW_COOLDOWN_DAYS = 28;

/** The Showing-up ladder (account level; the source of stamps and tickets, DESIGN §6), exactly as written there. */
export interface ShowUpRung {
  days: number;
  stars: number;
  tickets: number;
  exclusive?: string;
}
export const SHOW_UP_LADDER: readonly ShowUpRung[] = [
  { days: 7, stars: 1, tickets: 0 },
  { days: 14, stars: 2, tickets: 0 },
  { days: 21, stars: 2, tickets: 1 },
  { days: 30, stars: 3, tickets: 1 },
  { days: 45, stars: 3, tickets: 0 },
  { days: 60, stars: 4, tickets: 1 },
  { days: 90, stars: 5, tickets: 1 },
  { days: 120, stars: 5, tickets: 1 },
  { days: 180, stars: 6, tickets: 2 },
  { days: 250, stars: 8, tickets: 2 },
  { days: 365, stars: 12, tickets: 3, exclusive: WINDOW_SEAT_ID },
];
/** …then 6 stamps + 1 ticket every +100 days forever. */
export const SHOW_UP_REPEAT = { after: 365, every: 100, stars: 6, tickets: 1 } as const;

/** The Showing-up reward for reaching `n` show-up days, if `n` is a rung. */
export function showUpRung(n: number): ShowUpRung | null {
  const fixed = SHOW_UP_LADDER.find((r) => r.days === n);
  if (fixed) return fixed;
  if (n > SHOW_UP_REPEAT.after && (n - SHOW_UP_REPEAT.after) % SHOW_UP_REPEAT.every === 0) {
    return { days: n, stars: SHOW_UP_REPEAT.stars, tickets: SHOW_UP_REPEAT.tickets };
  }
  return null;
}

/** The next Showing-up rung after `n` days. */
export function nextShowUpRung(n: number): ShowUpRung {
  const fixed = SHOW_UP_LADDER.find((r) => r.days > n);
  if (fixed) return fixed;
  const k = Math.floor((n - SHOW_UP_REPEAT.after) / SHOW_UP_REPEAT.every) + 1;
  return { days: SHOW_UP_REPEAT.after + k * SHOW_UP_REPEAT.every, stars: SHOW_UP_REPEAT.stars, tickets: SHOW_UP_REPEAT.tickets };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export type GrantLevel = 'none' | 'over' | 'tiny' | 'full';
const RANK: Readonly<Record<GrantLevel, number>> = { none: 0, over: 1, tiny: 2, full: 3 };
export const levelRank = (l: GrantLevel): number => RANK[l];

export const ledgerKey = (habitId: string, date: DateKey): string => `${habitId}|${date}`;
/** The date part of a '<habitId>|<date>' key. */
export const ledgerKeyDate = (key: string): DateKey => key.slice(key.lastIndexOf('|') + 1);

const round6 = (x: number): number => Math.round(x * 1e6) / 1e6;

export function trackingCtx(s: Pick<AppState, 'settings' | 'offDays'>, today: DateKey): EvalContext {
  return { today, weekStart: s.settings.weekStart, offDays: s.offDays };
}

export function logsOf(s: Pick<AppState, 'logs'>, habitId: string): HabitLogs {
  return s.logs[habitId] ?? EMPTY_LOGS;
}

export function findHabit(s: Pick<AppState, 'habits'>, habitId: string): Habit | undefined {
  return s.habits.find((h) => h.id === habitId);
}

/**
 * The app day the habit was created (rewards never pay for earlier days, v1 §13.2). Stored at
 * creation (`createdOn`); saves from before that field derive it from `createdAt`.
 */
export function habitCreatedOn(habit: Pick<Habit, 'createdAt' | 'createdOn'>, dayStartsAt: number, local: LocalTimeReader): DateKey {
  return habit.createdOn ?? appDayKey(habit.createdAt, dayStartsAt, local);
}

/** Days from the creation day to `today`, both included (0 before it): the plant's calendar pace. */
export function daysSinceCreation(createdOn: DateKey, today: DateKey): number {
  return Math.max(0, dayNumber(today) - dayNumber(createdOn) + 1);
}

/** The habit as rewards see it: nothing before `since` (its creation day) counts. */
function sinceDay<H extends Habit>(habit: H, since: DateKey): H {
  return since > habit.startedOn ? { ...habit, startedOn: since } : habit;
}

/** Whether a (habit, date) can earn rewards now (see module doc "Which days pay"). */
export function isRewardableDay(s: AppState, habit: Habit, date: DateKey, env: Tx['env']): boolean {
  return (
    isInBackfillWindow(date, env.today) &&
    inLifetime(habit, date) &&
    date >= habitCreatedOn(habit, s.settings.dayStartsAt, env.local) &&
    !rewardsPaused(s, env.now)
  );
}

/** Coins a full-level check-in is worth right now, given the coins already paid on the action day. */
export function fullRateCoins(effort: Effort, usedToday: number): number {
  const left = DAILY_BUDGET - usedToday;
  return left <= 0 ? BEYOND_BUDGET_PAY : Math.max(1, Math.min(PAY[effort] ?? PAY.steady, left));
}

/* ------------------------------------------------------------------ */
/* Memoised history walks (streaks, completed occurrences)             */
/* ------------------------------------------------------------------ */

const memo = new WeakMap<object, WeakMap<object, WeakMap<object, Map<string, unknown>>>>();

/**
 * Caches a pure history computation by the identity of (habit, logs, offDays) plus the scalars that
 * matter (`kind`, today, week start). State objects are never mutated after they are shared (and
 * `seal` makes a transaction copy them before writing), so identity is a sound key: a check-in
 * replaces one habit's logs object and only that habit's entries recompute. Views use it too.
 */
export function memoByHabit<T>(habit: Habit, logs: HabitLogs, ctx: EvalContext, kind: string, compute: () => T): T {
  return cached(habit, logs, ctx, kind, compute);
}

function cached<T>(habit: Habit, logs: HabitLogs, ctx: EvalContext, kind: string, compute: () => T): T {
  seal(habit);
  seal(logs);
  seal(ctx.offDays);
  let byLogs = memo.get(habit);
  if (!byLogs) memo.set(habit, (byLogs = new WeakMap()));
  let byOff = byLogs.get(logs);
  if (!byOff) byLogs.set(logs, (byOff = new WeakMap()));
  let map = byOff.get(ctx.offDays);
  if (!map) byOff.set(ctx.offDays, (map = new Map()));
  const key = `${kind}|${ctx.today}|${ctx.weekStart}`;
  if (map.has(key)) return map.get(key) as T;
  const value = compute();
  if (map.size > 64) map.clear();
  map.set(key, value);
  return value;
}

export function streakOf(habit: Habit, logs: HabitLogs, ctx: EvalContext): StreakInfo {
  return cached(habit, logs, ctx, 'streak', () => streakInfo(habit, logs, ctx));
}

/**
 * Achieved occurrences from `since` on (the "completed occurrences" of v1 §13.4). Rewards pass the
 * creation day: occurrences filled in before the habit existed earned no sunshine, so they can't
 * let one check-in jump several stages.
 */
export function completedOccurrences(habit: Habit, logs: HabitLogs, ctx: EvalContext, since: DateKey = habit.startedOn): number {
  return cached(habit, logs, ctx, `completed|${since}`, () => sunshineFromHistory(sinceDay(habit, since), logs, ctx).completedOccurrences);
}

/** Streaks counting only days from `since` (the creation day) on: what streak rungs pay on. */
export function rewardStreakOf(habit: Habit, logs: HabitLogs, ctx: EvalContext, since: DateKey): StreakInfo {
  if (since <= habit.startedOn) return streakOf(habit, logs, ctx);
  return cached(habit, logs, ctx, `reward-streak|${since}`, () => streakInfo(sinceDay(habit, since), logs, ctx));
}

/**
 * The habit's best streak since its creation day, as an occurrence-equivalent: the rung measure
 * (v1 §13.5). A brand-new habit can't collect the 365 rung on its first check-in by ticking a year of
 * calendar history first (v1 §13.2 "no rewards before createdAt").
 */
export function bestStreakOccurrences(s: AppState, habitId: string, today: DateKey, local: LocalTimeReader): number {
  const habit = findHabit(s, habitId);
  if (!habit) return 0;
  const since = habitCreatedOn(habit, s.settings.dayStartsAt, local);
  return rewardStreakOf(habit, logsOf(s, habitId), trackingCtx(s, today), since).best?.occurrences ?? 0;
}

/* ------------------------------------------------------------------ */
/* Deserved level                                                      */
/* ------------------------------------------------------------------ */

/**
 * The level a day deserves as of `today`: day-based days by their occurrence outcome (achieved →
 * full or tiny; anything else, including unscheduled days, → none); flexible days by showing up,
 * 'over' when `times` other in-target check-in days already exist in the period (a day already
 * granted in-target keeps its place).
 */
export function deservedLevel(s: AppState, habit: Habit, date: DateKey, today: DateKey): GrantLevel {
  const logs = logsOf(s, habit.id);
  const ctx = trackingCtx(s, today);
  const rule = ruleAt(habit, date);
  if (isDayBased(rule)) {
    const ev = evaluateDay(habit, logs, date, ctx);
    return ev.outcome === 'achieved' ? (ev.tiny ? 'tiny' : 'full') : 'none';
  }
  const status = logStatus(logs[date], rule, date < today);
  if (!showedUp(status) || !inLifetime(habit, date)) return 'none';
  const level: GrantLevel = status === 'tiny' ? 'tiny' : 'full';
  const held = s.ledger.recent[ledgerKey(habit.id, date)]?.lvl;
  if (held === 'tiny' || held === 'full') return level;
  const p = flexPeriodAt(habit, date, ctx.weekStart);
  if (!p) return level;
  let inTarget = 0;
  for (const d of eachDay(p.from, minDateKey(p.to, today))) {
    if (d === date || !inLifetime(habit, d)) continue;
    if (!showedUp(logStatus(logs[d], p.rule, d < today))) continue;
    if (s.ledger.recent[ledgerKey(habit.id, d)]?.lvl === 'over') continue;
    inTarget++;
  }
  return inTarget >= p.times ? 'over' : level;
}

/* ------------------------------------------------------------------ */
/* Settling one occurrence                                             */
/* ------------------------------------------------------------------ */

export interface Settlement {
  prev: GrantLevel;
  next: GrantLevel;
  /** Coins paid by this settlement (check-in coins only). */
  paid: number;
  /** Coins refunded by this settlement. */
  refunded: number;
  /** A refund was due but the balance was too low: the grant stays recorded. */
  refundBlocked: boolean;
  /** Sunshine added (negative when removed). */
  sunshine: number;
  /** A first completion: the occurrence had never been granted anything before (once-per-occurrence gifts). */
  fresh: boolean;
}

/** Restricts a settlement to one direction (a tap that adds never refunds; an un-check never pays). */
export interface SettleOptions {
  only?: 'up' | 'down';
}

/** A level that completes the occurrence (tiny or full): what a companion's watering counts. */
const completes = (l: GrantLevel): boolean => l === 'tiny' || l === 'full';

const NO_CHANGE = (l: GrantLevel): Settlement => ({ prev: l, next: l, paid: 0, refunded: 0, refundBlocked: false, sunshine: 0, fresh: false });

function addSunshine(tx: Tx, habitId: string, delta: number): void {
  if (delta === 0) return;
  const totals = tx.ledger('sunshine');
  totals[habitId] = Math.max(0, round6((totals[habitId] ?? 0) + delta));
}

/**
 * Brings the ledger entry of (habit, date) in line with the level the day deserves (see module
 * doc). The caller must have checked `isRewardableDay`.
 */
export function settleOccurrence(tx: Tx, habitId: string, date: DateKey, opts: SettleOptions = {}): Settlement {
  const habit = findHabit(tx.s, habitId);
  if (!habit) return NO_CHANGE('none');
  return settleTo(tx, habitId, date, deservedLevel(tx.s, habit, date, tx.env.today), opts);
}

/** Settles (habit, date) to the given level: pays up, refunds down, and fixes the sunshine held. */
export function settleTo(tx: Tx, habitId: string, date: DateKey, next: GrantLevel, opts: SettleOptions = {}): Settlement {
  const s = tx.s;
  const habit = findHabit(s, habitId);
  if (!habit) return NO_CHANGE('none');
  const key = ledgerKey(habitId, date);
  const entry = s.ledger.recent[key];
  const prev: GrantLevel = entry?.lvl ?? 'none';
  const rule = ruleAt(habit, date);
  const heldSun = entry?.sunshine ?? 0;
  const wantSun = next === 'none' || next === 'over' ? 0 : round6(sunshinePerOccurrence(rule, next === 'tiny'));
  const up = RANK[next] > RANK[prev];
  const down = RANK[next] < RANK[prev];
  if ((up && opts.only === 'down') || (down && opts.only === 'up')) return NO_CHANGE(prev);
  if (!up && !down) {
    // Same level: coins stay; the sunshine follows the rule now governing the day (a rule edit).
    if (!entry || Math.abs(wantSun - heldSun) < 1e-9) return NO_CHANGE(prev);
    addSunshine(tx, habitId, wantSun - heldSun);
    const co = shareWithCompanion(tx, habit, entry, wantSun, completes(prev), completes(next));
    const { co: _old, ...rest } = entry;
    tx.ledger('recent')[key] = { ...rest, sunshine: wantSun, ...(co ? { co } : {}) };
    return { prev, next, paid: 0, refunded: 0, refundBlocked: false, sunshine: wantSun - heldSun, fresh: false };
  }

  const today = tx.env.today;
  let coins = entry?.coins ?? 0;
  let cap = entry?.cap;
  let paid = 0;
  let refunded = 0;
  let refundBlocked = false;
  let inherited = false;

  if (up) {
    const fullNow = fullRateCoins(habit.effort, s.ledger.daily[today] ?? 0);
    const base = next === 'over' ? OVER_TARGET_PAY : cap !== undefined ? Math.min(cap, fullNow) : fullNow;
    const want = next === 'tiny' ? Math.ceil(base / 2) : base;
    let need = Math.max(0, want - coins);
    if (need > 0 && next !== 'over' && !isDayBased(rule)) {
      const got = takeOrphanedCoins(tx, habit, date, need);
      if (got.coins > 0) {
        inherited = true;
        coins += got.coins;
        need -= got.coins;
        if (cap === undefined) cap = got.cap;
      }
    }
    paid = need;
    if (next !== 'over' && cap === undefined) cap = fullNow;
    if (paid > 0) {
      grantCoins(tx, paid, 'checkin', habitId);
      const daily = tx.ledger('daily');
      daily[today] = (daily[today] ?? 0) + paid;
      coins += paid;
    }
  } else {
    // What the lower level is worth: nothing, the 1-coin over-target pay, or half (tiny, ⌈pay/2⌉).
    const keep = next === 'none' ? 0 : next === 'over' ? Math.min(coins, OVER_TARGET_PAY) : Math.min(coins, Math.ceil(coins / 2));
    const due = coins - keep;
    if (due > 0) {
      if (refundCoins(tx, due, habitId)) {
        refunded = due;
        coins = keep;
        const daily = tx.ledger('daily');
        daily[today] = Math.max(0, (daily[today] ?? 0) - due);
      } else refundBlocked = true;
    }
  }

  addSunshine(tx, habitId, wantSun - heldSun);
  const co = shareWithCompanion(tx, habit, entry, wantSun, completes(prev), completes(next));

  if (prev === 'none' || next === 'none') {
    const life = tx.section('lifetime');
    life.checkins = Math.max(0, life.checkins + (prev === 'none' ? 1 : -1));
  }

  const recent = tx.ledger('recent');
  if (next === 'none' && coins === 0 && cap === undefined && !co) delete recent[key];
  else {
    recent[key] = {
      coins,
      sunshine: wantSun,
      ...(cap !== undefined ? { cap } : {}),
      ...(next !== 'none' ? { lvl: next } : {}),
      ...(co ? { co } : {}),
    };
  }
  return { prev, next, paid, refunded, refundBlocked, sunshine: wantSun - heldSun, fresh: up && entry === undefined && !inherited };
}

/**
 * Coins still recorded on other days of `date`'s flexible period whose check-in was un-checked
 * while the refund was blocked (the day no longer shows up, and holds coins but no level). The
 * slot they paid for is being taken again, so up to `need` of them move to the new day instead of
 * being paid twice (§6 "A re-check pays min(original, current)"; a flexible occurrence is a slot in its period).
 */
function takeOrphanedCoins(tx: Tx, habit: Habit, date: DateKey, need: number): { coins: number; cap: number | undefined } {
  const p = flexPeriodAt(habit, date, tx.s.settings.weekStart);
  if (!p) return { coins: 0, cap: undefined };
  const logs = logsOf(tx.s, habit.id);
  const today = tx.env.today;
  let got = 0;
  let cap: number | undefined;
  for (const d of eachDay(p.from, minDateKey(p.to, today))) {
    if (got >= need) break;
    if (d === date) continue;
    const key = ledgerKey(habit.id, d);
    const e = tx.s.ledger.recent[key];
    if (!e || e.lvl !== undefined || !(e.coins > 0)) continue;
    if (showedUp(logStatus(logs[d], p.rule, d < today))) continue;
    const take = Math.min(e.coins, need - got);
    got += take;
    cap ??= e.cap;
    const recent = tx.ledger('recent');
    const left = e.coins - take;
    if (left === 0 && e.cap === undefined) delete recent[key];
    else recent[key] = { ...e, coins: left };
  }
  return { coins: got, cap };
}

/**
 * After a rule edit: brings every rewardable day of the habit in the 6-day window in line with the
 * rule now governing it (DESIGN v1 §13.2 "every day is evaluated with the rule in effect then", v1 §13.4
 * "each rewarded occurrence records 7/expectedPerWeek(rule)"). Levels are worked out afresh (in a
 * flexible period the first `times` check-in days in date order are in-target), so a goal raised
 * "this period" promotes check-ins beyond the old goal, and a lowered one demotes them (refunded if
 * the balance allows); every day's sunshine follows its rule. A temporary rule therefore leaves
 * nothing behind once edited away. Bonuses are untouched (never clawed back).
 */
export function resettleHabit(tx: Tx, habitId: string): void {
  const habit = findHabit(tx.s, habitId);
  if (!habit) return;
  const today = tx.env.today;
  const levels: [DateKey, GrantLevel][] = [];
  for (let d = addDays(today, -BACKFILL_DAYS); d <= today; d = addDays(d, 1)) {
    if (!isRewardableDay(tx.s, habit, d, tx.env)) continue;
    levels.push([d, freshLevel(tx.s, habit, d, today)]);
  }
  const held = (d: DateKey): GrantLevel => tx.s.ledger.recent[ledgerKey(habitId, d)]?.lvl ?? 'none';
  // Demotions first (they refund and free slots), then promotions and sunshine fixes.
  for (const [d, lvl] of levels) if (RANK[lvl] < RANK[held(d)]) settleTo(tx, habitId, d, lvl);
  for (const [d, lvl] of levels) settleTo(tx, habitId, d, lvl);
}

/** The level a day deserves ignoring held places: flexible check-ins ranked by date in their period. */
function freshLevel(s: AppState, habit: Habit, date: DateKey, today: DateKey): GrantLevel {
  const rule = ruleAt(habit, date);
  if (isDayBased(rule)) return deservedLevel(s, habit, date, today);
  const logs = logsOf(s, habit.id);
  const status = logStatus(logs[date], rule, date < today);
  if (!showedUp(status) || !inLifetime(habit, date)) return 'none';
  const p = flexPeriodAt(habit, date, s.settings.weekStart);
  if (!p) return status === 'tiny' ? 'tiny' : 'full';
  let rank = 0;
  for (const d of eachDay(p.from, date)) {
    if (d === date) break;
    if (inLifetime(habit, d) && showedUp(logStatus(logs[d], p.rule, d < today))) rank++;
  }
  return rank >= p.times ? 'over' : status === 'tiny' ? 'tiny' : 'full';
}

/**
 * A "this period" edit that lowers the current period's goal forfeits that period's goal bonus
 * (stage-3 decision): the bonus is for meeting the goal the period had, so lowering it, collecting
 * and raising it back can't mint +10/+20 (v1 §13.5 "paid once per (habit, periodStart)"; bonuses are
 * never clawed back, so they must not be paid for a goal that is edited away the same period).
 */
export function forfeitLoweredGoal(tx: Tx, before: Habit, after: Habit): void {
  const today = tx.env.today;
  const weekStart = tx.s.settings.weekStart;
  const p0 = flexPeriodAt(before, today, weekStart);
  const p1 = flexPeriodAt(after, today, weekStart);
  if (!p0 || !p1 || p0.key !== p1.key) return;
  const key = `period|${after.id}|${p1.key}`;
  if (hasOnce(tx.s, key)) return;
  const logs = logsOf(tx.s, after.id);
  const ctx = trackingCtx(tx.s, today);
  const goal = (h: Habit, p: FlexPeriod) => Math.max(1, evaluatePeriod(h, logs, p, ctx).target);
  if (goal(after, p1) < goal(before, p0)) setOnce(tx, key, dayNumber(p1.end));
}

/**
 * After an in-target flexible day was un-checked: promote over-target days of the same period (in
 * date order) that now fit under `times`.
 */
export function promoteOverDays(tx: Tx, habitId: string, date: DateKey): void {
  const habit = findHabit(tx.s, habitId);
  if (!habit) return;
  const p = flexPeriodAt(habit, date, tx.s.settings.weekStart);
  if (!p) return;
  for (const d of eachDay(p.from, minDateKey(p.to, tx.env.today))) {
    if (tx.s.ledger.recent[ledgerKey(habitId, d)]?.lvl !== 'over') continue;
    if (!isRewardableDay(tx.s, habit, d, tx.env)) continue;
    settleOccurrence(tx, habitId, d);
  }
}

/* ------------------------------------------------------------------ */
/* Bonuses                                                             */
/* ------------------------------------------------------------------ */

/**
 * Period goal met: +10 (weekly kinds) / +20 (monthly kinds), once per (habit, periodStart), when the
 * period's check-in days first reach max(1, target) (v1 §13.5).
 * Anti-farming (stage-2 decision): only periods the habit covered from their first day under one
 * rule pay — the habit existed before the period began (created before its first day) and no
 * mid-period rule edit cut it short. So deleting and re-creating a habit, or switching a habit
 * between weekly and monthly "this period", can never mint a second bonus for the same stretch.
 * Goal bonuses therefore start with a habit's first full week/month. The key stores the period's
 * last day (as a day number), and a period overlapping one already paid never pays: changing the
 * week-start setting regroups weeks, but can't pay the same days twice.
 */
export function payPeriodGoal(tx: Tx, habitId: string, date: DateKey): number {
  const s = tx.s;
  const habit = findHabit(s, habitId);
  if (!habit) return 0;
  const p = flexPeriodAt(habit, date, s.settings.weekStart);
  if (!p) return 0;
  const key = `period|${habitId}|${p.key}`;
  if (hasOnce(s, key) || p.from !== p.start) return 0;
  if (habitCreatedOn(habit, s.settings.dayStartsAt, tx.env.local) >= p.start) return 0;
  if (overlapsPaidPeriod(s, habitId, p.start, p.end)) return 0;
  const e = evaluatePeriod(habit, logsOf(s, habitId), p, trackingCtx(s, tx.env.today));
  if (!e.met) return 0;
  const coins = p.unit === 'week' ? PERIOD_GOAL_COINS.week : PERIOD_GOAL_COINS.month;
  setOnce(tx, key, dayNumber(p.end));
  grantCoins(tx, coins, 'period', habitId);
  tx.emit({ type: 'periodGoal', habitId, period: p.unit, coins });
  return coins;
}

/** A goal bonus was already paid for a period of this habit overlapping [start, end]. */
export function overlapsPaidPeriod(s: AppState, habitId: string, start: DateKey, end: DateKey): boolean {
  const prefix = `period|${habitId}|`;
  const lo = dayNumber(start);
  const hi = dayNumber(end);
  for (const [k, v] of Object.entries(s.ledger.once)) {
    if (!k.startsWith(prefix)) continue;
    const otherStart = dayNumber(k.slice(prefix.length));
    const otherEnd = typeof v === 'number' ? v : otherStart;
    if (otherStart <= hi && otherEnd >= lo) return true;
  }
  return false;
}

export interface PerfectDayStatus {
  perfect: boolean;
  /** Day-based habits scheduled and active that day (allowed rests included). */
  scheduled: number;
  /** Day-based done/tiny plus in-target flexible check-ins that day. */
  done: number;
  /** Every scheduled day-based habit is done or allowed-rest. */
  allClear: boolean;
  /** A global day off: transparent, so never a perfect (or an imperfect) day. */
  offDay: boolean;
}

/**
 * Perfect day (v1 §13.5): every scheduled day-based habit is done or on an allowed rest, AND
 * done ≥ max(2, ⌈⅔ × scheduled⌉), where flexible check-ins that day count toward done. Paused
 * habits are not scheduled. Today can only be perfect once it is actually complete. Stage-3
 * decisions, so a bonus is never paid for a state that costs nothing to undo:
 * - a "Take today off" day is transparent for every habit (v1 §13.2): it is neither perfect nor
 *   imperfect (otherwise toggling the day off and back would pay a perfect day every day and give
 *   the monthly quota back);
 * - only *in-target* flexible check-ins count ("beyond times: 1 coin, no bonus", v1 §13.5);
 * - a rest excuses a habit only within the weekly allowance counting the rests that already
 *   completed a paid perfect day this week, even if they were removed since (`rest|…` keys): the
 *   allowance can't be handed back by un-resting.
 */
export function perfectDayStatus(s: AppState, date: DateKey, today: DateKey): PerfectDayStatus {
  const ctx = trackingCtx(s, today);
  const offDay = s.offDays[date] === true;
  let scheduled = 0;
  let done = 0;
  let allClear = true;
  for (const h of s.habits) {
    if (!inLifetime(h, date)) continue;
    const logs = logsOf(s, h.id);
    const ev = evaluateDay(h, logs, date, ctx);
    if (!ev.dayBased) {
      if (showedUp(ev.status) && flexInTarget(s, h, logs, date, today)) done++;
      continue;
    }
    if (!ev.scheduled) continue;
    if (ev.outcome === 'achieved') {
      scheduled++;
      done++;
    } else if (ev.inactive === 'rest') {
      scheduled++;
      if (!restExcuses(s, h, logs, date, ctx)) allClear = false;
    } else if (ev.inactive === 'paused' || ev.inactive === 'off') continue;
    else {
      scheduled++;
      allClear = false;
    }
  }
  const needed = Math.max(PERFECT_DAY.minDone, Math.ceil(PERFECT_DAY.share * scheduled - 1e-9));
  return { perfect: !offDay && allClear && done >= needed, scheduled, done, allClear, offDay };
}

/** A flexible check-in on `date` is within `times` of its period (as granted, or by date order). */
function flexInTarget(s: AppState, habit: Habit, logs: HabitLogs, date: DateKey, today: DateKey): boolean {
  const held = s.ledger.recent[ledgerKey(habit.id, date)]?.lvl;
  if (held !== undefined) return held === 'tiny' || held === 'full';
  const p = flexPeriodAt(habit, date, s.settings.weekStart);
  if (!p) return true;
  let rank = 0;
  for (const d of eachDay(p.from, date)) {
    if (d === date) break;
    if (inLifetime(habit, d) && showedUp(logStatus(logs[d], p.rule, d < today))) rank++;
  }
  return rank < p.times;
}

/** The once-key recording that an allowed rest completed a paid perfect day. */
const restUsedKey = (habitId: string, date: DateKey): string => `rest|${habitId}|${date}`;

/** An allowed rest still fits the week's allowance once rests spent on paid perfect days count. */
function restExcuses(s: AppState, habit: Habit, logs: HabitLogs, date: DateKey, ctx: EvalContext): boolean {
  const allowance = restAllowancePerWeek(ruleAt(habit, date));
  const start = startOfWeek(date, ctx.weekStart);
  let used = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const counting = restStanding(habit, logs, d, ctx) !== null;
    if (counting && d <= date) used++;
    else if (!counting && d !== date && hasOnce(s, restUsedKey(habit.id, d))) used++;
  }
  return used <= allowance;
}

export function perfectDayCoins(done: number): number {
  return Math.min(PERFECT_DAY.maxCoins, Math.max(PERFECT_DAY.minCoins, PERFECT_DAY.perDone * done));
}

/** Pays a perfect day once per date (never clawed back). Returns true when paid now. */
export function payPerfectDay(tx: Tx, date: DateKey): boolean {
  const key = `perfect|${date}`;
  if (hasOnce(tx.s, key) || date > tx.env.today || !isInBackfillWindow(date, tx.env.today) || rewardsPaused(tx.s, tx.env.now)) return false;
  const st = perfectDayStatus(tx.s, date, tx.env.today);
  if (!st.perfect) return false;
  const coins = perfectDayCoins(st.done);
  setOnce(tx, key, coins);
  const ctx = trackingCtx(tx.s, tx.env.today);
  for (const h of tx.s.habits) {
    if (inLifetime(h, date) && evaluateDay(h, logsOf(tx.s, h.id), date, ctx).inactive === 'rest') setOnce(tx, restUsedKey(h.id, date));
  }
  tx.section('lifetime').perfectDays += 1;
  grantCoins(tx, coins, 'perfect');
  tx.emit({ type: 'perfectDay', date, coins });
  return true;
}

/** Every day of the calendar week containing `date` was a perfect day. */
export function isPerfectWeek(s: AppState, date: DateKey): boolean {
  const start = startOfWeek(date, s.settings.weekStart);
  for (let i = 0; i < 7; i++) if (!hasOnce(s, `perfect|${addDays(start, i)}`)) return false;
  return true;
}

/**
 * Welcome home (v1 §13.5): the first check-in after ≥ 3 consecutive app days with zero check-in
 * actions (measured from `clock.lastCheckinAt`) grants 20 coins + 1 ticket, at most once per 14
 * days. Call before recording the new check-in time. The copy never mentions the gap.
 */
export function payWelcomeHome(tx: Tx): boolean {
  const s = tx.s;
  const last = s.clock.lastCheckinAt;
  if (!(last > 0)) return false;
  const lastDay = appDayKey(last, s.settings.dayStartsAt, tx.env.local);
  const quiet = dayNumber(tx.env.today) - dayNumber(lastDay) - 1;
  if (quiet < WELCOME_HOME.quietDays) return false;
  const todayN = dayNumber(tx.env.today);
  for (const [k, v] of Object.entries(s.ledger.once)) {
    if (k.startsWith('home|') && typeof v === 'number' && todayN - v < WELCOME_HOME.cooldownDays) return false;
  }
  setOnce(tx, `home|${addDays(lastDay, 1)}`, todayN);
  grantCoins(tx, WELCOME_HOME.coins, 'home');
  grantTickets(tx, WELCOME_HOME.tickets);
  tx.emit({ type: 'welcomeHome', coins: WELCOME_HOME.coins, tickets: WELCOME_HOME.tickets });
  return true;
}

/**
 * Showing up (v1 §13.5): `showUpDays` counts distinct *action* days with ≥ 1 rewarded check-in, so it
 * can't be farmed by adding habits (one per day however many check-ins) or inflated by rests (rests
 * are not check-ins). Pays the ladder rung reached, once per rung.
 */
export function countShowUpDay(tx: Tx): void {
  // Days only move forward: a day at or before the last counted one is never counted again.
  const last = tx.s.lifetime.lastShowUpDay;
  if (last !== undefined && tx.env.today <= last) return;
  const life = tx.section('lifetime');
  life.showUpDays += 1;
  life.lastShowUpDay = tx.env.today;
  const rung = showUpRung(life.showUpDays);
  const key = `showup|${life.showUpDays}`;
  if (!rung || hasOnce(tx.s, key)) return;
  setOnce(tx, key);
  tx.emit(rung.exclusive ? { type: 'showUp', days: rung.days, stars: rung.stars, tickets: rung.tickets, exclusive: rung.exclusive } : { type: 'showUp', days: rung.days, stars: rung.stars, tickets: rung.tickets });
  grantStars(tx, rung.stars, 'showup');
  grantTickets(tx, rung.tickets);
  if (rung.exclusive) grantExclusive(tx, rung.exclusive);
}

/**
 * First Sprout (§9.6 "a one-time top-up brings the jar to exactly 25 coins"): the first rewarded
 * check-in before any capsule tops the wallet up to 25. The amount added is kept in the once-key:
 * onboarding's free capsule spends exactly that top-up if it comes after (gacha.ts), so the two
 * are one gift of one capsule.
 */
export function payFirstSprout(tx: Tx): void {
  const key = 'gift|first-sprout';
  if (tx.s.lifetime.pulls > 0 || hasOnce(tx.s, key)) return;
  const amount = Math.max(0, FIRST_SPROUT_COINS - tx.s.wallet.coins);
  setOnce(tx, key, amount);
  grantCoins(tx, amount, 'gift');
}

/**
 * Streak rungs (v1 §13.5): coins only, once per (habit, tier). A tier pays when a reward-path action
 * lifts the habit's best streak *since its creation day* (occurrence-equivalent) past it. A rung
 * first reached through history edits "counts as reached but unpaid": the best streak was already
 * past it, and days before the habit existed never count toward a paid rung.
 */
export function payRungs(tx: Tx, habitId: string, bestBefore: number): void {
  const habit = findHabit(tx.s, habitId);
  if (!habit) return;
  const since = habitCreatedOn(habit, tx.s.settings.dayStartsAt, tx.env.local);
  const best = rewardStreakOf(habit, logsOf(tx.s, habitId), trackingCtx(tx.s, tx.env.today), since).best;
  if (!best || best.occurrences <= bestBefore) return;
  for (const r of RUNGS) {
    if (r.tier <= bestBefore || r.tier > best.occurrences) continue;
    const key = `rung|${habitId}|${r.tier}`;
    if (hasOnce(tx.s, key)) continue;
    setOnce(tx, key);
    grantCoins(tx, r.coins, 'rung', habitId);
    tx.emit({ type: 'rung', habitId, streak: best.length, unit: best.unit, tierDays: r.tier, coins: r.coins });
  }
}

/**
 * Plant stages (v1 §13.4): stage = min(stageFromSunshine(ledger sunshine), completed occurrences
 * since the creation day, calendar pace (growth.ts)); the high-water mark `bestStage` only rises,
 * one `plantStage` event per stage crossed, and the first plant to reach Evergreen grants the Laurel
 * Sprig (§6 "Evergreen reward"). Returns the displayed stage.
 */
export function updatePlantStage(tx: Tx, habitId: string): number {
  const habit = findHabit(tx.s, habitId);
  if (!habit) return 0;
  const since = habitCreatedOn(habit, tx.s.settings.dayStartsAt, tx.env.local);
  const completed = completedOccurrences(habit, logsOf(tx.s, habitId), trackingCtx(tx.s, tx.env.today), since);
  const stage = plantStage(tx.s.ledger.sunshine[habitId] ?? 0, completed, daysSinceCreation(since, tx.env.today));
  const best = tx.s.ledger.bestStage[habitId] ?? 0;
  if (stage > best) {
    tx.ledger('bestStage')[habitId] = stage;
    const crossed = stagesCrossed(best, stage);
    recordStageDates(tx, habitId, crossed);
    for (const st of crossed) tx.emit({ type: 'plantStage', habitId, stage: st, stageName: stageName(st) });
    if (stage >= EVERGREEN) grantExclusive(tx, LAUREL_SPRIG_ID);
    leaveKeepsakes(tx, habitId, crossed);
  }
  const shown = Math.max(stage, best);
  recordFlourishes(tx, habitId, flourishesFor(tx.s.ledger.sunshine[habitId] ?? 0, shown));
  recordCutting(tx);
  readPlantLook(tx, habitId, shown);
  return shown;
}

/** Records the app day each stage was first reached (Sunday Note stage-ups, Herbarium margins, reviews). */
function recordStageDates(tx: Tx, habitId: string, stages: readonly number[]): void {
  if (stages.length === 0) return;
  const cur = tx.s.stageDates?.[habitId] ?? {};
  const next = { ...cur };
  for (const st of stages) next[st] ??= tx.env.today;
  tx.set('stageDates', { ...tx.s.stageDates, [habitId]: next });
}

/** The once-key holding The Cutting's best stage (a high-water mark: it never shrinks, §3.1). */
export const CUTTING_KEY = 'cutting';

/** The Cutting as the screens show it: lifetime sunshine across all habits, never below its best stage. */
export function cuttingOf(s: Pick<AppState, 'ledger'>): CuttingVM {
  const best = s.ledger.once[CUTTING_KEY];
  return theCutting(lifetimeSunshine(s.ledger.sunshine), typeof best === 'number' ? best : 0);
}

/** Raises The Cutting's high-water mark when lifetime sunshine reaches a new stage. */
function recordCutting(tx: Tx): void {
  const lifetime = lifetimeSunshine(tx.s.ledger.sunshine);
  const best = tx.s.ledger.once[CUTTING_KEY];
  const bestStage = typeof best === 'number' ? best : 0;
  if (bestStage + 1 < CUTTING_THRESHOLDS.length && lifetime + 1e-9 >= CUTTING_THRESHOLDS[bestStage + 1]!) {
    setOnce(tx, CUTTING_KEY, theCutting(lifetime).stage);
  }
}

/** The once-key holding the most Flourishes a plant has had (they are permanent visitors). */
export const flourishKey = (habitId: string): string => `flourish|${habitId}`;

/** Flourishes that have arrived for a habit's plant: a high-water mark (v1 §13.10 "permanent visitors"). */
export function bestFlourishes(s: Pick<AppState, 'ledger'>, habitId: string): number {
  const v = s.ledger.once[flourishKey(habitId)];
  return typeof v === 'number' ? v : 0;
}

/**
 * Raises the Flourish high-water mark. After Evergreen a visitor arrives every +60 sunshine and
 * stays (v1 §13.10), so un-checking inside the refund window can take the sunshine back but never a
 * visitor that already came.
 */
function recordFlourishes(tx: Tx, habitId: string, flourishes: number): void {
  if (flourishes > bestFlourishes(tx.s, habitId)) setOnce(tx, flourishKey(habitId), flourishes);
}

/* ------------------------------------------------------------------ */
/* Compaction                                                          */
/* ------------------------------------------------------------------ */

/**
 * Folds the ledger to the refund window (v1 §13.8): per-occurrence entries older than today−7 are
 * dropped (their sunshine already lives in the per-habit totals, and those days can no longer be
 * un-checked through the check-in path), old daily budgets go, and once-keys that can never be
 * earned again are pruned. Keeps the save bounded however long the sill grows.
 */
export function compactLedger(tx: Tx): void {
  const s = tx.s;
  const today = tx.env.today;
  const horizon = addDays(today, -LEDGER_DAYS);
  const staleRecent = Object.keys(s.ledger.recent).filter((k) => ledgerKeyDate(k) < horizon);
  if (staleRecent.length > 0) {
    const recent = tx.ledger('recent');
    for (const k of staleRecent) delete recent[k];
  }
  const staleDaily = Object.keys(s.ledger.daily).filter((d) => d < horizon);
  if (staleDaily.length > 0) {
    const daily = tx.ledger('daily');
    for (const d of staleDaily) delete daily[d];
  }
  const stale = Object.entries(s.ledger.once)
    .filter(([k, v]) => onceKeyExpired(s, k, v, today))
    .map(([k]) => k);
  if (stale.length > 0) {
    const once = tx.ledger('once');
    for (const k of stale) delete once[k];
  }
}

/** Whether a once-key can never matter again (see compactLedger). */
export function onceKeyExpired(s: AppState, key: string, value: number | true, today: DateKey): boolean {
  const parts = key.split('|');
  const todayN = dayNumber(today);
  switch (parts[0]) {
    case 'perfect':
      // Perfect-week checks look back at most 12 days (a window day's week).
      return parts[1]! < addDays(today, -13);
    case 'rest':
      // Read by the rest allowance of weeks that still hold a window day.
      return parts[2]! < addDays(today, -13);
    case 'harvest':
      return parts[2]! < today;
    case 'found':
      return parts[1]! < today;
    case 'company':
      // Companion XP is once per occurrence; occurrences leave the refund window after a week. A
      // flexible occurrence's key ('company|<habit>|<periodKey>|<date>', valued with the period's
      // last day number) is kept like a period key: while its period could overlap one that can
      // still take a rewardable check-in.
      if (parts.length === 4) return (typeof value === 'number' ? value : dayNumber(parts[2]!)) < dayNumber(addDays(today, -(BACKFILL_DAYS + 7)));
      return parts[2]! < addDays(today, -LEDGER_DAYS);
    case 'grow':
      // An accepted offer keeps the offer closed for GROW_COOLDOWN_DAYS.
      return parts[2]! < addDays(today, -(GROW_COOLDOWN_DAYS - 1));
    case 'home':
      return typeof value !== 'number' || todayN - value >= WELCOME_HOME.cooldownDays;
    case 'weekly':
      return parts[1]! < addDays(today, -21);
    case 'bloom':
      return parts[1]! < addDays(today, -62).slice(0, 7);
    case 'period':
      // Kept while its period could overlap one that can still take a rewardable check-in: a week
      // holding a window day starts no earlier than today−12 (after a week-start change it may
      // regroup days of an already-paid week), so keys of periods ending before today−13 go.
      if (!findHabit(s, parts[1]!)) return true;
      return (typeof value === 'number' ? value : dayNumber(parts[2]!)) < dayNumber(addDays(today, -(BACKFILL_DAYS + 7)));
    default:
      return false;
  }
}
