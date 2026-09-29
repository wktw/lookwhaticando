import { ellipse, rrect, tube, twoCircles } from '../shape';
import { type Layer, type SpeciesRig } from '../rig';

/**
 * Frog: a wide half-disc with two eye bumps (DESIGN style frames: "a wide half-disc with two eye
 * bumps"), a pale throat, a folded haunch, front feet planted. The head frame's shape is the two
 * eye bumps as one outline; the mouth line and throat sit just below it on the body.
 */

export const FROG_HEAD = twoCircles([-8.5, -1], 10, [9, 2.5], 8.6);

/** A foot on the ground, in the foot tone (a red-eyed tree frog's orange toes). */
const foot = (x: number, y: number, w: number, h: number, tone: 'leg' | 'legFar' = 'leg'): Layer => ({ d: rrect(x, y, w, h, h / 2), tone: tone === 'leg' ? 'foot' : 'footFar' });

const SIT = 'M78 93.5C81 93.5 82 91 82 88C81 71 67 58.5 50 58.5C33 58.5 19 71 18 88C18 91 19 93.5 22 93.5Z';
const CROUCH = 'M80 93.5C83 93.5 84 91 84 88.5C83 76.5 69 67 50 67C31 67 17 76.5 16 88.5C16 91 17 93.5 20 93.5Z';
const SIDE = 'M22 86C17 82 17 72 25 66.5C34 60.5 52 59 64 62C73 64.3 79 70 79 77C79 84 73 88 63 88.4L28 88.4C25 88.4 23.4 87.2 22 86Z';

/** The folded hind leg, per pose: drawn inside the body (a darker thigh) plus its long foot. */
export const FROG_HAUNCH = {
  sit: ellipse(29, 84, 13, 10.5),
  loaf: ellipse(27, 86, 13.5, 9.5),
  sleep: ellipse(27, 86, 13.5, 9.5),
  stand: ellipse(31, 79, 12, 9),
  walk: ellipse(31, 79, 12, 9),
};

export const FROG_RIG: SpeciesRig = {
  species: 'frog',
  scale: 0.62,
  head: {
    d: FROG_HEAD,
    hat: { x: -8.6, y: -10.4, w: 13, r: -6 },
    eyes: { y: -0.1, left: -6.4, right: 10.4, r: 2.8 },
    nose: [6, 9.4],
    ear: { x: -9, y: -9.5, r: -10 },
    top: -11,
  },
  poses: {
    sit: {
      body: SIT,
      frame: { x: 16, y: 57, w: 68, h: 38 },
      head: { x: 58, y: 57.5, s: 1 },
      back: [foot(16.6, 89.4, 13.6, 4.8, 'legFar')],
      front: [foot(51.4, 89.4, 9.8, 5, 'leg'), foot(65, 88.8, 9.8, 5.4, 'leg')],
      contact: { cx: 50, rx: 33 },
      neck: { x: 60, y: 76.5, w: 14, r: -2 },
      depth: { body: 4.4 },
    },
    loaf: {
      body: CROUCH,
      frame: { x: 14, y: 66, w: 72, h: 29 },
      head: { x: 58, y: 66, s: 0.96 },
      front: [foot(55, 90.4, 8.6, 4, 'leg'), foot(67.6, 90, 8.6, 4.2, 'leg')],
      contact: { cx: 50, rx: 35 },
      neck: { x: 60, y: 79.4, w: 12, r: -2 },
      depth: { body: 4 },
    },
    stand: {
      body: SIDE,
      frame: { x: 17, y: 59, w: 63, h: 30 },
      head: { x: 64.5, y: 60.5, s: 0.94, r: 4 },
      back: [{ d: tube([[60, 80], [60.4, 87], [60.6, 92.6]], 4.6, 4), tone: 'legFar' }, foot(56.4, 90.2, 8, 3.6, 'legFar')],
      front: [
        { d: tube([[26, 85], [36, 90.6], [45, 92.6]], 5.4, 4.2), tone: 'leg' },
        { d: tube([[68, 79], [69.4, 86.6], [70.2, 92.4]], 5.2, 4.4), tone: 'leg' },
        foot(66, 90.4, 9.6, 3.6, 'leg'),
        foot(42.4, 90.4, 9, 3.6, 'leg'),
      ],
      contact: { cx: 48, rx: 32 },
      neck: { x: 68, y: 74, w: 12, r: 10 },
    },
    walk: {
      body: SIDE,
      frame: { x: 17, y: 59, w: 63, h: 30 },
      head: { x: 64.5, y: 60.5, s: 0.94, r: 2 },
      back: [{ d: tube([[60, 80], [58.6, 87], [57, 92.6]], 4.6, 4), tone: 'legFar' }, foot(52.6, 90.2, 8, 3.6, 'legFar')],
      front: [
        { d: tube([[26, 85], [36, 90.6], [45, 92.6]], 5.4, 4.2), tone: 'leg' },
        { d: tube([[68, 79], [71, 86.4], [73.6, 92.4]], 5.2, 4.4), tone: 'leg' },
        foot(69.6, 90.4, 9.6, 3.6, 'leg'),
        foot(42.4, 90.4, 9, 3.6, 'leg'),
      ],
      frameB: {
        back: [{ d: tube([[60, 80], [62, 87], [64, 92.6]], 4.6, 4), tone: 'legFar' }, foot(60, 90.2, 8, 3.6, 'legFar')],
        front: [
          { d: tube([[26, 85], [33, 91], [40, 92.6]], 5.4, 4.2), tone: 'leg' },
          { d: tube([[68, 79], [67.6, 86.4], [66.8, 92.4]], 5.2, 4.4), tone: 'leg' },
          foot(62.6, 90.4, 9.6, 3.6, 'leg'),
          foot(37.4, 90.4, 9, 3.6, 'leg'),
        ],
      },
      contact: { cx: 48, rx: 32 },
      neck: { x: 68, y: 74, w: 12, r: 10 },
    },
    sleep: {
      body: CROUCH,
      frame: { x: 14, y: 66, w: 72, h: 29 },
      head: { x: 57, y: 68.5, s: 0.94, r: 4 },
      contact: { cx: 50, rx: 35 },
      neck: { x: 59, y: 85, w: 14, r: 2 },
      eyesClosed: true,
      depth: { body: 4 },
    },
  },
};
