/**
 * Capsules, the wallet, Special Order (internally the wish) and the Field Guide book (DESIGN §6,
 * §7, §8.5, §9.3). Internal names: `stars` are stamps, `stardust` are swaps. Structured data: the
 * screens word the wallet's "What can I get?" lines, the pity and lucky meters and the seasons.
 */
import { ALBUMS, COLLECTIBLES, PETS, SECRET_IDS, getCollectible } from '@/catalog/collectibles';
import { MACHINES, STARDUST_PER_STAR, WISH_PRICE, getMachine, seriesLabel } from '@/catalog/machines';
import { RARITIES, RARITY_LABEL, type Category, type CollectibleDef, type MachineDef, type MachineId, type Rarity } from '@/catalog/types';
import type { MachineStatus } from '../api';
import type { AppState, DateKey, PendingReveal } from '../types';
import { albumMembers, albumProgress, eligibleMoonlitIds, isMachineSource, owns } from '@/domain/collection';
import { canPullFree, itemChances, machinePool, pityOf, profileCreatedOn, wishPrice, wishStatus } from '@/domain/gacha';
import { machineAvailability, nextWindow, seasonVisited } from '@/domain/seasons';
import type { ViewEnv } from './common';

/* ------------------------------------------------------------------ */
/* Wallet                                                              */
/* ------------------------------------------------------------------ */

/** The wallet and its "What can I get?" facts (§9.3, §6), one per resource, as numbers. */
export interface WalletVM {
  coins: number;
  /** Stamps. */
  stars: number;
  /** Swaps (0–9; every 10 make a stamp). */
  stardust: number;
  tickets: number;
  /** Swaps as a 10-segment ring around the stamp. */
  dust: { have: number; of: number };
  /** Coin capsules affordable now, and coins still needed for the next one (0 when affordable). */
  coinsFacts: { capsules: number; toNext: number; price: number };
  /** No. 07 Night pulls affordable with stamps, and whether a Classic can be ordered (Special Order). */
  stampsFacts: { nightPulls: number; nightPrice: number; canOrderClassic: boolean; classicPrice: number };
  lifetime: AppState['lifetime'];
}

const COIN_PRICE = getMachine('cats').price;
const NIGHT_PRICE = getMachine('night').price;

export function walletVM(s: AppState): WalletVM {
  const { coins, stars, stardust, tickets } = s.wallet;
  const capsules = Math.floor(coins / COIN_PRICE);
  return {
    coins,
    stars,
    stardust,
    tickets,
    dust: { have: stardust, of: STARDUST_PER_STAR },
    coinsFacts: { capsules, toNext: capsules > 0 ? 0 : COIN_PRICE - coins, price: COIN_PRICE },
    stampsFacts: { nightPulls: Math.floor(stars / NIGHT_PRICE), nightPrice: NIGHT_PRICE, canOrderClassic: stars >= WISH_PRICE.common, classicPrice: WISH_PRICE.common },
    lifetime: s.lifetime,
  };
}

/* ------------------------------------------------------------------ */
/* Machines                                                            */
/* ------------------------------------------------------------------ */

export interface MachineCardVM extends MachineStatus {
  /** "No. 02 · Cows", or "Autumn Edition". */
  label: string;
  name: string;
  tagline: string;
  theme: MachineDef['theme'];
  /** A seasonal edition: here until `until` (the label "until Nov 10" is the screen's). */
  seasonal: { until: DateKey | null } | null;
  /** Tier odds in percent (as printed). */
  odds: Record<Rarity, number>;
  /** Which pity the meter shows: the Super rare one when it is 5 pulls away or less, else the Rare one (null when both are hidden). */
  pity: { tier: 'rare' | 'ultra'; within: number } | null;
  /** Lucky meter pips (0–4): at 4 the next pull is new ("●●●● next one's new"). */
  luckyPips: number;
  /** Everything owned: pulls still work (all swaps) and the swap-in is offered (store.sparkleExchange). */
  swapIn: boolean;
  /** Onboarding's free "Cats or Cows?" capsule can be pulled here (§9.6). */
  free: boolean;
}

export interface CapsulesVM {
  machines: MachineCardVM[];
  /** Seasonal editions currently away, with their next visit. */
  away: { id: MachineId; name: string; back: DateKey | null }[];
  wallet: WalletVM;
  pendingReveal: PendingReveal | null;
  /** No pull yet: the next capsule is the first (a guaranteed Classic or Special pet, §9.6). */
  firstCapsule: boolean;
}

export function machineCardVM(s: AppState, env: ViewEnv, id: MachineId, status: MachineStatus): MachineCardVM {
  const m = getMachine(id);
  const avail = machineAvailability(id, env.today);
  const pity = pityOf(s, id);
  return {
    ...status,
    label: seriesLabel(m),
    name: m.name,
    tagline: m.tagline,
    theme: m.theme,
    seasonal: m.seasonal ? { until: avail.activeUntil ?? null } : null,
    odds: { ...m.odds },
    pity:
      status.ultraIn !== null && status.ultraIn <= 5
        ? { tier: 'ultra', within: status.ultraIn }
        : status.rareIn !== null
          ? { tier: 'rare', within: status.rareIn }
          : null,
    luckyPips: pity.dupStreak,
    swapIn: status.complete,
    free: canPullFree(s, id),
  };
}

export function capsulesVM(s: AppState, env: ViewEnv, statusOf: (id: MachineId) => MachineStatus): CapsulesVM {
  const machines: MachineCardVM[] = [];
  const away: CapsulesVM['away'] = [];
  for (const m of MACHINES) {
    const avail = machineAvailability(m.id, env.today);
    if (avail.available) machines.push(machineCardVM(s, env, m.id, statusOf(m.id)));
    else away.push({ id: m.id, name: m.name, back: avail.nextStart ?? null });
  }
  return { machines, away, wallet: walletVM(s), pendingReveal: s.pendingReveal ?? null, firstCapsule: s.profile.onboarded && s.lifetime.pulls === 0 };
}

/* ------------------------------------------------------------------ */
/* Series lineup (odds sheet)                                          */
/* ------------------------------------------------------------------ */

export interface LineupItemVM {
  id: string;
  name: string;
  category: Category;
  rarity: Rarity;
  /** "Classic" · "Special" · "Rare" · "Super rare" · "Secret" */
  rarityLabel: string;
  secret: boolean;
  owned: number;
  /** An unowned Secret shows as a sparkling "?" (its art and name stay hidden). */
  hidden: boolean;
  /** Chance on the next ordinary pull (0..1), new-first weighting included. */
  chance: number;
}

export interface SeriesVM {
  id: MachineId;
  name: string;
  tagline: string;
  theme: MachineDef['theme'];
  owned: number;
  total: number;
  complete: boolean;
  /** A seasonal edition not visited since the profile began, with nothing owned: only the leaflet cover. */
  coverOnly: boolean;
  tiers: { rarity: Rarity; label: string; odds: number; /** "each ≈ 1.7%" with equal weights */ eachPct: number; items: LineupItemVM[] }[];
  /** No. 07 Night: Moonlit variants of owned pets (one shared Rare slot). */
  moonlit: LineupItemVM[];
}

const labelOf = (def: CollectibleDef): string => (SECRET_IDS.has(def.id) ? 'Secret' : RARITY_LABEL[def.rarity]);

export function seriesVM(s: AppState, env: ViewEnv, id: MachineId): SeriesVM {
  const m = getMachine(id);
  const pool = machinePool(id, s.collection);
  const chances = itemChances(id, s.collection);
  const lineup = COLLECTIBLES.filter((c) => c.source === id);
  const item = (def: CollectibleDef): LineupItemVM => {
    const owned = s.collection[def.id]?.count ?? 0;
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      rarity: def.rarity,
      rarityLabel: labelOf(def),
      secret: SECRET_IDS.has(def.id),
      owned,
      hidden: SECRET_IDS.has(def.id) && owned === 0,
      chance: chances.get(def.id) ?? 0,
    };
  };
  const tiers = RARITIES.map((r) => {
    const items = lineup.filter((c) => c.rarity === r).map(item);
    return { rarity: r, label: RARITY_LABEL[r], odds: m.odds[r], eachPct: items.length > 0 ? Math.round((m.odds[r] / items.length) * 10) / 10 : 0, items };
  });
  const moonlit = pool.filter((p) => p.moonlit).map((p) => item(getCollectible(p.id)!));
  const owned = lineup.filter((c) => owns(s.collection, c.id)).length;
  return {
    id,
    name: m.name,
    tagline: m.tagline,
    theme: m.theme,
    owned,
    total: lineup.length,
    complete: owned === lineup.length && lineup.length > 0,
    coverOnly: m.seasonal !== undefined && !seasonVisited(id, profileCreatedOn(s, env.local), env.today) && owned === 0,
    tiers,
    moonlit,
  };
}

/* ------------------------------------------------------------------ */
/* Special Order (internally the wish)                                 */
/* ------------------------------------------------------------------ */

export interface WishItemVM {
  id: string;
  name: string;
  category: Category;
  rarity: Rarity;
  rarityLabel: string;
  price: number;
  /** An unowned Secret shows as "?" (ordering it plays the full reveal). */
  hidden: boolean;
  /** 'ok' (affordable), or why it can't be ordered right now. */
  status: 'ok' | 'not-enough-stars' | 'season-not-visited';
  /** A seasonal item whose season hasn't visited yet: the day it next arrives (orderable from then). */
  arrives: DateKey | null;
}

export interface WishListVM {
  stars: number;
  groups: { machineId: MachineId; name: string; items: WishItemVM[] }[];
  /** Moonlit variants of owned pets (8 stamps each). */
  moonlit: WishItemVM[];
}

export function wishListVM(s: AppState, env: ViewEnv): WishListVM {
  const createdOn = profileCreatedOn(s, env.local);
  const toItem = (def: CollectibleDef): WishItemVM | null => {
    const st = wishStatus(s, def.id, env.today, createdOn);
    if (!st.ok && st.error !== 'season-not-visited') return null;
    const price = st.ok ? st.price : (wishPrice(def.id) ?? 0);
    const arrives = !st.ok && isMachineSource(def.source) ? (nextWindow(getMachine(def.source), env.today)?.start ?? null) : null;
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      rarity: def.rarity,
      rarityLabel: labelOf(def),
      price,
      hidden: SECRET_IDS.has(def.id),
      status: !st.ok ? 'season-not-visited' : s.wallet.stars >= price ? 'ok' : 'not-enough-stars',
      arrives,
    };
  };
  const groups = MACHINES.map((m) => ({
    machineId: m.id,
    name: m.name,
    items: COLLECTIBLES.filter((c) => c.source === m.id)
      .map(toItem)
      .filter((x): x is WishItemVM => x !== null),
  })).filter((g) => g.items.length > 0);
  const moonlit = eligibleMoonlitIds(s.collection)
    .map((id) => toItem(getCollectible(id)!))
    .filter((x): x is WishItemVM => x !== null);
  return { stars: s.wallet.stars, groups, moonlit };
}

/* ------------------------------------------------------------------ */
/* Collection book                                                     */
/* ------------------------------------------------------------------ */

export interface BookItemVM {
  id: string;
  name: string;
  category: Category;
  rarity: Rarity;
  rarityLabel: string;
  owned: number;
  /** Unowned: soft silhouette; an unowned Secret stays a "?". */
  hidden: boolean;
  /** "No. 01 · Cats", "Autumn Edition", or "Starter" / "Exclusive" / "Harvest". */
  from: string;
  /** Seasonal items: when their edition visits, as month/day bounds (the screen prints "Sep 1 – Nov 10"). */
  visits: { start: { month: number; day: number }; end: { month: number; day: number } } | null;
}

export interface AlbumVM {
  id: string;
  name: string;
  owned: number;
  total: number;
  complete: boolean;
  /** Exclusive decor awarded on completion (null for albums without one). */
  reward: string | null;
  pets: BookItemVM[];
}

export interface CollectionVM {
  owned: number;
  total: number;
  categories: { category: Category; label: string; owned: number; total: number; items: BookItemVM[] }[];
  albums: AlbumVM[];
  /** Moonlit variants have their own page. */
  moonlit: { owned: number; total: number; items: BookItemVM[] };
}

const CATEGORY_LABEL: Record<Category, string> = { pet: 'Friends', wearable: 'Wardrobe', treat: 'Treats', decor: 'Decor', plant: 'Plants', pot: 'Pots' };
const SOURCE_LABEL: Record<string, string> = { starter: 'Starter', exclusive: 'Exclusive', harvest: 'Harvest' };

function bookItem(s: AppState, def: CollectibleDef): BookItemVM {
  const owned = s.collection[def.id]?.count ?? 0;
  const machine = isMachineSource(def.source) ? getMachine(def.source) : null;
  const sz = machine?.seasonal;
  const visits = sz ? { start: { ...sz.start }, end: { ...sz.end } } : null;
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    rarity: def.rarity,
    rarityLabel: labelOf(def),
    owned,
    hidden: SECRET_IDS.has(def.id) && owned === 0,
    from: machine ? seriesLabel(machine) : (SOURCE_LABEL[def.source] ?? def.source),
    visits,
  };
}

export function collectionVM(s: AppState): CollectionVM {
  const categories = (['pet', 'wearable', 'treat', 'decor', 'plant', 'pot'] as Category[]).map((category) => {
    const items = COLLECTIBLES.filter((c) => c.category === category).map((c) => bookItem(s, c));
    return { category, label: CATEGORY_LABEL[category], owned: items.filter((i) => i.owned > 0).length, total: items.length, items };
  });
  const albums: AlbumVM[] = ALBUMS.map((a) => {
    const p = albumProgress(s.collection, a);
    return { id: a.id, name: a.name, owned: p.owned, total: p.total, complete: p.complete, reward: a.reward, pets: albumMembers(a).map((def) => bookItem(s, def)) };
  });
  const moonlitAll = PETS.filter((p) => isMachineSource(p.source)).map((p) => getCollectible(`moonlit:${p.id}`)!);
  const moonlitItems = moonlitAll.filter((d) => owns(s.collection, d.id) || owns(s.collection, d.id.slice('moonlit:'.length))).map((d) => bookItem(s, d));
  const owned = categories.reduce((a, c) => a + c.owned, 0);
  return {
    owned,
    total: categories.reduce((a, c) => a + c.total, 0),
    categories,
    albums,
    moonlit: { owned: moonlitAll.filter((d) => owns(s.collection, d.id)).length, total: moonlitAll.length, items: moonlitItems },
  };
}
