/**
 * The Sill as a small world: where its pots, jar, lamp and decor stand, the pot rims pets can loaf
 * on, the beds they can sleep in, the shadows cast in the sun, and the ground pets roam. Pure: the
 * scene draws it, the behaviour walks it, the tests check it.
 *
 * The habit pots are what the Sill is for, so nothing tall stands in front of them: decor taller than
 * 0.6 of a pot keeps to the gaps between pots and the free sill past the jar (the sill grows to make
 * room), and furniture bigger than a pot (a window seat, a reading chair) stands on the Sill at 0.6 of
 * its size. Pots, rims and tags come from the plants module's own geometry (`POT_GEOMETRY`).
 */
import type { PlaceId } from '@/catalog/types';
import type { Light } from '@/art/light';
import { DECOR_ENTRIES, type DecorEntry } from '../decor';
import { decorEntry, fracToScene, type DecorFloor } from '../decorPlace';
import type { ShelfDecor, SillPot } from '../model';
import type { RoomPalette } from '../palette';
import { baseline, clamp, depthScale, depthZ, potMetrics, type PotMetrics } from '../room';
import type { Ground, GroundLight, Obstacle, Perch } from '../arrange';
import { decorSize } from '../fit';
import { lightAtSun } from '../lighting';
import { ROUTINE_ART } from '../objects/routines';
import { foundFor } from '../objects/found';
import type { CastSpec } from './Backdrop';
import { BEAM_WIDTH, castVector, POT_HALF, sillLayout, sunbeam, type Beam, type SillLayout, type SillSpec } from './layout';
import type { Season } from '../time';

export interface PlacedDecor {
  key: string;
  itemId: string;
  /** The art and how it stands (a decor collectible, a keepsake, a routine's object). */
  entry: DecorEntry;
  x: number;
  /** Baseline, or for hanging decor the y it hangs from. */
  y: number;
  depth: number;
  z: number;
  flip: boolean;
  hanging: boolean;
  /** Its canvas edge in units, before the depth scale (× 0.6 already for furniture on the Sill). */
  size: number;
  /** Depth scale. */
  scale: number;
  /** A routine's object, owned by that habit (not the user's decor: it cannot be edited). */
  routine?: string;
  /** The place it stands in, for editing. */
  place: PlaceId;
}

/** Where one habit's pot stands and what it offers (for the pot, its tag and its resident). */
export interface PotPlace {
  habitId: string;
  x: number;
  /** The pot's foot (baseline) in units. */
  y: number;
  depth: number;
  /** The plant canvas edge in units, and its depth scale. */
  size: number;
  scale: number;
  metrics: PotMetrics;
  /** The rim's top in units. */
  rimY: number;
  /** The pot's height (foot to rim) in units. */
  potH: number;
  /** Which way its resident faces; the tag stands on the other side. */
  facing: 'left' | 'right';
  tagSide: 'left' | 'right';
}

export interface SillWorld {
  layout: SillLayout;
  beam: Beam | null;
  casts: CastSpec[];
  cast: readonly [number, number];
  decor: PlacedDecor[];
  pots: PotPlace[];
  ground: Ground;
  /**
   * The floor stored decor fractions (`PlacedDecor.x/y`) are measured against: the Sill's own length for its pots, from
   * the window's left edge, whatever the screen's width and however far the sill grew for tall decor. The same stored
   * spot is then the same place on a phone and a desktop. Adding a habit lengthens it by a pot, and placements stretch
   * with it. Tall decor pushed past it (onto the decor stretch) keeps its spot there until it is moved.
   */
  floor: DecorFloor;
  /** Glowing decor after dark: small warm pools on the sill under each (x, y, radius in units). */
  pools: { x: number; y: number; r: number }[];
  light: Light;
  /** Where the rituals on the sill stand (see `SillRituals`); pets roaming the sill keep off them. */
  rituals: { found?: RitualPlace; note?: RitualPlace; cake?: RitualPlace };
}

/** The rituals standing on the Sill (DESIGN §13, §14.1): today's found thing (by its seed), a waiting note, a birthday cake. */
export interface SillRituals {
  found?: number;
  note?: boolean;
  cake?: boolean;
}

/** Where a ritual object stands: x and depth, and its canvas edge in units (before the depth scale). */
export interface RitualPlace {
  x: number;
  depth: number;
  size: number;
}

/** A resident faces into the room from its rim; its pot's tag stands on the other side (`tagSide`). */
export function rimFacing(x: number, mid: number): 'left' | 'right' {
  return x > mid ? 'left' : 'right';
}

/** A plant's rough height above its pot, by stage (share of the plant canvas). */
const CROWN = [0.2, 0.22, 0.2, 0.28, 0.34, 0.4, 0.46, 0.5];

/**
 * How far a resident sits from the middle of its rim, toward the side it faces, as a share of the rim's width: off
 * the plant's stems, clear of its tag (DESIGN §9.1: the plant stays the subject).
 */
export const RIM_SEAT = 0.5;

/** Furniture bigger than a pot stands on the Sill at this share of its size. */
export const SILL_BIG_SCALE = 0.6;

/** Decor no taller than this share of a pot may stand in front of it (at the sill's front edge). */
export const SHORT_DECOR = 0.6;

/** Depth band decor stands in on the Sill (back … front). */
const DECOR_D: readonly [number, number] = [0.3, 1];

/** A drawing's height on its canvas, as a share (decor stands on y 92; most reach up to about y 10–30). */
const DRAWN_H = 0.78;

/**
 * How long the patch of sun is by season: the winter sun is low and throws a long patch deep into
 * the room, the summer sun is high and throws a short one (after the day lengths in `@/art/light`).
 */
export const BEAM_BY_SEASON: Record<Season, number> = { spring: 1, summer: 0.84, autumn: 1.14, winter: 1.34 };

/** The x range [x0, x1] of anything standing, for keeping tall decor off the pots. */
type Span = readonly [number, number];

const overlaps = (a: Span, b: Span) => a[0] < b[1] && b[0] < a[1];

/** The nearest x to `want` where [x-hw, x+hw] clears every span and stays within [lo, hi]; null if none. */
export function clearX(want: number, hw: number, blocked: readonly Span[], lo: number, hi: number): number | null {
  const ok = (x: number) => x - hw >= lo - 1e-6 && x + hw <= hi + 1e-6 && blocked.every((b) => !overlaps([x - hw, x + hw], b));
  if (ok(want)) return want;
  // Candidates: both sides of every blocked span, and the ends.
  const cands = [lo + hw, hi - hw, ...blocked.flatMap(([a, b]) => [a - hw - 0.01, b + hw + 0.01])].filter(ok);
  if (!cands.length) return null;
  return cands.reduce((best, x) => (Math.abs(x - want) < Math.abs(best - want) ? x : best));
}

/** Whether a decor item is too tall to stand in front of a pot `potH` units tall. */
export function tallDecor(entry: DecorEntry, size: number, potH: number): boolean {
  return size * DRAWN_H > potH * SHORT_DECOR;
}

/** Total width tall decor needs on a Sill, so the free sill past the jar can grow to hold it. */
function tallDecorWidth(decor: readonly ShelfDecor[], petSize: number, potH: number): number {
  let w = 0;
  for (const d of decor) {
    const entry = decorEntry(d);
    if (!entry || entry.hang) continue;
    const size = decorSize(entry, petSize) * (entry.big ? SILL_BIG_SCALE : 1);
    if (!tallDecor(entry, size, potH)) continue;
    w += ((entry.bounds[1] - entry.bounds[0]) / 100) * size + 3;
  }
  return w;
}

export function sillWorld(spec: SillSpec, pots: readonly SillPot[], decor: readonly ShelfDecor[], room: RoomPalette, sun: number, minWidth: number, season: Season = 'spring', rituals: SillRituals = {}): SillWorld {
  const { rows, scale } = spec;
  const typicalPotH = scale.pot * potMetrics('terracotta').height;
  const extraRoam = Math.max(0, tallDecorWidth(decor, scale.pet, typicalPotH) - spec.roam * 0.6);
  const layout = sillLayout(spec, pots.length, minWidth, extraRoam);
  const light = lightAtSun(sun, room.night);
  const long = BEAM_BY_SEASON[season];
  // The sun crosses the sill's own stretch (pots, jar, the free sill before the lamp), not the decor stretch past it.
  const beam = room.beam ? sunbeam({ ...layout.window, x1: layout.homeX1 }, rows, sun, BEAM_WIDTH * long) : null;
  const [cx, cy] = castVector(sun);
  const cast = [cx * long, Math.min(0.4, cy * long)] as const;
  const casts: CastSpec[] = [];
  const perches: Perch[] = [];
  const placed: PlacedDecor[] = [];
  const mid = (layout.window.x0 + 2 + layout.width - 4) / 2;
  // The empty pot beside a cutting stands on the shade side; its resident sits on the lit side of the glass.
  const lit = light.from === 'right' ? 1 : -1;
  const blocked: Span[] = [];

  const potPlaces: PotPlace[] = layout.pots.map((p, i) => {
    const pot = pots[i]!;
    const y = baseline(rows, p.depth);
    const s = depthScale(p.depth);
    const size = scale.pot * s;
    const m = potMetrics(pot.pot);
    const potH = m.height * size;
    const rimW = m.rimW * size;
    const stage = Math.max(0, Math.min(7, Math.floor(pot.stage) || 0));
    const facing = rimFacing(p.x, mid);
    const place: PotPlace = { habitId: pot.habitId, x: p.x, y, depth: p.depth, size: scale.pot, scale: s, metrics: m, rimY: y - potH, potH, facing, tagSide: facing === 'right' ? 'left' : 'right' };
    if (stage >= 2) {
      casts.push({ x: p.x, y, foot: size * m.footW, top: rimW, height: potH, crown: { h: potH + CROWN[stage]! * size * 0.5, r: CROWN[stage]! * size * 0.5 } });
      const dir = facing === 'right' ? 1 : -1;
      perches.push({ id: `rim:${pot.habitId}`, owner: pot.habitId, kind: 'rim', x: p.x + dir * rimW * RIM_SEAT, y: y - potH, depth: p.depth, z: depthZ(p.depth), w: rimW * 0.5, facing, span: [p.x - rimW / 2, p.x + rimW / 2] });
      blocked.push([p.x - rimW / 2 - 1.5, p.x + rimW / 2 + 1.5]);
    } else {
      casts.push({ x: p.x, y, foot: size * 0.18, top: size * 0.18, height: size * 0.4 });
      // No rim yet: its resident loafs on the sill beside the glass, on the side away from the empty pot.
      perches.push({ id: `glass:${pot.habitId}`, owner: pot.habitId, kind: 'glass', x: p.x + lit * size * 0.2, y, depth: p.depth, z: depthZ(p.depth) + 1, w: size * 0.2, facing: lit > 0 ? 'left' : 'right' });
      blocked.push([p.x - size * POT_HALF, p.x + size * POT_HALF]);
    }
    // The routine's object stands in front of the pot on its resident's side, and the resident settles on it.
    if (pot.routine && stage >= 2) {
      const entry = ROUTINE_ART[pot.routine];
      const depth = clamp(p.depth + 0.5, 0.5, 0.98);
      const dsize = decorSize(entry, scale.pet);
      const ds = depthScale(depth);
      const dir = facing === 'right' ? 1 : -1;
      const half = ((entry.bounds[1] - entry.bounds[0]) / 200) * dsize * ds;
      const x = p.x + dir * Math.max(rimW * 0.35, half * 0.6);
      const by = baseline(rows, depth);
      const z = depthZ(depth, entry.flat ? 'flat' : 'stand');
      placed.push({ key: `routine:${pot.habitId}`, itemId: `routine-${pot.routine}`, entry, x, y: by, depth, z, flip: dir < 0, hanging: false, size: dsize, scale: ds, routine: pot.habitId, place: 'sill' });
      perches.push(
        entry.nap > 0
          ? { id: `prop:${pot.habitId}`, owner: pot.habitId, kind: 'prop', x, y: by - entry.nap * dsize * ds, depth, z: z + 1, w: half * 1.6, facing }
          : { id: `prop:${pot.habitId}`, owner: pot.habitId, kind: 'prop', x: x + dir * (half + scale.pet * 0.16), y: by, depth, z: depthZ(depth) + 1, w: scale.pet * 0.4, facing: dir > 0 ? 'left' : 'right' },
      );
    }
    return place;
  });
  const jarS = scale.jar * depthScale(layout.jar.depth);
  casts.push({ x: layout.jar.x, y: baseline(rows, layout.jar.depth), foot: jarS * 0.42, top: jarS * 0.4, height: jarS * 0.62 });
  blocked.push([layout.jar.x - jarS * 0.24, layout.jar.x + jarS * 0.24]);
  const lampS = scale.lamp * depthScale(layout.lamp.depth);
  blocked.push([layout.lamp.x - lampS * 0.24, layout.lamp.x + lampS * 0.24]);

  const floor = sillFloor(spec, pots.length);
  placed.push(...placeDecor(layout, decor, blocked, floor, typicalPotH));

  const obstacles: Obstacle[] = [];
  const lights: GroundLight[] = [];
  const pools: SillWorld['pools'] = [];
  for (const d of placed) {
    if (d.hanging) continue;
    const entry = d.entry;
    const size = d.size * d.scale;
    const x0 = d.x + ((entry.bounds[0] - 50) / 100) * size;
    const x1 = d.x + ((entry.bounds[1] - 50) / 100) * size;
    if (entry.glow && room.night) {
      lights.push({ x: d.x, strength: 0.5 });
      pools.push({ x: d.x, y: d.y, r: Math.max(8, size * 0.9) });
    }
    if (d.routine) continue;
    if (entry.nap != null) perches.push({ id: `bed:${d.key}`, kind: 'bed', x: d.x, y: d.y - entry.nap * size, depth: d.depth, z: d.z, w: x1 - x0 });
    else if (!entry.flat) obstacles.push({ x0, x1 });
    if (!entry.flat) casts.push({ x: d.x, y: d.y, foot: (x1 - x0) * 0.8, top: (x1 - x0) * 0.7, height: size * 0.45 });
  }

  const placedRituals = placeRituals(layout, potPlaces, perches, obstacles, rituals, [layout.window.x0 + 2, layout.width - 4]);
  for (const r of Object.values(placedRituals)) obstacles.push({ x0: r.x - r.hw, x1: r.x + r.hw });

  const ground: Ground = {
    rows,
    x0: layout.window.x0 + 2,
    x1: layout.width - 4,
    d0: 0.42,
    d1: 0.96,
    surface: room.sill,
    beam,
    lampX: layout.lamp.x,
    lights,
    perches,
    obstacles,
    petSize: scale.pet,
  };
  const ritualPlaces = Object.fromEntries(Object.entries(placedRituals).map(([k, r]) => [k, { x: r.x, depth: r.depth, size: r.size }]));
  return { layout, beam, casts, cast, decor: placed, pots: potPlaces, ground, floor, pools, light, rituals: ritualPlaces };
}

/** Half the width of a sill ritual's button, as a share of its size (the tap box is the whole square). */
const RITUAL_HALF = 0.5;

/**
 * Where the rituals stand: each keeps to its own spot (the found thing by a pot, the note leaning by the coin jar,
 * the cake past it) unless that would cover a bed, a routine's object or the glass a pet settles by, or tall decor.
 * Then it moves along the sill to the nearest clear stretch. Nothing a pet is sitting in ends up behind a note, at
 * any hour.
 */
function placeRituals(
  layout: SillLayout,
  pots: readonly PotPlace[],
  perches: readonly Perch[],
  obstacles: readonly Obstacle[],
  rituals: SillRituals,
  [lo, hi]: readonly [number, number],
): Record<string, RitualPlace & { hw: number }> {
  const { scale } = layout.spec;
  const pad = scale.pet * 0.3;
  const jarS = scale.jar * depthScale(layout.jar.depth);
  const blocked: Span[] = [...perches.filter((p) => p.kind !== 'rim').map((p): Span => [p.x - p.w / 2 - pad, p.x + p.w / 2 + pad]), ...obstacles.map((o): Span => [o.x0, o.x1])];
  const out: Record<string, RitualPlace & { hw: number }> = {};
  const put = (key: string, want: number, depth: number, size: number, box = size) => {
    const hw = box * depthScale(depth) * RITUAL_HALF;
    const x = clearX(want, hw, blocked, lo, hi) ?? want;
    out[key] = { x, depth, size, hw };
    blocked.push([x - hw, x + hw]);
  };
  if (rituals.found != null) {
    const size = decorSize(foundFor(rituals.found), scale.pet);
    const by = pots.length ? pots[Math.abs(Math.floor(rituals.found)) % pots.length]! : null;
    put('found', (by?.x ?? layout.window.x0 + 30) + 9, 0.97, size, Math.max(size, 12));
  }
  if (rituals.note) put('note', layout.jar.x - jarS * 0.5, 0.7, scale.pet * 0.62);
  if (rituals.cake) put('cake', layout.jar.x + jarS * 0.5 + 8, 0.82, decorSize(DECOR_ENTRIES['decor-birthday-cake'], scale.pet));
  return out;
}

/**
 * The floor a Sill's stored decor fractions are measured against (see `SillWorld.floor`): its natural length for
 * `pots` pots, with no room added for the screen or for tall decor.
 */
export function sillFloor(spec: SillSpec, pots: number): DecorFloor {
  const natural = sillLayout(spec, pots, 0, 0);
  return { x0: natural.window.x0 + 2, x1: natural.width - 4, d0: DECOR_D[0], d1: DECOR_D[1] };
}

/**
 * The user's decor on the Sill: hanging things along the window's meeting rail, standing things where she put them
 * (or spread along the free sill past the jar), then moved just far enough to keep tall things off the pots.
 */
export function placeDecor(layout: SillLayout, decor: readonly ShelfDecor[], blockedIn: readonly Span[] = [], floor?: DecorFloor, potH = layout.spec.scale.pot * potMetrics('terracotta').height): PlacedDecor[] {
  const { rows, scale } = layout.spec;
  const fl = floor ?? sillFloor(layout.spec, layout.pots.length);
  // Tall decor may be moved anywhere along the sill, the decor stretch included.
  const lo = layout.window.x0 + 2;
  const hi = layout.width - 4;
  const blocked: Span[] = [...blockedIn];
  let hangers = 0;
  // Default spots start on the free sill past the jar and run right.
  let next = layout.jar.x + layout.spec.scale.jar * 0.3;
  return decor.flatMap((d, i): PlacedDecor[] => {
    const entry = decorEntry(d);
    if (!entry) return [];
    const key = d.key ?? `${d.itemId}#${i}`;
    if (entry.hang === 'window') {
      const panes = [layout.window.x0, ...layout.window.stiles, layout.window.x1];
      const k = hangers++ % (panes.length - 1);
      const x = d.frac ? fracToScene(fl, d.frac).x : (d.x ?? (panes[k]! + panes[k + 1]!) / 2);
      return [{ key, itemId: d.itemId, entry, x, y: layout.window.rail + 3, depth: 0, z: 20, flip: !!d.flip, hanging: true, size: decorSize(entry, scale.pet), scale: 1, place: 'sill' }];
    }
    const size = decorSize(entry, scale.pet) * (entry.big ? SILL_BIG_SCALE : 1);
    const asked = d.frac ? fracToScene(fl, d.frac) : d.x != null ? { x: d.x, depth: d.depth ?? 0.8 } : null;
    let depth = clamp(asked?.depth ?? (i % 2 === 0 ? 0.74 : 0.9), DECOR_D[0], DECOR_D[1]);
    const hw = ((entry.bounds[1] - entry.bounds[0]) / 200) * size * depthScale(depth);
    let x = asked?.x ?? next + hw;
    if (tallDecor(entry, size * depthScale(depth), potH)) {
      x = clearX(x, hw + 0.5, blocked, lo, hi) ?? x;
      blocked.push([x - hw, x + hw]);
    } else if (blocked.some((b) => overlaps([x - hw, x + hw], b))) {
      // Short things may stand in front of a pot, at the very front of the sill.
      depth = Math.max(depth, 0.94);
    }
    if (!asked) next = x + hw + 2;
    return [{ key, itemId: d.itemId, entry, x, y: baseline(rows, depth), depth, z: depthZ(depth, entry.flat ? 'flat' : 'stand'), flip: !!d.flip, hanging: false, size, scale: depthScale(depth), place: 'sill' }];
  });
}

/** How far left of the lamp the scene centres when it opens after dark (lamp and moon both in view). */
export const NIGHT_OPEN_LEFT_OF_LAMP = 34;

/** The x a scene centres on when it opens "where the light is": the sunbeam by day, near the lamp at night. */
export function lightTarget(world: SillWorld): number {
  const b = world.beam;
  return b ? (b.x0 + b.x1) / 2 + b.slant / 2 : world.layout.lamp.x - NIGHT_OPEN_LEFT_OF_LAMP;
}

/**
 * Where a scene `view` units wide opens (its left edge, in units). By day, centred on the sunbeam. After dark, with the
 * lamp at the right of the view. Either way the last pot stays in frame: on a narrow screen where the light and the
 * pots cannot both fit, the last pot is at the left and the light (the beam, or the lamp's pool, the moon and the pets
 * gathered under it) fills the rest (DESIGN §9.4). The lamp and the sun keep to the sill's own stretch, so on a busy
 * Sill the decor stretch past the lamp is never where it opens.
 */
export function openScroll(world: SillWorld, view: number): number {
  const max = Math.max(0, world.layout.width - view);
  const last = world.pots[world.pots.length - 1];
  const lastLeft = last ? last.x - last.size * last.scale * POT_HALF - 3 : Infinity;
  if (world.beam) return clamp(Math.min(lightTarget(world) - view / 2, lastLeft), 0, max);
  const lampRight = world.layout.lamp.x + world.layout.spec.scale.lamp * 0.3 + 3;
  return clamp(Math.min(lampRight - view, lastLeft), 0, max);
}
