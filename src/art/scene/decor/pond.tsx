/**
 * No. 04 Pond decor: a lily pad (lies flat), a tin watering can and a rubber duck.
 * Standing on y = 92 of the 100×100 canvas.
 */
import { INK, cast, contact, flat, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, ellPts, poly, smooth, type Pt } from './geo';

/* ---------------- Lily pad: one pad, with room for one ---------------- */

const PAD = { top: '#9CBF8A', edge: '#7FA56F', vein: '#B7D3A5', drop: '#DCEBF3' };

/** A round pad with its narrow slit toward the front right, seen from low down. */
const PAD_C: Pt = [51, 76.6];
const padOutline = (dy: number) => `${smooth(ellPts(50, 76 + dy, 44, 15.6, 64, 412, 16), false)}L${PAD_C[0]} ${PAD_C[1] + dy}Z`;

const pad = shapes('decor-lily-pad', {
  under: { d: padOutline(2.2), k: 0 },
  pad: { d: padOutline(0), k: 0.25 },
});

export const lilyPad: DecorRenderer = (o) => {
  const p = paint(o);
  const veins = [
    [91, 72],
    [78, 88],
    [40, 90.4],
    [14, 82],
    [12, 70],
    [30, 62.6],
    [54, 60.8],
    [78, 63],
  ].map(([x, y]) => `M${PAD_C[0]} ${PAD_C[1]}L${x} ${y}`);
  return (
    <g>
      {contact(p, 50, 92.2, 45, 2.2)}
      {flat(p, pad.under, PAD.edge)}
      {solid(p, pad.pad, PAD.top, thin(p, veins.join(''), PAD.vein, 1.1))}
      <ellipse cx={66} cy={70.5} rx={3.2} ry={2.4} fill={p.c(PAD.drop)} opacity={0.9} />
      <ellipse cx={65} cy={69.8} rx={1} ry={0.7} fill="#fff" opacity={0.8} />
    </g>
  );
};

/* ---------------- Tin watering can: holds exactly enough for one leaf ---------------- */

const TIN = { body: '#BCC6CE', band: '#D3DADF', dark: '#8F9BA6', rose: '#A9B4BE' };

const can = shapes('decor-watering-can', {
  handle: { d: 'M34 44C34 22 66 22 66 44H60.5C60.5 29 39.5 29 39.5 44Z', k: 0.5 },
  spout: {
    d: poly(
      [
        [62, 74],
        [86.5, 37],
        [90.5, 39.6],
        [67, 81],
      ],
      1.5,
    ),
    k: 0.5,
  },
  rose: { d: ell(89.4, 36.2, 5.6, 3.6, -34), k: 0.4 },
  body: 'M29 46H71L69.4 88.4C69.3 90.4 68 91.6 66 91.6H34C32 91.6 30.7 90.4 30.6 88.4Z',
  lip: { d: ell(50, 46, 21.5, 4.2), k: 0.3 },
});

export const wateringCan: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 52, 92.4, 30, 2.4)}
      {solid(p, can.handle, TIN.body)}
      {solid(p, can.spout, TIN.body)}
      {solid(p, can.rose, TIN.rose)}
      {solid(p, can.body, TIN.body, [
        <path d="M30 58.5H70L69.9 62H30.1Z" fill={p.c(TIN.band)} />,
        <path d="M30.5 80H69.5L69.4 83.4H30.6Z" fill={p.c(TIN.band)} />,
      ])}
      {solid(p, can.lip, TIN.band)}
      <ellipse cx={50} cy={46.6} rx={17} ry={2.6} fill={p.c(TIN.dark)} />
    </g>
  );
};

/* ---------------- Rubber duck: the ducks find it very confusing ---------------- */

const DUCK = { body: '#F7D46C', wing: '#EFC35A', beak: '#F0A15E' };

const duck = shapes('decor-rubber-duck', {
  body: smooth([
    [14, 64],
    [30, 60.6],
    [52, 62],
    [70, 60],
    [86, 46],
    [90, 50],
    [88, 70],
    [76, 86.6],
    [52, 91.6],
    [28, 90],
    [14, 80],
  ]),
  head: ell(36, 40, 19, 18.5),
  beak: {
    d: smooth([
      [18.6, 42],
      [9.6, 42.6],
      [5.6, 46.4],
      [9.6, 49.6],
      [19, 49],
    ]),
    k: 0.4,
  },
  wing: {
    d: smooth([
      [46, 70],
      [60, 66],
      [74, 67.4],
      [70, 76.6],
      [56, 79],
    ]),
    k: 0.5,
  },
});

export const rubberDuck: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 38, 2.4)}
      {solid(p, duck.body, DUCK.body)}
      {solid(p, duck.wing, DUCK.wing)}
      {solid(p, duck.head, DUCK.body)}
      {solid(p, duck.beak, DUCK.beak)}
      {cast(p, 'M9.6 45.8Q14 47 19 46.2L19 49Q13 49.8 9.6 49.6Z', 0.6)}
      <circle cx={31.5} cy={35} r={2.4} fill={p.c(INK)} />
    </g>
  );
};
