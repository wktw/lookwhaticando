/**
 * The Sill's own objects, drawn on a 100×100 canvas standing on y = 94 and centred on x = 50 (like
 * decor): the coin jar and the table lamp. Every standing part is convex so the offline crescent
 * generator (../crescent) can precompute its shade for each light.
 */
import { ellipse, rrect, trapezoid } from '../crescent/build';
import type { CrescentSpec } from '../crescent/generate';

/** Where objects stand on their canvas. */
export const OBJECT_BASE = 94;

/* ── Coin jar: a jam jar with a scrap of gingham tied over the lid ─────────────────────────── */

export const JAR = {
  body: rrect(29, 45, 42, 49, 9),
  neck: rrect(33, 38.5, 34, 8, 2.4),
  /** The gingham cap, flaring over the lid. */
  cap: trapezoid(34, 66, 30.5, 29.5, 70.5, 42, 1.6),
  /** Inside of the glass: coins are drawn within these walls. */
  inner: { x0: 32.5, x1: 67.5, floor: 90.5, top: 50 },
} as const;

/* ── Table lamp: a glazed ceramic base, a brass stem and a paper shade ─────────────────────── */

export const LAMP = {
  foot: rrect(41, 89.5, 18, 4.5, 1.6),
  base: ellipse(50, 78.5, 12.5, 12.5),
  stem: rrect(48.9, 38, 2.2, 30, 0.6),
  shade: trapezoid(38.5, 61.5, 17, 29, 71, 41.5, 1.2),
  /** The shade's open underside, seen from pet eye level. */
  rim: ellipse(50, 41.3, 21, 1.8),
  /** Where the bulb sits, for the night glow (canvas units). */
  bulb: [50, 37] as const,
} as const;

export const PROP_CRESCENTS: Record<string, CrescentSpec> = {
  'jar.body': { parts: [JAR.body], k: 3.2 },
  'jar.cap': { parts: [JAR.cap], k: 2.2 },
  'lamp.base': { parts: [LAMP.base], k: 2.8 },
  'lamp.foot': { parts: [LAMP.foot], k: 1.6 },
  'lamp.shade': { parts: [LAMP.shade], k: 2.6 },
};
