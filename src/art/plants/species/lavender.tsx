import type { Growth, PlantSpeciesArt } from '../types';
import { Blob, Merged, Stems, leafD, stemD, type Circle } from '../parts';
import { f, lerp, ramp } from '../math';
import { seedling, sprout } from '../early';

/** Silvery sage: paler and greyer than the other plants' leaves. */
const LEAF = '#C4D8BA';
const LEAF_BACK = '#A6BF9F';
const SHEEN = '#EEF4EA';
const STEM = '#A7C49A';
const WOOD = '#BE9C88';
const FLORET = '#B9A4EE';
const FLORET_DARK = '#9C85E0';
const BUD = '#BCD4AC';

/**
 * A flower spike: stacked florets tapering to a point. While budding (`k` < 1) it stays green
 * and lilac florets start to peek through; in bloom it turns fully lavender.
 */
function Spike({ x, y, len, k }: { x: number; y: number; len: number; k: number }) {
  const n = Math.max(3, Math.round(len / 2.3));
  const florets: Circle[] = Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    return [x + (i % 2 ? 0.7 : -0.7) * (1 - u), y - u * len, lerp(2.6, 1.4, u)] as const;
  });
  const open = k >= 1;
  const dots = open ? florets.slice(0, -1) : florets.slice(0, Math.round((n - 1) * k));
  return (
    <g>
      <Blob circles={florets} fill={open ? FLORET : BUD} line={1.6} />
      <g fill={open ? FLORET_DARK : FLORET}>
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={f(cx + (i % 2 ? -0.9 : 0.9))} cy={f(cy + 0.4)} r={open ? 0.75 : 1.1} />
        ))}
      </g>
    </g>
  );
}

/** Where the woody base forks: each fork carries an upright bunch of narrow leaves. [x, y, lean°] */
const BUNCHES: [number, number, number][] = [
  [43, 51, -14],
  [57, 51, 14],
  [50, 48, 0],
];
/** Bunches that join as the bush fills out. */
const LATE_BUNCHES: [number, number, number][] = [
  [37, 55, -30],
  [63, 55, 30],
];
const FAN: [number, number][] = [
  [-18, 0.74],
  [18, 0.74],
  [-9, 0.9],
  [9, 0.9],
  [0, 1],
];

/**
 * Upright bunches of silvery, narrow leaves on a short woody base. Each bunch is one merged silhouette,
 * so the many slim leaves keep a single soft outline instead of turning dark.
 */
function bush(g: Growth) {
  const k = lerp(0.9, 1, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.1;
  const bunches = g.t >= 3.5 ? [...LATE_BUNCHES, ...BUNCHES] : BUNCHES;
  const wood = bunches.map(([x, y]) => `M${f(lerp(50, x, 0.3))} 66 Q${f(lerp(50, x, 0.5))} ${f(y + 6)} ${f(x)} ${f(y)}`);
  const tufts = bunches.map(([x, y, lean], b) => {
    const big = b === bunches.length - 1 ? 20 : 17;
    const leaves = FAN.map(([rot, len]) => ({ L: big * len * k, rot: lean + rot }));
    return {
      back: Math.abs(lean) > 20,
      shapes: leaves.map(({ L, rot }) => ({ d: leafD('lance', L, 2.5, rot * 0.003), transform: `translate(${f(x)} ${f(y + 1)}) rotate(${f(rot)})` })),
      sheen: leaves.map(({ L, rot }) => `M${f(x + Math.sin((rot * Math.PI) / 180) * L * 0.25)} ${f(y + 1 - Math.cos((rot * Math.PI) / 180) * L * 0.25)} L${f(x + Math.sin((rot * Math.PI) / 180) * L * 0.72)} ${f(y + 1 - Math.cos((rot * Math.PI) / 180) * L * 0.72)}`),
    };
  });
  return { wood, tufts };
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
        k: lerp(0.2, 0.8, p),
        list: [
          { x0: 49, x: 41, y: 31, len: lerp(6, 9, p) },
          { x0: 50, x: 50.5, y: 26, len: lerp(6, 9, p) },
          { x0: 51, x: 60, y: 30, len: lerp(6, 9, p) },
        ],
      };
    case 5:
      return {
        k: 1,
        list: [
          { x0: 49, x: 40, y: 28, len: 10 },
          { x0: 50, x: 50.5, y: 23, len: 11 },
          { x0: 51, x: 61, y: 27, len: 10 },
          ...(p >= 0.5 ? [{ x0: 51, x: 68, y: 35, len: 8 }] : []),
        ],
      };
    case 6:
      return {
        k: 1,
        list: [
          { x0: 48, x: 31, y: 33, len: 10 },
          { x0: 49, x: 40, y: 25, len: 11 },
          { x0: 50, x: 50.5, y: 21, len: 11 },
          { x0: 51, x: 60, y: 24, len: 11 },
          { x0: 52, x: 69, y: 32, len: 10 },
          // The stalk that tops the Evergreen bush starts at the edge late in Flourishing.
          ...(p >= 0.5 ? [{ x0: 53, x: 76, y: 38, len: lerp(6, 9, p) }] : []),
        ],
      };
    case 7:
      return {
        k: 1,
        list: [
          ...EXTRA.slice(0, g.blooms),
          { x0: 47, x: 24, y: 38, len: 10 },
          { x0: 48, x: 32, y: 28, len: 11 },
          { x0: 49, x: 41, y: 22, len: 11 },
          { x0: 50, x: 50.5, y: 19.5, len: 11 },
          { x0: 51, x: 60, y: 21, len: 11 },
          { x0: 52, x: 68, y: 27, len: 11 },
          { x0: 53, x: 76, y: 37, len: 10 },
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
    const { wood, tufts } = bush(g);
    const { list, k } = stalks(g);
    return {
      back: (
        <g>
          <Stems paths={wood} w={2.8} color={WOOD} />
          <Stems paths={list.map((s) => stemD(s.x0, s.x, s.y + 1))} w={1.8} color={STEM} />
          {tufts.map((t, i) => (
            <g key={i}>
              <Merged shapes={t.shapes} fill={t.back ? LEAF_BACK : LEAF} line={1.6} />
              <path d={t.sheen.join(' ')} fill="none" stroke={SHEEN} stroke-width={1} stroke-linecap="round" opacity={0.8} />
            </g>
          ))}
          {list.map((s, i) => (
            <Spike key={i} x={s.x} y={s.y} len={s.len} k={k} />
          ))}
        </g>
      ),
    };
  },
};
