/**
 * Chinese money plant (Pilea peltata): round, coin-like leaves held flat on long thin petioles from a short central
 * stem. The petiole meets the leaf in the middle (peltate), which shows as a pale dot. Its "bloom" is pups: small
 * plantlets that come up from the soil beside it.
 */
import { ell, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, Stems, toward } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#A9CB8E', '#84AE70');
const PETIOLE = '#8FB07C';
const DOT = '#E6F0D4';

/** A coin leaf of radius r at (x, y), tilted to face along its petiole (heading `a`). */
function coin(k: Kit, x: number, y: number, r: number, a: number, tone: number, key: string | number) {
  // Seen a little from the side, a round leaf is an ellipse squashed along its petiole.
  const squash = lerp(0.9, 0.72, Math.min(1, Math.abs(a) / 90));
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${f(a)})`}>
      <path d={ell(0, 0, r, r * squash)} fill={k.tone(GREENS, tone, x, y)} />
      <path d={ell(0, r * 0.12, r * 0.14, r * 0.12)} fill={DOT} opacity={0.85} />
    </g>
  );
}

/** Leaves on the main stem: [heading, petiole length, radius, birth]. A loose bouquet; old leaves sit low and wide. */
const LEAVES: readonly [number, number, number, number][] = [
  [-38, 13, 5.8, 1.8],
  [36, 14, 6, 1.9],
  [-4, 16, 6, 2.4],
  [-64, 16, 6.6, 2.9],
  [62, 17, 6.6, 3.3],
  [18, 21, 6.8, 3.8],
  [-24, 22, 6.8, 4.2],
  [-82, 20, 6.8, 4.8],
  [82, 21, 6.8, 5.3],
  [-46, 26, 7, 5.8],
  [44, 27, 7, 6.3],
  [4, 29, 6.6, 6.8],
  [-12, 33, 6.2, 7.3],
];

/** Pups: [x offset in the soil, birth order]; one comes up per two blooms. */
const PUPS: readonly [number, number][] = [
  [-13, 0],
  [12.5, 1],
  [-6, 2],
];

function pup(k: Kit, x: number, y: number, g: number, key: number) {
  const s = lerp(0.4, 1, g);
  const leaves: [number, number, number][] = [
    [-34, 6.5, 2.6],
    [30, 7, 2.8],
    [-2, 8.5, 2.4],
  ];
  let stems = '';
  const discs = leaves.map(([a, len, r], i) => {
    const [tx, ty] = toward([x, y], a, len * s);
    stems += `M${f(x)} ${f(y)}Q${f(x + (tx - x) * 0.2)} ${f(y - len * s * 0.6)} ${f(tx)} ${f(ty)}`;
    return coin(k, tx, ty, r * s, a, i % 2, `${key}-${i}`);
  });
  return (
    <g key={key}>
      <Stems d={stems} color={PETIOLE} w={0.7} />
      {discs}
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const spread = Math.min(1, m.hw / 18);
  // The central stem lengthens with age, lifting the crown.
  const trunk = lerp(1.5, 13, ramp(g.t, 2, 7.8));
  const base: Pt = [50, m.y + 0.8];
  const top: Pt = [50.4, m.y - trunk];
  let petioles = '';
  const discs = LEAVES.map(([a, len, r, birth], i) => {
    const gr = grown(g.t, birth);
    if (gr <= 0) return null;
    // Older leaves attach lower down the stem; each petiole arcs up before the leaf levels out.
    const from: Pt = [lerp(base[0], top[0], 0.4 + 0.6 * (i / LEAVES.length)), lerp(base[1], top[1], 0.35 + 0.65 * (i / LEAVES.length))];
    const L = len * lerp(0.45, 1, gr) * lerp(0.9, 1.08, ramp(g.t, 3, 7.5));
    const [tx, ty] = toward(from, a * lerp(0.6, 1, gr), L);
    const [cx, cy] = [lerp(from[0], tx, 0.3), lerp(from[1], ty, 0.3) - L * 0.22];
    petioles += `M${f(from[0])} ${f(from[1])}Q${f(cx)} ${f(cy)} ${f(50 + (tx - 50) * spread)} ${f(ty)}`;
    return coin(k, 50 + (tx - 50) * spread, ty, r * lerp(0.45, 1, gr), a, i % 2, i);
  });
  const pups = PUPS.map(([dx, order], i) => {
    const gp = ramp(g.blooms, order * 2 + 0.5, order * 2 + 2);
    return gp > 0 ? pup(k, 50 + dx * spread, m.y + 0.8, gp, i) : null;
  });
  return {
    back: (
      <g>
        <Stems d={`M${f(base[0])} ${f(base[1])}L${f(top[0])} ${f(top[1])}`} color={PETIOLE} w={1.7} />
        <Stems d={petioles} color={PETIOLE} w={0.9} />
        {discs}
        {pups}
      </g>
    ),
  };
}

export const pilea: SpeciesArt = {
  cutting: {
    stem: { color: PETIOLE, w: 1.4 },
    draw: (g, k, [x, y]) => {
      const node: Pt = [x, 55];
      const third = g.stage > 0 ? grown(g.progress, 0.5, 0.5) : lerp(0.35, 0.6, g.progress);
      const leaves: [number, number, number, number][] = [
        [-44, 9, 5, 1],
        [40, 10, 5.3, 1],
        [-4, 11 * third, 4.4 * third, third],
      ];
      let stems = `M${x} ${y}L${node[0]} ${node[1]}`;
      const discs = leaves.map(([a, len, r], i) => {
        const [tx, ty] = toward(node, a, len);
        stems += `M${f(node[0])} ${f(node[1])}Q${f(lerp(node[0], tx, 0.3))} ${f(node[1] - len * 0.55)} ${f(tx)} ${f(ty)}`;
        return coin(k, tx, ty, r, a, i % 2, i);
      });
      return (
        <g>
          <Stems d={stems} color={PETIOLE} w={1} />
          {discs}
        </g>
      );
    },
  },
  potted,
};
