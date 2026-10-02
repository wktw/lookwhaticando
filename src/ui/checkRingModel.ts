/**
 * The water-fill check ring's geometry and timing (DESIGN §9.1), kept pure so the Today screen,
 * the gallery and the tests share one source of truth.
 */

export type CheckRingState = 'empty' | 'done' | 'rest' | 'tiny';

/** How long each part of the ring's own motion takes (ms). Reduced motion makes all of it instant. */
export const CHECK_RING_MS = {
  /** Water rises to its new level. */
  fill: 240,
  /** The hairline check starts drawing once the water has risen. */
  checkDelay: 240,
  check: 180,
  /** Unchecking: the check lifts first, then the water drains. */
  uncheck: 100,
  drain: 200,
  drainDelay: 60,
} as const;

/**
 * The whole check-in choreography, in ms from the tap (DESIGN §9.1). It never blocks the next
 * tap and is over by `total` (≤ 700 ms). The Today screen schedules the band and the toast from
 * these; the ring schedules itself.
 */
export const CHECKIN_CHOREOGRAPHY = {
  /** The ring fills like water rising in a glass. */
  ringFill: 0,
  /** A hairline check draws in the ring. */
  check: CHECK_RING_MS.checkDelay,
  /** In the band, a thin stream of water pours onto that pot. */
  pour: 200,
  /** A rising water-drop chime, as the water tops out. */
  chime: 220,
  /** The pot takes one growth step (and its soil darkens). */
  growth: 360,
  /** Its resident reacts: an ear flick, a look up. */
  resident: 400,
  /** One brass coin arcs into the jar; the counter rolls once per burst. */
  coin: 440,
  /** "Walk, watered. +5 · Undo" */
  toast: 520,
  /** Everything has settled. */
  total: 700,
} as const;

export interface WaterInput {
  state?: CheckRingState;
  count?: number;
  target?: number;
}

/** A count habit's target is more than one tap ("5/8 glasses"). */
export const isCountHabit = (target: number | undefined): target is number => typeof target === 'number' && target > 1;

/** The ring's state, from an explicit state or from a count toward a target. */
export function ringState({ state, count = 0, target }: WaterInput): CheckRingState {
  if (state) return state;
  if (isCountHabit(target)) return count >= target ? 'done' : 'empty';
  return count > 0 ? 'done' : 'empty';
}

/** How full the ring is, 0..1. Rest holds no water; tiny counts as done (DESIGN §5.2). */
export function waterLevel(input: WaterInput): number {
  const state = ringState(input);
  if (state === 'done' || state === 'tiny') return 1;
  if (state === 'rest') return 0;
  const { count = 0, target } = input;
  if (!isCountHabit(target)) return 0;
  return Math.min(1, Math.max(0, count / target));
}

/* ---------- geometry (48-unit box) ---------- */

/** The ring's edge (r, stroke); the water and the paper inside reach under the stroke so no seam shows. */
export const RING = { c: 24, r: 22.25, stroke: 1.5, inner: 22 } as const;

/** Where the water's front edge sits for a level: empty below the ring, full above it. */
export function surfaceY(level: number): number {
  if (level <= 0) return 56;
  if (level >= 1) return -8;
  return 45.5 - 43 * level;
}

/**
 * The water, drawn once with its surface at y = 0 and moved by a transform. The body's top is
 * the back edge of the surface; the paler lens in front of it is the surface seen from a little
 * above, so it reads as water in a glass. The edges rise to the walls, like a real meniscus.
 */
export const WATER_BODY = 'M-3 -1.4 Q24 -5.2 51 -1.4 V64 H-3 Z';
export const WATER_SURFACE = 'M-3 -1.4 Q24 -5.2 51 -1.4 Q24 2.6 -3 -1.4 Z';

/** The hairline check (drawn with pathLength 1). */
export const CHECK_PATH = 'M15.6 24.4 L21.3 30 L32.6 18.4';
/** Tiny: a sprout (stem + two leaves) in place of the check. */
export const SPROUT_STEM = 'M24 33.5 V22.6';
export const SPROUT_LEAVES = 'M24 27.2 C20.2 27.4 17.9 25.1 17.6 21.6 C21.4 21.4 23.7 23.6 24 27.2 Z M24 23.6 C24 19.6 26.5 17 30.4 16.9 C30.4 20.8 28 23.4 24 23.6 Z';
/** Rest: a soft moon. */
export const MOON_PATH = 'M22.9 14.1 A10 10 0 1 0 33.4 28.9 A7.6 7.6 0 0 1 22.9 14.1 Z';

/**
 * Where the "5/8" count sits: in the larger of the air and the water, so it never straddles the
 * surface. Returns the label's centre line and whether it sits in the water.
 */
export function countLabelPlacement(level: number): { y: number; inWater: boolean } {
  const s = surfaceY(level);
  if (level >= 0.5) return { y: Math.max(24, (s + 45.5) / 2), inWater: true };
  return { y: Math.min(24, (2.5 + s - 3) / 2), inWater: false };
}
