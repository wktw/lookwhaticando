import { ellipse, rrect, tube, type P } from '../shape';
import { leg, type Layer, type SpeciesRig, type TailRig } from '../rig';

/**
 * Cow (a small calf): a rounded-block head with a wide pale muzzle and two horn nubs, a
 * rounded-rectangle body, knobbly-kneed legs with dark hooves, a thin tail with a tuft.
 * Geometry follows the approved style frames (Pz_poses: the Holstein calf, the Belted Galloway,
 * the cow loaf), mirrored to face right.
 */

/** The head in its own frame: 28 wide, 30 tall. */
export const COW_HEAD = 'M-2 -15H2C8.6 -15 14 -9.6 14 -3V3C14 9.6 8.6 15 2 15H-2C-8.6 15 -14 9.6 -14 3V-3C-14 -9.6 -8.6 -15 -2 -15Z';

export const COW_PARTS = {
  muzzle: rrect(-13.6, 3.6, 30, 15, 7.5),
  hornL: 'M-3.2 -13C-2.9 -16.4 -4 -18.7 -6 -18.6C-8.2 -18.4 -9.4 -15.4 -8.6 -11.5Z',
  hornR: 'M3.2 -13C2.9 -16.4 4 -18.7 6 -18.6C8.2 -18.4 9.4 -15.4 8.6 -11.5Z',
  earL: 'M-12.5 -7C-17 -11.4 -22.4 -11.4 -24.6 -8.6C-22.2 -4.8 -17.2 -3.5 -12.5 -4Z',
  earR: 'M12.5 -7C17 -11.4 22.4 -11.4 24.6 -8.6C22.2 -4.8 17.2 -3.5 12.5 -4Z',
  earInL: 'M-14 -6.4C-16.8 -8.6 -20 -8.8 -21.8 -7.8C-20 -6 -17 -5.2 -14 -5.4Z',
  earInR: 'M14 -6.4C16.8 -8.6 20 -8.8 21.8 -7.8C20 -6 17 -5.2 14 -5.4Z',
  earUpL: 'M-12.4 -7.2C-16.4 -12.2 -21.8 -13 -24.2 -10.8C-22.2 -6.6 -17.2 -4.6 -12.6 -4.2Z',
  earUpR: 'M12.4 -7.2C16.4 -12.2 21.8 -13 24.2 -10.8C22.2 -6.6 17.2 -4.6 12.6 -4.2Z',
  /** Brown Swiss: big soft ears. */
  earBigL: 'M-12.5 -7.6C-18 -12.6 -25 -12.4 -27.2 -8.6C-24.6 -3.6 -18 -2.4 -12.5 -3.4Z',
  earBigR: 'M12.5 -7.6C18 -12.6 25 -12.4 27.2 -8.6C24.6 -3.6 18 -2.4 12.5 -3.4Z',
  /** Highland: long horns sweeping out and up. */
  longHornL: 'M-8 -6.6C-14.6 -6.6 -19.8 -10.2 -21.4 -16.4C-21.8 -18.2 -20.6 -19.2 -19.2 -18.2C-17.4 -14.6 -13.8 -11.6 -8.6 -10.8Z',
  longHornR: 'M8 -6.6C14.6 -6.6 19.8 -10.2 21.4 -16.4C21.8 -18.2 20.6 -19.2 19.2 -18.2C17.4 -14.6 13.8 -11.6 8.6 -10.8Z',
  /** Highland: a fringe hanging over the eyes. */
  fringe:
    'M-14.6 -1C-14.6 -8 -9 -12.6 -2 -12.6H2.6C9.6 -12.6 14.6 -8.2 14.6 -1.6C13.4 1.8 11.6 2.2 10.2 0C9 3.2 6.6 3.4 5.2 0.4C3.8 3.6 1.4 3.8 0 0.6C-1.4 3.8 -4 3.6 -5.2 0.4C-6.6 3.2 -9.2 3 -10.4 0C-11.8 2.2 -13.6 1.8 -14.6 -1Z',
};

/** A calf leg: straight, a knobbly knee, a dark hoof. */
function calfLeg(top: P, foot: P, w: number, tone: 'leg' | 'legFar'): Layer {
  const knee: P = [top[0] + (foot[0] - top[0]) * 0.55, top[1] + (foot[1] - top[1]) * 0.55];
  const l = leg([top, knee, foot], w, w * 0.9, tone);
  const hoof = rrect(foot[0] - w * 0.47, foot[1] - 4, w * 0.94, 4.4, [0.8, 1.6]);
  return { ...l, sock: hoof, sockTone: 'hoof' };
}

/** A thin tail with a tuft (the tuft is its tip). */
function cowTail(spine: P[], layer: TailRig['layer'] = 'back'): TailRig {
  const end = spine[spine.length - 1]!;
  const prev = spine[spine.length - 2]!;
  const a = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const tuft: P = [end[0] + Math.cos(a) * 2.2, end[1] + Math.sin(a) * 2.2];
  return {
    d: tube(spine, 1.9, 1.5),
    tip: tube([end, tuft], 3.8, 3.2),
    tuft: true,
    pivot: spine[0]!,
    layer,
    lit: false,
  };
}

const STAND = rrect(14, 44, 52, 28, 11.5);
const LIE = 'M56 64H24C17 64 12 69 12 76V84C12 90 16 94 22 94H58C64 94 68 90 68 84V76C68 69 63 64 56 64Z';
const LIE_LEGS: Layer[] = [{ d: rrect(46, 87.2, 18, 7, 3.5), tone: 'legFar' }];
const LIE_HOOF: Layer[] = [{ d: rrect(62.6, 89.8, 4.2, 4, [1, 1.6]), tone: 'hoof' }];

export const COW_RIG: SpeciesRig = {
  species: 'cow',
  scale: 0.98,
  head: {
    d: COW_HEAD,
    hat: { x: 0, y: -14.6, w: 19, r: 0 },
    eyes: { y: -1.4, left: -5.4, right: 7.6, r: 2.55 },
    nose: [1.4, 11],
    ear: { x: -11, y: -12, r: -18 },
  },
  poses: {
    sit: {
      // Standing square at rest, head to the viewer: the calf portrait.
      body: rrect(24, 47, 44, 27, 12.5),
      frame: { x: 22, y: 46, w: 48, h: 29 },
      head: { x: 67, y: 44, s: 1.08 },
      back: [calfLeg([37.5, 66], [38, 91.8], 6.4, 'legFar'), calfLeg([59, 66], [59.4, 91.8], 6.4, 'legFar')],
      front: [calfLeg([30.5, 67], [30, 93.6], 7.4, 'leg'), calfLeg([52, 67], [51.8, 93.6], 7.4, 'leg')],
      tail: cowTail([
        [24.6, 52],
        [21.4, 59],
        [21, 67],
        [21.8, 72.6],
      ]),
      contact: { cx: 46, rx: 28 },
      neck: { x: 64, y: 58.5, w: 10, r: -4 },
    },
    stand: {
      body: STAND,
      frame: { x: 12, y: 43, w: 56, h: 30 },
      head: { x: 74, y: 42, s: 1 },
      back: [calfLeg([20.8, 64], [21, 91.4], 6.4, 'legFar'), calfLeg([54.3, 64], [54.5, 91.4], 6.4, 'legFar')],
      front: [calfLeg([27.4, 66], [27.4, 93.6], 7.2, 'leg'), calfLeg([60.4, 66], [60.6, 93.6], 7.2, 'leg')],
      tail: cowTail([
        [14.6, 50],
        [11.2, 56],
        [10.6, 64],
        [11.4, 70.2],
      ]),
      contact: { cx: 42, rx: 31 },
      neck: { x: 67, y: 56, w: 10, r: -8 },
    },
    walk: {
      body: STAND,
      frame: { x: 12, y: 43, w: 56, h: 30 },
      head: { x: 74.4, y: 43, s: 1, r: 3 },
      back: [calfLeg([20.8, 64], [24.4, 91.4], 6.4, 'legFar'), calfLeg([54.3, 64], [50.6, 91.4], 6.4, 'legFar')],
      front: [calfLeg([27.4, 66], [23.2, 93.6], 7.2, 'leg'), calfLeg([60.4, 66], [64.6, 93.6], 7.2, 'leg')],
      frameB: {
        back: [calfLeg([20.8, 64], [17.4, 91.4], 6.4, 'legFar'), calfLeg([54.3, 64], [58, 91.4], 6.4, 'legFar')],
        front: [calfLeg([27.4, 66], [31.4, 93.6], 7.2, 'leg'), calfLeg([60.4, 66], [56.6, 93.6], 7.2, 'leg')],
      },
      tail: cowTail([
        [14.6, 50],
        [10.6, 55.6],
        [9, 63.4],
        [9.2, 69.6],
      ]),
      contact: { cx: 42, rx: 31 },
      neck: { x: 67.4, y: 56.6, w: 10, r: -6 },
      motion: 'bob',
    },
    loaf: {
      body: LIE,
      frame: { x: 10, y: 63, w: 60, h: 32 },
      head: { x: 75.5, y: 58.5, s: 1 },
      front: [...LIE_LEGS, ...LIE_HOOF],
      tail: cowTail(
        [
          [13, 78],
          [8.6, 83],
          [8.6, 90],
          [12.4, 93.2],
        ],
        'front',
      ),
      contact: { cx: 42, rx: 32 },
      neck: { x: 67, y: 72, w: 10, r: -6 },
    },
    sleep: {
      body: LIE,
      frame: { x: 10, y: 63, w: 60, h: 32 },
      head: { x: 79, y: 76.5, s: 0.9, r: 20 },
      front: [...LIE_LEGS, ...LIE_HOOF],
      tail: cowTail(
        [
          [13, 78],
          [8.6, 83],
          [8.6, 90],
          [12.4, 93.2],
        ],
        'front',
      ),
      contact: { cx: 44, rx: 33 },
      neck: { x: 67, y: 80, w: 9, r: 10 },
      eyesClosed: true,
    },
  },
};

/** The ≤ 20 px cow: body, head with horns, muzzle. */
export const COW_SPRITE = {
  body: `${rrect(40, 46, 50, 30, 13)}M46 70H56V93H46ZM76 70H86V93H76Z`,
  head: `${rrect(8, 24, 38, 42, 16)}M14 28C12 20 15 15 19 15C22 15 23 20 22 26ZM40 28C42 20 39 15 35 15C32 15 31 20 32 26ZM10 36C3 30 -3 34 1 38C4 41 8 41 10 40ZM44 36C51 30 57 34 53 38C50 41 46 41 44 40Z`,
  muzzle: rrect(5, 48, 44, 22, 11),
  eyes: [ellipse(18, 40, 3.2, 3.4), ellipse(36, 40, 3.2, 3.4)],
};
