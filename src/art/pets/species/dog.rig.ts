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

/**
 * A flat-faced skull (French Bulldog): broad and square-jawed, about 1.15× the width of the round
 * head, with the muzzle inside the outline rather than standing out from it.
 */
export const DOG_FLAT_HEAD =
  'M0 -15.5C10.4 -15.5 17.8 -9.4 17.8 -0.6C17.8 5.6 16.6 10.6 13 13.6C9.6 16.4 5 16.8 0 16.8C-5 16.8 -9.6 16.4 -13 13.6C-16.6 10.6 -17.8 5.6 -17.8 -0.6C-17.8 -9.4 -10.4 -15.5 0 -15.5Z';

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
  /* The French Bulldog's bat ears: broad at the base, round-tipped, set wide on the skull. */
  frenchNear: 'M-17 -4.6C-19.8 -10 -20.2 -17.2 -17.8 -21.6C-16.2 -24.4 -12.8 -24.8 -10.6 -22.6C-7.6 -19.6 -5 -16.2 -3.6 -13.2Z',
  frenchFar: 'M4.2 -14.2C6.4 -18.2 9.4 -21.6 12.8 -23.2C15.4 -24.4 18 -23.2 18.6 -20.4C19.4 -16 18.6 -10.8 16.6 -5.4Z',
  frenchNearIn: 'M-15.4 -7.6C-17.2 -11.8 -17.6 -16.8 -16 -19.8C-14.8 -21.6 -12.8 -21.4 -11.6 -20C-9.6 -17.8 -7.8 -15.4 -6.6 -12.8Z',
  frenchFarIn: 'M7.2 -14C9 -17 11.2 -19.4 13.4 -20.6C15 -21.2 16.2 -20.4 16.4 -18.8C16.8 -15.8 16.2 -12.4 15.2 -9.2Z',
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
/**
 * The French Bulldog: a compact brick. The flat-faced skull, sat larger on the body; a short,
 * deep barrel on short, thick legs; a broad chest in the sit.
 */
function buildFrench(): SpeciesRig {
  const base = build(false, true);
  const legs = (h0: number, h1: number, f0: number, f1: number, far = false): Layer[] =>
    far
      ? [leg([[40, 78], [(40 + h0) / 2, 86], [h0, 93.3]], 8.6, 7.2, 'legFar'), leg([[59, 78], [(59 + f0) / 2, 86], [f0, 93.3]], 8.4, 7.2, 'legFar')]
      : [leg([[31, 75.6], [(31 + h1) / 2, 85], [h1, 93.3]], 12, 8.4, 'leg'), leg([[67, 76.4], [(67 + f1) / 2, 85], [f1, 93.3]], 10, 8.4, 'leg')];
  const stand =
    'M30 59C40 56.2 56 56.4 64 57.6C71 58.6 75.8 64 75.4 71C75 78 71 83.8 64 84.2C58 84.6 54 81.4 48 81.2C42 81 38 82.8 33 82.4C26.6 81.8 23.2 76.2 23.4 70.2C23.6 64.2 25.8 60.4 30 59Z';
  const frame = { x: 23, y: 56, w: 53, h: 29 };
  const head = { x: 71.6, y: 50.4, s: 1, r: 2 };
  const tail = base.poses.stand.tail!;
  const neck = { x: 66, y: 67, w: 10.4, r: 14 };
  return {
    ...base,
    scale: 0.86,
    head: {
      d: DOG_FLAT_HEAD,
      hat: { x: 0, y: -15, w: 20, r: 0 },
      eyes: { y: -3.2, left: -3.6, right: 12.4, r: 2.6 },
      nose: [5.8, 1.8],
      ear: { x: -11, y: -12, r: -20 },
      top: -24.6,
      wide: 20,
    },
    poses: {
      ...base.poses,
      sit: {
        body: 'M52 56C63 56 71 63 71 73C71 80 69.4 87 67.4 91C66.4 93.2 64.4 94 61.4 94L31 94C25 94 21 90.4 21.6 85C22.4 76 30 65.4 40 60C44 57.4 48 56 52 56Z',
        frame: { x: 19, y: 92, a: -62, w: 44, h: 48 },
        head: { x: 60.6, y: 44.6, s: 1.02 },
        back: [leg([[67.4, 72], [67.8, 83], [68.4, 93.3]], 8.4, 7.4, 'legFar')],
        front: [
          { d: ellipse(35, 85, 13.4, 9.4), tone: 'coat', lit: true },
          { d: rrect(35.6, 89, 15.6, 5, 2.5), tone: 'leg', sock: rrect(41.6, 89, 9.6, 5, 2.5) },
          leg([[60.6, 72], [61, 83], [61.4, 93.3]], 10.4, 8.4, 'leg'),
        ],
        tail: base.poses.sit.tail,
        tailCurl: base.poses.sit.tailCurl,
        contact: { cx: 46, rx: 28 },
        neck: { x: 59.6, y: 61, w: 11.6, r: -8 },
      },
      loaf: {
        ...base.poses.loaf,
        body: 'M28 73C36 67.6 52 66 61 68.6C69 71 73 77 72.4 84.4C71.8 90 68.4 94 62 94L30 94C23 94 19.4 90 19.8 84.4C20.2 78.6 22.6 75.2 28 73Z',
        frame: { x: 19, y: 66, w: 54, h: 29 },
        head: { x: 64.4, y: 58.6, s: 1 },
        back: [leg([[58, 86], [68, 88.6], [77, 89]], 7.6, 6.8, 'legFar')],
        front: [{ d: ellipse(31, 85, 11.4, 8.6), tone: 'coat', lit: true }, leg([[60, 88.6], [70, 91], [79, 91.4]], 8.4, 7.4, 'leg')],
        contact: { cx: 48, rx: 32 },
        neck: { x: 63, y: 73.4, w: 10.4, r: -10 },
      },
      stand: {
        ...base.poses.stand,
        body: stand,
        frame,
        head,
        back: legs(39.4, 0, 59.4, 0, true),
        front: legs(0, 30, 0, 68),
        tail,
        contact: { cx: 49, rx: 27 },
        neck,
      },
      walk: {
        ...base.poses.walk,
        body: stand,
        frame,
        head: { ...head, r: 0.5 },
        back: legs(43.4, 0, 55.6, 0, true),
        front: legs(0, 26.4, 0, 72),
        frameB: { back: legs(35.6, 0, 63, 0, true), front: legs(0, 34, 0, 64.6) },
        tail,
        contact: { cx: 49, rx: 28 },
        neck,
      },
    },
  };
}

export const DOG_FLAT_RIG = buildFrench();
