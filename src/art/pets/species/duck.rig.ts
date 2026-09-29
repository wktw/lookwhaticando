import { blob, ellipse, tube, type P } from '../shape';
import type { Layer, PoseRig, SpeciesRig } from '../rig';

/**
 * Duck: a round head with a flat bill, a body that runs up into the neck, a folded wing, short
 * legs and webbed feet. It stands tall, nests flat on the ground, stands relaxed, waddles, and
 * sleeps with its head turned onto its back. Runner Ducks stand upright like a bowling pin.
 */

export const DUCK_HEAD = ellipse(0, 0, 12, 11.4);

export const DUCK_PARTS = {
  bill: 'M8.2 1.4C12.2 0.2 18.2 0.4 21.6 2.2C23.6 3.4 23.2 6 20.8 6.6C16.8 7.6 11.8 7.2 8.6 6.2Z',
  billLine: 'M9.4 4.4C13 4.8 17 4.8 21 4.2',
  crest: 'M-8 -8C-10 -14 -6 -20 1 -20C8 -20 11 -14 8.6 -8.6C4 -11 -3 -11 -8 -8Z',
};

/** A leg and its webbed foot, pointing forward. */
function foot(x: number, lift = 0, tone: 'foot' | 'footFar' = 'foot'): Layer[] {
  const y = 93.4 - lift;
  return [
    { d: tube([[x, 84 - lift * 0.3], [x + 0.2, y - 1.4]], 2.6, 2.4), tone },
    { d: `M${x - 3.2} ${y - 0.6}C${x - 1} ${y - 2.6} ${x + 5} ${y - 2.8} ${x + 8.4} ${y - 0.8}C${x + 8.8} ${y - 0.2} ${x + 8.4} ${y + 0.6} ${x + 7.6} ${y + 0.6}H${x - 2.6}C${x - 3.4} ${y + 0.6} ${x - 3.8} ${y} ${x - 3.2} ${y - 0.6}Z`, tone },
  ];
}

const pts = (a: readonly (readonly [number, number])[]) => blob(a as P[]);

const TALL = pts([
  [22, 81],
  [30, 70],
  [40, 63.4],
  [47, 56],
  [49, 46],
  [60, 46],
  [60.6, 57],
  [68, 66],
  [69.4, 78],
  [62, 90],
  [48, 93.2],
  [32, 90.4],
]);
const NEST = pts([
  [17, 83],
  [27, 74],
  [42, 70],
  [52, 63],
  [54, 55],
  [64, 55],
  [66, 66],
  [74.4, 74],
  [76, 86],
  [68, 93.6],
  [40, 94],
  [22, 91.4],
]);
const RELAXED = pts([
  [15, 69],
  [27, 64],
  [44, 62],
  [55, 57],
  [57, 47],
  [68, 47],
  [68.6, 58],
  [76, 68],
  [75.6, 78],
  [66, 86],
  [44, 88],
  [27, 84],
]);
const TUCKED = pts([
  [17, 84],
  [27, 74],
  [44, 68.6],
  [62, 68.6],
  [74, 76],
  [76, 86],
  [68, 93.6],
  [40, 94],
  [22, 91.6],
]);

/** An Indian Runner stands nearly upright, slim as a wine bottle. */
const RUNNER = pts([
  [37, 86],
  [38.4, 74],
  [42, 62],
  [46.6, 50],
  [47.6, 38],
  [57, 38],
  [58, 49],
  [61.6, 60],
  [63.6, 74],
  [62.6, 87],
  [55, 93.4],
  [44, 93.4],
]);

/** The folded wing on the body's near side, per pose (drawn over the body). */
export const DUCK_WING: Record<string, string> = {
  tall: pts([
    [31, 72],
    [44, 67],
    [58, 72],
    [58, 83],
    [44, 86],
    [30, 80],
  ]),
  nest: pts([
    [24, 80],
    [40, 74],
    [58, 76],
    [60, 85],
    [42, 88],
    [26, 86],
  ]),
  runner: pts([
    [41.6, 66],
    [50, 61],
    [57.4, 67],
    [58, 80],
    [50, 86],
    [42.4, 79],
  ]),
  relaxed: pts([
    [22, 70],
    [38, 66],
    [56, 70],
    [56, 79],
    [38, 82],
    [24, 76],
  ]),
};

const tall: Omit<PoseRig, 'head'> = {
  body: TALL,
  frame: { x: 20, y: 90, a: -58, w: 50, h: 40 },
  back: foot(52, 1.4, 'footFar'),
  front: foot(42),
  contact: { cx: 46, rx: 24 },
  neck: { x: 55, y: 52, w: 7, r: 0 },
};
const relaxed: Omit<PoseRig, 'head'> = {
  body: RELAXED,
  frame: { x: 14, y: 58, w: 64, h: 32 },
  back: foot(52, 1.4, 'footFar'),
  front: foot(43),
  contact: { cx: 46, rx: 29 },
  neck: { x: 62.4, y: 52, w: 7, r: 0 },
};

export const DUCK_RIG: SpeciesRig = {
  species: 'duck',
  scale: 0.66,
  head: {
    d: DUCK_HEAD,
    hat: { x: -0.4, y: -11.2, w: 13, r: 0 },
    eyes: { y: -2.4, left: -1.4, right: 7.4, r: 2.1 },
    nose: [21, 4],
    ear: { x: -6, y: -9.6, r: -20 },
  },
  poses: {
    sit: { ...tall, head: { x: 55, y: 38.5, s: 1 } },
    loaf: {
      body: NEST,
      frame: { x: 16, y: 62, w: 62, h: 33 },
      head: { x: 59.5, y: 47, s: 0.96 },
      contact: { cx: 46, rx: 31 },
      neck: { x: 59, y: 60.6, w: 6.6, r: 0 },
    },
    stand: { ...relaxed, head: { x: 63, y: 39.5, s: 0.96 } },
    walk: {
      ...relaxed,
      head: { x: 63, y: 39.5, s: 0.96, r: 2 },
      back: foot(56, 2.4, 'footFar'),
      front: foot(39),
      frameB: { back: foot(47, 0, 'footFar'), front: foot(47, 2.4) },
      motion: 'waddle',
    },
    sleep: {
      body: TUCKED,
      frame: { x: 16, y: 66, w: 62, h: 29 },
      head: { x: 49, y: 66, s: 0.9, r: -24 },
      contact: { cx: 46, rx: 31 },
      neck: { x: 52, y: 74, w: 6, r: -20 },
      eyesClosed: true,
    },
  },
};

const runner: Omit<PoseRig, 'head'> = {
  body: RUNNER,
  frame: { x: 34, y: 90, a: -80, w: 54, h: 26 },
  back: foot(52, 1.2, 'footFar'),
  front: foot(44),
  contact: { cx: 51, rx: 16 },
  neck: { x: 52.4, y: 42, w: 5.6, r: 0 },
};

/** Runner Ducks stand and walk upright; they nest and sleep like any duck. */
export const DUCK_RUNNER_RIG: SpeciesRig = {
  ...DUCK_RIG,
  poses: {
    ...DUCK_RIG.poses,
    sit: { ...runner, head: { x: 53, y: 28, s: 0.96 } },
    stand: { ...runner, head: { x: 53.6, y: 28.4, s: 0.96, r: 3 } },
    walk: {
      ...runner,
      head: { x: 53.6, y: 28.4, s: 0.96, r: 1 },
      back: foot(55, 2, 'footFar'),
      front: foot(40),
      frameB: { back: foot(47, 0, 'footFar'), front: foot(48, 2) },
      motion: 'waddle',
    },
  },
};

/** Which wing to draw for a pose. */
export const WING_FOR = { sit: 'tall', loaf: 'nest', stand: 'relaxed', walk: 'relaxed', sleep: 'nest' } as const;
