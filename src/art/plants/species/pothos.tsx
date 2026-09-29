/**
 * Golden pothos (Epipremnum aureum): heart-shaped leaves streaked with gold, carried at the nodes of arching vines,
 * and later vines that trail over the rim. It rarely flowers, so its peak is the trailing vine and a new leaf
 * unrolling at the crown.
 */
import { smooth, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { caneAt, grown, headingAt, partial, place, stemD, Stems, type Cane } from '../leaves';
import { clamp01, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#AECB92', '#86AE77');
const GOLD = '#EEE6B0';
const STEM = '#7FA46B';
const NEW_LEAF = '#C8DC9F';

/** Heart leaf, 23 long, base notch at the origin, tip up. */
const HEART = 'M0 -1C-3 2 -10 1 -10.5 -6C-11 -13 -5 -19 0 -23C5 -19 11 -13 10.5 -6C10 1 3 2 0 -1Z';
/** Golden variegation: a broad streak on one half, or fine ones on both. */
const STREAKS = ['M-1.5 -4C-5.4 -8 -4.4 -13.4 -1 -18.6C0 -12.4 1 -8 -1.5 -4Z', 'M2.2 -6C4.8 -9 5.6 -13 3.6 -17C3 -13 2.8 -9.4 2.2 -6ZM-1.4 -3.6C-5 -6.6 -6.4 -9.6 -6.2 -12.4C-3.8 -9.8 -2.4 -7 -1.4 -3.6Z'];
const LEN = 23;

/** A pothos leaf of length `len` at (x, y), pointing `a` degrees clockwise from up. `streak` -1 is plain green. */
export function pothosLeaf(k: Kit, x: number, y: number, a: number, len: number, tone: number, streak: number, key?: string | number) {
  const r = (a * Math.PI) / 180;
  return (
    <g key={key} transform={place(x, y, a, len / LEN)}>
      <path d={HEART} fill={k.tone(GREENS, tone, x + Math.sin(r) * len * 0.5, y - Math.cos(r) * len * 0.5)} />
      {streak >= 0 && <path d={STREAKS[streak % 2]} fill={k.lit(GOLD)} opacity={0.92} />}
    </g>
  );
}

/** The crown: stems rising from the soil in a loose fan, a leaf at every node, alternating sides. */
const CROWN: readonly Cane[] = [
  { pts: [[0.6, 0], [0.9, -8], [1, -16], [0.6, -24], [-0.4, -32]], born: 1, rate: 0.95 },
  { pts: [[-0.8, 0], [-3.2, -7.4], [-6.4, -14.2], [-9.8, -20.6], [-13.4, -26.4]], born: 1.3, rate: 0.95 },
  { pts: [[1.6, 0], [4.4, -7], [7.6, -13.6], [11.2, -19.8], [15, -25.4]], born: 1.7, rate: 0.95 },
  { pts: [[-1.6, 0], [-5.6, -5.4], [-10.4, -10], [-15.6, -13.6], [-21, -16]], born: 3.1, rate: 1 },
  { pts: [[2.2, 0], [6.4, -5.2], [11.4, -9.6], [16.6, -13], [22, -15.4]], born: 3.7, rate: 1 },
  { pts: [[-0.4, 0], [-1.6, -9], [-3, -18], [-4, -27], [-4.4, -35], [-3.6, -42]], born: 5.3, rate: 1.1 },
  { pts: [[1, 0], [3, -8.6], [5.6, -17], [8, -25.4], [10.4, -33]], born: 6.2, rate: 1.2 },
];

/** A vine hanging from the rim on side `s`: the path it follows when fully grown. */
function vinePath(m: Mouth, s: 1 | -1, drop: number): Pt[] {
  const pts: Pt[] = [
    [50 + s * (m.hw - 5), m.y - 0.6],
    [50 + s * (m.hw + 1.4), m.y - 2.2],
    [50 + s * (m.hw + 3.6), m.y + 3.4],
  ];
  for (let i = 1; i <= 7; i++) pts.push([50 + s * (m.hw + 3.6 + i * 1.1 + Math.sin(i * 1.3) * 1.2), m.y + 3.4 + i * drop]);
  return pts;
}

function trailingVine(k: Kit, m: Mouth, s: 1 | -1, segs: number, seed: number) {
  if (segs <= 0) return null;
  // Hang toward the sill, never off the canvas: the step shortens on low-slung pots.
  const drop = Math.min(4.4, (88 - (m.y + 3.4)) / 7);
  const pts = partial(vinePath(m, s, drop), segs);
  const leaves = pts.slice(2).map(([x, y], i) => {
    const side = (i + seed) % 2 ? 1 : -1;
    const g = clamp01(segs - (i + 2) + 0.6);
    return pothosLeaf(k, x + side * 0.6, y, s * (150 - i * 5) + side * s * 34, lerp(4, 9 - i * 0.3, g), (i + seed) % 2, (i + seed) % 3 === 1 ? -1 : i % 2, `v${s}${i}`);
  });
  return (
    <g>
      <Stems d={smooth(pts, false)} color={STEM} w={1.2} />
      {leaves}
    </g>
  );
}

/** A new leaf unrolling at the crown: a pale cone that opens as it goes. */
function unfurl(k: Kit, base: Pt, t: number) {
  const g = grown(t, 4, 0.8);
  if (g <= 0 || t >= 5.4) return null;
  const top: Pt = [base[0] + 1.4, base[1] - lerp(20, 31, g)];
  return (
    <g>
      <Stems d={stemD(base, top, 1)} color={STEM} w={1.2} />
      <path transform={place(top[0], top[1], 6, lerp(0.55, 1.1, g))} d="M0 1C-1.8 -2 -2 -7 0 -11.5C2 -7 1.8 -2 0 1Z" fill={k.lit(NEW_LEAF)} />
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.8];
  // The crown gathers into the mouth of a small pot rather than spilling past it.
  const spread = Math.min(1, m.hw / 18);
  let stems = '';
  const leaves = CROWN.flatMap((c, ci) => {
    const at = caneAt(c, g.t, base, spread);
    if (!at) return [];
    stems += at.d;
    const pts = c.pts;
    return at.nodes.map(({ i, at: [x, y], g: lg }) => {
      const side = (i + ci) % 2 ? 1 : -1;
      const a = Math.max(-84, Math.min(84, headingAt(pts, i) * 1.15 + side * 36));
      // A mature plant grows bigger leaves, so the crown fills out as well as up.
      const len = 11.5 * lerp(0.4, 1, lg) * lerp(0.92, 1.1, ramp(g.t, 3, 7.5));
      return pothosLeaf(k, x, y, a, len, (i + ci) % 2, (i + ci) % 3 === 2 ? -1 : (i + ci) % 2, `${ci}-${i}`);
    });
  });
  const bonus = g.blooms * 0.45;
  return {
    back: (
      <g>
        <Stems d={stems} color={STEM} w={1.3} />
        {unfurl(k, base, g.t)}
        {leaves}
      </g>
    ),
    front: (
      <g>
        {trailingVine(k, m, -1, (g.t - 3.8) * 1.5 + bonus, 0)}
        {trailingVine(k, m, 1, (g.t - 4.4) * 1.4 + bonus * 0.8, 1)}
      </g>
    ),
  };
}

export const pothos: SpeciesArt = {
  cutting: {
    stem: { color: STEM, w: 1.3 },
    draw: (g, k, [x, y]) => {
      const node: Pt = [x - 0.4, 47.6];
      const second = lerp(0.72, 1, g.stage > 0 ? 1 : g.progress);
      const third = g.stage > 0 ? grown(g.progress, 0.55, 0.45) : 0;
      return (
        <g>
          <Stems d={`M${x} ${y}C${x} 60 ${x - 0.6} 54 ${node[0]} ${node[1]}`} color={STEM} w={1.3} />
          {pothosLeaf(k, node[0], node[1], -26, 12, 0, 0, 'a')}
          {pothosLeaf(k, x - 0.2, 56, 54, 10.5 * second, 1, 1, 'b')}
          {third > 0 && pothosLeaf(k, node[0] + 0.4, node[1] - 0.2, 22, 8 * third, 0, -1, 'c')}
        </g>
      );
    },
  },
  potted,
};
