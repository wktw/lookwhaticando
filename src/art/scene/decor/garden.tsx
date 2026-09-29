/**
 * No. 05 Garden decor: a seed packet torn open at the corner, and three terracotta pots nested
 * and waiting. Standing on y = 92 of the 100×100 canvas.
 */
import { cast, contact, flat, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, leaf, poly, rotate, trap, type Pt } from './geo';

/* ---------------- Seed packet: paper, torn open, a few seeds out ---------------- */

const PACKET = {
  paper: '#F8F0E1',
  band: '#B5CC9C',
  bandInk: '#F8F0E1',
  petal: '#EFB4C1',
  petalDeep: '#E59CAE',
  eye: '#E3A24B',
  stem: '#8DB57A',
  seed: '#8E6A52',
};

/** The packet outline before it leans: a paper rectangle with the top-right corner torn off. */
const PACKET_PTS: Pt[] = [
  [26, 16],
  [62, 16],
  [65, 18.4],
  [67.4, 16.6],
  [70.6, 20],
  [73, 19],
  [74, 22],
  [74, 90],
  [26, 90],
];
const lean = (pts: readonly Pt[]) => rotate(pts, -7, 50, 90);

const seeds = shapes('decor-seed-packet', {
  packet: poly(lean(PACKET_PTS), [1.2, 0, 0, 0, 0, 0, 0, 1.2, 1.2]),
  band: {
    d: poly(
      lean([
        [20, 16],
        [80, 16],
        [80, 31],
        [20, 31],
      ]),
    ),
    k: 0,
    clip: 'packet',
  },
  foot: {
    d: poly(
      lean([
        [20, 80],
        [80, 80],
        [80, 92],
        [20, 92],
      ]),
    ),
    k: 0,
    clip: 'packet',
  },
});

const FLOWER = rotate(
  [0, 72, 144, 216, 288].map((a): Pt => [50 + Math.sin((a * Math.PI) / 180) * 7.6, 53 - Math.cos((a * Math.PI) / 180) * 7.6]),
  -7,
  50,
  90,
);
const CENTRE = rotate([[50, 53]], -7, 50, 90)[0]!;
const STEM = rotate(
  [
    [50, 60],
    [50, 79],
  ],
  -7,
  50,
  90,
);

export const seedPacket: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 30, 2.4)}
      {solid(p, seeds.packet, PACKET.paper, [
        flat(p, seeds.band, PACKET.band),
        flat(p, seeds.foot, PACKET.band),
        thin(
          p,
          `M${lean([[31, 22]])[0]!.join(' ')}L${lean([[56, 22]])[0]!.join(' ')}M${lean([[31, 26]])[0]!.join(' ')}L${lean([[48, 26]])[0]!.join(' ')}`,
          PACKET.bandInk,
          1.4,
        ),
        thin(p, `M${STEM[0]!.join(' ')}L${STEM[1]!.join(' ')}`, PACKET.stem, 1.6),
        <path d={leaf(STEM[1]!, [STEM[1]![0] + 9, STEM[1]![1] - 9], 3.4)} fill={p.c(PACKET.stem)} />,
        ...FLOWER.map(([x, y], i) => (
          <path key={i} d={leaf(CENTRE, [x + (x - CENTRE[0]) * 0.9, y + (y - CENTRE[1]) * 0.9], 5.6)} fill={p.c(i % 2 ? PACKET.petal : PACKET.petalDeep)} />
        )),
        <circle cx={CENTRE[0]} cy={CENTRE[1]} r={3.2} fill={p.c(PACKET.eye)} />,
      ])}
      {[
        [80, 90.4, 20],
        [85.6, 91.2, -30],
        [76, 91.4, 70],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={1.6} ry={1} transform={`rotate(${r} ${x} ${y})`} fill={p.c(PACKET.seed)} />
      ))}
    </g>
  );
};

/* ---------------- Stacked pots: three empty terracotta pots, nested ---------------- */

const POT = { clay: '#E3A083', rim: '#E7AC92', inside: '#B57560' };

const pots = shapes('decor-stacked-pots', {
  body1: trap(50, 62, 91.6, 50, 38, 1.5),
  rim1: rect2(22, 56, 56, 8),
  body2: trap(50, 44, 58, 46, 42, 1),
  rim2: rect2(24, 38, 52, 8),
  body3: trap(50, 26, 40, 42, 38.4, 1),
  rim3: rect2(26, 19.5, 48, 8),
});

function rect2(x: number, y: number, w: number, h: number): string {
  return poly(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    1.4,
  );
}

export const stackedPots: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 28, 2.4)}
      {solid(p, pots.body1, POT.clay, cast(p, 'M25 64H75L74.6 66.8H25.4Z'))}
      {solid(p, pots.body2, POT.clay, cast(p, 'M27 46H73L72.8 48.8H27.2Z'))}
      {solid(p, pots.rim1, POT.rim)}
      {solid(p, pots.body3, POT.clay, cast(p, 'M29 27.5H71L70.8 30.3H29.2Z'))}
      {solid(p, pots.rim2, POT.rim)}
      {solid(p, pots.rim3, POT.rim)}
      <path d={ell(50, 19.8, 22.4, 2.2)} fill={p.c(POT.inside)} />
    </g>
  );
};
