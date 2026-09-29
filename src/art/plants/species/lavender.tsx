/**
 * Lavender (Lavandula angustifolia): a small shrub of upright stems set with narrow grey-green leaves in pairs. From
 * Budding, bare flower stalks rise above the foliage; each ends in a slim spike of purple whorls (the harvest).
 */
import type { JSX } from 'preact';
import { ell, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { caneAt, headingAt, type Cane } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#B2C4A6', '#8DA487');
const STEM = '#9AAE8C';
const FLOWER = ['#9C87CD', '#B4A1E0'];
const BUD = '#A9A7B8';

/** A narrow leaf as a lens from (x, y) along heading a (degrees), length L. */
function needle(x: number, y: number, a: number, L: number, w = 0.75): string {
  const r = (a * Math.PI) / 180;
  const dx = Math.sin(r);
  const dy = -Math.cos(r);
  const tx = x + dx * L;
  const ty = y + dy * L;
  const mx = x + dx * L * 0.5;
  const my = y + dy * L * 0.5;
  return `M${f(x)} ${f(y)}Q${f(mx - dy * w * 2)} ${f(my + dx * w * 2)} ${f(tx)} ${f(ty)}Q${f(mx + dy * w * 2)} ${f(my - dx * w * 2)} ${f(x)} ${f(y)}Z`;
}

/** Leafy shoots: upright stems with a pair of narrow leaves at every node. */
const SHOOTS: readonly Cane[] = [
  { pts: [[0, 0], [-0.4, -4], [-0.8, -8], [-1, -12], [-1, -16], [-0.8, -20]], born: 1, rate: 1.6 },
  { pts: [[1, 0], [2.4, -4], [4, -7.6], [5.8, -11], [7.6, -14]], born: 1.4, rate: 1.5 },
  { pts: [[-1, 0], [-2.6, -3.8], [-4.6, -7.2], [-6.8, -10.4], [-9, -13.2]], born: 1.8, rate: 1.5 },
  { pts: [[2, 0], [4.6, -3], [7.6, -5.6], [10.8, -7.8], [14, -9.4]], born: 3.1, rate: 1.4 },
  { pts: [[-2, 0], [-4.8, -3], [-8, -5.4], [-11.4, -7.4], [-14.6, -8.8]], born: 3.5, rate: 1.4 },
  { pts: [[0.6, 0], [1.2, -4.4], [2, -8.8], [2.8, -13.2], [3.4, -17.6], [3.6, -22]], born: 4.4, rate: 1.5 },
  { pts: [[-0.6, 0], [-1.8, -4.2], [-3.2, -8.4], [-4.6, -12.4], [-5.8, -16.4], [-6.6, -20]], born: 5.2, rate: 1.5 },
];

/** Flower stalks: [x offset at the base, lean, height above the soil]. One or two per bloom, in this order. */
const STALKS: readonly [number, number, number][] = [
  [0, 1, 40],
  [2, 8, 37],
  [-2, -8, 36],
  [1, 14, 32],
  [-1, -14, 31],
  [1, 4, 43],
  [-1, -3, 42],
  [2, 19, 27],
  [-2, -19, 26],
];

/** A spike: a stack of whorls tapering to the tip, `open` 0 (grey buds) to 1 (in flower). */
function spike(k: Kit, x: number, y: number, a: number, open: number, key: number) {
  const r = (a * Math.PI) / 180;
  const n = 7;
  const d = [0, 1].map(() => '') as [string, string];
  for (let i = 0; i < n; i++) {
    const kk = i / (n - 1);
    const px = x + Math.sin(r) * kk * 10 * k.bloom;
    const py = y - Math.cos(r) * kk * 10 * k.bloom;
    const rw = lerp(1.9, 0.9, kk) * lerp(0.75, 1, open) * k.bloom;
    d[i % 2] += ell(px, py, rw, lerp(1.4, 0.9, kk) * k.bloom);
  }
  return (
    <g key={key}>
      <path d={d[0]} fill={open > 0 ? k.lit(FLOWER[0]!) : BUD} />
      <path d={d[1]} fill={open > 0 ? k.lit(FLOWER[1]!) : k.lit('#C3C1CE')} />
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.8];
  const spread = Math.min(1, m.hw / 18);
  const size = lerp(0.85, 1.15, ramp(g.t, 2.5, 7));
  let stems = '';
  const leaves = ['', '', ''];
  SHOOTS.forEach((c, ci) => {
    const at = caneAt(c, g.t, base, spread * size, size);
    if (!at) return;
    stems += at.d;
    for (const { i, at: [x, y], g: lg } of at.nodes) {
      const h = headingAt(c.pts, i);
      const L = lerp(3, 7.4, lg) * (1 - i * 0.06);
      for (const s of [-1, 1]) {
        const shaded = k.away === 0 ? i === 1 : k.away * (x + s * 2 - 50) > 2;
        leaves[Math.min(2, ((i + ci + (s > 0 ? 1 : 0)) % 2) + (shaded ? 1 : 0))] += needle(x, y, h + s * 34, L);
      }
    }
  });
  // Flower stalks: buds at Budding, spikes in flower from Blooming, more of them as the plant matures.
  const budding = g.stage === 4 ? 2 + Math.round(g.progress * 2) : 0;
  const count = budding || Math.min(STALKS.length, Math.round(g.blooms * 1.5));
  let stalks = '';
  const spikes: JSX.Element[] = [];
  STALKS.slice(0, count).forEach(([dx, lean, h], j) => {
    const H = h * (budding ? 0.8 : 1) * lerp(0.9, 1.05, ramp(g.t, 5, 7.5));
    const top: Pt = [50 + (dx + lean) * spread, m.y - H + 10];
    stalks += `M${f(50 + dx)} ${f(m.y)}Q${f(50 + dx + lean * 0.2)} ${f(m.y - H * 0.5)} ${f(top[0])} ${f(top[1])}`;
    spikes.push(spike(k, top[0], top[1], lean * 0.9, budding ? 0 : 1, j));
  });
  return {
    back: (
      <g>
        <path d={stalks} fill="none" stroke={STEM} stroke-width={0.7} stroke-linecap="round" />
        {spikes}
        <path d={stems} fill="none" stroke={STEM} stroke-width={1.1} stroke-linecap="round" />
        {leaves.map((d, i) => d && <path key={i} d={d} fill={i === 0 ? k.lit(GREENS[0]) : GREENS[i]} />)}
      </g>
    ),
  };
}

export const lavender: SpeciesArt = {
  cutting: {
    stem: { color: '#A39A80', w: 1.2 },
    draw: (g, k, [x, y]) => {
      // A softwood cutting: a bare woody end in the water, a tuft of narrow leaves above.
      const tip: Pt = [x + 0.6, 45];
      const top = lerp(0.85, 1, g.stage ? 1 : g.progress);
      let leaves = '';
      for (let i = 0; i < 5; i++) {
        const ny = lerp(56, tip[1] + 3, i / 4);
        const nx = lerp(x, tip[0], i / 4);
        leaves += needle(nx, ny, -32 + (i % 2) * 4, lerp(8, 5, i / 4) * top) + needle(nx, ny, 32 - (i % 2) * 4, lerp(8, 5, i / 4) * top);
      }
      return (
        <g>
          <path d={`M${x} ${y}L${tip[0]} ${tip[1]}`} fill="none" stroke={STEM} stroke-width={1.1} stroke-linecap="round" />
          <path d={leaves} fill={k.lit(GREENS[0])} />
        </g>
      );
    },
  },
  potted,
};
