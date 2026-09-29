/**
 * Shared pet geometry: THE contract between species art and wearable art.
 *
 * Every pet is drawn on a 100×100 canvas around the same "mochi blob" body
 * (head and body fused, sitting on the ground). Species identity comes from ears,
 * horns, snout, beak, eye placement, tail and pattern, never from the body outline.
 * That's what lets any hat, collar or sweater fit every species via anchors.
 *
 *   y=28  ── top of head (hats sit here)
 *   y=59  ── eye line
 *   y=71  ── neck line (collars)
 *   y=93  ── bottom of body; ground/shadow at y≈94
 */
import type { Species } from '@/catalog/types';

export const VIEWBOX = '0 0 100 100';
export const OUTLINE = '#5A3E45';
export const STROKE = 2.4;
export const BLUSH = '#FF9FB8';
export const EYE = '#4A3540';

/** The mochi blob. Symmetric around x=50. */
export const BODY_PATH =
  'M50 28 C69 28 83 41 84.5 60 C86 76 79 92.5 64 93 L36 93 C21 92.5 14 76 15.5 60 C17 41 31 28 50 28 Z';

/** Half-width of the body outline at a given y (approximate, for fitting wearables). */
export function bodyHalfWidthAt(y: number): number {
  // Sampled from BODY_PATH; linear interpolation between samples.
  const samples: [number, number][] = [
    [28, 2.5],
    [29, 9.1],
    [31, 15],
    [34, 20.3],
    [38, 25],
    [44, 29.6],
    [50, 32.4],
    [56, 34],
    [62, 34.6],
    [68, 34.5],
    [72, 34],
    [74, 33.6],
    [80, 31.6],
    [86, 28],
    [90, 23.7],
    [92, 19.7],
    [93, 15.2],
  ];
  if (y <= samples[0]![0]) return 0;
  for (let i = 1; i < samples.length; i++) {
    const [y1, w1] = samples[i]!;
    const [y0, w0] = samples[i - 1]!;
    if (y <= y1) return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
  }
  return 15.2;
}

export interface Anchors {
  /** Where head wear sits: center x, top-of-head y, usable width at that height. */
  head: { x: number; y: number; width: number };
  /** Eye centers (face wear such as glasses and masks). */
  eyes: { y: number; left: number; right: number };
  /** Muzzle/mouth center (milk mustache etc.). */
  mouth: { x: number; y: number };
  /** Collar line: y, and the left/right x where it meets the body outline. */
  neck: { y: number; left: number; right: number };
  /** Region covered by body wear (clipped to BODY_PATH). */
  body: { top: number; bottom: number };
  /**
   * Horizontal spans that head wear must NOT cover, so ears/horns/eye-bumps remain visible
   * (e.g. bunny ears poke out from under a hat). Hats should be narrow enough, or be drawn
   * *behind* these features when `headWearBehindFeatures` is true.
   */
  headFeatures: { x: number; width: number }[];
  /** When true, head wear is rendered BEHIND ears/horns (bunny, cow). */
  headWearBehindFeatures: boolean;
}

const BASE: Anchors = {
  head: { x: 50, y: 29, width: 40 },
  eyes: { y: 59, left: 38.5, right: 61.5 },
  mouth: { x: 50, y: 64 },
  neck: { y: 72, left: 16, right: 84 },
  body: { top: 72, bottom: 93 },
  headFeatures: [],
  headWearBehindFeatures: false,
};

/** Per-species anchor overrides. Species art MUST honor these positions. */
export const ANCHORS: Record<Species, Anchors> = {
  cat: { ...BASE, headFeatures: [{ x: 29, width: 16 }, { x: 71, width: 16 }] },
  cow: {
    ...BASE,
    mouth: { x: 50, y: 68 },
    headFeatures: [{ x: 32, width: 10 }, { x: 68, width: 10 }],
    headWearBehindFeatures: true,
  },
  bunny: { ...BASE, head: { x: 50, y: 29, width: 34 }, headFeatures: [{ x: 38, width: 12 }, { x: 62, width: 12 }], headWearBehindFeatures: true },
  frog: {
    ...BASE,
    eyes: { y: 36, left: 33, right: 67 },
    head: { x: 50, y: 30, width: 26 },
    mouth: { x: 50, y: 60 },
    headFeatures: [{ x: 33, width: 20 }, { x: 67, width: 20 }],
  },
  bear: { ...BASE, headFeatures: [{ x: 27, width: 14 }, { x: 73, width: 14 }] },
  hamster: { ...BASE, headFeatures: [{ x: 29, width: 11 }, { x: 71, width: 11 }] },
  duck: { ...BASE, mouth: { x: 50, y: 66 }, headFeatures: [] },
};

export const FOOT_LEFT = { cx: 38.5, cy: 92.6, rx: 7, ry: 3.6 };
export const FOOT_RIGHT = { cx: 61.5, cy: 92.6, rx: 7, ry: 3.6 };
