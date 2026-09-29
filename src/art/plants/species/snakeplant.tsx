/**
 * Snake plant (Dracaena trifasciata 'Laurentii'): stiff upright sword leaves, dark green crossed with grey-green
 * bands and edged in yellow. Given time it sends up a slim spike of cream, tubular flowers with curled-back tips, clustered at nodes up the stalk.
 */
import { bake, ell, placeMatrix, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, place } from '../leaves';
import { f, lerp, mix, ramp, rng } from '../math';
import { GLASS } from '../vessels';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#6E9A66', '#557F52');
const EDGE = '#E4D489';
const BAND = '#A7C29A';
const SPIKE = '#C7C9A0';
const STAR = '#F6EBCF';
/** The same cream, one step toward the lavender shade, for the away side of each tube. */
const STAR_SHADE = '#E3D6C2';
const BUD_GREEN = '#DCE0B4';

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

/**
 * One Sansevieria flower, drawn at the origin hanging off the stalk to the right: a slim cream tube (its base at the
 * stalk) whose tip splits into narrow tepals curling back. About 2.6 long.
 */
const FLOWER = tidy('M0 0.25C0.7 0.1 1.5 -0.2 2.1 -0.35C2.4 -0.7 2.7 -1.05 3 -0.95C2.8 -0.7 2.55 -0.5 2.35 -0.3C2.75 -0.25 3.15 -0.05 3.2 0.3C2.85 0.15 2.5 0.1 2.2 0.1C2.45 0.35 2.6 0.7 2.45 0.95C2.25 0.65 2 0.45 1.8 0.35C1.2 0.4 0.6 0.5 0 0.4Z');
/** The shaded underside of the tube, on the side away from the light. */
const FLOWER_SHADE = tidy('M0 0.4C0.6 0.5 1.2 0.4 1.8 0.35C1.2 0.3 0.6 0.3 0 0.3Z');

/**
 * A slim flower spike: a bare stalk, then clusters of three to five tubular cream flowers at nodes up its top 60%,
 * angled 30–50° up and out from the stalk and opening from the bottom, with small green-cream buds above.
 */
function spike(k: Kit, x: number, y: number, h: number, lean: number, open: number, key: number) {
  const top: Pt = [x + lean, y - h];
  const nodes = open > 0 ? Math.round(lerp(3, 5, open)) : 0;
  // Every flower on the spike is baked into three paths: lit tubes, shaded tubes, and the undersides.
  let lit = '';
  let shade = '';
  let under = '';
  let buds = '';
  const at = (kk: number): Pt => [x + lean * kk * kk, y - h * kk];
  // Buds crowd the tip: pairs of little lenses pressed to the stalk, smaller toward the top.
  for (let i = 0; i < 4; i++) {
    const [px, py] = at(lerp(nodes ? 0.84 : 0.6, 0.97, i / 3));
    const r = lerp(0.8, 0.45, i / 3);
    buds += `${ell(px - 0.75, py, r * 1.1, r * 0.55)}${ell(px + 0.75, py - 0.6, r * 1.1, r * 0.55)}`;
  }
  // Open flowers: a cluster at each node, fanning out from one point on both sides of the stalk.
  const FAN: readonly [side: number, angle: number, len: number][] = [
    [1, 34, 1],
    [-1, 40, 0.95],
    [1, 58, 0.85],
    [-1, 62, 0.9],
    [1, 16, 0.8],
  ];
  for (let i = 0; i < nodes; i++) {
    const kk = lerp(0.44, 0.8, nodes > 1 ? i / (nodes - 1) : 0);
    const [px, py] = at(kk);
    const count = 3 + ((i + key) % 3);
    const s = lerp(1.35, 1.1, kk) * lerp(0.8, 1, open);
    FAN.slice(0, count).forEach(([side, a, len], j) => {
      const shaded = k.away !== 0 && side === k.away;
      const m = placeMatrix(px, py, -side * a, s * len, side * s * len);
      if (shaded) shade += bake(FLOWER, m);
      else {
        lit += bake(FLOWER, m);
        under += bake(FLOWER_SHADE, m);
      }
    });
  }
  return (
    <g key={key}>
      <path d={`M${f(x)} ${f(y)}Q${f(x + lean * 0.3)} ${f(y - h * 0.6)} ${f(top[0])} ${f(top[1])}`} fill="none" stroke={SPIKE} stroke-width={0.9} stroke-linecap="round" />
      {lit && <path d={lit} fill={k.lit(STAR)} />}
      {(shade || under) && <path d={`${shade}${under}`} fill={STAR_SHADE} />}
      {buds && <path d={buds} fill={k.lit(BUD_GREEN)} />}
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
