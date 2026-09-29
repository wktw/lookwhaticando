/**
 * Moth orchid (Phalaenopsis): two to four broad, fleshy leaves spread low from the base, and silver-green aerial
 * roots that climb out over the rim. One flower spike rises beside a thin bamboo stake and arches out, opening its
 * moth-shaped flowers from the base of the arch toward the buds at the tip.
 */
import type { JSX } from 'preact';
import { ell, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { alongLength, grown, partial } from '../leaves';
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
    <g key={key} transform={`translate(${f(x)} ${f(y)}) scale(${f(s * k.bloom)})`}>
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
  [40, false, 0.8, 6.8],
];

/** Aerial roots: [side, reach, birth]: silver cords that curl out over the rim. */
const ROOTS: readonly [number, number, number][] = [
  [-1, 1, 2.8],
  [1, 0.8, 4.6],
  [-1, 0.7, 6.4],
];

/** The flower spike, relative to the soil line: up beside the stake, then a long arch down and out to the right. */
const ARCH: readonly Pt[] = [
  [51.4, -1],
  [52, -14],
  [53, -26],
  [56, -35],
  [61, -40],
  [67, -41.4],
  [73, -40],
  [78, -36.4],
  [82, -31.4],
  [84.6, -26],
  [86, -21],
];
/** Where flowers sit, by fraction of the spike's length: evenly along the arch after the bend, buds at the tip. */
const FLOWER_SLOTS = [0.44, 0.53, 0.62, 0.71, 0.8, 0.89];
const BUD_SLOTS = [0.94, 0.985];

/**
 * One spike grown to `rise` (0..1) with `open` flowers. Each flower hangs a little below the stalk on its own short
 * stem, facing out, and they get a touch smaller toward the tip; the outer ones are painted first so each
 * nearer-the-base flower overlaps the next only slightly, as on the plant.
 */
function spikeOf(k: Kit, arch: readonly Pt[], rise: number, open: number, scale: number, key: string) {
  const grownTo = rise * (arch.length - 1);
  const vis = partial(arch, grownTo);
  const heads: JSX.Element[] = [];
  let pedicels = '';
  FLOWER_SLOTS.forEach((kk, j) => {
    const { at: [x, y], u } = alongLength(arch, kk);
    if (u > grownTo + 0.001) return;
    const hang = 3.6 * scale;
    if (j < open) {
      pedicels += `M${f(x)} ${f(y)}Q${f(x + 0.6)} ${f(y + hang * 0.5)} ${f(x + 0.3)} ${f(y + hang - 1)}`;
      heads.push(flower(k, x + 0.3, y + hang, lerp(0.9, 0.75, j / 5) * scale, j));
    } else heads.push(<path key={j} d={ell(x + 0.4, y + 1.9 * scale, 1.5 * scale, 1.9 * scale)} fill={k.lit(open > 0 ? '#EAD4DA' : '#BFD1A6')} />);
  });
  BUD_SLOTS.forEach((kk, j) => {
    const { at: [x, y], u } = alongLength(arch, kk);
    if (u > grownTo + 0.001) return;
    heads.push(<path key={`b${j}`} d={ell(x + 0.3, y + 1.4 * scale, (1.2 - j * 0.3) * scale, (1.5 - j * 0.3) * scale)} fill={k.lit(open > 0 ? '#EAD4DA' : '#BFD1A6')} />);
  });
  heads.reverse();
  return (
    <g key={key}>
      <path d={`${smooth(vis, false)}${pedicels}`} fill="none" stroke={SPIKE} stroke-width={0.9} stroke-linecap="round" />
      {heads}
    </g>
  );
}

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
  // The spike: up beside the stake, then a long arch down and out; flowers open from the base of the arch outward.
  const rise = ramp(g.t, 3.9, 5);
  const spikes: JSX.Element[] = [];
  if (rise > 0) {
    const open = g.stage >= 5 ? Math.min(6, g.blooms) : 0;
    spikes.push(<path key="stake" d={`M53.4 ${f(m.y)}V${f(m.y - 30)}`} stroke={k.lit(STAKE)} stroke-width={0.8} stroke-linecap="round" />);
    spikes.push(spikeOf(k, ARCH.map(([x, y]) => [x, m.y + y] as Pt), rise, open, 1, 'a'));
    if (rise > 0.4) spikes.push(<path key="clip" d={`M51.4 ${f(m.y - 24.6)}h2.8v1.6h-2.8Z`} fill={k.lit('#E7B8C4')} />);
    // An Evergreen orchid sends up a second, shorter spike, arching the other way.
    const second = ramp(g.t, 6.9, 7.6);
    if (second > 0) {
      const arch = ARCH.map(([x, y]) => [50 - (x - 50) * 0.72 - 1.6, m.y + y * 0.74] as Pt);
      spikes.unshift(spikeOf(k, arch, second, g.stage >= 7 ? Math.min(4, Math.ceil(g.blooms * 0.6)) : 0, 0.9, 'b'));
    }
  }
  const spike = spikes.length ? <g>{spikes}</g> : null;
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
