/**
 * Where pets spend the day on the Shelf (DESIGN §8.4), and the small facts the friendship levels
 * read from it (§8.2: L4 claims a favourite spot, L8 naps next to a best friend). A leaf module:
 * pure functions of the state, used by shelf.ts (moving pets) and friendship.ts (claiming).
 *
 * - Every pet out has a place: `PetState.place` when that place is open, else the Sill.
 * - The Sill holds everyone; each other place holds as many pets as the room it adds (`petsOut`,
 *   2), so a place never becomes a crowd.
 * - A pet with no `place` has never been placed: opening a place it loves moves it there
 *   (`settleNewPlace`, shelf.ts). 'sill' is a choice, and stays.
 */
import { getCollectible } from '@/catalog/collectibles';
import { PLACES, PLACE_BY_ID } from '@/catalog/places';
import type { PlaceId, Species } from '@/catalog/types';
import type { AppState, PetSpotClaim, PetState } from '@/state/types';

/** The pet's species (a Moonlit variant is its base species). */
export function speciesOfPet(petId: string): Species | null {
  const def = getCollectible(petId.replace(/^moonlit:/, ''));
  return def?.category === 'pet' ? def.species : null;
}

/** The place a pet spends the day in: its `place` when that place is open, else the Sill. */
export function petPlace(s: Pick<AppState, 'shelf'>, pet: Pick<PetState, 'place'>): PlaceId {
  return pet.place !== undefined && s.shelf.places.includes(pet.place) ? pet.place : 'sill';
}

/** How many pets a place holds: the Sill holds everyone, the others the room they add. */
export function placeRoom(place: PlaceId): number {
  return place === 'sill' ? Number.POSITIVE_INFINITY : (PLACE_BY_ID.get(place)?.petsOut ?? 0);
}

/** Pets out in a place (by their effective place). */
export function petsInPlace(s: Pick<AppState, 'shelf' | 'pets'>, place: PlaceId): PetState[] {
  return Object.values(s.pets).filter((p) => p.inMeadow && petPlace(s, p) === place);
}

/** The place has room for one more pet (the pet itself doesn't count against it). */
export function hasRoomIn(s: Pick<AppState, 'shelf' | 'pets'>, place: PlaceId, petId?: string): boolean {
  return petsInPlace(s, place).filter((p) => p.id !== petId).length < placeRoom(place);
}

/** Open places (other than the Sill) whose `loves` include the species, in Shelf order. */
export function lovedPlaces(s: Pick<AppState, 'shelf'>, species: Species | null): PlaceId[] {
  if (!species) return [];
  return PLACES.filter((p) => p.id !== 'sill' && s.shelf.places.includes(p.id) && p.loves.includes(species)).map((p) => p.id);
}

/**
 * "Let {name} choose" (§7.2): the open place the species loves that still has room, else the
 * Sill. Species prefer places, but none is restricted.
 */
export function suggestPlaceFor(s: Pick<AppState, 'shelf' | 'pets'>, petId: string): PlaceId {
  for (const place of lovedPlaces(s, speciesOfPet(petId))) if (hasRoomIn(s, place, petId)) return place;
  return 'sill';
}

/** The habit a pet keeps company (a live habit only). */
export function companionHabitOf(s: Pick<AppState, 'habits'>, petId: string): string | null {
  return s.habits.find((h) => h.companionId === petId && h.archivedOn === undefined)?.id ?? null;
}

/**
 * The favourite spot a pet claims at level 4 (§8.2): the pot of the habit it keeps company, else
 * the place it spends the day in (when that isn't the Sill), else its species' favourite open
 * place, else the Sill.
 */
export function claimSpot(s: Pick<AppState, 'habits' | 'shelf' | 'pets'>, petId: string): PetSpotClaim {
  const habitId = companionHabitOf(s, petId);
  if (habitId) return { kind: 'pot', habitId };
  const pet = s.pets[petId];
  const here = pet ? petPlace(s, pet) : 'sill';
  if (here !== 'sill') return { kind: 'place', place: here };
  return { kind: 'place', place: lovedPlaces(s, speciesOfPet(petId))[0] ?? 'sill' };
}

/**
 * The best friend a pet naps next to from level 8 (§8.2 L8): another pet, preferring one out in the
 * same place, then one of the same species, then the one they have shared the Shelf with longest
 * (the later of their came-home times is earliest), then the closest friend. Null alone.
 */
export function chooseBestFriend(s: Pick<AppState, 'pets' | 'shelf'>, petId: string): string | null {
  const me = s.pets[petId];
  if (!me) return null;
  const myPlace = petPlace(s, me);
  const mySpecies = speciesOfPet(petId);
  const others = Object.values(s.pets).filter((p) => p.id !== petId);
  if (others.length === 0) return null;
  const score = (p: PetState): [number, number, number, number] => [
    p.inMeadow && me.inMeadow && petPlace(s, p) === myPlace ? 0 : 1,
    speciesOfPet(p.id) === mySpecies ? 0 : 1,
    Math.max(p.obtainedAt, me.obtainedAt),
    -p.xp,
  ];
  const cmp = (a: PetState, b: PetState): number => {
    const x = score(a);
    const y = score(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
    return a.id < b.id ? -1 : 1;
  };
  return [...others].sort(cmp)[0]!.id;
}
