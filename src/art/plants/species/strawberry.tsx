import type { Growth, PlantSpeciesArt } from '../types';
import { Blossom, FINE, GREEN, Merged, OUTLINE, Shine, Stems, leafD, stemD } from '../parts';
import { f, lerp, mix, ramp } from '../math';
import { seedling, sprout } from '../early';

const BERRY = '#FF7F93';
const UNRIPE = '#D5EDB0';

/** Three round leaflets at the end of a petiole, pointing along `rot`, merged into one soft silhouette. */
function Trifoliate({ x, y, rot, s = 1, fill = GREEN.leaf }: { x: number; y: number; rot: number; s?: number; fill?: string }) {
  const leaflet = (a: number, L: number, W: number) => ({ d: leafD('round', L, W), transform: `rotate(${a})` });
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`}>
      <Merged shapes={[leaflet(-56, 9.6, 4.4), leaflet(56, 9.6, 4.4), leaflet(0, 11, 4.8)]} fill={fill} line={f(FINE / s)} />
      <g fill="none" stroke={GREEN.vein} stroke-width={f(1.1 / s)} stroke-linecap="round">
        <path d="M0 -1.4 L0 -8.6" />
        <path d="M-1.2 -0.8 L-6.6 -4.4" />
        <path d="M1.2 -0.8 L6.6 -4.4" />
      </g>
    </g>
  );
}

/** A strawberry hanging from (x, y); `ripe` blends it from white-green to berry pink-red. */
function Berry({ x, y, s = 1, rot = 0, ripe = 1 }: { x: number; y: number; s?: number; rot?: number; ripe?: number }) {
  const line = f(FINE / s);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`} stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-4.8 1.4 C-6 5.6 -2.6 10.4 0 10.8 C2.6 10.4 6 5.6 4.8 1.4 C3.2 -0.4 -3.2 -0.4 -4.8 1.4 Z" fill={mix(UNRIPE, BERRY, ripe)} stroke-width={line} />
      {ripe > 0.5 && (
        <g fill="#FFE9A8" stroke="none">
          <ellipse cx={-2.2} cy={4} rx={0.45} ry={0.7} />
          <ellipse cx={1.6} cy={3.6} rx={0.45} ry={0.7} />
          <ellipse cx={-0.4} cy={6.8} rx={0.45} ry={0.7} />
          <ellipse cx={2.6} cy={6.6} rx={0.45} ry={0.7} />
          <ellipse cx={-2.8} cy={6.6} rx={0.45} ry={0.7} />
        </g>
      )}
      <Shine d="M-3.6 3.2 Q-3.8 5.2 -2.8 6.6" w={1.1 / s} />
      <path d="M0 1 L-4 -0.6 L-1.6 -1 L0 -2.8 L1.6 -1 L4 -0.6 Z" fill={GREEN.leaf} stroke-width={f(1.4 / s)} />
    </g>
  );
}

/** Small green bud with white petals peeking (k 0 → 1); a finer line keeps it from turning into a dark knot. */
function FlowerBud({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <g stroke={OUTLINE} stroke-width={1.3} stroke-linejoin="round">
      <circle cx={x} cy={f(y - 2)} r={f(lerp(2.6, 3.6, k))} fill="#fff" />
      <path d={`M${f(x - 3.8)} ${f(y - 0.6)} L${f(x - 1.7)} ${f(y - 2.3)} L${x} ${f(y - 0.8)} L${f(x + 1.7)} ${f(y - 2.3)} L${f(x + 3.8)} ${f(y - 0.6)} C${f(x + 2.5)} ${f(y + 2.5)} ${f(x - 2.5)} ${f(y + 2.5)} ${f(x - 3.8)} ${f(y - 0.6)} Z`} fill={GREEN.leaf} />
    </g>
  );
}

type Fruit = { x: number; y: number; s: number; rot: number; ripe: number; stem: string };

interface Plant {
  leaves: { x0: number; x: number; y: number; rot: number; s: number }[];
  buds: { x0: number; x: number; y: number; k: number }[];
  flowers: { x0: number; x: number; y: number; r: number }[];
  /** Berries hanging among the leaves. */
  berries: Fruit[];
  /** At most three berries spilling over the rim, at alternating heights, so no pot face gets covered. */
  spill: Fruit[];
}

/** Extra berries after Evergreen, hanging from the leaf edges (never over the pot). */
const EXTRA_BERRIES: Fruit[] = [
  { x: 19, y: 49, s: 0.78, rot: 16, ripe: 1, stem: 'M25 42 Q20 44 19 49' },
  { x: 81, y: 47, s: 0.78, rot: -16, ripe: 1, stem: 'M75 40 Q80 42 81 47' },
  { x: 37, y: 42, s: 0.74, rot: 10, ripe: 1, stem: 'M40 36 Q37 38 37 42' },
  { x: 63, y: 41, s: 0.74, rot: -10, ripe: 1, stem: 'M60 35 Q63 37 63 41' },
  { x: 27, y: 32, s: 0.7, rot: 12, ripe: 1, stem: 'M31 26 Q27 28 27 32' },
  { x: 73, y: 30, s: 0.7, rot: -12, ripe: 1, stem: 'M69 24 Q73 26 73 30' },
];

/** A dome of leaves: back-center first, lower sides last. */
function leaves(g: Growth): Plant['leaves'] {
  const k = lerp(0.9, 1, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.18;
  return [
    { x0: 50, x: 50.5, y: 37 - k * 3, rot: 2, s: 1.12 * k },
    { x0: 49, x: 40, y: 41, rot: -34, s: 1.12 * k },
    { x0: 51, x: 61, y: 40, rot: 36, s: 1.12 * k },
    { x0: 48, x: 34, y: 51, rot: -66, s: 1.06 * k },
    { x0: 52, x: 66, y: 50, rot: 64, s: 1.06 * k },
    ...(g.t >= 3.5 ? [{ x0: 50, x: 50.5, y: 49, rot: -4, s: 0.92 * k }] : []),
  ];
}

function plant(g: Growth): Plant {
  const p = g.progress;
  const ls = leaves(g);
  switch (g.stage) {
    case 3:
      return { leaves: ls, buds: [], flowers: [], berries: [], spill: [] };
    case 4:
      return {
        leaves: ls,
        buds: [
          { x0: 48, x: 37, y: lerp(27, 23, p), k: 0.3 + p * 0.7 },
          { x0: 52, x: 63, y: lerp(26, 22, p), k: 0.2 + p * 0.5 },
          ...(p >= 0.5 ? [{ x0: 50, x: 50.5, y: 18, k: p - 0.5 }] : []),
        ],
        flowers: [],
        berries: [],
        spill: [],
      };
    case 5:
      return {
        leaves: ls,
        buds: [{ x0: 50, x: 50.5, y: 18, k: 0.6 }],
        flowers: [
          { x0: 48, x: 36, y: 25, r: lerp(5.4, 6.4, p) },
          { x0: 52, x: 64, y: 24, r: lerp(5.4, 6.4, p) },
        ],
        berries: [],
        spill: p >= 0.5 ? [{ x: 73, y: 55, s: 0.72, rot: -14, ripe: 0, stem: 'M66 48 Q72 49 73 55' }] : [],
      };
    case 6:
      return {
        leaves: ls,
        buds: [],
        flowers: [
          { x0: 48, x: 35, y: 26, r: 6.2 },
          { x0: 52, x: 64, y: 24, r: 6.2 },
          ...(p >= 0.5 ? [{ x0: 50, x: 50.5, y: 18, r: 5.4 }] : []),
        ],
        berries: [{ x: 58, y: 46, s: 0.8, rot: -6, ripe: lerp(0.4, 1, p), stem: 'M56 40 Q58 42 58 46' }],
        spill: [
          { x: 27, y: 58, s: 0.95, rot: 16, ripe: 1, stem: 'M35 49 Q28 51 27 58' },
          { x: 73, y: 56, s: 0.95, rot: -16, ripe: 1, stem: 'M66 48 Q72 50 73 56' },
        ],
      };
    default:
      return {
        leaves: ls,
        buds: [],
        flowers: [
          { x0: 48, x: 33, y: 25, r: 6.4 },
          { x0: 52, x: 67, y: 23, r: 6.4 },
          { x0: 50, x: 50.5, y: 15, r: 6 },
        ],
        berries: [{ x: 58, y: 46, s: 0.85, rot: -6, ripe: 1, stem: 'M56 40 Q58 42 58 46' }, ...EXTRA_BERRIES.slice(0, g.blooms)],
        spill: [
          { x: 25, y: 58, s: 1, rot: 18, ripe: 1, stem: 'M33 48 Q26 50 25 58' },
          { x: 75, y: 56, s: 1, rot: -18, ripe: 1, stem: 'M67 47 Q74 49 75 56' },
          { x: 41, y: 55, s: 0.88, rot: 8, ripe: 1, stem: 'M44 48 Q41 50 41 55' },
        ],
      };
  }
}

function Berries({ list }: { list: Fruit[] }) {
  return (
    <g>
      <Stems paths={list.map((b) => b.stem)} w={1.6} line={1.6} />
      {list.map((b, i) => (
        <Berry key={i} x={b.x} y={b.y} s={b.s} rot={b.rot} ripe={b.ripe} />
      ))}
    </g>
  );
}

export const strawberry: PlantSpeciesArt = {
  seed: '#F2C46B',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    if (g.stage === 2) return seedling(g, { shape: 'round' });
    const pl = plant(g);
    return {
      back: (
        <g>
          <Stems paths={[...pl.leaves.map((l) => stemD(l.x0, l.x, l.y)), ...pl.buds.map((b) => stemD(b.x0, b.x, b.y)), ...pl.flowers.map((fl) => stemD(fl.x0, fl.x, fl.y))]} w={2.2} />
          {pl.leaves.map((l, i) => (
            <Trifoliate key={i} x={l.x} y={l.y} rot={l.rot} s={l.s} fill={i < 3 ? GREEN.back : GREEN.leaf} />
          ))}
          {pl.buds.map((b, i) => (
            <FlowerBud key={i} x={b.x} y={b.y} k={b.k} />
          ))}
          {pl.flowers.map((fl, i) => (
            <Blossom key={i} x={fl.x} y={fl.y} r={fl.r} petal="#FFFFFF" rot={i * 20} line={1.6} />
          ))}
          {pl.berries.length > 0 && <Berries list={pl.berries} />}
        </g>
      ),
      front: pl.spill.length ? <Berries list={pl.spill} /> : null,
    };
  },
};
