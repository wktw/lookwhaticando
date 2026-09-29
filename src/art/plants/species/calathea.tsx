/**
 * Prayer plant (Calathea / Maranta family): oval leaves on long stalks, painted with a pale feathered band along the
 * midrib and dark brush-strokes between the veins. Every evening the leaves fold upward (they "pray"), showing
 * their purple undersides; under the lamp (`light.night`) they are drawn folded. Small white flowers from Blooming.
 */
import type { JSX } from 'preact';
import { ell, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, place, Stems, toward } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#9FC088', '#80A770');
const FEATHER = '#4F7650';
const BAND = '#D5E4B6';
const UNDER = '#8E5E83';
const STALK = '#94AE7E';

/** An oval leaf, 20 long, base at the origin, pointed tip. */
const LEAF = 'M0 0C4.6 -1.6 6.2 -6.4 6 -10.4C5.8 -14.6 3.2 -18.2 0 -20C-3.2 -18.2 -5.8 -14.6 -6 -10.4C-6.2 -6.4 -4.6 -1.6 0 0Z';
/** The pale band along the midrib, feathered at its edges. */
const BAND_D = 'M0 -1.2C1.2 -3 2.4 -3.4 1.4 -5.2C2.8 -6 3 -7.4 1.8 -8.8C3.2 -9.8 3 -11.4 1.8 -12.6C2.8 -13.8 2.4 -15.4 1.2 -16.2C1.4 -17.2 0.8 -18 0 -18.6C-0.8 -18 -1.4 -17.2 -1.2 -16.2C-2.4 -15.4 -2.8 -13.8 -1.8 -12.6C-3 -11.4 -3.2 -9.8 -1.8 -8.8C-3 -7.4 -2.8 -6 -1.4 -5.2C-2.4 -3.4 -1.2 -3 0 -1.2Z';
/** Dark brush marks between the veins, alternating long and short, both sides. */
const FEATHERS_D = [
  [-4, 12, 4.4, 1.1],
  [-7.4, 18, 3.2, 0.9],
  [-10.6, 12, 4.4, 1.1],
  [-13.6, 20, 3, 0.8],
  [-16.2, 16, 2.4, 0.7],
]
  .flatMap(([y, a, L, w]) =>
    [-1, 1].map((s) => {
      const r = ((90 - a!) * Math.PI) / 180;
      const x0 = s * 2.2;
      const x1 = s * (2.2 + Math.sin(r) * L!);
      const y1 = y! - Math.cos(r) * L! * 0.9;
      return `M${f(x0)} ${f(y!)}Q${f((x0 + x1) / 2)} ${f((y! + y1) / 2 - w!)} ${f(x1)} ${f(y1)}Q${f((x0 + x1) / 2)} ${f((y! + y1) / 2 + w!)} ${f(x0)} ${f(y!)}Z`;
    }),
  )
  .join('');
/** Folded for the night: the leaf closed up along its midrib, its purple underside toward us, a sliver of green. */
const FOLDED = 'M0 0C2 -2 2.6 -7 2.4 -11C2.2 -15 1.2 -18.2 0 -20C-1.2 -18.2 -2.2 -15 -2.4 -11C-2.6 -7 -2 -2 0 0Z';
const FOLDED_TOP = 'M0 0C1.2 -2 1.6 -7 1.5 -11C1.4 -15 0.8 -18.2 0 -20C-0.1 -16 -0.2 -8 0 0Z';

export function calatheaLeaf(k: Kit, x: number, y: number, a: number, s: number, tone: number, key: string | number) {
  const r = (a * Math.PI) / 180;
  const green = k.tone(GREENS, tone, x + Math.sin(r) * 10 * s, y - Math.cos(r) * 10 * s);
  if (k.night) {
    return (
      <g key={key} transform={place(x, y, a, s)}>
        <path d={FOLDED} fill={UNDER} />
        <path d={FOLDED_TOP} fill={green} />
      </g>
    );
  }
  return (
    <g key={key} transform={place(x, y, a, s)}>
      <path d={LEAF} fill={green} />
      <path d={FEATHERS_D} fill={FEATHER} opacity={0.9} />
      <path d={BAND_D} fill={k.lit(BAND)} />
    </g>
  );
}

/** Leaves: [stalk heading, stalk length, size, birth]. */
const LEAVES: readonly [number, number, number, number][] = [
  [-34, 12, 0.72, 1.8],
  [32, 13, 0.74, 2.1],
  [-4, 16, 0.78, 2.6],
  [-58, 14, 0.8, 3.1],
  [56, 15, 0.82, 3.5],
  [16, 20, 0.86, 4.1],
  [-20, 21, 0.88, 4.8],
  [70, 16, 0.84, 5.5],
  [-72, 15, 0.84, 6.1],
  [6, 25, 0.9, 6.8],
  [-44, 22, 0.88, 7.3],
];

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.8];
  const spread = Math.min(1, m.hw / 18);
  let stalks = '';
  const leaves = LEAVES.map(([a, len, s, birth], i) => {
    const gr = grown(g.t, birth, 1);
    if (gr <= 0) return null;
    // At night the stalks lift and the blades stand up, folded: a real daily movement.
    const lift = k.night ? 0.55 : 1;
    const [tx, ty] = toward(base, a * lerp(0.6, 1, gr) * lift, len * lerp(0.45, 1, gr) * (k.night ? 1.06 : 1));
    const x = 50 + (tx - 50) * spread;
    stalks += `M${f(base[0])} ${f(base[1])}Q${f(lerp(base[0], x, 0.15))} ${f(lerp(base[1], ty, 0.6))} ${f(x)} ${f(ty)}`;
    const blade = k.night ? a * 0.35 : a * 1.1;
    return calatheaLeaf(k, x, ty, blade, s * lerp(0.4, 1, gr) * lerp(0.92, 1.08, ramp(g.t, 3, 7.5)), i % 2, i);
  });
  // A new leaf still rolled at Budding; small white flowers low among the stalks from Blooming.
  const roll = g.stage === 4 ? grown(g.progress, 0, 0.9) : 0;
  const rolled = roll > 0 && (
    <g>
      <Stems d={`M50.6 ${f(base[1])}Q51 ${f(base[1] - 10)} 51.6 ${f(base[1] - lerp(10, 20, roll))}`} color={STALK} w={0.9} />
      <path transform={place(51.6, base[1] - lerp(10, 20, roll), 4, lerp(0.6, 1, roll))} d="M0 1C-1.6 -2 -1.8 -7 0 -11C1.8 -7 1.6 -2 0 1Z" fill={k.lit('#C9DCA6')} />
    </g>
  );
  const flowers: JSX.Element[] = [];
  for (let j = 0; j < Math.min(4, g.blooms); j++) {
    const x = 50 + [-5, 6, -1.5, 9][j]! * spread;
    const y = m.y - [7, 5.6, 9.4, 8][j]!;
    flowers.push(
      <g key={j}>
        <path d={`M${f(50 + (x - 50) * 0.3)} ${f(m.y)}L${f(x)} ${f(y + 1)}`} stroke={STALK} stroke-width={0.6} stroke-linecap="round" />
        <path d={`${ell(x - 0.9, y, 1.1, 1.3)}${ell(x + 0.9, y - 0.3, 1.1, 1.3)}${ell(x, y - 1.3, 1, 1.2)}`} fill={k.lit('#FBF7EE')} />
      </g>,
    );
  }
  return {
    back: (
      <g data-folded={k.night ? 'true' : undefined}>
        <Stems d={stalks} color={STALK} w={1} />
        {rolled}
        {leaves}
        {flowers}
      </g>
    ),
  };
}

export const calathea: SpeciesArt = {
  cutting: {
    stem: { color: STALK, w: 1.2 },
    draw: (g, k, [x, y]) => {
      // A division with two leaves, standing in water while it roots.
      const top = g.stage ? 1 : lerp(0.85, 1, g.progress);
      const lift = k.night ? 0.4 : 1;
      return (
        <g data-folded={k.night ? 'true' : undefined}>
          <Stems d={`M${x} ${y}Q${x - 1} 58 ${x - 3.6} ${50}M${x} ${y}Q${x + 1} 57 ${x + 4} ${52}`} color={STALK} w={1} />
          {calatheaLeaf(k, x - 3.6, 50, -26 * lift, 0.62 * top, 0, 'a')}
          {calatheaLeaf(k, x + 4, 52, 34 * lift, 0.56, 1, 'b')}
        </g>
      );
    },
  },
  potted,
};
