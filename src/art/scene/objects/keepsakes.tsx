/**
 * Keepsakes (DESIGN §14.1): the small dated things a companion leaves by the pot at Rooting, Budding, Blooming and
 * Evergreen, one per activity family, and a brass seed at Evergreen. Each is the little sibling of its family's
 * routine object (a bookmark for the book, a peg for the laundry basket, a stamp for the letter). They place on the
 * Shelf like decor, as `'keepsake:<id>'` (with the keepsake's kind) or directly as `'keepsake-<kind>'`.
 *
 * Drawn in the decor kit on the 100 canvas, standing (or lying) on y 92, at keepsake scale: about half a sitting cat.
 */
import type { KeepsakeKind } from '@/state/types';
import { contact, paint, shapes, solid, thin, type DecorRenderer } from '../decor/kit';
import { ell, poly, rect, smooth } from '../decor/geo';
import type { DecorEntry } from '../decor';

/* move: a smooth river pebble from a walk, a pale band round it */
const pebble = shapes('keepsake-move', { stone: ell(50, 77, 30, 14.6) });
const movePebble: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 30, 2)}
      {solid(p, pebble.stone, '#A9B3C4', <path d="M36 64.6C40 72 42 82 40 90.8L46 91.4C48 82 46 71 42 63.4Z" fill={p.c('#DCE1EA')} />)}
    </g>
  );
};

/* read: a bookmark, a paper card with a tassel, lying on the sill */
const mark = shapes('keepsake-read', { card: { d: poly([[20, 90], [74, 86], [72, 78], [18, 82]], 1.4), k: 0.5 } });
const readBookmark: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 48, 91.4, 32, 1.6)}
      {solid(p, mark.card, '#F6EEDD', [thin(p, 'M28 84.6L62 82', '#D7C8B1', 0.9), <path d={ell(67.4, 82.2, 1.5, 1.2)} fill={p.c('#C2B39C')} />])}
      {thin(p, 'M67.4 82.2C74 80 80 83 82 88', '#9DB38A', 1.2)}
      <path d="M80.4 86.6L84.6 86L86.4 91.6L81.4 91.8Z" fill={p.c('#9DB38A')} />
    </g>
  );
};

/* hydrate: a glass marble, sea blue with a lit spot */
const marble = shapes('keepsake-hydrate', { glass: ell(50, 74, 17) });
const hydrateMarble: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.4, 16, 2)}
      {solid(p, marble.glass, '#9FC6DE', [
        <path d="M38 78C44 70 56 68 64 74C58 72 48 74 42 82Z" fill={p.c('#7FAFCF')} />,
        <path d={ell(43, 67, 3.4, 2.6, -30)} fill={p.night ? '#FFE8C8' : '#F4FAFD'} />,
      ])}
    </g>
  );
};

/* rest: a soft feather */
const feather = shapes('keepsake-rest', {
  vane: {
    d: smooth([
      [14, 88],
      [30, 80],
      [52, 74.6],
      [76, 72],
      [88, 74],
      [72, 82],
      [48, 88],
      [26, 90],
    ]),
    k: 0.4,
  },
});
const restFeather: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.4, 36, 1.4)}
      {solid(p, feather.vane, '#EEE8F4', [thin(p, 'M10 90.4C30 86 58 78 88 74', '#CFC4DE', 1.2), thin(p, 'M40 84.6L44 80M56 80.6L59 76.4', '#FFFFFF', 1.4, 0.8)])}
    </g>
  );
};

/* mind: a sprig of lavender tied with thread */
const sprig = shapes('keepsake-mind', { head: { d: ell(66, 80, 18, 5.4, -12), k: 0.5 } });
const mindLavender: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.4, 38, 1.6)}
      {thin(p, 'M14 90L60 82', '#9CB58A', 1.6)}
      {solid(p, sprig.head, '#A48ED6', <path d={`${ell(56, 81.6, 3, 2.2, -12)}${ell(66, 79.6, 3, 2.2, -12)}${ell(76, 77.6, 3, 2.2, -12)}`} fill={p.c('#BCA9E4')} />)}
      {thin(p, 'M36 86.6L36.6 89.8M38.4 86.2L39 89.4', '#E9B8C4', 1)}
    </g>
  );
};

/* create: a pencil stub, sharpened, with its pink eraser */
const pencil = shapes('keepsake-create', { body: rect(26, 80, 44, 10, 1.4) });
const createPencil: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 52, 91.6, 34, 1.6)}
      {solid(p, pencil.body, '#F0CF6E', [<path d={rect(26, 80, 7, 10, [1.4, 0, 0, 1.4])} fill={p.c('#EFA9B6')} />, <path d={rect(33, 80, 2.6, 10)} fill={p.c('#C9C2B6')} />, <path d={rect(35.6, 84, 34.4, 1.2)} fill={p.c('#DDB450')} />])}
      <path d="M70 80L82 85L70 90Z" fill={p.c('#E9D2B0')} />
      <path d="M78 83.4L82 85L78 86.6Z" fill={p.c('#6F6065')} />
    </g>
  );
};

/* tidy: a wooden clothes peg */
const peg = shapes('keepsake-tidy', {
  upper: poly([[16, 82], [82, 79], [84, 83], [18, 86]], 2),
  lower: poly([[16, 86.4], [84, 84], [82, 89], [18, 90.4]], 2),
});
const tidyPeg: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 36, 1.6)}
      {solid(p, peg.lower, '#D9BD92')}
      {solid(p, peg.upper, '#E6CDA4')}
      <path d={rect(48, 80.2, 6, 9.4, 1)} fill={p.c('#B8BEC8')} />
    </g>
  );
};

/* cook: a small wooden spoon */
const spoon = shapes('keepsake-cook', { bowl: ell(72, 84, 13, 6.6, -6) });
const cookSpoon: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 40, 1.6)}
      {thin(p, 'M10 89L60 85.4', '#D9B98E', 3.2)}
      {solid(p, spoon.bowl, '#E1C39A', <path d={ell(73, 83.4, 8, 3.4, -6)} fill={p.c('#CCAA7E')} />)}
    </g>
  );
};

/* care: a round bar of soap with a flower pressed in it */
const soap = shapes('keepsake-care', { side: rect(20, 76, 60, 14, 7), top: { d: ell(50, 76, 30, 6.4), k: 0.2 } });
const careSoap: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 32, 1.8)}
      {solid(p, soap.side, '#E6D3EC')}
      {solid(p, soap.top, '#F1E4F4', <path d={`${ell(46, 76, 2.4, 1.2)}${ell(54, 76, 2.4, 1.2)}${ell(50, 74.4, 2.2, 1.1)}${ell(50, 77.6, 2.2, 1.1)}`} fill={p.c('#DCC4E4')} />)}
    </g>
  );
};

/* garden: a seed packet, folded over, a flower on its face */
const packet = shapes('keepsake-garden', { face: rect(30, 56, 40, 34, 1.4) });
const gardenPacket: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 26, 1.8)}
      {solid(p, packet.face, '#F4EBDA', [
        <path d={rect(30, 56, 40, 6, [1.4, 1.4, 0, 0])} fill={p.c('#E7D8BE')} />,
        <path d={rect(34, 66, 32, 18, 1)} fill={p.c('#DDE9CE')} />,
        <path d={`${ell(50, 73, 3.4)}${ell(45, 76, 3)}${ell(55, 76, 3)}${ell(47, 70, 3)}${ell(53, 70, 3)}`} fill={p.c('#EFB4C1')} />,
        <path d={ell(50, 73, 1.8)} fill={p.c('#F2D98A')} />,
      ])}
    </g>
  );
};

/* connect: a postage stamp with a perforated edge */
const stampShape = shapes('keepsake-connect', {
  paper: {
    d: (() => {
      // A scalloped rectangle: little bites all round (the perforations).
      const pts: [number, number][] = [];
      const x0 = 30;
      const x1 = 70;
      const y0 = 60;
      const y1 = 90;
      const bite = (a: [number, number], b: [number, number], n: number) => {
        for (let i = 0; i < n; i++) {
          const t = i / n;
          const t2 = (i + 0.5) / n;
          pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          const mx = a[0] + (b[0] - a[0]) * t2;
          const my = a[1] + (b[1] - a[1]) * t2;
          const nx = (b[1] - a[1]) === 0 ? 0 : b[1] > a[1] ? -1.4 : 1.4;
          const ny = (b[0] - a[0]) === 0 ? 0 : b[0] > a[0] ? 1.4 : -1.4;
          pts.push([mx + nx, my + ny]);
        }
      };
      bite([x0, y0], [x1, y0], 8);
      bite([x1, y0], [x1, y1], 6);
      bite([x1, y1], [x0, y1], 8);
      bite([x0, y1], [x0, y0], 6);
      return poly(pts);
    })(),
    k: 0.5,
  },
});
const connectStamp: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 22, 1.6)}
      {solid(p, stampShape.paper, '#FBF6EE', [<path d={rect(34.4, 64, 31.2, 22, 0.6)} fill={p.c('#EFB4C1')} />, <path d="M40 82L47 72L52 78L56 74L61 82Z" fill={p.c('#F8DCE3')} />, <path d={ell(57, 69.4, 2.4)} fill={p.c('#F2D98A')} />])}
    </g>
  );
};

/* plan: a paper clip */
const planClip: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 30, 1.2)}
      {thin(p, 'M30 88H70A4 4 0 0 0 70 80H26A3 3 0 0 0 26 86H64A2 2 0 0 0 64 82H34', p.night ? '#C9C4CF' : '#A9A6B8', 1.8)}
    </g>
  );
};

/* brass-seed: a brass seed, almond-shaped, a groove down it */
const seed = shapes('keepsake-brass-seed', { body: { d: ell(50, 80, 20, 10, -14), k: 1 } });
const brassSeed: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 91.6, 22, 1.8)}
      {solid(p, seed.body, '#D9B45C', [thin(p, 'M34 84.6C44 81 56 78 66 75', '#B8923C', 1.1), <path d={ell(44, 76.4, 3, 1.4, -14)} fill={p.c('#F1DA97')} />])}
    </g>
  );
};

const keep = (art: DecorRenderer, size = 8, bounds: readonly [number, number] = [10, 90], flatLying = true): DecorEntry => ({ art, size, bounds, deep: 10, flat: flatLying });

/** Every keepsake kind's object, as a decor entry (`'keepsake-<kind>'`). */
export const KEEPSAKE_ART: Readonly<Record<KeepsakeKind, DecorEntry>> = {
  move: keep(movePebble, 7, [20, 80], false),
  read: keep(readBookmark, 9, [18, 88]),
  hydrate: keep(hydrateMarble, 5.6, [33, 67], false),
  rest: keep(restFeather, 9, [10, 90]),
  mind: keep(mindLavender, 9, [12, 86]),
  create: keep(createPencil, 8, [26, 82]),
  tidy: keep(tidyPeg, 7.4, [16, 84]),
  cook: keep(cookSpoon, 9, [8, 86]),
  care: keep(careSoap, 6.4, [20, 80], false),
  garden: keep(gardenPacket, 8, [30, 70], false),
  connect: keep(connectStamp, 7, [28, 72], false),
  plan: keep(planClip, 6.4, [22, 76]),
  'brass-seed': keep(brassSeed, 6, [28, 72], false),
};

/** The decor-entry id for a keepsake kind. */
export const keepsakeItemId = (kind: KeepsakeKind): string => `keepsake-${kind}`;

/** Every keepsake kind (the art test covers them all). */
export const KEEPSAKE_KINDS = Object.keys(KEEPSAKE_ART) as KeepsakeKind[];

