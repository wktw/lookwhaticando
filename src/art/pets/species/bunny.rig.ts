import { circle, ellipse, rrect } from '../shape';
import { leg, type Layer, type SpeciesRig, type TailRig } from '../rig';
import type { P } from '../shape';

/**
 * Rabbit: a round head with long ears (lop, short or standing), a pear-shaped sit with the long
 * hind foot flat on the ground, the bunny loaf, a side-on stand on all fours with the haunch
 * gathered, a two-frame hop, and a loaf asleep with the ears laid back.
 */

export const BUNNY_HEAD =
  'M0 -14C8.8 -14 15 -8 15.4 0C15.8 6.4 12 12.2 5.6 13.8C3.8 14.3 1.9 14.5 0 14.5C-2 14.5 -3.9 14.3 -5.6 13.8C-12 12.2 -15.8 6.4 -15.4 0C-15 -8 -8.8 -14 0 -14Z';

export const BUNNY_EARS = {
  near: 'M-8.4 -8.6C-11.8 -16 -13 -27 -11 -35.4C-10.2 -38.8 -6.8 -39.4 -5.4 -36C-3 -28.6 -2.2 -18 -2.6 -11Z',
  far: 'M1.8 -11.4C1.6 -19.6 3 -29.6 6.6 -35.6C8.4 -38.6 11.6 -37.8 11.8 -34.2C12.2 -26.6 9.6 -17 5.8 -9.2Z',
  nearIn: 'M-7.6 -13.2C-9.6 -19.4 -10.2 -27.2 -8.8 -33.4C-7.2 -28 -6.2 -20.4 -6 -14.4Z',
  farIn: 'M3.8 -14.6C4.2 -21 5.6 -28.6 8.4 -33.2C9 -27.8 7.8 -20.6 5.4 -13.6Z',
  shortNear: 'M-8.4 -8.6C-10.6 -13.4 -11 -19.6 -9.4 -23.8C-8.4 -26.2 -5.8 -26.2 -4.8 -23.8C-3.4 -19.8 -2.6 -15 -2.8 -11Z',
  shortFar: 'M1.8 -11.4C1.8 -16.4 3.2 -21.6 5.8 -24.4C7.4 -26.2 9.8 -25.4 9.8 -23C10 -18.6 8.4 -13.4 5.8 -9.2Z',
  /** Lop ears hang past the cheeks. */
  lopNear: 'M-6.6 -12.8C-12.6 -14 -17.4 -8.4 -18.4 0C-19.2 7 -18.2 14.6 -14.4 16.4C-10.8 18 -9 12.8 -9.2 6.4C-9.4 0 -8.2 -6.6 -4.4 -11.4Z',
  lopFar: 'M4.2 -12.6C9.6 -14.4 15 -11.4 16.8 -5.6C18.2 -1 17.8 4.2 16 5.4C14 2 11.8 -3.6 7.4 -8.2Z',
};

const SIT = 'M50 51C62 51 70 61 71 73C72 85 66 94 56 94L34 94C24 94 19.6 86 20.6 76C21.6 62 36 51 50 51Z';
const LOAF = 'M60 63C70 65 76 73 76 82C76 90 71 94 64 94L30 94C22 94 16 90 16 82C16 70 30 61 46 61C51 61 56 61.6 60 63Z';
const SIDE = 'M30 61C40 55 56 55 64 59C72 63 75 71 73 79C71 85 66 87 58 87L34 87C24 87 18 81 19 73C20 67 24 63 30 61Z';

const cotton = (x: number, y: number, r = 5.4): TailRig => ({ d: circle(x, y, r), tip: circle(x, y, r), pivot: [x, y], layer: 'back', lit: false });
const paw = (x: number, y: number, rx: number, ry: number, tone: Layer['tone'] = 'leg'): Layer => ({ d: ellipse(x, y, rx, ry), tone, sock: ellipse(x, y, rx, ry) });
/** The long hind foot, flat on the ground. */
const foot = (x0: number, x1: number, tone: Layer['tone'] = 'leg'): Layer => ({ d: rrect(x0, 88.6, x1 - x0, 5.4, 2.7), tone, sock: rrect(x0, 88.6, x1 - x0, 5.4, 2.7) });
const haunch = (x: number, y: number, rx: number, ry: number): Layer => ({ d: ellipse(x, y, rx, ry), tone: 'leg', lit: true });

export const BUNNY_RIG: SpeciesRig = {
  species: 'bunny',
  scale: 0.74,
  head: {
    d: BUNNY_HEAD,
    hat: { x: -0.4, y: -13.2, w: 16, r: 0 },
    eyes: { y: -1.2, left: -4.4, right: 7.6, r: 2.4 },
    nose: [11.6, 4.4],
    ear: { x: 0, y: -12, r: 0 },
  },
  poses: {
    sit: {
      body: SIT,
      frame: { x: 18, y: 92, a: -64, w: 48, h: 44 },
      head: { x: 60, y: 42, s: 1 },
      back: [paw(66.4, 91.6, 3.8, 2.6, 'legFar')],
      front: [haunch(34, 80, 13.4, 12.6), foot(33, 55), paw(61.2, 91.8, 4.2, 2.6)],
      tail: cotton(22, 84),
      contact: { cx: 46, rx: 27 },
      neck: { x: 59, y: 56.5, w: 10, r: -8 },
    },
    loaf: {
      body: LOAF,
      frame: { x: 14, y: 60, w: 64, h: 35 },
      head: { x: 66, y: 63, s: 0.96 },
      front: [paw(70, 92.2, 4.4, 2.4)],
      tail: cotton(17.6, 83),
      contact: { cx: 46, rx: 32 },
      neck: { x: 65, y: 77, w: 9.5, r: -6 },
    },
    stand: {
      body: SIDE,
      frame: { x: 17, y: 55, w: 58, h: 33 },
      head: { x: 70, y: 53, s: 0.92, r: 6 },
      back: [leg([[62, 80], [62.4, 87], [62.6, 93.3]], 5, 4.4, 'legFar')],
      front: [haunch(31, 77, 12.4, 10.4), foot(22, 44), leg([[67.4, 80], [67.8, 87], [68, 93.3]], 5.6, 4.8, 'leg')],
      tail: cotton(19, 70),
      contact: { cx: 46, rx: 29 },
      neck: { x: 66, y: 65, w: 9, r: 18 },
    },
    walk: {
      body: SIDE,
      frame: { x: 17, y: 55, w: 58, h: 33 },
      head: { x: 70, y: 53, s: 0.92, r: 6 },
      back: [leg([[62, 80], [64.4, 87], [67, 93.3]], 5, 4.4, 'legFar')],
      front: [haunch(31, 77, 12.4, 10.4), foot(26, 48), leg([[67.4, 80], [71, 87], [74.6, 93.3]], 5.6, 4.8, 'leg')],
      frameB: {
        back: [leg([[62, 80], [60, 87], [57.6, 93.3]], 5, 4.4, 'legFar')],
        front: [haunch(31, 77, 12.4, 10.4), foot(14, 36), leg([[67.4, 80], [64.8, 87], [62, 93.3]], 5.6, 4.8, 'leg')],
      },
      tail: cotton(19, 70),
      contact: { cx: 46, rx: 30 },
      neck: { x: 66, y: 65, w: 9, r: 18 },
    },
    sleep: {
      body: LOAF,
      frame: { x: 14, y: 60, w: 64, h: 35 },
      head: { x: 65, y: 67, s: 0.94, r: 8 },
      front: [paw(70, 92.2, 4.4, 2.4)],
      tail: cotton(17.6, 83),
      contact: { cx: 46, rx: 32 },
      neck: { x: 64, y: 80, w: 9, r: 0 },
      eyesClosed: true,
    },
  },
};

/** Where the ears pivot (their base on the head), for laying them back or pricking them up. */
export const EAR_BASE: P = [-2, -10];
