/**
 * African violet (Saintpaulia): a low rosette of round, velvety leaves on short stalks, the outer ones resting on the
 * rim. Clusters of purple flowers with bright yellow centres stand just above the leaves, most of the year.
 */
import type { JSX } from 'preact';
import { ell, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, place, Stems, toward } from '../leaves';
import { f, lerp, mix, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#7FA66F', '#5F8656');
const VELVET = '#B5CFA3';
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
/** The velvet: a paler inner leaf, so each leaf reads soft and fuzzy with a darker edge all round. */
const VELVET_D = 'M0 -1.6C3 -1.6 4.4 -3.6 4.5 -6C4.5 -8.4 2.6 -10.2 0 -10.9C-2.6 -10.2 -4.5 -8.4 -4.5 -6C-4.4 -3.6 -3 -1.6 0 -1.6Z';

function leaf(k: Kit, x: number, y: number, a: number, s: number, tone: number, key: string | number) {
  const r = (a * Math.PI) / 180;
  const cx = x + Math.sin(r) * 6 * s;
  const fill = k.tone(GREENS, tone, cx, y);
  return (
    <g key={key} transform={place(x, y, a, s)}>
      <path d={LEAF} fill={fill} />
      <path d={VELVET_D} fill={mix(fill, k.lit(VELVET), 0.38)} />
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

/**
 * The rosette, in two rings on short stalks radiating from the crown: [heading, stalk length, ring, birth]. The inner
 * ring stands up around the flowers; the outer ring lies out almost level, just reaching the rim.
 */
const LEAVES: readonly [number, number, 'in' | 'out', number][] = [
  [-24, 5.4, 'in', 1.8],
  [26, 5.6, 'in', 2.1],
  [-52, 6.2, 'in', 2.6],
  [54, 6.4, 'in', 3],
  [-68, 8.6, 'out', 3.4],
  [70, 8.8, 'out', 3.8],
  [-82, 9, 'out', 4.6],
  [84, 9.2, 'out', 5],
  [-54, 9.4, 'out', 5.6],
  [56, 9.6, 'out', 6.1],
  [2, 4.6, 'in', 6.8],
];

/** Flower positions above the rosette: [dx, dy above the soil]. */
const FLOWERS: readonly [number, number][] = [
  [-2.6, -15.4],
  [3.8, -16],
  [-7.6, -13.4],
  [8.4, -13.8],
  [0.6, -20],
  [-5.2, -19],
];

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.4];
  const spread = Math.min(1, m.hw / 18);
  let stalks = '';
  const back: JSX.Element[] = [];
  const front: JSX.Element[] = [];
  const mature = lerp(0.95, 1.08, ramp(g.t, 3, 7.5));
  const outerStalks: string[] = [];
  const outer: JSX.Element[] = [];
  const inner: JSX.Element[] = [];
  LEAVES.forEach(([a, len, ring, birth], i) => {
    const gr = grown(g.t, birth, 1);
    if (gr <= 0) return;
    const L = len * lerp(0.4, 1, gr) * (ring === 'out' ? spread : 1);
    const [tx, ty] = toward(base, a * lerp(0.6, 1, gr), L);
    const x = 50 + (tx - 50) * (ring === 'out' ? 1 : spread);
    const stalk = `M${f(base[0])} ${f(base[1])}L${f(x)} ${f(ty)}`;
    // The outer ring's leaves are sized so their tips just reach the rim; the inner ones stay small and upright.
    const full = ring === 'out' ? Math.max(0.6, Math.min(0.86, (m.hw - L) / 12)) : 0.7;
    const el = leaf(k, x, ty, a * lerp(0.7, 1, gr), full * lerp(0.4, 1, gr) * mature, i % 2, i);
    if (ring === 'out') {
      outerStalks.push(stalk);
      (Math.abs(a) > 78 ? front : outer).push(el);
    } else {
      stalks += stalk;
      inner.push(el);
    }
  });
  back.push(<Stems key="os" d={outerStalks.join('')} color={STALK} w={1.3} />, ...outer, <Stems key="is" d={stalks} color={STALK} w={1.2} />, ...inner);
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
