/**
 * Pets, the Shelf, rituals and pins (DESIGN §8 pets, places and items, §9.4 the Shelf, §13 rituals).
 * Structured data: perks, hints and captions are ids and fields the screens word (lines.ts).
 */
import { BADGES } from '@/catalog/badges';
import { HARVEST_BY_PLANT, TOY_IDS, getCollectible, moonlitBase } from '@/catalog/collectibles';
import { PERSONALITY_BY_ID } from '@/catalog/personalities';
import { PLACES } from '@/catalog/places';
import { WEARABLE_SLOTS, type PlaceId, type PlantSpeciesId, type Personality, type Species, type TreatTag, type WearableSlot } from '@/catalog/types';
import type { AppState, BouquetStem, DateKey, Letter, PetState, PlacedDecor } from '../types';
import { machineCollectiblesOwned, ownedTreats, ownedWearables } from '@/domain/collection';
import { appDayKey, monthDayLabel, monthYearLabel } from '@/domain/dates';
import { PET_XP, dailyFor, featuredPetId } from '@/domain/friendship';
import type { CuttingVM } from '@/domain/growth';
import { cuttingOf } from '@/domain/economy';
import { LEVEL_PERKS, MAX_FRIEND_LEVEL, levelProgress, memoriesFor, type LevelPerk, type LevelProgress } from '@/domain/levels';
import { petsOutCapacity, petsOutCount, unplacedCopies } from '@/domain/shelf';
import type { ViewEnv } from './common';

/* ------------------------------------------------------------------ */
/* Pets                                                                */
/* ------------------------------------------------------------------ */

export interface PetSummaryVM {
  id: string;
  name: string;
  /** The collectible's name ("Calico", "Moonlit Calico"). */
  variant: string;
  species: Species | null;
  personality: Personality;
  personalityLabel: string;
  level: number;
  /** Levels 11–15 are bond levels. */
  bond: boolean;
  /** Friendship dots filled (1–10). */
  hearts: number;
  /** 0..1 toward the next level. */
  fraction: number;
  /** Out on the Shelf (the rest are indoors). */
  out: boolean;
  favorite: boolean;
  /** The pet a view features when it needs one (friendship.featuredPetId). */
  featured: boolean;
  moonlit: boolean;
  obtainedAt: number;
}

export function petSummary(s: AppState, pet: PetState, featured: string | null = featuredPetId(s)): PetSummaryVM {
  const def = getCollectible(pet.id);
  const lp = levelProgress(pet.xp);
  const pers = PERSONALITY_BY_ID.get(pet.personality);
  return {
    id: pet.id,
    name: pet.name,
    variant: def?.name ?? pet.name,
    species: def?.category === 'pet' ? def.species : null,
    personality: pet.personality,
    personalityLabel: pers?.label ?? pet.personality,
    level: lp.level,
    bond: lp.bond,
    hearts: Math.min(MAX_FRIEND_LEVEL, lp.level),
    fraction: lp.fraction,
    out: pet.inMeadow,
    favorite: pet.favorite,
    featured: pet.id === featured,
    moonlit: moonlitBase(pet.id) !== null,
    obtainedAt: pet.obtainedAt,
  };
}

export interface PetsVM {
  /** Favourites first, then oldest friends first. */
  pets: PetSummaryVM[];
  out: number;
  capacity: number;
  /** The featured pet (null before the first pet). */
  featured: string | null;
}

export function petsVM(s: AppState): PetsVM {
  const featured = featuredPetId(s);
  const pets = Object.values(s.pets)
    .map((p) => petSummary(s, p, featured))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1));
  return { pets, out: petsOutCount(s), capacity: petsOutCapacity(s), featured };
}

/** The favourite-treat hint before it is found: by the treat's first tag, or the plant it is harvested from. */
export type FavoriteHint = { kind: 'tag'; tag: TreatTag } | { kind: 'plant'; plant: PlantSpeciesId } | { kind: 'unknown' };

export interface PetVM extends PetSummaryVM {
  personalityBlurb: string;
  progress: LevelProgress;
  /** What each level changes (§8.2), and whether it is unlocked. */
  perks: { level: number; perk: LevelPerk; unlocked: boolean }[];
  /** Memories earned after level 10 (one per 150 XP). */
  memories: number;
  /** The favourite treat once discovered; otherwise a hint. */
  favoriteTreat: { known: boolean; treatId: string | null; name: string | null; hint: FavoriteHint };
  outfit: Record<WearableSlot, string | null>;
  /** Owned wearables per slot (any pet may wear any owned item). */
  wardrobe: Record<WearableSlot, { id: string; name: string }[]>;
  /** Owned treats with servings (feeding needs a serving). */
  treats: { id: string; name: string; servings: number; favorite: boolean }[];
  /** Today's remaining XP allowances (reactions are never capped). */
  today: { petsLeft: number; treatsLeft: number; favoriteBonusLeft: boolean };
  /** The "came home" day (§7.2, §13 came-home days). */
  arrivedOn: DateKey;
  arrivedLabel: string;
}

export function favoriteHint(treatId: string): FavoriteHint {
  const def = getCollectible(treatId);
  if (def?.category !== 'treat') return { kind: 'unknown' };
  if (def.source === 'harvest') {
    const plants = (Object.entries(HARVEST_BY_PLANT) as [PlantSpeciesId, string][]).filter(([, t]) => t === treatId).map(([p]) => p);
    if (plants.length === 1) return { kind: 'plant', plant: plants[0]! };
  }
  const tag = def.tags[0];
  return tag ? { kind: 'tag', tag } : { kind: 'unknown' };
}

export function petVM(s: AppState, env: ViewEnv, id: string): PetVM | null {
  const pet = s.pets[id];
  if (!pet) return null;
  const base = petSummary(s, pet);
  const pers = PERSONALITY_BY_ID.get(pet.personality);
  const lp = levelProgress(pet.xp);
  const daily = dailyFor(pet, env.today);
  const favDef = getCollectible(pet.favoriteTreat);
  const outfit = Object.fromEntries(WEARABLE_SLOTS.map((slot) => [slot, pet.outfit[slot] ?? null])) as Record<WearableSlot, string | null>;
  const wardrobe = Object.fromEntries(WEARABLE_SLOTS.map((slot) => [slot, ownedWearables(s.collection, slot).map((w) => ({ id: w.id, name: w.name }))])) as PetVM['wardrobe'];
  const arrivedOn = appDayKey(pet.obtainedAt, s.settings.dayStartsAt, env.local);
  return {
    ...base,
    personalityBlurb: pers?.blurb ?? '',
    progress: lp,
    perks: Object.entries(LEVEL_PERKS).map(([lvl, perk]) => ({ level: Number(lvl), perk, unlocked: lp.level >= Number(lvl) })),
    memories: memoriesFor(pet.xp),
    favoriteTreat: {
      known: pet.favoriteKnown,
      treatId: pet.favoriteKnown ? pet.favoriteTreat : null,
      name: pet.favoriteKnown ? (favDef?.name ?? null) : null,
      hint: favoriteHint(pet.favoriteTreat),
    },
    outfit,
    wardrobe,
    treats: ownedTreats(s.collection).map((t) => ({ id: t.id, name: t.name, servings: s.pantry[t.id]?.servings ?? 0, favorite: pet.favoriteKnown && t.id === pet.favoriteTreat })),
    today: {
      petsLeft: Math.max(0, PET_XP.petsPerDay - daily.pets),
      treatsLeft: Math.max(0, PET_XP.treatsPerDay - daily.treats),
      favoriteBonusLeft: daily.favorites < PET_XP.favoritesPerDay,
    },
    arrivedOn,
    arrivedLabel: monthDayLabel(arrivedOn),
  };
}

/* ------------------------------------------------------------------ */
/* The Shelf                                                           */
/* ------------------------------------------------------------------ */

export interface PlaceVM {
  id: PlaceId;
  name: string;
  price: number;
  owned: boolean;
  canAfford: boolean;
  blurb: string;
  /** Room for this many more pets out. */
  petsOut: number;
  /** Species drawn to it (empty: everyone). */
  loves: readonly Species[];
}

export interface ShelfVM {
  /** Every place in Shelf order (the Sill first), owned or not: the places map. */
  places: PlaceVM[];
  /** Pets allowed out: 8 + 2 per extra place. */
  capacity: number;
  /** Pets out on the Shelf. */
  out: PetSummaryVM[];
  /** Pets indoors (over capacity, or brought in). */
  indoors: PetSummaryVM[];
  /** Placed decor, with its catalog name and whether pets play with it. */
  decor: (PlacedDecor & { name: string; toy: boolean })[];
  /** Owned decor copies not yet placed. */
  inventory: { itemId: string; name: string; unplaced: number }[];
  /** The Cutting on the window frame (§13): the lifetime gauge. */
  cutting: CuttingVM;
}

export function shelfVM(s: AppState): ShelfVM {
  const featured = featuredPetId(s);
  const all = Object.values(s.pets)
    .map((p) => petSummary(s, p, featured))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1));
  return {
    places: PLACES.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      owned: s.shelf.places.includes(p.id),
      canAfford: s.wallet.coins >= p.price,
      blurb: p.blurb,
      petsOut: p.petsOut,
      loves: p.loves,
    })),
    capacity: petsOutCapacity(s),
    out: all.filter((p) => p.out),
    indoors: all.filter((p) => !p.out),
    decor: s.shelf.decor.map((d) => ({ ...d, name: getCollectible(d.itemId)?.name ?? d.itemId, toy: TOY_IDS.has(d.itemId) })),
    inventory: Object.keys(s.collection)
      .filter((id) => getCollectible(id)?.category === 'decor')
      .map((id) => ({ itemId: id, name: getCollectible(id)!.name, unplaced: unplacedCopies(s, id) }))
      .filter((i) => i.unplaced > 0),
    cutting: cuttingOf(s),
  };
}

/* ------------------------------------------------------------------ */
/* Letters                                                             */
/* ------------------------------------------------------------------ */

export interface LetterVM {
  id: string;
  kind: Letter['kind'];
  /** "Week of Sep 21" · "September 2026 bouquet" */
  title: string;
  stars: number;
  read: boolean;
  letter: Letter;
  /** Monthly: the bouquet's stems. */
  stems: BouquetStem[];
}

export interface LettersVM {
  unread: number;
  /** The unread letter to show on the windowsill first (oldest unread). */
  next: string | null;
  /** The memory shelf: every Sunday Note and page, newest first. */
  letters: LetterVM[];
  /** The Bouquet Shelf: monthly bouquets grouped by year (12 per year), newest year first. */
  shelf: { year: number; bouquets: LetterVM[] }[];
}

export function lettersVM(s: AppState): LettersVM {
  const vms: LetterVM[] = s.inbox.map((l) => ({
    id: l.id,
    kind: l.kind,
    title: l.kind === 'weekly' ? `Week of ${monthDayLabel(l.weekStart)}` : `${monthYearLabel(l.month)} bouquet`,
    stars: l.stars,
    read: l.readAt !== undefined,
    letter: l,
    stems: l.kind === 'monthly' ? l.stems ?? [] : [],
  }));
  const key = (l: Letter) => (l.kind === 'weekly' ? l.weekStart : `${l.month}-99`);
  const newest = [...vms].sort((a, b) => (key(a.letter) < key(b.letter) ? 1 : -1));
  const years = new Map<number, LetterVM[]>();
  for (const v of newest) if (v.letter.kind === 'monthly') years.set(Number(v.letter.month.slice(0, 4)), [...(years.get(Number(v.letter.month.slice(0, 4))) ?? []), v]);
  const unread = newest.filter((v) => !v.read);
  return {
    unread: unread.length,
    next: unread[unread.length - 1]?.id ?? null,
    letters: newest,
    shelf: [...years.entries()].sort((a, b) => b[0] - a[0]).map(([year, bouquets]) => ({ year, bouquets })),
  };
}

/* ------------------------------------------------------------------ */
/* Pins (badges)                                                       */
/* ------------------------------------------------------------------ */

export interface BadgeVM {
  id: string;
  name: string;
  description: string;
  /** Stamps it pays. */
  stars: number;
  color: (typeof BADGES)[number]['color'];
  earned: boolean;
  earnedAt: number | null;
  /** Counting badges: how far along ("43 / 50 check-ins"). */
  progress: { have: number; need: number } | null;
}

const COUNTERS: Record<string, (s: AppState) => { have: number; need: number }> = {
  'checkins-10': (s) => ({ have: s.lifetime.checkins, need: 10 }),
  'checkins-50': (s) => ({ have: s.lifetime.checkins, need: 50 }),
  'checkins-100': (s) => ({ have: s.lifetime.checkins, need: 100 }),
  'checkins-250': (s) => ({ have: s.lifetime.checkins, need: 250 }),
  'checkins-500': (s) => ({ have: s.lifetime.checkins, need: 500 }),
  'checkins-1000': (s) => ({ have: s.lifetime.checkins, need: 1000 }),
  'collect-10': (s) => ({ have: machineCollectiblesOwned(s.collection), need: 10 }),
  'collect-25': (s) => ({ have: machineCollectiblesOwned(s.collection), need: 25 }),
  'collect-50': (s) => ({ have: machineCollectiblesOwned(s.collection), need: 50 }),
  'collect-100': (s) => ({ have: machineCollectiblesOwned(s.collection), need: 100 }),
};

export function badgesVM(s: AppState): { earned: number; total: number; badges: BadgeVM[] } {
  const badges = BADGES.map((b) => {
    const at = s.badges[b.id];
    const counter = COUNTERS[b.id];
    const p = counter ? counter(s) : null;
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      stars: b.stars,
      color: b.color,
      earned: at !== undefined,
      earnedAt: at ?? null,
      progress: p && at === undefined ? { have: Math.min(p.have, p.need), need: p.need } : null,
    };
  });
  return { earned: badges.filter((b) => b.earned).length, total: badges.length, badges };
}
