/**
 * Capsules, wallet, Wishing Well and the collection book (DESIGN §6, §9.3, §13.6, §13.7 albums,
 * §13.10 blind-box language, §13.11 "Legible economy" and "Secrets & visibility").
 */
import { ALBUMS, COLLECTIBLES, PETS, SECRET_IDS, getCollectible } from '@/catalog/collectibles';
import { MACHINES, STARDUST_PER_STAR, getMachine } from '@/catalog/machines';
import { RARITIES, RARITY_LABEL, type Category, type CollectibleDef, type MachineDef, type MachineId, type Rarity } from '@/catalog/types';
import type { MachineStatus } from '../api';
import type { AppState, DateKey, PendingReveal } from '../types';
import { albumMembers, albumProgress, eligibleMoonlitIds, isMachineSource, owns } from '@/domain/collection';
import { MONTH_SHORT, monthDayLabel } from '@/domain/dates';
import { itemChances, machinePool, pityOf, profileCreatedOn, wishPrice, wishStatus } from '@/domain/gacha';
import { machineAvailability, nextWindow, seasonVisited } from '@/domain/seasons';
import type { ViewEnv } from './common';

/* ------------------------------------------------------------------ */
/* Wallet                                                              */
/* ------------------------------------------------------------------ */

export interface WalletVM {
  coins: number;
  stars: number;
  stardust: number;
  tickets: number;
  /** Stardust as a 10-segment ring around the star: "7/10 to your next star". */
  dust: { have: number; of: number; text: string };
  /** "What can I get?" lines (§13.11): one per resource. */
  lines: { resource: 'coins' | 'stars' | 'tickets' | 'stardust'; text: string }[];
  /** Coin capsules affordable now. */
  capsules: number;
  lifetime: AppState['lifetime'];
}

const COIN_PRICE = 25;
const DREAMY_PRICE = getMachine('dreamy').price;

export function walletVM(s: AppState): WalletVM {
  const { coins, stars, stardust, tickets } = s.wallet;
  const capsules = Math.floor(coins / COIN_PRICE);
  const dreamy = Math.floor(stars / DREAMY_PRICE);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const lines: WalletVM['lines'] = [
    {
      resource: 'coins',
      text: capsules > 0 ? `${plural(coins, 'coin', 'coins')} → ${plural(capsules, 'capsule', 'capsules')}` : `${COIN_PRICE - coins} more coins to your next capsule`,
    },
    {
      resource: 'stars',
      text:
        stars >= DREAMY_PRICE
          ? `${plural(stars, 'star', 'stars')} → ${plural(dreamy, 'Dreamy Night pull', 'Dreamy Night pulls')}, or wish for any Classic`
          : stars >= 2
            ? `${plural(stars, 'star', 'stars')} → wish for any Classic`
            : `Stars come from showing up, letters and badges`,
    },
    { resource: 'tickets', text: tickets > 0 ? `${plural(tickets, 'ticket', 'tickets')} → a free pull on any machine` : 'Tickets come from the showing-up ladder' },
    { resource: 'stardust', text: `${stardust}/${STARDUST_PER_STAR} stardust → your next star` },
  ];
  return {
    coins,
    stars,
    stardust,
    tickets,
    dust: { have: stardust, of: STARDUST_PER_STAR, text: `${stardust}/${STARDUST_PER_STAR} to your next star` },
    lines,
    capsules,
    lifetime: s.lifetime,
  };
}

/* ------------------------------------------------------------------ */
/* Machines                                                            */
/* ------------------------------------------------------------------ */

export interface MachineCardVM extends MachineStatus {
  name: string;
  tagline: string;
  theme: MachineDef['theme'];
  seasonal: { emoji: string; label: string } | null;
  /** Tier odds in percent (as printed). */
  odds: Record<Rarity, number>;
  /** "Rare+ within 3 pulls ✨" (null when hidden). */
  pityHint: string | null;
  /** Lucky meter pips (0–4): "●●●○ next one's new!" at 4. */
  luckyPips: number;
  luckyText: string | null;
  /** Everything owned: pulls still work (all stardust) and the sparkle exchange is offered. */
  sparkleExchange: boolean;
}

export interface CapsulesVM {
  machines: MachineCardVM[];
  /** Seasonal machines currently away, with their next visit. */
  away: { id: MachineId; name: string; emoji: string; back: DateKey | null; label: string }[];
  wallet: WalletVM;
  pendingReveal: PendingReveal | null;
  /** The very first capsule is waiting (First Sprout paid, no pull yet). */
  firstCapsule: boolean;
}

export function machineCardVM(s: AppState, env: ViewEnv, id: MachineId, status: MachineStatus): MachineCardVM {
  const m = getMachine(id);
  const avail = machineAvailability(id, env.today);
  const pity = pityOf(s, id);
  const pityHint =
    status.ultraIn !== null && status.ultraIn <= 5
      ? `Super rare within ${status.ultraIn} pull${status.ultraIn === 1 ? '' : 's'} ✨`
      : status.rareIn !== null
        ? `Rare+ within ${status.rareIn} pull${status.rareIn === 1 ? '' : 's'} ✨`
        : null;
  return {
    ...status,
    name: m.name,
    tagline: m.tagline,
    theme: m.theme,
    seasonal: m.seasonal ? { emoji: m.seasonal.emoji, label: avail.activeUntil ? `Until ${monthDayLabel(avail.activeUntil)}` : avail.nextStart ? `Back ${monthDayLabel(avail.nextStart)}` : '' } : null,
    odds: { ...m.odds },
    pityHint,
    luckyPips: pity.dupStreak,
    luckyText: pity.dupStreak >= 4 ? "next one's new!" : null,
    sparkleExchange: status.complete,
  };
}

export function capsulesVM(s: AppState, env: ViewEnv, statusOf: (id: MachineId) => MachineStatus): CapsulesVM {
  const machines: MachineCardVM[] = [];
  const away: CapsulesVM['away'] = [];
  for (const m of MACHINES) {
    const avail = machineAvailability(m.id, env.today);
    if (avail.available) machines.push(machineCardVM(s, env, m.id, statusOf(m.id)));
    else away.push({ id: m.id, name: m.name, emoji: m.seasonal?.emoji ?? '', back: avail.nextStart ?? null, label: avail.nextStart ? `Back ${monthDayLabel(avail.nextStart)}` : '' });
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
  /** Seasonal series not visited since the profile began: show only the leaflet cover (§13.11). */
  coverOnly: boolean;
  tiers: { rarity: Rarity; label: string; odds: number; /** "each ≈ 1.7%" with equal weights */ eachPct: number; items: LineupItemVM[] }[];
  /** Dreamy Night: Moonlit variants of owned pets (one shared rare slot). */
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
/* Wishing Well                                                        */
/* ------------------------------------------------------------------ */

export interface WishItemVM {
  id: string;
  name: string;
  category: Category;
  rarity: Rarity;
  rarityLabel: string;
  price: number;
  /** An unowned Secret shows as "?" (granting it plays the full reveal). */
  hidden: boolean;
  /** 'ok' (affordable), or why it can't be wished for right now. */
  status: 'ok' | 'not-enough-stars' | 'season-not-visited';
  /** Seasonal and not yet visited: "Arrives Jun 1 · wishable after its first visit". */
  note: string | null;
}

export interface WishListVM {
  stars: number;
  groups: { machineId: MachineId; name: string; items: WishItemVM[] }[];
  /** Moonlit variants of owned pets (8★ each). */
  moonlit: WishItemVM[];
}

export function wishListVM(s: AppState, env: ViewEnv): WishListVM {
  const createdOn = profileCreatedOn(s, env.local);
  const toItem = (def: CollectibleDef): WishItemVM | null => {
    const st = wishStatus(s, def.id, env.today, createdOn);
    if (!st.ok && st.error !== 'season-not-visited') return null;
    const price = st.ok ? st.price : (wishPrice(def.id) ?? 0);
    let note: string | null = null;
    if (!st.ok && isMachineSource(def.source)) {
      const next = nextWindow(getMachine(def.source), env.today);
      note = next ? `Arrives ${monthDayLabel(next.start)} · wishable after its first visit` : 'Wishable after its first visit';
    }
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      rarity: def.rarity,
      rarityLabel: labelOf(def),
      price,
      hidden: SECRET_IDS.has(def.id),
      status: !st.ok ? 'season-not-visited' : s.wallet.stars >= price ? 'ok' : 'not-enough-stars',
      note,
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
  /** Machine name, or "Starter" / "Exclusive" / "Garden". */
  from: string;
  /** Seasonal items: when their machine visits ("Sep 1 – Nov 10"). */
  visits: string | null;
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
  /** Moonlit variants have their own album page (§13.11). */
  moonlit: { owned: number; total: number; items: BookItemVM[] };
}

const CATEGORY_LABEL: Record<Category, string> = { pet: 'Friends', wearable: 'Wardrobe', treat: 'Treats', decor: 'Decor', plant: 'Plants', pot: 'Pots' };
const SOURCE_LABEL: Record<string, string> = { starter: 'Starter', exclusive: 'Exclusive', garden: 'Garden' };

function bookItem(s: AppState, def: CollectibleDef): BookItemVM {
  const owned = s.collection[def.id]?.count ?? 0;
  const machine = isMachineSource(def.source) ? getMachine(def.source) : null;
  const sz = machine?.seasonal;
  const visits = sz ? `${MONTH_SHORT[sz.start.month - 1]} ${sz.start.day} – ${MONTH_SHORT[sz.end.month - 1]} ${sz.end.day}` : null;
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    rarity: def.rarity,
    rarityLabel: labelOf(def),
    owned,
    hidden: SECRET_IDS.has(def.id) && owned === 0,
    from: machine?.name ?? SOURCE_LABEL[def.source] ?? def.source,
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
