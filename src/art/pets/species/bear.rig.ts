import { circle, ellipse } from '../shape';
import { leg, type Layer, type SpeciesRig } from '../rig';

/**
 * Bear (a cub): a round head with round ears and a pale muzzle, heavy shoulders, thick legs. It
 * sits like a person with its feet out, lies on its tummy with the head up, stands on all fours
 * with the shoulders high, and sleeps on its tummy with the chin down.
 */

export const BEAR_HEAD = 'M0 -14.5C8.8 -14.5 15.5 -8.2 15.5 0C15.5 8.4 8.8 14.5 0 14.5C-8.8 14.5 -15.5 8.4 -15.5 0C-15.5 -8.2 -8.8 -14.5 0 -14.5Z';

export const BEAR_PARTS = {
  earNear: circle(-10.2, -10.6, 5.4),
  earFar: circle(8.6, -12, 5),
  earNearIn: circle(-10, -10.4, 2.8),
  earFarIn: circle(8.5, -11.8, 2.5),
  muzzle: ellipse(8.4, 5.4, 8.2, 6.2),
};

const SIT = 'M50 52C63 52 71 62 71 75C71 86 65 94 55 94H35C25 94 20 86 20.6 76C21.4 62 36 52 50 52Z';
const LIE = 'M60 66C70 67 76 74 76 83C76 90 71 94 63 94H28C21 94 16 90 16 83C16 74 24 66 34 65C43 64 52 65 60 66Z';
const SIDE = 'M30 58C38 53 52 51 62 53C71 55 77 61 77 69C77 76 73 80 65 80.6L33 81C25 81 20 75 20.6 68C21 63 24.6 60 30 58Z';

const sole = (x: number, y: number): Layer => ({ d: ellipse(x, y, 5.2, 4.2), tone: 'leg', sock: ellipse(x + 0.6, y + 0.4, 3, 2.6), sockTone: 'muzzle' });
const stub = { d: circle(21.4, 66, 3.2), tip: circle(21.4, 66, 3.2), pivot: [21.4, 66] as const, layer: 'back' as const, lit: false };

export const BEAR_RIG: SpeciesRig = {
  species: 'bear',
  scale: 0.9,
  head: {
    d: BEAR_HEAD,
    hat: { x: -0.6, y: -14.2, w: 17, r: 0 },
    eyes: { y: -2.4, left: -3.6, right: 7.4, r: 2.3 },
    nose: [13.6, 2.6],
    ear: { x: -10, y: -10, r: -30 },
  },
  poses: {
    sit: {
      body: SIT,
      frame: { x: 18, y: 92, a: -64, w: 48, h: 46 },
      head: { x: 57, y: 41, s: 1.02 },
      back: [leg([[64, 64], [66, 75], [66.4, 84]], 7, 6.4, 'legFar')],
      front: [
        { d: ellipse(38, 84, 13, 10), tone: 'leg', lit: true },
        sole(52, 89.4),
        leg([[57.4, 63], [59.8, 74], [60.4, 84.4]], 8, 7, 'leg'),
      ],
      tail: { ...stub, d: circle(21, 88, 3), tip: circle(21, 88, 3), pivot: [21, 88] },
      contact: { cx: 46, rx: 27 },
      neck: { x: 57, y: 55.5, w: 10.5, r: -6 },
    },
    loaf: {
      body: LIE,
      frame: { x: 14, y: 64, w: 64, h: 31 },
      head: { x: 67.5, y: 58.5, s: 0.96 },
      back: [leg([[58, 86], [70, 88.6], [79, 89]], 7, 6.4, 'legFar')],
      front: [{ d: ellipse(28, 85, 12, 9), tone: 'leg', lit: true }, leg([[60, 88.4], [73, 91], [82, 91.4]], 8, 7, 'leg')],
      tail: { ...stub, d: circle(16.6, 80, 3), tip: circle(16.6, 80, 3), pivot: [16.6, 80] },
      contact: { cx: 48, rx: 34 },
      neck: { x: 66, y: 72.6, w: 10, r: -8 },
    },
    stand: {
      body: SIDE,
      frame: { x: 19, y: 51, w: 59, h: 31 },
      head: { x: 75, y: 55, s: 0.9, r: 4 },
      back: [leg([[37, 72], [37.6, 83], [38, 93.3]], 9, 7.6, 'legFar'), leg([[61, 72], [61.2, 83], [61.4, 93.3]], 8.6, 7.4, 'legFar')],
      front: [leg([[29, 70], [28.6, 82], [29.4, 93.3]], 12, 8.6, 'leg'), leg([[68.4, 72], [68.8, 83], [69, 93.3]], 9.8, 8.4, 'leg')],
      tail: stub,
      contact: { cx: 49, rx: 29 },
      neck: { x: 70, y: 66, w: 10, r: 20 },
    },
    walk: {
      body: SIDE,
      frame: { x: 19, y: 51, w: 59, h: 31 },
      head: { x: 75.4, y: 56, s: 0.9, r: 6 },
      back: [leg([[37, 72], [40, 83], [43, 93.3]], 9, 7.6, 'legFar'), leg([[61, 72], [59, 83], [56.6, 93.3]], 8.6, 7.4, 'legFar')],
      front: [leg([[29, 70], [26.4, 82], [23.4, 93.3]], 12, 8.6, 'leg'), leg([[68.4, 72], [71, 83], [74, 93.3]], 9.8, 8.4, 'leg')],
      frameB: {
        back: [leg([[37, 72], [35, 83], [32.6, 93.3]], 9, 7.6, 'legFar'), leg([[61, 72], [63.4, 83], [66, 93.3]], 8.6, 7.4, 'legFar')],
        front: [leg([[29, 70], [31.4, 82], [34.6, 93.3]], 12, 8.6, 'leg'), leg([[68.4, 72], [66.6, 83], [64.4, 93.3]], 9.8, 8.4, 'leg')],
      },
      tail: stub,
      contact: { cx: 49, rx: 30 },
      neck: { x: 70.4, y: 67, w: 10, r: 22 },
    },
    sleep: {
      body: LIE,
      frame: { x: 14, y: 64, w: 64, h: 31 },
      head: { x: 68, y: 74, s: 0.92, r: 14 },
      back: [leg([[58, 86], [70, 88.6], [79, 89]], 7, 6.4, 'legFar')],
      front: [{ d: ellipse(28, 85, 12, 9), tone: 'leg', lit: true }, leg([[60, 88.4], [73, 91], [82, 91.4]], 8, 7, 'leg')],
      tail: { ...stub, d: circle(16.6, 80, 3), tip: circle(16.6, 80, 3), pivot: [16.6, 80] },
      contact: { cx: 48, rx: 34 },
      neck: { x: 66, y: 84, w: 9, r: 10 },
      eyesClosed: true,
    },
  },
};
