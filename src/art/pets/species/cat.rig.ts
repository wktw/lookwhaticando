import { ellipse } from '../shape';
import { leg, tailRig, type SpeciesRig } from '../rig';

/**
 * Cat: a round, slightly wide head about 40% of the sitting height, a teardrop sit with the tail
 * wrapped round the feet, the loaf, a side-on stand, and a round curl with the tail over the nose.
 * Geometry follows the approved style frames (Pz_poses), mirrored to face right.
 */

export const CAT_HEAD = ellipse(0, 0, 20, 18.5);

/** Ears in the head frame (drawn behind the head). */
export const CAT_EARS = {
  near: 'M-3 -16.2C-7 -20.3 -11 -23.3 -15.2 -25C-16.8 -25.6 -18 -24.6 -17.9 -22.9C-17.7 -18.8 -17 -13.3 -16 -8.8Z',
  far: 'M17 -6.8C17.6 -13.3 16.9 -20.3 15.3 -23.7C14.5 -25.3 13.1 -25.4 11.9 -24.4C8.5 -21.3 5 -17.8 2.5 -14.3Z',
  nearIn: 'M-6.2 -16.4C-8.9 -18.8 -11.7 -20.8 -14.4 -22C-14.6 -19.1 -14.3 -15.6 -13.6 -12.6Z',
  farIn: 'M14.1 -10.4C14.4 -14.7 14 -18.9 13.1 -21.2C11 -19.4 8.8 -17.1 7.1 -14.6Z',
  /** Scottish Fold: small ears folded forward, like a cap. */
  foldNear: 'M-4 -15.6C-8 -19.6 -13.6 -20.2 -15.6 -17C-16.4 -15.6 -16 -13.4 -14.8 -11.6Z',
  foldFar: 'M13.6 -9.4C15.4 -12.6 14.8 -17.4 11.8 -18.8C9.2 -19.8 5.6 -17.6 3.6 -14.8Z',
  /** Lynx tips (Maine Coon, Norwegian): a short tuft continuing each ear tip. */
  tuftNear: 'M-16.6 -24.6C-17.8 -26.6 -18.6 -28.6 -18.2 -30.4C-16.6 -29 -15.6 -27.2 -15.2 -25.2Z',
  tuftFar: 'M13.4 -24.9C13.9 -26.9 14.8 -28.8 16.2 -30C16.3 -28.2 15.9 -26.2 15.2 -24.2Z',
};

const STAND_BODY =
  'M30 57.5C42 54.5 57 54.5 66 56.3C73 57.9 76.5 63.5 76 69.5C75.6 75.5 72 79.8 66 80.6C60 81.2 56 79.4 50 79.6C44 79.8 40 81.4 33 81C25.5 80.6 21 75 21.2 68.3C21.4 62 24.6 58.8 30 57.5Z';

export const CAT_RIG: SpeciesRig = {
  species: 'cat',
  scale: 0.84,
  head: {
    d: CAT_HEAD,
    hat: { x: 1.5, y: -17, w: 21, r: 0 },
    eyes: { y: 2.4, left: -4.6, right: 10, r: 2.6 },
    nose: [3, 7.8],
    ear: { x: -11, y: -15.5, r: -24 },
    top: -26,
    wide: 18.2,
  },
  poses: {
    sit: {
      body: 'M47 49C34 49 24 63 23.5 79C23 88 28 94 36 94L60 94C67 94 70.5 88.5 70 80C69.4 64 60 49 47 49Z',
      frame: { x: 17, y: 90, a: -66, w: 50, h: 44 },
      head: { x: 55, y: 38.5, s: 1, r: 5 },
      front: [
        // The near foreleg reads as a soft value step down the chest, with its paw.
        { d: 'M50.5 70C53.2 70 55 72 55 75V92.6C55 93.4 54.4 94 53.6 94H47.4C46.6 94 46 93.4 46 92.6V75C46 72 47.8 70 50.5 70Z', tone: 'leg', lit: true, sock: 'M46 88.6H55V92.6C55 93.4 54.4 94 53.6 94H47.4C46.6 94 46 93.4 46 92.6Z', lower: 'M46 83.4C46 81.6 48 80.6 50.5 80.6C53 80.6 55 81.6 55 83.4V92.6C55 93.4 54.4 94 53.6 94H47.4C46.6 94 46 93.4 46 92.6Z' },
      ],
      back: [{ d: 'M59 74C62 74 64 76 64 79V92.6C64 93.4 63.4 94 62.6 94H56.4C55.6 94 55 93.4 55 92.6V79C55 76 56.5 74 59 74Z', tone: 'legFar', sock: 'M55 89H64V92.6C64 93.4 63.4 94 62.6 94H56.4C55.6 94 55 93.4 55 92.6Z' }],
      tail: tailRig(
        [
          [27, 82.5],
          [21.5, 88.5],
          [26, 93],
          [37, 93.6],
          [47.5, 92.4],
        ],
        6.6,
        5.2,
        [26, 83],
        'front',
        0.28,
        0.62,
      ),
      contact: { cx: 46, rx: 25 },
      neck: { x: 56, y: 56.5, w: 11, r: -8 },
    },
    loaf: {
      body: 'M61 65.5C54 59.6 32 58.6 23 63.4C17 66.6 14 71.6 14 78V84C14 90 18 94 24 94H61C67 94 71 90 71 84V76C71 71 67 67.6 61 65.5Z',
      frame: { x: 12, y: 59, w: 60, h: 36 },
      head: { x: 63, y: 60.5, s: 0.87 },
      front: [{ d: ellipse(64, 92.6, 5.2, 2.2), tone: 'leg', lit: true, sock: ellipse(64, 92.6, 5.2, 2.2) }],
      tail: tailRig(
        [
          [19, 86.5],
          [15.6, 91.2],
          [22, 94.2],
          [34, 94.6],
          [46, 94],
        ],
        5.8,
        4.8,
        [19, 86.5],
        'front',
        0.28,
        0.62,
      ),
      contact: { cx: 43, rx: 31 },
      neck: { x: 64, y: 76, w: 9.5, r: -6 },
      depth: { body: 4.4 },
    },
    stand: {
      body: STAND_BODY,
      frame: { x: 20, y: 55, w: 57, h: 27 },
      head: { x: 72.6, y: 48.5, s: 0.84, r: 4 },
      back: [leg([[37.5, 74], [38, 84], [38.4, 93.3]], 7.4, 6, 'legFar'), leg([[61, 74], [61.2, 84], [61.4, 93.3]], 7, 5.8, 'legFar')],
      front: [leg([[29.5, 71], [29, 83], [29.8, 93.3]], 11, 6.6, 'leg'), leg([[68, 74], [68.3, 84], [68.6, 93.3]], 7.6, 6.2, 'leg')],
      tail: tailRig(
        [
          [23.5, 63],
          [15.5, 57],
          [12.4, 47.5],
          [15.2, 39.4],
        ],
        5.4,
        4.4,
        [23.5, 63],
        'back',
        0.28,
        0.62,
      ),
      contact: { cx: 49, rx: 28 },
      neck: { x: 67.4, y: 63.4, w: 9, r: 16 },
    },
    walk: {
      body: STAND_BODY,
      frame: { x: 20, y: 55, w: 57, h: 27 },
      head: { x: 73, y: 49, s: 0.84, r: 2 },
      back: [leg([[37.5, 74], [40.4, 84], [43.8, 93.3]], 7.4, 6, 'legFar'), leg([[61, 74], [59, 84], [56.2, 93.3]], 7, 5.8, 'legFar')],
      front: [leg([[29.5, 71], [26.4, 83], [22.8, 93.3]], 11, 6.6, 'leg'), leg([[68, 74], [70.6, 84], [74, 93.3]], 7.6, 6.2, 'leg')],
      frameB: {
        back: [leg([[37.5, 74], [35.4, 84], [32.4, 93.3]], 7.4, 6, 'legFar'), leg([[61, 74], [63.4, 84], [66.8, 93.3]], 7, 5.8, 'legFar')],
        front: [leg([[29.5, 71], [31.4, 83], [35, 93.3]], 11, 6.6, 'leg'), leg([[68, 74], [66.6, 84], [63.8, 93.3]], 7.6, 6.2, 'leg')],
      },
      tail: tailRig(
        [
          [23.5, 63],
          [15, 59],
          [11, 51],
          [12.8, 42.6],
        ],
        5.4,
        4.4,
        [23.5, 63],
        'back',
        0.28,
        0.62,
      ),
      contact: { cx: 48, rx: 29 },
      neck: { x: 67.8, y: 63.8, w: 9, r: 16 },
      motion: 'hop',
    },
    sleep: {
      body: ellipse(44, 80, 25, 14),
      frame: { x: 18, y: 66, w: 54, h: 28 },
      head: { x: 64.5, y: 80, s: 0.66, r: 12 },
      tail: tailRig(
        [
          [22, 83],
          [27, 91.4],
          [45, 94],
          [60, 92.8],
          [68.4, 89.4],
          [74.6, 84.2],
        ],
        6.4,
        5.2,
        [22, 83],
        'over',
        0.3,
        0.68,
      ),
      contact: { cx: 46, rx: 28 },
      neck: { x: 62, y: 88, w: 7, r: -30 },
      eyesClosed: true,
      depth: { body: 3.8 },
    },
  },
};

