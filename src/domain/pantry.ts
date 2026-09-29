/**
 * The pantry (DESIGN §13.7 "Treats are recipes", refined by §13.10 "Pantry & harvest").
 *
 * - Every owned treat is a *recipe*: each morning (app day) it restocks 2 free servings, banking up
 *   to 5, so feeding never costs anything and nothing piles up as a chore. A recipe acquired today
 *   starts with today's 2 servings.
 * - Harvest: a completing check-in on a Blooming-or-later plant drops one serving of that plant's
 *   harvest treat (HARVEST_BY_PLANT) into the basket, at most once per plant per day. A garden treat
 *   becomes an owned recipe the first time it is harvested.
 * - Bake a tray: 5 servings of an owned recipe for 10 coins (optional).
 * Harvests and bakes may go above the 5-serving bank (up to a sanity cap); restocks never do.
 */
import { HARVEST_BY_PLANT } from '@/catalog/collectibles';
import type { AppState, DateKey, Habit } from '@/state/types';
import { getCollectible } from '@/catalog/collectibles';
import { ownedTreats, owns } from './collection';
import { diffDays } from './dates';
import type { Tx } from './tx';
import { addToCollection, hasOnce, setOnce, spendCoins } from './wallet';

export const RESTOCK_PER_MORNING = 2;
export const PANTRY_BANK = 5;
export const PANTRY_MAX = 99;
export const BAKE = { servings: 5, coins: 10 } as const;

type PantryEntry = AppState['pantry'][string];

export function servingsOf(s: AppState, treatId: string): number {
  return s.pantry[treatId]?.servings ?? 0;
}

/** The entry after the mornings between its last restock and `today` (pure). */
export function restocked(entry: PantryEntry | undefined, today: DateKey): PantryEntry {
  if (!entry) return { servings: RESTOCK_PER_MORNING, restockedOn: today };
  const mornings = entry.restockedOn ? diffDays(entry.restockedOn, today) : 1;
  if (mornings <= 0) return entry;
  const servings = Math.max(entry.servings, Math.min(PANTRY_BANK, entry.servings + RESTOCK_PER_MORNING * mornings));
  return { servings, restockedOn: today };
}

/** Makes sure an owned treat has a pantry entry (a new recipe comes with today's servings). */
export function ensureRecipe(tx: Tx, treatId: string): void {
  if (tx.s.pantry[treatId]) return;
  tx.section('pantry')[treatId] = { servings: RESTOCK_PER_MORNING, restockedOn: tx.env.today };
}

/** Morning restock for every owned recipe. Emits one `restock` event when anything was added. */
export function restockPantry(tx: Tx): void {
  let restockedTreats = 0;
  for (const t of ownedTreats(tx.s.collection)) {
    const before = tx.s.pantry[t.id];
    const after = restocked(before, tx.env.today);
    if (after === before) continue;
    if (!before || after.servings > before.servings) restockedTreats++;
    tx.section('pantry')[t.id] = after;
  }
  if (restockedTreats > 0) tx.emit({ type: 'restock', treats: restockedTreats });
}

/** Uses one serving (false when there is none). */
export function takeServing(tx: Tx, treatId: string): boolean {
  const entry = tx.s.pantry[treatId];
  if (!entry || entry.servings < 1) return false;
  tx.section('pantry')[treatId] = { ...entry, servings: entry.servings - 1 };
  return true;
}

function addServings(tx: Tx, treatId: string, n: number): void {
  const entry = tx.s.pantry[treatId] ?? { servings: 0, restockedOn: tx.env.today };
  tx.section('pantry')[treatId] = { ...entry, servings: Math.min(PANTRY_MAX, entry.servings + n) };
}

/** Bake a tray: 5 servings of an owned recipe for 10 coins. */
export function bakeTray(tx: Tx, treatId: string): { ok: boolean } {
  const def = getCollectible(treatId);
  if (def?.category !== 'treat' || !owns(tx.s.collection, treatId)) return { ok: false };
  if (!spendCoins(tx, BAKE.coins)) return { ok: false };
  ensureRecipe(tx, treatId);
  addServings(tx, treatId, BAKE.servings);
  return { ok: true };
}

/** The treat a plant species yields once Blooming, if any. */
export function harvestTreatFor(habit: Pick<Habit, 'plant'>): string | null {
  return HARVEST_BY_PLANT[habit.plant] ?? null;
}

/**
 * Drops one serving of the habit plant's harvest treat (once per habit per app day). Returns the
 * treat id when something dropped. The caller checks the plant is Blooming or later.
 */
export function harvest(tx: Tx, habit: Pick<Habit, 'id' | 'plant'>): string | null {
  const treatId = harvestTreatFor(habit);
  if (!treatId) return null;
  const key = `harvest|${habit.id}|${tx.env.today}`;
  if (hasOnce(tx.s, key)) return null;
  setOnce(tx, key);
  const firstTime = !owns(tx.s.collection, treatId);
  if (firstTime) addToCollection(tx, treatId);
  ensureRecipe(tx, treatId);
  addServings(tx, treatId, 1);
  tx.emit({ type: 'harvest', habitId: habit.id, treatId, firstTime });
  return treatId;
}
