/**
 * No. 02 Cows decor: a small square hay bale, a wooden milk crate and a dented enamel milk can.
 * Standing on y = 92 of the 100×100 canvas.
 */
import { cast, contact, flat, paint, shapes, solid, thin, type DecorRenderer, type ShapeDef } from './kit';
import { n, poly, rect } from './geo';

/* ---------------- Hay bale: small, square, slightly prickly ---------------- */

const HAY = { face: '#E9C87E', top: '#F3DA98', straw: '#D2AC60', pale: '#F8E7B4', twine: '#B87A52' };

const hay = shapes('decor-hay-bale', {
  top: {
    d: poly(
      [
        [12, 44],
        [88, 44],
        [84, 33],
        [16, 33],
      ],
      2.5,
    ),
    k: 0.3,
  },
  face: rect(10, 43, 80, 49, [2, 2, 3, 3]),
});

/** A few long straws on the cut face, near its ends and edges, as [x, y, angle]: the fill and crescent carry the form. */
const STRAWS: readonly (readonly [number, number, number])[] = [
  [17, 51, -18],
  [16, 69, 14],
  [18, 86, -8],
  [83, 50, 16],
  [84, 67, -14],
  [82, 86, 10],
  [50, 49, 6],
  [48, 87, -6],
  [58, 68, 22],
];

export const hayBale: DecorRenderer = (o) => {
  const p = paint(o);
  const straws = STRAWS.map(([x, y, a], i) => {
    const r = (a * Math.PI) / 180;
    const dx = Math.cos(r) * 5;
    const dy = Math.sin(r) * 5;
    return thin(p, `M${n(x - dx)} ${n(y - dy)}L${n(x + dx)} ${n(y + dy)}`, i % 3 ? HAY.straw : HAY.pale, 1.2);
  });
  return (
    <g>
      {contact(p, 50, 92.4, 42, 2.6)}
      {solid(p, hay.top, HAY.top, [thin(p, 'M31 44L29 33M69 44L71 33', HAY.twine, 1.6)])}
      {solid(p, hay.face, HAY.face, [...straws, thin(p, 'M31 43.5V91.5M69 43.5V91.5', HAY.twine, 1.8)])}
      {thin(
        p,
        'M10.5 50L6.6 48.4M10.4 64L6.2 64.8M11 80L7 82.2M89.6 55L93.6 53.2M89.4 72L93.8 73M16 33.4L13.6 29.8M84.2 33.4L86.8 29.4M52 33.2L53 29.2',
        HAY.straw,
        1,
      )}
    </g>
  );
};

/* ---------------- Milk crate: wooden slats, stamped with a dairy's name, bottles inside ---------------- */

const CRATE = { slat: '#E2C197', post: '#D2AD80', inside: '#8F6C50', stamp: '#7F97B8', milk: '#FBF8F2', glass: '#E4ECEE' };
/** Foil caps, one of each colour a milkman might leave. */
const FOIL = ['#D6DBE0', '#E8C36A', '#8FA9CB'] as const;
const BOTTLES = [30, 50, 70] as const;

const crate = shapes('decor-milk-crate', {
  back: { d: rect(12, 29, 76, 5, 1), k: 0.4 },
  ...Object.fromEntries(BOTTLES.map((x, i) => [`neck${i}`, { d: rect(x - 5, 22, 10, 20, [3.4, 3.4, 0, 0]), k: 0.5 }])),
  ...Object.fromEntries(BOTTLES.map((x, i) => [`cap${i}`, { d: rect(x - 5.8, 18.4, 11.6, 4.8, 1.8), k: 0.4 }])),
  slatTop: rect(8, 40, 84, 14, 1.2),
  slatMid: rect(8, 58.5, 84, 13, 1.2),
  slatLow: rect(8, 76, 84, 16, [1.2, 1.2, 1.6, 1.6]),
  postL: { d: rect(8, 40, 8, 52, [1.2, 0, 0, 1.6]), k: 0.7 },
  postR: { d: rect(84, 40, 8, 52, [0, 1.2, 1.6, 0]), k: 0.7 },
} as Record<string, string | ShapeDef>);

export const milkCrate: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.4, 44, 2.6)}
      {solid(p, crate.back!, CRATE.slat)}
      <path d={rect(10, 34, 80, 56)} fill={p.c(CRATE.inside)} />
      {BOTTLES.map((x, i) => (
        <g key={i}>
          {solid(p, crate[`neck${i}`]!, CRATE.milk, <path d={rect(x - 5, 22, 10, 5, [3.4, 3.4, 0, 0])} fill={p.c(CRATE.glass)} />)}
          {solid(p, crate[`cap${i}`]!, FOIL[i]!)}
        </g>
      ))}
      {solid(p, crate.slatTop!, CRATE.slat, [
        <path d={rect(18, 45, 11, 4.4, 2.2)} fill={p.c(CRATE.inside)} />,
        <path d={rect(71, 45, 11, 4.4, 2.2)} fill={p.c(CRATE.inside)} />,
      ])}
      {solid(p, crate.slatMid!, CRATE.slat, [
        <ellipse cx={50} cy={65} rx={13} ry={4.4} fill="none" stroke={p.c(CRATE.stamp)} stroke-width={p.w(0.9)} opacity={0.75} />,
        thin(p, 'M42.5 64.2H57.5M44.5 66.6H55.5', CRATE.stamp, 1, 0.75),
      ])}
      {solid(p, crate.slatLow!, CRATE.slat)}
      {solid(p, crate.postL!, CRATE.post)}
      {solid(p, crate.postR!, CRATE.post)}
      {thin(p, 'M36 47H62M20 82H38M58 84H78M22 64H35', CRATE.post, 0.9, 0.9)}
    </g>
  );
};

/* ---------------- Milk can: cream enamel, a blue rim and a dent on one side ---------------- */

const CAN = { enamel: '#F5EFE4', rim: '#8FA9CB', handle: '#8C8A92', dent: '#FBF8F2' };

/** A churn: a straight body, a sloped shoulder, a neck and a mushroom lid. The dent is on the left. */
const BODY = 'M40.6 33.4H59.4L70 49V88C70 90.2 68.6 91.6 66.4 91.6H33.6C31.4 91.6 30 90.2 30 88V74C33 71.6 33.2 64.4 30 62V49Z';

const can = shapes('decor-milk-can', {
  body: BODY,
  bands: { d: 'M20 48.6H80V52.4H20ZM20 81H80V85H20Z', k: 0, clip: 'body' },
  neck: { d: rect(40, 20, 20, 15), k: 0.6 },
  lid: { d: 'M34 21.6C34 19.6 35.4 18.4 37.4 18.4H62.6C64.6 18.4 66 19.6 66 21.6V23H34Z', k: 0.5 },
  dome: { d: 'M37.4 18.6C37.4 12.4 43 9.4 50 9.4C57 9.4 62.6 12.4 62.6 18.6Z', k: 0.6 },
});

export const milkCan: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.4, 25, 2.4)}
      {thin(p, 'M34.4 43.4C27.6 42.6 25.4 50.6 30.6 54M65.6 43.4C72.4 42.6 74.6 50.6 69.4 54', CAN.handle, 2.2)}
      {solid(p, can.body, CAN.enamel, [
        flat(p, can.bands, CAN.rim),
        cast(p, 'M30.2 62.2C33.4 64.6 33.4 67 32.2 68.4C31.8 66.4 31.2 64.2 30.2 62.2Z'),
        <path d="M32.2 68.6C33 70.6 32.4 72.6 30.4 73.8C31.6 72.2 32 70.4 32.2 68.6Z" fill={p.c(CAN.dent)} />,
      ])}
      {solid(p, can.neck, CAN.enamel, cast(p, rect(40, 23, 20, 2.4), 0.8))}
      {solid(p, can.dome, CAN.enamel)}
      {solid(p, can.lid, CAN.rim)}
    </g>
  );
};
