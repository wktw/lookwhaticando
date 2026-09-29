/**
 * Capsule pulls, the Wishing Well and the sparkle exchange (DESIGN §6.2–§6.4 as amended by §13.6,
 * §13.10 "Onboarding earns the first capsule" and §13.11 "Secrets & visibility").
 *
 * A pull, in order:
 * 1. Availability & payment: seasonal machines only inside their window; coins or stars at the
 *    machine price, or a ticket (any available machine, Dreamy included), or `free` (only the very
 *    first pull ever, on Kitty Capsule or Moo Moo Milk Bar, and only while First Sprout has not
 *    been paid: §13.10 onboarding earns the first capsule, which supersedes §9.6's free pull, so
 *    the two can never add up to two first capsules). A pending reveal blocks new pulls.
 * 2. The first pull ever on Kitty / Moo is a guaranteed Classic or Special **pet** from that series
 *    (tier rolled 60:25, then new-first).
 * 3. Otherwise the tier is rolled from the machine odds, except:
 *    - ultra pity: the 40th pull without an ultra is an ultra;
 *    - rare pity: the 10th pull without a rare-or-better is a **rare** (rare tier only; ultra pity
 *      stays independent and wins when both are due);
 *    - a pity whose tier is fully owned is off (its counter is hidden: `null`) and stays at 0: it
 *      counts only pulls made while its tier still had something unowned;
 *    - lucky meter: after 4 consecutive duplicates the next pull is guaranteed new (tiers without
 *      anything unowned are left out of the roll) when anything is unowned.
 *    An empty tier falls to the nearest non-empty tier below, then above.
 * 4. Inside the tier, unowned items weigh 3, owned 1 (new-first); pity and lucky picks take an
 *    unowned item when one exists. Dreamy Night's Moonlit variants (one per owned base pet, rare)
 *    share **one** slot in the rare tier (§13.11), so owning more pets never dilutes the printed
 *    rares. The slot weighs half a printed item: with Dreamy's 5 rares at 20% and 3 Super rares at
 *    10%, a full-weight slot would make each printed rare exactly as likely as a Super rare
 *    (20/6 = 10/3), breaking §13.6's "every rarer item is less likely than every commoner one".
 * 5. Duplicates turn into stardust (2/4/8/15, auto-fusing 10 → 1★); a duplicate pet also gets +20
 *    friendship. A new pet gets its PetState (personality + favorite treat rolled, default name)
 *    and goes to the meadow if there is room. A new treat becomes a pantry recipe.
 * 6. Commit before animate: the result is stored as `pendingReveal` before the UI plays it.
 */
import { SECRET_IDS, getCollectible, moonlitBase } from '@/catalog/collectibles';
import { NEW_ITEM_WEIGHT, PITY_RARE, PITY_ULTRA, STARDUST_FOR_DUPLICATE, WISH_PRICE, getMachine } from '@/catalog/machines';
import type { CollectibleDef, MachineId, Rarity } from '@/catalog/types';
import { RARITIES } from '@/catalog/types';
import type { PullError, PullResult, WishOutcome } from '@/state/api';
import type { AppState, DateKey, PetState, PityCounter } from '@/state/types';
import { evaluateBadges } from './badges';
import { eligibleMoonlitIds, isMachineComplete, isMachineSource, isMoonlitAvailable, machineLineup, owns } from './collection';
import { appDayKey } from './dates';
import { PET_XP, addXp, newPetState } from './friendship';
import { hasMeadowRoom } from './meadow';
import { ensureRecipe } from './pantry';
import type { Rng } from './rng';
import { machineAvailability, seasonVisited } from './seasons';
import type { Tx } from './tx';
import { addToCollection, grantStardust, spendCoins, spendStars, spendTicket } from './wallet';

/** Machines whose first-ever pull is the onboarding capsule (§13.10). */
export const FIRST_CAPSULE_MACHINES: readonly MachineId[] = ['kitty', 'moo'];
/** Sparkle exchange on a completed machine: 250 coins → 40 stardust (§13.6). */
export const SPARKLE_EXCHANGE = { coins: 250, stardust: 40 } as const;
/** Wishing Well price of a Moonlit variant (§13.6). */
export const MOONLIT_WISH_PRICE = 8;
/** The Moonlit slot's weight as a fraction of one printed item's (see module doc, step 4). */
export const MOONLIT_SLOT_SHARE = 0.5;

/** The shared Moonlit slot's weight: half of what one item would weigh (3 if any variant is unowned, else 1). */
function moonlitSlotWeight(moonlit: readonly PoolItem[], collection: AppState['collection']): number {
  if (moonlit.length === 0) return 0;
  return (moonlit.some((m) => !owns(collection, m.id)) ? NEW_ITEM_WEIGHT : 1) * MOONLIT_SLOT_SHARE;
}

/* ------------------------------------------------------------------ */
/* Pools                                                               */
/* ------------------------------------------------------------------ */

export interface PoolItem {
  id: string;
  rarity: Rarity;
  /** A Moonlit variant (Dreamy Night only; all of them share one rare slot). */
  moonlit: boolean;
}

/** Everything a machine can drop right now: its lineup, plus Moonlit variants on Dreamy Night. */
export function machinePool(machineId: MachineId, collection: AppState['collection']): PoolItem[] {
  const pool: PoolItem[] = machineLineup(machineId).map((c) => ({ id: c.id, rarity: c.rarity, moonlit: false }));
  if (machineId === 'dreamy') for (const id of eligibleMoonlitIds(collection)) pool.push({ id, rarity: 'rare', moonlit: true });
  return pool;
}

const tierOf = (pool: readonly PoolItem[], r: Rarity): PoolItem[] => pool.filter((p) => p.rarity === r);

export function tierFullyOwned(pool: readonly PoolItem[], r: Rarity, collection: AppState['collection']): boolean {
  return tierOf(pool, r).every((p) => owns(collection, p.id));
}

/** A machine's pity counter (zeros before its first pull). */
export function pityOf(s: Pick<AppState, 'pity'>, machineId: MachineId): PityCounter {
  return s.pity[machineId] ?? { sinceRare: 0, sinceUltra: 0, dupStreak: 0, pulls: 0 };
}

/**
 * Pulls until a guaranteed rare / ultra, counting the next pull as 1 ("Rare+ within 3 pulls").
 * null when that tier is fully owned (the counter is hidden and the pity is off).
 */
export function pityCountdown(pool: readonly PoolItem[], pity: PityCounter, collection: AppState['collection']): { rareIn: number | null; ultraIn: number | null } {
  const has = (r: Rarity) => tierOf(pool, r).length > 0 && !tierFullyOwned(pool, r, collection);
  return {
    rareIn: has('rare') ? Math.max(1, PITY_RARE - pity.sinceRare) : null,
    ultraIn: has('ultra') ? Math.max(1, PITY_ULTRA - pity.sinceUltra) : null,
  };
}

/* ------------------------------------------------------------------ */
/* The roll (pure)                                                     */
/* ------------------------------------------------------------------ */

function weightedPick<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let x = rng() * total;
  for (const t of items) {
    x -= weight(t);
    if (x < 0) return t;
  }
  return items[items.length - 1]!;
}

/** Rolls a tier from percentage odds, restricted to `allowed` tiers (renormalised). */
export function rollTier(rng: Rng, odds: Readonly<Record<Rarity, number>>, allowed: readonly Rarity[] = RARITIES): Rarity {
  const tiers = RARITIES.filter((r) => allowed.includes(r) && odds[r] > 0);
  if (tiers.length === 0) return allowed[0] ?? 'common';
  return weightedPick(rng, tiers, (r) => odds[r]);
}

/** The nearest non-empty tier: `r` itself, else below (commoner), else above. */
export function nonEmptyTier(pool: readonly PoolItem[], r: Rarity): Rarity {
  const i = RARITIES.indexOf(r);
  for (let j = i; j >= 0; j--) if (tierOf(pool, RARITIES[j]!).length > 0) return RARITIES[j]!;
  for (let j = i + 1; j < RARITIES.length; j++) if (tierOf(pool, RARITIES[j]!).length > 0) return RARITIES[j]!;
  return r;
}

/**
 * Picks inside a tier: unowned weigh 3, owned 1; the Moonlit variants form one shared slot (half an
 * item's weight) and split it by the same new-first weights. `onlyNew` restricts to unowned items
 * when any exist.
 */
export function pickInTier(rng: Rng, items: readonly PoolItem[], collection: AppState['collection'], onlyNew = false): PoolItem {
  const unowned = items.filter((i) => !owns(collection, i.id));
  const candidates = onlyNew && unowned.length > 0 ? unowned : items;
  const w = (i: PoolItem) => (owns(collection, i.id) ? 1 : NEW_ITEM_WEIGHT);
  const printed = candidates.filter((i) => !i.moonlit);
  const moonlit = candidates.filter((i) => i.moonlit);
  type Slot = { item: PoolItem } | { moonlit: PoolItem[] };
  const slots: Slot[] = printed.map((item) => ({ item }));
  if (moonlit.length > 0) slots.push({ moonlit });
  const slot = weightedPick(rng, slots, (sl) => ('item' in sl ? w(sl.item) : moonlitSlotWeight(sl.moonlit, collection)));
  return 'item' in slot ? slot.item : weightedPick(rng, slot.moonlit, w);
}

/**
 * The chance of each item on an ordinary roll right now (no pity or lucky meter): tier odds (an
 * empty tier's share falls to the nearest non-empty tier) × the item's share of its tier's weight
 * (new-first 3×; Moonlit variants split one slot). This is what the odds sheet prints per item.
 */
export function itemChances(machineId: MachineId, collection: AppState['collection']): Map<string, number> {
  const machine = getMachine(machineId);
  const pool = machinePool(machineId, collection);
  const out = new Map<string, number>();
  const tierShare = new Map<Rarity, number>();
  for (const r of RARITIES) {
    if (!(machine.odds[r] > 0)) continue;
    const target = nonEmptyTier(pool, r);
    tierShare.set(target, (tierShare.get(target) ?? 0) + machine.odds[r] / 100);
  }
  const w = (id: string) => (owns(collection, id) ? 1 : NEW_ITEM_WEIGHT);
  for (const [r, share] of tierShare) {
    const items = tierOf(pool, r);
    const printed = items.filter((i) => !i.moonlit);
    const moonlit = items.filter((i) => i.moonlit);
    const slotW = moonlitSlotWeight(moonlit, collection);
    const total = printed.reduce((a, i) => a + w(i.id), 0) + slotW;
    if (total === 0) continue;
    for (const i of printed) out.set(i.id, (share * w(i.id)) / total);
    const mTotal = moonlit.reduce((a, i) => a + w(i.id), 0);
    for (const i of moonlit) out.set(i.id, ((share * slotW) / total) * (w(i.id) / mTotal));
  }
  return out;
}

export type PullReason = 'odds' | 'rare-pity' | 'ultra-pity' | 'lucky' | 'first-capsule';

export interface PullDecision {
  item: PoolItem;
  /** Why this tier / item came out. */
  reason: PullReason;
}

/** Decides a pull from the current state (pure given the rng). */
export function decidePull(s: AppState, machineId: MachineId, rng: Rng): PullDecision {
  const machine = getMachine(machineId);
  const collection = s.collection;
  const pool = machinePool(machineId, collection);
  if (pool.length === 0) throw new Error(`Machine ${machineId} is empty`);
  const pity = pityOf(s, machineId);

  if (s.lifetime.pulls === 0 && FIRST_CAPSULE_MACHINES.includes(machineId)) {
    const pets = pool.filter((p) => getCollectible(p.id)?.category === 'pet' && (p.rarity === 'common' || p.rarity === 'uncommon'));
    if (pets.length > 0) {
      const tiers: Rarity[] = (['common', 'uncommon'] as const).filter((r) => pets.some((p) => p.rarity === r));
      const tier = rollTier(rng, machine.odds, tiers);
      return { item: pickInTier(rng, pets.filter((p) => p.rarity === tier), collection, true), reason: 'first-capsule' };
    }
  }

  const armed = (r: Rarity) => tierOf(pool, r).length > 0 && !tierFullyOwned(pool, r, collection);
  let forced: Rarity | null = null;
  let reason: PullReason = 'odds';
  if (pity.sinceUltra + 1 >= PITY_ULTRA && armed('ultra')) [forced, reason] = ['ultra', 'ultra-pity'];
  else if (pity.sinceRare + 1 >= PITY_RARE && armed('rare')) [forced, reason] = ['rare', 'rare-pity'];

  const anyNew = pool.some((p) => !owns(collection, p.id));
  const lucky = pity.dupStreak >= 4 && anyNew;
  let tier: Rarity;
  if (forced) tier = forced;
  else if (lucky) {
    tier = rollTier(rng, machine.odds, RARITIES.filter((r) => tierOf(pool, r).some((p) => !owns(collection, p.id))));
    reason = 'lucky';
  } else tier = nonEmptyTier(pool, rollTier(rng, machine.odds));
  return { item: pickInTier(rng, tierOf(pool, tier), collection, forced !== null || lucky), reason };
}

/* ------------------------------------------------------------------ */
/* Acquiring an item                                                   */
/* ------------------------------------------------------------------ */

interface Acquired {
  isNew: boolean;
  stardust: number;
  fusedStars: number;
  pet?: PetState;
  friendshipXp?: number;
}

/** Adds an item from a pull or wish: collection, pet state, pantry recipe, duplicate rewards. */
function acquire(tx: Tx, def: CollectibleDef, viaPull: boolean): Acquired {
  const isNew = addToCollection(tx, def.id);
  if (isNew) {
    if (def.category === 'pet') {
      const pet = newPetState(def.id, tx.env.rng, tx.env.now, tx.env.today, hasMeadowRoom(tx.s));
      tx.section('pets')[def.id] = pet;
      return { isNew, stardust: 0, fusedStars: 0, pet };
    }
    if (def.category === 'treat') ensureRecipe(tx, def.id);
    return { isNew, stardust: 0, fusedStars: 0 };
  }
  if (!viaPull) return { isNew, stardust: 0, fusedStars: 0 };
  const stardust = STARDUST_FOR_DUPLICATE[def.rarity];
  const fusedStars = grantStardust(tx, stardust);
  if (def.category === 'pet' && tx.s.pets[def.id]) {
    addXp(tx, def.id, PET_XP.duplicate);
    return { isNew, stardust, fusedStars, friendshipXp: PET_XP.duplicate };
  }
  return { isNew, stardust, fusedStars };
}

/* ------------------------------------------------------------------ */
/* Pull                                                                */
/* ------------------------------------------------------------------ */

export interface PullOptions {
  useTicket?: boolean;
  /** Legacy onboarding capsule: only for the very first pull ever, on Kitty or Moo, before First Sprout. */
  free?: boolean;
}

export function pull(tx: Tx, machineId: MachineId, opts: PullOptions = {}): PullResult | { ok: false; error: PullError } {
  const s = tx.s;
  if (s.pendingReveal) return { ok: false, error: 'reveal-pending' };
  const machine = getMachine(machineId);
  if (!machineAvailability(machineId, tx.env.today).available) return { ok: false, error: 'machine-unavailable' };

  let paidWith: PullResult['paidWith'];
  if (opts.free) {
    if (s.lifetime.pulls > 0 || !FIRST_CAPSULE_MACHINES.includes(machineId) || s.ledger.once['gift|first-sprout'] !== undefined) {
      return { ok: false, error: 'machine-unavailable' };
    }
    paidWith = 'free';
  } else if (opts.useTicket) {
    if (!spendTicket(tx)) return { ok: false, error: 'no-ticket' };
    paidWith = 'ticket';
  } else if (machine.currency === 'stars') {
    if (!spendStars(tx, machine.price)) return { ok: false, error: 'not-enough-stars' };
    paidWith = 'stars';
  } else {
    if (!spendCoins(tx, machine.price)) return { ok: false, error: 'not-enough-coins' };
    paidWith = 'coins';
  }

  const decision = decidePull(tx.s, machineId, tx.env.rng);
  const def = getCollectible(decision.item.id)!;
  // Pity only counts pulls while its tier still has something to give (§13.6 "a counter is hidden
  // once its tier is fully owned"): otherwise it would bank pulls and fire the moment a new item
  // joins the tier (a Moonlit variant), turning an 8★ wish into a guaranteed pull.
  const poolBefore = machinePool(machineId, tx.s.collection);
  const armed = (r: Rarity) => tierOf(poolBefore, r).length > 0 && !tierFullyOwned(poolBefore, r, tx.s.collection);
  const got = acquire(tx, def, true);

  const prev = pityOf(tx.s, machineId);
  const rareOrBetter = def.rarity === 'rare' || def.rarity === 'ultra';
  const pity: PityCounter = {
    pulls: prev.pulls + 1,
    sinceRare: rareOrBetter || !armed('rare') ? 0 : prev.sinceRare + 1,
    sinceUltra: def.rarity === 'ultra' || !armed('ultra') ? 0 : prev.sinceUltra + 1,
    dupStreak: got.isNew ? 0 : Math.min(4, prev.dupStreak + 1),
  };
  tx.section('pity')[machineId] = pity;
  tx.section('lifetime').pulls += 1;

  const countdown = pityCountdown(machinePool(machineId, tx.s.collection), pity, tx.s.collection);
  tx.set('pendingReveal', {
    machineId,
    itemId: def.id,
    isNew: got.isNew,
    stardust: got.stardust,
    fusedStars: got.fusedStars,
    ...(got.friendshipXp !== undefined ? { friendshipXp: got.friendshipXp } : {}),
    at: tx.env.now,
  });
  evaluateBadges(tx, { pulled: def.rarity });
  return {
    ok: true,
    events: [],
    machineId,
    itemId: def.id,
    rarity: def.rarity,
    isNew: got.isNew,
    secret: SECRET_IDS.has(def.id),
    stardust: got.stardust,
    fusedStars: got.fusedStars,
    ...(got.pet ? { pet: got.pet } : {}),
    ...(got.friendshipXp !== undefined ? { friendshipXp: got.friendshipXp } : {}),
    pity: countdown,
    dupStreak: pity.dupStreak,
    paidWith,
  };
}

/** Clears the pending reveal once the UI has shown it. */
export function finishReveal(tx: Tx): void {
  if (tx.s.pendingReveal) tx.set('pendingReveal', undefined);
}

/* ------------------------------------------------------------------ */
/* Wishing Well                                                        */
/* ------------------------------------------------------------------ */

export type WishError = Extract<WishOutcome, { ok: false }>['error'];

/** Star price of an item in the Wishing Well, or null when it can never be wished for. */
export function wishPrice(itemId: string): number | null {
  if (moonlitBase(itemId) !== null) return getCollectible(itemId) ? MOONLIT_WISH_PRICE : null;
  const def = getCollectible(itemId);
  if (!def || !isMachineSource(def.source)) return null;
  return WISH_PRICE[def.rarity];
}

/** The profile's creation day (the Memories rule's reference point). */
export function profileCreatedOn(s: AppState, local: Tx['env']['local']): DateKey {
  return appDayKey(s.profile.createdAt, s.settings.dayStartsAt, local);
}

/** Whether an item can be wished for right now (ignores the star balance), or why not. */
export function wishStatus(s: AppState, itemId: string, today: DateKey, createdOn: DateKey): { ok: true; price: number } | { ok: false; error: WishError } {
  const price = wishPrice(itemId);
  if (price === null) return { ok: false, error: 'not-wishable' };
  if (owns(s.collection, itemId)) return { ok: false, error: 'already-owned' };
  if (moonlitBase(itemId) !== null) return isMoonlitAvailable(s.collection, itemId) ? { ok: true, price } : { ok: false, error: 'not-wishable' };
  const def = getCollectible(itemId)!;
  if (isMachineSource(def.source) && !seasonVisited(def.source, createdOn, today)) return { ok: false, error: 'season-not-visited' };
  return { ok: true, price };
}

export function wish(tx: Tx, itemId: string): WishOutcome {
  const status = wishStatus(tx.s, itemId, tx.env.today, profileCreatedOn(tx.s, tx.env.local));
  if (!status.ok) return status;
  if (!spendStars(tx, status.price)) return { ok: false, error: 'not-enough-stars' };
  const got = acquire(tx, getCollectible(itemId)!, false);
  evaluateBadges(tx);
  return { ok: true, itemId, stars: status.price, ...(got.pet ? { pet: got.pet } : {}), events: [] };
}

/* ------------------------------------------------------------------ */
/* Sparkle exchange                                                    */
/* ------------------------------------------------------------------ */

/** On a completed machine: 250 coins → 40 stardust (→ 4★ by fusion). */
export function sparkleExchange(tx: Tx, machineId: MachineId): { ok: boolean } {
  if (!isMachineComplete(tx.s.collection, machineId)) return { ok: false };
  if (!spendCoins(tx, SPARKLE_EXCHANGE.coins)) return { ok: false };
  tx.emit({ type: 'coins', amount: -SPARKLE_EXCHANGE.coins, reason: 'exchange' });
  grantStardust(tx, SPARKLE_EXCHANGE.stardust);
  return { ok: true };
}

