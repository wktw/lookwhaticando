/**
 * Capsule pulls, Special Order (internally the "wish") and the swap-in (DESIGN §7).
 *
 * A pull, in order:
 * 1. Availability & payment: seasonal editions only inside their window; coins or stamps
 *    (internally stars) at the series price, or a ticket (any available series, Night included).
 *    A pending reveal blocks new pulls.
 *    `free` is the onboarding capsule ("Who comes home first?", §9.6): one of the four first-pick
 *    cabinets (No. 01 Cats, No. 02 Cows, No. 03 Dogs, No. 04 Pond), only as the very first pull,
 *    exactly once. It and First Sprout (the first check-in topping the jar up
 *    to 25 coins, economy.ts) are one gift of one capsule, never two: taken before any check-in it
 *    costs nothing and First Sprout never pays; taken after First Sprout, it spends exactly the coins
 *    First Sprout added (the coin she inserts), so the coins her check-ins earned stay hers.
 * 2. The first capsule (the first pull ever, free or paid, on any series) is a guaranteed Classic or
 *    Special **pet** from that series (tier rolled 60:25, then new-first), and it doesn't advance
 *    pity: a new save owns no pets, and every save's first capsule brings one home.
 * 3. Otherwise the tier is rolled from the series odds, except:
 *    - Super rare pity: the 40th pull without a Super rare is a Super rare;
 *    - Rare pity: the 10th pull without a Rare-or-better is a **Rare** (Rare tier only; the Super
 *      rare pity stays independent and wins when both are due);
 *    - a pity whose tier is fully owned is off (its counter is hidden: `null`) and stays at 0: it
 *      counts only pulls made while its tier still had something unowned;
 *    - lucky meter: after 4 duplicates in a row the next pull is guaranteed new (tiers without
 *      anything unowned are left out of the roll) when anything is unowned.
 *    An empty tier falls to the nearest non-empty tier below, then above.
 * 4. Inside the tier, unowned items weigh 3, owned 1 (new-first); pity and lucky picks take an
 *    unowned item when one exists. No. 07 Night's Moonlit variants (one per owned series pet, Rare)
 *    share **one** slot in the Rare tier, so owning more pets never dilutes the printed Rares. The
 *    slot weighs half a printed item: with Night's 5 Rares at 20% and 3 Super rares at 10%, a
 *    full-weight slot would make each printed Rare exactly as likely as a Super rare (20/6 = 10/3),
 *    breaking §7.1's "every rarer item is less likely than every commoner one".
 * 5. Duplicates go onto the swap shelf (2/4/8/15 swaps, internally stardust, every 10 → 1 stamp); a
 *    duplicate pet also gets +20 friendship. A new pet gets its PetState (personality and favourite
 *    treat rolled, default name) and goes out on the Shelf if there is room. A new treat becomes a
 *    pantry recipe.
 * 6. Commit before animate: the result is stored as `pendingReveal` before the UI plays it.
 */
import { SECRET_IDS, getCollectible, moonlitBase } from '@/catalog/collectibles';
import { NEW_ITEM_WEIGHT, PITY_RARE, PITY_ULTRA, STARDUST_FOR_DUPLICATE, WISH_PRICE, getMachine } from '@/catalog/machines';
import type { CollectibleDef, MachineId, Rarity } from '@/catalog/types';
import { RARITIES } from '@/catalog/types';
import type { PullError, PullResult, WishOutcome } from '@/state/api';
import type { AppState, DateKey, PendingReveal, PetState, PityCounter } from '@/state/types';
import { evaluateBadges } from './badges';
import { eligibleMoonlitIds, isMachineComplete, isMachineSource, isMoonlitAvailable, machineLineup, owns } from './collection';
import { appDayKey } from './dates';
import { PET_XP, addXp, newPetState } from './friendship';
import { hasRoomOut } from './shelf';
import { ensureRecipe } from './pantry';
import type { Rng } from './rng';
import { machineAvailability, seasonVisited } from './seasons';
import type { Tx } from './tx';
import { addToCollection, grantStardust, hasOnce, setOnce, spendCoins, spendStars, spendTicket } from './wallet';

/**
 * The four cabinets of onboarding's "Who comes home first?" (§1 Many animals, §9.6): the only series
 * the free capsule works on. Each has Classic and Special pets for the guaranteed first pet.
 */
export const FIRST_CAPSULE_MACHINES: readonly MachineId[] = ['cats', 'cows', 'dogs', 'pond'];
/** Once-key: the onboarding capsule was taken (the free pull happens exactly once). */
export const FIRST_CAPSULE_KEY = 'gift|first-capsule';
/** Once-key holding the coins First Sprout added (economy.ts). */
export const FIRST_SPROUT_KEY = 'gift|first-sprout';
/** Swap-in on a completed series: 250 coins → 40 swaps (§7.3). */
export const SPARKLE_EXCHANGE = { coins: 250, stardust: 40 } as const;
/** Special Order price of a Moonlit variant, in stamps (§7.3). */
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
  /** A Moonlit variant (No. 07 Night only; all of them share one Rare slot). */
  moonlit: boolean;
}

/** Everything a series can drop right now: its lineup, plus Moonlit variants on No. 07 Night. */
export function machinePool(machineId: MachineId, collection: AppState['collection']): PoolItem[] {
  const pool: PoolItem[] = machineLineup(machineId).map((c) => ({ id: c.id, rarity: c.rarity, moonlit: false }));
  if (machineId === 'night') for (const id of eligibleMoonlitIds(collection)) pool.push({ id, rarity: 'rare', moonlit: true });
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

  if (isFirstCapsule(s)) {
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
      const pet = newPetState(def.id, tx.env.rng, tx.env.now, tx.env.today, hasRoomOut(tx.s));
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

/** The next pull is the first capsule (no pull yet): a guaranteed Classic or Special pet, no pity. */
export function isFirstCapsule(s: Pick<AppState, 'lifetime'>): boolean {
  return s.lifetime.pulls === 0;
}

/** Whether onboarding's free capsule can be pulled on this series now ("Who comes home first?", exactly once). */
export function canPullFree(s: Pick<AppState, 'lifetime' | 'ledger'>, machineId: MachineId): boolean {
  return isFirstCapsule(s) && FIRST_CAPSULE_MACHINES.includes(machineId) && !hasOnce(s, FIRST_CAPSULE_KEY);
}

export interface PullOptions {
  useTicket?: boolean;
  /** Onboarding's free capsule (see module doc, step 1). */
  free?: boolean;
}

export function pull(tx: Tx, machineId: MachineId, opts: PullOptions = {}): PullResult | { ok: false; error: PullError } {
  const s = tx.s;
  // A capsule reveal still waiting holds the cabinets (commit before animate). A Special Order's
  // reveal never does: its first showing plays from the wish result, so the new pull replaces it.
  if (s.pendingReveal && !s.pendingReveal.order) return { ok: false, error: 'reveal-pending' };
  const machine = getMachine(machineId);
  if (!machineAvailability(machineId, tx.env.today).available) return { ok: false, error: 'machine-unavailable' };

  let paidWith: PullResult['paidWith'];
  if (opts.free) {
    if (!canPullFree(s, machineId)) return { ok: false, error: 'machine-unavailable' };
    // The gift is one capsule: after First Sprout topped the jar up, the free capsule spends that top-up.
    const sprout = s.ledger.once[FIRST_SPROUT_KEY];
    const giftCoins = Math.min(typeof sprout === 'number' ? sprout : 0, s.wallet.coins);
    if (giftCoins > 0) {
      spendCoins(tx, giftCoins);
      tx.emit({ type: 'coins', amount: -giftCoins, reason: 'gift' });
    }
    setOnce(tx, FIRST_CAPSULE_KEY);
    paidWith = 'free';
  } else if (opts.useTicket) {
    if (!spendTicket(tx)) return { ok: false, error: 'no-ticket' };
    paidWith = 'ticket';
  } else if (machine.currency === 'stars') {
    if (!spendStars(tx, machine.price)) return { ok: false, error: 'not-enough-stars' };
    tx.emit({ type: 'stars', amount: -machine.price, reason: 'spend' });
    paidWith = 'stars';
  } else {
    if (!spendCoins(tx, machine.price)) return { ok: false, error: 'not-enough-coins' };
    tx.emit({ type: 'coins', amount: -machine.price, reason: 'spend' });
    paidWith = 'coins';
  }

  const spent = tx.events.filter((e) => (e.type === 'coins' || e.type === 'stars') && e.reason === 'spend');
  const decision = decidePull(tx.s, machineId, tx.env.rng);
  const def = getCollectible(decision.item.id)!;
  // Pity only counts pulls while its tier still has something to give (§7.1 "counters hide once
  // their tier is fully owned"): otherwise it would bank pulls and fire the moment a new item joins
  // the tier (a Moonlit variant), turning an 8-stamp Special Order into a guaranteed pull.
  const poolBefore = machinePool(machineId, tx.s.collection);
  const armed = (r: Rarity) => tierOf(poolBefore, r).length > 0 && !tierFullyOwned(poolBefore, r, tx.s.collection);
  const got = acquire(tx, def, true);

  // The first capsule doesn't advance pity (§9.6): its counters stay as they were.
  const prev = pityOf(tx.s, machineId);
  const rareOrBetter = def.rarity === 'rare' || def.rarity === 'ultra';
  const pity: PityCounter =
    decision.reason === 'first-capsule'
      ? prev
      : {
          pulls: prev.pulls + 1,
          sinceRare: rareOrBetter || !armed('rare') ? 0 : prev.sinceRare + 1,
          sinceUltra: def.rarity === 'ultra' || !armed('ultra') ? 0 : prev.sinceUltra + 1,
          dupStreak: got.isNew ? 0 : Math.min(4, prev.dupStreak + 1),
        };
  if (decision.reason !== 'first-capsule') tx.section('pity')[machineId] = pity;
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
    events: spent,
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

/**
 * Which pending reveal a screen showed: a capsule is named by its cabinet, item and commit time
 * (`at`); a Special Order by its item and `order: true` (all the counter knows of it). Fields left
 * out are not compared.
 */
export interface RevealKey {
  machineId?: MachineId;
  itemId: string;
  at?: number;
  order?: boolean;
}

/** Whether `p` is the reveal `key` names. */
export function isReveal(p: PendingReveal, key: RevealKey): boolean {
  return (
    p.itemId === key.itemId &&
    (key.machineId === undefined || p.machineId === key.machineId) &&
    (key.at === undefined || p.at === key.at) &&
    (key.order === undefined || !!p.order === key.order)
  );
}

/**
 * Clears the pending reveal once the UI has shown it: only the one it showed, when `expected` says
 * which (WP-A8: a close left over from another reveal never clears this one). Without `expected`
 * it clears whatever waits. True when something was cleared.
 */
export function finishReveal(tx: Tx, expected?: RevealKey): boolean {
  const p = tx.s.pendingReveal;
  if (!p || (expected && !isReveal(p, expected))) return false;
  tx.set('pendingReveal', undefined);
  return true;
}

/* ------------------------------------------------------------------ */
/* Special Order (internally the wish)                                 */
/* ------------------------------------------------------------------ */

export type WishError = Extract<WishOutcome, { ok: false }>['error'];

/** Stamp price of an item in Special Order, or null when it can never be ordered. */
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

/** Whether an item can be ordered right now (ignores the stamp balance), or why not. */
export function wishStatus(s: AppState, itemId: string, today: DateKey, createdOn: DateKey): { ok: true; price: number } | { ok: false; error: WishError } {
  const price = wishPrice(itemId);
  if (price === null) return { ok: false, error: 'not-wishable' };
  if (owns(s.collection, itemId)) return { ok: false, error: 'already-owned' };
  if (moonlitBase(itemId) !== null) return isMoonlitAvailable(s.collection, itemId) ? { ok: true, price } : { ok: false, error: 'not-wishable' };
  const def = getCollectible(itemId)!;
  if (isMachineSource(def.source) && !seasonVisited(def.source, createdOn, today)) return { ok: false, error: 'season-not-visited' };
  return { ok: true, price };
}

/**
 * Special Order: spends the stamps (a `stars` event with reason 'spend'), adds the item (never a
 * duplicate: only unowned items can be ordered) and, commit before animate (§7.1), stores the
 * reveal as `pendingReveal` with `order: true` so a reload mid-reveal still plays it ("Your order:
 * a Siamese."; a Secret plays the full Secret reveal). `finishReveal` clears it. A capsule reveal
 * already waiting keeps its place (the order's reveal plays straight from the result); an earlier
 * order's reveal gives way to this one. An order's reveal never blocks the capsules: `pull` goes
 * ahead and replaces it.
 */
export function wish(tx: Tx, itemId: string): WishOutcome {
  const status = wishStatus(tx.s, itemId, tx.env.today, profileCreatedOn(tx.s, tx.env.local));
  if (!status.ok) return status;
  if (!spendStars(tx, status.price)) return { ok: false, error: 'not-enough-stars' };
  const spend = { type: 'stars', amount: -status.price, reason: 'spend' } as const;
  tx.emit(spend);
  const def = getCollectible(itemId)!;
  const got = acquire(tx, def, false);
  markOrdered(tx, def.id);
  if ((!tx.s.pendingReveal || tx.s.pendingReveal.order) && isMachineSource(def.source)) {
    tx.set('pendingReveal', { machineId: def.source, itemId: def.id, isNew: true, stardust: 0, fusedStars: 0, order: true, at: tx.env.now });
  }
  evaluateBadges(tx);
  return { ok: true, itemId, stars: status.price, ...(got.pet ? { pet: got.pet } : {}), events: [spend] };
}

/**
 * Marks an item as ordered rather than opened (`OwnedItem.ordered`): the collect-N pins count only
 * things that came out of a capsule (§6 stamp pace), so ordering can't pay for more ordering.
 */
function markOrdered(tx: Tx, id: string): void {
  const collection = tx.section('collection');
  const cur = collection[id];
  if (cur && cur.count === 1) collection[id] = { ...cur, ordered: true };
}

/* ------------------------------------------------------------------ */
/* Swap-in                                                             */
/* ------------------------------------------------------------------ */

/** On a completed series: 250 coins → 40 swaps (→ 4 stamps). */
export function sparkleExchange(tx: Tx, machineId: MachineId): { ok: boolean } {
  if (!isMachineComplete(tx.s.collection, machineId)) return { ok: false };
  if (!spendCoins(tx, SPARKLE_EXCHANGE.coins)) return { ok: false };
  tx.emit({ type: 'coins', amount: -SPARKLE_EXCHANGE.coins, reason: 'exchange' });
  grantStardust(tx, SPARKLE_EXCHANGE.stardust);
  return { ok: true };
}

