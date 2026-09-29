/**
 * Strawberry (Fragaria): a low crown of trifoliate leaves with toothed leaflets on arching stalks. White five-petalled
 * flowers come first, then small red berries that hang over the rim (the harvest), and at last a runner with a
 * baby plant at its tip.
 */
import type { JSX } from 'preact';
import { ell, mapPath, tidy, type Pt } from '../geom';
import { inks, SHADE, type Kit } from '../kit';
import { grown, place, Stems, toward } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#9DC486', '#76A266');
const STALK = '#93B27E';
const PETAL = '#F8F3EA';
const HEART = '#F2CD5C';
const BERRY = '#E2654F';
const UNRIPE = '#EAD9A8';
const SEEDS = '#F6DC8E';
const CALYX = '#7FA66A';

/** One toothed leaflet, 9 long, base at the origin, tip up: an oval with a serrated upper edge. */
const LEAFLET = (() => {
  const pts: string[] = [];
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const x = Math.sin(th) * 3.6;
    const y = -4.6 + Math.cos(th) * -4.6;
    // Teeth on the outer three quarters, a smooth taper into the stalk.
    const toothed = Math.cos(th) < 0.55;
    const k = toothed && i % 2 ? 1.1 : 1;
    pts.push(`${f(x * k)} ${f(-4.6 + (y + 4.6) * k)}`);
  }
  return tidy(`M${pts.join('L')}Z`);
})();
/** Three leaflets on one stalk: the middle one straight on, the side ones turned out. */
const TRIFOLIATE = [0, -52, 52]
  .map((a, i) => {
    const r = (a * Math.PI) / 180;
    const s = i ? 0.9 : 1;
    return mapPath(LEAFLET, (x, y) => [(x * Math.cos(r) - y * Math.sin(r)) * s, (x * Math.sin(r) + y * Math.cos(r)) * s - 0.4]);
  })
  .join('');
const VEINS = [0, -52, 52]
  .map((a, i) => {
    const r = (a * Math.PI) / 180;
    const L = i ? 7.2 : 8;
    return `M${f(-Math.sin(-r) * 0.8)} ${f(-0.8 * Math.cos(r) - 0.4)}L${f(Math.sin(r) * L)} ${f(-Math.cos(r) * L - 0.4)}`;
  })
  .join('');

function trifoliate(k: Kit, x: number, y: number, a: number, s: number, tone: number, key: string | number) {
  return (
    <g key={key} transform={place(x, y, a, s)}>
      <path d={TRIFOLIATE} fill={k.tone(GREENS, tone, x, y)} />
      <path d={VEINS} fill="none" stroke={k.lit('#C5DDB0')} stroke-width={0.45} stroke-linecap="round" opacity={0.8} />
    </g>
  );
}

const FLOWER = [0, 72, 144, 216, 288]
  .map((a) => {
    const r = (a * Math.PI) / 180;
    return ell(Math.sin(r) * 2.3, -Math.cos(r) * 2.3, 1.85);
  })
  .join('');
/** The lower petals turned from the light: a flat shade so white reads on white. */
const FLOWER_SHADE = { left: ell(1.9, 1.2, 1.5), right: ell(-1.9, 1.2, 1.5), top: ell(0, 2.2, 1.6) };

function flower(k: Kit, x: number, y: number, s: number, key: string | number) {
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`}>
      <path d={FLOWER} fill={k.lit(PETAL)} />
      <path d={FLOWER_SHADE[k.light.from]} class={SHADE} />
      <path d={ell(0, 0, 1.3)} fill={HEART} />
    </g>
  );
}

/** A berry hanging from (x, y): a rounded cone, seed-flecked, under a green calyx. */
const BERRY_D = 'M0 0C2.6 0 3.4 1.8 3.2 3.4C2.9 5.6 1.4 7.4 0 7.8C-1.4 7.4 -2.9 5.6 -3.2 3.4C-3.4 1.8 -2.6 0 0 0Z';
const BERRY_SEEDS = [
  [-1.4, 2.2],
  [0.4, 1.8],
  [1.8, 2.8],
  [-1.8, 4.2],
  [0, 4],
  [1.4, 4.8],
  [-0.6, 6],
  [0.8, 6.4],
]
  .map(([x, y]) => ell(x!, y!, 0.28, 0.36))
  .join('');
const CALYX_D = 'M0 0.8L-3 -0.4L-1.2 0.6L-2.4 1.8L-0.4 1L0 2.4L0.4 1L2.4 1.8L1.2 0.6L3 -0.4Z';

function berry(k: Kit, x: number, y: number, s: number, ripe: number, key: string | number) {
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`}>
      <path d={BERRY_D} fill={ripe > 0.5 ? k.lit(BERRY) : k.lit(UNRIPE)} />
      <path d={BERRY_SEEDS} fill={k.lit(SEEDS)} opacity={0.9} />
      <path d={CALYX_D} fill={CALYX} />
    </g>
  );
}

/** Leaves of the crown: [heading, stalk length, size, birth]. */
const LEAVES: readonly [number, number, number, number][] = [
  [-40, 11, 1, 1.8],
  [36, 12, 1, 2.1],
  [-4, 14.5, 1.05, 2.6],
  [-66, 13, 1.05, 3.1],
  [62, 14, 1.1, 3.5],
  [18, 17.5, 1.1, 4.1],
  [-22, 18.5, 1.15, 4.8],
  [46, 17, 1.15, 5.6],
  [-52, 17.5, 1.15, 6.3],
  [4, 21, 1.1, 7],
];

/** Where trusses of flowers and berries hang over the rim: [side, reach past the rim, drop below it]. */
const TRUSSES: readonly [number, number, number][] = [
  [1, 4, 5],
  [-1, 3, 7],
  [1, 7, 11],
  [-1, 6, 3],
  [1, 1.5, 12],
  [-1, 1, 11],
];

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.6];
  const spread = Math.min(1, m.hw / 18);
  let stalks = '';
  const leaves = LEAVES.map(([a, len, s, birth], i) => {
    const gr = grown(g.t, birth);
    if (gr <= 0) return null;
    const [tx, ty] = toward(base, a * lerp(0.6, 1, gr), len * lerp(0.45, 1, gr));
    const x = 50 + (tx - 50) * spread;
    stalks += `M${f(base[0])} ${f(base[1])}Q${f(lerp(base[0], x, 0.2))} ${f(lerp(base[1], ty, 0.7))} ${f(x)} ${f(ty)}`;
    return trifoliate(k, x, ty, a * 0.7, s * lerp(0.45, 1, gr) * lerp(0.92, 1.05, ramp(g.t, 3, 7.5)), i % 2, i);
  });
  // Buds at Budding; from Blooming the flowers set fruit, ripening as the plant matures.
  const budding = g.stage === 4 ? 1 + Math.round(g.progress) : 0;
  const count = budding || g.blooms;
  const fruit = g.stage >= 7 ? Math.max(0, count - 1) : g.stage === 6 ? Math.floor(count / 2) : 0;
  let trussStalks = '';
  const hanging: JSX.Element[] = [];
  TRUSSES.slice(0, count).forEach(([side, reach, drop], j) => {
    const berryNow = !budding && j < fruit;
    // Flowers are held out at the edge of the leaves; the weight of fruit brings the stalk down over the rim.
    const x = 50 + side * (m.hw + reach - (berryNow ? 2 : 7));
    const y = berryNow ? m.y + drop : m.y - 4 - drop * 0.5;
    trussStalks += `M${f(50 + side * 3)} ${f(m.y - 1)}Q${f(50 + side * (m.hw * 0.7))} ${f(m.y - 12)} ${f(x)} ${f(y)}`;
    if (budding)
      hanging.push(
        <g key={j} transform={`translate(${f(x)} ${f(y)})`}>
          <path d={ell(0, -0.6, 1.9, 2.1)} fill={k.lit('#F3F1E2')} />
          <path d={CALYX_D} fill={CALYX} transform="translate(0 0.6)" />
        </g>,
      );
    else if (j < fruit) hanging.push(berry(k, x, y, lerp(0.85, 1.1, j / 6), g.stage >= 7 || j % 2 === 0 ? 1 : 0, j));
    else hanging.push(flower(k, x, y - 1, 1, j));
  });
  // A runner at Evergreen: a bare stalk over the rim with a baby plant at its tip.
  const run = ramp(g.t, 7.2, 8);
  const runner = run > 0 && (
    <g>
      <path d={`M${f(50 - 4)} ${f(m.y)}Q${f(50 - m.hw - 8)} ${f(m.y - 10)} ${f(50 - m.hw - 9)} ${f(m.y + lerp(2, 20, run))}`} fill="none" stroke={STALK} stroke-width={0.8} stroke-linecap="round" />
      {trifoliate(k, 50 - m.hw - 9, m.y + lerp(2, 20, run), 160, 0.55 * run, 0, 'runner')}
    </g>
  );
  return {
    back: (
      <g>
        <Stems d={stalks} color={STALK} w={1} />
        {leaves}
      </g>
    ),
    front: (
      <g>
        <Stems d={trussStalks} color={STALK} w={0.8} />
        {hanging}
        {runner}
      </g>
    ),
  };
}

export const strawberry: SpeciesArt = {
  cutting: {
    stem: { color: STALK, w: 1.3 },
    draw: (g, k, [x, y]) => {
      // A runner's baby plant: a little crown with two leaves, rooting in water.
      const crown: Pt = [x, 57];
      const third = g.stage > 0 ? grown(g.progress, 0.5, 0.5) : 0;
      return (
        <g>
          <Stems d={`M${x} ${y}L${crown[0]} ${crown[1]}M${crown[0]} ${crown[1]}Q${crown[0] - 3} ${crown[1] - 5} ${crown[0] - 5} ${crown[1] - 9}M${crown[0]} ${crown[1]}Q${crown[0] + 3} ${crown[1] - 6} ${crown[0] + 5} ${crown[1] - 11}${third ? `M${crown[0]} ${crown[1]}L${crown[0] + 0.4} ${crown[1] - 10 * third}` : ''}`} color={STALK} w={1} />
          {trifoliate(k, crown[0] - 5, crown[1] - 9, -30, lerp(0.8, 0.9, g.stage ? 1 : g.progress), 1, 'a')}
          {trifoliate(k, crown[0] + 5, crown[1] - 11, 26, 0.9, 0, 'b')}
          {third > 0 && trifoliate(k, crown[0] + 0.4, crown[1] - 10 * third, 2, 0.6 * third, 0, 'c')}
        </g>
      );
    },
  },
  potted,
};
