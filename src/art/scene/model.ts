/**
 * What a scene is given: the habit pots, the pets who live here and the decor she has placed.
 * Plain data, so screens, the gallery and tests describe a Shelf the same way.
 */
import type { Outfit } from '@/state/types';
import type { Personality, PlaceId, PlantSpeciesId, PotId, Species } from '@/catalog/types';
import { getCollectible } from '@/catalog/collectibles';
import type { PetPose } from './actors/adapters';

/** A habit's plant on the sill. */
export interface SillPot {
  habitId: string;
  /** The habit's name, for the plant tag. */
  name?: string;
  /** An italic line on the tag ("after coffee"). */
  note?: string;
  species: PlantSpeciesId;
  stage: number;
  progress?: number;
  blooms?: number;
  pot: PotId;
  /** Watered today: the soil is damp (DESIGN §14.2). */
  damp?: boolean;
  /** Bumps to replay the watering reaction. */
  pulse?: number;
}

/** A pet out on the Shelf. */
export interface ShelfPet {
  /** Unique key (the pet's state id); defaults to `petId`. */
  key?: string;
  /** Collectible id for the look, e.g. 'pet-cat-calico' or 'moonlit:pet-cat-calico'. */
  petId: string;
  name?: string;
  personality?: Personality;
  outfit?: Outfit;
  /** The habit it keeps company: it lives in that plant (DESIGN §14.1). */
  home?: string;
  /** Which place it is out in (default: the Sill). */
  place?: PlaceId;
}

/** A decor item placed on the Shelf. */
export interface ShelfDecor {
  key?: string;
  itemId: string;
  place?: PlaceId;
  /** Units from the place's left edge; omitted = a free default spot. */
  x?: number;
  /** 0 back … 1 front of the surface. */
  depth?: number;
  flip?: boolean;
}

/** Where and how a pet is shown right now. */
export interface PetSpot {
  x: number;
  depth: number;
  /** Feet baseline in units (a perch such as a pot rim sits above the surface). */
  y: number;
  pose: PetPose;
  facing: 'left' | 'right';
  /** Asleep or awake: drives the expression. */
  asleep: boolean;
  /** Standing on something other than the floor of the place (a pot rim, a bed, another pet, the water). */
  perch?: 'rim' | 'bed' | 'back' | 'shelf' | 'water';
  /** Which perch, when on one. */
  perchId?: string;
  /** Stretched up and leaning the way it faces (a rabbit reaching to sniff a leaf). */
  reach?: boolean;
  /** Paint order override (perches sit just above what they sit on). */
  z?: number;
}

export function petKey(p: ShelfPet): string {
  return p.key ?? p.petId;
}

export function speciesOf(petId: string): Species {
  const base = petId.startsWith('moonlit:') ? petId.slice('moonlit:'.length) : petId;
  const def = getCollectible(base);
  if (def && def.category === 'pet') return def.species;
  const m = /^pet-([a-z]+)-/.exec(base);
  const guess = m?.[1] as Species | undefined;
  return guess && ['cat', 'cow', 'dog', 'bunny', 'frog', 'bear', 'hamster', 'duck'].includes(guess) ? guess : 'cat';
}
