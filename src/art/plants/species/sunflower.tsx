/**
 * Dwarf sunflower (Helianthus annuus, a pot variety): a sturdy stem with broad, rough, heart-shaped leaves, and one
 * big head that turns to face the light (`light.from`), as young sunflowers do. A mature plant may carry a second,
 * smaller head on a side shoot.
 */
import type { JSX } from 'preact';
import { ell, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, place } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#8DB575', '#67925A');
const STEM = '#7FA56A';
const RAY = ['#F6CF55', '#EDB93C'];
const DISC = '#7B5236';
const DISC_CORE = '#5E3D2A';
const BRACT = '#7FA468';

/** A broad heart leaf, 14 long, base at the origin. (Its fine teeth are too small to draw at this size.) */
const LEAF = (() => {
  const n = 20;
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = 7.6 * Math.sin(Math.PI * t ** 0.7) * (1 - 0.25 * t);
    const y = -14 * t ** 1.15 + 1.6 * Math.sin(Math.PI * t) * (1 - t) ** 2;
    right.push([x, y]);
  }
  const left = right.slice(1, -1).reverse().map(([x, y]) => [-x, y] as Pt);
  return tidy(smooth([...right, ...left], true, 0.85));
})();
const VEINS = 'M0 -0.6L0 -12.6M0 -4.4L3.8 -7.6M0 -4.4L-3.8 -7.6M0 -8L2.6 -10.4M0 -8L-2.6 -10.4';

function leaf(k: Kit, x: number, y: number, a: number, s: number, tone: number, key: string | number) {
  const r = (a * Math.PI) / 180;
  return (
    <g key={key} transform={place(x, y, a, s)}>
      <path d={LEAF} fill={k.tone(GREENS, tone, x + Math.sin(r) * 7 * s, y)} />
      <path d={VEINS} fill="none" stroke={k.lit('#B4CF9C')} stroke-width={0.5} stroke-linecap="round" opacity={0.75} />
    </g>
  );
}

/** Ray petals round a head of radius 1 (drawn at radius 6.4): two alternating rings of pointed ellipses. */
const RAYS = [0, 1].map((ring) =>
  Array.from({ length: 13 }, (_, i) => {
    const a = ((i + ring * 0.5) / 13) * Math.PI * 2;
    const c: Pt = [Math.cos(a) * 6.6, Math.sin(a) * 6.6];
    const tip: Pt = [Math.cos(a) * 10.2, Math.sin(a) * 10.2];
    const base: Pt = [Math.cos(a) * 4, Math.sin(a) * 4];
    const n: Pt = [-Math.sin(a) * 1.5, Math.cos(a) * 1.5];
    return `M${f(base[0])} ${f(base[1])}Q${f(c[0] + n[0])} ${f(c[1] + n[1])} ${f(tip[0])} ${f(tip[1])}Q${f(c[0] - n[0])} ${f(c[1] - n[1])} ${f(base[0])} ${f(base[1])}Z`;
  }).join(''),
);
/** Seeds in the disc: a few flecks spiralling, so it reads as a sunflower even small. */
const SEEDS = Array.from({ length: 14 }, (_, i) => {
  const a = i * 2.4;
  const r = 1.2 + (i / 14) * 3.4;
  return ell(Math.cos(a) * r, Math.sin(a) * r, 0.42);
}).join('');

/**
 * The head at (x, y), `size` 1 about 20 across, turned toward the light: square on from above, in three-quarter
 * view from the side (squashed across, the green back of the head showing behind).
 */
function head(k: Kit, x: number, y: number, size: number, bud: number, open: number, key: string | number) {
  const turn = k.away === 0 ? 0 : -k.away;
  const sx = turn === 0 ? 0.92 : 0.6;
  const tilt = turn * -8;
  const back: Pt = [x - turn * 3.2 * size, y + 0.6 * size];
  const g = (d: string, fill: string, extra: JSX.Element | null = null) => (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(tilt)}) scale(${f(size * sx)} ${f(size * (turn === 0 ? 0.84 : 1))})`}>
      <path d={d} fill={fill} />
      {extra}
    </g>
  );
  const facing = turn < 0 ? 'left' : turn > 0 ? 'right' : 'front';
  if (open <= 0) {
    // A bud: a green, pointed cup of bracts, facing the light already.
    return (
      <g key={key} data-facing={facing}>
        <path d={ell(back[0], back[1], 4.6 * size * lerp(0.6, 1, bud), 5 * size * lerp(0.6, 1, bud))} fill={BRACT} />
        {g(`${ell(0, 0, lerp(3, 5.4, bud))}`, k.lit('#9BBE7E'), bud > 0.7 ? <path d={ell(0, 0, 2.6)} fill={k.lit(RAY[1]!)} /> : null)}
      </g>
    );
  }
  return (
    <g key={key} data-facing={facing}>
      {turn !== 0 && <path d={ell(back[0], back[1], 5.6 * size, 8.6 * size)} fill={BRACT} />}
      {g(RAYS[1]!, k.lit(RAY[1]!))}
      {g(RAYS[0]!, k.lit(RAY[0]!))}
      {g(ell(0, 0, 4.6 * lerp(0.8, 1, open)), DISC, <path d={SEEDS} fill={DISC_CORE} />)}
    </g>
  );
}

/** Leaves up the stem: [height up the stem 0..1, side, size, birth]. Big and spreading below, smaller above. */
const LEAVES: readonly [number, number, number, number][] = [
  [0.12, -1, 1.15, 2],
  [0.2, 1, 1.2, 2.3],
  [0.42, -1, 1.1, 3],
  [0.52, 1, 1.05, 3.5],
  [0.72, -1, 0.85, 4.3],
  [0.8, 1, 0.75, 5],
];

function potted(g: Growth, k: Kit, m: Mouth) {
  const H = lerp(10, 44, ramp(g.t, 2, 6.4)) + lerp(0, 3, ramp(g.t, 6.4, 7.6));
  const turn = k.away === 0 ? 0 : -k.away;
  const base: Pt = [50, m.y + 0.8];
  // The stem stands straight; its top leans a little toward the light.
  const top: Pt = [50 + turn * lerp(0, 3.4, ramp(g.t, 4, 6)), m.y - H];
  const stem = smooth([base, [50.2, m.y - H * 0.5], [lerp(50, top[0], 0.6), m.y - H * 0.85], top], false);
  const at = (k2: number): Pt => [lerp(50, top[0], k2 * k2), lerp(base[1], top[1], k2)];
  let petioles = '';
  const leaves = LEAVES.map(([h, side, s, birth], i) => {
    const gr = grown(g.t, birth, 1);
    if (gr <= 0) return null;
    const [x, y] = at(h);
    // Each leaf stands out from the stem on a short stalk and spreads almost level.
    const stalk = 3.4 * lerp(0.5, 1, gr);
    const lx = x + side * stalk;
    const ly = y - stalk * 0.5;
    petioles += `M${f(x)} ${f(y)}Q${f(x + side * stalk * 0.5)} ${f(y - stalk * 0.6)} ${f(lx)} ${f(ly)}`;
    return leaf(k, lx, ly, side * lerp(lerp(40, 76, gr), 58, h), s * lerp(0.35, 1, gr) * lerp(0.9, 1.05, ramp(g.t, 3, 7)), i % 2, i);
  });
  // Seedling leaves stay small at the foot of the stem.
  const cotyledons = (
    <g>
      <path d={ell(46.6, m.y - 2.4, 2.8, 1.4)} fill={k.lit(GREENS[0])} transform={`rotate(-18 46.6 ${f(m.y - 2.4)})`} />
      <path d={ell(53.4, m.y - 2.6, 2.8, 1.4)} fill={GREENS[1]} transform={`rotate(18 53.4 ${f(m.y - 2.6)})`} />
    </g>
  );
  const bud = ramp(g.t, 3.8, 5);
  const open = g.stage >= 5 ? lerp(0.6, 1, ramp(g.t, 5, 7)) : 0;
  // One head, facing the window: blooms make it bigger and more fully open.
  const b = g.stage >= 5 ? Math.min(1, g.blooms / 6) : 0;
  const size = lerp(0.72, 1.12, ramp(g.t, 4.5, 7.5)) * lerp(0.9, 1.1, b);
  const heads: JSX.Element[] = [];
  if (bud > 0) heads.push(head(k, top[0] + turn * 1.6, top[1] - 1, size, bud, open * lerp(0.85, 1, b), 'main'));
  // A well-bloomed plant carries one small side bud, still closed, on a shoot from a leaf axil.
  let sideStems = '';
  if (g.blooms >= 4) {
    const [x, y] = at(0.6);
    const hx = x + 9;
    const hy = y - 7;
    sideStems += `M${f(x)} ${f(y)}Q${f(x + 6)} ${f(y - 1.6)} ${f(hx)} ${f(hy + 2)}`;
    heads.push(head(k, hx, hy, size * 0.42, 0.55, 0, 'side'));
  }
  return {
    back: (
      <g>
        {g.t < 4.2 && cotyledons}
        <path d={stem} fill="none" stroke={STEM} stroke-width={lerp(1.6, 2.6, ramp(g.t, 2, 6))} stroke-linecap="round" />
        {sideStems && <path d={sideStems} fill="none" stroke={STEM} stroke-width={1.2} stroke-linecap="round" />}
        <path d={petioles} fill="none" stroke={STEM} stroke-width={1.1} stroke-linecap="round" />
        {leaves}
        {heads}
      </g>
    ),
  };
}

export const sunflower: SpeciesArt = {
  cutting: {
    // A sprouted seed, stood in water: two seed leaves, the striped husk still caught on one.
    stem: { color: STEM, w: 1.3 },
    draw: (g, k, [x, y]) => {
      const top: Pt = [x, 51];
      const open = g.stage ? 1 : lerp(0.75, 1, g.progress);
      const trueLeaves = g.stage ? grown(g.progress, 0.45, 0.55) : 0;
      return (
        <g>
          <path d={`M${x} ${y}Q${x - 0.6} 60 ${top[0]} ${top[1]}`} fill="none" stroke={STEM} stroke-width={1.3} stroke-linecap="round" />
          <path d={ell(top[0] - 4.4 * open, top[1] - 1.6, 4.6 * open, 2.1 * open)} transform={`rotate(-16 ${f(top[0] - 4.4 * open)} ${f(top[1] - 1.6)})`} fill={k.lit(GREENS[0])} />
          <path d={ell(top[0] + 4.4 * open, top[1] - 1.8, 4.6 * open, 2.1 * open)} transform={`rotate(16 ${f(top[0] + 4.4 * open)} ${f(top[1] - 1.8)})`} fill={GREENS[1]} />
          {g.stage === 0 && <path d={`${ell(top[0] + 7.6 * open, top[1] - 3, 2, 1.1)}`} transform={`rotate(20 ${f(top[0] + 7.6 * open)} ${f(top[1] - 3)})`} fill="#5B4A44" />}
          {trueLeaves > 0 && leaf(k, top[0], top[1] - 0.6, -18, 0.5 * trueLeaves, 0, 'a')}
          {trueLeaves > 0 && leaf(k, top[0], top[1] - 0.6, 20, 0.46 * trueLeaves, 1, 'b')}
        </g>
      );
    },
  },
  potted,
};
