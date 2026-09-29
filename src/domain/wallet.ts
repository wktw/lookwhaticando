/**
 * Wallet movements and once-only grants (DESIGN §6 "The economy").
 *
 * Internal names (§6): `stars` are stamps, `stardust` are swaps.
 * Rules enforced here, for every caller:
 * - Balances never go negative: spends and refunds are all-or-nothing and report failure.
 * - Swaps auto-fuse: every 10 swaps become 1 stamp, so `wallet.stardust` stays in 0..9.
 * - `lifetime.coinsEarned` / `starsEarned` track net earnings (a refund gives coins back).
 * - Every grant emits the GameEvent the FX layer animates.
 * - Once-only grants are keyed in `ledger.once` (see the key list on AppState.ledger).
 */
import type { CoinReason, GameEvent } from '@/state/api';
import type { AppState } from '@/state/types';
import { STARDUST_PER_STAR } from '@/catalog/machines';
import { isClockRolledBack } from './dates';
import type { Tx } from './tx';

type StarReason = Extract<GameEvent, { type: 'stars' }>['reason'];

export function grantCoins(tx: Tx, amount: number, reason: CoinReason, habitId?: string): void {
  if (!(amount > 0)) return;
  tx.section('wallet').coins += amount;
  tx.section('lifetime').coinsEarned += amount;
  tx.emit(habitId === undefined ? { type: 'coins', amount, reason } : { type: 'coins', amount, reason, habitId });
}

/** Takes coins for a purchase. False (and no change) when the balance is short. */
export function spendCoins(tx: Tx, amount: number): boolean {
  if (amount < 0 || tx.s.wallet.coins < amount) return false;
  if (amount > 0) tx.section('wallet').coins -= amount;
  return true;
}

/**
 * Gives back coins earned by a check-in that was undone, only if the balance allows (all or
 * nothing, DESIGN §6 "Unchecking refunds it if the balance allows"). Emits a negative `coins` event on success.
 */
export function refundCoins(tx: Tx, amount: number, habitId?: string): boolean {
  if (!(amount > 0)) return true;
  if (tx.s.wallet.coins < amount) return false;
  tx.section('wallet').coins -= amount;
  const life = tx.section('lifetime');
  life.coinsEarned = Math.max(0, life.coinsEarned - amount);
  tx.emit(habitId === undefined ? { type: 'coins', amount: -amount, reason: 'refund' } : { type: 'coins', amount: -amount, reason: 'refund', habitId });
  return true;
}

export function grantStars(tx: Tx, amount: number, reason: StarReason): void {
  if (!(amount > 0)) return;
  tx.section('wallet').stars += amount;
  tx.section('lifetime').starsEarned += amount;
  tx.emit({ type: 'stars', amount, reason });
}

export function spendStars(tx: Tx, amount: number): boolean {
  if (amount < 0 || tx.s.wallet.stars < amount) return false;
  if (amount > 0) tx.section('wallet').stars -= amount;
  return true;
}

export function grantTickets(tx: Tx, amount: number): void {
  if (!(amount > 0)) return;
  tx.section('wallet').tickets += amount;
  tx.emit({ type: 'tickets', amount });
}

export function spendTicket(tx: Tx): boolean {
  if (tx.s.wallet.tickets < 1) return false;
  tx.section('wallet').tickets -= 1;
  return true;
}

/** Adds swaps (stardust) and fuses every 10 into a stamp (DESIGN §6). Returns the stamps fused. */
export function grantStardust(tx: Tx, amount: number): number {
  if (!(amount > 0)) return 0;
  const wallet = tx.section('wallet');
  const total = wallet.stardust + amount;
  const fused = Math.floor(total / STARDUST_PER_STAR);
  wallet.stardust = total - fused * STARDUST_PER_STAR;
  tx.emit({ type: 'stardust', amount, fused });
  if (fused > 0) grantStars(tx, fused, 'fusion');
  return fused;
}

/* ------------------------------------------------------------------ */
/* Once-only keys                                                      */
/* ------------------------------------------------------------------ */

export function hasOnce(s: Pick<AppState, 'ledger'>, key: string): boolean {
  return s.ledger.once[key] !== undefined;
}

export function setOnce(tx: Tx, key: string, value: number | true = true): void {
  tx.ledger('once')[key] = value;
}

/**
 * Adds a collectible to the collection (count + 1). Returns true when it was new.
 * Pet states and pantry recipes are the callers' business.
 */
export function addToCollection(tx: Tx, id: string): boolean {
  const collection = tx.section('collection');
  const prev = collection[id];
  // A second copy came another way than the Special Order: it no longer counts as only ordered.
  collection[id] = prev ? { count: prev.count + 1, firstAt: prev.firstAt } : { count: 1, firstAt: tx.env.now };
  return !prev;
}

/** Grants an exclusive collectible once ever (the Laurel Sprig, the Window Seat, Field Guide decor…). */
export function grantExclusive(tx: Tx, collectibleId: string): boolean {
  const key = `exclusive|${collectibleId}`;
  if (hasOnce(tx.s, key)) return false;
  setOnce(tx, key);
  addToCollection(tx, collectibleId);
  tx.emit({ type: 'exclusive', collectibleId });
  return true;
}

/* ------------------------------------------------------------------ */
/* Clock guard                                                         */
/* ------------------------------------------------------------------ */

/**
 * True while the device clock is more than 36 h behind the latest time ever observed
 * (DESIGN v1 §13.2): logging still works, but no rewards are paid until the clock catches up.
 */
export function rewardsPaused(s: AppState, now: number): boolean {
  return isClockRolledBack(now, s.clock.maxEpochMs);
}
