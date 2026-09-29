import { circle, ellipse } from '../shape';
import { leg, type Layer, type SpeciesRig } from '../rig';

/**
 * Hamster: very small and very round. A head with full cheeks and little round ears on a round
 * body; it sits up on its haunches with its paws at its chest, rolls into a ball, trots on tiny
 * legs, and sleeps curled with its face tucked.
 */

export const HAMSTER_HEAD =
  'M0 -12C7.6 -12 13 -6.8 13.4 -0.4C14.8 2 15 6 12.4 9C9.4 12.4 4.8 12.8 0 12.8C-4.8 12.8 -9.4 12.4 -12.4 9C-15 6 -14.8 2 -13.4 -0.4C-13 -6.8 -7.6 -12 0 -12Z';

export const HAMSTER_PARTS = {
  earNear: circle(-8.4, -9.2, 3.9),
  earFar: circle(7, -10.4, 3.5),
  earNearIn: circle(-8.2, -9, 2.1),
  earFarIn: circle(7, -10.2, 1.8),
  /** Stuffed cheeks, for chewing. */
  cheeks: `${ellipse(-11, 5, 5.6, 5)}${ellipse(12.6, 4.6, 5.4, 4.8)}`,
};

const paw = (x: number, y: number, tone: Layer['tone'] = 'leg'): Layer => ({ d: ellipse(x, y, 2.9, 2.2), tone, sock: ellipse(x, y, 2.9, 2.2) });
const tiny = (top: readonly [number, number], foot: readonly [number, number], tone: 'leg' | 'legFar'): Layer => leg([top, [(top[0] + foot[0]) / 2, (top[1] + foot[1]) / 2], foot], 4.6, 4, tone, 2.4);

const SIT = 'M48 56C60 56 68 64 68.6 75C69.2 86 63 94 53 94H38C28 94 23 88 23.4 78C24 66 34 56 48 56Z';
const BALL = ellipse(46, 80, 25, 14.5);
const TROT = ellipse(46, 76.5, 26, 14);

export const HAMSTER_RIG: SpeciesRig = {
  species: 'hamster',
  scale: 0.56,
  head: {
    d: HAMSTER_HEAD,
    hat: { x: -0.6, y: -11.6, w: 14, r: 0 },
    eyes: { y: -1.6, left: -3.6, right: 6.2, r: 2.1 },
    nose: [11, 3],
    ear: { x: -8, y: -8, r: -20 },
  },
  poses: {
    sit: {
      body: SIT,
      frame: { x: 20, y: 92, a: -66, w: 42, h: 44 },
      head: { x: 56, y: 47.5, s: 1.04 },
      front: [paw(38, 91.8), paw(55.4, 92), paw(61.4, 71, 'leg'), paw(64.6, 73.4, 'legFar')],
      contact: { cx: 46, rx: 24 },
      neck: { x: 56, y: 59.5, w: 9, r: -6 },
    },
    loaf: {
      body: BALL,
      frame: { x: 20, y: 65, w: 52, h: 30 },
      head: { x: 64, y: 72.5, s: 1 },
      front: [paw(52, 92.8), paw(62, 92.6)],
      contact: { cx: 47, rx: 27 },
      neck: { x: 62, y: 84, w: 8, r: -8 },
    },
    stand: {
      body: TROT,
      frame: { x: 20, y: 62, w: 52, h: 29 },
      head: { x: 67, y: 70, s: 0.98, r: 4 },
      back: [tiny([38, 86], [38.6, 93.4], 'legFar'), tiny([56, 86], [56.4, 93.4], 'legFar')],
      front: [tiny([30, 85], [30, 93.4], 'leg'), tiny([62, 86], [62.4, 93.4], 'leg')],
      contact: { cx: 47, rx: 26 },
      neck: { x: 63, y: 81, w: 8, r: 10 },
    },
    walk: {
      body: TROT,
      frame: { x: 20, y: 62, w: 52, h: 29 },
      head: { x: 67, y: 70.5, s: 0.98, r: 3 },
      back: [tiny([38, 86], [41, 93.4], 'legFar'), tiny([56, 86], [53.4, 93.4], 'legFar')],
      front: [tiny([30, 85], [27, 93.4], 'leg'), tiny([62, 86], [65.4, 93.4], 'leg')],
      frameB: {
        back: [tiny([38, 86], [35.4, 93.4], 'legFar'), tiny([56, 86], [59, 93.4], 'legFar')],
        front: [tiny([30, 85], [33.4, 93.4], 'leg'), tiny([62, 86], [59, 93.4], 'leg')],
      },
      contact: { cx: 47, rx: 26 },
      neck: { x: 63, y: 81, w: 8, r: 10 },
    },
    sleep: {
      body: BALL,
      frame: { x: 20, y: 65, w: 52, h: 30 },
      head: { x: 63, y: 80, s: 0.9, r: 24 },
      contact: { cx: 47, rx: 27 },
      neck: { x: 58, y: 88, w: 7, r: 20 },
      eyesClosed: true,
      depth: { body: 3.8 },
    },
  },
};
