/**
 * Check-in rewards and the reward ledger (DESIGN §6.1 "Reward integrity", §13.2 "Backfill &
 * history", §13.4 "Growth", §13.5 "Economy v2", §13.10 "First Sprout").
 *
 * ## Which days pay
 * A (habit, date) occurrence can be rewarded only through the check-in path, only inside the 6-day
 * window (today−6 … today), only for days on/after the habit's creation day (its `createdAt` as an
 * app day), inside its lifetime, and never while the clock guard pauses rewards. Anything else is
 * history: it changes stats but never the wallet, sunshine or once-keys, in either direction.
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
 *   removes it, §13.4).
 * - **Same level**: nothing moves (so tapping +1 past a target, or changing effort, pays nothing).
 *
 * ## What a level is worth
 * - Pay by effort: light 4 · steady 5 · big 7; tiny = ⌈pay/2⌉ (§13.5) and 50% sunshine (§13.2).
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
 * stages and the Evergreen Crown — see each function below.
 */
import { EVERGREEN_CROWN_ID, BLOSSOM_SPROUT_ID } from '@/catalog/collectibles';
import type { AppState, DateKey, Effort, Habit } from '@/state/types';
import { EMPTY_LOGS, evaluateDay, inLifetime, isInBackfillWindow, logStatus, showedUp, type EvalContext, type HabitLogs } from './activity';
import { addDays, appDayKey, dayNumber, eachDay, minDateKey, startOfWeek, type LocalTimeReader } from './dates';
import { EVERGREEN, plantStage, stageName, stagesCrossed, sunshineFromHistory, sunshinePerOccurrence } from './growth';
import { evaluatePeriod, flexPeriodAt } from './periods';
import { ruleAt } from './rules';
import { isDayBased } from './schedule';
import { RUNGS, streakInfo, type StreakInfo } from './streaks';
import { seal, type Tx } from './tx';
import { grantCoins, grantExclusive, grantStars, grantTickets, hasOnce, refundCoins, rewardsPaused, setOnce } from './wallet';

/* ------------------------------------------------------------------ */
/* Constants (DESIGN §13.5)                                            */
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
/** First Sprout: the first check-in ever tops the wallet up to exactly one capsule (§13.10). */
export const FIRST_SPROUT_COINS = 25;
/** Ledger entries older than today−7 are folded into the totals (§13.8). */
export const LEDGER_DAYS = 7;

/** Showing-up ladder (account level; the source of stars and tickets, §13.5 + §13.10). */
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
  { days: 365, stars: 12, tickets: 3, exclusive: BLOSSOM_SPROUT_ID },
];
/** …then 6★ + 1 ticket every +100 days forever. */
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

/** The app day the habit was created (rewards never pay for earlier days, §13.2). */
export function habitCreatedOn(habit: Pick<Habit, 'createdAt'>, dayStartsAt: number, local: LocalTimeReader): DateKey {
  return appDayKey(habit.createdAt, dayStartsAt, local);
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

/** Achieved occurrences over the whole history (the "completed occurrences" of §13.4). */
export function completedOccurrences(habit: Habit, logs: HabitLogs, ctx: EvalContext): number {
  return cached(habit, logs, ctx, 'completed', () => sunshineFromHistory(habit, logs, ctx).completedOccurrences);
}

/** The habit's best streak as an occurrence-equivalent (the rung measure). */
export function bestStreakOccurrences(s: AppState, habitId: string, today: DateKey): number {
  const habit = findHabit(s, habitId);
  if (!habit) return 0;
  return streakOf(habit, logsOf(s, habitId), trackingCtx(s, today)).best?.occurrences ?? 0;
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
}

const NO_CHANGE = (l: GrantLevel): Settlement => ({ prev: l, next: l, paid: 0, refunded: 0, refundBlocked: false, sunshine: 0 });

/**
 * Brings the ledger entry of (habit, date) in line with the level the day deserves (see module
 * doc). The caller must have checked `isRewardableDay`.
 */
export function settleOccurrence(tx: Tx, habitId: string, date: DateKey): Settlement {
  const s = tx.s;
  const habit = findHabit(s, habitId);
  if (!habit) return NO_CHANGE('none');
  const key = ledgerKey(habitId, date);
  const entry = s.ledger.recent[key];
  const prev: GrantLevel = entry?.lvl ?? 'none';
  const next = deservedLevel(s, habit, date, tx.env.today);
  if (prev === next) return NO_CHANGE(prev);

  const today = tx.env.today;
  const rule = ruleAt(habit, date);
  let coins = entry?.coins ?? 0;
  let cap = entry?.cap;
  let paid = 0;
  let refunded = 0;
  let refundBlocked = false;

  if (RANK[next] > RANK[prev]) {
    const fullNow = fullRateCoins(habit.effort, s.ledger.daily[today] ?? 0);
    const base = next === 'over' ? OVER_TARGET_PAY : cap !== undefined ? Math.min(cap, fullNow) : fullNow;
    const want = next === 'tiny' ? Math.ceil(base / 2) : base;
    paid = Math.max(0, want - coins);
    if (next !== 'over' && cap === undefined) cap = fullNow;
    if (paid > 0) {
      grantCoins(tx, paid, 'checkin', habitId);
      const daily = tx.ledger('daily');
      daily[today] = (daily[today] ?? 0) + paid;
      coins += paid;
    }
  } else {
    const keep = next === 'none' ? 0 : Math.min(coins, Math.ceil(coins / 2));
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

  const heldSun = entry?.sunshine ?? 0;
  const wantSun = next === 'none' || next === 'over' ? 0 : round6(sunshinePerOccurrence(rule, next === 'tiny'));
  const sunDelta = wantSun - heldSun;
  if (sunDelta !== 0) {
    const totals = tx.ledger('sunshine');
    totals[habitId] = Math.max(0, round6((totals[habitId] ?? 0) + sunDelta));
  }

  if (prev === 'none' || next === 'none') {
    const life = tx.section('lifetime');
    life.checkins = Math.max(0, life.checkins + (prev === 'none' ? 1 : -1));
  }

  const recent = tx.ledger('recent');
  if (next === 'none' && coins === 0 && cap === undefined) delete recent[key];
  else {
    recent[key] = {
      coins,
      sunshine: wantSun,
      ...(cap !== undefined ? { cap } : {}),
      ...(next !== 'none' ? { lvl: next } : {}),
    };
  }
  return { prev, next, paid, refunded, refundBlocked, sunshine: sunDelta };
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
 * period's check-in days first reach max(1, target) (§13.5).
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
  /** Day-based done/tiny plus flexible check-ins that day. */
  done: number;
  /** Every scheduled day-based habit is done or allowed-rest. */
  allClear: boolean;
}

/**
 * Perfect day (§13.5): every scheduled day-based habit is done or on an allowed rest, AND
 * done ≥ max(2, ⌈⅔ × scheduled⌉), where flexible check-ins that day count toward done. Paused
 * habits and off days are not scheduled. Today can only be perfect once it is actually complete.
 */
export function perfectDayStatus(s: AppState, date: DateKey, today: DateKey): PerfectDayStatus {
  const ctx = trackingCtx(s, today);
  let scheduled = 0;
  let done = 0;
  let allClear = true;
  for (const h of s.habits) {
    if (!inLifetime(h, date)) continue;
    const ev = evaluateDay(h, logsOf(s, h.id), date, ctx);
    if (!ev.dayBased) {
      if (showedUp(ev.status)) done++;
      continue;
    }
    if (!ev.scheduled) continue;
    if (ev.outcome === 'achieved') {
      scheduled++;
      done++;
    } else if (ev.inactive === 'rest') scheduled++;
    else if (ev.inactive === 'paused' || ev.inactive === 'off') continue;
    else {
      scheduled++;
      allClear = false;
    }
  }
  const needed = Math.max(PERFECT_DAY.minDone, Math.ceil(PERFECT_DAY.share * scheduled - 1e-9));
  return { perfect: allClear && done >= needed, scheduled, done, allClear };
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
 * Welcome home (§13.5): the first check-in after ≥ 3 consecutive app days with zero check-in
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
 * Showing up (§13.5): `showUpDays` counts distinct *action* days with ≥ 1 rewarded check-in, so it
 * can't be farmed by adding habits (one per day however many check-ins) or inflated by rests (rests
 * are not check-ins). Pays the ladder rung reached, once per rung.
 */
export function countShowUpDay(tx: Tx): void {
  if (tx.s.lifetime.lastShowUpDay === tx.env.today) return;
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

/** First Sprout (§13.10): the first rewarded check-in before any capsule tops the wallet up to 25. */
export function payFirstSprout(tx: Tx): void {
  const key = 'gift|first-sprout';
  if (tx.s.lifetime.pulls > 0 || hasOnce(tx.s, key)) return;
  const amount = Math.max(0, FIRST_SPROUT_COINS - tx.s.wallet.coins);
  setOnce(tx, key, amount);
  grantCoins(tx, amount, 'gift');
}

/**
 * Streak rungs (§13.5): coins only, once per (habit, tier). A tier pays when a reward-path action
 * lifts the habit's *best* streak (occurrence-equivalent) past it. A rung first reached through
 * history edits "counts as reached but unpaid": the best streak was already past it.
 */
export function payRungs(tx: Tx, habitId: string, bestBefore: number): void {
  const habit = findHabit(tx.s, habitId);
  if (!habit) return;
  const best = streakOf(habit, logsOf(tx.s, habitId), trackingCtx(tx.s, tx.env.today)).best;
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
 * Plant stages (§13.4): stage = min(stageFromSunshine(ledger sunshine), completed occurrences);
 * the high-water mark `bestStage` only rises, one `plantStage` event per stage crossed, and the
 * first Evergreen grants the Evergreen Crown (§13.5). Returns the displayed stage.
 */
export function updatePlantStage(tx: Tx, habitId: string): number {
  const habit = findHabit(tx.s, habitId);
  if (!habit) return 0;
  const completed = completedOccurrences(habit, logsOf(tx.s, habitId), trackingCtx(tx.s, tx.env.today));
  const stage = plantStage(tx.s.ledger.sunshine[habitId] ?? 0, completed);
  const best = tx.s.ledger.bestStage[habitId] ?? 0;
  if (stage <= best) return best;
  tx.ledger('bestStage')[habitId] = stage;
  for (const st of stagesCrossed(best, stage)) tx.emit({ type: 'plantStage', habitId, stage: st, stageName: stageName(st) });
  if (stage >= EVERGREEN) grantExclusive(tx, EVERGREEN_CROWN_ID);
  return stage;
}

/* ------------------------------------------------------------------ */
/* Compaction                                                          */
/* ------------------------------------------------------------------ */

/**
 * Folds the ledger to the refund window (§13.8): per-occurrence entries older than today−7 are
 * dropped (their sunshine already lives in the per-habit totals, and those days can no longer be
 * un-checked through the check-in path), old daily budgets go, and once-keys that can never be
 * earned again are pruned. Keeps the save bounded however long the meadow grows.
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
    case 'harvest':
    case 'grow':
      return parts[2]! < today;
    case 'home':
      return typeof value !== 'number' || todayN - value >= WELCOME_HOME.cooldownDays;
    case 'weekly':
      return parts[1]! < addDays(today, -21);
    case 'bloom':
      return parts[1]! < addDays(today, -62).slice(0, 7);
    case 'period':
      // Kept while its period could still take a rewardable check-in (or overlap one that can).
      if (!findHabit(s, parts[1]!)) return true;
      return (typeof value === 'number' ? value : dayNumber(parts[2]!)) < dayNumber(addDays(today, -LEDGER_DAYS));
    default:
      return false;
  }
}
