import type { Growth, PlantSpeciesArt } from '../types';
import { Blob, Leaf, Stems, stemD, type Circle } from '../parts';
import { f, lerp, mix, ramp } from '../math';
import { seedling, sprout } from '../early';

const LEAF = '#BCD5AE';
const LEAF_BACK = '#A2C194';
const STEM = '#A7C49A';
const FLORET = '#B9A4EE';
const FLORET_DARK = '#9C85E0';
const BUD = '#BCD4AC';

/** A flower spike: stacked florets tapering to a point, tinted from bud green to lavender by `k`. */
function Spike({ x, y, len, k }: { x: number; y: number; len: number; k: number }) {
  const n = Math.max(3, Math.round(len / 2.3));
  const florets: Circle[] = Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    return [x + (i % 2 ? 0.7 : -0.7) * (1 - u), y - u * len, lerp(2.6, 1.4, u)] as const;
  });
  return (
    <g>
      <Blob circles={florets} fill={mix(BUD, FLORET, k)} line={1.6} />
      {k > 0.5 && (
        <g fill={FLORET_DARK}>
          {florets.slice(0, -1).map(([cx, cy], i) => (
            <circle key={i} cx={f(cx + (i % 2 ? -0.9 : 0.9))} cy={f(cy + 0.4)} r={0.75} />
          ))}
        </g>
      )}
    </g>
  );
}

/** A tuft of narrow grey-green leaves. */
function tuft(g: Growth) {
  const k = lerp(0.8, 1, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.1;
  const fan: [number, number][] = [
    [-62, 18],
    [-40, 24],
    [-20, 28],
    [2, 30],
    [21, 27],
    [41, 23],
    [62, 17],
  ];
  return fan.map(([rot, L], i) => ({ x: 50 + rot * 0.05, y: 63.5, rot, L: L * k, W: 2.8, bend: rot * 0.002, fill: i % 2 ? LEAF_BACK : LEAF }));
}

interface Stalk {
  x0: number;
  x: number;
  y: number;
  len: number;
}

const EXTRA: Stalk[] = [
  { x0: 48, x: 38, y: 38, len: 8 },
  { x0: 52, x: 62, y: 37, len: 8 },
  { x0: 47, x: 20, y: 44, len: 8 },
  { x0: 53, x: 80, y: 43, len: 8 },
  { x0: 49, x: 45, y: 30, len: 7 },
  { x0: 51, x: 55, y: 29, len: 7 },
];

function stalks(g: Growth): { list: Stalk[]; k: number } {
  const p = g.progress;
  switch (g.stage) {
    case 4:
      return {
        k: lerp(0.25, 0.6, p),
        list: [
          { x0: 49, x: 41, y: 28, len: 8 },
          { x0: 50, x: 50.5, y: 22, len: 8 },
          { x0: 51, x: 60, y: 26, len: 8 },
        ],
      };
    case 5:
      return {
        k: lerp(0.75, 1, p),
        list: [
          { x0: 49, x: 40, y: 26, len: 11 },
          { x0: 50, x: 50.5, y: 20, len: 12 },
          { x0: 51, x: 61, y: 24, len: 11 },
          ...(p >= 0.5 ? [{ x0: 51, x: 68, y: 33, len: 9 }] : []),
        ],
      };
    case 6:
      return {
        k: 1,
        list: [
          { x0: 48, x: 31, y: 31, len: 11 },
          { x0: 49, x: 40, y: 22, len: 12 },
          { x0: 50, x: 50.5, y: 16, len: 13 },
          { x0: 51, x: 60, y: 20, len: 12 },
          { x0: 52, x: 69, y: 29, len: 11 },
        ],
      };
    case 7:
      return {
        k: 1,
        list: [
          ...EXTRA.slice(0, g.blooms),
          { x0: 47, x: 25, y: 35, len: 11 },
          { x0: 48, x: 33, y: 25, len: 12 },
          { x0: 49, x: 42, y: 17, len: 13 },
          { x0: 50, x: 50.5, y: 13, len: 13 },
          { x0: 51, x: 59, y: 16, len: 13 },
          { x0: 52, x: 67, y: 23, len: 12 },
          { x0: 53, x: 75, y: 33, len: 11 },
        ],
      };
    default:
      return { k: 0, list: [] };
  }
}

export const lavender: PlantSpeciesArt = {
  seed: '#B9A58F',
  render: (g) => {
    if (g.stage === 1) return sprout(g, { leaf: LEAF });
    if (g.stage === 2) return seedling(g, { leaf: LEAF, shape: 'lance' });
    const leaves = tuft(g);
    const { list, k } = stalks(g);
    return {
      back: (
        <g>
          <Stems paths={list.map((s) => stemD(s.x0, s.x, s.y + 1))} w={1.8} color={STEM} />
          {leaves.map((l, i) => (
            <Leaf key={i} shape="lance" vein={null} {...l} />
          ))}
          {list.map((s, i) => (
            <Spike key={i} x={s.x} y={s.y} len={s.len} k={k} />
          ))}
        </g>
      ),
    };
  },
};

