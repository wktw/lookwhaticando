import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, Leaf, OUTLINE, Stems, type LeafProps } from '../parts';
import { f, lerp, mix, ramp } from '../math';
import { seedling, sprout } from '../early';

const LEAF = '#A0D6B6';
const LEAF_BACK = '#84C29E';
const STEM = '#9FCB93';
const BELL = '#FFFFFF';
const BUD = '#CFE9C0';

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

function racemes(g: Growth): { list: Raceme[]; k: number; count: number } {
  const p = g.progress;
  switch (g.stage) {
    case 4:
      return { list: [RIGHT], k: p * 0.5, count: 3 + Math.round(p * 2) };
    case 5:
      return { list: p >= 0.5 ? [RIGHT, LEFT] : [RIGHT], k: 1, count: 5 };
    case 6:
      return { list: [RIGHT, LEFT], k: 1, count: 5 };
    case 7:
      return { list: [RIGHT, LEFT, TOP], k: 1, count: 5 };
    default:
      return { list: [], k: 0, count: 0 };
  }
}

/** Two or three broad, upright leaves that cup the stems. */
function leaves(g: Growth): LeafProps[] {
  const k = lerp(0.85, 1, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.12;
  const list: LeafProps[] = [
    { x: 48, y: 64, rot: -16, L: 30 * k, W: 7.4, bend: -0.12, fill: LEAF_BACK },
    { x: 52, y: 64, rot: 14, L: 28 * k, W: 7.2, bend: 0.14, fill: LEAF },
  ];
  if (g.t >= 3.5) list.unshift({ x: 47, y: 64, rot: -38, L: 22 * k, W: 6.4, bend: -0.1, fill: LEAF_BACK });
  if (g.stage >= 6) list.push({ x: 53, y: 64, rot: 40, L: 22 * k, W: 6.6, bend: 0.12, fill: LEAF });
  return list;
}

/** Extra bells after Evergreen, strung further along each arch. */
const EXTRA: [number, number][] = [
  [75.4, 32.4],
  [26.6, 39.6],
  [66.6, 20],
  [38, 39],
  [61.4, 30.6],
  [47.4, 27.6],
];

export const lily: PlantSpeciesArt = {
  seed: '#E2D0B4',
  render: (g) => {
    if (g.stage === 1) return sprout(g, { leaf: LEAF });
    if (g.stage === 2) return seedling(g, { leaf: LEAF, shape: 'lance' });
    const ls = leaves(g);
    const { list, k, count } = racemes(g);
    const bells = list.flatMap((r) => r.bells.slice(0, count).map(([x, y], i) => ({ x, y: y + 2.4, s: lerp(1.15, 0.8, i / 4) })));
    const extra = EXTRA.slice(0, g.blooms).map(([x, y]) => ({ x, y: y + 2.4, s: 0.8 }));
    return {
      back: (
        <g>
          {ls.slice(0, -1).map((l, i) => (
            <Leaf key={i} shape="strap" {...l} />
          ))}
          <Stems paths={list.map((r) => r.d)} w={2} color={STEM} />
          {[...bells, ...extra].map((b, i) => (
            <Bell key={i} x={b.x} y={b.y} s={b.s} k={k} />
          ))}
          <Leaf shape="strap" {...ls.at(-1)!} />
        </g>
      ),
    };
  },
};
