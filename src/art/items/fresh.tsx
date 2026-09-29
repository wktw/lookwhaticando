/**
 * Fresh treats: fruit, vegetables and greens, and the cat grass and catnip harvested from her own
 * plants. Drawn at pet scale on the 100×100 canvas, standing on y = 86, flat and matte in one light.
 */
import type { ItemRenderer } from './types';
import { cast, contact, flat, paint, shapes, solid, thin, type ShapeDef } from '@/art/scene/decor/kit';
import { ell, leaf, n, poly, rotate, smooth, type Pt } from '@/art/scene/decor/geo';

const GREEN = { leaf: '#9CBF8A', light: '#B5CC9C', deep: '#7FA36F', stem: '#86AE74' };

/* ---------------- Strawberry: cut in half so it can be shared ---------------- */

const BERRY = { red: '#E4717B', flesh: '#F6BDBE', core: '#FFF1EC', seed: '#F7DC8C' };

/** A strawberry silhouette: shoulders at `top`, tip at top + h. */
function berry(cx: number, top: number, w: number, h: number): string {
  const x = (k: number) => n(cx + w * k);
  const y = (k: number) => n(top + h * k);
  return (
    `M${x(-0.44)} ${y(0.07)}C${x(-0.26)} ${y(-0.03)} ${x(-0.1)} ${y(0.03)} ${x(0)} ${y(0.05)}` +
    `C${x(0.1)} ${y(0.03)} ${x(0.26)} ${y(-0.03)} ${x(0.44)} ${y(0.07)}` +
    `C${x(0.62)} ${y(0.2)} ${x(0.5)} ${y(0.56)} ${x(0.16)} ${y(0.9)}` +
    `C${x(0.07)} ${y(0.99)} ${x(-0.07)} ${y(0.99)} ${x(-0.16)} ${y(0.9)}` +
    `C${x(-0.5)} ${y(0.56)} ${x(-0.62)} ${y(0.2)} ${x(-0.44)} ${y(0.07)}Z`
  );
}

/** Seeds set in a lattice over a berry's skin. */
function seedsOn(cx: number, top: number, w: number, h: number): Pt[] {
  const out: Pt[] = [];
  for (let r = 0; r < 5; r++) {
    const t = 0.2 + r * 0.155;
    const half = (0.42 - r * 0.07) * w;
    const count = 4 - Math.floor(r / 2);
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0 : -1 + (2 * i) / (count - 1);
      out.push([cx + u * half * 0.78 + (r % 2 ? w * 0.06 : 0), top + h * t]);
    }
  }
  return out;
}

const straw = shapes('treat-strawberry', {
  back: berry(63, 30, 34, 52),
  front: berry(38, 22, 42, 62),
  flesh: { d: berry(38, 26.5, 34, 52.5), k: 0 },
  core: {
    d: smooth([
      [38, 31],
      [42, 40],
      [41.2, 58],
      [38, 67],
      [34.8, 58],
      [34, 40],
    ]),
    k: 0,
  },
  leaf: {
    d: smooth([
      [50, 30.5],
      [57, 24],
      [63, 27.5],
      [69, 23.5],
      [76, 30],
      [68, 33],
      [63, 32],
      [57, 33.5],
    ]),
    k: 0.4,
  },
  cut: {
    d: smooth([
      [24, 25],
      [31, 20],
      [38, 24],
      [45, 20],
      [52, 25],
      [44, 27],
      [38, 26],
      [31, 27.5],
    ]),
    k: 0.4,
  },
});

const strawberry: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 51, 86.4, 33, 2.8)}
      {solid(
        p,
        straw.back,
        BERRY.red,
        seedsOn(63, 30, 34, 52).map(([x, y], i) => <ellipse key={i} cx={n(x)} cy={n(y)} rx={1.1} ry={1.5} fill={p.c(BERRY.seed)} />),
      )}
      {solid(p, straw.leaf, GREEN.leaf)}
      {thin(p, 'M63 28.5L64.5 21', GREEN.deep, 2.2)}
      {solid(p, straw.front, BERRY.red, [
        flat(p, straw.flesh, BERRY.flesh),
        flat(p, straw.core, BERRY.core),
        ...[
          [22.6, 36],
          [23.6, 48],
          [26.4, 60],
          [30.8, 71],
          [53.4, 36],
          [52.4, 48],
          [49.6, 60],
          [45.2, 71],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.95} fill={p.c(BERRY.seed)} />),
      ])}
      {solid(p, straw.cut, GREEN.leaf)}
    </g>
  );
};

/* ---------------- Cat grass: a pinch of fresh oat grass, tied like a sheaf ---------------- */

const TWINE = '#C79F6C';
const CUT_END = '#E4EFCF';

/** Blades fanning up from the tie: [tip x, tip y, width, shade]. */
const BLADES: readonly (readonly [number, number, number, 0 | 1 | 2])[] = [
  [14, 34, 3.4, 1],
  [20, 20, 3.4, 0],
  [30, 12, 3.6, 2],
  [40, 8, 3.6, 0],
  [50, 5, 3.8, 1],
  [60, 8, 3.6, 2],
  [70, 11, 3.6, 0],
  [80, 20, 3.4, 1],
  [87, 32, 3.2, 2],
  [36, 16, 3.2, 1],
  [64, 15, 3.2, 1],
];
/** Cut stems below the tie, splayed so the sheaf stands: [foot x]. */
const STEMS = [37, 42, 47, 52, 57, 62];

/** The broad blades take a crescent along one side, like the fold down a real blade. */
const grass = shapes(
  'treat-cat-grass',
  Object.fromEntries(
    BLADES.map(([x, y, w], i) => [`b${i}`, { d: leaf([47 + (x - 50) * 0.08, 64], [x, y], w, (x - 50) * 0.0015), k: w >= 3.6 ? 0.35 : 0 }]),
  ) as Record<string, ShapeDef>,
);

const catGrass: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  const shades = [GREEN.leaf, GREEN.light, GREEN.deep];
  return (
    <g>
      {contact(p, 50, 86.2, 22, 2.2)}
      {thin(p, STEMS.map((x) => `M${n(47 + (x - 50) * 0.18)} 62Q${n(48 + (x - 50) * 0.5)} 74 ${x} 84.6`).join(''), GREEN.stem, 3)}
      {STEMS.map((x) => (
        <ellipse key={x} cx={x} cy={84.8} rx={1.6} ry={0.9} fill={p.c(CUT_END)} />
      ))}
      {BLADES.map(([, , , s], i) => solid(p, grass[`b${i}`]!, shades[s]!))}
      {thin(p, 'M43.4 61.4C46 63 50 63 52.6 61.4M43.2 64.6C46 66.2 50 66.2 52.8 64.6', TWINE, 1.5)}
      {thin(p, 'M52.6 62.6C56.6 58.6 60 61.4 56.4 64C60 66.2 57.4 70 53 65M53 64L55 72.4M53.4 64L58.8 70', TWINE, 1.1)}
    </g>
  );
};

/* ---------------- Catnip: dried sprigs from her catnip plant, tied with twine ---------------- */

const NIP = { dry: '#A9B18C', deep: '#8F9A73', vein: '#C9CFB2', stem: '#9BA37E', flower: '#EAE3F1' };

/** A catnip leaf: heart-shaped with a toothed edge, from `base` to `tip`. */
function nipLeaf(base: Pt, tip: Pt, w: number): string {
  const [bx, by] = base;
  const len = Math.hypot(tip[0] - bx, tip[1] - by);
  const ang = (Math.atan2(tip[1] - by, tip[0] - bx) * 180) / Math.PI;
  const pts: Pt[] = [];
  const teeth = 7;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i <= teeth; i++) {
      const t = side < 0 ? i / teeth : 1 - i / teeth;
      const bulge = Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - t * 0.3);
      const tooth = i % 2 ? 1 : 0.82;
      pts.push([bx + t * len, by + side * w * bulge * tooth]);
    }
  }
  return poly(rotate(pts, ang, bx, by), 0.5);
}

/** Three sprigs from the tie at (30, 76): each a stem, opposite leaf pairs and a pale flower spike. */
const SPRIGS: readonly { tip: Pt; leaves: readonly (readonly [number, number])[] }[] = [
  {
    tip: [62, 12],
    leaves: [
      [0.34, 11],
      [0.62, 9],
      [0.86, 6],
    ],
  },
  {
    tip: [84, 30],
    leaves: [
      [0.36, 11],
      [0.66, 8.6],
    ],
  },
  {
    tip: [88, 58],
    leaves: [
      [0.4, 9.4],
      [0.72, 7.4],
    ],
  },
];
const TIE: Pt = [30, 76];

function sprigLeaves(tip: Pt, leaves: readonly (readonly [number, number])[]): string[] {
  const dx = tip[0] - TIE[0];
  const dy = tip[1] - TIE[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  return leaves.flatMap(([t, s]) => {
    const at: Pt = [TIE[0] + dx * t, TIE[1] + dy * t];
    return [
      nipLeaf(at, [at[0] + nx * s * 1.9 + dx * 0.05, at[1] + ny * s * 1.9 + dy * 0.05], s * 0.62),
      nipLeaf(at, [at[0] - nx * s * 1.9 + dx * 0.05, at[1] - ny * s * 1.9 + dy * 0.05], s * 0.62),
    ];
  });
}

const nip = shapes(
  'treat-catnip',
  Object.fromEntries(SPRIGS.flatMap((sp, i) => sprigLeaves(sp.tip, sp.leaves).map((d, j) => [`l${i}${j}`, { d, k: j < 2 ? 0.4 : 0 }]))) as Record<
    string,
    ShapeDef
  >,
);

const catnip: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 50, 85.6, 36, 2)}
      {thin(p, `${SPRIGS.map((sp) => `M${TIE[0]} ${TIE[1]}L${sp.tip[0]} ${sp.tip[1]}`).join('')}M30 76L16 85M30 76L21 86M30 76L26 86`, NIP.stem, 1.8)}
      {SPRIGS.map((sp, i) => (
        <g key={i}>
          {sprigLeaves(sp.tip, sp.leaves).map((_, j) => solid(p, nip[`l${i}${j}`]!, j % 2 ? NIP.deep : NIP.dry))}
          <path d={ell(sp.tip[0], sp.tip[1], 3.4, 6, (Math.atan2(sp.tip[1] - TIE[1], sp.tip[0] - TIE[0]) * 180) / Math.PI + 90)} fill={p.c(NIP.flower)} />
        </g>
      ))}
      {thin(p, 'M26.6 72.6L33.4 79.4M28.6 71L35.2 77.6', TWINE, 1.5)}
      {thin(p, 'M35 78C39 80 40 84 36 84.4C34 84.6 33.6 82 35 80.6', TWINE, 1.1)}
    </g>
  );
};

/* ---------------- Fresh clover: one of them has four leaves ---------------- */

const CLOVER = { leaf: '#8DB87A', light: '#A8CC92', mark: '#D6E8C8', flower: '#F7EFEA', flowerPink: '#EFC9D2' };

/** A clover head of heart-shaped leaflets round (cx, cy). */
function trefoil(cx: number, cy: number, r: number, count: 3 | 4, rot: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const a = rot + (i * 360) / count;
    const rad = (a * Math.PI) / 180;
    const x = cx + Math.cos(rad) * r * 0.62;
    const y = cy + Math.sin(rad) * r * 0.62 * 0.9;
    return ell(x, y, r * 0.56, r * 0.5, a);
  });
}

const HEADS = [
  { c: [30, 34] as Pt, r: 15, count: 3 as const, rot: -90 },
  { c: [66, 28] as Pt, r: 16, count: 4 as const, rot: -45 },
  { c: [52, 50] as Pt, r: 13, count: 3 as const, rot: -60 },
];

const clov = shapes('treat-clover', {
  ...Object.fromEntries(HEADS.flatMap((h, hi) => trefoil(h.c[0], h.c[1], h.r, h.count, h.rot).map((d, i) => [`h${hi}l${i}`, { d, k: 0.5 }]))),
  flower: { d: ell(76, 56, 8.4, 8), k: 0.6 },
} as Record<string, { d: string; k: number }>);

const clover: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 52, 86.4, 16, 2.2)}
      {thin(p, 'M48 86C44 70 36 52 30 36M50 86C54 64 60 44 66 30M52 86C52 72 52 60 52 52M54 86C62 76 70 66 76 58', CLOVER.leaf, 1.8)}
      {solid(p, clov.flower!, CLOVER.flower, [
        <circle cx={73.4} cy={53.6} r={1.6} fill={p.c(CLOVER.flowerPink)} />,
        <circle cx={78.6} cy={54.4} r={1.4} fill={p.c(CLOVER.flowerPink)} />,
        <circle cx={76} cy={58.6} r={1.5} fill={p.c(CLOVER.flowerPink)} />,
      ])}
      {HEADS.map((h, hi) =>
        Array.from({ length: h.count }, (_, i) => {
          const a = ((h.rot + (i * 360) / h.count) * Math.PI) / 180;
          const mx = h.c[0] + Math.cos(a) * h.r * 0.55;
          const my = h.c[1] + Math.sin(a) * h.r * 0.55 * 0.9;
          return solid(
            p,
            clov[`h${hi}l${i}`]!,
            hi === 1 ? CLOVER.light : CLOVER.leaf,
            <path
              d={`M${n(h.c[0] + Math.cos(a) * h.r * 0.3)} ${n(h.c[1] + Math.sin(a) * h.r * 0.27)}L${n(mx + Math.cos(a + 0.5) * 2)} ${n(my + Math.sin(a + 0.5) * 2)}L${n(mx + Math.cos(a - 0.5) * 2)} ${n(my + Math.sin(a - 0.5) * 2)}Z`}
              fill={p.c(CLOVER.mark)}
            />,
          );
        }),
      )}
    </g>
  );
};

/* ---------------- Lettuce leaf: crisp, green, larger than the duck ---------------- */

const LETTUCE = { leaf: '#B7D79C', frill: '#9CC47F', rib: '#EEF5E2', vein: '#DCEBCB' };

/** One loose leaf standing on its stem end, ruffled along the top. */
const LEAF_EDGE: Pt[] = [
  [40, 86],
  [30, 74],
  [22, 58],
  [16, 44],
  [16, 32],
  [22, 22],
  [28, 20],
  [32, 12],
  [40, 12],
  [46, 7],
  [54, 10],
  [60, 6],
  [68, 11],
  [74, 10],
  [78, 18],
  [84, 22],
  [84, 32],
  [88, 40],
  [82, 52],
  [76, 64],
  [66, 76],
  [52, 86],
];

const lettuce = shapes('treat-lettuce', {
  leaf: smooth(LEAF_EDGE),
  frill: { d: 'M0 0H100V30C90 26 84 32 76 24C68 30 60 22 52 28C44 22 36 30 28 26C20 32 10 30 0 36Z', k: 0, clip: 'leaf' },
  rib: { d: 'M40 86C42 70 46 50 50 34C52 28 54 22 56 18C55 26 54 34 53 44C52 60 50 74 50 86Z', k: 0, clip: 'leaf' },
});

const lettuceLeaf: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 46, 86.2, 18, 2.2)}
      {solid(p, lettuce.leaf, LETTUCE.leaf, [
        flat(p, lettuce.frill, LETTUCE.frill),
        thin(
          p,
          'M47 62C40 58 32 52 26 42M48 52C42 46 38 40 34 30M50 44C56 38 62 32 70 26M49 58C58 54 68 48 78 40M47 72C54 70 62 66 70 60M45 74C40 72 34 68 30 64',
          LETTUCE.vein,
          1.4,
        ),
        flat(p, lettuce.rib, LETTUCE.rib),
      ])}
    </g>
  );
};

/* ---------------- Blueberries: three, rolling slightly ---------------- */

const BLUE = { berry: '#6F86B8', bloom: '#93A6CE', crown: '#4F5F87' };

const blue = shapes('treat-blueberries', {
  b1: { d: ell(52, 50, 17, 16.4), rim: true },
  b2: { d: ell(33, 68, 17.4, 17), rim: true },
  b3: { d: ell(68, 69, 16.6, 16.2), rim: true },
});

const crown = (x: number, y: number, r: number) => star(x, y, r, r * 0.45);
function star(cx: number, cy: number, r: number, inner: number): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const rad = i % 2 ? inner : r;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8]);
  }
  return poly(pts, 0.4);
}

const blueberries: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  const bloom = (x: number, y: number) => <ellipse cx={x} cy={y} rx={5} ry={3.4} transform={`rotate(-30 ${x} ${y})`} fill={p.c(BLUE.bloom)} />;
  return (
    <g>
      {contact(p, 51, 86, 36, 2.6)}
      {solid(p, blue.b1, BLUE.berry, [bloom(45, 43), <path d={crown(54, 38, 4.6)} fill={p.c(BLUE.crown)} />])}
      {solid(p, blue.b2, BLUE.berry, [bloom(26, 61), <path d={crown(35, 60, 5)} fill={p.c(BLUE.crown)} />])}
      {solid(p, blue.b3, BLUE.berry, [bloom(61, 62), <path d={crown(71, 63, 4.6)} fill={p.c(BLUE.crown)} />])}
    </g>
  );
};

/* ---------------- Baby carrot: about the length of a matchstick ---------------- */

const CARROT = { root: '#F0A15E', ring: '#F6BF86', tip: '#E89452' };

const carrot = shapes('treat-carrot', {
  root: smooth([
    [16, 80],
    [30, 72],
    [52, 62],
    [70, 54],
    [78, 52],
    [80, 60],
    [74, 66],
    [56, 74],
    [34, 80],
    [18, 83],
  ]),
});

const babyCarrot: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  const tops: [Pt, Pt][] = [
    [
      [76, 53],
      [70, 24],
    ],
    [
      [77, 52],
      [84, 20],
    ],
    [
      [78, 53],
      [94, 34],
    ],
  ];
  return (
    <g>
      {contact(p, 48, 84.6, 32, 2.2)}
      {thin(p, tops.map(([a, b]) => `M${a[0]} ${a[1]}Q${(a[0] + b[0]) / 2 + 3} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}`).join(''), GREEN.stem, 1.6)}
      {tops.flatMap(([a, b], i) =>
        [0.35, 0.6, 0.85].map((t, j) => {
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t;
          return <path key={`${i}${j}`} d={leaf([x, y], [x + (j % 2 ? 7 : -7), y - 4], 2.6)} fill={p.c(j % 2 ? GREEN.leaf : GREEN.light)} />;
        }),
      )}
      {solid(p, carrot.root, CARROT.root, thin(p, 'M30 73.6L33 79.2M42 68.6L45.4 75.6M54 63.4L57.4 71M65 58.6L68.4 66.4', CARROT.ring, 1.3))}
      {thin(p, 'M17 81.4L10 83', CARROT.tip, 1.2)}
    </g>
  );
};

/* ---------------- Radish: pink outside, white inside ---------------- */

const RADISH = { skin: '#E97F97', white: '#FBF4F2', inner: '#F8DCE3', tail: '#F3DDE2' };

const rad = shapes('treat-radish', {
  whole: smooth([
    [40, 42],
    [52, 40],
    [60, 50],
    [58, 64],
    [48, 72],
    [38, 66],
    [32, 54],
  ]),
  tip: {
    d: smooth([
      [40, 64],
      [48, 68],
      [52, 76],
      [48, 80],
      [42, 74],
    ]),
    k: 0.4,
  },
  half: ell(68, 70, 17, 14.6),
  cut: { d: ell(68.4, 69.6, 15, 12.6), k: 0 },
  leafA: { d: leaf([44, 42], [30, 14], 7), k: 0.4 },
  leafB: { d: leaf([47, 41], [56, 12], 6.4), k: 0.4 },
});

const radish: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 56, 86, 30, 2.4)}
      {solid(p, rad.leafA, GREEN.leaf, thin(p, 'M44 42L31 16', GREEN.light, 1))}
      {solid(p, rad.leafB, GREEN.deep, thin(p, 'M47 41L55.4 14', GREEN.light, 1))}
      {thin(p, 'M50 79C52 83 56 85 60 85.4', RADISH.tail, 1.2)}
      {solid(p, rad.tip, RADISH.white)}
      {solid(p, rad.whole, RADISH.skin)}
      {solid(p, rad.half, RADISH.skin, [
        flat(p, rad.cut, RADISH.white),
        thin(p, 'M68.4 69.6L60 62M68.4 69.6L77 62.6M68.4 69.6L58.4 72.6M68.4 69.6L78.6 73M68.4 69.6L68.4 80', RADISH.inner, 1.2),
      ])}
    </g>
  );
};

/* ---------------- Pea pod: split open, four peas in a row ---------------- */

const PEA = { pod: '#9CC47F', inside: '#D6E8BF', pea: '#8BBF6A', stem: '#7FA36F' };

const pod = shapes('treat-pea-pod', {
  back: {
    d: smooth([
      [10, 62],
      [30, 50],
      [56, 46],
      [80, 48],
      [92, 40],
      [90, 52],
      [74, 62],
      [50, 66],
      [26, 68],
    ]),
    k: 0,
  },
  inside: {
    d: smooth([
      [14, 64],
      [32, 55],
      [56, 51.6],
      [80, 52.4],
      [88, 48],
      [80, 60],
      [56, 66],
      [30, 70],
    ]),
    k: 0,
  },
  p1: ell(28, 60, 7, 6.8),
  p2: ell(42, 57.4, 7.2, 7),
  p3: ell(56.6, 56.4, 7.2, 7),
  p4: ell(71, 56.6, 6.8, 6.6),
  front: smooth([
    [10, 64],
    [30, 66],
    [54, 66],
    [78, 60],
    [90, 50],
    [86, 64],
    [70, 76],
    [46, 80],
    [24, 76],
  ]),
});

const peaPod: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 50, 84, 38, 2.4)}
      {flat(p, pod.back, PEA.pod)}
      {flat(p, pod.inside, PEA.inside)}
      {solid(p, pod.p1, PEA.pea)}
      {solid(p, pod.p2, PEA.pea)}
      {solid(p, pod.p3, PEA.pea)}
      {solid(p, pod.p4, PEA.pea)}
      {solid(p, pod.front, PEA.pod)}
      {thin(p, 'M90 46C94 40 96 36 93 32', PEA.stem, 1.8)}
      {cast(p, 'M14 66C30 68.6 54 68.4 78 62L77 64.4C54 70.6 30 70.6 14 67.4Z', 0.6)}
    </g>
  );
};

/* ---------------- Watermelon: a wedge with the seeds taken out ---------------- */

const MELON = { flesh: '#F2838E', rind: '#8DB87A', rindDeep: '#6E9A68', pith: '#F4F1DC', side: '#E26F7C', pocket: '#F7A3AB' };

const melon = shapes('treat-watermelon', {
  side: {
    d: poly(
      [
        [50, 16],
        [58, 18],
        [90, 74],
        [84, 76],
      ],
      1,
    ),
    k: 0.5,
  },
  wedge: `M50 16L86 72C74 80 62 83 50 83C38 83 26 80 14 72Z`,
  pith: { d: 'M10 64C24 72.6 37 76 50 76C63 76 76 72.6 90 64V90H10Z', k: 0, clip: 'wedge' },
  rind: { d: 'M10 67.6C24 76.4 37 79.6 50 79.6C63 79.6 76 76.4 90 67.6V90H10Z', k: 0, clip: 'wedge' },
});

const watermelon: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 51, 84.6, 38, 2.4)}
      {solid(p, melon.side, MELON.rindDeep)}
      {solid(p, melon.wedge, MELON.flesh, [
        flat(p, melon.pith, MELON.pith),
        flat(p, melon.rind, MELON.rind),
        ...(
          [
            [44, 50],
            [56, 50],
            [38, 62],
            [50, 64],
            [62, 62],
          ] as const
        ).map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={1.4} ry={2} fill={p.c(MELON.pocket)} />),
      ])}
    </g>
  );
};

export const FRESH_TREATS: Record<string, ItemRenderer> = {
  'treat-strawberry': strawberry,
  'treat-cat-grass': catGrass,
  'treat-catnip': catnip,
  'treat-clover': clover,
  'treat-lettuce': lettuceLeaf,
  'treat-blueberries': blueberries,
  'treat-carrot': babyCarrot,
  'treat-radish': radish,
  'treat-pea-pod': peaPod,
  'treat-watermelon': watermelon,
};
