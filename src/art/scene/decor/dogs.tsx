/**
 * No. 03 Dogs decor: a tennis ball, a doughnut dog bed and a white enamel bowl with a blue rim.
 * Standing on y = 92 of the 100×100 canvas.
 */
import { cast, contact, flat, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, smooth } from './geo';

/* ---------------- Tennis ball: slightly fuzzy, slightly damp ---------------- */

const FELT = '#DCE28C';
const SEAM = '#FAF7EC';

const ball = shapes('decor-tennis-ball', {
  ball: ell(50, 58, 34),
});

export const tennisBall: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.4, 30, 2.8)}
      {solid(p, ball.ball, FELT, [
        thin(p, 'M29.5 35.5C41.5 47.5 41.5 68.5 29.5 80.5', SEAM, 3.2),
        thin(p, 'M70.5 35.5C58.5 47.5 58.5 68.5 70.5 80.5', SEAM, 3.2),
      ])}
    </g>
  );
};

/* ---------------- Round dog bed: a doughnut with a raised edge for chins ---------------- */

const BED = { rim: '#C9B6DE', rimIn: '#D9CBEA', cushion: '#F4ECDF', seam: '#E4DAF0' };

const bed = shapes('decor-dog-bed', {
  back: { d: ell(50, 62, 45, 21), k: 0.3 },
  hollow: { d: ell(50, 63.5, 31, 11), k: 0 },
  cushion: {
    d: smooth([
      [22, 66],
      [34, 58.4],
      [50, 57],
      [66, 58.4],
      [78, 66],
      [66, 71],
      [50, 72],
      [34, 71],
    ]),
    k: 0.5,
  },
  front: smooth([
    [5, 64],
    [16, 70],
    [34, 74],
    [50, 74.6],
    [66, 74],
    [84, 70],
    [95, 64],
    [94, 77],
    [84, 87.6],
    [66, 92],
    [50, 92.6],
    [34, 92],
    [16, 87.6],
    [6, 77],
  ]),
});

export const dogBed: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 44, 2.6)}
      {solid(p, bed.back, BED.rim)}
      {flat(p, bed.hollow, BED.rimIn)}
      {solid(p, bed.cushion, BED.cushion)}
      {solid(p, bed.front, BED.rim, thin(p, 'M10 70C26 80 74 80 90 70', BED.seam, 1.1, 0.9))}
    </g>
  );
};

/* ---------------- Enamel bowl: white enamel with a blue rim ---------------- */

const BOWL = { enamel: '#FBF8F3', rim: '#7E9DC6', inside: '#EEF0F2', iron: '#4A4150' };

const bowl = shapes('decor-enamel-bowl', {
  body: 'M9 60C11 76 22 89 32 90.6H68C78 89 89 76 91 60Z',
  rim: { d: ell(50, 60, 41.5, 12), k: 0.3 },
  inside: { d: ell(50, 60, 37, 9), k: 0 },
});

export const enamelBowl: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.8, 32, 2.4)}
      {solid(p, bowl.body, BOWL.enamel)}
      {solid(p, bowl.rim, BOWL.rim)}
      {flat(p, bowl.inside, BOWL.inside)}
      {cast(p, 'M13 60A37 9 0 0 1 87 60A37 7 0 0 0 13 60Z', 0.8)}
      <path d="M66.6 70.6l2.6-.5.6 1.6-2.4 1z" fill={p.c(BOWL.iron)} />
    </g>
  );
};
