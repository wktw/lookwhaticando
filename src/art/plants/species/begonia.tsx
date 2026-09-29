/**
 * Polka-dot begonia (Begonia maculata): a cane begonia. Upright jointed canes carry long, lopsided angel-wing leaves,
 * olive green with silver-white spots and a red underside that shows where a leaf turns. It flowers in hanging
 * clusters of pale pink.
 */
import type { Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { caneAt, headingAt, place, Stems, type Cane } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#93B282', '#728F63');
const SPOTS = '#F6F2E9';
const UNDER = '#DE8FA2';
const CANE = '#93AE7E';
const NODE = '#C99AA6';

/** An angel-wing blade, 34 long: the tip swept to one side. */
const BLADE = 'M0 0C-6.4 -0.6 -10.4 -5.6 -10 -12.6C-9.6 -19.8 -4.6 -27.6 2.2 -34C3.4 -27.4 6.6 -20 6.8 -12.4C7 -5.8 4.4 -1 0 0Z';
/** The red underside, showing along the swept edge where the leaf turns. */
const UNDERSIDE = 'M0 0C-6.4 -0.6 -10.4 -5.6 -10 -12.6C-9.6 -19.8 -4.6 -27.6 2.2 -34C-1.8 -28 -6.8 -20.4 -7.4 -12.8C-7.8 -6.8 -4.8 -1.8 0 0Z';
/** Silver spots, one path. */
const SPOT_D = (() => {
  const spots: [number, number, number][] = [
    [-4.4, -8.4, 1.2],
    [-1.4, -14.6, 1.1],
    [-5, -18.8, 1],
    [2.4, -8, 1],
    [2, -21.4, 0.9],
    [-0.6, -26.8, 0.8],
    [3.6, -14.8, 1],
    [-7, -12.6, 0.9],
    [-2.2, -4.2, 0.85],
    [-2.8, -22.6, 0.8],
    [0.6, -10.6, 0.7],
    [5.2, -9.6, 0.6],
  ];
  return spots.map(([x, y, r]) => `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${f(r * 2)} 0a${r} ${r} 0 1 0 ${f(-r * 2)} 0Z`).join('');
})();
const LEN = 34;

export function begoniaLeaf(k: Kit, x: number, y: number, a: number, len: number, tone: number, turned: boolean, key?: string | number) {
  const s = len / LEN;
  // Leaves on the left are mirrored so the swept tip always points outward.
  const mirror = a < 0 ? -1 : 1;
  const r = (a * Math.PI) / 180;
  return (
    <g key={key} transform={place(x, y, a, s, s * mirror * 0.8)}>
      <path d={BLADE} fill={k.tone(GREENS, tone, x + Math.sin(r) * len * 0.5, y - Math.cos(r) * len * 0.5)} />
      <path d={SPOT_D} fill={k.lit(SPOTS)} opacity={0.95} />
      {turned && <path d={UNDERSIDE} fill={k.lit(UNDER)} />}
    </g>
  );
}

/** A hanging cluster of begonia flowers: two broad petals and two small ones each, on a pink stalk. */
function cluster(k: Kit, at: Pt, side: number, n: number, open: number, key: string | number) {
  const [x, y] = at;
  const end: Pt = [x + side * 8, y + 3];
  const heads: Pt[] = [
    [0, 2.6],
    [-3.4, 5.2],
    [3.2, 5],
    [-0.6, 8.2],
    [3.6, 9.2],
  ];
  const petal = open > 0.5;
  return (
    <g key={key}>
      <path d={`M${f(x)} ${f(y)}C${f(x + side * 3)} ${f(y - 6)} ${f(end[0])} ${f(y - 5)} ${f(end[0])} ${f(end[1])}`} fill="none" stroke={NODE} stroke-width={0.8} stroke-linecap="round" />
      {heads.slice(0, n).map(([dx, dy], i) => {
        const hx = end[0] + dx * side;
        const hy = end[1] + dy;
        const fill = k.lit(i % 2 ? '#F5CBD5' : '#FCEEF1');
        return petal ? (
          <g key={i} transform={`translate(${f(hx)} ${f(hy)}) rotate(${(i * 23) % 40 - 18}) scale(${f(lerp(0.7, 1, open) * k.bloom)})`}>
            <ellipse rx={2.5} ry={1.7} fill={fill} />
            <ellipse rx={1.2} ry={2.3} fill={fill} />
            <circle r={0.7} fill="#F2CF6A" />
          </g>
        ) : (
          <ellipse key={i} cx={f(hx)} cy={f(hy)} rx={1.2} ry={1.6} fill={k.lit('#F0B9C6')} />
        );
      })}
    </g>
  );
}

/** Canes, fully grown, relative to the soil point: tall and jointed, a leaf at each node. */
const CANES: readonly Cane[] = [
  { pts: [[-0.6, 0], [-0.2, -10], [0.6, -20], [0.8, -30], [0, -40], [-1.4, -48]], born: 0.8, rate: 1.1 },
  { pts: [[1.8, 0], [3.6, -9], [6.4, -18], [9.6, -26], [12.6, -33]], born: 2.2, rate: 1.1 },
  { pts: [[-2, 0], [-4, -8.6], [-7, -17], [-10.4, -24.6]], born: 3.3, rate: 1.1 },
  { pts: [[0.8, 0], [2.2, -10], [3, -20], [3.8, -30], [4, -40], [3, -49]], born: 5.2, rate: 1.3 },
];

/** Where flower clusters hang: [cane, node]. */
const FLOWER_AT: readonly [number, number][] = [
  [0, 4],
  [1, 3],
  [2, 3],
  [0, 3],
  [3, 4],
  [1, 2],
];

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.8];
  const spread = Math.min(1, m.hw / 18);
  let stems = '';
  const knots: Pt[] = [];
  const leaves = CANES.flatMap((c, ci) => {
    const at = caneAt(c, g.t, base, spread);
    if (!at) return [];
    stems += at.d;
    return at.nodes.map(({ i, at: [x, y], g: lg }) => {
      if (i <= at.grown) knots.push([x, y]);
      const top = i === c.pts.length - 1;
      const side = (i + ci) % 2 ? 1 : -1;
      // Wings hang out sideways, lower leaves a little lower, the terminal leaf nearly upright.
      const a = top ? headingAt(c.pts, i) + side * 16 : side * lerp(98, 70, i / c.pts.length) + headingAt(c.pts, i) * 0.4;
      const len = 18.5 * lerp(0.3, 1, lg) * lerp(0.84, 1.06, ramp(g.t, 3, 7.5));
      return begoniaLeaf(k, x, y, a, len, (i + ci) % 2, (i + ci) % 3 === 1, `${ci}-${i}`);
    });
  });
  // Buds at Budding, then clusters from Blooming: one per bloom, at the upper nodes.
  const clusters = FLOWER_AT.map(([ci, ni], j) => {
    const c = CANES[ci]!;
    const at = caneAt(c, g.t, base, spread);
    if (!at || at.grown < ni) return null;
    const budding = g.stage === 4 && j < 1 + Math.round(g.progress);
    if (!budding && j >= g.blooms) return null;
    const p = at.nodes.find((n) => n.i === ni)?.at;
    if (!p) return null;
    const side = headingAt(c.pts, ni) >= 0 ? 1 : -1;
    return cluster(k, p, side, budding ? 3 : 3 + ((j + g.blooms) % 3), budding ? 0 : 1, j);
  });
  return {
    back: (
      <g>
        <Stems d={stems} color={CANE} w={1.8} />
        <path d={knots.map(([x, y]) => `M${f(x - 1.1)} ${f(y)}h2.2`).join('')} stroke={NODE} stroke-width={1} stroke-linecap="round" />
        {leaves}
        {clusters}
      </g>
    ),
  };
}

export const begonia: SpeciesArt = {
  cutting: {
    stem: { color: CANE, w: 1.6 },
    draw: (g, k, [x, y]) => {
      const node: Pt = [x + 0.4, 44];
      const open = g.stage > 0 ? 1 : lerp(0.75, 1, g.progress);
      return (
        <g>
          <Stems d={`M${x} ${y}C${x} 60 ${x + 0.6} 52 ${node[0]} ${node[1]}`} color={CANE} w={1.6} />
          <path d={`M${f(x - 0.9)} 53.6h1.8`} stroke={NODE} stroke-width={1} stroke-linecap="round" />
          {begoniaLeaf(k, x + 0.2, 53.6, 94, 13 * open, 1, true, 'a')}
          {begoniaLeaf(k, node[0], node[1], -14, 14, 0, false, 'b')}
          {g.stage > 0 && g.progress > 0.5 && begoniaLeaf(k, x + 0.2, 51, -96, 10 * ramp(g.progress, 0.5, 1), 0, false, 'c')}
        </g>
      );
    },
  },
  potted,
};
