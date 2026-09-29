/**
 * Catnip (Nepeta cataria): square upright stems with soft grey-green, heart-shaped leaves in opposite pairs, their
 * edges scalloped and tips pointed. From Blooming each stem ends in a dense spike of small white flowers spotted
 * lilac, in whorls (the harvest).
 */
import type { JSX } from 'preact';
import { bake, compose, ell, placeMatrix, smooth, tidy, type Pt } from '../geom';
import { InkRuns } from '../ink';
import { inks, type Kit } from '../kit';
import { caneAt, headingAt, type Cane } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#B4C3A2', '#93A884');
const STEM = '#9DB08A';
const CALYX = '#A7B893';
/** A spike in bud, before the flowers open: paler, tighter. */
const BUD = '#C3CFAE';
const WHITE = '#F1E8F4';
const LILAC = '#B99BD6';

/**
 * An ovate-cordate leaf, 11 long, its notched heart base at the origin and a pointed tip; the edge is cut into round
 * teeth (crenate). One memoised path, placed by transforms everywhere.
 */
const LEAF = (() => {
  const half: Pt[] = [
    [0, -0.9],
    [1.9, 0.5],
    [3.9, -0.4],
    [4.5, -2.8],
    [4, -5.4],
    [2.9, -7.8],
    [1.5, -9.8],
    [0, -11],
  ];
  // Each stretch of edge is one round tooth: a quadratic bulging out from the leaf's centre.
  const tooth = ([ax, ay]: Pt, [bx, by]: Pt, i: number) => {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const len = Math.hypot(mx, my + 4.6) || 1;
    const out = i === 0 ? 0.3 : 0.95;
    return `Q${f(mx + (mx / len) * out)} ${f(my + ((my + 4.6) / len) * out)} ${bx} ${by}`;
  };
  let d = 'M0 -0.9';
  for (let i = 0; i < half.length - 1; i++) d += tooth(half[i]!, half[i + 1]!, i);
  const left = half.map(([x, y]) => [-x, y] as Pt).reverse();
  for (let i = 0; i < left.length - 1; i++) d += tooth(left[i]!, left[i + 1]!, left.length - 2 - i);
  return `${d}Z`;
})();
const PETIOLE = 1.6;

/** A leaf on its short stalk: its ink, its outline baked in place, and the stalk (which joins the stems path). */
function leaf(k: Kit, x: number, y: number, a: number, s: number, tone: number) {
  const r = (a * Math.PI) / 180;
  const bx = x + Math.sin(r) * PETIOLE * s;
  const by = y - Math.cos(r) * PETIOLE * s;
  return { fill: k.tone(GREENS, tone, x + Math.sin(r) * 6 * s, y), d: bake(LEAF, placeMatrix(bx, by, a, s)), stalk: `M${f(x)} ${f(y)}L${f(bx)} ${f(by)}` };
}

/**
 * Upright square stems branching into a loose bush: three from the base, and two side shoots that branch from the
 * main stems' lower nodes. A leaf pair at every node, set wide so the stems show between them.
 */
const STEMS: readonly (Cane & { from?: [stem: number, node: number] })[] = [
  { pts: [[0, 0], [0.2, -8.4], [0.4, -16.6], [0.2, -24.6], [-0.4, -32.4], [-0.8, -39.6]], born: 1, rate: 1.3 },
  { pts: [[1.2, 0], [3.4, -8], [6, -15.8], [8.6, -23.2], [10.8, -30.2]], born: 2.2, rate: 1.2 },
  { pts: [[-1.2, 0], [-3.4, -7.8], [-6, -15.4], [-8.6, -22.6], [-10.6, -29.4]], born: 3.1, rate: 1.05 },
  { pts: [[0, 0], [4.4, -5.6], [7.6, -12], [9.8, -18.8]], born: 4.9, rate: 1.25, from: [0, 2] },
  { pts: [[0, 0], [-4.4, -5.4], [-7.4, -11.6], [-9.2, -18.2]], born: 5.7, rate: 1.25, from: [0, 1] },
];

/** Whorled flowers: at each tier, short two-lipped tubes pointing out to either side and one facing us, its lip spotted lilac. */
const TIER: readonly [x: number, a: number][] = [
  [-1, -70],
  [1, 70],
  [-0.4, -30],
  [0.5, 34],
];
const TUBE = tidy('M0 0.5C0.9 0.4 1.8 0.2 2.3 -0.1C2.7 -0.5 2.9 -0.1 2.7 0.4C2.9 0.8 2.6 1.2 2.2 1C1.6 0.8 0.8 0.8 0 0.9Z');
/** A flower facing us at the front of the whorl: a round lip with its lilac spot. */
const FACE = `${ell(0, 0, 1.15, 0.95)}`;
const FACE_SPOT = ell(0, 0.3, 0.4, 0.32);

/**
 * A dense terminal spike: a tapering grey-green column of calyces, set with four tiers of small white tubular flowers
 * spotted lilac on the lip, opening from the bottom tier up. Returned as path data (column, flowers, spots), so all
 * the spikes on a plant share three paths.
 */
function flowerSpike(tip: Pt, a: number, open: number, scale = 1) {
  const L = 8;
  const at = placeMatrix(tip[0], tip[1], a, scale);
  const col = bake(`M-1.3 0.6C-1.5 -2.6 -1.2 -5.6 -0.6 -${L}C-0.3 -${L + 0.8} 0.3 -${L + 0.8} 0.6 -${L}C1.2 -5.6 1.5 -2.6 1.3 0.6Z`, at);
  let white = '';
  let spots = '';
  for (let i = 0; i < (open > 0 ? 4 : 0); i++) {
    const y = -0.4 - i * 1.9;
    const w = lerp(1.2, 0.6, i / 3);
    const s = lerp(1.45, 0.95, i / 3);
    for (const [sx, ta] of TIER) {
      const side = sx < 0 ? -1 : 1;
      const m = compose(at, placeMatrix(sx * w, y - Math.abs(sx) * 0.3, -side * (90 - Math.abs(ta)), s, side * s));
      white += bake(TUBE, m);
    }
    const face = compose(at, placeMatrix(0, y - 0.2, 0, s * 0.9));
    white += bake(FACE, face);
    spots += bake(FACE_SPOT, face);
  }
  return { col, white, spots };
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.8];
  const spread = Math.min(1, m.hw / 18);
  const size = lerp(0.9, 1.08, ramp(g.t, 2.5, 7.5));
  let stems = '';
  let stalks = '';
  const leaves = new InkRuns();
  const tips: { tip: Pt; a: number }[] = [];
  const nodesOf: Pt[][] = [];
  STEMS.forEach((c, ci) => {
    const from = c.from ? nodesOf[c.from[0]]?.[c.from[1]] : base;
    const at = from && caneAt(c, g.t, from, spread * size, size);
    nodesOf.push(at ? c.pts.map(([x, y]) => [from![0] + x * spread * size, from![1] + y * size] as Pt) : []);
    if (!at) return;
    stems += at.d;
    if (at.grown >= c.pts.length - 1.2) tips.push({ tip: at.tip, a: headingAt(c.pts, c.pts.length - 1) });
    const n = c.pts.length;
    for (const { i, at: [x, y], g: lg } of at.nodes) {
      const h = headingAt(c.pts, i);
      // Opposite pairs set wide, the lower ones broad and level, the upper ones smaller and lifted.
      const spreadA = lerp(78, 50, i / n);
      const s = lerp(0.35, 1, lg) * lerp(0.8, 0.46, i / n) * size * (c.from ? 0.85 : 1);
      for (const [side, tone] of [
        [-1, (i + ci) % 2],
        [1, (i + ci + 1) % 2],
      ] as const) {
        const l = leaf(k, x, y, h + side * spreadA, s, tone);
        leaves.add(l.fill, l.d);
        stalks += l.stalk;
      }
    }
  });
  const budding = g.stage === 4 ? 1 + Math.round(g.progress) : 0;
  const n = budding || Math.min(tips.length, Math.ceil(g.blooms * 0.8));
  const spikes = tips.slice(0, n).map((t) => flowerSpike(t.tip, t.a, budding ? 0 : 1, k.bloom));
  const join = (key: 'col' | 'white' | 'spots') => spikes.map((sp) => sp[key]).join('');
  return {
    back: (
      <g>
        <path d={`${stems}${stalks}`} fill="none" stroke={STEM} stroke-width={1.1} stroke-linecap="round" />
        {leaves.paths()}
        {spikes.length > 0 && <path d={join('col')} fill={k.lit(budding ? BUD : CALYX)} />}
        {!budding && spikes.length > 0 && <path d={join('white')} fill={k.lit(WHITE)} />}
        {!budding && spikes.length > 0 && <path d={join('spots')} fill={LILAC} />}
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
      const pairs = [leaf(k, n1[0], n1[1], -76, 0.9, 1), leaf(k, n1[0], n1[1], 76, 0.9, 0), leaf(k, n2[0], n2[1], -48, 0.66 * top, 0), leaf(k, n2[0], n2[1], 48, 0.66 * top, 1)];
      return (
        <g>
          <path d={`M${x} ${y}L${n1[0]} ${n1[1]}L${n2[0]} ${n2[1]}L${n2[0]} ${n2[1] - 4}${pairs.map((l) => l.stalk).join('')}`} fill="none" stroke={STEM} stroke-width={1.2} stroke-linecap="round" />
          {pairs.map((l, i) => (
            <path key={i} d={l.d} fill={l.fill} />
          ))}
        </g>
      );
    },
  },
  potted,
};
