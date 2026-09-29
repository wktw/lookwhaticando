import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, Leaf, OUTLINE, Shine, Stems, stemD, type LeafProps } from '../parts';
import { f, lerp, mix, ramp } from '../math';
import { seedling, sprout } from '../early';

const LEAF = '#A3D5A6';
const LEAF_BACK = '#86C38E';
const PINK = '#FFAFC4';
const PALE_PINK = '#FFD3DF';
const PEACH = '#FFC49E';
const LILAC = '#E9BCF0';
const BUTTER = '#FFE08A';
const ROSE = '#FB98B4';

/** A tulip cup: two side petals and a lighter front petal, based at (x, y). */
function TulipCup({ x, y, s = 1, rot = 0, color }: { x: number; y: number; s?: number; rot?: number; color: string }) {
  const a = 7.8;
  const h = 14.5;
  const cup = `M${-a} ${-h} C${f(-a * 1.2)} ${f(-h * 0.3)} ${f(-a * 0.7)} 0 0 0 C${f(a * 0.7)} 0 ${f(a * 1.2)} ${f(-h * 0.3)} ${a} ${-h} Q${f(a * 0.6)} ${f(-h * 0.74)} ${f(a * 0.36)} ${f(-h * 0.68)} Q${f(a * 0.26)} ${f(-h * 1.02)} 0 ${f(-h * 1.12)} Q${f(-a * 0.26)} ${f(-h * 1.02)} ${f(-a * 0.36)} ${f(-h * 0.68)} Q${f(-a * 0.6)} ${f(-h * 0.74)} ${-a} ${-h} Z`;
  const front = `M${f(-a * 0.36)} ${f(-h * 0.68)} Q${f(-a * 0.26)} ${f(-h * 1.02)} 0 ${f(-h * 1.12)} Q${f(a * 0.26)} ${f(-h * 1.02)} ${f(a * 0.36)} ${f(-h * 0.68)} Q${f(a * 0.34)} ${f(-h * 0.2)} 0 ${f(-h * 0.03)} Q${f(-a * 0.34)} ${f(-h * 0.2)} ${f(-a * 0.36)} ${f(-h * 0.68)} Z`;
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`} stroke-linejoin="round" stroke-linecap="round">
      <path d={cup} fill={color} stroke={OUTLINE} stroke-width={f(FINE / s)} />
      <path d={front} fill={mix(color, '#FFFFFF', 0.35)} stroke={OUTLINE} stroke-width={f(1.3 / s)} />
      <Shine d={`M${f(-a * 0.78)} ${f(-h * 0.62)} Q${f(-a * 0.8)} ${f(-h * 0.36)} ${f(-a * 0.56)} ${f(-h * 0.2)}`} w={1.4 / s} opacity={0.7} />
    </g>
  );
}

/** A closed bud: green sepals hug a pink bud and slip down as it ripens (`k` 0 → 1). */
function TulipBud({ x, y, s = 1, rot = 0, k }: { x: number; y: number; s?: number; rot?: number; k: number }) {
  const a = 5;
  const h = 12.5;
  const sh = h * lerp(0.9, 0.42, k);
  const sepal = `M0 0.6 C${f(-a * 1.5)} 0 ${f(-a * 1.28)} ${f(-sh * 0.75)} ${f(-a * 0.12)} ${f(-sh)} C${f(-a * 0.32)} ${f(-sh * 0.55)} ${f(-a * 0.1)} ${f(-sh * 0.25)} 0 0.6 Z`;
  const line = f(FINE / s);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`} stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      <path
        d={`M0 0 C${f(-a * 1.35)} ${f(-h * 0.12)} ${f(-a * 0.95)} ${f(-h * 0.78)} 0 ${-h} C${f(a * 0.95)} ${f(-h * 0.78)} ${f(a * 1.35)} ${f(-h * 0.12)} 0 0 Z`}
        fill={mix(PALE_PINK, PINK, k)}
        stroke-width={line}
      />
      <Shine d={`M${f(-a * 0.55)} ${f(-h * 0.72)} Q${f(-a * 0.4)} ${f(-h * 0.86)} ${f(-a * 0.15)} ${f(-h * 0.92)}`} w={1.2 / s} />
      <path d={sepal} fill={LEAF} stroke-width={line} />
      <path d={sepal} transform="scale(-1 1)" fill={LEAF} stroke-width={line} />
    </g>
  );
}

interface Bloom {
  /** Where the stem leaves the soil. */
  x0: number;
  x: number;
  y: number;
  rot: number;
  s: number;
  /** Open cup color, or bud blush (0..1) when still closed. */
  color?: string;
  bud?: number;
}

/** Extra tulips earned after Evergreen, tucked lower between the leaves. */
const EXTRA: Omit<Bloom, 'color'>[] = [
  { x0: 47, x: 36, y: 46, rot: -18, s: 0.66 },
  { x0: 53, x: 64, y: 45, rot: 18, s: 0.66 },
  { x0: 45, x: 17, y: 55, rot: -38, s: 0.6 },
  { x0: 55, x: 83, y: 54, rot: 38, s: 0.6 },
  { x0: 49, x: 44, y: 37, rot: -6, s: 0.58 },
  { x0: 51, x: 56, y: 36, rot: 6, s: 0.58 },
];
const EXTRA_COLORS = [PALE_PINK, BUTTER, PEACH, LILAC, ROSE, PINK];

function blooms(g: Growth): Bloom[] {
  const p = g.progress;
  switch (g.stage) {
    case 4:
      return [{ x0: 50, x: 50.6, y: lerp(35, 29, p), rot: 3, s: lerp(0.8, 1.1, p), bud: lerp(0.15, 0.65, p) }];
    case 5:
      return [
        ...(p >= 0.55 ? [{ x0: 53, x: 62, y: 38, rot: 16, s: 0.72, bud: lerp(0.25, 0.6, p) }] : []),
        { x0: 50, x: 50.6, y: 26, rot: 3, s: 1.05, color: mix(PALE_PINK, PINK, p) },
      ];
    case 6:
      return [
        ...(p >= 0.5 ? [{ x0: 49, x: 43, y: 42, rot: -8, s: 0.66, bud: lerp(0.3, 0.7, p) }] : []),
        { x0: 47, x: 36.5, y: 33, rot: -15, s: 0.95, color: PEACH },
        { x0: 53, x: 63.5, y: 31, rot: 13, s: 0.95, color: LILAC },
        { x0: 50, x: 50.4, y: 22, rot: 2, s: 1.05, color: PINK },
      ];
    case 7:
      return [
        ...EXTRA.slice(0, g.blooms).map((b, i) => ({ ...b, color: EXTRA_COLORS[i] })),
        { x0: 46, x: 26, y: 42, rot: -27, s: 0.86, color: BUTTER },
        { x0: 54, x: 74, y: 40, rot: 25, s: 0.86, color: ROSE },
        { x0: 47, x: 36.5, y: 30, rot: -14, s: 0.96, color: PEACH },
        { x0: 53, x: 63.5, y: 28, rot: 13, s: 0.96, color: LILAC },
        { x0: 50, x: 50.4, y: 20, rot: 2, s: 1.05, color: PINK },
      ];
    default:
      return [];
  }
}

function leaves(g: Growth): LeafProps[] {
  const k = ramp(g.t, 3, 5);
  const lush = ramp(g.t, 5, 7);
  const L = (a: number, b: number) => lerp(a, b, k) + lush * 3;
  const list: LeafProps[] = [
    { x: 45, y: 63.5, rot: -36, L: L(22, 29), W: 6.6, bend: -0.12, fill: LEAF_BACK },
    { x: 55, y: 63.5, rot: 38, L: L(21, 27), W: 6.6, bend: 0.12, fill: LEAF_BACK },
  ];
  if (g.stage >= 6) {
    list.push({ x: 44, y: 63.5, rot: -60, L: 23, W: 6, bend: -0.14, fill: LEAF_BACK }, { x: 56, y: 63.5, rot: 62, L: 22, W: 6, bend: 0.14, fill: LEAF_BACK });
  }
  list.push({ x: 48.5, y: 63.5, rot: -12, L: L(25, 31), W: 7, bend: -0.06 });
  if (g.t >= 3.5) list.push({ x: 52, y: 63.5, rot: 19, L: lerp(13, 22, ramp(g.t, 3.5, 5)) + lush * 2, W: 6.2, bend: 0.08 });
  return list;
}

export const tulip: PlantSpeciesArt = {
  seed: '#E7C3A6',
  render: (g) => {
    if (g.stage === 1) return sprout(g, { leaf: LEAF });
    if (g.stage === 2) return seedling(g, { leaf: LEAF, shape: 'lance' });
    const ls = leaves(g);
    const bs = blooms(g);
    const backCount = g.stage >= 6 ? 4 : 2;
    return {
      back: (
        <g>
          {ls.slice(0, backCount).map((l, i) => (
            <Leaf key={i} shape="strap" {...l} />
          ))}
          <Stems paths={bs.map((b) => stemD(b.x0, b.x, b.y + 1))} w={3} />
          {ls.slice(backCount).map((l, i) => (
            <Leaf key={i} shape="strap" fill={LEAF} {...l} />
          ))}
          {bs.map((b, i) =>
            b.color ? <TulipCup key={i} x={b.x} y={b.y} s={b.s} rot={b.rot} color={b.color} /> : <TulipBud key={i} x={b.x} y={b.y} s={b.s} rot={b.rot} k={b.bud ?? 0} />,
          )}
        </g>
      ),
    };
  },
};
