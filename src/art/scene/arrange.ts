/**
 * Where pets are when nobody is watching them move: residents on their pot rims, sun-lovers in the
 * beam, everyone gathered under the lamp in the evening and asleep after eleven (DESIGN §8.2). The
 * same rules seed the live behaviour, and vignettes can override any spot.
 */
import type { Species } from '@/catalog/types';
import type { Moment } from './time';
import type { PetSpot, ShelfPet } from './model';
import { petKey, speciesOf } from './model';
import type { PetPose } from './actors/adapters';
import { PERSONALITY_BY_ID } from '@/catalog/personalities';
import { baseline, clamp, depthScale, depthZ, type RoomRows } from './room';
import { inBeam, type Beam } from './sill/layout';
import { seeded } from './sill/scenery';
import { reachBehind } from '@/art/pets/world';

/** Somewhere raised a pet can sit: a pot rim, a shelf, a quilt. */
export interface Perch {
  id: string;
  x: number;
  /** Feet baseline in units. */
  y: number;
  depth: number;
  z: number;
  /** Usable width in units. */
  w: number;
  /** The habit whose pot this is (its resident sits here first). */
  owner?: string;
  /**
   * A pot's rim; beside a cutting's glass (no rim yet); the object of a habit's routine (the book, the mat); a shelf;
   * a bed (decor a pet sleeps in); the water.
   */
  kind: 'rim' | 'glass' | 'prop' | 'shelf' | 'bed' | 'water';
  /** Species drawn to it (a frog to the lily pad, ducks to the water). Empty: anyone. */
  likes?: readonly Species[];
  /** The pose it asks for (floating is a loaf; a shelf top is anything). */
  pose?: PetPose;
  /** The way a pet always faces here (a pot rim: head away from the plant tag). */
  facing?: 'left' | 'right';
}

/** Something standing on the ground that pets walk around. */
export interface Obstacle {
  x0: number;
  x1: number;
}

/** A light after dark that pets gather under (the lamp, a jam-jar lantern): x and how strongly it draws them. */
export interface GroundLight {
  x: number;
  strength: number;
}

/** The floor of a place, as the pets see it. */
export interface Ground {
  rows: RoomRows;
  /** Walkable span, in units from the scene's left edge. */
  x0: number;
  x1: number;
  /** Depth band pets roam (0 back … 1 front). */
  d0: number;
  d1: number;
  /** Colour of the bare surface (a long shadow in the beam shows it). */
  surface: string;
  beam: Beam | null;
  /** Where the lamp stands (evening gathering spot). */
  lampX?: number;
  /** Other lights after dark (glowing decor): pets gather under the nearest warm light. */
  lights?: readonly GroundLight[];
  perches: readonly Perch[];
  obstacles: readonly Obstacle[];
  /** Pet canvas edge in units. */
  petSize: number;
}

export const REST_POSE: Record<Species, PetPose> = { cat: 'loaf', cow: 'loaf', dog: 'loaf', bunny: 'loaf', frog: 'sit', bear: 'loaf', hamster: 'loaf', duck: 'loaf' };
export const AWAKE_POSE: Record<Species, PetPose> = { cat: 'sit', cow: 'stand', dog: 'sit', bunny: 'sit', frog: 'sit', bear: 'sit', hamster: 'sit', duck: 'stand' };

/** Evening gathering (20:00–23:00) and sleep (23:00–06:00), by the local clock. */
export function routineAt(hour: number): 'sleep' | 'lamp' | 'day' {
  if (hour >= 23 || hour < 6) return 'sleep';
  if (hour >= 20) return 'lamp';
  return 'day';
}

/** Species awake at night and asleep by day (a hamster: up and about under the lamp, curled up in the sun). */
export const NOCTURNAL: Readonly<Partial<Record<Species, true>>> = { hamster: true };

/**
 * A species' routine now: most follow the clock (`routineAt`) after dark and are about by day; a nocturnal one is
 * active under Lamplight all night and naps through the day.
 */
export function routineFor(species: Species, hour: number, night: boolean): 'sleep' | 'lamp' | 'day' {
  if (NOCTURNAL[species]) return night ? 'lamp' : 'sleep';
  return night ? routineAt(hour) : 'day';
}

/** Where the evening gathering is: under the nearest warm light to `x` (the lamp, or a glowing decor item). */
export function gatherX(g: Ground, x: number): number | undefined {
  const lights: GroundLight[] = [...(g.lampX != null ? [{ x: g.lampX, strength: 1 }] : []), ...(g.lights ?? [])];
  if (!lights.length) return undefined;
  // A light pulls by its strength over distance: a lantern nearby wins over the lamp across the room.
  return lights.reduce((best, l) => (Math.abs(l.x - x) / l.strength < Math.abs(best.x - x) / best.strength ? l : best)).x;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A spot on the ground at (x, depth), facing into the room. */
export function groundSpot(g: Ground, x: number, depth: number, pose: PetPose, asleep: boolean, facing: 'left' | 'right'): PetSpot {
  const d = clamp(depth, g.d0, g.d1);
  return { x, depth: d, y: baseline(g.rows, d), pose, facing, asleep, z: depthZ(d) };
}

export function perchSpot(p: Perch, pose: PetPose, asleep: boolean, facing: 'left' | 'right', dx = 0): PetSpot {
  const perch = p.kind;
  return { x: p.x + dx, depth: p.depth, y: p.y, pose: p.pose && !asleep ? p.pose : pose, facing: p.facing ?? facing, asleep, perch, perchId: p.id, z: p.z + 1 };
}

/** Half a pet's footprint on the ground, in units. */
const reach = (g: Ground) => g.petSize * 0.3;

function free(g: Ground, x: number, taken: readonly number[]): boolean {
  const r = reach(g);
  if (x < g.x0 + r || x > g.x1 - r) return false;
  if (g.obstacles.some((o) => x + r > o.x0 && x - r < o.x1)) return false;
  return taken.every((t) => Math.abs(t - x) > r * 1.7);
}

/** The free x nearest `want`, searching outward; falls back to `want` clamped. */
export function nearestFree(g: Ground, want: number, taken: readonly number[]): number {
  const step = g.petSize * 0.2;
  for (let i = 0; i < 80; i++) {
    for (const sign of [1, -1]) {
      const x = want + sign * i * step;
      if (free(g, x, taken)) return x;
    }
  }
  return clamp(want, g.x0 + reach(g), g.x1 - reach(g));
}

/**
 * Where a pet sits along a pot rim, relative to the perch: a rim perch marks where a loafing cat's middle goes, so a
 * longer pet (a cow, a beagle) slides out over the lip by the extra length behind it and a small one tucks in. Its
 * back edge then meets the plant where a cat's would, and the leaves stay in view (the M1 audit's 40% rule).
 */
export function seatDx(g: Ground, p: Perch, species: Species, pose: PetPose): number {
  if (p.kind !== 'rim') return 0;
  const at = pose === 'sleep' || pose === 'sit' || pose === 'stand' ? pose : 'loaf';
  const extra = (reachBehind(species, at) - reachBehind('cat', 'loaf')) * g.petSize * depthScale(p.depth);
  return (p.facing === 'left' ? -1 : 1) * extra;
}

/** A pet on a perch, seated for its species (see `seatDx`). */
export function seatOn(g: Ground, p: Perch, species: Species, pose: PetPose, asleep: boolean, facing: 'left' | 'right'): PetSpot {
  return perchSpot(p, pose, asleep, facing, seatDx(g, p, species, p.pose && !asleep ? p.pose : pose));
}

/** A resident's own perch: its routine's object when one is out, else its pot's rim (or beside its cutting's glass). */
export function homePerch(g: Ground, habitId: string | undefined): Perch | undefined {
  if (!habitId) return undefined;
  const own = g.perches.filter((q) => q.owner === habitId);
  return own.find((q) => q.kind === 'prop') ?? own.find((q) => q.kind === 'rim') ?? own.find((q) => q.kind === 'glass');
}

/** The perch a favourite spot names ('pot:<habitId>' a rim, 'decor:<key>' a bed), if this ground has it. */
export function favouritePerch(g: Ground, spot: string | undefined): Perch | undefined {
  if (!spot) return undefined;
  if (spot.startsWith('pot:')) {
    const id = spot.slice(4);
    return g.perches.find((q) => q.owner === id && q.kind === 'rim') ?? g.perches.find((q) => q.owner === id && q.kind === 'glass');
  }
  if (spot.startsWith('decor:')) return g.perches.find((q) => q.id === `bed:${spot.slice(6)}`);
  return undefined;
}

/** Everyone's spot for this moment, deterministic for the same pets and ground. */
export function arrangePets(g: Ground, pets: readonly ShelfPet[], m: Moment): Map<string, PetSpot> {
  const out = new Map<string, PetSpot>();
  const taken: number[] = [];
  const perched = new Set<string>();
  const mid = (g.x0 + g.x1) / 2;
  const routineOf = (p: ShelfPet) => routineFor(speciesOf(p.petId), m.hour, m.light.night);

  // Residents first: on their routine's object or their own pot's rim (awake in a loaf, curled up asleep).
  for (const p of pets) {
    const key = petKey(p);
    const home = homePerch(g, p.home);
    if (!home) continue;
    const sp = speciesOf(p.petId);
    const asleep = routineOf(p) === 'sleep';
    out.set(key, seatOn(g, home, sp, asleep ? 'sleep' : REST_POSE[sp], asleep, home.x > mid ? 'left' : 'right'));
    perched.add(home.id);
  }

  // Then favourite spots (DESIGN §8.2, L4), while they are free.
  for (const p of pets) {
    const key = petKey(p);
    if (out.has(key)) continue;
    const fav = favouritePerch(g, p.favouriteSpot);
    if (!fav || perched.has(fav.id)) continue;
    const sp = speciesOf(p.petId);
    const asleep = routineOf(p) === 'sleep';
    out.set(key, seatOn(g, fav, sp, asleep ? 'sleep' : REST_POSE[sp], asleep, fav.x > mid ? 'left' : 'right'));
    perched.add(fav.id);
  }

  // Then anyone drawn to a particular perch (a frog to the lily pad) takes it while it is free.
  for (const p of pets) {
    const key = petKey(p);
    if (out.has(key)) continue;
    const sp = speciesOf(p.petId);
    const liked = g.perches.find((q) => q.kind !== 'rim' && q.likes?.includes(sp) && !perched.has(q.id));
    if (!liked) continue;
    const asleep = routineOf(p) === 'sleep';
    out.set(key, perchSpot(liked, asleep ? 'sleep' : REST_POSE[sp], asleep, liked.x > mid ? 'left' : 'right'));
    perched.add(liked.id);
  }

  // At bedtime, beds first (a matchbox bed, a basket): whoever is nearest in the list gets one.
  {
    for (const p of pets) {
      const key = petKey(p);
      if (out.has(key) || routineOf(p) !== 'sleep') continue;
      const bed = g.perches.find((q) => q.kind === 'bed' && !perched.has(q.id));
      if (!bed) break;
      out.set(key, perchSpot(bed, 'sleep', true, bed.x > mid ? 'left' : 'right'));
      perched.add(bed.id);
    }
  }

  // Then everyone else, on the floor of the place.
  const rest = pets.filter((p) => !out.has(petKey(p)));
  rest.forEach((p, i) => {
    const key = petKey(p);
    const sp = speciesOf(p.petId);
    const r = seeded(hash(key));
    const personality = p.personality ? PERSONALITY_BY_ID.get(p.personality) : undefined;
    const sleepy = (personality?.behavior.nap ?? 2) >= 3;
    const routine = routineOf(p);
    let want: number;
    let asleep = false;
    let pose: PetPose;
    if (routine === 'sleep' && m.light.night) {
      asleep = true;
      pose = 'sleep';
      want = (g.lampX ?? mid) - g.petSize * (0.6 + i * 0.75);
    } else if (routine === 'sleep') {
      // A nocturnal pet asleep by day, somewhere out of the way along the floor.
      asleep = true;
      pose = 'sleep';
      want = g.x0 + ((i + 0.5) / Math.max(1, rest.length)) * (g.x1 - g.x0);
    } else if (routine === 'lamp') {
      pose = r() < 0.5 ? REST_POSE[sp] : AWAKE_POSE[sp];
      want = (gatherX(g, g.x0 + ((i + 0.5) / Math.max(1, rest.length)) * (g.x1 - g.x0)) ?? mid) - g.petSize * (0.7 + (i % 3) * 0.8);
    } else {
      const sunLover = p.personality === 'sunny' || p.personality === 'sleepy' || p.personality === 'dreamy';
      if (g.beam && (sunLover || i === 0)) {
        want = (g.beam.x0 + g.beam.x1) / 2 + g.beam.slant * 0.6 + (r() - 0.5) * 20;
        asleep = sleepy && r() < 0.5;
      } else {
        want = g.x0 + ((i + 0.5 + (r() - 0.5) * 0.5) / Math.max(1, rest.length)) * (g.x1 - g.x0);
      }
      pose = asleep ? 'sleep' : r() < 0.5 ? REST_POSE[sp] : AWAKE_POSE[sp];
    }
    const x = nearestFree(g, want, taken);
    taken.push(x);
    const depth = g.d0 + (0.35 + r() * 0.6) * (g.d1 - g.d0);
    const facing = x < mid ? 'right' : 'left';
    const spot = groundSpot(g, x, depth, pose, asleep, facing);
    out.set(key, { ...spot });
  });
  return out;
}

/**
 * Where a pet's head is, roughly, as a box in units [x0, y0, x1, y1] (y down): the upper part of its
 * silhouette on the side it faces. Used to keep plant tags off faces.
 */
export function headBox(spot: PetSpot, petSize: number): [number, number, number, number] {
  const s = petSize * (spot.perch ? 1 : 0.9 + 0.1 * spot.depth);
  const low = spot.pose === 'sleep' || spot.pose === 'loaf';
  const top = spot.y - (low ? 0.36 : 0.5) * s;
  const bottom = spot.y - (low ? 0.08 : 0.2) * s;
  const [a, b] = spot.facing === 'right' ? [-0.06, 0.28] : [-0.28, 0.06];
  return [spot.x + a * s, top, spot.x + b * s, bottom];
}

/** Whether a floor spot is in the sun (for the long shadow). */
export function spotInSun(g: Ground, spot: PetSpot): boolean {
  return !spot.perch && inBeam(g.beam, spot.x, spot.depth);
}
