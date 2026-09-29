/**
 * African violet (Saintpaulia): a low rosette of round, velvety leaves on short stalks, the outer ones resting on the
 * rim. Clusters of purple flowers with bright yellow centres stand just above the leaves, most of the year.
 */
import type { JSX } from 'preact';
import { ell, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, place, Stems, toward } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#7FA66F', '#5F8656');
const VELVET = '#9BBE8A';
const STALK = '#8FAE7C';
const PETALS = ['#A78CD8', '#8F72C9'];
const ANTHERS = '#F4D35E';

/** A rounded leaf, 12 long, base at the origin: a shallow heart at the stalk, a soft point at the tip. */
const LEAF = tidy(
  smooth(
  (() => {
    const half: Pt[] = [
      [0, 0],
      [2.6, 0.7],
      [4.8, -0.8],
      [5.8, -3.6],
      [5.5, -6.8],
      [4.2, -9.4],
      [2.2, -11.2],
      [0, -12],
    ];
    return [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y] as Pt)];
  })(),
    true,
    0.9,
  ),
);
/** The velvet catching the light: a paler inner leaf, toward the tip. */
const SHEEN = 'M0 -3C3.2 -3.2 4.2 -5.8 3.9 -7.8C3.6 -9.6 2 -10.6 0 -10.8C-2 -10.6 -3.6 -9.6 -3.9 -7.8C-4.2 -5.8 -3.2 -3.2 0 -3Z';

function leaf(k: Kit, x: number, y: number, a: number, s: number, tone: number, key: string | number) {
  const r = (a * Math.PI) / 180;
  const cx = x + Math.sin(r) * 6 * s;
  return (
    <g key={key} transform={place(x, y, a, s)}>
      <path d={LEAF} fill={k.tone(GREENS, tone, cx, y)} />
      {tone === 0 && k.away * (cx - 50) <= 2.5 && <path d={SHEEN} fill={k.lit(VELVET)} opacity={0.45} />}
    </g>
  );
}

/** A violet flower, about 6 across: two small upper petals, three broad lower ones, a yellow centre. */
const FLOWER_UP = `${ell(-1.3, -1.5, 1.3, 1.5)}${ell(1.3, -1.5, 1.3, 1.5)}`;
const FLOWER_LOW = `${ell(-2.2, 0.6, 1.7, 1.5)}${ell(2.2, 0.6, 1.7, 1.5)}${ell(0, 1.8, 1.7, 1.5)}`;

function flower(k: Kit, x: number, y: number, s: number, key: string | number) {
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`}>
      <path d={FLOWER_UP} fill={k.lit(PETALS[1]!)} />
      <path d={FLOWER_LOW} fill={k.lit(PETALS[0]!)} />
      <path d={`${ell(-0.5, 0, 0.55)}${ell(0.5, 0, 0.55)}`} fill={ANTHERS} />
    </g>
  );
}

/** The rosette: [heading, stalk length, size, birth]. A low dome: the outer ring rests on the rim, the inner stands up. */
const LEAVES: readonly [number, number, number, number][] = [
  [-58, 5, 0.72, 1.8],
  [56, 5.4, 0.74, 2],
  [-16, 6.4, 0.7, 2.4],
  [20, 6.4, 0.72, 2.8],
  [-80, 8, 0.82, 3.2],
  [80, 8.4, 0.82, 3.5],
  [-38, 8.6, 0.84, 3.9],
  [40, 8.6, 0.84, 4.3],
  [-96, 10, 0.84, 5],
  [96, 10.4, 0.84, 5.4],
  [-64, 11, 0.88, 6],
  [66, 11.4, 0.88, 6.5],
  [-2, 8.4, 0.76, 7],
];

/** Flower positions above the rosette: [dx, dy above the soil]. */
const FLOWERS: readonly [number, number][] = [
  [-3, -14.6],
  [4.4, -15.4],
  [-9, -11.6],
  [10, -12],
  [0.6, -19.4],
  [-6.4, -18.2],
];

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.4];
  const spread = Math.min(1, m.hw / 18);
  let stalks = '';
  const back: JSX.Element[] = [];
  const front: JSX.Element[] = [];
  LEAVES.forEach(([a, len, s, birth], i) => {
    const gr = grown(g.t, birth, 1);
    if (gr <= 0) return;
    const [tx, ty] = toward(base, a * lerp(0.55, 1, gr), len * lerp(0.4, 1, gr));
    const x = 50 + (tx - 50) * spread;
    stalks += `M${f(base[0])} ${f(base[1])}L${f(x)} ${f(ty)}`;
    const el = leaf(k, x, ty, a * lerp(0.7, 1.05, gr), 1.18 * s * lerp(0.4, 1, gr) * lerp(0.95, 1.1, ramp(g.t, 3, 7.5)), i % 2, i);
    // Leaves that reach out over the rim rest on it, in front of the pot.
    (Math.abs(a) > 88 ? front : back).push(el);
  });
  const budding = g.stage === 4 ? 2 + Math.round(g.progress) : 0;
  const n = budding || g.blooms;
  let flowerStalks = '';
  const flowers = FLOWERS.slice(0, n).map(([dx, dy], j) => {
    const x = 50 + dx * spread;
    const y = m.y + dy * lerp(0.9, 1.05, ramp(g.t, 5, 7.5));
    flowerStalks += `M${f(50 + dx * 0.2)} ${f(m.y - 3)}Q${f(x)} ${f(y + 5)} ${f(x)} ${f(y + 0.6)}`;
    return budding ? <path key={j} d={ell(x, y + 1, 1.5, 1.8)} fill={k.lit('#B7A3DC')} /> : flower(k, x, y, lerp(1.3, 1.1, j / 6), j);
  });
  return {
    back: (
      <g>
        <Stems d={stalks} color={STALK} w={1.3} />
        {back}
        <Stems d={flowerStalks} color={STALK} w={0.6} />
        {flowers}
      </g>
    ),
    front: <g>{front}</g>,
  };
}

export const violet: SpeciesArt = {
  cutting: {
    // The classic: a single leaf on its stalk, rooting in a glass of water.
    stem: { color: STALK, w: 1.4 },
    draw: (g, k, [x, y]) => {
      const top: Pt = [x - 3.4, 51.4];
      const baby = g.stage ? ramp(g.progress, 0.6, 1) : 0;
      return (
        <g>
          <Stems d={`M${x} ${y}Q${x} 56 ${top[0]} ${top[1]}`} color={STALK} w={1.4} />
          {leaf(k, top[0], top[1], -34, lerp(1.25, 1.35, g.stage ? 1 : g.progress), 0, 'a')}
          {baby > 0 && leaf(k, x + 0.6, y - 1, 30, 0.35 * baby, 0, 'b')}
        </g>
      );
    },
  },
  potted,
};
