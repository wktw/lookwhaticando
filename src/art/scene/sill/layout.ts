/**
 * Where everything stands on the Sill: the window, the habit pots in a row along the back, the coin
 * jar after them, the lamp against the wall on the right, and the sunbeam crossing the sill by the
 * hour (DESIGN §8.4, §9.1, §9.4). Pure math, shared by the scene, the Today band and the tests.
 */
import { clamp, clamp01, type RoomRows, type RoomScale } from '../room';

export interface SillSpec {
  rows: RoomRows;
  scale: RoomScale;
  /** Wall to the left of the window (the Sill hangs a linen curtain there). */
  lead: number;
  /** Wall to the right of the window, where the lamp stands. */
  tail: number;
  /** Centre of the first pot, from the window's left edge. */
  first: number;
  /** Distance between pot centres, and the most it may stretch to fill a wide window. */
  pitch: number;
  maxPitch: number;
  /** Free sill after the coin jar, for pets and decor. */
  roam: number;
  /** Depth of the back row (pots, jar, lamp). */
  backRow: number;
  /** The jar stands in the row after the pots (the Today band pins it at its edge instead). */
  jarInRow: boolean;
  /**
   * The view ends at a fixed edge (the Today band's pinned jamb): space the pots so that, scrolled to
   * the start, the edge falls in a gap between two pots and never slices one.
   */
  wholePots?: boolean;
}

/** The Shelf's Sill: a long painted sill in front of a sash window. */
export const SILL_SPEC: SillSpec = {
  rows: { glassBottom: 60, sillBack: 64, sillFront: 88, nosing: 93 },
  scale: { pot: 56, pet: 26, jar: 36, lamp: 44 },
  lead: 15,
  tail: 40,
  first: 24,
  pitch: 38,
  maxPitch: 38,
  roam: 70,
  backRow: 0.14,
  jarInRow: true,
};

/** The Today band: the nearest stretch of the sill, seen a little closer. */
export const BAND_SPEC: SillSpec = {
  // The top two fifths are window, left clear for the greeting chip and the wallet (DESIGN §9.1).
  rows: { glassBottom: 56, sillBack: 61, sillFront: 90, nosing: 97 },
  scale: { pot: 58, pet: 28, jar: 38, lamp: 44 },
  lead: 0,
  tail: 0,
  first: 24,
  pitch: 38,
  maxPitch: 52,
  roam: 6,
  backRow: 0.72,
  jarInRow: false,
  wholePots: true,
};

/** The Today band's pinned right end (the window's jamb, the jar and the lamp), in units. */
export const BAND_END = { width: 58, jamb: 3.4, jar: 19, lamp: 42 } as const;

/** Up to this many pots in the Today band (DESIGN §9.1); the Sill takes any number. */
export const BAND_MAX_POTS = 6;

export interface WindowSpan {
  x0: number;
  x1: number;
  /** Centres of the sash stiles between panes. */
  stiles: number[];
  /** Height of the meeting rail between the upper and lower sashes (its top edge). */
  rail: number;
}

export interface Placed {
  x: number;
  depth: number;
}

export interface SillLayout {
  spec: SillSpec;
  width: number;
  window: WindowSpan;
  pots: Placed[];
  jar: Placed;
  lamp: Placed;
}

/** Half a potted plant's footprint (pot and its lower leaves), as a share of the pot canvas. */
export const POT_HALF = 0.3;

/**
 * The first pot's offset and a pitch that put the view's right edge (`view` units from the start) in
 * the middle of the gap after the k-th pot, for as many whole pots as fit; null when all fit anyway.
 */
function wholeRow(spec: SillSpec, n: number, view: number): { first: number; pitch: number } | null {
  const half = spec.scale.pot * POT_HALF;
  if (spec.lead + spec.first + (n - 1) * spec.maxPitch + half <= view) return null;
  const lo = Math.max(spec.pitch * 0.92, 2 * half + 4);
  for (let k = n - 1; k >= 1; k--) {
    for (const shift of [0, -4, 4, -8, 8, 12, 16]) {
      const first = spec.first + shift;
      if (first < half + 2) continue;
      const p = (view - spec.lead - first) / (k - 0.5);
      if (p >= lo && p <= spec.maxPitch) return { first, pitch: p };
    }
  }
  return null;
}

/** Whether a pot at x is sliced by a view edge at `edge` (for the Today band's pinned end). */
export function potCut(spec: SillSpec, x: number, edge: number): boolean {
  const half = spec.scale.pot * POT_HALF;
  return x - half < edge && x + half > edge;
}

/** One sash about every this many units. */
const SASH = 70;

/**
 * Lay out a sill for `pots` pots at least `minWidth` units wide (the viewport, in units).
 * With room to spare the pots spread out (up to `maxPitch`), and the rest is free sill.
 */
export function sillLayout(spec: SillSpec, pots: number, minWidth = 0): SillLayout {
  const n = Math.max(0, Math.floor(pots));
  const jarGap = spec.jarInRow ? spec.scale.jar * 0.72 : spec.pitch * 0.5;
  const natural = spec.lead + spec.first + Math.max(0, n - 1) * spec.pitch + jarGap + spec.roam + spec.tail;
  const spare = Math.max(0, minWidth - natural);
  let pitch = n > 1 ? Math.min(spec.maxPitch, spec.pitch + spare / (n - 1 + 0.8)) : spec.pitch;
  let first = spec.first;
  const whole = spec.wholePots && minWidth > 0 && n > 1 ? wholeRow(spec, n, minWidth) : null;
  if (whole) ({ first, pitch } = whole);
  const x0 = spec.lead;
  const potX = (i: number) => x0 + first + i * pitch;
  const jarX = n > 0 ? potX(n - 1) + Math.max(jarGap, pitch * 0.78) : x0 + first;
  const contentRight = spec.jarInRow ? jarX + spec.scale.jar / 2 + spec.roam : (n > 0 ? potX(n - 1) + pitch * 0.5 : x0) + spec.roam;
  const width = Math.max(minWidth, contentRight + spec.tail);
  const x1 = width - spec.tail;
  const panes = Math.max(1, Math.round((x1 - x0) / SASH));
  const stiles = Array.from({ length: panes - 1 }, (_, i) => x0 + ((i + 1) * (x1 - x0)) / panes);
  return {
    spec,
    width,
    window: { x0, x1, stiles, rail: Math.round(spec.rows.glassBottom * 0.28) },
    pots: Array.from({ length: n }, (_, i) => ({ x: potX(i), depth: spec.backRow })),
    jar: { x: jarX, depth: spec.backRow + 0.06 },
    lamp: { x: width - spec.tail * 0.55, depth: spec.backRow * 0.5 },
  };
}

/* ── The sunbeam ─────────────────────────────────────────────────────────────────────────── */

export interface Beam {
  /** The beam's left and right edges along the back of the sill. */
  x0: number;
  x1: number;
  /** How far the beam leans between the back and the front edge of the sill (+ = to the right). */
  slant: number;
  /** The shadow of the window stile inside the beam: its left edge at the back, and its width. */
  bar: { x: number; w: number };
  /** The shadow of the meeting rail inside the beam: depth of its near edge (0…1) and thickness in units. */
  rail: { depth: number; h: number };
}

/** The beam's width along the sill, and how far it leans at most (morning and evening). */
export const BEAM_WIDTH = 64;
const MAX_LEAN = 0.8;

/**
 * The patch of sun on the sill for `sun` 0 (sunrise: far left) … 1 (sunset: far right). It leans
 * away from the sun: to the right in the morning, upright at noon, to the left in the evening.
 */
export function sunbeam(win: WindowSpan, rows: RoomRows, sun: number, width = BEAM_WIDTH): Beam {
  const s = clamp01(sun);
  const w = Math.min(width, win.x1 - win.x0);
  const deep = rows.sillFront - rows.sillBack;
  const slant = (0.5 - s) * 2 * MAX_LEAN * deep;
  // Keep the whole patch on the window's stretch of sill, front edge included.
  const lo = win.x0 + Math.max(0, -slant);
  const hi = win.x1 - w - Math.max(0, slant);
  const x0 = hi > lo ? lo + (hi - lo) * s : (win.x0 + win.x1 - w) / 2;
  return {
    x0,
    x1: x0 + w,
    slant,
    bar: { x: x0 + w * 0.5 - 1.2, w: 2.4 },
    rail: { depth: 0.3, h: 2.2 },
  };
}

/** The beam's four corners, back-left first, clockwise (for drawing and for "is it in the sun"). */
export function beamQuad(beam: Beam, rows: RoomRows): [number, number][] {
  return [
    [beam.x0, rows.sillBack],
    [beam.x1, rows.sillBack],
    [beam.x1 + beam.slant, rows.sillFront],
    [beam.x0 + beam.slant, rows.sillFront],
  ];
}

/** Whether a point on the sill (x, depth) is in the sun. */
export function inBeam(beam: Beam | null, x: number, depth: number): boolean {
  if (!beam) return false;
  const lean = beam.slant * clamp01(depth);
  return x >= beam.x0 + lean && x <= beam.x1 + lean;
}

/**
 * How a cast shadow falls in the sun, per unit of an object's height: across (dx, + = right) and
 * toward the front of the sill (dy). Low sun throws long sideways shadows; noon throws short ones.
 */
export function castVector(sun: number): readonly [number, number] {
  const off = 0.5 - clamp01(sun);
  return [off * 1.7, clamp(0.2 + Math.abs(off) * 0.24, 0.2, 0.32)];
}
