import { ellipse, fmt, rrect } from '../shape';
import { leg, tailRig, type Layer, type SpeciesRig, type TailRig } from '../rig';
import type { P } from '../shape';

/**
 * Dog (a puppy): a round skull with a muzzle, ears by breed (floppy, pointy, bat, long), a dog's
 * sit back on the haunches with straight forelegs, a sphinx lie, a side-on stand, and a curled
 * sleep with the chin on the paws. Long-bodied breeds (dachshund, corgi) use their own rig: a
 * longer back on shorter legs.
 */

export const DOG_HEAD =
  'M0 -15.5C8.6 -15.5 15.5 -8.6 15.5 -1C15.5 0 16 1 17.5 1.6C20.5 2.6 22.4 5.4 22 8.6C21.6 12.2 18.6 14.4 14.6 14.6C11.6 14.8 9.6 14.4 7.6 14C4.8 15.4 2.4 15.5 0 15.5C-8.6 15.5 -15.5 8.6 -15.5 0C-15.5 -8.6 -8.6 -15.5 0 -15.5Z';

/** A flat-faced skull (French Bulldog): the same round head with a short, blunt muzzle. */
export const DOG_FLAT_HEAD =
  'M0 -15.5C8.6 -15.5 15.5 -8.6 15.5 -1C15.5 0 16.3 0.8 17.2 1.8C18.8 3.6 19.1 6.8 18.3 9.2C17.3 12.2 14.6 13.8 11.6 14.4C8 15.3 4 15.5 0 15.5C-8.6 15.5 -15.5 8.6 -15.5 0C-15.5 -8.6 -8.6 -15.5 0 -15.5Z';

export const DOG_EARS = {
  floppyNear: 'M-8.8 -13.4C-14.6 -14.2 -19.6 -9.6 -20 -1.6C-20.3 4.4 -18.4 9 -15.2 9.6C-11.8 10.2 -10.4 6.2 -10.6 2C-10.8 -3 -8.6 -8 -5.6 -11.2Z',
  floppyFar: 'M5.4 -13.8C10.4 -15.8 15.6 -13.2 16.8 -8C17.8 -3 16.6 1.2 14.6 1.8C13 -2 11 -6 7 -9.2Z',
  longNear: 'M-8.8 -13.4C-15 -14.4 -20.6 -9.4 -21.4 -1C-22 6 -20.6 15.4 -16.4 16.8C-12.4 18 -10.6 12 -10.6 5.6C-10.6 -1 -8.8 -7.6 -5.6 -11.2Z',
  longFar: 'M5.2 -13.8C10.6 -16.2 16.4 -13.6 17.8 -7.8C18.8 -3 18 2 15.6 3C13.8 -1 11.4 -5.6 7 -9.2Z',
  pointyNear: 'M-12.8 -8.6C-14.8 -14.8 -14.6 -21 -12.4 -26C-11.8 -27.4 -10.2 -27.6 -9.2 -26.6C-6.2 -23.2 -3.4 -18.8 -1.6 -14.6Z',
  pointyFar: 'M3.2 -14.8C6.2 -19.2 9.6 -23 13.2 -25.8C14.4 -26.6 15.8 -26 16 -24.6C16.6 -19.6 16 -14.4 14.2 -9.4Z',
  pointyNearIn: 'M-11 -11.6C-12.2 -16 -12 -20.2 -10.8 -23.4C-8.8 -21 -6.8 -18 -5.4 -14.8Z',
  pointyFarIn: 'M6.2 -14.6C8.4 -17.6 10.8 -20.4 13.4 -22.4C13.8 -19 13.4 -15.4 12.4 -12Z',
  batNear: 'M-13 -7.6C-18.6 -12 -20.6 -19.4 -18.2 -24C-15.8 -28 -9.4 -25.2 -2.6 -14.6Z',
  batFar: 'M3 -15C8.4 -24.8 14.6 -27.6 17.2 -24.2C19.8 -20.2 18.4 -12.6 12.8 -7.6Z',
  batNearIn: 'M-12.2 -10.6C-15.6 -14 -17 -18.8 -15.8 -21.8C-13.4 -21.6 -9.8 -18.6 -6.4 -14Z',
  batFarIn: 'M6.6 -14.8C9.6 -19.8 13 -22.4 15.2 -22C16.4 -19 15.6 -14.6 12 -10.8Z',
};

/**
 * Body geometry by variant: `L` extra length toward the rump, `D` how much lower the back sits.
 * `flat` swaps in the flat-faced skull.
 */
function build(long: boolean, flat = false): SpeciesRig {
  const L = long ? 13 : 0;
  const D = long ? 7 : 0;
  const x = (n: number) => fmt(n - L);
  const y = (n: number) => fmt(n + D);

  const stand = `M${x(28)} ${y(56)}C40 ${y(53)} 58 ${y(53)} 67 ${y(55)}C74 ${y(56.6)} 78 ${y(62)} 77.6 ${y(68)}C77.2 ${y(74)} 73 ${y(78)} 66 ${y(78.6)}C60 ${y(79)} 56 ${y(77.6)} 50 ${y(77.8)}C44 ${y(78)} ${x(40)} ${y(79.4)} ${x(33)} ${y(79)}C${x(25)} ${y(78.6)} ${x(20.6)} ${y(73)} ${x(20.8)} ${y(66.4)}C${x(21)} ${y(60.4)} ${x(23.4)} ${y(57.4)} ${x(28)} ${y(56)}Z`;
  const standHead = { x: 74, y: 46 + D, s: 0.92, r: 3 };
  const legTop = 71 + D;
  const hind = (foot: number, far = false): Layer =>
    far ? leg([[37 - L, legTop + 1], [foot + 0.4, (legTop + 93.3) / 2], [foot, 93.3]], 7.4, 6, 'legFar') : leg([[28 - L, legTop - 1], [foot - 0.4, (legTop + 93.3) / 2], [foot, 93.3]], 10.4, 6.8, 'leg');
  const fore = (foot: number, far = false): Layer =>
    far ? leg([[61, legTop + 1], [(61 + foot) / 2, (legTop + 93.3) / 2], [foot, 93.3]], 7.2, 6, 'legFar') : leg([[69, legTop + 1], [(69 + foot) / 2, (legTop + 93.3) / 2], [foot, 93.3]], 8, 6.6, 'leg');
  const standTail = (tip: P): TailRig =>
    tailRig(
      [
        [22 - L, 60 + D],
        [15 - L, 54 + D],
        tip,
      ],
      4.8,
      3.6,
      [22 - L, 60 + D],
      'back',
    );
  const curl = (at: P, layer: TailRig['layer'] = 'back'): TailRig =>
    tailRig(
      [
        [at[0], at[1]],
        [at[0] - 6, at[1] - 7],
        [at[0] - 3, at[1] - 14],
        [at[0] + 4, at[1] - 13],
        [at[0] + 4.4, at[1] - 7],
      ],
      5.2,
      4.4,
      at,
      layer,
      0.3,
    );

  const sitBody = `M52 ${y(50)}C62 ${y(50)} 68 ${y(58)} 68 ${y(68)}C68 76 66 84 64 90C63 93 61 94 58 94L${x(30)} 94C${x(24)} 94 ${x(20)} 90 ${x(21)} 84C${x(22)} 72 ${x(30)} ${y(60)} ${x(40)} ${y(54)}C${x(44)} ${y(51.4)} 48 ${y(50)} 52 ${y(50)}Z`;
  const loafBody = `M${x(26)} 72C${x(34)} 66 52 64 62 67C70 69 74 76 73 84C72.4 90 69 94 62 94L${x(28)} 94C${x(21)} 94 ${x(17)} 90 ${x(17.4)} 84C${x(17.8)} 78 ${x(20.4)} 74.6 ${x(26)} 72Z`;

  return {
    species: 'dog',
    scale: long ? 0.8 : 0.86,
    head: {
      d: flat ? DOG_FLAT_HEAD : DOG_HEAD,
      hat: { x: 0.4, y: -15, w: 18, r: 0 },
      eyes: { y: -2.2, left: -4.2, right: 8.6, r: 2.5 },
      nose: flat ? [17.2, 4.6] : [20.2, 5.2],
      ear: { x: -9, y: -13, r: -20 },
      top: -27,
      wide: 21.4,
    },
    poses: {
      sit: {
        body: sitBody,
        frame: { x: 18 - L, y: 92, a: -62, w: 52 - D, h: 44 },
        head: { x: 60, y: 38 + D, s: 1 },
        back: [leg([[66, 68 + D], [66.4, 82], [67, 93.3]], 6.6, 5.8, 'legFar')],
        front: [
          { d: ellipse(35 - L * 0.6, 84, 13, 10), tone: 'coat', lit: true },
          { d: rrect(36 - L * 0.6, 89.2, 15, 4.8, 2.4), tone: 'leg', sock: rrect(42 - L * 0.6, 89.2, 9, 4.8, 2.4) },
          leg([[60.5, 67 + D], [60.6, 82], [61, 93.3]], 7.6, 6.6, 'leg'),
        ],
        tail: tailRig(
          [
            [25 - L, 89],
            [16 - L, 91.4],
            [9 - L, 89.4],
          ],
          5,
          3.8,
          [25 - L, 89],
          'back',
        ),
        tailCurl: curl([30 - L * 0.6, 68 + D * 0.5]),
        contact: { cx: 45 - L / 2, rx: 27 + L / 2 },
        neck: { x: 58.5, y: 55 + D, w: 10, r: -8 },
      },
      loaf: {
        body: loafBody,
        frame: { x: 16 - L, y: 64, w: 60 + L, h: 31 },
        head: { x: 66, y: 57, s: 0.96 },
        back: [leg([[58, 85.6], [70, 88.4], [80.6, 88.8]], 6.4, 5.8, 'legFar')],
        front: [{ d: ellipse(29 - L, 84, 11, 9), tone: 'coat', lit: true }, leg([[60, 88.6], [74, 91.2], [84, 91.6]], 7, 6.2, 'leg')],
        tail: tailRig(
          [
            [19 - L, 86],
            [11 - L, 89.6],
            [5 - L, 91],
          ],
          4.8,
          3.8,
          [19 - L, 86],
          'back',
        ),
        tailCurl: curl([22 - L, 76]),
        contact: { cx: 50 - L / 2, rx: 35 + L / 2 },
        neck: { x: 64.5, y: 72, w: 9.5, r: -10 },
      },
      stand: {
        body: stand,
        frame: { x: 20 - L, y: 53 + D, w: 58 + L, h: 27 },
        head: standHead,
        back: [hind(38 - L, true), fore(61.4, true)],
        front: [hind(28.6 - L), fore(69.6)],
        tail: standTail([10 - L, 46 + D]),
        tailCurl: curl([24 - L, 58 + D]),
        contact: { cx: 49 - L / 2, rx: 29 + L / 2 },
        neck: { x: 69, y: 60 + D, w: 9, r: 16 },
      },
      walk: {
        body: stand,
        frame: { x: 20 - L, y: 53 + D, w: 58 + L, h: 27 },
        head: { ...standHead, r: 1 },
        back: [hind(43.4 - L, true), fore(56.6, true)],
        front: [hind(23 - L), fore(75)],
        frameB: { back: [hind(33 - L, true), fore(66, true)], front: [hind(34.4 - L), fore(64.4)] },
        tail: standTail([9 - L, 49 + D]),
        tailCurl: curl([24 - L, 58 + D]),
        contact: { cx: 49 - L / 2, rx: 30 + L / 2 },
        neck: { x: 69, y: 60 + D, w: 9, r: 16 },
      },
      sleep: {
        body: ellipse(46 - L / 2, 81, 26 + L / 2, 13),
        frame: { x: 18 - L, y: 67, w: 56 + L, h: 28 },
        head: { x: 64, y: 81.5, s: 0.74, r: 14 },
        front: [leg([[58, 90], [68, 92], [76, 92.4]], 6, 5.4, 'leg')],
        tail: tailRig(
          [
            [22 - L, 86],
            [29 - L, 92.6],
            [46, 94.4],
            [58, 93.4],
          ],
          5.4,
          4.4,
          [22 - L, 86],
          'front',
        ),
        contact: { cx: 47 - L / 2, rx: 29 + L / 2 },
        neck: { x: 60, y: 88, w: 7, r: 20 },
        eyesClosed: true,
        depth: { body: 3.8 },
      },
    },
  };
}

export const DOG_RIG = build(false);
export const DOG_LONG_RIG = build(true);
export const DOG_FLAT_RIG = build(false, true);
