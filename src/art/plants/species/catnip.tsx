/**
 * Catnip (Nepeta cataria): square upright stems with soft grey-green, heart-shaped leaves in opposite pairs, their
 * edges scalloped. From Blooming each stem ends in a spike of small white flowers dotted with lilac (the harvest).
 */
import type { JSX } from 'preact';
import { ell, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { caneAt, headingAt, place, type Cane } from '../leaves';
import { lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#AFC49B', '#8AA67C');
const STEM = '#98AE88';
const WHITE = '#FBF8F4';
const LILAC = '#C7AEE0';

/** A soft heart leaf, 11.4 long, base at the origin, its edge cut into round teeth (crenate). */
const LEAF = (() => {
  const half: Pt[] = [
    [0, 0],
    [2.2, 0.8],
    [4.6, -0.6],
    [5.4, -3.6],
    [4.8, -6.8],
    [3.1, -9.2],
    [0, -11.4],
  ];
  // Between the outline points, a rounded tooth pushed a little outward from the leaf's centre.
  const toothed: Pt[] = [half[0]!, half[1]!];
  for (let i = 1; i < half.length - 1; i++) {
    const [ax, ay] = half[i]!;
    const [bx, by] = half[i + 1]!;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const len = Math.hypot(mx, my + 5.2) || 1;
    toothed.push([mx + (mx / len) * 0.5, my + ((my + 5.2) / len) * 0.5], [bx, by]);
  }
  const left = toothed.slice(1, -1).reverse().map(([x, y]) => [-x, y] as Pt);
  return tidy(smooth([...toothed, ...left], true, 0.8));
})();

function leaf(k: Kit, x: number, y: number, a: number, s: number, tone: number, key: string) {
  return (
    <g key={key} transform={place(x, y, a, s)}>
      {/* A short leaf stalk, then the blade. */}
      <path d="M0 0.2V-1.8" stroke={STEM} stroke-width={0.9} stroke-linecap="round" />
      <path d={LEAF} transform="translate(0 -1.6)" fill={k.tone(GREENS, tone, x + Math.sin((a * Math.PI) / 180) * 5 * s, y)} />
    </g>
  );
}

/** Upright square stems, spreading into a loose vase; a leaf pair at every node. */
const STEMS: readonly Cane[] = [
  { pts: [[0, 0], [0.2, -8], [0.3, -16], [0, -24], [-0.6, -32], [-1.2, -39]], born: 1, rate: 1.05 },
  { pts: [[1.4, 0], [3.6, -7.6], [6.6, -14.8], [9.8, -21.6], [12.8, -27.8]], born: 2.4, rate: 1.05 },
  { pts: [[-1.4, 0], [-3.6, -7.4], [-6.6, -14.4], [-9.8, -21], [-12.6, -27]], born: 3.1, rate: 1.05 },
  { pts: [[0.8, 0], [2, -8.4], [3.2, -16.8], [4.2, -25.2], [4.8, -33.4], [4.8, -41]], born: 4.9, rate: 1.25 },
  { pts: [[-0.8, 0], [-2.6, -8], [-4.6, -16], [-6.4, -23.8], [-8, -31.4]], born: 5.7, rate: 1.25 },
];

/** A flower spike on a stem tip: small white flowers, lilac-spotted, in whorls tapering upward. */
function flowerSpike(k: Kit, tip: Pt, a: number, open: number, key: number) {
  const r = (a * Math.PI) / 180;
  let white = '';
  let dots = '';
  for (let i = 0; i < 6; i++) {
    const kk = i / 5;
    const cx = tip[0] + Math.sin(r) * kk * 7.4;
    const cy = tip[1] - Math.cos(r) * kk * 7.4;
    const w = lerp(2.4, 1.1, kk);
    for (const s of [-1, 1]) {
      white += ell(cx + s * w * 0.55, cy, lerp(0.8, 1.15, open), lerp(0.7, 0.95, open));
      if (open > 0.5) dots += ell(cx + s * w * 0.55 + 0.2, cy + 0.2, 0.35);
    }
  }
  return (
    <g key={key}>
      <path d={white} fill={open > 0 ? k.lit(WHITE) : k.lit('#D6E2C8')} />
      {dots && <path d={dots} fill={LILAC} />}
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.8];
  const spread = Math.min(1, m.hw / 18);
  const size = lerp(0.9, 1.1, ramp(g.t, 2.5, 7.5));
  let stems = '';
  const leaves: JSX.Element[] = [];
  const tips: { tip: Pt; a: number }[] = [];
  STEMS.forEach((c, ci) => {
    const at = caneAt(c, g.t, base, spread * size, size);
    if (!at) return;
    stems += at.d;
    if (at.grown >= c.pts.length - 1.2) tips.push({ tip: at.tip, a: headingAt(c.pts, c.pts.length - 1) });
    for (const { i, at: [x, y], g: lg } of at.nodes) {
      const h = headingAt(c.pts, i);
      // Opposite pairs, the lower ones broad and level, the upper ones smaller and lifted.
      const spreadA = lerp(80, 52, i / c.pts.length);
      const s = lerp(0.35, 1, lg) * lerp(0.86, 0.56, i / c.pts.length) * size;
      leaves.push(leaf(k, x, y, h - spreadA, s, (i + ci) % 2, `${ci}-${i}-l`), leaf(k, x, y, h + spreadA, s, (i + ci + 1) % 2, `${ci}-${i}-r`));
    }
  });
  const budding = g.stage === 4 ? 1 + Math.round(g.progress) : 0;
  const n = budding || Math.min(tips.length, Math.ceil(g.blooms * 0.8));
  const spikes = tips.slice(0, n).map((t, j) => flowerSpike(k, t.tip, t.a, budding ? 0 : 1, j));
  return {
    back: (
      <g>
        <path d={stems} fill="none" stroke={STEM} stroke-width={1.35} stroke-linecap="round" />
        {leaves}
        {spikes}
      </g>
    ),
  };
}

export const catnip: SpeciesArt = {
  cutting: {
    stem: { color: STEM, w: 1.3 },
    draw: (g, k, [x, y]) => {
      const n1: Pt = [x, 56];
      const n2: Pt = [x + 0.2, 48.6];
      const top = g.stage ? 1 : lerp(0.7, 1, g.progress);
      return (
        <g>
          <path d={`M${x} ${y}L${n1[0]} ${n1[1]}L${n2[0]} ${n2[1]}L${n2[0]} ${n2[1] - 4}`} fill="none" stroke={STEM} stroke-width={1.3} stroke-linecap="round" />
          {leaf(k, n1[0], n1[1], -76, 0.95, 1, 'a')}
          {leaf(k, n1[0], n1[1], 76, 0.95, 0, 'b')}
          {leaf(k, n2[0], n2[1], -48, 0.7 * top, 0, 'c')}
          {leaf(k, n2[0], n2[1], 48, 0.7 * top, 1, 'd')}
        </g>
      );
    },
  },
  potted,
};
