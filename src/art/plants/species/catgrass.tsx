/**
 * Cat grass (young oats, Avena sativa): it starts as seed, not a cutting. Oat seeds soak in a shallow glass dish,
 * put out white roots and green tips, then are potted into a dense clump of soft blades. Left to grow, it sends up
 * nodding oat heads (the harvest).
 */
import type { JSX } from 'preact';
import { ell, type Pt } from '../geom';
import { SHADE, type Kit } from '../kit';
import { f, lerp, ramp, rng } from '../math';
import { GLASS } from '../vessels';
import type { Composed, Growth, Mouth, SpeciesArt } from '../types';

/** Blade greens, light to dark; blades on the shade side take the next darker one. */
const BLADE_INKS = ['#B9D59F', '#9CBF8A', '#86AE77', '#6F9A63'];
const SEED = '#D9C08E';
const STRAW = '#DCD8A4';
const STALK = '#A8BF8D';

/** One soft blade: a thin lens from a base at (x, y0) curving up to its tip. */
const blade = (x: number, y0: number, h: number, lean: number, w: number) =>
  `M${f(x - w)} ${f(y0)}Q${f(x + lean * 0.3)} ${f(y0 - h * 0.6)} ${f(x + lean)} ${f(y0 - h)}Q${f(x + lean * 0.2 + w * 0.4)} ${f(y0 - h * 0.5)} ${f(x + w)} ${f(y0)}Z`;

interface BladeSpec {
  u: number;
  h: number;
  lean: number;
  tone: number;
  birth: number;
}

/** A clump of blades, fixed once: position across the mouth (-1..1), height, lean, tone and when each comes up. */
const BLADES: BladeSpec[] = (() => {
  const r = rng(5);
  return Array.from({ length: 56 }, (_, i) => {
    // The first blades come up in the middle; later ones fill the whole mouth.
    const u = (r() * 2 - 1) * (0.55 + 0.45 * Math.min(1, i / 16));
    return { u, h: 0.6 + r() * 0.45, lean: (r() - 0.5) * 9 + u * 8, tone: Math.floor(r() * 3), birth: 1.6 + (i / 56) * 5.2 + r() * 0.3 };
  });
})();

/** Draws blades bucketed by ink, so the whole clump is four paths. */
function clump(k: Kit, specs: BladeSpec[], at: (s: BladeSpec) => { x: number; y: number; h: number; w: number } | null): JSX.Element {
  const buckets = ['', '', '', ''];
  for (const s of specs) {
    const b = at(s);
    if (!b) continue;
    const shaded = k.away === 0 ? s.tone === 2 : k.away * (b.x - 50) > 2;
    const tone = Math.min(3, s.tone + (shaded ? 1 : 0));
    buckets[tone] += blade(b.x, b.y, b.h, s.lean * (b.h / 30), b.w);
  }
  return (
    <g>
      {buckets.map((d, i) => d && <path key={i} d={d} fill={i === 0 ? k.lit(BLADE_INKS[0]!) : BLADE_INKS[i]} />)}
    </g>
  );
}

/** A nodding oat head: a fine stalk, then spikelets hanging on short threads. */
function oatHead(k: Kit, x: number, y: number, h: number, side: number, open: number, key: number) {
  const top: Pt = [x + side * 3, y - h];
  let threads = '';
  let spikelets = '';
  const n = Math.round(lerp(3, 7, open));
  for (let i = 0; i < n; i++) {
    const kk = i / Math.max(1, n - 1);
    const px = top[0] + side * (0.6 + kk * 3.4) * (i % 2 ? 1 : 0.5);
    const py = top[1] + 1 + kk * 7;
    const hx = px + side * lerp(1.6, 2.4, open) * (i % 2 ? 1 : -0.6);
    const hy = py + 2.4;
    threads += `M${f(px)} ${f(py)}Q${f(hx)} ${f(py - 0.6)} ${f(hx)} ${f(hy - 1)}`;
    spikelets += ell(hx, hy, 0.75, 1.6);
  }
  return (
    <g key={key}>
      <path d={`M${f(x)} ${f(y)}Q${f(x + side * 0.6)} ${f(y - h * 0.7)} ${f(top[0])} ${f(top[1])}${threads}`} fill="none" stroke={STALK} stroke-width={0.6} stroke-linecap="round" />
      <path d={spikelets} fill={k.lit(open > 0 ? STRAW : '#B8CE95')} />
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const tall = lerp(13, 36, ramp(g.t, 2, 6.8));
  const blades = clump(k, BLADES, (s) => {
    const gr = ramp(g.t, s.birth, s.birth + 0.8);
    if (gr <= 0) return null;
    return { x: 50 + s.u * (m.hw - 2.4), y: m.y + 1, h: tall * s.h * lerp(0.35, 1, gr), w: lerp(1, 1.5, ramp(g.t, 2, 6)) };
  });
  const heads = [0, 1, 2, 3, 4].map((i) => {
    const budding = g.stage === 4 && i < 1 + Math.round(g.progress);
    if (!budding && i >= g.blooms) return null;
    const x = 50 + [-4, 5, -10, 10, 1][i]! * (m.hw / 20);
    return oatHead(k, x, m.y + 1, tall + [8, 6, 3, 4, 10][i]!, i % 2 ? 1 : -1, budding ? 0 : 1, i);
  });
  return {
    back: (
      <g>
        {blades}
        {heads}
      </g>
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Stages 0–1: oat seeds soaking in a shallow glass dish                */
/* ------------------------------------------------------------------ */

const DISH = { x0: 27, x1: 73, top: 79, bottom: 95, water: 85.6 };
const DISH_D = `M${DISH.x0} ${DISH.top}H${DISH.x1}Q${DISH.x1 - 0.6} ${DISH.bottom - 1.6} ${DISH.x1 - 6} ${DISH.bottom}H${DISH.x0 + 6}Q${DISH.x0 + 0.6} ${DISH.bottom - 1.6} ${DISH.x0} ${DISH.top}Z`;
const DISH_WATER = `M${DISH.x0 + 1.4} ${DISH.water}H${DISH.x1 - 1.4}Q${DISH.x1 - 2} ${DISH.bottom - 2.4} ${DISH.x1 - 6.6} ${DISH.bottom - 1.2}H${DISH.x0 + 6.6}Q${DISH.x0 + 2} ${DISH.bottom - 2.4} ${DISH.x0 + 1.4} ${DISH.water}Z`;
const DISH_CRES = {
  left: `M${DISH.x1 - 3.4} ${DISH.top}H${DISH.x1}Q${DISH.x1 - 0.6} ${DISH.bottom - 1.6} ${DISH.x1 - 6} ${DISH.bottom}H${DISH.x1 - 8.4}Q${DISH.x1 - 3.8} ${DISH.bottom - 1.8} ${DISH.x1 - 3.4} ${DISH.top}Z`,
  right: `M${DISH.x0 + 3.4} ${DISH.top}H${DISH.x0}Q${DISH.x0 + 0.6} ${DISH.bottom - 1.6} ${DISH.x0 + 6} ${DISH.bottom}H${DISH.x0 + 8.4}Q${DISH.x0 + 3.8} ${DISH.bottom - 1.8} ${DISH.x0 + 3.4} ${DISH.top}Z`,
  top: `M${DISH.x0 + 3} ${DISH.bottom - 1.6}H${DISH.x1 - 3}Q${DISH.x1 - 4.4} ${DISH.bottom} ${DISH.x1 - 6} ${DISH.bottom}H${DISH.x0 + 6}Q${DISH.x0 + 4.4} ${DISH.bottom} ${DISH.x0 + 3} ${DISH.bottom - 1.6}Z`,
};

/** Seeds lying in the dish, [x, y offset]; the first ones sprout first. */
const SEEDS: [number, number][] = (() => {
  const r = rng(12);
  return Array.from({ length: 12 }, (_, i) => [DISH.x0 + 7 + ((i * 7.3) % 31) + r() * 1.5, (i % 3) * 0.9 - 0.6] as [number, number]);
})();

function start(g: Growth, k: Kit): Composed {
  const t = g.stage + g.progress;
  const y = DISH.water - 0.4;
  let roots = '';
  const seeds = SEEDS.map(([x, dy]) => `M${f(x - 2)} ${f(y + dy)}a2 1.1 0 1 0 4 0a2 1.1 0 1 0 -4 0Z`).join('');
  // White root tips first (late in stage 0), then roots reaching down through the water in stage 1.
  SEEDS.forEach(([x, dy], i) => {
    const gr = ramp(t, 0.45 + i * 0.05, 1.9 + i * 0.03);
    if (gr <= 0) return;
    const len = lerp(1, 8, gr);
    const s = i % 2 ? 1 : -1;
    const y0 = y + dy + 0.7;
    roots += `M${f(x)} ${f(y0)}q${f(s * len * 0.3)} ${f(len * 0.6)} ${f(s * len * 0.5)} ${f(Math.min(len, DISH.bottom - 1.8 - y0))}`;
    if (gr > 0.5) roots += `M${f(x + 0.4)} ${f(y0)}q${f(-s * len * 0.4)} ${f(len * 0.4)} ${f(-s * len * 0.8)} ${f(Math.min(len * 0.7, DISH.bottom - 1.8 - y0))}`;
  });
  const shoots = clump(
    k,
    SEEDS.map(([x, dy], i) => ({ u: x, h: 1 + dy * 0.01, lean: (i % 3) - 1, tone: i % 3, birth: 0.75 + i * 0.07 })),
    (s) => {
      const gr = ramp(t, s.birth, s.birth + 1);
      return gr > 0 ? { x: s.u, y: y - 0.2, h: lerp(1.6, 17, gr), w: 0.8 } : null;
    },
  );
  const lit = k.away < 0 ? DISH.x1 - 4.2 : DISH.x0 + 3.4;
  const vessel = (
    <g data-vessel="dish">
      <path d={DISH_D} fill={k.lit(GLASS.pane)} opacity={0.6} />
      <path d={DISH_WATER} fill={k.lit(GLASS.water)} opacity={0.75} />
      <path d={roots} fill="none" stroke={GLASS.root} stroke-width={0.6} stroke-linecap="round" />
      <path d={seeds} fill={k.lit(SEED)} />
      <path d={DISH_CRES[k.light.from]} class={SHADE} />
      <path d={`${ell(50, DISH.top, 23, 1.4)}${ell(50, DISH.top + 0.15, 21.8, 0.9)}`} fill-rule="evenodd" fill={k.lit(GLASS.wall)} opacity={0.9} />
      {k.away !== 0 && <path d={`M${f(lit)} ${DISH.top + 2.6}l0.8 7.4`} stroke={k.night ? '#FFF3E2' : '#FFFFFF'} stroke-width={1.2} stroke-linecap="round" opacity={0.85} />}
    </g>
  );
  return { back: shoots, vessel, foot: 17, pivot: [50, y], surface: 16, kind: 'dish' };
}

export const catgrass: SpeciesArt = { start, potted };
