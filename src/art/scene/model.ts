/**
 * What a scene is given: the habit pots, the pets who live here and the decor she has placed.
 * Plain data, so screens, the gallery and tests describe a Shelf the same way.
 *
 * Coordinates: a scene lays everything out in room units (see room.ts). The store keeps decor as fractions of its
 * place (`PlacedDecor.x/y`, 0..1); the scene owns the conversion. Pass `decorToScene(placed)` (decor.ts) and the
 * scene resolves the fractions against the place it is drawn in; edits come back as fractions (`EditDecor.onMove`).
 */
import type { KeepsakeKind, Outfit } from '@/state/types';
import type { Personality, PlaceId, PlantSpeciesId, PotId, Species } from '@/catalog/types';
import type { Routine } from '@/domain/routines';
import { getCollectible } from '@/catalog/collectibles';
import type { PlantLookArt } from '@/art/plants/looks';
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
  /** The plant's chosen look from Blooming (DESIGN §14.2); left out: Classic. */
  look?: PlantLookArt;
  /** Flourishes after Evergreen: 0–8 permanent visitors (DESIGN §5.5). */
  flourishes?: number;
  /** The resident's came-home day: a small bow tied round the pot (DESIGN §13). */
  bow?: boolean;
  /**
   * The companion's routine today (DESIGN §14.1): its object stands by the pot (the open book, the mat, the bowl…)
   * and the companion settles on it. Left out on a day without one, which looks exactly like an ordinary day.
   */
  routine?: Routine;
}

/** Earned habits, derived from friendship. No scene observation is persisted. */
export interface FriendshipProfile {
  sunBias: number;
  frontBias: number;
  /** Undefined before L8; null means a regular solo afternoon nap. */
  napWith?: string | null;
  waits?: boolean;
}

/** A pet out on the Shelf. */
export interface ShelfPet {
  /** Unique key (the pet's state id); defaults to `petId`. */
  key?: string;
  /** Collectible id for the look, e.g. 'pet-cat-calico' or 'moonlit:pet-cat-calico'. */
  petId: string;
  name?: string;
  personality?: Personality;
  bond?: FriendshipProfile;
  outfit?: Outfit;
  /** The habit it keeps company: it lives in that plant (DESIGN §14.1). */
  home?: string;
  /** Which place it is out in (default: the Sill; a place that is not open falls back to the Sill). */
  place?: PlaceId;
  /**
   * Its favourite spot (DESIGN §8.2, L4 "claims a favourite spot"), where it goes first when it is free: a pot's rim
   * `'pot:<habitId>'`, a placed decor item `'decor:<placement id>'` (a bed, a box), or a place id (the place it
   * prefers; `place` still says where it is out).
   */
  favouriteSpot?: string;
}

/** A decor item placed on the Shelf. */
export interface ShelfDecor {
  /** The placement id (`PlacedDecor.id`): editing reports it back. */
  key?: string;
  /** A decor collectible id, or a keepsake: `'keepsake:<id>'` with `keepsake` set, or `'keepsake-<kind>'`. */
  itemId: string;
  place?: PlaceId;
  /**
   * Where it stands as the store keeps it: fractions of the place (0..1 across its floor, 0 back … 1 front). The
   * scene resolves them against the place it draws (`decorToScene` fills this in). Wins over `x`/`depth`. On the Sill
   * `x` is a share of the Sill's natural length for its pots (`sillFloor`), the same on any screen and whatever tall
   * decor has lengthened the sill.
   */
  frac?: { x: number; y: number };
  /** Units from the place's left edge; omitted (and no `frac`) = a free default spot. */
  x?: number;
  /** 0 back … 1 front of the surface. */
  depth?: number;
  flip?: boolean;
  /** For a keepsake placed as decor: its kind, which picks its art (DESIGN §14.1). */
  keepsake?: KeepsakeKind;
}

/** How a pet was touched on the Shelf (DESIGN §8.2). */
export type PetGesture = 'tap' | 'stroke' | 'boop' | 'carry';

/**
 * Decor edit mode (DESIGN §9.4): every placed item gets a hit box you can drag, and which is a keyboard button too
 * (Arrow keys move it, F flips it, Delete or Backspace removes it). Positions come back as the store keeps them:
 * fractions of the place (`frac.x` across, `frac.y` back to front).
 */
export interface EditDecor {
  onMove(key: string, frac: { x: number; y: number }, place: PlaceId): void;
  onFlip(key: string): void;
  onRemove(key: string): void;
  /** The item's name for its button ("A paper bookmark"); left out, the catalog name ("Keepsake" for one). */
  label?(key: string): string;
  /** The keyboard hint after the name; left out, "Arrow keys move it, F flips it, Delete removes it." */
  hint?: string;
}

/** Ritual things on the sill (DESIGN §8.2, §13, §14.1), for the Today band and the Sill. */
export interface SillExtras {
  /** The Cutting, the lifetime gauge: a pothos cutting by the window that grows into a vine framing it. */
  cutting?: { stage: number; overall: number };
  /** Today's found thing (an L6+ pet left it); `seed` picks which. With `onTap` it is a button. */
  found?: { seed: number; label?: string; onTap?: () => void };
  /** A note waiting on the sill, clipped with a paper clip: a real button that opens it. */
  note?: { kind: 'sundayNote' | 'herbarium' | 'anniversary' | 'story'; label?: string; onOpen: () => void };
  /** Her birthday: a tiny cake on the sill. */
  cake?: boolean;
  /** This month's flowers (the Today band): a jam jar by the coin jar with a stem from each habit watered this month. */
  monthJar?: { stems: readonly { habitId: string; plant: PlantSpeciesId }[] };
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
  /**
   * Standing on something other than the floor of the place (a pot rim, beside a cutting's glass, a bed, a routine's
   * object, another pet, the water, or held up in a hand).
   */
  perch?: 'rim' | 'glass' | 'bed' | 'prop' | 'back' | 'shelf' | 'water' | 'held';
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
