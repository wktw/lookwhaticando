/**
 * ROOM UNITS: the one coordinate system of the Shelf. A scene is 100 units tall; 1 unit is 1% of its
 * height (`1cqh` inside the scene), so every scene scales with its height and scrolls sideways.
 *
 *   x  0 … width, left to right, in units.
 *   depth  0 = against the window (the back of the sill) … 1 = the sill's front edge.
 *
 * Things standing on a surface are placed by their feet: `baseline(depth)` is the y of the feet,
 * nearer things are drawn a little larger and in front (`depthScale`, `depthZ`).
 */
import type { PotId } from '@/catalog/types';
import { BASELINE } from '@/art/pets/rig';
import { POT_GEOMETRY } from '@/art/plants/geometry';

/** The horizontal bands of a room segment, top to bottom, in units. */
export interface RoomRows {
  /** Bottom of the window glass (top of the window's bottom rail). */
  glassBottom: number;
  /** Back edge of the sill's top surface, against the window rail. */
  sillBack: number;
  /** Front edge of the sill's top surface. */
  sillFront: number;
  /** Bottom of the sill's front face; the wall continues below. */
  nosing: number;
}

/** How big things are in a scene, in units: art canvases are square. */
export interface RoomScale {
  /** A potted plant's canvas edge (PlantArt: the pot's foot is on y 95 of its 100 canvas, see `potMetrics`). */
  pot: number;
  /** A pet's canvas edge (a sitting cat on it is a decor's 16 "pet units" tall). */
  pet: number;
  jar: number;
  lamp: number;
}

/** A sitting cat is this many decor units tall (DecorEntry.size is measured in them). */
export const PET_UNITS = 16;

/** The pets stand on the rig's feet line (y 94 of their 100 canvas). */
export const PET_BASELINE = BASELINE;
/** Standing decor rests on y 92 of its canvas (the items module's contact line). */
export const DECOR_BASELINE = 92;

/**
 * A pot on the PlantArt canvas, from the plants module's own geometry (`POT_GEOMETRY`): its rim (where a
 * resident sits), its soil line, its foot, and its widths as shares of the canvas (for cast shadows and perches).
 */
export interface PotMetrics {
  /** y of the rim's top, and its ends (canvas units). */
  rim: { y: number; x0: number; x1: number };
  /** The soil line (y) and the opening's half-width. */
  mouth: { y: number; hw: number };
  /** The line the pot stands on (y 95 for every pot). */
  foot: number;
  /** Rim and foot widths as shares of the canvas edge. */
  rimW: number;
  footW: number;
  /** The pot's height from foot to rim, as a share of the canvas edge. */
  height: number;
}

export function potMetrics(pot: PotId): PotMetrics {
  const g = POT_GEOMETRY[pot] ?? POT_GEOMETRY.terracotta;
  return {
    rim: g.rim,
    mouth: { y: g.mouth.y, hw: g.mouth.hw },
    foot: g.foot.y,
    rimW: (g.rim.x1 - g.rim.x0) / 100,
    footW: (g.foot.hw * 2) / 100,
    height: (g.foot.y - g.rim.y) / 100,
  };
}

const BACK_SCALE = 0.9;

export function baseline(rows: RoomRows, depth: number): number {
  const d = clamp01(depth);
  return rows.sillBack + 1.5 + d * (rows.sillFront - rows.sillBack - 3);
}

/** The depth of a baseline y (inverse of `baseline`). */
export function depthOf(rows: RoomRows, y: number): number {
  return clamp01((y - rows.sillBack - 1.5) / (rows.sillFront - rows.sillBack - 3));
}

export function depthScale(depth: number): number {
  return BACK_SCALE + (1 - BACK_SCALE) * clamp01(depth);
}

/** Paint order on a surface: flat things lie under standing things, nearer things stand in front. */
export function depthZ(depth: number, layer: 'flat' | 'stand' | 'perch' = 'stand'): number {
  const base = 100 + Math.round(clamp01(depth) * 200) * 2;
  return layer === 'flat' ? base - 60 : layer === 'perch' ? base + 1 : base;
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : Number.isFinite(n) ? n : 0;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Sort key for anything standing in a scene: back to front, then left to right. */
export function byDepth<T extends { depth: number; x: number }>(a: T, b: T): number {
  return a.depth - b.depth || a.x - b.x;
}
