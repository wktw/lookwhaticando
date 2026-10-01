/**
 * Pets, the Shelf, the memory shelf and pins (DESIGN §8 pets, places and items, §9.4 the Shelf, §9.2
 * the memory shelf, §13 rituals, §14.1 the pet card's company).
 * Structured data: perks, hints and captions are ids and fields the screens word (lines.ts).
 */
import { BADGES } from '@/catalog/badges';
import { HARVEST_BY_PLANT, TOY_IDS, getCollectible, moonlitBase } from '@/catalog/collectibles';
import { PERSONALITY_BY_ID } from '@/catalog/personalities';
import { PLACES } from '@/catalog/places';
import { WEARABLE_SLOTS, type PlaceId, type PlantSpeciesId, type Personality, type Species, type TreatTag, type WearableSlot } from '@/catalog/types';
import type { AppState, DateKey, HerbariumMargin, HerbariumPressing, Letter, Outfit, PetMemory, PetSpotClaim, PetState, PlacedDecor, SeasonRecord, SundayHighlight, SundayPS } from '../types';
import type { RitualKind } from '../api';
import { chooseBestFriend, claimSpot, petPlace, suggestPlaceFor } from '@/domain/places';
import { BEST_FRIEND_LEVEL, SPOT_LEVEL } from '@/domain/friendship';
import { capsuleCollectiblesOwned, ownedTreats, ownedWearables } from '@/domain/collection';
import { monthDayLabel } from '@/domain/dates';
import { arrivalDay } from '@/domain/eventDays';
import { bloomedTogetherOn } from '@/domain/stints';
import { PET_XP, dailyFor, featuredPetId } from '@/domain/friendship';
import { closestPet } from './closestPet';
import type { CuttingVM } from '@/domain/growth';
import { cuttingOf } from '@/domain/economy';
import { LEVEL_PERKS, MAX_FRIEND_LEVEL, levelProgress, memoriesFor, type LevelPerk, type LevelProgress } from '@/domain/levels';
import { petsOutCapacity, petsOutCount, unplacedCopies } from '@/domain/shelf';
import type { ViewEnv } from './common';
import { KEEPSAKE_ITEM_PREFIX, keepsakeOfItem, suggestHabitFor } from '@/domain/company';
import { anniversaryOf } from '@/domain/rituals';
import { keepsakeVM, petCompanyVM, type KeepsakeVM, type PetCompanyVM } from './company';

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
  /** The place it spends the day in (the Sill unless moved; ShelfScene's `ShelfPet.place`). */
  place: PlaceId;
  /** What it wears (ShelfPet.outfit, PetArt). */
  outfit: Outfit;
  favorite: boolean;
  /** The pet a view features when it needs one (friendship.featuredPetId). */
  featured: boolean;
  moonlit: boolean;
  obtainedAt: number;
  /** The habit it keeps company (§14.1), or null. */
  habitId: string | null;
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
    place: petPlace(s, pet),
    outfit: pet.outfit,
    favorite: pet.favorite,
    featured: pet.id === featured,
    moonlit: moonlitBase(pet.id) !== null,
    obtainedAt: pet.obtainedAt,
    habitId: s.habits.find((h) => h.companionId === pet.id && h.archivedOn === undefined)?.id ?? null,
  };
}

export interface PetsVM {
  /** Favourites first, then oldest friends first. */
  pets: PetSummaryVM[];
  out: number;
  capacity: number;
  /** The featured pet (null before the first pet). */
  featured: string | null;
  /** Your closest pet and its species, for the Shelf tab's silhouette (§1 Many animals); null before the first pet. */
  closest: { id: string; species: Species | null } | null;
}

export function petsVM(s: AppState): PetsVM {
  const featured = featuredPetId(s);
  const pets = Object.values(s.pets)
    .map((p) => petSummary(s, p, featured))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1));
  return { pets, out: petsOutCount(s), capacity: petsOutCapacity(s), featured, closest: closestPet(s) };
}

export { closestPet } from './closestPet';

/** The favourite-treat hint before it is found: by the treat's first tag, or the plant it is harvested from. */
export type FavoriteHint = { kind: 'tag'; tag: TreatTag } | { kind: 'plant'; plant: PlantSpeciesId } | { kind: 'unknown' };

export interface PetVM extends Omit<PetSummaryVM, 'outfit'> {
  personalityBlurb: string;
  progress: LevelProgress;
  /** What each level changes (§8.2), and whether it is unlocked. */
  perks: { level: number; perk: LevelPerk; unlocked: boolean }[];
  /** How many Memories it has earned after level 10 (one per 150 XP). */
  memoryCount: number;
  /**
   * Its dated Memories, oldest first (`memoryText` → "Came home Sep 29", "The day Read bloomed",
   * "Best friends, Nov 2"). Empty before best friends ("Memories start once you’re best friends.").
   */
  memories: PetMemory[];
  /** The favourite treat once discovered; otherwise a hint. */
  favoriteTreat: { known: boolean; treatId: string | null; name: string | null; hint: FavoriteHint };
  /**
   * "Likes" (§8.5, the Pet Card): the favourite treat once found ("{Treat}, most of all"), before
   * that the hint's tag (TREAT_TAG_HINTS[tag], "Perks up at anything sweet") or the plant it comes
   * from.
   */
  likes: { kind: 'treat'; treatId: string } | { kind: 'tag'; tag: TreatTag } | { kind: 'plant'; plant: PlantSpeciesId } | null;
  /** "Favourite spot", from level 4 (§8.2): a pot or a place. Null before. */
  spot: PetSpotClaim | null;
  /** "Best friend", from level 8: the pet it naps next to (null before, or alone on the Shelf). */
  bestFriend: string | null;
  /** "Let {name} choose": the place its species would pick now. */
  suggestedPlace: PlaceId;
  /** What it wears, per slot (null = nothing); the scene takes `PetSummaryVM.outfit`. */
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
  /** Today is its came-home day: how many years (a small bow on the pot), else null. */
  cameHomeYears: number | null;
  /** Keeping Company (§14.1): the habit it keeps company, "Known for", and its history. */
  company: PetCompanyVM;
  /** "Find {name} a plant" / "Let {name} choose": the habit its species would pick, when it has none. */
  suggestedHabit: string | null;
  /** Keepsakes it left by the pots, oldest first. */
  keepsakes: KeepsakeVM[];
  /**
   * Dated Memories from real events (§8.2): the day it came home, and each "Look at us" (the day a
   * plant it keeps company bloomed). The friendship Memories after level 10 are `memories`.
   */
  moments: { kind: 'came-home' | 'bloomed'; date: DateKey; habitId?: string }[];
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

/** The Pet Card's "Likes": the favourite once found, else what the hint says. */
export function likesOf(pet: Pick<PetState, 'favoriteKnown' | 'favoriteTreat'>): PetVM['likes'] {
  if (pet.favoriteKnown) return { kind: 'treat', treatId: pet.favoriteTreat };
  const hint = favoriteHint(pet.favoriteTreat);
  return hint.kind === 'unknown' ? null : hint;
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
  const arrivedOn = arrivalDay(s, pet, env.local);
  return {
    ...base,
    personalityBlurb: pers?.blurb ?? '',
    progress: lp,
    perks: Object.entries(LEVEL_PERKS).map(([lvl, perk]) => ({ level: Number(lvl), perk, unlocked: lp.level >= Number(lvl) })),
    memoryCount: memoriesFor(pet.xp),
    memories: [...(pet.memories ?? [])],
    likes: likesOf(pet),
    spot: lp.level >= SPOT_LEVEL ? (pet.spot ?? claimSpot(s, id)) : null,
    bestFriend: lp.level >= BEST_FRIEND_LEVEL ? (pet.bestFriend && s.pets[pet.bestFriend] ? pet.bestFriend : chooseBestFriend(s, id)) : null,
    suggestedPlace: suggestPlaceFor(s, id),
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
    cameHomeYears: anniversaryOf(arrivedOn, env.today),
    company: petCompanyVM(s, env, id),
    suggestedHabit: base.habitId === null ? suggestHabitFor(s, id) : null,
    keepsakes: (s.keepsakes ?? []).filter((k) => k.petId === id).map((k) => keepsakeVM(s, k)),
    moments: [
      { kind: 'came-home' as const, date: arrivedOn },
      ...Object.values(s.company?.pairs ?? {})
        .filter((p) => p.petId === id && p.stories?.lookAtUs)
        .flatMap((p) => {
          // The day it bloomed with this pet there (WP-B6, P-history-09), as the Memory has it.
          const date = bloomedTogetherOn(s, p);
          return date ? [{ kind: 'bloomed' as const, date, habitId: p.habitId }] : [];
        }),
    ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
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
  /** Placed decor, with its catalog name and whether pets play with it (a keepsake carries its record). */
  decor: (PlacedDecor & { name: string; toy: boolean; keepsake?: KeepsakeVM })[];
  /** Owned decor copies not yet placed (keepsakes included, as 'keepsake:<id>', one copy each). */
  inventory: { itemId: string; name: string; unplaced: number; keepsake?: KeepsakeVM }[];
  /** Every keepsake (§14.1), oldest first: placeable, never spent. */
  keepsakes: KeepsakeVM[];
  /** The Cutting on the window frame (§13): the lifetime gauge. */
  cutting: CuttingVM;
}

export function shelfVM(s: AppState): ShelfVM {
  const featured = featuredPetId(s);
  const keepsakes = (s.keepsakes ?? []).map((k) => keepsakeVM(s, k));
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
    decor: s.shelf.decor.map((d) => {
      const k = keepsakeOfItem(s, d.itemId);
      return { ...d, name: k ? k.kind : (getCollectible(d.itemId)?.name ?? d.itemId), toy: TOY_IDS.has(d.itemId), ...(k ? { keepsake: keepsakeVM(s, k) } : {}) };
    }),
    inventory: [
      ...Object.keys(s.collection)
        .filter((id) => getCollectible(id)?.category === 'decor')
        .map((id) => ({ itemId: id, name: getCollectible(id)!.name, unplaced: unplacedCopies(s, id) })),
      ...keepsakes.filter((k) => !k.placed).map((k) => ({ itemId: `${KEEPSAKE_ITEM_PREFIX}${k.id}`, name: k.kind, unplaced: 1, keepsake: k })),
    ].filter((i) => i.unplaced > 0),
    keepsakes,
    cutting: cuttingOf(s),
  };
}

/* ------------------------------------------------------------------ */
/* The memory shelf: Sunday Notes, Herbarium pages, retired plants,    */
/* seasons (§9.2, §13)                                                 */
/* ------------------------------------------------------------------ */

/** The screens' names for the rituals (internally a weekly letter and a monthly bouquet); the `letter` event carries it too. */
export type { RitualKind };

export function ritualKind(l: Letter): RitualKind {
  return l.kind === 'weekly' ? 'sundayNote' : l.kind === 'monthly' ? 'herbarium' : 'anniversary';
}

/** A ritual's day (for ordering): the week's first day, the month's first day, the anniversary. */
export function ritualDate(l: Letter): DateKey {
  return l.kind === 'weekly' ? l.weekStart : l.kind === 'monthly' ? `${l.month}-01` : l.date;
}

/** A Sunday Note: never a percentage (the tallies it paid on stay internal). */
export interface SundayNoteVM {
  id: string;
  kind: 'sundayNote';
  /** "Week of Sep 22". */
  weekStart: DateKey;
  waterings: number;
  highlights: SundayHighlight[];
  /** A note she starred, quoted as written. */
  quote: { habitId: string; date: DateKey; text: string } | null;
  ps: SundayPS | null;
  stamps: number;
  read: boolean;
}

/** A Herbarium page ("September, pressed."): no percentage; a quiet month is as full a page as any. */
export interface HerbariumPageVM {
  id: string;
  kind: 'herbarium';
  month: string;
  pressings: HerbariumPressing[];
  margin: HerbariumMargin | null;
  firstPage: boolean;
  stamps: number;
  read: boolean;
}

/** The moving-in anniversary note ("A year on this sill."). */
export interface AnniversaryVM {
  id: string;
  kind: 'anniversary';
  date: DateKey;
  years: number;
  firstHabitId: string | null;
  waterings: number;
  read: boolean;
}

export type RitualVM = SundayNoteVM | HerbariumPageVM | AnniversaryVM;

export function ritualVM(l: Letter): RitualVM {
  const read = l.readAt !== undefined;
  if (l.kind === 'weekly') {
    return { id: l.id, kind: 'sundayNote', weekStart: l.weekStart, waterings: l.waterings ?? 0, highlights: l.highlights ?? [], quote: l.quote ?? null, ps: l.ps ?? null, stamps: l.stars, read };
  }
  if (l.kind === 'monthly') {
    const pressings = l.pressings ?? (l.stems ?? []).map((st) => ({ habitId: st.habitId, plant: st.plant, waterings: 0, rests: 0, size: st.count }));
    return { id: l.id, kind: 'herbarium', month: l.month, pressings, margin: l.margin ?? null, firstPage: l.firstPage === true, stamps: l.stars, read };
  }
  return { id: l.id, kind: 'anniversary', date: l.date, years: l.years, firstHabitId: l.firstHabitId ?? null, waterings: l.waterings, read };
}

export interface RetiredPlantVM {
  habitId: string;
  name: string;
  plant: PlantSpeciesId;
  pot: string;
  archivedOn: DateKey;
  /** Retired with a ribbon (a finished season): its last day. */
  ribbon: DateKey | null;
}

export interface MemoryShelfVM {
  unread: number;
  /** The unread ritual to show on the sill first (the oldest unread). */
  next: string | null;
  /** Every Sunday Note, Herbarium page and anniversary note, newest first. */
  items: RitualVM[];
  sundayNotes: SundayNoteVM[];
  /** Herbarium pages grouped by year (12 per year), newest year first. */
  herbarium: { year: number; pages: HerbariumPageVM[] }[];
  /** Plants on the balcony shelf (archived habits), most recently retired first. */
  retired: RetiredPlantVM[];
  /** Filed seasons ("Summer, on the sill"), newest first. */
  seasons: SeasonRecord[];
}

export function memoryShelfVM(s: AppState): MemoryShelfVM {
  const byDate = [...s.inbox].sort((a, b) => (ritualDate(a) < ritualDate(b) ? 1 : ritualDate(a) > ritualDate(b) ? -1 : 0));
  const items = byDate.map(ritualVM);
  const years = new Map<number, HerbariumPageVM[]>();
  for (const v of items) if (v.kind === 'herbarium') years.set(Number(v.month.slice(0, 4)), [...(years.get(Number(v.month.slice(0, 4))) ?? []), v]);
  const unread = byDate.filter((l) => l.readAt === undefined);
  return {
    unread: unread.length,
    next: unread[unread.length - 1]?.id ?? null,
    items,
    sundayNotes: items.filter((v): v is SundayNoteVM => v.kind === 'sundayNote'),
    herbarium: [...years.entries()].sort((a, b) => b[0] - a[0]).map(([year, pages]) => ({ year, pages })),
    retired: s.habits
      .filter((h) => h.archivedOn !== undefined)
      .sort((a, b) => (a.archivedOn! < b.archivedOn! ? 1 : a.archivedOn! > b.archivedOn! ? -1 : 0))
      .map((h) => ({ habitId: h.id, name: h.name, plant: h.plant, pot: h.pot, archivedOn: h.archivedOn!, ribbon: h.ribbon ?? null })),
    seasons: [...(s.seasons?.filed ?? [])].reverse(),
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
  /** Counting badges: how far along (43 of 50). */
  progress: { have: number; need: number } | null;
  /**
   * Not shown until earned: "Key under the mat" (an outline only a lapse can fill would read as a
   * "you left" pin, VOICE.md §8).
   */
  hidden: boolean;
}

/** Pins whose outline stays hidden until they are earned. */
export const HIDDEN_UNTIL_EARNED: ReadonlySet<string> = new Set(['comeback']);

const COUNTERS: Record<string, (s: AppState) => { have: number; need: number }> = {
  'checkins-10': (s) => ({ have: s.lifetime.checkins, need: 10 }),
  'checkins-50': (s) => ({ have: s.lifetime.checkins, need: 50 }),
  'checkins-100': (s) => ({ have: s.lifetime.checkins, need: 100 }),
  'checkins-250': (s) => ({ have: s.lifetime.checkins, need: 250 }),
  'checkins-500': (s) => ({ have: s.lifetime.checkins, need: 500 }),
  'checkins-1000': (s) => ({ have: s.lifetime.checkins, need: 1000 }),
  'collect-10': (s) => ({ have: capsuleCollectiblesOwned(s.collection), need: 10 }),
  'collect-25': (s) => ({ have: capsuleCollectiblesOwned(s.collection), need: 25 }),
  'collect-50': (s) => ({ have: capsuleCollectiblesOwned(s.collection), need: 50 }),
  'collect-100': (s) => ({ have: capsuleCollectiblesOwned(s.collection), need: 100 }),
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
      hidden: at === undefined && HIDDEN_UNTIL_EARNED.has(b.id),
    };
  });
  return { earned: badges.filter((b) => b.earned).length, total: badges.length, badges };
}
