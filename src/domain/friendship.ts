/**
 * Friendship and pet care (DESIGN §7 as amended by §13.7 and §13.10).
 *
 * XP sources, each capped per pet per *app day* (caps reset lazily when `daily.date` changes):
 * - Petting (tap / stroke / boop): +1 XP, at most 5 XP a day. The reaction always plays; only the
 *   XP is capped ('capped').
 * - Treats: +4 XP, or +12 for the favorite (only the first favorite each day pays +12; later ones
 *   pay +4). At most 3 counted treats a day; after that the pet is "so full" ('full'): no XP and
 *   the serving is kept. Feeding needs a serving in the pantry ('none' otherwise).
 * - Duplicate pull: +20 XP ("a visit from their twin").
 * - Buddy bonus: the Today buddy gains +1 XP per completing check-in, at most 10 a day.
 * No decay, no hunger, no sadness. Feeding the favorite reveals it (badge "Favorite Found").
 * Mochi is fixed (DESIGN §13.10): Sunny, loves Strawberry Milk (known from day one), name locked,
 * always in the meadow.
 */
import { MOCHI_ID, TREATS, getCollectible, moonlitBase } from '@/catalog/collectibles';
import { MOCHI_PROFILE, PERSONALITIES, PERSONALITY_BY_ID } from '@/catalog/personalities';
import type { PetInteractionResult } from '@/state/api';
import type { AppState, DateKey, PetState } from '@/state/types';
import type { WearableSlot } from '@/catalog/types';
import { evaluateBadges } from './badges';
import { levelForXp, levelsCrossed } from './levels';
import { takeServing } from './pantry';
import { pick, type Rng } from './rng';
import type { Tx } from './tx';

export const PET_XP = { perPet: 1, petsPerDay: 5, treat: 4, favorite: 12, treatsPerDay: 3, favoritesPerDay: 1, duplicate: 20, buddy: 1, buddyPerDay: 10 } as const;

export type XpSource = 'pet' | 'treat' | 'duplicate' | 'buddy';

type Daily = PetState['daily'];

/** The pet's daily counters as of `today` (fresh counters on a new day). */
export function dailyFor(pet: Pick<PetState, 'daily'>, today: DateKey): Required<Daily> {
  if (pet.daily.date !== today) return { date: today, pets: 0, treats: 0, buddy: 0, favorites: 0 };
  return { ...pet.daily, favorites: pet.daily.favorites ?? 0 };
}

/** A fresh PetState for a newly obtained pet (personality and favorite treat rolled with `rng`). */
export function newPetState(petId: string, rng: Rng, now: number, today: DateKey, inMeadow: boolean): PetState {
  const def = getCollectible(petId);
  if (def?.category !== 'pet') throw new Error(`Not a pet: ${petId}`);
  if (petId === MOCHI_ID) return mochiPetState(now, today);
  return {
    id: petId,
    // A Moonlit variant is a different friend from its daytime twin: "Moonlit Patches".
    name: moonlitBase(petId) !== null ? `Moonlit ${def.defaultName}` : def.defaultName,
    personality: pick(rng, PERSONALITIES).id,
    favoriteTreat: pick(rng, TREATS).id,
    favoriteKnown: false,
    xp: 0,
    outfit: {},
    inMeadow,
    favorite: false,
    obtainedAt: now,
    daily: { date: today, pets: 0, treats: 0, buddy: 0, favorites: 0 },
  };
}

/** Mochi's fixed character sheet (DESIGN §13.10). */
export function mochiPetState(now: number, today: DateKey): PetState {
  return {
    id: MOCHI_ID,
    name: 'Mochi',
    personality: MOCHI_PROFILE.personality,
    favoriteTreat: MOCHI_PROFILE.favoriteTreat,
    favoriteKnown: true,
    xp: 0,
    outfit: {},
    inMeadow: true,
    favorite: false,
    obtainedAt: now,
    daily: { date: today, pets: 0, treats: 0, buddy: 0, favorites: 0 },
  };
}

export const isNameLocked = (petId: string): boolean => petId === MOCHI_ID && MOCHI_PROFILE.nameLocked;

/**
 * Adds XP (after the caller applied its cap), emitting a `petLevel` event per level crossed.
 * Returns the levels crossed.
 */
export function addXp(tx: Tx, petId: string, amount: number): number[] {
  if (!(amount > 0) || !tx.s.pets[petId]) return [];
  const pet = tx.pet(petId);
  const before = pet.xp;
  pet.xp = before + amount;
  const crossed = levelsCrossed(before, pet.xp);
  for (const level of crossed) tx.emit({ type: 'petLevel', petId, level });
  return crossed;
}

/** Buddy bonus for a completing check-in (+1, max 10 a day). */
export function buddyBonus(tx: Tx): void {
  const buddy = tx.s.profile.buddy;
  if (!buddy || !tx.s.pets[buddy]) return;
  const daily = dailyFor(tx.s.pets[buddy]!, tx.env.today);
  if (daily.buddy >= PET_XP.buddyPerDay) return;
  tx.pet(buddy).daily = { ...daily, buddy: daily.buddy + 1 };
  addXp(tx, buddy, PET_XP.buddy);
}

/** A personality line for a reaction, with {name} and {you} filled in. */
export function petLine(s: AppState, pet: PetState, rng: Rng): string {
  const lines = PERSONALITY_BY_ID.get(pet.personality)?.lines ?? [];
  if (lines.length === 0) return '';
  const you = s.profile.name.trim() || 'friend';
  return pick(rng, lines).replaceAll('{you}', you).replaceAll('{name}', pet.name);
}

function interaction(tx: Tx, petId: string, xp: number, reaction: PetInteractionResult['reaction']): Omit<PetInteractionResult, 'events'> {
  const pet = tx.s.pets[petId]!;
  const before = pet.xp;
  const crossed = xp > 0 ? addXp(tx, petId, xp) : [];
  return {
    xpGained: xp,
    level: levelForXp(before + xp),
    leveledUp: crossed.length > 0,
    reaction,
    line: petLine(tx.s, tx.s.pets[petId]!, tx.env.rng),
  };
}

const NO_PET: Omit<PetInteractionResult, 'events'> = { xpGained: 0, level: 1, leveledUp: false, reaction: 'none' };

/** Tap / stroke / boop: +1 XP up to 5 a day; the reaction is never capped. */
export function petPet(tx: Tx, petId: string): Omit<PetInteractionResult, 'events'> {
  const pet = tx.s.pets[petId];
  if (!pet) return NO_PET;
  const daily = dailyFor(pet, tx.env.today);
  const capped = daily.pets >= PET_XP.petsPerDay;
  if (!capped) tx.pet(petId).daily = { ...daily, pets: daily.pets + PET_XP.perPet };
  const result = interaction(tx, petId, capped ? 0 : PET_XP.perPet, capped ? 'capped' : 'happy');
  evaluateBadges(tx);
  return result;
}

/** Feed a treat from the pantry (see module doc for the caps). */
export function feedPet(tx: Tx, petId: string, treatId: string): Omit<PetInteractionResult, 'events'> {
  const pet = tx.s.pets[petId];
  if (!pet || getCollectible(treatId)?.category !== 'treat') return NO_PET;
  const daily = dailyFor(pet, tx.env.today);
  if (daily.treats >= PET_XP.treatsPerDay) {
    return { xpGained: 0, level: levelForXp(pet.xp), leveledUp: false, reaction: 'full', line: petLine(tx.s, pet, tx.env.rng) };
  }
  if (!takeServing(tx, treatId)) return { ...NO_PET, level: levelForXp(pet.xp) };
  const isFavorite = treatId === pet.favoriteTreat;
  const favoritePays = isFavorite && daily.favorites < PET_XP.favoritesPerDay;
  const xp = favoritePays ? PET_XP.favorite : PET_XP.treat;
  const writable = tx.pet(petId);
  writable.daily = { ...daily, treats: daily.treats + 1, favorites: daily.favorites + (isFavorite ? 1 : 0) };
  const discovered = isFavorite && !pet.favoriteKnown;
  if (discovered) {
    writable.favoriteKnown = true;
    tx.emit({ type: 'favoriteFound', petId, treatId });
  }
  const result = interaction(tx, petId, xp, isFavorite ? 'love' : 'happy');
  evaluateBadges(tx, { fedTreat: true, favoriteFound: discovered });
  return result;
}

/* ------------------------------------------------------------------ */
/* Pet profile                                                         */
/* ------------------------------------------------------------------ */

export const MAX_PET_NAME = 24;

/** Renames a pet (trimmed, 1–24 characters). Mochi's name is locked. */
export function renamePet(tx: Tx, petId: string, name: string): boolean {
  const clean = Array.from(name.trim()).slice(0, MAX_PET_NAME).join('');
  if (!tx.s.pets[petId] || isNameLocked(petId) || clean.length === 0) return false;
  tx.pet(petId).name = clean;
  return true;
}

/**
 * Puts an owned wearable in a slot (or clears it with null). Owning an item lets any pet wear it,
 * several at once (DESIGN §7.3). The first outfit earns "Dress Up".
 */
export function setOutfit(tx: Tx, petId: string, slot: WearableSlot, itemId: string | null): boolean {
  if (!tx.s.pets[petId]) return false;
  if (itemId !== null) {
    const def = getCollectible(itemId);
    if (def?.category !== 'wearable' || def.slot !== slot || (tx.s.collection[itemId]?.count ?? 0) < 1) return false;
  }
  const pet = tx.pet(petId);
  const outfit = { ...pet.outfit };
  if (itemId === null) delete outfit[slot];
  else outfit[slot] = itemId;
  pet.outfit = outfit;
  if (itemId !== null) evaluateBadges(tx, { outfit: true });
  return true;
}

export function toggleFavoritePet(tx: Tx, petId: string): boolean {
  if (!tx.s.pets[petId]) return false;
  const pet = tx.pet(petId);
  pet.favorite = !pet.favorite;
  return true;
}

/** The Today-screen buddy (an owned pet). */
export function setBuddy(tx: Tx, petId: string): boolean {
  if (!tx.s.pets[petId]) return false;
  tx.section('profile').buddy = petId;
  return true;
}
