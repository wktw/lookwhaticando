/**
 * Friendship and pet care (DESIGN §8.2).
 *
 * XP sources, each capped per pet per *app day* (caps reset lazily when `daily.date` changes):
 * - Petting (tap / stroke / boop): +1 XP, at most 5 XP a day. The reaction always plays; only the
 *   XP is capped ('capped').
 * - Treats: +4 XP, or +12 for the favorite (only the first favorite each day pays +12; later ones
 *   pay +4). At most 3 counted treats a day; after that the pet is full ('full'): no XP and the
 *   serving is kept. Feeding needs a serving in the pantry ('none' otherwise).
 * - Duplicate pull: +20 XP.
 * - A companion's habit check-ins (§14.1): company.ts, at most 30 XP a day (`daily.company`).
 * No decay, no needs. Feeding the favorite reveals it (the Favorite Found pin).
 *
 * Found things (§8.2 "L6 leaves a small found thing on the sill on days you check in; 1 swap, never
 * a chore"): on an app day with a check-in, one pet out on the Shelf at level 6 or more leaves one
 * found thing, worth 1 swap, collected automatically. One a day for the whole Shelf, however many
 * pets are L6 (a reading of §8.2 that keeps swaps a trickle: see NOTES-domain.md).
 *
 * There is no mascot: every pet comes from a capsule or a Special Order, every name can be changed,
 * and any pet can be brought in or out.
 */
import { TREATS, getCollectible, moonlitBase } from '@/catalog/collectibles';
import { PERSONALITIES } from '@/catalog/personalities';
import type { PetInteractionResult } from '@/state/api';
import type { AppState, DateKey, FoundThing, PetMemory, PetState } from '@/state/types';
import type { WearableSlot } from '@/catalog/types';
import { evaluateBadges } from './badges';
import { addDays, appDayKey } from './dates';
import { FOUND_THING_LEVEL, MAX_FRIEND_LEVEL, levelForXp, levelsCrossed, memoriesFor } from './levels';
import { chooseBestFriend, claimSpot } from './places';
import { takeServing } from './pantry';
import { pick, randomInt, type Rng } from './rng';
import type { Tx } from './tx';
import { grantStardust, hasOnce, setOnce } from './wallet';

export const PET_XP = { perPet: 1, petsPerDay: 5, treat: 4, favorite: 12, treatsPerDay: 3, favoritesPerDay: 1, duplicate: 20 } as const;

/** A found thing is worth 1 swap (internally stardust). */
export const FOUND_THING_SWAPS = 1;
/** Found things are kept this many app days (the Sunday Note's P.S. looks back one week). */
export const FOUND_THING_DAYS = 14;

export type XpSource = 'pet' | 'treat' | 'duplicate';

type Daily = PetState['daily'];

/** The pet's daily counters as of `today` (fresh counters on a new day). */
export function dailyFor(pet: Pick<PetState, 'daily'>, today: DateKey): Required<Daily> {
  if (pet.daily.date !== today) return { date: today, pets: 0, treats: 0, favorites: 0, company: 0 };
  return { date: pet.daily.date, pets: pet.daily.pets, treats: pet.daily.treats, favorites: pet.daily.favorites ?? 0, company: pet.daily.company ?? 0 };
}

/** A fresh PetState for a newly obtained pet (personality and favorite treat rolled with `rng`). */
export function newPetState(petId: string, rng: Rng, now: number, today: DateKey, out: boolean): PetState {
  const def = getCollectible(petId);
  if (def?.category !== 'pet') throw new Error(`Not a pet: ${petId}`);
  return {
    id: petId,
    // A Moonlit variant is a different friend from its daytime twin: "Moonlit Pudding".
    name: moonlitBase(petId) !== null ? `Moonlit ${def.defaultName}` : def.defaultName,
    personality: pick(rng, PERSONALITIES).id,
    favoriteTreat: pick(rng, TREATS).id,
    favoriteKnown: false,
    xp: 0,
    outfit: {},
    inMeadow: out,
    favorite: false,
    obtainedAt: now,
    daily: { date: today, pets: 0, treats: 0, favorites: 0 },
  };
}

/**
 * The pet a view features when it needs one (celebration art, an empty band): a favourite pet out
 * on the Shelf, else any favourite, else the closest friend out, else the closest friend (ties go to
 * the pet who came home first). Null before the first pet.
 */
export function featuredPetId(s: Pick<AppState, 'pets'>): string | null {
  let best: PetState | null = null;
  const rank = (p: PetState): number => (p.favorite ? 2 : 0) + (p.inMeadow ? 1 : 0);
  for (const p of Object.values(s.pets)) {
    if (!best || rank(p) > rank(best) || (rank(p) === rank(best) && (p.xp > best.xp || (p.xp === best.xp && p.obtainedAt < best.obtainedAt)))) best = p;
  }
  return best?.id ?? null;
}

/** The level at which a pet claims its favourite spot, and the one from which it naps next to a best friend (§8.2). */
export const SPOT_LEVEL = 4;
export const BEST_FRIEND_LEVEL = 8;

/**
 * Adds XP (after the caller applied its cap), emitting a `petLevel` event per level crossed.
 * Levels change behaviour (§8.2), and three of them leave a mark on the pet that stays: level 4
 * claims a favourite spot (`spot`), level 8 a best friend on the Shelf (`bestFriend`), level 10 the
 * day you became best friends (`bestFriendsOn`); and every 150 XP after level 10 records a dated
 * Memory (`memories`). Returns the levels crossed.
 */
export function addXp(tx: Tx, petId: string, amount: number): number[] {
  if (!(amount > 0) || !tx.s.pets[petId]) return [];
  const pet = tx.pet(petId);
  const before = pet.xp;
  pet.xp = before + amount;
  const crossed = levelsCrossed(before, pet.xp);
  for (const level of crossed) tx.emit({ type: 'petLevel', petId, level });
  const level = levelForXp(pet.xp);
  if (level >= SPOT_LEVEL && pet.spot === undefined) tx.pet(petId).spot = claimSpot(tx.s, petId);
  if (level >= BEST_FRIEND_LEVEL && pet.bestFriend === undefined) {
    const friend = chooseBestFriend(tx.s, petId);
    if (friend) tx.pet(petId).bestFriend = friend;
  }
  if (level >= MAX_FRIEND_LEVEL && pet.bestFriendsOn === undefined) tx.pet(petId).bestFriendsOn = tx.env.today;
  const due = memoriesFor(pet.xp) - (tx.s.pets[petId]!.memories?.length ?? 0);
  for (let i = 0; i < due; i++) recordMemory(tx, petId);
  return crossed;
}

/**
 * The next dated Memory (§8.2), from real events not yet remembered, oldest kind first: the day
 * you became best friends, the day it came home, each plant it keeps company blooming ("The day
 * Read bloomed"), moving into a plant, the day its favourite treat was found; then a quiet day on
 * the sill (today).
 */
function recordMemory(tx: Tx, petId: string): void {
  const pet = tx.s.pets[petId]!;
  const have = pet.memories ?? [];
  const known = (m: PetMemory) => have.some((h) => h.kind === m.kind && h.habitId === m.habitId && (m.kind === 'day' ? h.date === m.date : true));
  const pairs = Object.values(tx.s.company?.pairs ?? {})
    .filter((p) => p.petId === petId)
    .sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0));
  const cameHome = appDayKey(pet.obtainedAt, tx.s.settings.dayStartsAt, tx.env.local);
  const candidates: PetMemory[] = [
    ...(pet.bestFriendsOn ? [{ kind: 'best-friends' as const, date: pet.bestFriendsOn }] : []),
    { kind: 'came-home', date: cameHome },
    ...pairs.filter((p) => p.stories?.lookAtUs).map((p) => ({ kind: 'bloomed' as const, date: p.stories!.lookAtUs!.on, habitId: p.habitId })),
    ...pairs.map((p) => ({ kind: 'moved-in' as const, date: p.since, habitId: p.habitId })),
    ...(pet.favoriteKnown ? [{ kind: 'favourite' as const, date: tx.env.today, treatId: pet.favoriteTreat }] : []),
    { kind: 'day', date: tx.env.today },
  ];
  const next = candidates.find((m) => !known(m)) ?? { kind: 'day' as const, date: tx.env.today };
  tx.pet(petId).memories = [...have, next];
}

/** The once-key of the day's found thing. */
const foundKey = (date: DateKey): string => `found|${date}`;

/** Pets out on the Shelf at level 6 or more, oldest friends first (they can leave found things). */
export function foundThingFinders(s: Pick<AppState, 'pets'>): PetState[] {
  return Object.values(s.pets)
    .filter((p) => p.inMeadow && levelForXp(p.xp) >= FOUND_THING_LEVEL)
    .sort((a, b) => a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1));
}

/**
 * On the first check-in of an app day, one L6+ pet out on the Shelf leaves a found thing on the sill:
 * 1 swap, collected at once (never a chore). At most one a day, never taken back. Returns it.
 */
export function leaveFoundThing(tx: Tx): FoundThing | null {
  const today = tx.env.today;
  if (hasOnce(tx.s, foundKey(today))) return null;
  const finders = foundThingFinders(tx.s);
  if (finders.length === 0) return null;
  const finder = pick(tx.env.rng, finders);
  const thing: FoundThing = { date: today, petId: finder.id, seed: randomInt(tx.env.rng, 0, 9999) };
  setOnce(tx, foundKey(today));
  const horizon = addDays(today, -(FOUND_THING_DAYS - 1));
  tx.set('found', [...(tx.s.found ?? []).filter((f) => f.date >= horizon), thing]);
  tx.emit({ type: 'foundThing', petId: finder.id, date: today, seed: thing.seed, swaps: FOUND_THING_SWAPS });
  grantStardust(tx, FOUND_THING_SWAPS);
  return thing;
}

/** Drops found things older than the kept window (compaction). */
export function pruneFoundThings(tx: Tx): void {
  const list = tx.s.found;
  if (!list) return;
  const horizon = addDays(tx.env.today, -(FOUND_THING_DAYS - 1));
  if (list.every((f) => f.date >= horizon)) return;
  const kept = list.filter((f) => f.date >= horizon);
  tx.set('found', kept.length > 0 ? kept : undefined);
}

function interaction(tx: Tx, petId: string, xp: number, reaction: PetInteractionResult['reaction']): Omit<PetInteractionResult, 'events'> {
  const pet = tx.s.pets[petId]!;
  const before = pet.xp;
  const crossed = xp > 0 ? addXp(tx, petId, xp) : [];
  return { xpGained: xp, level: levelForXp(before + xp), leveledUp: crossed.length > 0, reaction };
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
  if (!pet || getCollectible(treatId)?.category !== 'treat' || (tx.s.collection[treatId]?.count ?? 0) < 1) return NO_PET;
  const daily = dailyFor(pet, tx.env.today);
  if (daily.treats >= PET_XP.treatsPerDay) {
    return { xpGained: 0, level: levelForXp(pet.xp), leveledUp: false, reaction: 'full' };
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

/** Renames a pet (trimmed, 1–24 characters). */
export function renamePet(tx: Tx, petId: string, name: string): boolean {
  const clean = Array.from(name.trim()).slice(0, MAX_PET_NAME).join('');
  if (!tx.s.pets[petId] || clean.length === 0) return false;
  tx.pet(petId).name = clean;
  return true;
}

/**
 * Puts an owned wearable in a slot (or clears it with null). Owning an item lets any pet wear it,
 * several at once (DESIGN §8.3). The first outfit earns the Dress Up pin.
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
