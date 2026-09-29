/**
 * The clock and the start of a new app day (DESIGN §13.2 "Day boundary", §13.7/§13.10 pantry,
 * §13.10 rituals and birthday, §13.8 ledger compaction).
 *
 * `observeClock` keeps the clock guard's high-water marks (the latest app day and epoch ever seen)
 * — never while the clock is rolled back, so a device set back in time can't move them.
 * `openDay` runs the once-a-day work when the app day advances (at launch, on resume, or at the
 * boundary while open):
 * 1. day-end tiny: a count habit that reached `tiny.count` but not its target on a day that just
 *    closed is now recorded as tiny, and paid as tiny if the day is still rewardable;
 * 2. the morning pantry restock;
 * 3. last week's letter and last month's bouquet (first open of a new week/month);
 * 4. the birthday surprise (1 ticket every year, Party Hat + Birthday Cake once);
 * 5. compaction (ledger to the refund window, stamps to 120 days).
 */
import { BIRTHDAY_CAKE_ID, PARTY_HAT_ID } from '@/catalog/collectibles';
import type { DateKey } from '@/state/types';
import { logStatus } from './activity';
import { addDays, isLeapYear, maxDateKey, parseDateKey } from './dates';
import { bestStreakOccurrences, compactLedger, ledgerKey } from './economy';
import { ensureLetters } from './letters';
import { pruneOldStamps, rewardPass } from './logging';
import { restockPantry } from './pantry';
import { ruleAt } from './rules';
import { isDayBased } from './schedule';
import type { Tx } from './tx';
import { grantExclusive, grantTickets, hasOnce, rewardsPaused, setOnce } from './wallet';

export const EPOCH_REFRESH_MS = 15 * 60_000;

/** Raises the clock guard's high-water marks (never while rolled back). */
export function observeClock(tx: Tx): void {
  const { clock } = tx.s;
  if (rewardsPaused(tx.s, tx.env.now)) return;
  // The epoch mark only needs hour precision (36 h tolerance): refresh it every 15 minutes at most,
  // so an idle open app doesn't rewrite the save on every clock tick.
  if (tx.env.today <= clock.maxDateKey && tx.env.now - clock.maxEpochMs < EPOCH_REFRESH_MS) return;
  const c = tx.section('clock');
  c.maxEpochMs = Math.max(c.maxEpochMs, tx.env.now);
  c.maxDateKey = c.maxDateKey ? maxDateKey(c.maxDateKey, tx.env.today) : tx.env.today;
}

/**
 * Day-end tiny (§13.2): for each day in [from, today−1] still inside the rewarding window, count
 * habits that reached their tiny count but not the target get their tiny grant.
 */
export function closeDays(tx: Tx, from: DateKey): void {
  const today = tx.env.today;
  const first = maxDateKey(from, addDays(today, -6));
  for (let d = first; d < today; d = addDays(d, 1)) {
    for (const h of tx.s.habits) {
      const log = tx.s.logs[h.id]?.[d];
      if (log?.kind !== 'log' || log.level === 'tiny') continue;
      const rule = ruleAt(h, d);
      if (!isDayBased(rule) || rule.tiny?.count === undefined) continue;
      if (logStatus(log, rule, true) !== 'tiny') continue;
      const held = tx.s.ledger.recent[ledgerKey(h.id, d)]?.lvl;
      if (held === 'tiny' || held === 'full') continue;
      // As of `d` itself the day was still pending, which is exactly "before it closed".
      rewardPass(tx, h.id, d, { user: false, bestBefore: bestStreakOccurrences(tx.s, h.id, d) });
    }
  }
}

/** The birthday on a given year ('MM-DD'; Feb 29 falls on Feb 28 in other years). */
export function birthdayOn(mmdd: string, year: number): DateKey | null {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
  if (!m) return null;
  const month = Number(m[1]);
  let day = Number(m[2]);
  if (month === 2 && day === 29 && !isLeapYear(year)) day = 28;
  const key = `${year}-${m[1]}-${String(day).padStart(2, '0')}`;
  try {
    parseDateKey(key);
    return key;
  } catch {
    return null;
  }
}

/** Birthday surprise (§13.10): 1 ticket on the day each year; the Party Hat and Birthday Cake once. */
export function birthdaySurprise(tx: Tx): boolean {
  const { birthday, onboarded } = tx.s.profile;
  if (!birthday || !onboarded || rewardsPaused(tx.s, tx.env.now)) return false;
  const year = parseDateKey(tx.env.today).year;
  if (birthdayOn(birthday, year) !== tx.env.today) return false;
  const key = `birthday|${year}`;
  if (hasOnce(tx.s, key)) return false;
  setOnce(tx, key);
  grantTickets(tx, 1);
  grantExclusive(tx, PARTY_HAT_ID);
  grantExclusive(tx, BIRTHDAY_CAKE_ID);
  return true;
}

/**
 * Brings the save up to `env.today`: observes the clock and, when the app day advanced since the
 * last one seen, runs the once-a-day work (see module doc). Idempotent within a day.
 */
export function openDay(tx: Tx): boolean {
  const previous = tx.s.clock.maxDateKey;
  observeClock(tx);
  if (rewardsPaused(tx.s, tx.env.now)) return false;
  const fresh = previous === '';
  if (!fresh && tx.env.today <= previous) return false;
  if (!fresh) closeDays(tx, previous);
  restockPantry(tx);
  ensureLetters(tx);
  birthdaySurprise(tx);
  compactSave(tx);
  return true;
}

/** Keeps the save bounded: the ledger folded to its window and old live stamps dropped. */
export function compactSave(tx: Tx): void {
  compactLedger(tx);
  pruneOldStamps(tx);
}
