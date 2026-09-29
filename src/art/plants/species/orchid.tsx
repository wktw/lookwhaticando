/**
 * Moth orchid (Phalaenopsis): two to four broad, fleshy leaves spread low from the base, and silver-green aerial
 * roots that climb out over the rim. One flower spike rises beside a thin bamboo stake and arches out, opening its
 * moth-shaped flowers from the base of the arch toward the buds at the tip.
 */
import type { JSX } from 'preact';
import { ell, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, along, partial } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#80A96F', '#608C56');
const ROOT = '#C8D0C0';
const ROOT_TIP = '#9CBA86';
const SPIKE = '#8E9F6C';
const STAKE = '#D8C49C';
const PETAL = '#F6DAE3';
const LIP = '#D46A8E';

/** A broad, fleshy leaf, 24 long, bending gently to the right: an elongated oval with a blunt tip. */
const LEAF = (() => {
  const L = 24;
  const W: [number, number][] = [
    [0, 2],
    [0.1, 3.6],
    [0.28, 4.5],
    [0.5, 4.6],
    [0.72, 4.1],
    [0.88, 2.9],
    [0.97, 1.3],
    [1, 0],
  ];
  const c = (k: number): Pt => [0.16 * k * k * L, -k * L];
  const right = W.map(([k, w]) => [c(k)[0] + w, c(k)[1] + w * 0.16 * k] as Pt);
  const left = W.slice(0, -1)
    .reverse()
    .map(([k, w]) => [c(k)[0] - w, c(k)[1] - w * 0.16 * k] as Pt);
  return tidy(smooth([...right, ...left], true, 0.8));
})();
/** The crease down the middle of the leaf. */
const CREASE = 'M0 -1Q0.9 -12 3.4 -22';

function leaf(k: Kit, x: number, y: number, a: number, s: number, flip: boolean, tone: number, key: string | number) {
  const r = (a * Math.PI) / 180;
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(flip ? -s : s)} ${f(s)})`}>
      <path d={LEAF} fill={k.tone(GREENS, tone, x + Math.sin(r) * 12 * s, y)} />
      <path d={CREASE} fill="none" stroke={k.lit('#A9C795')} stroke-width={0.7} stroke-linecap="round" opacity={0.7} />
    </g>
  );
}

/** A moth flower, about 11 across: sepals and two broad round petals, a magenta lip and a yellow column. */
const FLOWER = `${ell(0, -3.3, 1.7, 2.8)}${ell(-1.9, 2.5, 1.4, 2.4)}${ell(1.9, 2.5, 1.4, 2.4)}${ell(-3.1, -0.5, 3.1, 2.9)}${ell(3.1, -0.5, 3.1, 2.9)}`;
/** The flush of colour at the heart of the flower, where the petals meet. */
const FLOWER_HEART = ell(0, 0.2, 2.1, 1.8);
const FLOWER_LIP = 'M0 0.4C1.4 0.4 1.8 2 1.2 3.2C0.8 4 -0.8 4 -1.2 3.2C-1.8 2 -1.4 0.4 0 0.4Z';

function flower(k: Kit, x: number, y: number, s: number, key: number) {
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`}>
      <path d={FLOWER} fill={k.lit(PETAL)} />
      <path d={FLOWER_HEART} fill={k.lit('#EEBFCD')} />
      <path d={FLOWER_LIP} fill={LIP} />
      <path d={ell(0, -0.2, 0.6)} fill="#F2CF6A" />
    </g>
  );
}

/** Leaves, in the order they open: [heading, arch to the right?, size, birth]. They alternate side to side. */
const LEAVES: readonly [number, boolean, number, number][] = [
  [70, false, 0.78, 1.6],
  [-72, true, 0.84, 2.3],
  [58, false, 0.96, 3.4],
  [-60, true, 1, 5.6],
];

/** Aerial roots: [side, reach, birth]: silver cords that curl out over the rim. */
const ROOTS: readonly [number, number, number][] = [
  [-1, 1, 2.8],
  [1, 0.8, 4.6],
  [-1, 0.7, 6.4],
];

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y - 0.6];
  const spread = Math.min(1, m.hw / 18);
  const leaves = LEAVES.map(([a, flip, s, birth], i) => {
    const gr = grown(g.t, birth, 1.1);
    if (gr <= 0) return null;
    return leaf(k, base[0] + (flip ? -1 : 1), base[1] - i * 0.6, a * lerp(0.6, 1, gr), s * lerp(0.4, 1, gr) * lerp(0.95, 1.05, spread), flip, i % 2, i);
  });
  const roots = ROOTS.map(([side, reach, birth], i) => {
    const gr = ramp(g.t, birth, birth + 1.4);
    if (gr <= 0) return null;
    // Out from under the leaves, over the rim, then wandering down the side of the pot.
    const x0 = 50 + side * (m.hw + 1.4);
    const pts: Pt[] = [
      [50 + side * 3, m.y - 1.6],
      [50 + side * (m.hw * 0.7), m.y - 3.2 - i * 0.6],
      [x0, m.y - 1],
      [x0 + side * 1.6 * reach, m.y + 3.6 * reach],
      [x0 + side * 0.4 * reach, m.y + 7 * reach],
      [x0 + side * 1.8 * reach, m.y + 10.6 * reach],
    ];
    const vis = partial(pts, gr * (pts.length - 1));
    const tip = vis.at(-1)!;
    return (
      <g key={i}>
        <path d={smooth(vis, false)} fill="none" stroke={k.lit(ROOT)} stroke-width={1.9} stroke-linecap="round" />
        <path d={ell(tip[0], tip[1], 1.05)} fill={ROOT_TIP} />
      </g>
    );
  });
  // The spike: up beside the stake, then an arch; flowers open from the base of the arch outward.
  const rise = ramp(g.t, 3.9, 5);
  let spike: JSX.Element | null = null;
  if (rise > 0) {
    const arch: Pt[] = [
      [51.4, m.y - 1],
      [52, m.y - 15],
      [52.6, m.y - 29],
      [55, m.y - 39],
      [60.6, m.y - 44.6],
      [67.4, m.y - 44.4],
      [73.4, m.y - 40.6],
      [78, m.y - 34.4],
      [80.6, m.y - 28],
    ];
    const vis = partial(arch, rise * (arch.length - 1));
    const open = g.stage >= 5 ? g.blooms : 0;
    const heads: JSX.Element[] = [];
    // Flowers open from the base of the arch toward the tip; the last slot is always a bud.
    const slots = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    slots.forEach((kk, j) => {
      if (kk > rise + 0.001) return;
      const [x, y] = along(arch, kk);
      if (j < open && j < 6) heads.push(flower(k, x, y + 4.2, lerp(1.2, 0.96, j / 5), j));
      else heads.push(<path key={j} d={ell(x, y + 1.8, 1.3 + (kk < 1 ? 0.3 : 0), 1.7 + (kk < 1 ? 0.3 : 0))} fill={k.lit(g.stage >= 5 ? '#EAD4DA' : '#BFD1A6')} />);
    });
    // Paint the outer flowers first so each nearer-the-base flower overlaps the next, as they grow on the spike.
    heads.reverse();
    spike = (
      <g>
        <path d={`M53.4 ${f(m.y)}V${f(m.y - 30)}`} stroke={k.lit(STAKE)} stroke-width={0.8} stroke-linecap="round" />
        <path d={smooth(vis, false)} fill="none" stroke={SPIKE} stroke-width={0.9} stroke-linecap="round" />
        {rise > 0.4 && <path d={`M51.4 ${f(m.y - 24.6)}h2.8v1.6h-2.8Z`} fill={k.lit('#E7B8C4')} />}
        {heads}
      </g>
    );
  }
  return {
    back: spike,
    front: (
      <g>
        {roots}
        {leaves}
      </g>
    ),
  };
}

export const orchid: SpeciesArt = {
  cutting: {
    stem: { color: ROOT, w: 1.3 },
    draw: (g, k, [x, y]) => {
      // A keiki: a baby plant from the flower stalk, two small leaves above and its first roots reaching down.
      const crown: Pt = [x, 57];
      const grow = g.stage ? 1 : lerp(0.8, 1, g.progress);
      return (
        <g>
          <path d={`M${x} ${y}Q${x - 0.6} ${crown[1] + 6} ${crown[0]} ${crown[1]}M${crown[0]} ${crown[1]}q-4 3 -4.4 8`} fill="none" stroke={k.lit(ROOT)} stroke-width={1.3} stroke-linecap="round" />
          {leaf(k, crown[0] + 0.6, crown[1], 38, 0.6 * grow, false, 0, 'a')}
          {leaf(k, crown[0] - 0.6, crown[1] - 0.4, -44, 0.55 * grow, true, 1, 'b')}
        </g>
      );
    },
  },
  potted,
};
