/**
 * Monstera (Monstera deliciosa): young plants make plain heart-shaped leaves. From Leafy on, each new leaf opens with
 * a few holes (fenestrations), and from Blooming the new leaves are the big split ones. Old leaves keep the shape
 * they opened with, as they do. A mature plant sends an aerial root down to the soil.
 */
import { ell, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { grown, place, Stems, toward } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#A7C78F', '#7FA46E');
const VEIN = '#C9DCB2';
const STEM = '#86A872';
const ROOT = '#A38A6E';
const NEW_LEAF = '#C4DA9E';

/** A young heart leaf, 30 long, base (sinus) at the origin. */
const HEART = 'M0 -1.6C-4 1.4 -13.6 0.4 -14 -9C-14.4 -18.6 -6.6 -26.4 0 -30C6.6 -26.4 14.4 -18.6 14 -9C13.6 0.4 4 1.4 0 -1.6Z';
/** The same heart with its first holes, either side of the midrib (even-odd fill). */
const HOLED = `${HEART}${[
  [-5.2, -11, 1.3, 2.6, 24],
  [5.4, -12.4, 1.2, 2.4, -24],
  [-4.6, -19.4, 1.1, 2.1, 30],
  [4.8, -20, 1, 2, -30],
]
  .map(([x, y, rx, ry, a]) => {
    const r = (a! * Math.PI) / 180;
    const ex = -Math.sin(r) * ry!;
    const ey = Math.cos(r) * ry!;
    return `M${f(x! + ex)} ${f(y! + ey)}A${rx} ${ry} ${a} 1 0 ${f(x! - ex)} ${f(y! - ey)}A${rx} ${ry} ${a} 1 0 ${f(x! + ex)} ${f(y! + ey)}Z`;
  })
  .join('')}`;

/** The mature leaf: deep splits from the edge and a row of holes along the midrib (after the style frames). */
const SPLIT = (() => {
  const start: Pt = [0, -5];
  const segs: [string, ...Pt[]][] = [
    ['C', [5, -1], [13, -1], [17.5, -6]],
    ['C', [19.5, -8.5], [20.6, -11], [21, -13.5]],
    ['L', [11, -15.8]],
    ['L', [21.3, -17.4]],
    ['C', [21.4, -19.8], [21.1, -22.2], [20.4, -24.6]],
    ['L', [10.4, -25]],
    ['L', [19.3, -28.4]],
    ['C', [18.1, -30.6], [16.6, -32.6], [14.9, -34.4]],
    ['L', [7.4, -31]],
    ['L', [12.3, -36.9]],
    ['C', [9, -39.6], [4.5, -41.9], [0, -42.6]],
  ];
  const ends: Pt[] = [start, ...segs.map((s) => s[s.length - 1] as Pt)];
  let d = `M${start[0]} ${start[1]}`;
  for (const [cmd, ...p] of segs) d += cmd + p.map(([x, y]) => `${x} ${y}`).join(' ');
  for (let i = segs.length - 1; i >= 0; i--) {
    const [cmd, ...p] = segs[i]!;
    const prev = ends[i]!;
    d += cmd === 'C' ? `C${-p[1]![0]} ${p[1]![1]} ${-p[0]![0]} ${p[0]![1]} ${-prev[0]} ${prev[1]}` : `L${-prev[0]} ${prev[1]}`;
  }
  d += 'Z';
  for (const side of [-1, 1]) {
    for (const [cx, cy, rx, ry, ang] of [
      [5.4, -19.6, 1.35, 2.9, 24],
      [4.6, -27.4, 1.15, 2.3, 30],
      [5.6, -11.6, 1.2, 2.2, 14],
    ] as const) {
      const a = (ang * side * Math.PI) / 180;
      const ex = -Math.sin(a) * ry;
      const ey = Math.cos(a) * ry;
      d += `M${f(side * cx + ex)} ${f(cy + ey)}A${rx} ${ry} ${ang * side} 1 0 ${f(side * cx - ex)} ${f(cy - ey)}A${rx} ${ry} ${ang * side} 1 0 ${f(side * cx + ex)} ${f(cy + ey)}Z`;
    }
  }
  return d;
})();

const FORMS = { heart: { d: HEART, len: 30 }, holed: { d: HOLED, len: 30 }, split: { d: SPLIT, len: 42.6 } };
type Form = keyof typeof FORMS;

function monsteraLeaf(k: Kit, x: number, y: number, a: number, len: number, tone: number, form: Form, key: string | number) {
  const { d, len: L } = FORMS[form];
  const r = (a * Math.PI) / 180;
  return (
    <g key={key} transform={place(x, y, a, len / L)}>
      <path d={d} fill-rule="evenodd" fill={k.tone(GREENS, tone, x + Math.sin(r) * len * 0.5, y - Math.cos(r) * len * 0.5)} />
      <path d={`M0 ${form === 'split' ? -5 : -2}C0.4 ${-L * 0.4} 0.3 ${-L * 0.7} 0 ${-L * 0.94}`} fill="none" stroke={k.lit(VEIN)} stroke-width={form === 'split' ? 1 : 0.8} stroke-linecap="round" opacity={0.8} />
    </g>
  );
}

/** Leaves: [petiole heading, petiole length, leaf length, birth]. The shape a leaf opens with depends on when. */
const LEAVES: readonly [number, number, number, number][] = [
  [-40, 9, 11, 1.8],
  [38, 10, 12, 2.2],
  [-6, 13, 13.5, 2.8],
  [54, 15, 15.5, 3.4],
  [-58, 16, 16.5, 4],
  [14, 21, 19, 4.7],
  [-24, 24, 20, 5.3],
  [64, 21, 20, 6],
  [-72, 19, 19, 6.6],
  [2, 28, 21, 7.2],
];

const formFor = (birth: number): Form => (birth >= 4.6 ? 'split' : birth >= 3.3 ? 'holed' : 'heart');

function potted(g: Growth, k: Kit, m: Mouth) {
  const base: Pt = [50, m.y + 0.8];
  const spread = Math.min(1, m.hw / 18);
  let stems = '';
  const leaves = LEAVES.map(([a, len, leafLen, birth], i) => {
    const gr = grown(g.t, birth, 1);
    if (gr <= 0) return null;
    const from: Pt = [50 + (i % 3) - 1, m.y + 0.8];
    const [tx, ty] = toward(from, a * lerp(0.5, 1, gr), len * lerp(0.4, 1, gr));
    const x = 50 + (tx - 50) * spread;
    stems += `M${f(from[0])} ${f(from[1])}Q${f(lerp(from[0], x, 0.15))} ${f(lerp(from[1], ty, 0.65))} ${f(x)} ${f(ty)}`;
    // The blade is held out along its petiole, tipped a little further outward.
    const tilt = a + Math.sign(a || 1) * 18;
    return monsteraLeaf(k, x, ty, tilt, leafLen * lerp(0.35, 1, gr), i % 2, formFor(birth), i);
  });
  // A new leaf, still rolled, at Budding: pale and upright in the middle.
  const roll = g.stage === 4 ? grown(g.progress, 0, 0.9) : 0;
  const rolled = roll > 0 && (
    <g>
      <Stems d={`M50 ${f(base[1])}Q50.6 ${f(base[1] - 14)} 51.4 ${f(base[1] - lerp(12, 24, roll))}`} color={STEM} w={1.6} />
      <path transform={place(51.4, base[1] - lerp(12, 24, roll), 5, lerp(0.6, 1.2, roll))} d="M0 1C-2.2 -2.6 -2.4 -8.4 0 -13.4C2.4 -8.4 2.2 -2.6 0 1Z" fill={k.lit(NEW_LEAF)} />
    </g>
  );
  // Its peak is aerial roots: from Blooming, one, and more as blooms rise, reaching down into the soil.
  const rootCount = g.stage >= 5 ? Math.min(3, 1 + Math.floor(g.blooms / 2)) : 0;
  const roots = [0, 1, 2].map((j) => {
    const gr = j < rootCount ? ramp(g.t, 5 + j * 0.3, 5.8 + j * 0.3) : 0;
    if (gr <= 0) return null;
    const s = j % 2 ? 1 : -1;
    const from: Pt = [50 + s * (2 + j), m.y - 9 + j * 2];
    const to: Pt = [50 + s * lerp(6, m.hw - 2 - j * 3, gr), m.y + 1];
    return <path key={j} d={`M${f(from[0])} ${f(from[1])}Q${f(50 + s * (m.hw * 0.6))} ${f(m.y - 12)} ${f(to[0])} ${f(lerp(from[1], to[1], gr))}`} fill="none" stroke={ROOT} stroke-width={1.3} stroke-linecap="round" />;
  });
  return {
    back: (
      <g>
        <Stems d={stems} color={STEM} w={1.5} />
        {roots}
        {rolled}
        {leaves}
      </g>
    ),
  };
}

export const monstera: SpeciesArt = {
  cutting: {
    stem: { color: STEM, w: 1.8 },
    draw: (g, k, [x, y]) => {
      // A node cutting: a short thick stem with one heart leaf and a stub of aerial root.
      const node: Pt = [x - 0.6, 52];
      const open = g.stage > 0 ? 1 : lerp(0.8, 1, g.progress);
      return (
        <g>
          <Stems d={`M${x} ${y}C${x} 62 ${x - 0.4} 57 ${node[0]} ${node[1]}Q${node[0] - 1} ${node[1] - 5} ${node[0] - 3} ${node[1] - 9}`} color={STEM} w={1.8} />
          <path d={`M${f(node[0] + 0.4)} ${f(node[1] + 2)}q2.4 1 3 4.4`} fill="none" stroke={ROOT} stroke-width={1.2} stroke-linecap="round" />
          <path d={ell(node[0], node[1], 1.3, 1)} fill={STEM} />
          {monsteraLeaf(k, node[0] - 3, node[1] - 9, -24, 17 * open, 0, 'heart', 'a')}
          {g.stage > 0 && g.progress > 0.55 && monsteraLeaf(k, node[0] + 0.4, node[1] - 1, 34, 9 * ramp(g.progress, 0.55, 1), 1, 'heart', 'b')}
        </g>
      );
    },
  },
  potted,
};
