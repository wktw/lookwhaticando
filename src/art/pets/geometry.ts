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

/** Half-width of the BASE body outline at a given y. Prefer ctx.body.halfWidthAt (species-aware). */
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
  /** Blush centers; `size` scales the blush ovals. Defaults to beside and below the eyes. */
  cheeks?: { y: number; left: number; right: number; size?: number };
}

const neck = (y: number, halfWidth: number) => ({ y, left: 50 - halfWidth, right: 50 + halfWidth });

/** Per-species anchors, measured on each species' silhouette. Species art MUST honor these positions. */
export const ANCHORS: Record<Species, Anchors> = {
  cat: {
    head: { x: 50, y: 29, width: 40 },
    eyes: { y: 59, left: 38.5, right: 61.5 },
    mouth: { x: 50, y: 64 },
    neck: { y: 72, left: 16, right: 84 },
    body: { top: 72, bottom: 93 },
    headFeatures: [{ x: 29, width: 16 }, { x: 71, width: 16 }],
    headWearBehindFeatures: false,
  },
  dog: {
    head: { x: 50, y: 27.5, width: 40 },
    eyes: { y: 56.5, left: 38, right: 62 },
    mouth: { x: 50, y: 64 },
    neck: neck(73, 33.3),
    body: { top: 73, bottom: 93 },
    headFeatures: [{ x: 29, width: 16 }, { x: 71, width: 16 }],
    headWearBehindFeatures: false,
    cheeks: { y: 63, left: 30, right: 70 },
  },
  cow: {
    head: { x: 50, y: 30.5, width: 40 },
    eyes: { y: 54, left: 37.5, right: 62.5 },
    mouth: { x: 50, y: 68 },
    neck: neck(77, 34.8),
    body: { top: 77, bottom: 93 },
    headFeatures: [{ x: 35, width: 10 }, { x: 65, width: 10 }],
    headWearBehindFeatures: true,
    cheeks: { y: 60.5, left: 27.5, right: 72.5 },
  },
  bunny: {
    head: { x: 50, y: 26, width: 34 },
    eyes: { y: 57, left: 39.5, right: 60.5 },
    mouth: { x: 50, y: 62.5 },
    neck: neck(71, 33.4),
    body: { top: 71, bottom: 93 },
    headFeatures: [{ x: 41, width: 11 }, { x: 59, width: 11 }],
    headWearBehindFeatures: true,
    cheeks: { y: 63, left: 32, right: 68 },
  },
  frog: {
    head: { x: 50, y: 38, width: 24 },
    eyes: { y: 37, left: 33, right: 67 },
    mouth: { x: 50, y: 55 },
    neck: neck(66, 40.4),
    body: { top: 66, bottom: 93 },
    headFeatures: [{ x: 33, width: 22 }, { x: 67, width: 22 }],
    headWearBehindFeatures: false,
    cheeks: { y: 51, left: 25, right: 75, size: 1.25 },
  },
  bear: {
    head: { x: 50, y: 29.5, width: 38 },
    eyes: { y: 57.5, left: 38.5, right: 61.5 },
    mouth: { x: 50, y: 66 },
    neck: neck(74, 35.3),
    body: { top: 74, bottom: 93 },
    headFeatures: [{ x: 27, width: 14 }, { x: 73, width: 14 }],
    headWearBehindFeatures: false,
    cheeks: { y: 64, left: 29.5, right: 70.5 },
  },
  hamster: {
    head: { x: 50, y: 35, width: 40 },
    eyes: { y: 60, left: 37, right: 63 },
    mouth: { x: 50, y: 66 },
    neck: neck(75, 38.2),
    body: { top: 75, bottom: 93 },
    headFeatures: [{ x: 29, width: 11 }, { x: 71, width: 11 }],
    headWearBehindFeatures: false,
    cheeks: { y: 67, left: 27, right: 73 },
  },
  duck: {
    head: { x: 50, y: 30.5, width: 32 },
    eyes: { y: 51.5, left: 40, right: 60 },
    mouth: { x: 50, y: 60 },
    neck: neck(68, 32.3),
    body: { top: 68, bottom: 93 },
    headFeatures: [],
    headWearBehindFeatures: false,
    cheeks: { y: 58, left: 31.5, right: 68.5 },
  },
};

export const FOOT_LEFT = { cx: 38.5, cy: 92.6, rx: 7, ry: 3.6 };
export const FOOT_RIGHT = { cx: 61.5, cy: 92.6, rx: 7, ry: 3.6 };

/**
 * Species silhouettes. Every species stays in the "mochi" family (soft, sitting, head+body
 * fused) but varies proportions: a rounder hamster, a pear-shaped bunny, a flatter frog…
 * `halfWidthAt` describes the species path so neck/body wear hugs it.
 */
export interface BodyShape {
  path: string;
  halfWidthAt: (y: number) => number;
  /** The soft top-left highlight (white, ~38%), placed on this silhouette. */
  sheen?: { cx: number; cy: number; rx: number; ry: number; rotate: number };
}

/** Linear interpolation over [y, halfWidth] samples measured from a body path; 0 above the top. */
export function halfWidthSampler(samples: readonly (readonly [number, number])[]): (y: number) => number {
  return (y) => {
    if (y <= samples[0]![0]) return 0;
    for (let i = 1; i < samples.length; i++) {
      const [y1, w1] = samples[i]!;
      const [y0, w0] = samples[i - 1]!;
      if (y <= y1) return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
    }
    return samples[samples.length - 1]![1];
  };
}

// Half-width tables below were sampled from each path's Béziers (outermost crossing per y).
export const BODIES: Record<Species, BodyShape> = {
  cat: { path: BODY_PATH, halfWidthAt: bodyHalfWidthAt },
  dog: {
    path: 'M50 26.5 C69 26.5 82.5 40 84 58 C85.5 76 79 92.5 64 93 L36 93 C21 92.5 14.5 76 16 58 C17.5 40 31 26.5 50 26.5 Z',
    halfWidthAt: halfWidthSampler([
      [26.5, 0], [26.75, 4.4], [27.25, 7.5], [28, 10.5], [29.5, 14.6], [31.5, 18.4], [34, 21.9], [37, 25], [40, 27.5],
      [43, 29.4], [46, 31], [49, 32.1], [52, 33], [55, 33.6], [58, 34], [61, 34.2], [64, 34.2], [67, 34.1],
      [70, 33.8], [73, 33.3], [76, 32.5], [79, 31.5], [82, 30.2], [85, 28.4], [88, 25.9], [90, 23.4], [91.5, 20.8],
      [92.5, 17.8], [93, 14.3],
    ]),
    sheen: { cx: 34, cy: 39.5, rx: 10, ry: 5.5, rotate: -30 },
  },
  cow: {
    path: 'M50 29.5 C70 29.5 84.5 40.5 86 57.5 C87.5 75 84 92.5 66 93 L34 93 C16 92.5 12.5 75 14 57.5 C15.5 40.5 30 29.5 50 29.5 Z',
    halfWidthAt: halfWidthSampler([
      [29.5, 0], [29.75, 5.1], [30.25, 8.7], [31, 12.2], [32.5, 16.7], [34.5, 21], [37, 24.8], [40, 28.2], [43, 30.7],
      [46, 32.6], [49, 34], [52, 35], [55, 35.7], [58, 36], [61, 36.2], [64, 36.3], [67, 36.3], [70, 36.1],
      [73, 35.7], [76, 35.1], [79, 34.3], [82, 33.1], [85, 31.5], [88, 29], [90, 26.5], [91.5, 23.6], [92.5, 20.3],
      [93, 16.3],
    ]),
    sheen: { cx: 33, cy: 41.5, rx: 10.5, ry: 5.5, rotate: -26 },
  },
  bunny: {
    path: 'M50 25 C67.5 25 78 39 81.8 57 C86 77 82.5 92.6 65 93 L35 93 C17.5 92.6 14 77 18.2 57 C22 39 32.5 25 50 25 Z',
    halfWidthAt: halfWidthSampler([
      [25, 0], [25.25, 4], [25.75, 6.7], [26.5, 9.4], [28, 12.9], [30, 16.2], [32, 18.7], [35, 21.7], [38, 24],
      [41, 25.9], [44, 27.5], [47, 28.8], [50, 29.9], [53, 30.8], [56, 31.6], [59, 32.2], [62, 32.7], [65, 33.1],
      [68, 33.3], [71, 33.4], [74, 33.3], [77, 33], [80, 32.3], [83, 31.3], [86, 29.6], [90, 25.6], [91.5, 22.8],
      [92.5, 19.5], [93, 15.3],
    ]),
    sheen: { cx: 37, cy: 37, rx: 8.5, ry: 5, rotate: -40 },
  },
  frog: {
    path: 'M50 39 C46.5 39 44.3 37.6 43.6 35 C42.5 29.8 38.5 26.5 33 26.5 C27 26.5 22.6 31 22.6 36.5 C15 42 10 53 9.5 66 C9 82 19 92.8 36 93 L64 93 C81 92.8 91 82 90.5 66 C90 53 85 42 77.4 36.5 C77.4 31 73 26.5 67 26.5 C61.5 26.5 57.5 29.8 56.4 35 C55.7 37.6 53.5 39 50 39 Z',
    halfWidthAt: halfWidthSampler([
      [26.5, 0], [26.75, 19.4], [27.25, 21.1], [28, 22.6], [29.5, 24.5], [31.5, 26.1], [34, 27.1], [37, 28.1],
      [40, 31.3], [43, 33.6], [46, 35.4], [49, 36.9], [52, 38], [55, 38.9], [58, 39.6], [61, 40.1], [64, 40.4],
      [67, 40.5], [70, 40.4], [73, 40], [76, 39.3], [79, 38.1], [82, 36.5], [85, 34.2], [88, 30.8], [90, 27.5],
      [91.5, 23.8], [92.5, 19.7], [93, 14.5],
    ]),
    sheen: { cx: 20, cy: 50, rx: 6, ry: 3.8, rotate: -58 },
  },
  bear: {
    path: 'M50 29 C70.5 29 86.5 43.5 86.5 62 C86.5 80 78 92.8 63 93 L37 93 C22 92.8 13.5 80 13.5 62 C13.5 43.5 29.5 29 50 29 Z',
    halfWidthAt: halfWidthSampler([
      [29, 0], [29.25, 4.6], [29.75, 7.9], [30.5, 11.1], [32, 15.5], [34, 19.6], [36, 22.7], [39, 26.4], [42, 29.2],
      [45, 31.4], [48, 33.2], [51, 34.5], [54, 35.5], [57, 36.1], [60, 36.4], [63, 36.5], [66, 36.4], [69, 36],
      [72, 35.5], [75, 34.8], [78, 33.7], [81, 32.4], [84, 30.5], [87, 27.9], [90, 24.1], [91.5, 21], [92.5, 17.6],
      [93, 13.5],
    ]),
    sheen: { cx: 33, cy: 42, rx: 10.5, ry: 5.5, rotate: -32 },
  },
  hamster: {
    path: 'M50 34.5 C72.5 34.5 89 48.5 89 67 C89 84 80 92.8 65 93 L35 93 C20 92.8 11 84 11 67 C11 48.5 27.5 34.5 50 34.5 Z',
    halfWidthAt: halfWidthSampler([
      [34.5, 0], [34.75, 5.1], [35.25, 8.8], [36, 12.3], [37.5, 17], [39.5, 21.5], [42, 25.6], [45, 29.3], [48, 32.1],
      [51, 34.3], [54, 36], [57, 37.3], [60, 38.2], [63, 38.7], [66, 39], [69, 39], [72, 38.7], [75, 38.2],
      [78, 37.4], [81, 36.2], [84, 34.5], [87, 31.9], [90, 27.8], [91.5, 24.4], [92.5, 20.5], [93, 15.5],
    ]),
    sheen: { cx: 30, cy: 46, rx: 11, ry: 5.5, rotate: -24 },
  },
  duck: {
    path: 'M50 30 C64.5 30 75 41 78.5 56 C81.2 67.5 86.5 74.5 86 83.5 C85.5 91 77 92.9 64 93 L36 93 C23 92.9 14.5 91 14 83.5 C13.5 74.5 18.8 67.5 21.5 56 C25 41 35.5 30 50 30 Z',
    halfWidthAt: halfWidthSampler([
      [30, 0], [30.25, 3.7], [30.75, 6.4], [31.5, 8.9], [33, 12.3], [35, 15.5], [37, 18], [40, 20.8], [43, 23],
      [46, 24.8], [49, 26.2], [52, 27.4], [55, 28.3], [58, 29], [61, 29.9], [64, 30.9], [67, 32], [70, 33.2],
      [73, 34.3], [76, 35.2], [79, 35.8], [82, 36], [85, 35.8], [88, 34.3], [90, 31.9], [91.5, 28.2], [92.5, 23.1],
      [93, 14.9],
    ]),
    sheen: { cx: 38, cy: 40, rx: 8, ry: 4.6, rotate: -38 },
  },
};
