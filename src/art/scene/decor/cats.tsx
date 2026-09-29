/**
 * No. 01 Cats decor: a cardboard box, a yarn ball, a matchbox bed, a cotton-reel scratcher and a
 * window hammock. Household things at capsule scale on the 100×100 canvas; standing items rest on
 * y = 92, and the hammock hangs from the glass.
 */
import { cast, contact, flat, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, line, n, poly, rect, smooth } from './geo';

/* ---------------- Cardboard box: four flaps open, one strip of old tape ---------------- */

const KRAFT = { face: '#D9B68C', flap: '#E4C69F', inside: '#A27A59', tape: '#C79F6C', print: '#9A785B' };

const box = shapes('decor-cardboard-box', {
  back: {
    d: poly(
      [
        [22, 41],
        [78, 41],
        [75.5, 20],
        [24.5, 20],
      ],
      1,
    ),
    k: 0.6,
  },
  flapL: {
    d: poly(
      [
        [16, 46],
        [21, 38.5],
        [9, 27],
        [3, 35.5],
      ],
      1,
    ),
    k: 0.6,
  },
  flapR: {
    d: poly(
      [
        [84, 46],
        [79, 38.5],
        [88.5, 21],
        [95.5, 27],
      ],
      1,
    ),
    k: 0.6,
  },
  front: rect(16, 45, 68, 47, [0, 0, 1.5, 1.5]),
  flapF: {
    d: poly(
      [
        [16, 45],
        [84, 45],
        [85.4, 59.5],
        [14.6, 59.5],
      ],
      [0, 0, 1, 1],
    ),
    k: 0.5,
  },
});

export const cardboardBox: DecorRenderer = (o) => {
  const p = paint(o);
  const arrow = (x: number) => [
    thin(
      p,
      line([
        [x, 85],
        [x, 77],
      ]),
      KRAFT.print,
      1.3,
    ),
    thin(
      p,
      line([
        [x - 2.2, 79.2],
        [x, 77],
        [x + 2.2, 79.2],
      ]),
      KRAFT.print,
      1.3,
    ),
  ];
  return (
    <g>
      {contact(p, 50, 92.4, 38, 2.6)}
      {solid(p, box.back, KRAFT.flap)}
      <path
        d={poly([
          [16, 45.5],
          [21.5, 38.5],
          [78.5, 38.5],
          [84, 45.5],
        ])}
        fill={p.c(KRAFT.inside)}
      />
      {solid(p, box.flapL, KRAFT.flap)}
      {solid(p, box.flapR, KRAFT.flap)}
      {solid(p, box.front, KRAFT.face, [
        cast(p, rect(16, 59.5, 68, 2.6)),
        ...arrow(25),
        ...arrow(31),
        thin(
          p,
          line([
            [22, 87.6],
            [34, 87.6],
          ]),
          KRAFT.print,
          1.3,
        ),
      ])}
      {solid(p, box.flapF, KRAFT.flap)}
      <path
        d={poly([
          [46.5, 45],
          [53.5, 45],
          [53.8, 56],
          [52, 57.6],
          [50, 56.2],
          [48, 58],
          [46.6, 56.4],
        ])}
        fill={p.c(KRAFT.tape)}
      />
    </g>
  );
};

/* ---------------- Yarn ball: half unwound, the loose end in loops on the sill ---------------- */

const YARN = { ball: '#EFB4C1', light: '#F7D2DB', deep: '#DE9AAB' };
const YB = { cx: 40, cy: 64.6, r: 27 };

const yarn = shapes('decor-yarn-ball', {
  ball: ell(YB.cx, YB.cy, YB.r),
});

/** The front half of a wrap of yarn round the ball: an ellipse arc from rim to rim. */
function wrap(rot: number, squash: number, shift = 0): string {
  const r = YB.r - 1.2;
  const a = (rot * Math.PI) / 180;
  const ox = -Math.sin(a) * shift;
  const oy = Math.cos(a) * shift;
  const half = Math.sqrt(Math.max(0, r * r - shift * shift));
  const x0 = YB.cx + ox - Math.cos(a) * half;
  const y0 = YB.cy + oy - Math.sin(a) * half;
  const x1 = YB.cx + ox + Math.cos(a) * half;
  const y1 = YB.cy + oy + Math.sin(a) * half;
  return `M${n(x0)} ${n(y0)}A${n(half)} ${n(half * squash)} ${rot} 0 0 ${n(x1)} ${n(y1)}`;
}

const WRAPS_A = [0, 6, 12, 18].map((s, i) => wrap(-38, 0.55 - i * 0.08, s - 6));
const WRAPS_B = [-9, -3, 3, 9].map((s) => wrap(52, 0.5, s));
const LOOSE = smooth(
  [
    [61, 76],
    [70, 87],
    [84, 90.5],
    [93, 86],
    [89, 80.5],
    [80, 84],
    [79, 89.5],
    [88, 91.6],
    [96, 91],
  ],
  false,
);

export const yarnBall: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 52, 92.4, 36, 2.4)}
      {solid(p, yarn.ball, YARN.ball, [...WRAPS_A.map((d) => thin(p, d, YARN.deep, 1.5)), ...WRAPS_B.map((d) => thin(p, d, YARN.light, 1.5))])}
      {thin(p, LOOSE, YARN.ball, 2.4)}
    </g>
  );
};

/* ---------------- Matchbox bed: the tray pulled out, folded flannel inside ---------------- */

const MATCH = {
  sleeve: '#F4ECDD',
  top: '#FBF5EA',
  label: '#A8C0D8',
  labelInk: '#F4ECDD',
  striker: '#B38C74',
  tray: '#EBD6B6',
  trayIn: '#D4B994',
  flannel: '#F2BCC7',
  check: '#FBE3E8',
};

const match = shapes('decor-matchbox-bed', {
  trayBack: { d: rect(46, 57, 48, 5, 0.6), k: 0.4 },
  flannel: {
    d: smooth([
      [49, 61],
      [58, 57.6],
      [70, 59.4],
      [80, 57.4],
      [91, 60.5],
      [92, 70],
      [91, 77],
      [84, 79.5],
      [74, 76.5],
      [62, 79],
      [52, 76],
      [48.5, 70],
    ]),
    k: 0.6,
  },
  tray: rect(46, 71, 48, 21, [0, 0, 1.2, 1.2]),
  fold: {
    d: smooth([
      [57, 70.2],
      [68, 72],
      [79, 70.4],
      [80.5, 78.6],
      [74, 81.4],
      [63, 79.8],
      [56.6, 77],
    ]),
    k: 0.5,
  },
  sleeveTop: { d: rect(5, 55, 50, 14, [1.5, 1.5, 0, 0]), k: 0 },
  sleeve: rect(5, 69, 50, 23, [0, 0, 1.4, 1.4]),
  label: { d: rect(12, 57, 36, 10, 0.8), k: 0 },
});

export const matchboxBed: DecorRenderer = (o) => {
  const p = paint(o);
  const checks = [52, 58, 64, 70, 76, 82, 88].map((x) => thin(p, `M${x} 60V77`, MATCH.check, 1, 0.8));
  return (
    <g>
      {contact(p, 50, 92.4, 46, 2.6)}
      {solid(p, match.trayBack, MATCH.trayIn)}
      {solid(p, match.flannel, MATCH.flannel, [
        ...checks,
        thin(p, 'M50 65.5C62 63 78 64 91 65.5', MATCH.check, 1, 0.8),
        thin(p, 'M50 72C62 70.5 78 71.2 91.4 72.6', MATCH.check, 1, 0.8),
      ])}
      {solid(p, match.tray, MATCH.tray)}
      {solid(p, match.fold, MATCH.flannel, [
        thin(p, 'M63 71.6V80', MATCH.check, 1, 0.8),
        thin(p, 'M70 71.8V80.8', MATCH.check, 1, 0.8),
        thin(p, 'M58 75.4C66 77 74 76.6 80 75', MATCH.check, 1, 0.8),
      ])}
      {cast(p, rect(46, 71, 9, 21), 0.7)}
      {flat(p, match.sleeveTop, MATCH.top)}
      {flat(p, match.label, MATCH.label)}
      <circle cx={30} cy={62} r={3.2} fill={p.c(MATCH.labelInk)} />
      {thin(p, 'M14.5 59.4H45.5M14.5 64.6H45.5', MATCH.labelInk, 0.8, 0.9)}
      {solid(p, match.sleeve, MATCH.sleeve, <path d={rect(7, 71.4, 46, 18.4, 1.6)} fill={p.c(MATCH.striker)} />)}
    </g>
  );
};

/* ---------------- Spool scratcher: a cotton reel wrapped in twine, well used ---------------- */

const SPOOL = { rim: '#D8B387', top: '#EBD0A8', hole: '#8E6A52', twine: '#D9BC8E', wrapDeep: '#BE9C6B', wrapLight: '#E9D3AE' };

const spool = shapes('decor-spool-scratcher', {
  foot: `M17 80V86.5A33 6.5 0 0 0 83 86.5V80Z`,
  footTop: { d: ell(50, 80, 33, 6.5), k: 0 },
  twine: rect(26, 22, 48, 60),
  cap: `M17 17V23.5A33 6.5 0 0 0 83 23.5V17Z`,
  capTop: { d: ell(50, 17, 33, 6.5), k: 0 },
});

const WINDS = Array.from({ length: 14 }, (_, i) => 27.5 + i * 3.9);

export const spoolScratcher: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.4, 36, 2.6)}
      {solid(p, spool.foot, SPOOL.rim)}
      {flat(p, spool.footTop, SPOOL.top)}
      {solid(p, spool.twine, SPOOL.twine, [
        ...WINDS.map((y, i) => thin(p, `M26.6 ${n(y)}Q50 ${n(y + 2.2)} 73.4 ${n(y)}`, i % 3 === 1 ? SPOOL.wrapLight : SPOOL.wrapDeep, 1.1)),
        cast(p, 'M26 24H74V29Q50 31 26 29Z', 0.8),
      ])}
      {thin(p, 'M73.5 58.5L77.6 56.2M73.8 61.5L78.4 61.8M72.6 64.6L76.2 67.8M26.5 66L22.6 64.2M26.4 68.8L22.8 70.6', SPOOL.twine, 1)}
      {thin(p, 'M73 73.5C77 75 78.2 78.6 76.6 82.4', SPOOL.twine, 1.4)}
      {solid(p, spool.cap, SPOOL.rim)}
      {flat(p, spool.capTop, SPOOL.top)}
      <ellipse cx={50} cy={17} rx={5.2} ry={1.7} fill={p.c(SPOOL.hole)} />
    </g>
  );
};

/* ---------------- Window hammock: holds onto the glass with two suction cups ---------------- */

const HAMMOCK = { cloth: '#B5CC9C', clothIn: '#D5E3C7', stitch: '#E6EFDB', rod: '#8A7B75', cup: '#E8F0F3', cupRing: '#CBD9DF', cable: '#9A8C88' };

const hammock = shapes('decor-window-hammock', {
  back: {
    d: smooth([
      [12, 50],
      [30, 55.5],
      [50, 57],
      [70, 55.5],
      [88, 50],
      [86, 47.5],
      [50, 51],
      [14, 47.5],
    ]),
    k: 0,
  },
  sling: smooth([
    [11, 49.5],
    [16, 61],
    [30, 71],
    [50, 74.5],
    [70, 71],
    [84, 61],
    [89, 49.5],
    [70, 55.5],
    [50, 57.5],
    [30, 55.5],
  ]),
});

export const windowHammock: DecorRenderer = (o) => {
  const p = paint(o);
  const cup = (x: number) => (
    <g>
      <circle cx={x} cy={11} r={7.5} fill={p.c(HAMMOCK.cup)} opacity={0.75} />
      <circle cx={x} cy={11} r={4.6} fill={p.c(HAMMOCK.cupRing)} opacity={0.85} />
      <circle cx={x} cy={11} r={1.8} fill={p.c(HAMMOCK.rod)} />
    </g>
  );
  return (
    <g>
      {thin(p, 'M22 12L12.6 48.5M22 12L30 47M78 12L87.4 48.5M78 12L70 47', HAMMOCK.cable, 1)}
      {cup(22)}
      {cup(78)}
      {flat(p, hammock.back, HAMMOCK.clothIn)}
      {solid(p, hammock.sling, HAMMOCK.cloth, thin(p, 'M18 60C30 67.5 42 70 50 70.5C58 70 70 67.5 82 60', HAMMOCK.stitch, 1, 0.9))}
      {thin(p, 'M11.4 49.2C30 55.8 70 55.8 88.6 49.2', HAMMOCK.rod, 1.8)}
    </g>
  );
};
