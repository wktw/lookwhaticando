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
  /** A shallow tray: a low moulded front under a rolled rim, the lawn level with its lip. */
  tray: trapezoid(15, 155, 73.4, 17, 153, 83, 1.4),
  rim: rrect(13, 71.4, 144, 2.6, 1.3),
  bench: { top: 83, front: 87, bottom: 93 },
  /** The lawn: from the back of the tray (where the tall blades root) to its front lip. */
  soil: 60.6,
  lip: 71.8,
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
  /** The reading lamp on top of the case: the Sill's own table lamp (its foot, and its canvas edge). */
  lamp: { x: 122, y: 22.8, size: 26 },
} as const;

/* ── Balcony Box: outside the glass, a window box on the railing and a shelf of retired plants ── */

export const BALCONY_W = 170;
export const BALCONY = {
  door: 7,
  rail: { top: 38, h: 3, bottom: 62 },
  /** The window box hangs on the inside of the top rail, its lip a little below the rail's top. */
  box: trapezoid(34, 110, 42.4, 35.5, 108.5, 53, 1.2),
  boxLip: rrect(33, 41, 78, 2.6, 1),
  soil: 41.6,
  hooks: [45, 97] as const,
  stand: { x0: 128, x1: 162, shelves: [44, 58] as const, foot: 66 },
  standShelves: [rrect(127, 44, 36, 2.6, 0.8), rrect(127, 58, 36, 2.6, 0.8)],
  lantern: { cx: 156, top: 30, body: rrect(152.6, 34.4, 6.8, 9.6, 2.2), cap: rrect(152, 32.2, 8, 2.6, 1) },
} as const;

/* ── The Quilt: a folded patchwork quilt at the foot of a made bed ──────────────────────────── */

/**
 * A folded layer of quilt seen from the side: a long slab whose left end is the soft round of the
 * fold (radius half its height) and whose right end is tucked square against the footboard.
 */
export function foldSlab(x0: number, y: number, x1: number, h: number, tuck = 1.2): string {
  const q = (v: number) => Math.round(v * 100) / 100;
  const r = h / 2;
  const k = 0.5523 * r;
  const [a, b, c, e] = [q(x0 + r), q(x1 - tuck), q(y + h), q(y + r)];
  return (
    `M${a} ${q(y)}L${b} ${q(y)}Q${q(x1)} ${q(y)} ${q(x1)} ${q(y + tuck)}L${q(x1)} ${q(c - tuck)}Q${q(x1)} ${c} ${b} ${c}` +
    `L${a} ${c}C${q(a - k)} ${c} ${q(x0)} ${q(e + k)} ${q(x0)} ${e}C${q(x0)} ${q(e - k)} ${q(a - k)} ${q(y)} ${a} ${q(y)}Z`
  );
}

export interface QuiltLayer {
  x0: number;
  x1: number;
  y: number;
  h: number;
  /** The fabric of the fold's round end (the quilt's backing), and where the patchwork starts. */
  back: string;
  offset: number;
}

const QUILT_LAYERS: readonly QuiltLayer[] = [
  { x0: 64, x1: 134, y: 70.4, h: 7.6, back: '#EFB4C1', offset: 0 },
  { x0: 68, x1: 134, y: 63.4, h: 7.2, back: '#B3D1E8', offset: 3.3 },
  { x0: 72.5, x1: 134, y: 56.8, h: 6.8, back: '#F2D98A', offset: 1.4 },
];

export const QUILT_W = 160;
export const QUILT = {
  /** The bed's top (the sheet) from its back edge to its front edge, and the sheet's hem. */
  duvet: { top: 62, edge: 78, hem: 84 },
  bed: { x0: 7, x1: 137 },
  mattress: rrect(8, 83, 128, 9, 1.2),
  rail: rrect(6, 91.6, 132, 3.4, 0.8),
  headboard: rrect(1.5, 33, 8.5, 64, 3),
  footboard: rrect(135.5, 47, 7.5, 50, 2.6),
  knob: ellipse(139.25, 46.2, 3.2, 2.2),
  pillow: rrect(12, 50.5, 30, 13, 6),
  layers: QUILT_LAYERS,
  slabs: QUILT_LAYERS.map((l) => foldSlab(l.x0, l.y, l.x1, l.h)),
  window: { cx: 44, top: 8, w: 30, bottom: 42 },
  table: rrect(145, 58, 15, 3, 1),
} as const;

/** Patchwork across each layer's straight run, rows offset like real piecing (seeded colours). */
export function patches(d: 0 | 1 | 2): { x: number; w: number; color: string }[] {
  const r = seeded(40 + d);
  const colors = ['#EFB4C1', '#F2D98A', '#B5CC9C', '#B3D1E8', '#C8BAE6', '#F7EDE0', '#DDA088', '#F5CDD6'];
  const l = QUILT_LAYERS[d]!;
  const start = l.x0 + l.h / 2;
  const end = l.x1 - 1.2;
  const out: { x: number; w: number; color: string }[] = [];
  let prev = '';
  for (let x = start - l.offset; x < end; x += 6.6) {
    let color = colors[Math.floor(r() * colors.length)]!;
    if (color === prev) color = colors[(colors.indexOf(color) + 3) % colors.length]!;
    prev = color;
    const a = Math.max(x, start);
    const b = Math.min(x + 6.6, end);
    if (b - a > 0.4) out.push({ x: a, w: b - a, color });
  }
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
  'balcony.box': { parts: [BALCONY.box], k: 2.2 },
  'balcony.shelves': { parts: BALCONY.standShelves, k: 1 },
  'balcony.lantern': { parts: [BALCONY.lantern.body], k: 1.4 },
  'quilt.layer0': { parts: [QUILT.slabs[0]!], k: 1.8 },
  'quilt.layer1': { parts: [QUILT.slabs[1]!], k: 1.8 },
  'quilt.layer2': { parts: [QUILT.slabs[2]!], k: 1.8 },
  'quilt.pillow': { parts: [QUILT.pillow], k: 2.2 },
  'quilt.headboard': { parts: [QUILT.headboard], k: 1.6 },
  'quilt.footboard': { parts: [QUILT.footboard], k: 1.6 },
  'quilt.mattress': { parts: [QUILT.mattress], k: 1.4 },
};
