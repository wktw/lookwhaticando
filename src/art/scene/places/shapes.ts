/**
 * Fixed geometry of the places (DESIGN §8.4), in each segment's own room units (100 tall). Every
 * standing part is convex, so the offline generator precomputes its shade crescents (../crescent).
 */
import { bowl, ellipse, poly, rrect, trapezoid } from '../crescent/build';
import type { CrescentSpec } from '../crescent/generate';
import { seeded } from '../sill/scenery';

/* ── Saucer Pond: a terracotta saucer of water on the floorboards by the window ────────────── */

export const POND_W = 150;
export const POND = {
  cx: 86,
  cy: 79,
  rim: { rx: 50, ry: 9.6 },
  water: { rx: 45.4, ry: 7.4 },
  /** The saucer's outer wall, seen below the front of the rim. */
  side: bowl(86, 79.6, 49, 12.2),
  pebbles: [ellipse(66, 77.6, 7.4, 4), ellipse(73.6, 76.6, 5.2, 3.3), ellipse(59.4, 77.2, 4.4, 2.8)],
  pad: { cx: 104, cy: 80.6, rx: 10, ry: 3.2 },
  skirting: { top: 57, bottom: 64 },
  curtain: { x0: 0, x1: 17 },
  /** A tall glazed door beside the curtain: the light on the floor comes through it. */
  door: { x0: 22, x1: 132, bottom: 53 },
} as const;

/* ── Cat-grass Tray: a long seed tray of oat grass on an oak bench ──────────────────────────── */

export const GRASS_W = 170;
export const GRASS = {
  tray: trapezoid(15, 155, 66.2, 18, 152, 83, 1.6),
  rim: rrect(13, 63.4, 144, 3.4, 1.6),
  bench: { top: 83, front: 87, bottom: 93 },
  soil: 66,
  print: { x: 124, y: 10, w: 30, h: 26 },
  /** A peg rail on the wall, with a tin watering can and a ball of twine hanging from it. */
  rail: { x0: 18, x1: 84, y: 20 },
  can: {
    body: rrect(26, 31, 15, 11, 1.6),
    shoulder: rrect(27, 29.6, 13, 2.4, 1),
  },
} as const;

/* ── Bookshelf: two shelves of paperbacks, a trailing pothos and a reading lamp ─────────────── */

export const SHELF_W = 150;

export interface Book {
  d: string;
  color: string;
  /** A title band across the spine, if any. */
  band?: string;
}

const SPINES = ['#EFB4C1', '#B5CC9C', '#B3D1E8', '#C8BAE6', '#F2D98A', '#DDA088', '#A9D3C0', '#DDB6DA', '#F7EDE0', '#8C7266', '#F5CDD6', '#D5E3C7'];

/** A row of paperbacks standing on `base` between x0 and x1, some leaning, leaving `gaps` clear. */
function bookRow(x0: number, x1: number, base: number, room: number, seed: number, gaps: readonly (readonly [number, number])[]): Book[] {
  const r = seeded(seed);
  const books: Book[] = [];
  let x = x0;
  while (x < x1 - 2.5) {
    const gap = gaps.find(([a, b]) => x >= a - 0.5 && x < b);
    if (gap) {
      x = gap[1];
      continue;
    }
    const w = 2.6 + r() * 2.6;
    if (x + w > x1) break;
    const h = room * (0.66 + r() * 0.3);
    const color = SPINES[Math.floor(r() * SPINES.length)]!;
    const lean = r() < 0.12 && books.length > 0;
    if (lean) {
      // Leaning on the book before it: a parallelogram tipped to the left.
      const t = 3.2;
      books.push({ d: poly([[x, base], [x + w, base], [x + w - t, base - h], [x - t, base - h + 0.2]]), color });
      x += w + 1.4;
      continue;
    }
    const top = base - h;
    const band = r() < 0.55 ? rrect(x + 0.35, top + h * (0.14 + r() * 0.1), w - 0.7, 1.1, 0.2) : undefined;
    books.push({ d: rrect(x, top, w, h, 0.4), color, band });
    x += w + (r() < 0.2 ? 0.3 : 0.05);
  }
  return books;
}

export const SHELF = {
  x0: 8,
  x1: 142,
  side: 3.6,
  top: 23,
  topBoard: 4,
  mid: 56,
  midBoard: 3.4,
  floor: 86,
  floorBoard: 3,
  plinth: 96,
  upper: bookRow(12.2, 137.6, 56, 26, 5, [[66, 94]]),
  lower: bookRow(12.2, 137.6, 86, 25, 9, [[102, 112]]),
  /** Three paperbacks lying flat in the gap on the upper shelf: a bed at book height. */
  stack: [rrect(69, 52.2, 22, 3.8, 0.5), rrect(70.5, 48.8, 19, 3.4, 0.5), rrect(69.6, 45.6, 20.6, 3.2, 0.5)],
  stackColors: ['#B3D1E8', '#EFB4C1', '#F2D98A'],
  pothosPot: trapezoid(19.5, 35.5, 12.5, 21.5, 33.5, 23, 1),
  lamp: {
    base: ellipse(122, 21.6, 4.6, 1.5),
    stem: rrect(121.4, 8.5, 1.2, 13, 0.4),
    shade: trapezoid(117.2, 126.8, 2.8, 114.4, 129.6, 10.8, 0.8),
    bulb: [122, 9.5] as const,
  },
} as const;

/* ── Balcony Box: outside the glass, a window box on the railing and a shelf of retired plants ── */

export const BALCONY_W = 170;
export const BALCONY = {
  door: 7,
  rail: { top: 38, h: 3, bottom: 62 },
  box: trapezoid(34, 110, 36.5, 35.5, 108.5, 47, 1.2),
  boxLip: rrect(33, 35, 78, 2.6, 1),
  stand: { x0: 128, x1: 162, shelves: [44, 58] as const, foot: 66 },
  standShelves: [rrect(127, 44, 36, 2.6, 0.8), rrect(127, 58, 36, 2.6, 0.8)],
  lantern: { cx: 156, top: 30, body: rrect(152.6, 34.4, 6.8, 9.6, 2.2), cap: rrect(152, 32.2, 8, 2.6, 1) },
} as const;

/* ── The Quilt: a folded patchwork quilt at the end of the bed ──────────────────────────────── */

export const QUILT_W = 160;
export const QUILT = {
  duvet: { top: 64, edge: 84 },
  layers: [rrect(64, 72.6, 72, 7.4, 2.6), rrect(66, 66.4, 69, 6.8, 2.6), rrect(68, 60.8, 65, 6.2, 2.6)],
  window: { cx: 38, top: 8, w: 34, bottom: 44 },
  table: rrect(141, 58, 22, 3, 1),
} as const;

/** Patchwork: rows of squares across each folded layer's front face (seeded). */
export function patches(d: 0 | 1 | 2): { x: number; w: number; color: string }[] {
  const r = seeded(40 + d);
  const colors = ['#EFB4C1', '#F2D98A', '#B5CC9C', '#B3D1E8', '#C8BAE6', '#F7EDE0', '#DDA088', '#F5CDD6'];
  const out: { x: number; w: number; color: string }[] = [];
  const x0 = [64, 66, 68][d]!;
  const x1 = x0 + [72, 69, 65][d]!;
  for (let x = x0 + d * 2.4; x < x1; x += 6.6) out.push({ x, w: 6.6, color: colors[Math.floor(r() * colors.length)]! });
  return out;
}

export const PLACE_CRESCENTS: Record<string, CrescentSpec> = {
  'pond.saucer': { parts: [POND.side], k: 2.6 },
  'pond.pebble0': { parts: [POND.pebbles[0]], k: 1.5 },
  'pond.pebble1': { parts: [POND.pebbles[1]], k: 1.2 },
  'pond.pebble2': { parts: [POND.pebbles[2]], k: 1 },
  'grass.tray': { parts: [GRASS.tray], k: 2.6 },
  'grass.rim': { parts: [GRASS.rim], k: 1.2 },
  'grass.can': { parts: [GRASS.can.body], k: 1.2 },
  'shelf.upper': { parts: SHELF.upper.map((b) => b.d), k: 0.9 },
  'shelf.lower': { parts: SHELF.lower.map((b) => b.d), k: 0.9 },
  'shelf.stack0': { parts: [SHELF.stack[0]], k: 1 },
  'shelf.stack1': { parts: [SHELF.stack[1]], k: 1 },
  'shelf.stack2': { parts: [SHELF.stack[2]], k: 1 },
  'shelf.pothosPot': { parts: [SHELF.pothosPot], k: 1.6 },
  'shelf.lampShade': { parts: [SHELF.lamp.shade], k: 1.3 },
  'balcony.box': { parts: [BALCONY.box], k: 2.2 },
  'balcony.shelves': { parts: BALCONY.standShelves, k: 1 },
  'balcony.lantern': { parts: [BALCONY.lantern.body], k: 1.4 },
  'quilt.layer0': { parts: [QUILT.layers[0]], k: 2 },
  'quilt.layer1': { parts: [QUILT.layers[1]], k: 2 },
  'quilt.layer2': { parts: [QUILT.layers[2]], k: 2 },
};
