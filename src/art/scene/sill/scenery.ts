/**
 * The view through the glass, built once per window size: rooftops and street trees across the road,
 * a few calm clouds, and at night a moon and at most twelve stars. Every group is one path, so a long
 * window costs a handful of nodes. Deterministic: the same window always shows the same street.
 */
import { rrect } from '../crescent/build';

export interface Street {
  houses: string;
  roofs: string;
  trees: string;
  treesDeep: string;
  /** Blossom clumps (spring), snow on the roofs (winter) or nothing. */
  accents: string;
  snow: string;
  windows: string;
}

export interface Sky {
  clouds: string;
  stars: string;
  moon: { x: number; y: number; r: number };
}

/** Deterministic PRNG (mulberry32): scattered details never move between renders. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => +n.toFixed(2);
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

const streets = new Map<string, Street>();

/** The street across the road, along the bottom of the glass (y up to `bottom`). */
export function streetFor(x0: number, x1: number, bottom: number, seed = 7): Street {
  const key = `${f(x0)}|${f(x1)}|${f(bottom)}|${seed}`;
  const hit = streets.get(key);
  if (hit) return hit;
  const r = seeded(seed);
  const s: Record<keyof Street, string[]> = { houses: [], roofs: [], trees: [], treesDeep: [], accents: [], snow: [], windows: [] };
  const unit = bottom / 60;
  let x = x0 - 8;
  let i = 0;
  while (x < x1 + 8) {
    const w = (16 + r() * 16) * unit;
    const tall = (7 + r() * 8) * unit;
    const top = bottom - tall;
    const gable = r() < 0.6;
    s.houses.push(rrect(x, top, w, tall + 2, 0));
    if (gable) {
      const peak = top - (4 + r() * 3) * unit;
      s.roofs.push(`M${f(x - 1)} ${f(top + 0.6)}L${f(x + w / 2)} ${f(peak)}L${f(x + w + 1)} ${f(top + 0.6)}Z`);
      s.snow.push(`M${f(x - 1)} ${f(top + 0.6)}L${f(x + w / 2)} ${f(peak)}L${f(x + w + 1)} ${f(top + 0.6)}L${f(x + w - 1)} ${f(top + 0.6)}L${f(x + w / 2)} ${f(peak + 1.4 * unit)}L${f(x + 1)} ${f(top + 0.6)}Z`);
    } else {
      s.roofs.push(rrect(x - 0.6, top - 1.4 * unit, w + 1.2, 1.6 * unit, 0));
      s.snow.push(rrect(x - 0.6, top - 1.8 * unit, w + 1.2, 0.8 * unit, 0.4));
    }
    // Two rows of small windows, a few lit after dark.
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < Math.floor(w / (6 * unit)); col++) {
        if (r() < 0.45) s.windows.push(rrect(x + (2.2 + col * 6) * unit, top + (2.4 + row * 5) * unit, 1.6 * unit, 2.2 * unit, 0.3));
      }
    }
    x += w;
    // A street tree between some houses.
    if (r() < 0.55) {
      const cx = x + (r() - 0.5) * 4 * unit;
      const cr = (4.6 + r() * 3) * unit;
      const cy = bottom - cr * 0.9;
      s.treesDeep.push(circle(cx + cr * 0.12, cy + cr * 0.1, cr));
      s.trees.push(circle(cx, cy, cr * 0.92));
      s.treesDeep.push(circle(cx + cr * 0.9, bottom - cr * 0.5, cr * 0.62));
      s.trees.push(circle(cx + cr * 0.84, bottom - cr * 0.56, cr * 0.56));
      if (i % 2 === 0) s.accents.push(circle(cx - cr * 0.3, cy - cr * 0.2, cr * 0.28), circle(cx + cr * 0.35, cy + cr * 0.05, cr * 0.22), circle(cx - cr * 0.05, cy + cr * 0.42, cr * 0.2));
    }
    x += (1 + r() * 5) * unit;
    i++;
  }
  const out: Street = {
    houses: s.houses.join(''),
    roofs: s.roofs.join(''),
    trees: s.trees.join(''),
    treesDeep: s.treesDeep.join(''),
    accents: s.accents.join(''),
    snow: s.snow.join(''),
    windows: s.windows.join(''),
  };
  streets.set(key, out);
  return out;
}

const skies = new Map<string, Sky>();

/**
 * Clouds by day; by night a moon and at most twelve small stars. `moonX` puts the moon where the
 * scene will be looking after dark (a pane or two left of the lamp, where the Shelf opens at night);
 * the stars gather over the panes around it rather than thinning out along a long window.
 */
export function skyFor(x0: number, x1: number, bottom: number, seed = 3, moonX?: number): Sky {
  const key = `${f(x0)}|${f(x1)}|${f(bottom)}|${seed}|${moonX == null ? '' : f(moonX)}`;
  const hit = skies.get(key);
  if (hit) return hit;
  const r = seeded(seed);
  const span = x1 - x0;
  const unit = bottom / 60;
  const clouds: string[] = [];
  const count = Math.max(2, Math.round(span / 90));
  for (let i = 0; i < count; i++) {
    const w = (16 + r() * 14) * unit;
    const x = x0 + ((i + 0.2 + r() * 0.6) / count) * span - w / 2;
    const y = (6 + r() * 18) * unit;
    const h = 4.2 * unit;
    clouds.push(rrect(x, y, w, h, h / 2));
    clouds.push(rrect(x + w * (0.18 + r() * 0.2), y - h * 0.7, w * 0.42, h * 1.1, h * 0.55));
  }
  const mr = 4.4 * unit;
  const mx = moonX == null ? x0 + span * 0.72 : Math.min(x1 - mr * 2, Math.max(x0 + mr * 2, moonX));
  const moon = { x: mx, y: 13 * unit, r: mr };
  // Stars over the panes around the moon: most to its left (toward the rest of the view), a few right.
  const lo = moonX == null ? x0 + 4 : Math.max(x0 + 3, mx - 84);
  const hi = moonX == null ? x1 - 4 : Math.min(x1 - 3, mx + 36);
  const stars: string[] = [];
  const nStars = Math.min(12, Math.max(5, Math.round((hi - lo) / 10)));
  for (let tries = 0; stars.length < nStars && tries < 300; tries++) {
    const sx = lo + r() * (hi - lo);
    const sy = (3 + r() * 30) * unit;
    if (Math.hypot(sx - moon.x, sy - moon.y) < moon.r * 2.6) continue;
    stars.push(circle(sx, sy, (0.4 + r() * 0.32) * unit));
  }
  const out = { clouds: clouds.join(''), stars: stars.join(''), moon };
  skies.set(key, out);
  return out;
}

/** How many stars a sky shows (for tests: never more than twelve). */
export function starCount(sky: Sky): number {
  return (sky.stars.match(/M/g) ?? []).length;
}

/* ── The terrace across the road, as seen through the Sill's window ─────────────────────────── */

/** How many facade paints a terrace cycles through (OutsidePalette.facades has this many). */
export const FACADE_PAINTS = 4;

export interface Terrace {
  /** One path per facade paint. */
  walls: readonly string[];
  /** The ledge along each roofline. */
  cornices: string;
  /** Window panes: dark by night except the lit ones. */
  panes: string;
  lit: string;
  /** Shop awnings at street level: the ground colour and its stripes. */
  awnings: string;
  stripes: string;
  trees: string;
  treesDeep: string;
  /** Blossom clumps (spring). */
  accents: string;
  /** Snow along the cornices (winter). */
  snow: string;
}

const terraces = new Map<string, Terrace>();

/**
 * Painted terraced houses across a quiet road (E-frames: peach and butter facades, pale panes, a
 * shop's striped awning), their rooflines well below the top of the glass so the sky stays open,
 * and a street tree or two in front. Deterministic per window.
 */
export function terraceFor(x0: number, x1: number, bottom: number, seed = 7): Terrace {
  const key = `${f(x0)}|${f(x1)}|${f(bottom)}|${seed}`;
  const hit = terraces.get(key);
  if (hit) return hit;
  const r = seeded(seed);
  const u = bottom / 60;
  const walls: string[][] = Array.from({ length: FACADE_PAINTS }, () => []);
  const cornices: string[] = [];
  const panes: string[] = [];
  const lit: string[] = [];
  const awnings: string[] = [];
  const stripes: string[] = [];
  const trees: string[] = [];
  const treesDeep: string[] = [];
  const accents: string[] = [];
  const snow: string[] = [];
  let x = x0 - 6 - r() * 20 * u;
  let paint = Math.floor(r() * FACADE_PAINTS);
  let n = 0;
  while (x < x1 + 6) {
    const w = (30 + r() * 18) * u;
    const top = bottom - (20 + r() * 10) * u;
    walls[paint]!.push(rrect(x, top, w + 0.2, bottom - top + 2, 0));
    cornices.push(rrect(x - 0.6 * u, top - 1.2 * u, w + 1.2 * u, 1.8 * u, 0.3 * u));
    snow.push(rrect(x - 0.6 * u, top - 2 * u, w + 1.2 * u, 1 * u, 0.5 * u));
    // Sash windows in a grid, set in from the party walls.
    const cols = Math.max(2, Math.floor((w - 6 * u) / (9 * u)));
    const pitch = (w - 6 * u) / cols;
    const shop = n % 3 === 1;
    const rows = Math.max(1, Math.floor((bottom - top - (shop ? 12 : 5) * u) / (9.5 * u)));
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const px = x + 3 * u + c * pitch + (pitch - 4.2 * u) / 2;
        const py = top + 3.4 * u + row * 9.5 * u;
        (r() < 0.38 ? lit : panes).push(rrect(px, py, 4.2 * u, 6.2 * u, 0.5 * u));
      }
    }
    if (shop) {
      // A corner shop: a striped awning over the street-level window.
      const ay = bottom - 9 * u;
      const ax = x + 2.5 * u;
      const aw = w - 5 * u;
      awnings.push(rrect(ax, ay, aw, 3.6 * u, 0.4 * u), rrect(ax + 1.5 * u, ay + 3.6 * u, aw - 3 * u, 8 * u, 0));
      const band = 2.4 * u;
      for (let sx = ax; sx < ax + aw - band / 2; sx += band * 2) stripes.push(rrect(sx, ay, Math.min(band, ax + aw - sx), 3.6 * u, 0));
    }
    x += w;
    // A street tree on the pavement between some houses, its crown three soft rounds.
    if (r() < 0.5) {
      const cx = x + (r() - 0.5) * 6 * u;
      const cr = (5.6 + r() * 2.4) * u;
      const cy = bottom - cr * 1.5;
      treesDeep.push(circle(cx + cr * 0.55, cy + cr * 0.45, cr * 0.8), circle(cx - cr * 0.6, cy + cr * 0.5, cr * 0.72));
      trees.push(circle(cx, cy, cr), circle(cx - cr * 0.62, cy + cr * 0.34, cr * 0.66));
      treesDeep.push(rrect(cx - 0.5 * u, cy + cr * 0.8, 1 * u, bottom - cy, 0));
      if (n % 2 === 0) accents.push(circle(cx - cr * 0.35, cy - cr * 0.2, cr * 0.2), circle(cx + cr * 0.35, cy + cr * 0.1, cr * 0.16), circle(cx - cr * 0.7, cy + cr * 0.45, cr * 0.15));
    }
    paint = (paint + 1 + Math.floor(r() * (FACADE_PAINTS - 1))) % FACADE_PAINTS;
    n++;
  }
  const out: Terrace = {
    walls: walls.map((w) => w.join('')),
    cornices: cornices.join(''),
    panes: panes.join(''),
    lit: lit.join(''),
    awnings: awnings.join(''),
    stripes: stripes.join(''),
    trees: trees.join(''),
    treesDeep: treesDeep.join(''),
    accents: accents.join(''),
    snow: snow.join(''),
  };
  terraces.set(key, out);
  return out;
}

/* ── A street tree's boughs across the top of the glass: the season, seen from the sill ─────── */

export interface Boughs {
  /** Tapered branches and twigs (filled, never stroked). */
  wood: string;
  /** The canopy: back clumps, then front clumps. */
  leavesDeep: string;
  leaves: string;
  /** Small five-dot blossoms (spring) or turning leaves (autumn), dotted over the canopy. */
  dots: string;
  /** Snow lying along the top of each branch (winter). */
  snow: string;
}

const boughCache = new Map<string, Boughs>();

/** Points along a quadratic from a through c to b. */
function quad(a: readonly [number, number], c: readonly [number, number], b: readonly [number, number], t: number): [number, number] {
  const k = 1 - t;
  return [k * k * a[0] + 2 * k * t * c[0] + t * t * b[0], k * k * a[1] + 2 * k * t * c[1] + t * t * b[1]];
}

/** A branch as a filled taper from width w0 to w1 along a quadratic (and its top edge, for snow). */
function taper(a: readonly [number, number], c: readonly [number, number], b: readonly [number, number], w0: number, w1: number): { body: string; top: string } {
  const n = 10;
  const up: string[] = [];
  const down: string[] = [];
  const cap: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = quad(a, c, b, t);
    const [x2, y2] = quad(a, c, b, Math.min(1, t + 0.01));
    const [x1, y1] = quad(a, c, b, Math.max(0, t - 0.01));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = (w0 + (w1 - w0) * t) / 2;
    // The normal pointing up the glass is the top of the branch.
    const sgn = ny < 0 ? 1 : -1;
    up.push(`${f(x + nx * w * sgn)} ${f(y + ny * w * sgn)}`);
    down.unshift(`${f(x - nx * w * sgn)} ${f(y - ny * w * sgn)}`);
    cap.push(`${f(x + nx * (w + 0.7) * sgn)} ${f(y + ny * (w + 0.7) * sgn)}`);
  }
  const top = `M${up[0]}L${cap.slice(1, -1).join('L')}L${up[up.length - 1]}L${up.slice(1, -1).reverse().join('L')}Z`;
  return { body: `M${up.join('L')}L${down.join('L')}Z`, top };
}

/**
 * A plane tree's boughs reaching in over the top of the glass every so often, so the season is
 * always in view whatever pane the scene opens on: blossom in spring, full leaf in summer, amber in
 * autumn, bare wood with snow along it in winter (painted by the palette; the shapes are the same).
 * Kept to the top third of the glass so the sky and the street stay open, and clear of the moon's
 * patch of sky (`clear`, an x). Deterministic per window.
 */
export function boughsFor(x0: number, x1: number, bottom: number, seed = 11, clear?: number): Boughs {
  const key = `${f(x0)}|${f(x1)}|${f(bottom)}|${seed}|${clear == null ? '' : f(clear)}`;
  const hit = boughCache.get(key);
  if (hit) return hit;
  const r = seeded(seed);
  const u = bottom / 60;
  const out: Record<keyof Boughs, string[]> = { wood: [], leavesDeep: [], leaves: [], dots: [], snow: [] };
  const clump = (cx: number, cy: number, rad: number) => {
    out.leavesDeep.push(circle(cx + rad * 0.3, cy + rad * 0.25, rad * 0.95), circle(cx - rad * 0.75, cy + rad * 0.2, rad * 0.7));
    out.leaves.push(circle(cx, cy, rad * 0.85), circle(cx + rad * 0.8, cy - rad * 0.1, rad * 0.6));
    for (let k = 0; k < 4; k++) {
      const a = r() * Math.PI * 2;
      const d = r() * rad * 0.9;
      const bx = cx + Math.cos(a) * d;
      const by = cy + Math.sin(a) * d * 0.8;
      const pr = (0.42 + r() * 0.2) * u;
      for (let p = 0; p < 5; p++) out.dots.push(circle(bx + Math.cos((p * 2 * Math.PI) / 5) * pr, by + Math.sin((p * 2 * Math.PI) / 5) * pr, pr * 0.72));
    }
  };
  let bx = x0 + (8 + r() * 20) * u;
  let flip = r() < 0.5;
  while (bx < x1 - 6 * u) {
    const dir = flip ? -1 : 1;
    const reach = (30 + r() * 14) * u;
    // Keep the sky clear around the moon (`clear`): a bough there moves on to the next pane.
    const lo = Math.min(bx, bx + dir * (reach + 12 * u));
    const hi = Math.max(bx, bx + dir * (reach + 12 * u));
    if (clear != null && clear > lo - 12 * u && clear < hi + 12 * u) {
      bx = Math.max(bx + 20 * u, clear + 16 * u);
      continue;
    }
    const drop = (12 + r() * 5) * u;
    const a: [number, number] = [bx, -2];
    const b: [number, number] = [bx + dir * reach, drop];
    const c: [number, number] = [bx + dir * reach * 0.2, drop * 0.95];
    const main = taper(a, c, b, 2.6 * u, 0.5 * u);
    out.wood.push(main.body);
    out.snow.push(main.top);
    // Two twigs off the main branch, one up and one down.
    for (const [t, up] of [
      [0.45, true],
      [0.7, false],
    ] as const) {
      const [tx, ty] = quad(a, c, b, t);
      const end: [number, number] = [tx + dir * (8 + r() * 6) * u, ty + (up ? -1 : 1) * (5 + r() * 3) * u];
      const tw = taper([tx, ty], [tx + dir * 3 * u, ty + (up ? -1.4 : 1.4) * u], end, 1.1 * u, 0.3 * u);
      out.wood.push(tw.body);
      if (up) out.snow.push(tw.top);
      clump(end[0], end[1], (4.2 + r() * 1.4) * u);
    }
    for (const t of [0.35, 0.62, 0.95]) {
      const [cx, cy] = quad(a, c, b, t);
      clump(cx + dir * r() * 2 * u, cy - (1 + r() * 2) * u, (5 + r() * 1.6) * u);
    }
    bx += (96 + r() * 50) * u;
    flip = !flip;
  }
  const res: Boughs = { wood: out.wood.join(''), leavesDeep: out.leavesDeep.join(''), leaves: out.leaves.join(''), dots: out.dots.join(''), snow: out.snow.join('') };
  boughCache.set(key, res);
  return res;
}
