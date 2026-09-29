/**
 * The Sill as a small world: where its pots, jar, lamp and decor stand, the pot rims pets can loaf
 * on, the beds they can sleep in, the shadows cast in the sun, and the ground pets roam. Pure: the
 * scene draws it, the behaviour walks it, the tests check it.
 */
import { DECOR_ENTRIES } from '../decor';
import type { ShelfDecor, SillPot } from '../model';
import type { RoomPalette } from '../palette';
import { baseline, clamp, depthScale, depthZ, PLANT_BASELINE, POT_FOOT_W, POT_RIM, POT_RIM_W } from '../room';
import type { Ground, Obstacle, Perch } from '../arrange';
import { decorSize } from '../fit';
import type { CastSpec } from './Backdrop';
import { BEAM_WIDTH, castVector, sillLayout, sunbeam, type Beam, type SillLayout, type SillSpec } from './layout';
import type { Season } from '../time';

/** Decor pets can sleep in, and how far above the item's baseline they lie (share of its canvas). */
export const NAP_SPOTS: Record<string, number> = {
  'decor-matchbox-bed': 0.1,
  'decor-dog-bed': 0.09,
  'decor-bread-basket': 0.12,
  'decor-cardboard-box': 0.06,
  'decor-odd-mitten': 0.05,
  'decor-hot-water-bottle': 0.12,
  'decor-reading-chair': 0.3,
  'decor-window-seat': 0.28,
  'decor-teacup-bath': 0.14,
};

export interface PlacedDecor {
  key: string;
  itemId: string;
  x: number;
  /** Baseline, or for hanging decor the y it hangs from. */
  y: number;
  depth: number;
  z: number;
  flip: boolean;
  hanging: boolean;
  scale: number;
}

export interface SillWorld {
  layout: SillLayout;
  beam: Beam | null;
  casts: CastSpec[];
  cast: readonly [number, number];
  decor: PlacedDecor[];
  ground: Ground;
}

/** A resident faces into the room from its rim; its pot's tag stands on the other side (`tagSide`). */
export function rimFacing(x: number, mid: number): 'left' | 'right' {
  return x > mid ? 'left' : 'right';
}

/** A plant's rough height above its pot, by stage (share of the plant canvas). */
const CROWN = [0.2, 0.22, 0.2, 0.28, 0.34, 0.4, 0.46, 0.5];

/** Default spots for decor with no position: along the front of the sill, clear of the lamp. */
function defaultSpot(layout: SillLayout, i: number): { x: number; depth: number } {
  const span = layout.window.x1 - layout.window.x0 - 20;
  const step = 41;
  const x = layout.window.x0 + 16 + ((i * step) % Math.max(step, span));
  return { x, depth: i % 2 === 0 ? 0.74 : 0.9 };
}

export function placeDecor(layout: SillLayout, decor: readonly ShelfDecor[]): PlacedDecor[] {
  const { rows, scale } = layout.spec;
  let hangers = 0;
  let standers = 0;
  return decor.flatMap((d, i): PlacedDecor[] => {
    const entry = DECOR_ENTRIES[d.itemId];
    if (!entry) return [];
    const key = d.key ?? `${d.itemId}#${i}`;
    if (entry.hang === 'window') {
      const panes = [layout.window.x0, ...layout.window.stiles, layout.window.x1];
      const k = hangers++ % (panes.length - 1);
      const x = d.x ?? (panes[k]! + panes[k + 1]!) / 2;
      return [{ key, itemId: d.itemId, x, y: layout.window.rail + 3, depth: 0, z: 20, flip: !!d.flip, hanging: true, scale: 1 }];
    }
    const spot = d.x != null ? { x: d.x, depth: d.depth ?? 0.8 } : defaultSpot(layout, standers++);
    const depth = clamp(spot.depth, 0.3, 1);
    return [
      {
        key,
        itemId: d.itemId,
        x: spot.x,
        y: baseline(rows, depth),
        depth,
        z: depthZ(depth, entry.flat ? 'flat' : 'stand'),
        flip: !!d.flip,
        hanging: false,
        scale: depthScale(depth),
      },
    ];
  });
}

/**
 * How long the patch of sun is by season: the winter sun is low and throws a long patch deep into
 * the room, the summer sun is high and throws a short one (after the day lengths in `@/art/light`).
 */
export const BEAM_BY_SEASON: Record<Season, number> = { spring: 1, summer: 0.84, autumn: 1.14, winter: 1.34 };

export function sillWorld(spec: SillSpec, pots: readonly SillPot[], decor: readonly ShelfDecor[], room: RoomPalette, sun: number, minWidth: number, season: Season = 'spring'): SillWorld {
  const layout = sillLayout(spec, pots.length, minWidth);
  const { rows, scale } = layout.spec;
  const long = BEAM_BY_SEASON[season];
  const beam = room.beam ? sunbeam(layout.window, rows, sun, BEAM_WIDTH * long) : null;
  const [cx, cy] = castVector(sun);
  const cast = [cx * long, Math.min(0.4, cy * long)] as const;
  const casts: CastSpec[] = [];
  const perches: Perch[] = [];
  const mid = (layout.window.x0 + 2 + layout.width - 4) / 2;
  layout.pots.forEach((p, i) => {
    const pot = pots[i]!;
    const y = baseline(rows, p.depth);
    const s = depthScale(p.depth);
    const size = scale.pot * s;
    const potH = ((PLANT_BASELINE - POT_RIM.y) / 100) * size;
    const stage = Math.max(0, Math.min(7, Math.floor(pot.stage) || 0));
    if (stage >= 2) {
      casts.push({ x: p.x, y, foot: size * POT_FOOT_W, top: size * POT_RIM_W, height: potH, crown: { h: potH + CROWN[stage]! * size * 0.5, r: CROWN[stage]! * size * 0.5 } });
      perches.push({ id: `rim:${pot.habitId}`, owner: pot.habitId, kind: 'rim', x: p.x, y: y - potH, depth: p.depth, z: depthZ(p.depth), w: size * POT_RIM_W, facing: rimFacing(p.x, mid) });
    } else {
      casts.push({ x: p.x, y, foot: size * 0.18, top: size * 0.18, height: size * 0.4 });
    }
  });
  const jarS = scale.jar * depthScale(layout.jar.depth);
  casts.push({ x: layout.jar.x, y: baseline(rows, layout.jar.depth), foot: jarS * 0.42, top: jarS * 0.4, height: jarS * 0.62 });

  const placed = placeDecor(layout, decor);
  const obstacles: Obstacle[] = [];
  for (const d of placed) {
    if (d.hanging) continue;
    const entry = DECOR_ENTRIES[d.itemId]!;
    const size = decorSize(d.itemId, scale.pet) * d.scale;
    const x0 = d.x + ((entry.bounds[0] - 50) / 100) * size;
    const x1 = d.x + ((entry.bounds[1] - 50) / 100) * size;
    const nap = NAP_SPOTS[d.itemId];
    if (nap != null) perches.push({ id: `bed:${d.key}`, kind: 'bed', x: d.x, y: d.y - nap * size, depth: d.depth, z: d.z, w: x1 - x0 });
    else if (!entry.flat) obstacles.push({ x0, x1 });
    if (!entry.flat) casts.push({ x: d.x, y: d.y, foot: (x1 - x0) * 0.8, top: (x1 - x0) * 0.7, height: size * 0.45 });
  }

  const ground: Ground = {
    rows,
    x0: layout.window.x0 + 2,
    x1: layout.width - 4,
    d0: 0.42,
    d1: 0.96,
    surface: room.sill,
    beam,
    lampX: layout.lamp.x,
    perches,
    obstacles,
    petSize: scale.pet,
  };
  return { layout, beam, casts, cast, decor: placed, ground };
}

/** How far left of the lamp the scene centres when it opens after dark (lamp and moon both in view). */
export const NIGHT_OPEN_LEFT_OF_LAMP = 34;

/** The x a scene centres on when it opens "where the light is": the sunbeam by day, near the lamp at night. */
export function lightTarget(world: SillWorld): number {
  const b = world.beam;
  return b ? (b.x0 + b.x1) / 2 + b.slant / 2 : world.layout.lamp.x - NIGHT_OPEN_LEFT_OF_LAMP;
}
