/**
 * Seasonal decor, one block per edition: Autumn (mini pumpkin, leaf pile, jack-o'-lantern), Winter
 * (snowman, odd mitten, paper star), Valentine (love letter, bud vase, tiny bouquet), Spring (paper
 * umbrella, robin's nest, seed tray) and Summer (sandcastle, beach umbrella, seashell).
 * Standing items rest on y = 92 of the 100×100 canvas; the paper star hangs from the window.
 */
import type { JSX } from 'preact';
import { Glow, contact, crescentOf, flat, lit, paint, pale, shapes, solid, thin, type DecorRenderer, type Paint } from './kit';
import { dots, ell, ellPts, heart, leaf, n, poly, rect, rotate, smooth, star, type Pt } from './geo';

const closed = (pts: readonly Pt[]) => `${smooth(pts, false)}Z`;

/* ================================ Autumn ================================ */

const PUMPKIN = { skin: '#EFA565', lobe: '#E6955A', stem: '#8F845A', tendril: '#9CB27E' };

/** Five overlapping lobes, the outer ones first, so each rib takes its own crescent. */
function lobes(cx: number, bottom: number, w: number, h: number): string[] {
  return [
    [-0.3, 0.72, 0.36],
    [0.3, 0.72, 0.36],
    [-0.14, 0.9, 0.34],
    [0.14, 0.9, 0.34],
    [0, 1, 0.32],
  ].map(([dx, hk, wk]) => ell(cx + dx! * w, bottom - (h * hk!) / 2, w * wk!, (h * hk!) / 2));
}

const mini = lobes(50, 92, 70, 46);
const minis = shapes('decor-mini-pumpkin', {
  l1: mini[0]!,
  l2: mini[1]!,
  l3: mini[2]!,
  l4: mini[3]!,
  l5: mini[4]!,
  stem: { d: 'M47 48.6C46.6 43 48.6 38.4 53 35.2L56.4 37.8C53.2 40.4 52.2 44 52.6 48.6Z', k: 0.5 },
});

export const miniPumpkin: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 36, 2.4)}
      {solid(p, minis.l1, PUMPKIN.lobe)}
      {solid(p, minis.l2, PUMPKIN.lobe)}
      {solid(p, minis.l3, PUMPKIN.skin)}
      {solid(p, minis.l4, PUMPKIN.skin)}
      {solid(p, minis.l5, PUMPKIN.skin)}
      {solid(p, minis.stem, PUMPKIN.stem)}
      {thin(p, 'M53 45C58 44 61 40 59 37.4C57.4 35.4 55 37.6 56.6 39', PUMPKIN.tendril, 1.2)}
    </g>
  );
};

/* Leaf pile: swept up, then immediately jumped in */

const LEAVES = { mound: '#D99462', butter: '#F2C46B', clay: '#E3A083', rust: '#CD7B50', sage: '#B5CC9C', amber: '#E8AC56', vein: '#FBE8C6' };

/** A maple leaf: five pointed lobes round (cx, cy), turned by `rot` degrees. */
function maple(cx: number, cy: number, r: number, rot: number): string {
  const pts: Pt[] = [];
  const tips = [-90, -30, 30, 150, 210];
  const radius = [1, 0.86, 0.62, 0.62, 0.86];
  tips.forEach((a, i) => {
    const next = tips[(i + 1) % tips.length]!;
    const mid = (a + (next < a ? next + 360 : next)) / 2;
    const at = (deg: number, k: number): Pt => [cx + Math.cos(((deg + rot) * Math.PI) / 180) * r * k, cy + Math.sin(((deg + rot) * Math.PI) / 180) * r * k];
    pts.push(at(a, radius[i]!), at(mid, i === 2 ? 0.2 : 0.42));
  });
  return poly(pts, 0.8);
}

/** The mound's top edge is made of leaf tips. */
const MOUND: Pt[] = [
  [4, 92],
  [7, 84],
  [12, 80],
  [14, 74],
  [21, 72],
  [25, 66],
  [33, 66],
  [38, 60],
  [46, 62],
  [52, 57],
  [59, 61],
  [66, 59],
  [71, 64],
  [79, 65],
  [83, 71],
  [89, 74],
  [92, 81],
  [96, 92],
];

const pile = shapes('decor-leaf-pile', {
  mound: { d: poly(MOUND, 2.4), k: 1 },
  a: { d: leaf([10, 88], [32, 72], 6.4), k: 0 },
  b: { d: maple(34, 67, 13.6, 18), k: 0 },
  c: { d: leaf([42, 80], [62, 56], 8), k: 0 },
  d: { d: maple(71, 68, 13, -24), k: 0 },
  e: { d: leaf([88, 90], [72, 74], 6), k: 0 },
  f: { d: leaf([50, 91], [26, 84], 6), k: 0 },
  g: { d: maple(57, 81, 11, 40), k: 0 },
  h: { d: leaf([78, 58], [94, 76], 5.6), k: 0 },
  i: { d: maple(20, 78, 9.6, -40), k: 0 },
  j: { d: leaf([64, 90], [84, 82], 5.4), k: 0 },
  k: { d: leaf([46, 70], [36, 54], 5.4), k: 0 },
});

export const leafPile: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 46, 2.4)}
      {solid(p, pile.mound, LEAVES.mound)}
      {solid(p, pile.h, LEAVES.amber)}
      {solid(p, pile.k, LEAVES.sage)}
      {solid(p, pile.a, LEAVES.butter, thin(p, 'M12 87L30 73.4', LEAVES.vein, 0.8, 0.8))}
      {solid(p, pile.b, LEAVES.clay)}
      {solid(p, pile.c, LEAVES.butter, thin(p, 'M43 79L61 57.4', LEAVES.vein, 0.8, 0.8))}
      {solid(p, pile.d, LEAVES.rust)}
      {solid(p, pile.i, LEAVES.amber)}
      {solid(p, pile.e, LEAVES.sage)}
      {solid(p, pile.f, LEAVES.amber)}
      {solid(p, pile.g, LEAVES.clay)}
      {solid(p, pile.j, LEAVES.butter)}
      {thin(p, 'M34 67L30.4 80M71 68L77 80M57 81L51 89.4M20 78L16 86', LEAVES.rust, 1)}
    </g>
  );
};

/* Jack-o'-lantern: a small carved pumpkin with a tea light inside */

const jl = lobes(50, 92, 70, 64);
const jack = shapes('decor-jack-lantern', {
  l1: jl[0]!,
  l2: jl[1]!,
  l3: jl[2]!,
  l4: jl[3]!,
  l5: jl[4]!,
  stem: { d: 'M46.6 30.6C46.4 25.4 48 21.4 51.6 18.6L55.2 21C52.6 23.4 51.8 26.6 52.2 30.6Z', k: 0.5 },
});

const CARVE =
  'M36.4 58.6L41.6 49.2L46.8 58.6ZM53.2 58.6L58.4 49.2L63.6 58.6ZM47.4 66L50 61.8L52.6 66ZM34 70.4C40 77.6 60 77.6 66 70.4C62.4 72.4 58.6 73.2 56.4 73.4L55.6 70.4L53 73.8C51 74 49 74 47 73.8L44.4 70.4L43.6 73.4C41.4 73.2 37.6 72.4 34 70.4Z';

export const jackLantern: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {p.night && <Glow cx={50} cy={64} r={46} strength={0.5} />}
      {contact(p, 50, 92.2, 34, 2.4)}
      {solid(p, jack.l1, PUMPKIN.lobe)}
      {solid(p, jack.l2, PUMPKIN.lobe)}
      {solid(p, jack.l3, PUMPKIN.skin)}
      {solid(p, jack.l4, PUMPKIN.skin)}
      {solid(p, jack.l5, PUMPKIN.skin, [
        <path d={CARVE} fill={lit(p, '#8A5540', '#FFD27A')} />,
        p.night ? <path d="M40.4 56.8L41.6 54.2L42.8 56.8ZM57.2 56.8L58.4 54.2L59.6 56.8Z" fill="#FFF1C8" /> : null,
        thin(p, 'M38 33.6C44 36.6 56 36.6 62 33.6', '#C8784A', 1.1, 0.9),
      ])}
      {solid(p, jack.stem, PUMPKIN.stem)}
    </g>
  );
};

/* ================================ Winter ================================ */

const SNOW = { snow: '#FDFBF8', twig: '#8E6A52', carrot: '#F0A15E', coal: '#4A4046' };

const snow = shapes('decor-snowman', {
  base: ell(50, 72, 22, 20),
  middle: ell(50, 44.5, 15.6, 14.6),
  head: ell(50, 22.5, 11, 10.6),
});

export const snowman: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    // A white subject: the firmer day crescent keeps its edge on a cream card.
    <g style={pale(p)}>
      {contact(p, 50, 92.2, 26, 2.6)}
      {thin(p, 'M63.6 42L80.6 30.6M74.6 34.6L78.4 26.2M77.4 32.8L85 31.6', SNOW.twig, 1.8)}
      {solid(p, snow.base, SNOW.snow)}
      {solid(p, snow.middle, SNOW.snow, [
        <circle cx={50} cy={39.6} r={1.7} fill={p.c(SNOW.coal)} />,
        <circle cx={50} cy={47.6} r={1.7} fill={p.c(SNOW.coal)} />,
      ])}
      {solid(p, snow.head, SNOW.snow, [
        <circle cx={45.8} cy={20} r={1.55} fill={p.c(SNOW.coal)} />,
        <circle cx={54.2} cy={20} r={1.55} fill={p.c(SNOW.coal)} />,
        <path d="M50 23.2L41.4 25.2L50 26.4Z" fill={p.c(SNOW.carrot)} />,
      ])}
    </g>
  );
};

/* Odd mitten: one mitten, pair unknown, now a sleeping bag */

const MITT = { wool: '#A8C0D8', cuff: '#F5EEE2', rib: '#E3DACB', inside: '#8D8AA8', band: '#F5EEE2' };

/**
 * Lying on its side like a sleeping bag: the ribbed cuff open on the left, the fingers rounded off
 * on the right, the thumb angled up toward them, and a Fair Isle band knitted across the hand.
 */
const mitten = shapes('decor-odd-mitten', {
  thumb: {
    d: closed([
      [37, 62],
      [38.6, 51],
      [44, 42.6],
      [52, 37.4],
      [58.6, 37.6],
      [61.4, 42],
      [58.6, 49],
      [55.4, 60],
    ]),
    k: 0.7,
  },
  body: closed([
    [26, 91.6],
    [25, 74],
    [27.4, 60.4],
    [40, 56.6],
    [60, 56],
    [78, 57.8],
    [90.6, 64.6],
    [95, 76.6],
    [91, 87.6],
    [80, 91.8],
  ]),
  band: { d: 'M31 50H40.4V96H31Z', k: 0, clip: 'body' },
  stripe: { d: 'M43 50H45.4V96H43Z', k: 0, clip: 'body' },
  cuff: rect(7, 57.6, 21, 34.4, [3, 1, 1, 3]),
});

/** Little diamonds knitted down the band. */
const MITT_DIAMONDS = [62.6, 68.6, 74.6, 80.6, 86.6].map((y) => `M35.7 ${y - 2.3}L37.9 ${y}L35.7 ${y + 2.3}L33.5 ${y}Z`).join('');

export const oddMitten: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 45, 2.4)}
      {solid(p, mitten.thumb, MITT.wool)}
      {solid(p, mitten.body, MITT.wool, [
        flat(p, mitten.band, MITT.band),
        flat(p, mitten.stripe, MITT.band),
        <path d={MITT_DIAMONDS} fill={p.c(MITT.wool)} />,
      ])}
      {solid(p, mitten.cuff, MITT.cuff, [
        <path d={ell(10.4, 74.8, 2.8, 14.4)} fill={p.c(MITT.inside)} />,
        thin(p, 'M15.4 60.6V90M19.6 60.2V90.4M23.6 60.4V90.2', MITT.rib, 1.2),
      ])}
    </g>
  );
};

/* Paper star: folded, with a light inside; hangs by a thread */

const STAR_C: Pt = [50, 54];
const STAR_PTS: Pt[] = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 14 : 34;
  const a = ((-90 + i * 36) * Math.PI) / 180;
  return [STAR_C[0] + r * Math.cos(a), STAR_C[1] + r * Math.sin(a)];
});
/** The ten folded facets: each point is two triangles meeting along its ridge. */
const FACETS = STAR_PTS.map((_, i) => [STAR_C, STAR_PTS[i]!, STAR_PTS[(i + 1) % 10]!] as const);
const TO_LIGHT = { left: [-0.9, -0.45], top: [0, -1], right: [0.9, -0.45] } as const;

const starShapes = shapes('decor-paper-star', {
  star: star(50, 54, 34, 14),
});

export const paperStar: DecorRenderer = (o) => {
  const p = paint(o);
  const [lx, ly] = TO_LIGHT[p.from];
  const facets = FACETS.map(([c, a, b], i) => {
    // Which way the facet tilts: along the ridge side it shares with its neighbour.
    const mx = (a[0] + b[0]) / 3 + c[0] / 3 - c[0];
    const my = (a[1] + b[1]) / 3 + c[1] / 3 - c[1];
    const len = Math.hypot(mx, my) || 1;
    const side = i % 2 ? 1 : -1;
    const facing = ((mx / len) * lx + (my / len) * ly) * 0.6 + side * 0.4;
    const d = `M${n(c[0])} ${n(c[1])}L${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}Z`;
    return facing < 0 ? <path key={i} d={d} fill={p.shade} opacity={p.night ? 0.55 : 1} /> : null;
  });
  return (
    <g>
      {p.night && <Glow cx={50} cy={54} r={46} strength={0.6} />}
      {thin(p, 'M50 0.6V20', '#8C7F86', 1)}
      {solid(p, starShapes.star, p.night ? '#FFD891' : p.c('#F6E6AE'), facets, true)}
    </g>
  );
};

/* ================================ Valentine ================================ */

const LETTER = { paper: '#FBF4E8', fold: '#F0E4D2', flap: '#FDF8F1', seal: '#EFA3B4' };
const tilt = (pts: readonly Pt[]) => rotate(pts, -8, 30, 91);
const env = (x: number, y: number) => tilt([[x, y]])[0]!;

const letter = shapes('decor-love-letter', {
  envelope: poly(
    tilt([
      [16, 45],
      [84, 45],
      [84, 91],
      [16, 91],
    ]),
    1.4,
  ),
  sides: {
    d: poly(
      tilt([
        [16, 46],
        [50, 70],
        [84, 46],
        [84, 91],
        [16, 91],
      ]),
    ),
    k: 0,
  },
  bottom: {
    d: poly(
      tilt([
        [16, 91],
        [50, 64],
        [84, 91],
      ]),
    ),
    k: 0,
  },
  flap: {
    d: poly(
      tilt([
        [16, 45],
        [84, 45],
        [50, 73],
      ]),
      [1.4, 1.4, 2],
    ),
    k: 0.3,
  },
  seal: { d: heart(...env(50, 72.4), 11, -1), k: 0.5 },
});

export const loveLetter: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 52, 92.2, 34, 2.2)}
      {solid(p, letter.envelope, LETTER.paper, [flat(p, letter.sides, LETTER.fold), flat(p, letter.bottom, LETTER.paper)])}
      {solid(p, letter.flap, LETTER.flap)}
      {solid(p, letter.seal, LETTER.seal)}
    </g>
  );
};

/* Bud vase: one stem in a small glass bottle */

const VASE = { glass: '#DCEBDD', water: '#C8E0D2', stem: '#86AE74', bloom: '#F2B3C1', petal: '#E99AAE', core: '#DC8699' };

const vase = shapes('decor-bud-vase', {
  bottle: 'M35 70C35 61.4 42.4 58 45.4 53.4V41.6H54.6V53.4C57.6 58 65 61.4 65 70V86.6C65 89.6 63.2 91.6 60 91.6H40C36.8 91.6 35 89.6 35 86.6Z',
  water: { d: rect(30, 71, 40, 22), k: 0, clip: 'bottle' },
  lip: { d: rect(43.6, 37.6, 12.8, 4.6, 1.6), k: 0.4 },
  leaf: { d: leaf([50.6, 34], [64, 26], 4.4, 0.02), k: 0.5 },
  bloomBack: { d: ell(48.4, 17, 11.2, 10), k: 0.5 },
  bloomFront: { d: 'M37.6 17.4C39 25.4 44 29.4 49 29.4C55 29.4 59.4 25 60 17.4C57 20.6 53.6 21.8 49 21.8C44 21.8 40.4 20.4 37.6 17.4Z', k: 0.5 },
});

export const budVase: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 20, 2.2)}
      {thin(p, 'M50 76C50.4 58 49.6 40 48.8 24', VASE.stem, 1.6)}
      {solid(p, vase.leaf, VASE.stem)}
      {solid(p, vase.bloomBack, VASE.bloom, [thin(p, 'M42 14.4C45 10.6 51 10 54.6 13.6M44.6 19.4C47 15.6 51.4 15.6 53.6 18.4', VASE.petal, 1.3)])}
      {solid(p, vase.bloomFront, VASE.petal)}
      <path d={vase.bottle.d} fill={p.c(VASE.glass)} opacity={0.85} />
      {flat(p, vase.water, VASE.water)}
      {thin(p, 'M50 91V60', VASE.stem, 1.6, 0.6)}
      <path d={rect(38.6, 64, 3.6, 22, 1.8)} fill="#fff" opacity={p.night ? 0.25 : 0.7} />
      {crescentOf(p, vase.bottle)}
      {solid(p, vase.lip, VASE.glass)}
    </g>
  );
};

/* Tiny bouquet: five sweet peas tied with thread; each a round banner petal over two small wings */

const PEA = { stem: '#86AE74', leaf: '#9CBF8A', thread: '#E2707A' };
const BLOOMS: readonly (readonly [number, number, string, string, number])[] = [
  [30, 30, '#F2B8C6', '#E79AAE', -20],
  [48, 20, '#DDB6DA', '#C99BC6', 5],
  [24, 48, '#CDBFE6', '#B4A4D8', -40],
  [44, 38, '#FBF1E6', '#F0D9E0', -10],
  [62, 30, '#F4BFC6', '#E7A0AE', 20],
];

/** A sweet pea's banner: the big round upper petal, its edge softly waved. */
function banner(cx: number, cy: number, r: number, rot: number): string {
  const pts = Array.from({ length: 10 }, (_, i): Pt => {
    const a = ((i * 36 - 90) * Math.PI) / 180;
    const k = i % 2 ? 0.95 : 1;
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.92];
  });
  return smooth(rotate(pts, rot, cx, cy));
}

/** Its two small wing petals, side by side under the banner (with the keel tucked between). */
function wings(cx: number, cy: number, rot: number): string {
  const [l, r] = rotate(
    [
      [cx - 3.4, cy + 6.6],
      [cx + 3.4, cy + 6.6],
    ],
    rot,
    cx,
    cy,
  );
  return ell(l![0], l![1], 3.6, 3, rot - 20) + ell(r![0], r![1], 3.6, 3, rot + 20);
}

const bouquet = shapes('decor-tiny-bouquet', {
  ...Object.fromEntries(BLOOMS.map(([x, y, , , rot], i) => [`s${i}`, { d: banner(x, y, 8.2, rot), k: 0.5 }])),
  ...Object.fromEntries(BLOOMS.map(([x, y, , , rot], i) => [`w${i}`, { d: wings(x, y, rot), k: 0.3 }])),
  leafA: { d: leaf([52, 58], [36, 60], 3.6), k: 0.4 },
  leafB: { d: leaf([56, 56], [70, 48], 3.4), k: 0.4 },
} as Record<string, { d: string; k: number }>);

export const tinyBouquet: DecorRenderer = (o) => {
  const p = paint(o);
  const stems = BLOOMS.map(([x, y]) => `M${60 + (x - 44) * 0.06} 90C${58 + (x - 44) * 0.12} 74 ${x + (58 - x) * 0.4} ${y + 24} ${x} ${y + 6}`).join('');
  return (
    <g>
      {contact(p, 60, 92.2, 12, 1.8)}
      {thin(p, stems, PEA.stem, 1.4)}
      {thin(p, 'M40 44C35 46 33 50 36 52.6C38.6 54.6 40.6 51.4 38.4 50.4', PEA.stem, 1)}
      {solid(p, bouquet.leafA!, PEA.leaf)}
      {solid(p, bouquet.leafB!, PEA.leaf)}
      {BLOOMS.map(([, , c, deep], i) => (
        <g key={i}>
          {solid(p, bouquet[`s${i}`]!, c)}
          {solid(p, bouquet[`w${i}`]!, deep)}
        </g>
      ))}
      {thin(p, 'M55.4 72.6L62.4 71.4M55.6 75L62.6 73.8', PEA.thread, 1.2)}
      {thin(p, 'M62.4 72.6C66 68 69.6 70.6 66.6 73.2C69.6 75.6 66.6 79.4 62.6 74.2M62.8 73.6L65.6 80.4', PEA.thread, 1)}
    </g>
  );
};

/* ================================ Spring ================================ */

const WAGASA = { paper: '#F2B8C4', under: '#E29AAA', ring: '#FBF1E6', rib: '#D895A3', bamboo: '#D6B584', wrap: '#A98262' };
const UMB_PIVOT: Pt = [60, 92];
const lean16 = (pts: readonly Pt[]) => rotate(pts, -14, ...UMB_PIVOT);

const DOME: Pt[] = [
  [10, 48],
  [15, 37],
  [26, 26],
  [38, 20],
  [50, 18],
  [62, 20],
  [74, 26],
  [85, 37],
  [90, 48],
  ...ellPts(50, 48, 40, 5.4, 0, 180, 10).slice(1, -1),
];
const UNDER: Pt[] = [...ellPts(50, 48, 40, 5.4, 0, 180, 10), ...ellPts(50, 48.4, 40, 9.4, 180, 0, 10).slice(1, -1)];

const umbrella = shapes('decor-paper-umbrella', {
  under: { d: poly(lean16(UNDER)), k: 0.2 },
  dome: smooth(lean16(DOME)),
  ring: { d: `${smooth(lean16(ellPts(50, 27, 24, 6, 0, 360, 16).slice(0, -1)))}`, k: 0, clip: 'dome' },
  cap: { d: smooth(lean16(ellPts(50, 22, 13, 4, 0, 360, 12).slice(0, -1))), k: 0, clip: 'dome' },
  shaft: {
    d: poly(
      lean16([
        [48.8, 56],
        [51.2, 56],
        [51.2, 91],
        [48.8, 91],
      ]),
      1,
    ),
    k: 0.5,
  },
});

export const paperUmbrella: DecorRenderer = (o) => {
  const p = paint(o);
  const tip = lean16([[50, 18]])[0]!;
  const ribs = lean16(ellPts(50, 48, 40, 5.4, 10, 170, 6))
    .map(([x, y]) => `M${n(tip[0])} ${n(tip[1])}L${n(x)} ${n(y)}`)
    .join('');
  const under = lean16(ellPts(50, 48.4, 40, 9.4, 20, 160, 7));
  const hub = lean16([[50, 56]])[0]!;
  return (
    <g>
      {contact(p, 58, 92.2, 10, 1.8)}
      {solid(p, umbrella.under, WAGASA.under, thin(p, under.map(([x, y]) => `M${n(hub[0])} ${n(hub[1])}L${n(x)} ${n(y)}`).join(''), WAGASA.rib, 0.9))}
      {solid(
        p,
        umbrella.shaft,
        WAGASA.bamboo,
        <path
          d={poly(
            lean16([
              [48.6, 78],
              [51.4, 78],
              [51.4, 88],
              [48.6, 88],
            ]),
          )}
          fill={p.c(WAGASA.wrap)}
        />,
      )}
      {solid(p, umbrella.dome, WAGASA.paper, [flat(p, umbrella.ring, WAGASA.ring), flat(p, umbrella.cap, WAGASA.paper), thin(p, ribs, WAGASA.rib, 0.9, 0.9)])}
      <circle cx={n(tip[0])} cy={n(tip[1] - 1)} r={2} fill={p.c(WAGASA.bamboo)} />
    </g>
  );
};

/* Robin's nest: three blue eggs, left well alone */

const NEST = { twig: '#A98465', twigLight: '#C8A583', twigDark: '#8A6A50', hollow: '#7C5F4A', egg: '#A9D5D6' };

const nest = shapes('decor-robin-nest', {
  back: { d: ell(50, 62, 41, 11), k: 0 },
  e1: { d: ell(38.6, 58.6, 8, 10, -16), k: 0.6 },
  e2: { d: ell(62, 58.6, 7.8, 9.8, 16), k: 0.6 },
  e3: { d: ell(50.4, 60.4, 8.2, 10.2), k: 0.6 },
  front: 'M8.6 62C11.6 81 28 90.6 50 91.4C72 90.6 88.4 81 91.4 62C85 68.6 70 72 50 72C30 72 15 68.6 8.6 62Z',
});

export const robinNest: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92, 40, 2.4)}
      {flat(p, nest.back, NEST.twig)}
      <path d={ell(50, 63, 33, 7.4)} fill={p.c(NEST.hollow)} />
      {solid(p, nest.e1, NEST.egg)}
      {solid(p, nest.e2, NEST.egg)}
      {solid(p, nest.e3, NEST.egg)}
      {solid(p, nest.front, NEST.twig, [
        thin(
          p,
          'M12 67C26 76 46 78 62 77M18 76C34 84 58 85 78 78M14 64C28 70 46 72 60 71.4M40 88C54 89 70 86 84 76M66 72C76 71 84 68 90 64',
          NEST.twigLight,
          1.1,
        ),
        thin(p, 'M20 71C34 78 56 80 74 74M28 84C42 88 60 88 74 83M10 64.4C22 69.6 38 72 50 72', NEST.twigDark, 1),
      ])}
      {thin(p, 'M8 60C14 56 22 56 26 54.6M74 54C80 55 88 57 92.6 61M10.4 64L5.6 66M90 64.4L95 63', NEST.twigLight, 1.1)}
    </g>
  );
};

/* Seed tray: twelve cells, eleven sprouted */

const TRAY = { wood: '#DDB88E', top: '#E7C9A2', soil: '#7C604F', sprout: '#9CBF8A', sproutLight: '#B5CC9C', label: '#FBF6EC' };
const CELLS_X = [15.6, 29, 42.4, 55.8, 69.2, 82.6];

const tray = shapes('decor-seed-tray', {
  top: {
    d: poly(
      [
        [6, 74],
        [94, 74],
        [90.6, 61],
        [9.4, 61],
      ],
      1.2,
    ),
    k: 0.2,
  },
  front: rect(6, 73.6, 88, 18.4, [0.8, 0.8, 1.6, 1.6]),
});

function sprout(p: Paint, x: number, y: number, h: number, s: number): JSX.Element[] {
  return [
    thin(p, `M${x} ${y}C${x - 0.4} ${y - h * 0.5} ${x + 0.6} ${y - h * 0.8} ${x} ${y - h}`, TRAY.sprout, 1.2 * s),
    <path d={leaf([x, y - h], [x - 5.6 * s, y - h - 3 * s], 2.2 * s)} fill={p.c(TRAY.sproutLight)} />,
    <path d={leaf([x, y - h], [x + 5.6 * s, y - h - 3.4 * s], 2.2 * s)} fill={p.c(TRAY.sprout)} />,
  ];
}

export const seedTray: DecorRenderer = (o) => {
  const p = paint(o);
  const back = CELLS_X.map((x) => [x * 0.92 + 4, 64.4] as const);
  const front = CELLS_X.map((x) => [x, 70.4] as const);
  return (
    <g>
      {contact(p, 50, 92.2, 45, 2.4)}
      {solid(p, tray.top, TRAY.top, [
        ...back.map(([x, y], i) => <path key={`b${i}`} d={rect(x - 4.8, y - 1.8, 9.6, 3.6, 1.6)} fill={p.c(TRAY.soil)} />),
        ...front.map(([x, y], i) => <path key={`f${i}`} d={rect(x - 5.4, y - 2, 10.8, 4, 1.8)} fill={p.c(TRAY.soil)} />),
      ])}
      {back.flatMap(([x, y], i) => sprout(p, x, y, 10 + (i % 3) * 1.4, 0.85))}
      <path
        d={poly(
          [
            [28.2, 64.6],
            [30.2, 64.6],
            [30.4, 50.4],
            [29.2, 48.4],
            [28, 50.4],
          ],
          0.4,
        )}
        fill={p.c(TRAY.label)}
      />
      {front.flatMap(([x, y], i) => (i === 3 ? [] : sprout(p, x, y, 12 + ((i * 2) % 3) * 1.6, 1)))}
      {solid(p, tray.front, TRAY.wood, thin(p, 'M10 83H38M52 86H86', '#CDA67A', 0.9, 0.9))}
    </g>
  );
};

/* ================================ Summer ================================ */

const SAND = {
  sand: '#EBD3A4',
  wet: '#DDC08A',
  ridge: '#E2C48F',
  door: '#B89565',
  water: '#B3D1E8',
  waterDeep: '#9DC2DE',
  dimple: '#D6B983',
  flag: '#EFB4C1',
  stick: '#C9A36F',
};

/** One bucket-moulded tower: slightly tapered, with four merlons pressed into its top. */
const TOWER_TOP = 36;
const TOWER_BASE = 72;
const MERLON = 5.2;
const CRENEL = 2;
function towerPts(): Pt[] {
  const x0 = 36.6;
  const pts: Pt[] = [
    [32.6, TOWER_BASE],
    [x0, TOWER_TOP],
  ];
  for (let i = 0; i < 4; i++) {
    const l = x0 + i * (MERLON + CRENEL);
    pts.push([l, 28], [l + MERLON, 28]);
    if (i < 3) pts.push([l + MERLON, 32.4], [l + MERLON + CRENEL, 32.4]);
  }
  pts.push([100 - x0, TOWER_TOP], [100 - 32.6, TOWER_BASE]);
  return pts;
}

const castle = shapes('decor-sandcastle', {
  moat: { d: ell(50, 86.6, 45, 6.6), k: 0 },
  mound: closed([
    [16, 88],
    [20, 78],
    [30, 71.4],
    [50, 69.4],
    [70, 71.4],
    [80, 78],
    [84, 88],
  ]),
  tower: poly(towerPts(), 0.8),
  /** The bucket's moulded ridges, as flat bands round the tower. */
  ridges: { d: 'M20 43H80V45.6H20ZM20 58H80V60.6H20Z', k: 0, clip: 'tower' },
  door: { d: 'M45.4 72V65.6C45.4 62.6 47.4 60.8 50 60.8C52.6 60.8 54.6 62.6 54.6 65.6V72Z', k: -0.35 },
  flag: {
    d: poly(
      [
        [51, 11],
        [63.6, 14.6],
        [51, 18.2],
      ],
      0.6,
    ),
    k: 0.4,
  },
});

/** A few dimples pressed in by a fingertip, not a pattern. */
const DIMPLES = dots(
  [
    [41.4, 51],
    [57.6, 52.4],
    [49.6, 38.6],
    [40.6, 66.6],
  ],
  1.1,
);

export const sandcastle: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {flat(p, castle.moat, SAND.water)}
      <path d={ell(50, 86.2, 36, 4.2)} fill={p.c(SAND.wet)} />
      {solid(p, castle.mound, SAND.sand)}
      {thin(p, 'M50 28.6V12', SAND.stick, 1)}
      {solid(p, castle.flag, SAND.flag)}
      {solid(p, castle.tower, SAND.sand, [flat(p, castle.ridges, SAND.ridge), <path d={DIMPLES} fill={p.c(SAND.dimple)} />])}
      {solid(p, castle.door, SAND.door)}
      {thin(p, 'M12 88.6C20 91.2 34 92.4 50 92.4C66 92.4 80 91.2 88 88.6', SAND.waterDeep, 1.2, 0.8)}
    </g>
  );
};

/* Beach umbrella: striped, and just big enough for a nap */

const BEACH = { stripe: '#F2B6C3', cream: '#FBF3E6', pole: '#D9B98E', sand: '#EBD3A4' };
const CANOPY_PTS: Pt[] = [
  [7, 44],
  [13, 32],
  [25, 21],
  [38, 15.6],
  [50, 14.4],
  [62, 15.6],
  [75, 21],
  [87, 32],
  [93, 44],
];
const HEM = Array.from({ length: 9 }, (_, i) => 7 + i * (86 / 8));

const beach = shapes('decor-beach-umbrella', {
  pole: { d: rect(48.4, 15, 3.2, 72), k: 0.6 },
  mound: closed([
    [34, 92],
    [40, 86.4],
    [50, 84.6],
    [60, 86.4],
    [66, 92],
  ]),
  canopy: `${smooth(CANOPY_PTS, false)}${HEM.slice(1)
    .reverse()
    .map((x) => `Q${n(x + 86 / 16)} ${n(52)} ${n(x - 86 / 8)} ${n(44)}`)
    .join('')}Z`,
  stripes: {
    d: [0, 2, 4, 6].map((i) => `M50 10L${n(HEM[i]! - 1)} 54L${n(HEM[i + 1]! + 1)} 54Z`).join(''),
    k: 0,
    clip: 'canopy',
  },
});

export const beachUmbrella: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 20, 2)}
      {solid(p, beach.pole, BEACH.pole)}
      {solid(p, beach.mound, BEACH.sand)}
      {solid(p, beach.canopy, BEACH.cream, flat(p, beach.stripes, BEACH.stripe))}
      <path d={ell(50, 13, 2.6, 2.2)} fill={p.c(BEACH.pole)} />
    </g>
  );
};

/* Seashell: a scallop lying open, used as a very small bath */

const SHELL = {
  shell: '#F4C9B6',
  rib: '#E8AF98',
  inside: '#FBE4D8',
  lid: '#F8D5C5',
  lidRib: '#EDBBA6',
  water: '#BFDCEA',
  ear: '#E8B39D',
};
/** Where the two valves are hinged: at the back of the bowl. */
const HINGE: Pt = [50, 66];
const LID_EDGE = ellPts(HINGE[0], HINGE[1], 36, 42, 196, 344, 16);
/** A scalloped fan from the hinge through `edge`: one soft bump per rib. */
const fan = (edge: readonly Pt[]) =>
  `M${n(HINGE[0])} ${n(HINGE[1])}${edge
    .map(([x, y], i) =>
      i === 0 ? `L${n(x)} ${n(y)}` : `Q${n((x + edge[i - 1]![0]) / 2 + (x - 50) * 0.03)} ${n((y + edge[i - 1]![1]) / 2 - 2.4)} ${n(x)} ${n(y)}`,
    )
    .join('')}Z`;
/** Rib stripes radiating from `from`, one per pair of edge points. */
const ribs = (from: Pt, edge: readonly Pt[], len: number, spread = 0.07) =>
  edge
    .filter((_, i) => i % 2 === 1)
    .map(([x, y]) => {
      const a = Math.atan2(y - from[1], x - from[0]);
      const l: Pt = [from[0] + Math.cos(a - spread) * len, from[1] + Math.sin(a - spread) * len];
      const r: Pt = [from[0] + Math.cos(a + spread) * len, from[1] + Math.sin(a + spread) * len];
      return `M${n(from[0])} ${n(from[1])}L${n(l[0])} ${n(l[1])}L${n(r[0])} ${n(r[1])}Z`;
    })
    .join('');
/** The bowl's belly, seen from the front: its ribs run back up to the hinge. */
const BELLY_RIBS = ellPts(50, 74, 38, 18, 10, 170, 16).map(([x, y]): Pt => [x, y + 2]);

const shell = shapes('decor-seashell', {
  lid: { d: fan(LID_EDGE), k: 0.6 },
  lidRibs: { d: ribs(HINGE, LID_EDGE, 60), k: 0, clip: 'lid' },
  bowl: 'M12 72C12 67 29 64 50 64C71 64 88 67 88 72C87 83 70 91.4 50 91.4C30 91.4 13 83 12 72Z',
  bowlRibs: { d: ribs([50, 40], BELLY_RIBS, 70, 0.035), k: 0, clip: 'bowl' },
  inside: { d: ell(50, 71.6, 34.6, 6.6), k: 0 },
  water: { d: ell(50, 73.2, 30, 4.8), k: 0, clip: 'inside' },
  ears: {
    d: poly(
      [
        [38, 67.4],
        [40.6, 60.4],
        [50, 62.6],
        [59.4, 60.4],
        [62, 67.4],
        [50, 68.4],
      ],
      1.4,
    ),
    k: 0.4,
  },
});

export const seashell: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 36, 2.2)}
      {solid(p, shell.lid, SHELL.lid, flat(p, shell.lidRibs, SHELL.lidRib))}
      {solid(p, shell.ears, SHELL.ear)}
      {solid(p, shell.bowl, SHELL.shell, flat(p, shell.bowlRibs, SHELL.rib))}
      {flat(p, shell.inside, SHELL.inside)}
      {flat(p, shell.water, SHELL.water)}
    </g>
  );
};
