/**
 * Pets, the meadow, letters and badges (DESIGN §7 as amended by §13.7/§13.10, §9.4, §6.5,
 * §13.10 rituals).
 */
import { BADGES } from '@/catalog/badges';
import { HARVEST_BY_PLANT, MOCHI_ID, PLANTS, TOY_IDS, getCollectible, moonlitBase } from '@/catalog/collectibles';
import { PERSONALITY_BY_ID, TREAT_TAG_HINTS } from '@/catalog/personalities';
import { ZONES } from '@/catalog/zones';
import { WEARABLE_SLOTS, type Personality, type Species, type WearableSlot } from '@/catalog/types';
import type { AppState, BouquetStem, DateKey, Letter, MeadowZoneId, PetState, PlacedDecor } from '../types';
import { machineCollectiblesOwned, ownedTreats, ownedWearables } from '@/domain/collection';
import { appDayKey, monthDayLabel, monthYearLabel } from '@/domain/dates';
import { PET_XP, dailyFor, isNameLocked } from '@/domain/friendship';
import { LEVEL_PERKS, MAX_FRIEND_LEVEL, levelProgress, memoriesFor, type LevelProgress } from '@/domain/levels';
import { petsOutCapacity, petsOutCount, unplacedCopies } from '@/domain/meadow';
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
  /** Levels 11–15 are cosmetic bond levels. */
  bond: boolean;
  /** Hearts filled (1–10). */
  hearts: number;
  /** 0..1 toward the next level. */
  fraction: number;
  inMeadow: boolean;
  buddy: boolean;
  favorite: boolean;
  moonlit: boolean;
  mochi: boolean;
  obtainedAt: number;
}

export function petSummary(s: AppState, pet: PetState): PetSummaryVM {
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
    inMeadow: pet.inMeadow,
    buddy: s.profile.buddy === pet.id,
    favorite: pet.favorite,
    moonlit: moonlitBase(pet.id) !== null,
    mochi: pet.id === MOCHI_ID,
    obtainedAt: pet.obtainedAt,
  };
}

export interface PetsVM {
  /** Favorites first, then the buddy, then oldest friends first (Mochi leads her group). */
  pets: PetSummaryVM[];
  out: number;
  capacity: number;
}

export function petsVM(s: AppState): PetsVM {
  const pets = Object.values(s.pets)
    .map((p) => petSummary(s, p))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || Number(b.buddy) - Number(a.buddy) || Number(b.mochi) - Number(a.mochi) || a.obtainedAt - b.obtainedAt);
  return { pets, out: petsOutCount(s), capacity: petsOutCapacity(s) };
}

export interface PetVM extends PetSummaryVM {
  nameLocked: boolean;
  personalityEmoji: string;
  personalityBlurb: string;
  progress: LevelProgress;
  /** Perks unlocked so far and the next one ("L6: leaves little gifts under the tree"). */
  perks: { level: number; text: string; unlocked: boolean }[];
  /** Memory polaroids earned after level 10 (one per 150 XP). */
  memories: number;
  /** The favorite treat once discovered; otherwise a hint by tag or by the plant it grows on. */
  favoriteTreat: { known: boolean; treatId: string | null; name: string | null; hint: string };
  outfit: Record<WearableSlot, string | null>;
  /** Owned wearables per slot (any pet may wear any owned item). */
  wardrobe: Record<WearableSlot, { id: string; name: string }[]>;
  /** Owned treats with servings (feeding needs a serving). */
  treats: { id: string; name: string; servings: number; favorite: boolean }[];
  /** Today's remaining XP allowances (reactions are never capped). */
  today: { petsLeft: number; treatsLeft: number; favoriteBonusLeft: boolean };
  /** "Gotcha day": the app day they arrived. */
  arrivedOn: DateKey;
  arrivedLabel: string;
}

function favoriteHint(treatId: string): string {
  const def = getCollectible(treatId);
  if (def?.category === 'treat' && def.source === 'garden') {
    const plants = Object.entries(HARVEST_BY_PLANT)
      .filter(([, t]) => t === treatId)
      .map(([p]) => p);
    if (plants.length === 1) {
      const name = PLANTS.find((p) => p.plant === plants[0])?.name ?? plants[0]!;
      return `Loves something from a ${name.toLowerCase()} 🌱`;
    }
  }
  const tag = def?.category === 'treat' ? def.tags[0] : undefined;
  return tag ? TREAT_TAG_HINTS[tag] : 'Loves a mystery snack';
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
    nameLocked: isNameLocked(id),
    personalityEmoji: pers?.emoji ?? '',
    personalityBlurb: pers?.blurb ?? '',
    progress: lp,
    perks: Object.entries(LEVEL_PERKS).map(([lvl, text]) => ({ level: Number(lvl), text, unlocked: lp.level >= Number(lvl) })),
    memories: memoriesFor(pet.xp),
    favoriteTreat: {
      known: pet.favoriteKnown,
      treatId: pet.favoriteKnown ? pet.favoriteTreat : null,
      name: pet.favoriteKnown ? favDef?.name ?? null : null,
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
/* Meadow                                                              */
/* ------------------------------------------------------------------ */

export interface MeadowVM {
  zones: { id: MeadowZoneId; name: string; price: number; owned: boolean; canAfford: boolean; blurb: string; petsOut: number }[];
  capacity: number;
  /** Pets out in the meadow (Mochi always among them). */
  out: PetSummaryVM[];
  /** Pets napping in the cottage. */
  napping: PetSummaryVM[];
  /** Placed decor, with its catalog name and whether pets play with it. */
  decor: (PlacedDecor & { name: string; toy: boolean })[];
  /** Owned decor copies not yet placed. */
  inventory: { itemId: string; name: string; unplaced: number }[];
}

export function meadowVM(s: AppState): MeadowVM {
  const all = Object.values(s.pets).map((p) => petSummary(s, p));
  return {
    zones: ZONES.map((z) => ({ id: z.id, name: z.name, price: z.price, owned: s.meadow.zones.includes(z.id), canAfford: s.wallet.coins >= z.price, blurb: z.blurb, petsOut: z.petsOut })),
    capacity: petsOutCapacity(s),
    out: all.filter((p) => p.inMeadow),
    napping: all.filter((p) => !p.inMeadow),
    decor: s.meadow.decor.map((d) => ({ ...d, name: getCollectible(d.itemId)?.name ?? d.itemId, toy: TOY_IDS.has(d.itemId) })),
    inventory: Object.keys(s.collection)
      .filter((id) => getCollectible(id)?.category === 'decor')
      .map((id) => ({ itemId: id, name: getCollectible(id)!.name, unplaced: unplacedCopies(s, id) }))
      .filter((i) => i.unplaced > 0),
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
  /** The Letterbox: every letter, newest first. */
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
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export interface BadgeVM {
  id: string;
  name: string;
  description: string;
  stars: number;
  emoji: string;
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
      emoji: b.emoji,
      color: b.color,
      earned: at !== undefined,
      earnedAt: at ?? null,
      progress: p && at === undefined ? { have: Math.min(p.have, p.need), need: p.need } : null,
    };
  });
  return { earned: badges.filter((b) => b.earned).length, total: badges.length, badges };
}
