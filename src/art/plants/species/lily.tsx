import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, Leaf, Moss, OUTLINE, Stems, type LeafProps } from '../parts';
import { f, lerp, mix, ramp } from '../math';
import { seedling, sprout } from '../early';

const LEAF = '#A0D6B6';
const LEAF_BACK = '#84C29E';
const STEM = '#9FCB93';
const BELL = '#FFFFFF';
const BUD = '#CFE9C0';
const SHEATH = '#D8EDCF';

/** A little bell hanging from (x, y); `k` < 1 is a closed green-white bud. */
function Bell({ x, y, s, k }: { x: number; y: number; s: number; k: number }) {
  const line = f(FINE / s);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`} stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      <path d="M0 -3 L0 0.6" fill="none" stroke-width={f(1.3 / s)} />
      {k < 1 ? (
        <circle cx={0} cy={3.6} r={3.2} fill={mix(BUD, BELL, k)} stroke-width={line} />
      ) : (
        <g stroke-width={line}>
          <path d="M-3.6 7.4 C-4 3 -3 0.6 0 0.6 C3 0.6 4 3 3.6 7.4 Q2.8 6.6 1.8 7.8 Q0.9 6.8 0 7.8 Q-0.9 6.8 -1.8 7.8 Q-2.8 6.6 -3.6 7.4 Z" fill={BELL} />
          <path d="M-1.8 4.6 Q-2 2.8 -0.8 2" fill="none" stroke="#E3F1E6" stroke-width={f(1.1 / s)} />
        </g>
      )}
    </g>
  );
}

interface Raceme {
  d: string;
  /** Hanging points along the arch, from stem to tip. */
  bells: [number, number][];
}

const RIGHT: Raceme = {
  d: 'M51 66 C51 48 53 34 58 28 C63 22 70 23 73 29',
  bells: [
    [55.6, 31],
    [59.6, 26.4],
    [64.2, 24],
    [68.8, 24.4],
    [72.4, 27.8],
  ],
};
const LEFT: Raceme = {
  d: 'M49 66 C49 51 46 40 41 35 C36 30 30 31 27.6 36',
  bells: [
    [44.6, 38],
    [40.4, 33.4],
    [36, 31.2],
    [31.6, 31.8],
    [28.4, 34.8],
  ],
};
const TOP: Raceme = {
  d: 'M50 66 C50 44 50 27 54 19 C57 13 63 12.6 65.6 16.6',
  bells: [
    [51.8, 22.6],
    [54.4, 16.8],
    [58.2, 13.8],
    [62.2, 13.6],
    [65.2, 16],
  ],
};

/** A low fourth arch that only an Evergreen plant has. */
const LOW: Raceme = {
  d: 'M49 66 C48 58 43 51 35.6 49 C29.6 47.6 24.6 49.4 23 54',
  bells: [
    [41, 50.4],
    [36, 48.4],
    [31, 48],
    [26.6, 49.6],
    [23.6, 53],
  ],
};

interface Arch {
  raceme: Raceme;
  /** Bud ripeness: < 1 are closed buds, 1 is open bells. */
  k: number;
  count: number;
}

/** Arches appear one per stage: right (Budding), left (late Blooming), top (Flourishing), low (Evergreen). */
function arches(g: Growth): Arch[] {
  const p = g.progress;
  switch (g.stage) {
    case 4:
      return [{ raceme: RIGHT, k: p * 0.5, count: 3 + Math.round(p * 2) }];
    case 5:
      return [
        { raceme: RIGHT, k: 1, count: 3 + Math.round(p * 2) },
        ...(p >= 0.5 ? [{ raceme: LEFT, k: lerp(0.2, 0.6, p), count: 3 }] : []),
      ];
    case 6:
      return [
        { raceme: RIGHT, k: 1, count: 5 },
        { raceme: LEFT, k: 1, count: 5 },
        { raceme: TOP, k: p < 0.5 ? 0.6 : 1, count: 3 + Math.round(p * 2) },
      ];
    case 7:
      return [RIGHT, LEFT, TOP, LOW].map((raceme) => ({ raceme, k: 1, count: 5 }));
    default:
      return [];
  }
}

/** Two broad, upright elliptic leaves rising from a pale sheath, tips leaning out; more join later. */
function leaves(g: Growth): LeafProps[] {
  const k = lerp(0.9, 1, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.08;
  const list: LeafProps[] = [];
  if (g.t >= 3.5) list.push({ x: 47, y: 62, rot: -32, L: 22 * k, W: 7.4, bend: -0.16, fill: LEAF_BACK });
  if (g.stage >= 6) list.push({ x: 53, y: 62, rot: 32, L: 21 * k, W: 7.4, bend: 0.16, fill: LEAF_BACK });
  list.push({ x: 48.8, y: 62, rot: -6, L: 37 * k, W: 9.2, bend: -0.2, fill: LEAF_BACK }, { x: 51.2, y: 62, rot: 7, L: 33 * k, W: 9, bend: 0.22, fill: LEAF });
  return list;
}

/** Extra bells after Evergreen, strung further along each arch. */
const EXTRA: [number, number][] = [
  [75.4, 32.4],
  [26.6, 39.6],
  [66.6, 20],
  [38, 39],
  [61.4, 30.6],
  [21.6, 57.6],
];

export const lily: PlantSpeciesArt = {
  seed: '#E2D0B4',
  render: (g) => {
    if (g.stage === 1) return sprout(g, { leaf: LEAF });
    if (g.stage === 2) return seedling(g, { leaf: LEAF, shape: 'lance' });
    const ls = leaves(g);
    const list = arches(g);
    const grow = g.stage >= 7 ? 1.12 : 1;
    const bells = list.flatMap(({ raceme, k, count }) => raceme.bells.slice(0, count).map(([x, y], i) => ({ x, y: y + 2.4, s: lerp(1.15, 0.8, i / 4) * grow, k })));
    const extra = EXTRA.slice(0, g.blooms).map(([x, y]) => ({ x, y: y + 2.4, s: 0.85, k: 1 }));
    return {
      back: (
        <g>
          {ls.slice(0, -1).map((l, i) => (
            <Leaf key={i} shape="oval" {...l} />
          ))}
          <Stems paths={list.map((a) => a.raceme.d)} w={2} color={STEM} />
          {[...bells, ...extra].map((b, i) => (
            <Bell key={i} x={b.x} y={b.y} s={b.s} k={b.k} />
          ))}
          <Leaf shape="oval" {...ls.at(-1)!} />
          <path d="M45 64 C44.8 57.6 46.4 52.4 49.2 48.4 Q50.4 51 51.4 48.6 C54 52.4 55.4 57.6 55.2 64 Z" fill={SHEATH} stroke={OUTLINE} stroke-width={FINE} stroke-linejoin="round" />
          <path d="M47.6 58.6 Q48 54.4 49.4 51.8" fill="none" stroke="#fff" stroke-width={1.2} stroke-linecap="round" opacity={0.7} />
        </g>
      ),
      ground: g.stage >= 7 ? <Moss w={15} h={4.6} /> : null,
    };
  },
};
