/**
 * Served treats: things in a cup, on a saucer or on a spoon. Salmon flakes, strawberry milk, a
 * cheese wedge, a pup cup, custard pudding, a honey drop, sunflower seeds, barley tea, a baked apple,
 * pumpkin purée, a roasted chestnut, warm oats and frozen yoghurt. On the 100×100 canvas, standing
 * on y = 86.
 */
import type { ItemRenderer } from './types';
import { cast, contact, crescentOf, flat, paint, shapes, solid, thin, type ShapeDef } from '@/art/scene/decor/kit';
import { ell, n, poly, rect, rotate, scale, smooth, type Pt } from '@/art/scene/decor/geo';
import { saucer } from './tableware';

const STEAM = '#FFFFFF';
const steam = (p: ReturnType<typeof paint>, d: string) => thin(p, d, STEAM, 2, p.night ? 0.22 : 0.65);

/* ---------------- Salmon flakes: a pinch of pink flakes on a saucer ---------------- */

const SALMON = { under: '#E4836A', flake: '#F2967A', light: '#F7B29C', fat: '#FAD5C7' };
const salmonSaucer = saucer('treat-salmon', 50, 70, 42);
/** Torn flakes in a low heap, back to front: angular, uneven, no two alike. The pale one is on top. */
const FLAKES: readonly (readonly Pt[])[] = [
  [
    [25, 60.4],
    [29.6, 53],
    [36, 51.6],
    [38.6, 49.4],
    [45.4, 53.4],
    [43.6, 59.6],
    [35.4, 62.6],
  ],
  [
    [52, 52.6],
    [57, 48],
    [62.4, 49.2],
    [67.4, 47.6],
    [73.6, 54.4],
    [68, 60.4],
    [57.4, 59.4],
  ],
  [
    [38.6, 47.6],
    [43, 41.4],
    [48.6, 41.8],
    [53.4, 39],
    [58.6, 43.6],
    [55.4, 50.4],
    [45.6, 51.6],
  ],
  [
    [21.4, 66.4],
    [27, 60.6],
    [33.6, 60.4],
    [37.4, 58.4],
    [44.4, 62.4],
    [40.4, 69.4],
    [29.4, 70.6],
  ],
  [
    [61, 64.6],
    [66, 58.4],
    [71.4, 59.6],
    [75.4, 57.6],
    [80.6, 62.6],
    [76.4, 68.4],
    [66.4, 69],
  ],
  [
    [41.4, 63.4],
    [47, 57.2],
    [52.4, 57.8],
    [57.4, 55.6],
    [63.6, 60.4],
    [59.4, 67.8],
    [48, 69],
  ],
];
/** Short pale fat lines across the grain, on two flakes only. */
const FAT: Record<number, string> = {
  2: 'M45.6 43.4L44 48.6M50 42.6L48.6 48.4M54.4 43.4L53 47.8',
  5: 'M48 60L46.4 65.6M52.6 59.4L51 65.4M57.2 59.2L55.8 64.6',
};

/** The heap sits low and close: flakes overlap, as a pinch of salmon does. */
const heap = (pts: readonly Pt[]) => scale(pts, 1.16, 1, 51, 58).map(([x, y]): Pt => [x, 58 + (y - 58) * 0.9]);
const salmonShapes = shapes('treat-salmon', Object.fromEntries(FLAKES.map((pts, i) => [`f${i}`, { d: poly(heap(pts), 0.9), k: 0.6 }])));
/** The heap beneath the top flakes, so the pile reads as one pinch with no gaps. */
const salmonHeap = shapes('treat-salmon', {
  heap: smooth([
    [20, 67],
    [26, 57],
    [38, 50],
    [52, 45],
    [66, 49],
    [78, 57],
    [82, 66],
    [66, 70.4],
    [50, 71],
    [34, 70.6],
  ]),
});
const FAT_LINES: Record<number, string> = Object.fromEntries(
  Object.entries(FAT).map(([i, d]) => [
    i,
    d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x: string, y: string) => {
      const [[hx, hy]] = heap([[+x, +y]]) as [Pt];
      return `${n(hx)} ${n(hy)}`;
    }),
  ]),
);

const salmon: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {salmonSaucer(p)}
      {solid(p, salmonHeap.heap, SALMON.under)}
      {FLAKES.map((_, i) => (
        <g key={i}>{solid(p, salmonShapes[`f${i}`]!, i === 5 ? SALMON.light : SALMON.flake, FAT_LINES[i] ? thin(p, FAT_LINES[i], SALMON.fat, 1) : null)}</g>
      ))}
    </g>
  );
};

/* ---------------- Strawberry milk: pink milk in a glass bottle with a paper straw ---------------- */

const MILK = {
  glass: '#E6EFF1',
  milk: '#F4BFC6',
  straw: '#FFF8F0',
  stripe: '#E98FA2',
  label: '#FFF8F0',
  berry: '#E4717B',
};

const milk = shapes('treat-strawberry-milk', {
  bottle: 'M40 16H60V26C60 30 70 34 70 44V82C70 84.6 68.4 86 66 86H34C31.6 86 30 84.6 30 82V44C30 34 40 30 40 26Z',
  milk: { d: rect(20, 38, 60, 60), k: 0, clip: 'bottle' },
  label: { d: rect(20, 56, 60, 16), k: 0, clip: 'bottle' },
  lip: { d: rect(38.6, 13.6, 22.8, 4.6, 1.8), k: 0.4 },
});

const strawberryMilk: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 50, 86.2, 22, 2.2)}
      {thin(p, 'M52 60L66 4', MILK.straw, 5)}
      {thin(p, 'M63.8 12.6L65.2 7M61.8 20.6L63.2 15M59.8 28.6L61.2 23', MILK.stripe, 2.2)}
      <path d={milk.bottle.d} fill={p.c(MILK.glass)} />
      {flat(p, milk.milk, MILK.milk)}
      {flat(p, milk.label, MILK.label)}
      <path d="M50 58.8C52.4 58.8 54 60.2 54 62.4C54 65 51.8 67.6 50 69C48.2 67.6 46 65 46 62.4C46 60.2 47.6 58.8 50 58.8Z" fill={p.c(MILK.berry)} />
      <path d="M47.4 59.4C48.6 58 51.4 58 52.6 59.4C51.4 60.4 48.6 60.4 47.4 59.4Z" fill={p.c('#8DB57A')} />
      <path d={rect(33.6, 42, 3.4, 34, 1.7)} fill="#fff" opacity={p.night ? 0.3 : 0.75} />
      {crescentOf(p, milk.bottle)}
      {solid(p, milk.lip, MILK.glass)}
    </g>
  );
};

/* ---------------- Cheese wedge: a little wedge with a proper rind ---------------- */

const CHEESE = {
  face: '#F6D98A',
  top: '#FAE6AE',
  rind: '#E2A955',
  hole: '#E6C36C',
};

const cheese = shapes('treat-cheese', {
  rind: {
    d: poly(
      [
        [80, 36],
        [90, 42],
        [90, 80],
        [80, 84],
      ],
      1.4,
    ),
    k: 0.6,
  },
  top: {
    d: poly(
      [
        [10, 58],
        [80, 36],
        [90, 42],
        [22, 62],
      ],
      1.4,
    ),
    k: 0,
  },
  face: 'M10 58L80 36V84H10Z',
});

const cheeseWedge: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 50, 85.8, 42, 2.4)}
      {solid(p, cheese.rind, CHEESE.rind)}
      {flat(p, cheese.top, CHEESE.top)}
      {solid(p, cheese.face, CHEESE.face, [
        <path d={ell(34, 70, 5, 4.2)} fill={p.c(CHEESE.hole)} />,
        <path d={ell(58, 58, 6, 5)} fill={p.c(CHEESE.hole)} />,
        <path d={ell(64, 76, 3.6, 3)} fill={p.c(CHEESE.hole)} />,
        <path d={ell(46, 78, 2.6, 2.2)} fill={p.c(CHEESE.hole)} />,
      ])}
      <path d="M80 58C77 58 75.6 60.6 75.6 63C75.6 65.4 77 68 80 68Z" fill={p.c(CHEESE.hole)} />
    </g>
  );
};

/* ---------------- Pup cup: a paper cup with a spoonful of cream in it ---------------- */

const PUP = {
  cup: '#FBF6EE',
  stripe: '#F4BFC6',
  cream: '#FFFBF6',
  swirl: '#EFE6DA',
};

const pup = shapes('treat-pup-cup', {
  cup: 'M24 50H76L69 84C68.6 85.4 67.6 86 66 86H34C32.4 86 31.4 85.4 31 84Z',
  stripe: { d: rect(10, 62, 80, 8), k: 0, clip: 'cup' },
  cream: smooth([
    [22, 50],
    [24, 40],
    [34, 34],
    [42, 26],
    [52, 22],
    [60, 28],
    [66, 34],
    [76, 40],
    [78, 50],
    [60, 53],
    [40, 53],
  ]),
});

const pupCup: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 50, 86.2, 22, 2.2)}
      {solid(p, pup.cup, PUP.cup, [flat(p, pup.stripe, PUP.stripe), cast(p, 'M24 50H76L75.4 53H24.6Z', 0.8)])}
      {solid(p, pup.cream, PUP.cream, thin(p, 'M30 44C40 48 60 48 70 44M38 36C46 39 56 39 62 35M46 28C50 30 54 30 56 27', PUP.swirl, 1.6))}
      <path d={rect(22.4, 48.6, 55.2, 3.2, 1.4)} fill={p.c(PUP.cup)} />
    </g>
  );
};

/* ---------------- Custard pudding: wobbles a little when set down ---------------- */

const PUD = { custard: '#F6D78C', caramel: '#C9803E', drip: '#D58E4A' };
const pudPlate = saucer('treat-pudding', 50, 78, 42);

const pud = shapes('treat-pudding', {
  body: 'M32 34H68C70 34 71 35 71.4 37L78 74C78 77 66 79.6 50 79.6C34 79.6 22 77 22 74L28.6 37C29 35 30 34 32 34Z',
  top: { d: ell(50, 35, 20, 4.4), k: 0 },
  drips: {
    d: 'M28 30H72V38C71 42 69 43 68 40C67 46 64 47 63 42C61 50 58 50 57 43C55 46 53 46 52 42C50 48 46 48 45 42C43 45 41 45 40 41C38 47 35 47 34 40C33 43 31 43 30 39Z',
    k: 0,
    clip: 'body',
  },
});

const pudding: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {pudPlate(p)}
      {solid(p, pud.body, PUD.custard, flat(p, pud.drips, PUD.drip))}
      {flat(p, pud.top, PUD.caramel)}
    </g>
  );
};

/* ---------------- Honey drop: a single drop on the end of a spoon ---------------- */

const HONEY = {
  pot: '#F4EAD8',
  band: '#E3A083',
  honey: '#F1B84C',
  glow: '#F7D07E',
  spoon: '#DDB98C',
};

const hon = shapes('treat-honey', {
  pot: 'M22 50C22 44 26 40 32 40H60C66 40 70 44 70 50V78C70 83 66 86 60 86H32C26 86 22 83 22 78Z',
  band: { d: rect(10, 52, 90, 7), k: 0, clip: 'pot' },
  rim: { d: rect(24, 36, 44, 7, 3), k: 0.4 },
  spoon: {
    d: poly(
      [
        [40, 38],
        [43, 38],
        [80, 60],
        [78, 63],
      ],
      1.2,
    ),
    k: 0.4,
  },
  bowl: ell(84, 64, 9, 5.4, 30),
  drop: 'M88 70C90.4 74.4 91.6 77.4 91.6 79.4C91.6 81.6 90 83 88 83C86 83 84.4 81.6 84.4 79.4C84.4 77.4 85.6 74.4 88 70Z',
});

const honeyDrop: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 52, 86.2, 32, 2.2)}
      {solid(p, hon.pot, HONEY.pot, [
        flat(p, hon.band, HONEY.band),
        <path
          d="M26 43H66V47C64 51 62 51 61 47.6C59 53 56 53 55 48C53 50 51 50 50 47C48 52 45 52 44 47.6C42 50 40 50 39 47C37 51 34 51 33 47.4C31 49 29 49 28 46Z"
          fill={p.c(HONEY.honey)}
        />,
      ])}
      {solid(p, hon.rim, HONEY.pot)}
      <path d={ell(46, 38.6, 18, 2.4)} fill={p.c(HONEY.honey)} />
      {solid(p, hon.spoon, HONEY.spoon)}
      {solid(p, hon.bowl, HONEY.spoon, <path d={ell(84.6, 63.4, 6.2, 3.4, 30)} fill={p.c(HONEY.honey)} />)}
      {solid(p, hon.drop, HONEY.honey, <ellipse cx={86.8} cy={78} rx={1} ry={1.8} fill={p.c(HONEY.glow)} />)}
    </g>
  );
};

/* ---------------- Sunflower seeds: cracked with great care, one at a time ---------------- */

const SEEDS = {
  husk: '#5E5559',
  stripe: '#EDE7E2',
  kernel: '#EEDCB4',
  shell: '#74696E',
};

/** A seed lying at (x, y): a long teardrop turned by `r` degrees, pointed end first. */
const SEED_AT: readonly (readonly [number, number, number])[] = [
  [30, 72, -20],
  [52, 76, 8],
  [72, 72, 30],
  [40, 60, 60],
  [62, 58, -40],
  [51, 46, 96],
];
const seedPts = (x: number, y: number, r: number): Pt[] =>
  rotate(
    [
      [x - 13, y],
      [x - 4, y - 6.6],
      [x + 8, y - 6.4],
      [x + 13, y - 2.4],
      [x + 13, y + 2.4],
      [x + 8, y + 6.4],
      [x - 4, y + 6.6],
    ],
    r,
    x,
    y,
  );

const seedShapes = shapes('treat-sunflower-seeds', {
  ...Object.fromEntries(SEED_AT.map(([x, y, r], i) => [`s${i}`, { d: poly(seedPts(x, y, r), [2, 5, 5, 3, 3, 5, 5]), k: 0.5, rim: true }])),
  shell: {
    d: poly(
      rotate(
        [
          [70, 84],
          [80, 80.4],
          [90, 81],
          [92, 84.6],
        ],
        0,
        0,
        0,
      ),
      [1, 3, 3, 1],
    ),
    k: 0.4,
  },
  kernel: { d: ell(20, 82.4, 7.4, 3.6, -8), k: 0.5 },
} as Record<string, ShapeDef>);

const sunflowerSeeds: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 52, 85.4, 40, 2.4)}
      {solid(p, seedShapes.shell!, SEEDS.shell)}
      {solid(p, seedShapes.kernel!, SEEDS.kernel)}
      {SEED_AT.map(([x, y, r], i) => {
        const stripes = [-2.8, 2.8].map((dy) => {
          const [a, b] = rotate(
            [
              [x - 8, y + dy * 0.7],
              [x + 11, y + dy],
            ],
            r,
            x,
            y,
          );
          return `M${n(a![0])} ${n(a![1])}L${n(b![0])} ${n(b![1])}`;
        });
        return <g key={i}>{solid(p, seedShapes[`s${i}`]!, SEEDS.husk, thin(p, stripes.join(''), SEEDS.stripe, 1.5))}</g>;
      })}
    </g>
  );
};

/* ---------------- Barley tea: caffeine-free, in a very small cup ---------------- */

const TEA = {
  cup: '#CFE0D2',
  foot: '#B9CFBF',
  tea: '#C68E4E',
  rim: '#E6EFE7',
  coaster: '#DDB88E',
};

const tea = shapes('treat-barley-tea', {
  coaster: 'M16 80V82C16 84.4 31 86.4 50 86.4C69 86.4 84 84.4 84 82V80Z',
  coasterTop: { d: ell(50, 80, 34, 5), k: 0 },
  cup: 'M26 40H74L70 76C69.6 79 60 80.6 50 80.6C40 80.6 30.4 79 30 76Z',
  rim: { d: ell(50, 40, 24, 5.4), k: 0 },
});

const barleyTea: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 50, 86.4, 36, 2)}
      {solid(p, tea.coaster, TEA.coaster)}
      {flat(p, tea.coasterTop, '#E7C9A2')}
      {solid(p, tea.cup, TEA.cup, thin(p, 'M30 66C40 69 60 69 70 66', TEA.foot, 1.6))}
      {flat(p, tea.rim, TEA.rim)}
      <path d={ell(50, 40.8, 21, 4.2)} fill={p.c(TEA.tea)} />
      {steam(p, 'M42 32C38.6 27.6 44.4 24.4 41.6 19M56 32C52.6 27 58.4 24 55.6 18.6')}
    </g>
  );
};

/* ---------------- Baked apple: soft all the way through, and still warm ---------------- */

const APPLE = {
  skin: '#E08271',
  wrinkle: '#C96D5E',
  flesh: '#F5D59A',
  stem: '#8E6A52',
  juice: '#D99A52',
  dish: '#FBF6EE',
};
const appleDish = saucer('treat-baked-apple', 50, 76, 42);

/** Baked soft: a little slumped and wider at the foot, the skin burst open along the top. */
const apple = shapes('treat-baked-apple', {
  apple: 'M50 36C58 31.6 73 33 76.6 47C80 61 73.6 76.6 60 78.6C55 79.4 52.4 78 50 78C47.6 78 45 79.4 40 78.6C26.4 76.6 20 61 23.4 47C27 33 42 31.6 50 36Z',
  tear: {
    d: poly(
      [
        [29, 44.6],
        [34.6, 40.4],
        [41, 41.6],
        [46.4, 38.6],
        [53.4, 38.8],
        [58.4, 41.4],
        [65, 39.8],
        [71, 44],
        [65.4, 45.6],
        [60, 44.4],
        [55, 47.4],
        [49.6, 45.2],
        [44.4, 47.8],
        [39, 45.2],
        [34, 47],
      ],
      0.5,
    ),
    k: 0,
    clip: 'apple',
  },
});

const bakedApple: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {appleDish(p)}
      <path
        d="M22 77.4C24 74.2 34 73.4 42 74.4C50 73 62 72.6 72 74C79 75 80.6 78 76 79.6C66 82 34 82 25 80.4C21.6 79.8 21 78.6 22 77.4Z"
        fill={p.c(APPLE.juice)}
      />
      {solid(p, apple.apple, APPLE.skin, [
        flat(p, apple.tear, APPLE.flesh),
        thin(p, 'M29.4 57C30.8 61 31 65 29.6 68.6M70.6 57C69.2 61 69 65 70.4 68.6', APPLE.wrinkle, 1.1),
      ])}
      <path
        d="M60 44.6C61.2 46.6 61.8 47.8 61.8 48.8C61.8 49.8 61 50.6 60 50.6C59 50.6 58.2 49.8 58.2 48.8C58.2 47.8 58.8 46.6 60 44.6Z"
        fill={p.c(APPLE.juice)}
      />
      {thin(p, 'M50 41C50 34 52 29 55.4 25.6', APPLE.stem, 2)}
      {steam(p, 'M36 28C33 24 38 21 35.6 16.6M64 28C61 24 66 21 63.6 16.6')}
    </g>
  );
};

/* ---------------- Pumpkin purée: a spoonful of plain pumpkin ---------------- */

const PUMP = {
  dish: '#FBF6EE',
  flute: '#EEE6DA',
  puree: '#EFA25F',
  swirl: '#F5BC82',
  spoon: '#C9CED3',
};

const pump = shapes('treat-pumpkin', {
  dish: 'M20 52H80L76 82C75.6 84.6 64 86.4 50 86.4C36 86.4 24.4 84.6 24 82Z',
  rim: { d: ell(50, 52, 30, 6.4), k: 0 },
  spoon: {
    d: poly(
      [
        [60, 50],
        [63, 49],
        [84, 26],
        [82, 24],
      ],
      1.2,
    ),
    k: 0.4,
  },
});

const pumpkinPuree: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 50, 86.4, 30, 2)}
      {solid(p, pump.dish, PUMP.dish, thin(p, 'M28 58L30 82M36 59L37 84M44 59.6V85M52 59.6V85M60 59L60 84.4M68 58.4L67 83.6M75 57.6L73 82', PUMP.flute, 1.4))}
      {flat(p, pump.rim, PUMP.dish)}
      <path
        d={smooth([
          [24, 52],
          [30, 46],
          [40, 44],
          [48, 40],
          [56, 43],
          [66, 44],
          [76, 50],
          [70, 55],
          [50, 56.6],
          [30, 55],
        ])}
        fill={p.c(PUMP.puree)}
      />
      {thin(p, 'M36 50C44 52 54 51 60 48M44 46C48 47 52 46 54 44', PUMP.swirl, 1.6)}
      {solid(p, pump.spoon, PUMP.spoon)}
      <path d={ell(86, 22, 5.4, 3.4, -48)} fill={p.c(PUMP.spoon)} />
    </g>
  );
};

/* ---------------- Roasted chestnut: roasted and peeled, still warm ---------------- */

const NUT = {
  shell: '#9C6649',
  shellLight: '#B27A5C',
  base: '#DCC39E',
  kernel: '#F0D08A',
  kernelDeep: '#E2B86C',
};

const nut = shapes('treat-chestnut', {
  shell: {
    d: 'M22 70C16 58 22 40 36 34C42 31.6 46 28 48 24C50 28 54 31.6 60 34C74 40 80 58 74 70C68 80 60 83 48 83C36 83 28 80 22 70Z',
    rim: true,
  },
  base: {
    d: 'M24 72C32 80 40 82.6 48 82.6C56 82.6 64 80 72 72C70 78 60 84 48 84C36 84 26 78 24 72Z',
    k: 0,
  },
  kernel: 'M58 70C58 60 66 54 74 56C84 58 88 66 86 74C84 82 76 86 68 84.6C62 83.6 58 78 58 70Z',
  peel: { d: 'M34 44C40 46 46 52 48 60L40 64C38 56 36 50 34 44Z', k: 0 },
});

const chestnut: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 54, 85.6, 34, 2.4)}
      {solid(p, nut.shell, NUT.shell, [
        flat(p, nut.base, NUT.base),
        flat(p, nut.peel, NUT.kernel),
        <path d={ell(56, 44, 3, 8, 30)} fill={p.c(NUT.shellLight)} />,
      ])}
      {solid(p, nut.kernel, NUT.kernel, thin(p, 'M64 64C68 66 72 66 76 63M62 72C68 75 76 75 82 70', NUT.kernelDeep, 1.4))}
    </g>
  );
};

/* ---------------- Warm oats: porridge with a little honey ---------------- */

const OATS = {
  bowl: '#A8C0D8',
  inside: '#FBF6EE',
  porridge: '#EEDDBC',
  fleck: '#F8EDD6',
  honey: '#F1B84C',
};

const bowl = shapes('treat-warm-oats', {
  bowl: 'M12 50C13 68 28 84 42 85.6H58C72 84 87 68 88 50Z',
  rim: { d: ell(50, 50, 38, 9.4), k: 0 },
});

const warmOats: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  return (
    <g>
      {contact(p, 50, 86.4, 30, 2)}
      {solid(p, bowl.bowl, OATS.bowl)}
      {flat(p, bowl.rim, OATS.inside)}
      <path d={ell(50, 50.8, 34, 7.4)} fill={p.c(OATS.porridge)} />
      {[
        [36, 49],
        [46, 52],
        [58, 48],
        [64, 52],
        [42, 46],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={2.4} ry={1.2} fill={p.c(OATS.fleck)} />
      ))}
      {thin(p, 'M38 50C44 46 54 46 60 49C64 51 60 54 54 53', OATS.honey, 2)}
      {steam(p, 'M42 40C39 36 44 33 41.6 28.6M58 40C55 36 60 33 57.6 28.6')}
    </g>
  );
};

/* ---------------- Frozen yoghurt: a little frozen yoghurt on a tiny stick ---------------- */

const FROYO = {
  yog: '#FBEFF1',
  swirl: '#F2BCC8',
  berry: '#7A8FC0',
  stick: '#E2C79E',
};
const TILT = -28;
const tilt = (pts: readonly Pt[]) => rotate(pts, TILT, 50, 60);

const froyo = shapes('treat-frozen-yoghurt', {
  stick: {
    d: poly(
      tilt([
        [45.6, 64],
        [54.4, 64],
        [54.4, 86],
        [45.6, 86],
      ]),
      4.4,
    ),
    k: 0.5,
  },
  bar: poly(
    tilt([
      [34, 18],
      [66, 18],
      [66, 68],
      [34, 68],
    ]),
    14,
  ),
  swirl: {
    d: poly(
      tilt([
        [20, 34],
        [80, 26],
        [80, 36],
        [20, 44],
      ]),
    ),
    k: 0,
    clip: 'bar',
  },
});

const frozenYoghurt: ItemRenderer = (o) => {
  const p = paint({ light: o?.light, facing: o?.facing });
  // Blueberry bits frozen in, scattered unevenly so they never line up into anything like a face.
  const berries = tilt([
    [40.6, 52],
    [51, 57.6],
    [60, 49.6],
    [44.4, 61.4],
    [58.4, 60.6],
    [42, 23.4],
    [57.6, 21],
  ]);
  const sizes = [2.2, 1.6, 2, 1.4, 1.2, 1.5, 1.8];
  return (
    <g>
      {contact(p, 60, 85, 22, 2)}
      <path d={ell(40, 84.4, 7, 1.8)} fill={p.c(FROYO.yog)} opacity={0.9} />
      {solid(p, froyo.stick, FROYO.stick)}
      {solid(p, froyo.bar, FROYO.yog, [
        flat(p, froyo.swirl, FROYO.swirl),
        ...berries.map(([x, y], i) => <circle key={i} cx={n(x)} cy={n(y)} r={sizes[i]} fill={p.c(FROYO.berry)} />),
      ])}
    </g>
  );
};

export const SERVED_TREATS: Record<string, ItemRenderer> = {
  'treat-salmon': salmon,
  'treat-strawberry-milk': strawberryMilk,
  'treat-cheese': cheeseWedge,
  'treat-pup-cup': pupCup,
  'treat-pudding': pudding,
  'treat-honey': honeyDrop,
  'treat-sunflower-seeds': sunflowerSeeds,
  'treat-barley-tea': barleyTea,
  'treat-baked-apple': bakedApple,
  'treat-pumpkin': pumpkinPuree,
  'treat-chestnut': chestnut,
  'treat-warm-oats': warmOats,
  'treat-frozen-yoghurt': frozenYoghurt,
};
