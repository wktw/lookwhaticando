/**
 * Read-only questions about the collection (DESIGN §8, §13.6 "Capsules v2", §13.7 "Species
 * albums"). Pure functions of `AppState.collection` and the static catalog.
 */
import { ALBUMS, COLLECTIBLES, MOCHI_ID, MOONLIT_PREFIX, PETS, getCollectible, itemsInMachine, moonlitBase } from '@/catalog/collectibles';
import { MACHINES } from '@/catalog/machines';
import type { CollectibleDef, MachineId, PetDef, Source, TreatDef, WearableDef, WearableSlot } from '@/catalog/types';
import type { AppState } from '@/state/types';

type Collection = AppState['collection'];

const MACHINE_IDS: ReadonlySet<string> = new Set(MACHINES.map((m) => m.id));

/** Items that come out of a machine (not starter, exclusive or garden items). */
export function isMachineSource(source: Source): source is MachineId {
  return MACHINE_IDS.has(source);
}

export function owns(collection: Collection, id: string): boolean {
  return (collection[id]?.count ?? 0) > 0;
}

/** A machine's printed lineup (its catalog items; Dreamy's moonlit variants are a bonus pool, not lineup). */
export function machineLineup(machineId: MachineId): CollectibleDef[] {
  return itemsInMachine(machineId);
}

export function machineProgress(collection: Collection, machineId: MachineId): { owned: number; total: number; complete: boolean } {
  const items = machineLineup(machineId);
  const owned = items.filter((i) => owns(collection, i.id)).length;
  return { owned, total: items.length, complete: items.length > 0 && owned === items.length };
}

export function isMachineComplete(collection: Collection, machineId: MachineId): boolean {
  return machineProgress(collection, machineId).complete;
}

/** "Own N collectibles from machines" (badges): distinct machine items owned, moonlit variants included. */
export function machineCollectiblesOwned(collection: Collection): number {
  let n = 0;
  for (const id of Object.keys(collection)) {
    if (!owns(collection, id)) continue;
    const def = getCollectible(id);
    if (def && isMachineSource(def.source)) n++;
  }
  return n;
}

/**
 * Pets that can have a Moonlit variant (DESIGN §13.6): every owned base pet except Mochi (she is
 * unique, never duplicated, §13.10) and except variants themselves.
 */
export function moonlitEligibleBase(petId: string): boolean {
  if (petId === MOCHI_ID || petId.startsWith(MOONLIT_PREFIX)) return false;
  const def = getCollectible(petId);
  return def?.category === 'pet' && isMachineSource(def.source);
}

/** 'moonlit:<petId>' for every owned eligible base pet, in catalog order. */
export function eligibleMoonlitIds(collection: Collection): string[] {
  return PETS.filter((p) => moonlitEligibleBase(p.id) && owns(collection, p.id)).map((p) => `${MOONLIT_PREFIX}${p.id}`);
}

/** True for a moonlit id whose base pet is owned (so it can be pulled or wished for). */
export function isMoonlitAvailable(collection: Collection, id: string): boolean {
  const base = moonlitBase(id);
  return base !== null && moonlitEligibleBase(base) && owns(collection, base);
}

/* ------------------------------------------------------------------ */
/* Species albums                                                      */
/* ------------------------------------------------------------------ */

export type AlbumDef = (typeof ALBUMS)[number];

/** The pets on an album page: every machine pet of the album's species (Mochi and variants excluded). */
export function albumMembers(album: AlbumDef): PetDef[] {
  const species: readonly string[] = album.species;
  return PETS.filter((p) => species.includes(p.species) && isMachineSource(p.source));
}

export function albumProgress(collection: Collection, album: AlbumDef): { owned: number; total: number; complete: boolean } {
  const members = albumMembers(album);
  const owned = members.filter((p) => owns(collection, p.id)).length;
  return { owned, total: members.length, complete: members.length > 0 && owned === members.length };
}

/* ------------------------------------------------------------------ */
/* Owned things by kind                                                */
/* ------------------------------------------------------------------ */

export function ownedTreats(collection: Collection): TreatDef[] {
  return COLLECTIBLES.filter((c): c is TreatDef => c.category === 'treat' && owns(collection, c.id));
}

export function ownedWearables(collection: Collection, slot?: WearableSlot): WearableDef[] {
  return COLLECTIBLES.filter((c): c is WearableDef => c.category === 'wearable' && owns(collection, c.id) && (slot === undefined || c.slot === slot));
}

/** Owned plant species ids (for the habit editor's plant picker). */
export function ownedPlantSpecies(collection: Collection): string[] {
  return COLLECTIBLES.filter((c) => c.category === 'plant' && owns(collection, c.id)).map((c) => (c.category === 'plant' ? c.plant : ''));
}

export function ownedPots(collection: Collection): string[] {
  return COLLECTIBLES.filter((c) => c.category === 'pot' && owns(collection, c.id)).map((c) => (c.category === 'pot' ? c.pot : ''));
}
