/**
 * Snake plant (Dracaena trifasciata 'Laurentii'): stiff upright sword leaves, dark green crossed with grey-green
 * bands and edged in yellow. Given time it sends up a slim spike of cream, star-shaped flowers.
 */
import { smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, place } from '../leaves';
import { f, lerp, mix, ramp, rng } from '../math';
import { GLASS } from '../vessels';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#6E9A66', '#557F52');
const EDGE = '#E4D489';
const BAND = '#A7C29A';
const SPIKE = '#C7C9A0';
const STAR = '#FBF3DC';

/** A unit sword leaf, 40 tall and 2.4 half-wide, drawn by its half-width profile; scaled per leaf. */
const H = 40;
const PROFILE: [number, number][] = [
  [0, 1.7],
  [0.12, 2.25],
  [0.35, 2.45],
  [0.6, 2.2],
  [0.8, 1.55],
  [0.93, 0.7],
  [1, 0],
];
const outline = (inset: number) => {
  // The inner leaf is narrower by the yellow margin and stops a little short of the tip.
  const right: Pt[] = PROFILE.map(([k, w]) => [Math.max(0, w - inset * (1 - k * 0.6)), -k * H * (1 - inset * 0.012)]);
  const left: Pt[] = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
  return tidy(smooth([...right, ...left], true, 0.8));
};
const SWORD = outline(0);
const SWORD_INNER = outline(0.62);
/** Wavy grey-green bands across the leaf, as thin chevrons that stay inside the inner leaf. */
const BANDS = (() => {
  const r = rng(4);
  let d = '';
  for (let k = 0.06; k < 0.86; k += 0.085 + r() * 0.03) {
    const i = PROFILE.findIndex(([pk]) => pk > k);
    const [k0, w0] = PROFILE[i - 1]!;
    const [k1, w1] = PROFILE[i]!;
    const w = (w0 + ((w1 - w0) * (k - k0)) / (k1 - k0) - 0.75) * 0.95;
    const y = -k * H;
    const dip = 1 + r() * 0.8;
    d += `M${f(-w)} ${f(y)}Q0 ${f(y - dip * 1.6)} ${f(w)} ${f(y)}Q0 ${f(y - dip * 0.9)} ${f(-w)} ${f(y)}Z`;
  }
  return d;
})();

function sword(k: Kit, x: number, y: number, a: number, h: number, w: number, tone: number, key: string | number) {
  return (
    <g key={key} transform={place(x, y, a, h / H, w)}>
      <path d={SWORD} fill={k.lit(EDGE)} />
      <path d={SWORD_INNER} fill={k.tone(GREENS, tone, x + Math.sin((a * Math.PI) / 180) * h * 0.4, y)} />
      <path d={BANDS} fill={k.lit(BAND)} opacity={0.85} />
    </g>
  );
}

/** Leaves: [x offset, lean, full height, width scale, birth]. Each new leaf comes up from the middle of the fan. */
const LEAVES: readonly [number, number, number, number, number][] = [
  [-2.4, -9, 22, 0.95, 1.8],
  [2.6, 10, 25, 1, 1.9],
  [0, 1, 32, 1.05, 2.5],
  [-6, -17, 26, 0.95, 3],
  [5.8, 16, 29, 1, 3.4],
  [-3, -5, 40, 1.08, 3.9],
  [3.4, 6, 44, 1.1, 4.4],
  [-9, -24, 24, 0.9, 5],
  [9.2, 22, 27, 0.95, 5.5],
  [-6, -12, 36, 1, 6.1],
  [7, 13, 38, 1, 6.6],
  [0.6, -1, 48, 1.1, 7.1],
];

/** A slim flower spike: a bare stalk, then little cream stars clustered along the top half. */
function spike(k: Kit, x: number, y: number, h: number, lean: number, open: number, key: number) {
  const top: Pt = [x + lean, y - h];
  const stars: string[] = [];
  const n = Math.round(lerp(4, 11, open));
  for (let i = 0; i < n; i++) {
    const kk = 0.42 + (i / Math.max(1, n - 1)) * 0.56;
    const px = x + lean * kk + (i % 2 ? 1.4 : -1.4);
    const py = y - h * kk;
    const r = lerp(0.7, 1.4, open) * (1 - kk * 0.3);
    stars.push(`M${f(px)} ${f(py - r)}L${f(px + r * 0.3)} ${f(py - r * 0.3)}L${f(px + r)} ${f(py)}L${f(px + r * 0.3)} ${f(py + r * 0.3)}L${f(px)} ${f(py + r)}L${f(px - r * 0.3)} ${f(py + r * 0.3)}L${f(px - r)} ${f(py)}L${f(px - r * 0.3)} ${f(py - r * 0.3)}Z`);
  }
  return (
    <g key={key}>
      <path d={`M${f(x)} ${f(y)}Q${f(x + lean * 0.3)} ${f(y - h * 0.6)} ${f(top[0])} ${f(top[1])}`} fill="none" stroke={SPIKE} stroke-width={0.9} stroke-linecap="round" />
      <path d={stars.join('')} fill={k.lit(STAR)} />
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const spread = Math.min(1, m.hw / 18);
  const mature = lerp(0.9, 1.05, ramp(g.t, 3, 7.5));
  const leaves = LEAVES.map(([dx, lean, h, w, birth], i) => {
    const gr = grown(g.t, birth, 1.1);
    if (gr <= 0) return null;
    return sword(k, 50 + dx * spread, m.y + 1.2, lean, h * lerp(0.3, 1, gr) * mature, w * lerp(0.75, 1, gr), i % 2, i);
  });
  const spikes = [0, 1].map((j) => {
    if (j === 0 && g.blooms < 1 && !(g.stage === 4 && g.progress > 0.5)) return null;
    if (j === 1 && g.blooms < 4) return null;
    const open = g.stage === 4 ? 0 : Math.min(1, g.blooms / 3);
    return spike(k, 50 + (j ? -4.6 : 4.2) * spread, m.y + 1, j ? 38 : 45, j ? -4 : 4, open, j);
  });
  return {
    back: (
      <g>
        {leaves}
        {spikes}
      </g>
    ),
  };
}

export const snakeplant: SpeciesArt = {
  cutting: {
    // A leaf cutting: the lower end of the leaf stands in the water, where it roots.
    stem: { color: '#6E9A66', w: 3.6 },
    below: (k, x, water, node) => (
      <g>
        <path d={`M${f(x - 2.3)} ${f(water)}H${f(x + 2.3)}L${f(x + 1.9)} ${f(node)}Q${f(x)} ${f(node + 1)} ${f(x - 1.9)} ${f(node)}Z`} fill={mix(EDGE, GLASS.water, 0.35)} />
        <path d={`M${f(x - 1.6)} ${f(water)}H${f(x + 1.6)}L${f(x + 1.3)} ${f(node - 0.4)}Q${f(x)} ${f(node + 0.3)} ${f(x - 1.3)} ${f(node - 0.4)}Z`} fill={mix(k.lit(GREENS[0]), GLASS.water, 0.35)} />
      </g>
    ),
    draw: (g, k, [x, y]) => <g>{sword(k, x, y + 1, 2, lerp(26, 29, g.stage > 0 ? 1 : g.progress), 1.15, 0, 'cut')}</g>,
  },
  potted,
};
