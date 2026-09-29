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
import { baseline, clamp, depthZ, type RoomRows } from './room';
import { inBeam, type Beam } from './sill/layout';
import { seeded } from './sill/scenery';

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
  kind: 'rim' | 'shelf' | 'bed' | 'water';
  /** Species drawn to it (a frog to the lily pad, ducks to the water). Empty: anyone. */
  likes?: readonly Species[];
  /** The pose it asks for (floating is a loaf; a shelf top is anything). */
  pose?: PetPose;
}

/** Something standing on the ground that pets walk around. */
export interface Obstacle {
  x0: number;
  x1: number;
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
  const perch = p.kind === 'rim' ? 'rim' : p.kind === 'bed' ? 'bed' : p.kind === 'water' ? 'water' : 'shelf';
  return { x: p.x + dx, depth: p.depth, y: p.y, pose: p.pose && !asleep ? p.pose : pose, facing, asleep, perch, perchId: p.id, z: p.z + 1 };
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

/** Everyone's spot for this moment, deterministic for the same pets and ground. */
export function arrangePets(g: Ground, pets: readonly ShelfPet[], m: Moment): Map<string, PetSpot> {
  const out = new Map<string, PetSpot>();
  const routine = m.light.night ? routineAt(m.hour) : 'day';
  const taken: number[] = [];
  const perched = new Set<string>();
  const mid = (g.x0 + g.x1) / 2;

  // Residents first: on their own pot's rim (awake in a loaf, curled up at night).
  for (const p of pets) {
    const key = petKey(p);
    const rim = p.home ? g.perches.find((q) => q.owner === p.home && q.kind === 'rim') : undefined;
    if (!rim) continue;
    const sp = speciesOf(p.petId);
    const asleep = routine === 'sleep';
    out.set(key, perchSpot(rim, asleep ? 'sleep' : REST_POSE[sp], asleep, rim.x > mid ? 'left' : 'right'));
    perched.add(rim.id);
  }

  // Then anyone drawn to a particular perch (a frog to the lily pad) takes it while it is free.
  for (const p of pets) {
    const key = petKey(p);
    if (out.has(key)) continue;
    const sp = speciesOf(p.petId);
    const liked = g.perches.find((q) => q.kind !== 'rim' && q.likes?.includes(sp) && !perched.has(q.id));
    if (!liked) continue;
    const asleep = routine === 'sleep';
    out.set(key, perchSpot(liked, asleep ? 'sleep' : REST_POSE[sp], asleep, liked.x > mid ? 'left' : 'right'));
    perched.add(liked.id);
  }

  // At bedtime, beds first (a matchbox bed, a basket): whoever is nearest in the list gets one.
  if (routine === 'sleep') {
    for (const p of pets) {
      const key = petKey(p);
      if (out.has(key)) continue;
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
    let want: number;
    let asleep = false;
    let pose: PetPose;
    if (routine === 'sleep') {
      asleep = true;
      pose = 'sleep';
      want = (g.lampX ?? mid) - g.petSize * (0.6 + i * 0.75);
    } else if (routine === 'lamp') {
      pose = r() < 0.5 ? REST_POSE[sp] : AWAKE_POSE[sp];
      want = (g.lampX ?? mid) - g.petSize * (0.7 + i * 0.8);
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

/** Whether a floor spot is in the sun (for the long shadow). */
export function spotInSun(g: Ground, spot: PetSpot): boolean {
  return !spot.perch && inBeam(g.beam, spot.x, spot.depth);
}
