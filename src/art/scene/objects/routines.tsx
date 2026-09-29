/**
 * Routine objects (DESIGN §14.1 "Routines, not performances"): the habit's own things, which a companion relates to
 * the way a real animal would. It sleeps on the open book, lies on the mat, sits in the laundry basket, drinks from
 * its bowl, waits on the doormat by the lead, lies on the warm laptop, sits on the papers. Never the human activity.
 *
 * Fourteen routines, one object each. Where the Shelf already has the thing (the enamel bowl, the hot water bottle,
 * the yarn ball, the letter, the watering can), the routine uses that very drawing; the rest are drawn here in the
 * decor kit (flat, matte, a precomputed crescent away from the light), on the 100 canvas standing on y 92. The same
 * drawings make the keepsakes' big siblings and the Sunday Note sketches (see keepsakes.tsx, rituals).
 */
import type { Routine } from '@/domain/routines';
import { cast, contact, flat, paint, shapes, solid, thin, type DecorRenderer } from '../decor/kit';
import { ell, poly, rect, smooth } from '../decor/geo';
import { DECOR_ENTRIES, type DecorEntry } from '../decor';

/* ---------------- Read: an open book lying on the sill ---------------- */

const BOOK = { cover: '#C98E8A', coverDeep: '#B27B78', page: '#FBF5EA', pageEdge: '#EFE4D2', line: '#DCCFBC', ribbon: '#E3B55B' };

const book = shapes('routine-read', {
  cover: poly(
    [
      [8, 84],
      [50, 90],
      [92, 84],
      [90, 78],
      [50, 83.6],
      [10, 78],
    ],
    1.2,
  ),
  left: {
    d: smooth([
      [12, 78.6],
      [22, 70.6],
      [36, 70],
      [49, 74.4],
      [50, 83.4],
      [34, 80.4],
      [20, 80.6],
    ]),
    k: 0.4,
  },
  right: {
    d: smooth([
      [88, 78.6],
      [78, 70.6],
      [64, 70],
      [51, 74.4],
      [50, 83.4],
      [66, 80.4],
      [80, 80.6],
    ]),
    k: 0.4,
  },
});

export const openBook: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 42, 2)}
      {solid(p, book.cover, BOOK.cover)}
      {solid(p, book.left, BOOK.page, [
        thin(p, 'M20 75.4C27 73.6 34 73.8 42 76.2', BOOK.line, 0.9),
        thin(p, 'M19 78C26 76.4 33 76.6 41 79', BOOK.line, 0.9),
      ])}
      {solid(p, book.right, BOOK.page, [
        thin(p, 'M80 75.4C73 73.6 66 73.8 58 76.2', BOOK.line, 0.9),
        thin(p, 'M81 78C74 76.4 67 76.6 59 79', BOOK.line, 0.9),
      ])}
      {cast(p, 'M49 74.4L51 74.4L50.6 83.4L49.4 83.4Z', 0.8)}
      <path d="M53 83.2L55.4 83L56 91.6L54.4 90.2L53 91.8Z" fill={p.c(BOOK.ribbon)} />
    </g>
  );
};

/* ---------------- Learn: a laptop, open, warm to lie on ---------------- */

const LAPTOP = { lid: '#C7C9D6', lidFace: '#AEB3C4', screen: '#4E5C73', glow: '#D8E4F2', base: '#D4D6E0', keys: '#B9BDCB', pad: '#C6C9D5' };

const laptop = shapes('routine-learn', {
  lid: poly(
    [
      [22, 80],
      [78, 80],
      [74, 42],
      [26, 42],
    ],
    2.4,
  ),
  base: poly(
    [
      [10, 90],
      [90, 90],
      [80, 79],
      [20, 79],
    ],
    1.6,
  ),
});

export const warmLaptop: DecorRenderer = (o) => {
  const p = paint(o);
  const screen = poly(
    [
      [27.4, 77],
      [72.6, 77],
      [69.6, 46],
      [30.4, 46],
    ],
    1,
  );
  return (
    <g>
      {contact(p, 50, 91.6, 42, 2)}
      {solid(p, laptop.lid, LAPTOP.lid, [<path d={screen} fill={p.night ? '#5F7394' : p.c(LAPTOP.screen)} />, <path d="M31 48H48L44.6 75H28.6Z" fill={p.c(LAPTOP.glow)} opacity={p.night ? 0.3 : 0.18} />])}
      {solid(p, laptop.base, LAPTOP.base, [
        <path d={poly([[26, 81], [74, 81], [78, 85.4], [22, 85.4]], 0.6)} fill={p.c(LAPTOP.keys)} />,
        <path d={rect(42, 86.4, 16, 2.4, 0.6)} fill={p.c(LAPTOP.pad)} />,
      ])}
    </g>
  );
};

/* ---------------- Walk: the doormat by the door, the lead coiled on it ---------------- */

const MAT = { coir: '#D8B77E', coirDeep: '#C29C62', edge: '#B5905A', lead: '#8FA7C9', leadDeep: '#7690B6', clip: '#C9B27A' };

const doormat = shapes('routine-walk', {
  mat: { d: poly([[4, 91], [96, 91], [88, 79], [12, 79]], 1.4), k: 0.3 },
  coil: { d: ell(56, 83.8, 16, 4.2), k: 0.6 },
});

export const leadOnMat: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.8, 46, 1.6)}
      {solid(p, doormat.mat, MAT.coir, [
        <path d={poly([[4, 91], [96, 91], [95.2, 89.6], [4.8, 89.6]])} fill={p.c(MAT.edge)} />,
        thin(p, 'M18 82H82M16 85.4H84', MAT.coirDeep, 0.8, 0.6),
      ])}
      {thin(p, 'M40 84.2C40 79 72 78.6 72 83.8C72 88.6 42 89 42 84.6C42 81.4 66 81 66.4 84', MAT.lead, 2.6)}
      {thin(p, 'M66.4 84C66.6 86.8 60 87.8 54 87.4', MAT.leadDeep, 2.6)}
      <path d={rect(26.4, 82.4, 11.6, 3.8, 1.6)} fill={p.c(MAT.clip)} />
      <path d={ell(25.6, 84.3, 2.4, 1.9)} fill={p.c(MAT.clip)} />
    </g>
  );
};

/* ---------------- Mat (Stretch, Yoga): a mat rolled out, its end still curled ---------------- */

const YOGA = { mat: '#C8BAE6', matDeep: '#AE9DD8', roll: '#B9A8DF', rollIn: '#9D8BCB' };

const yoga = shapes('routine-mat', {
  mat: { d: poly([[6, 91], [80, 91], [74, 84], [12, 84]], 1), k: 0.2 },
  roll: ell(84, 85.4, 9, 6.2),
});

export const yogaMat: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.8, 46, 1.6)}
      {solid(p, yoga.mat, YOGA.mat, <path d={poly([[6, 91], [80, 91], [79.4, 89.8], [6.8, 89.8]])} fill={p.c(YOGA.matDeep)} />)}
      {solid(p, yoga.roll, YOGA.roll, [<path d={ell(84, 85.4, 5, 3.4)} fill={p.c(YOGA.rollIn)} />, <path d={ell(84, 85.4, 2.2, 1.5)} fill={p.c(YOGA.roll)} />])}
    </g>
  );
};

/* ---------------- Mind: a round floor cushion ---------------- */

const CUSHION = { top: '#B5CC9C', side: '#9DB785', button: '#8AA674', piping: '#CADBB5' };

const cushion = shapes('routine-mind', {
  side: rect(12, 72, 76, 18, 9),
  top: { d: ell(50, 72, 38, 9.4), k: 0.3 },
});

export const floorCushion: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.8, 40, 2)}
      {solid(p, cushion.side, CUSHION.side, thin(p, 'M13 81C30 86 70 86 87 81', CUSHION.piping, 1.1))}
      {solid(p, cushion.top, CUSHION.top, <path d={ell(50, 72, 2.4, 1.3)} fill={p.c(CUSHION.button)} />)}
    </g>
  );
};

/* ---------------- Tidy: a wicker laundry basket, a folded cloth on top ---------------- */

const BASKET = { wicker: '#D6B98C', weave: '#C2A274', rim: '#C8A878', inside: '#A88B63', cloth: '#B3D1E8', clothDeep: '#9DBEDB' };

const basket = shapes('routine-tidy', {
  back: { d: poly([[14, 52], [86, 52], [84, 58], [16, 58]], 2), k: 0.3 },
  cloth: {
    d: smooth([
      [20, 56],
      [34, 50],
      [52, 51.6],
      [70, 48.6],
      [82, 55],
      [70, 60],
      [30, 60],
    ]),
    k: 0.5,
  },
  body: poly([[12, 56], [88, 56], [82, 91], [18, 91]], [2, 2, 3, 3]),
  rim: rect(10, 53.4, 80, 6, 3),
});

/** The basket's front, drawn again over a pet sitting in it (its body and rim). */
const basketFront: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {solid(p, basket.body, BASKET.wicker, [
        thin(p, 'M16 66H84M17 74.4H83M18.2 82.8H81.8', BASKET.weave, 1.2, 0.8),
        thin(p, 'M30 60V90M50 60V90.6M70 60V90', BASKET.weave, 0.9, 0.5),
      ])}
      {solid(p, basket.rim, BASKET.rim)}
    </g>
  );
};

export const laundryBasket: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.8, 36, 2.2)}
      {solid(p, basket.back, BASKET.inside)}
      {solid(p, basket.cloth, BASKET.cloth, thin(p, 'M34 55C44 53 58 53.8 70 52.2', BASKET.clothDeep, 1))}
      {basketFront(o)}
    </g>
  );
};

/* ---------------- Cook and Care: a folded towel (a striped tea towel; a soft bath towel) ---------------- */

const towel = shapes('routine-towel', {
  towel: { d: rect(14, 76, 72, 15, 2.4), k: 0.5 },
  fold: { d: rect(14, 76, 72, 4.4, [2.4, 2.4, 0, 0]), k: 0 },
});

function folded(face: string, fold: string, stripe?: string): DecorRenderer {
  return (o) => {
    const p = paint(o);
    return (
      <g>
        {contact(p, 50, 91.8, 38, 1.8)}
        {solid(p, towel.towel, face, [
          flat(p, towel.fold, fold),
          stripe ? <path d={`${rect(14, 83, 72, 1.6)}${rect(14, 86.4, 72, 1.6)}`} fill={p.c(stripe)} /> : null,
          stripe ? null : <path d={rect(14, 87.6, 72, 1.4)} fill={p.c(fold)} />,
        ])}
      </g>
    );
  };
}

export const teaTowel = folded('#F6F1E6', '#ECE3D2', '#D98C8C');
export const bathTowel = folded('#F1C9D2', '#E7B4C1');

/* ---------------- Plan: a small stack of papers, a pencil across them ---------------- */

const PAPER = { sheet: '#FCF8F0', under: '#EFE7D8', rule: '#D9CDBA', pencil: '#F0CF6E', pencilDeep: '#DDB450', tip: '#E9D2B0', lead: '#6F6065' };

const papers = shapes('routine-plan', {
  under: { d: poly([[12, 90], [82, 91], [86, 82.6], [16, 81.4]], 1), k: 0.4 },
  sheet: { d: poly([[16, 88], [86, 88], [88, 79.6], [18, 79.6]], 1), k: 0.4 },
});

export const paperStack: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 40, 1.8)}
      {solid(p, papers.under, PAPER.under)}
      {solid(p, papers.sheet, PAPER.sheet, thin(p, 'M26 82.2H78M25.4 84.6H70', PAPER.rule, 0.8))}
      {thin(p, 'M30 86.4L74 81.6', PAPER.pencil, 2.6)}
      {thin(p, 'M30 86.4L66 82.5', PAPER.pencilDeep, 0.9, 0.7)}
      <path d="M74 81.6L79.4 80.8L74.3 83.2Z" fill={p.c(PAPER.tip)} />
    </g>
  );
};

/* ---------------- The fourteen ---------------- */

/** A routine object: its art and how it stands on the sill, plus where a pet lies on it. */
export interface RoutineEntry extends DecorEntry {
  /** How far above its baseline a pet settles on it, as a share of its canvas (0: beside it on the sill). */
  nap: number;
}

const entry = (e: DecorEntry, nap: number): RoutineEntry => ({ ...e, nap });

export const ROUTINE_ART: Readonly<Record<Routine, RoutineEntry>> = {
  read: entry({ art: openBook, size: 18, bounds: [8, 92], deep: 18, flat: true }, 0.14),
  learn: entry({ art: warmLaptop, size: 18, bounds: [10, 90], deep: 16 }, 0.12),
  walk: entry({ art: leadOnMat, size: 22, bounds: [4, 96], deep: 18, flat: true }, 0.08),
  mat: entry({ art: yogaMat, size: 22, bounds: [6, 93], deep: 14, flat: true }, 0.06),
  water: entry(DECOR_ENTRIES['decor-enamel-bowl']!, 0),
  sleep: entry(DECOR_ENTRIES['decor-hot-water-bottle']!, 0.12),
  mind: entry({ art: floorCushion, size: 17, bounds: [12, 88], deep: 16 }, 0.2),
  create: entry(DECOR_ENTRIES['decor-yarn-ball']!, 0),
  tidy: entry({ art: laundryBasket, size: 20, bounds: [10, 90], deep: 18, front: basketFront }, 0.24),
  cook: entry({ art: teaTowel, size: 17, bounds: [14, 86], deep: 14, flat: true }, 0.14),
  care: entry({ art: bathTowel, size: 17, bounds: [14, 86], deep: 14, flat: true }, 0.14),
  plan: entry({ art: paperStack, size: 17, bounds: [12, 90], deep: 14, flat: true }, 0.09),
  connect: entry(DECOR_ENTRIES['decor-love-letter']!, 0.04),
  garden: entry(DECOR_ENTRIES['decor-watering-can']!, 0),
};
