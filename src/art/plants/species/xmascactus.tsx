/**
 * Christmas cactus (Schlumbergera): no leaves, only flat green stem segments joined end to end, each with a pair
 * of small teeth on its edges. The chains arch out as they lengthen, and in winter each outer tip hangs a pink,
 * many-layered flower with its stamens held out.
 */
import type { JSX } from 'preact';
import { ell, profile, smooth, tidy, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, toward } from '../leaves';
import { f, lerp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#86B479', '#62905B');
const TUBE = '#F6C2D2';
const PETALS = ['#EE86AB', '#F4A7C2'];
const STAMEN = '#F7E1E8';

/** One flat segment, oblong: narrow where it joins, two blunt teeth down each edge, a notch at the tip. */
const SEG_LEN = 8.4;
const SEGMENT = (() => {
  const pts = profile(SEG_LEN, [
    [0, 0.8],
    [0.18, 1.6],
    [0.38, 2.3],
    [0.5, 2.75],
    [0.57, 2.3],
    [0.74, 2.4],
    [0.86, 2.8],
    [0.93, 2.3],
    [1, 1.3],
  ]);
  // The notch at the tip, where the next segment grows from.
  const notch: Pt = [0, -SEG_LEN + 0.7];
  const i = pts.findIndex(([x, y]) => x < 0 && Math.abs(y + SEG_LEN) < 0.01);
  return tidy(smooth([...pts.slice(0, i), notch, ...pts.slice(i)], true, 0.45));
})();

/** Chains of segments from the crown: [heading of each segment in turn], and when the chain starts. */
const CHAINS: readonly { a: readonly number[]; born: number; front?: boolean }[] = [
  { a: [-6, -12, -20, -26], born: 1.4 },
  { a: [12, 20, 30, 38], born: 1.7 },
  { a: [-38, -52, -64, -74], born: 2.4 },
  { a: [40, 54, 66, 76], born: 2.9 },
  { a: [0, 6, 12, 18, 24], born: 3.6 },
  { a: [-22, -32, -44, -54], born: 4.2 },
  { a: [24, 34, 46, 58], born: 4.8 },
  { a: [-64, -80, -94, -104], born: 5.4, front: true },
  { a: [66, 82, 96, 106], born: 6, front: true },
  { a: [-12, -2, 8], born: 6.6 },
];

/** A flower hanging from a tip: a pale tube, two flared layers of petals, stamens held out beyond. */
function flower(k: Kit, at: Pt, a: number, open: number, key: number) {
  const s = lerp(0.5, 1, open);
  return (
    <g key={key} transform={`translate(${f(at[0])} ${f(at[1])}) rotate(${f(a)}) scale(${f(s)})`}>
      <path d="M-1 0C-1.2 -2 -0.9 -4 0 -5.6C0.9 -4 1.2 -2 1 0Z" fill={k.lit(TUBE)} />
      {open > 0.4 ? (
        <>
          <path d="M0 -4.6C-2.4 -6 -4.4 -6.4 -5.6 -5.6C-4.6 -7.4 -2.6 -8.6 0 -8.6C2.6 -8.6 4.6 -7.4 5.6 -5.6C4.4 -6.4 2.4 -6 0 -4.6Z" fill={k.lit(PETALS[1]!)} />
          <path d="M0 -6C-1.8 -7.6 -3.8 -8.6 -5 -8C-3.8 -10 -2 -11.2 0 -11.2C2 -11.2 3.8 -10 5 -8C3.8 -8.6 1.8 -7.6 0 -6Z" fill={k.lit(PETALS[0]!)} />
          <path d="M0 -8.6L-0.6 -13M0 -8.6L0.6 -13.2M0 -8.6L0 -13.6" stroke={STAMEN} stroke-width={0.35} stroke-linecap="round" />
          <path d={`${ell(-0.6, -13.1, 0.35)}${ell(0.6, -13.3, 0.35)}${ell(0, -13.7, 0.35)}`} fill="#E0567F" />
        </>
      ) : (
        <path d="M0 -5C-1.4 -6.4 -1.4 -8.6 0 -9.6C1.4 -8.6 1.4 -6.4 0 -5Z" fill={k.lit(PETALS[0]!)} />
      )}
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const spread = Math.min(1, m.hw / 18);
  const scale = lerp(0.88, 1.06, grown(g.t, 3, 4));
  const back: JSX.Element[] = [];
  const front: JSX.Element[] = [];
  const tips: { at: Pt; a: number }[] = [];
  CHAINS.forEach((c, ci) => {
    let p: Pt = [50 + ((ci % 5) - 2) * 1.6 * spread, m.y + 0.6];
    let last = 0;
    c.a.forEach((a, si) => {
      const gr = grown(g.t, c.born + si * 0.75, 0.8);
      if (gr <= 0) return;
      const len = SEG_LEN * scale * lerp(0.45, 1, gr);
      const heading = a * lerp(0.9, 1, spread);
      const el = (
        <path key={`${ci}-${si}`} d={SEGMENT} transform={`translate(${f(p[0])} ${f(p[1])}) rotate(${f(heading)}) scale(${f(scale * lerp(0.5, 1, gr))} ${f(len / SEG_LEN)})`} fill={k.tone(GREENS, (ci + si) % 2, p[0] + Math.sin((heading * Math.PI) / 180) * 4, p[1])} />
      );
      (c.front && si > 0 ? front : back).push(el);
      p = toward(p, heading, len - 0.7);
      last = gr;
      if (si === c.a.length - 1 && last > 0.8) tips.push({ at: p, a: heading });
    });
  });
  // Outer tips flower first: sort by how far out they lean.
  tips.sort((a, b) => Math.abs(b.a) - Math.abs(a.a));
  const budding = g.stage === 4 ? 2 + Math.round(g.progress * 2) : 0;
  const n = budding || g.blooms;
  const flowers = tips.slice(0, n).map((tp, j) => flower(k, tp.at, tp.a + (tp.a > 0 ? 34 : -34), budding ? 0.3 : 1, j));
  return {
    back: <g>{back}</g>,
    front: (
      <g>
        {front}
        {flowers}
      </g>
    ),
  };
}

export const xmascactus: SpeciesArt = {
  cutting: {
    stem: { color: '#86B479', w: 2.4 },
    draw: (g, k, [x, y]) => {
      // A cutting of three segments; the lowest stands in the water.
      const extra = g.stage ? grown(g.progress, 0.5, 0.5) : 0;
      const segs: [number, number][] = [
        [2, 1],
        [-10, lerp(0.85, 1, g.stage ? 1 : g.progress)],
        [8, 1],
        [22, extra],
      ];
      let p: Pt = [x, y + 2];
      return (
        <g>
          {segs.map(([a, s], i) => {
            if (s <= 0) return null;
            const el = <path key={i} d={SEGMENT} transform={`translate(${f(p[0])} ${f(p[1])}) rotate(${a}) scale(${f(1.1 * s)} ${f(1.3 * s)})`} fill={k.tone(GREENS, i % 2, p[0], p[1])} />;
            p = toward(p, a, SEG_LEN * 1.3 * s - 0.8);
            return el;
          })}
        </g>
      );
    },
  },
  potted,
};
