import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, OUTLINE, Shine, Stems, stemD } from '../parts';
import { f, lerp, mix } from '../math';
import { sprout } from '../early';

const LEAF = '#92C97E';
const LEAF_BACK = '#7DBA6C';
const LEAF_NEW = '#B6DD9C';
const VEIN = '#5F9850';
const SPATHE = '#FFF6E0';

type Pt = [number, number];

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const;
    return [k[0] * p0[0] + k[1] * p1[0] + k[2] * p2[0] + k[3] * p3[0], k[0] * p0[1] + k[1] * p1[1] + k[2] * p2[1] + k[3] * p3[1]];
  });
}

const leafCache = new Map<string, string>();

/**
 * A heart-shaped monstera leaf (sinus at the origin, tip at −L) with `slits` fenestrations
 * cut into each side. Built as a fine polyline so the slits stay crisp at any size.
 */
function monsteraLeafD(L: number, W: number, slits: number): string {
  const key = `${f(L)}|${f(W)}|${slits}`;
  const cached = leafCache.get(key);
  if (cached) return cached;
  // Right half, sinus → widest point → tip. Slits are cut only into the upper curve.
  const lower = cubic([0, 0], [W * 0.3, L * 0.12], [W * 1.05, L * 0.1], [W * 1.05, -L * 0.28], 8);
  const upper = cubic([W * 1.05, -L * 0.28], [W * 1.05, -L * 0.62], [W * 0.5, -L * 0.92], [0, -L], 26).slice(1);
  const edge = [...lower, ...upper];
  const first = lower.length + 1;
  const last = edge.length - 7;
  const at = Array.from({ length: slits }, (_, i) => Math.round(lerp(first, last, slits === 1 ? 0.45 : i / (slits - 1))));
  const right: Pt[] = [];
  edge.forEach((p, j) => {
    const slit = at.find((c) => Math.abs(c - j) <= 1);
    if (slit === undefined) return void right.push(p);
    if (slit !== j) return;
    // A slot cut from the edge toward the midrib, running back toward the stem like a leaf vein.
    const dx = (W * 0.1 - p[0]) * 0.56;
    const dy = L * 0.07;
    const a = edge[j - 2]!;
    const b = edge[j + 2]!;
    right.push([a[0] + dx, a[1] + dy], [b[0] + dx, b[1] + dy]);
  });
  const left = right.slice(1, -1).map(([x, y]): Pt => [-x, y]).reverse();
  const d = `M${[...right, ...left].map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
  leafCache.set(key, d);
  return d;
}

interface LeafSpec {
  x0: number;
  x: number;
  y: number;
  rot: number;
  L: number;
  slits: number;
  fill?: string;
}

function MonsteraLeaf({ x, y, rot, L, slits, fill = LEAF }: LeafSpec) {
  const W = L * 0.7;
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)})`} stroke-linejoin="round" stroke-linecap="round">
      <path d={monsteraLeafD(L, W, slits)} fill={fill} stroke={OUTLINE} stroke-width={FINE} />
      <path d={`M0 ${f(-L * 0.02)} Q${f(W * 0.06)} ${f(-L * 0.5)} 0 ${f(-L * 0.86)}`} fill="none" stroke={VEIN} stroke-width={1.2} />
      <Shine d={`M${f(-W * 0.3)} ${f(-L * 0.62)} Q${f(-W * 0.22)} ${f(-L * 0.76)} ${f(-W * 0.08)} ${f(-L * 0.84)}`} w={1.2} opacity={0.45} />
    </g>
  );
}

/** The monstera "flower": a cream spathe hood around a butter spadix; `k` < 1 is a closed green bud. */
function Spathe({ x, y, s = 1, rot = 0, k = 1 }: { x: number; y: number; s?: number; rot?: number; k?: number }) {
  const line = f(FINE / s);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`} stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      {k < 1 ? (
        <path d="M0 0 C-4 -2 -4 -10 0 -16 C4 -10 4 -2 0 0 Z" fill={mix('#CDE7B2', SPATHE, k)} stroke-width={line} />
      ) : (
        <g stroke-width={line}>
          <path d="M0 0.4 C-6.4 -1.6 -8 -10 -1.6 -18 C1 -13 6.4 -8.4 5.2 -2 C4.4 0.4 2 1 0 0.4 Z" fill={SPATHE} />
          <path d="M-1.6 -1.2 L-1.9 -10 Q-0.3 -12.6 1.3 -10.2 L1.4 -1.4 Q0 -0.4 -1.6 -1.2 Z" fill="#FFE08A" stroke-width={f(1.4 / s)} />
          <Shine d="M-4.6 -4 Q-5.6 -8.8 -3 -12.6" w={1.3 / s} opacity={0.9} />
        </g>
      )}
    </g>
  );
}

interface Layout {
  leaves: LeafSpec[];
  spathes: { x0: number; x: number; y: number; rot: number; s: number; k: number }[];
}

const EXTRA_SPATHES = [
  { x0: 48, x: 40, y: 50, rot: -16, s: 0.72, k: 1 },
  { x0: 52, x: 61, y: 51, rot: 18, s: 0.72, k: 1 },
  { x0: 46, x: 33, y: 55, rot: -28, s: 0.66, k: 1 },
  { x0: 54, x: 68, y: 56, rot: 30, s: 0.66, k: 1 },
  { x0: 49, x: 46, y: 44, rot: -6, s: 0.6, k: 1 },
  { x0: 51, x: 55, y: 44, rot: 8, s: 0.6, k: 1 },
];

function layout(g: Growth): Layout {
  const p = g.progress;
  const k = lerp(0.92, 1, p);
  switch (g.stage) {
    case 2:
      return {
        leaves: [
          { x0: 49, x: 46, y: 51, rot: -30, L: lerp(9, 10.5, p), slits: 0, fill: LEAF_NEW },
          { x0: 51, x: 54, y: 48, rot: 26, L: lerp(10, 11.5, p), slits: 0, fill: LEAF_NEW },
          ...(p >= 0.5 ? [{ x0: 50, x: 50, y: 45, rot: 2, L: lerp(5, 8, p), slits: 0, fill: LEAF_NEW }] : []),
        ],
        spathes: [],
      };
    case 3:
      return {
        leaves: [
          { x0: 50, x: 50, y: 42, rot: 2, L: 15 * k, slits: p >= 0.5 ? 1 : 0, fill: LEAF_BACK },
          { x0: 48, x: 38, y: 49, rot: -44, L: 14 * k, slits: 0 },
          { x0: 52, x: 63, y: 47, rot: 42, L: 14.5 * k, slits: 0 },
        ],
        spathes: [],
      };
    case 4:
      return {
        leaves: [
          { x0: 49, x: 43, y: 38, rot: -16, L: 16, slits: 1, fill: LEAF_BACK },
          { x0: 51, x: 58, y: 36, rot: 18, L: 16, slits: 1, fill: LEAF_BACK },
          { x0: 48, x: 34, y: 49, rot: -56, L: 15, slits: 1 },
          { x0: 52, x: 67, y: 48, rot: 54, L: 15, slits: 1 },
        ],
        spathes: [{ x0: 51, x: 54, y: 52, rot: 10, s: lerp(0.62, 0.86, p), k: p * 0.6 }],
      };
    case 5:
      return {
        leaves: [
          { x0: 49, x: 41, y: 35, rot: -22, L: 19, slits: 2, fill: LEAF_BACK },
          { x0: 51, x: 60, y: 33, rot: 22, L: 19, slits: 2, fill: LEAF_BACK },
          { x0: 48, x: 31, y: 49, rot: -60, L: 17, slits: 1 },
          { x0: 52, x: 70, y: 48, rot: 58, L: 17, slits: 2 },
        ],
        spathes: [{ x0: 51, x: 54, y: 51, rot: 10, s: lerp(0.86, 1, p), k: 1 }],
      };
    case 6:
      return {
        leaves: [
          { x0: 50, x: 50, y: 29, rot: 2, L: 20, slits: 2, fill: LEAF_BACK },
          { x0: 49, x: 36, y: 36, rot: -34, L: 20, slits: 2, fill: LEAF_BACK },
          { x0: 51, x: 64, y: 35, rot: 34, L: 20, slits: 2, fill: LEAF_BACK },
          { x0: 48, x: 28, y: 52, rot: -66, L: 17, slits: 2 },
          { x0: 52, x: 73, y: 51, rot: 64, L: 17, slits: 2 },
        ],
        spathes: [
          { x0: 51, x: 55, y: 51, rot: 12, s: 1, k: 1 },
          ...(p >= 0.5 ? [{ x0: 49, x: 43, y: 53, rot: -14, s: 0.8, k: 1 }] : []),
        ],
      };
    default:
      return {
        leaves: [
          { x0: 49, x: 40, y: 27, rot: -12, L: 21, slits: 3, fill: LEAF_BACK },
          { x0: 51, x: 61, y: 26, rot: 14, L: 21, slits: 3, fill: LEAF_BACK },
          { x0: 48, x: 29, y: 38, rot: -44, L: 20, slits: 3 },
          { x0: 52, x: 72, y: 37, rot: 44, L: 20, slits: 3 },
          { x0: 47, x: 24, y: 54, rot: -74, L: 17, slits: 2 },
          { x0: 53, x: 77, y: 53, rot: 72, L: 17, slits: 2 },
        ],
        spathes: [{ x0: 51, x: 57, y: 52, rot: 14, s: 1.05, k: 1 }, { x0: 49, x: 43, y: 53, rot: -14, s: 0.9, k: 1 }, ...EXTRA_SPATHES.slice(0, g.blooms)],
      };
  }
}

export const monstera: PlantSpeciesArt = {
  seed: '#CDB08F',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    const { leaves, spathes } = layout(g);
    return {
      back: (
        <g>
          <Stems paths={leaves.map((l) => stemD(l.x0, l.x, l.y + 1, (l.x - l.x0) * -0.3))} w={2.4} />
          {leaves.map((l, i) => (
            <MonsteraLeaf key={i} {...l} />
          ))}
          <Stems paths={spathes.map((s) => stemD(s.x0, s.x, s.y))} w={2.2} />
          {spathes.map((s, i) => (
            <Spathe key={i} x={s.x} y={s.y} s={s.s} rot={s.rot} k={s.k} />
          ))}
        </g>
      ),
    };
  },
};
