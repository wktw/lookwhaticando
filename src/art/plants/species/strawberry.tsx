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

/** Small green bud with white petals peeking (k 0 → 1). */
function FlowerBud({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <g stroke={OUTLINE} stroke-width={1.6} stroke-linejoin="round">
      <circle cx={x} cy={f(y - 1.8)} r={f(lerp(2, 3.2, k))} fill="#fff" />
      <path d={`M${f(x - 3.6)} ${f(y - 0.6)} L${f(x - 1.6)} ${f(y - 2.2)} L${x} ${f(y - 0.8)} L${f(x + 1.6)} ${f(y - 2.2)} L${f(x + 3.6)} ${f(y - 0.6)} C${f(x + 2.4)} ${f(y + 2.4)} ${f(x - 2.4)} ${f(y + 2.4)} ${f(x - 3.6)} ${f(y - 0.6)} Z`} fill={GREEN.leaf} />
    </g>
  );
}

interface Plant {
  leaves: { x0: number; x: number; y: number; rot: number; s: number }[];
  buds: { x0: number; x: number; y: number; k: number }[];
  flowers: { x0: number; x: number; y: number; r: number }[];
  berries: { x: number; y: number; s: number; rot: number; ripe: number; stem: string }[];
}

const EXTRA_BERRIES = [
  { x: 42, y: 58, s: 0.8, rot: 8, ripe: 1, stem: 'M46 50 Q42 52 42 58' },
  { x: 58, y: 57, s: 0.8, rot: -8, ripe: 1, stem: 'M55 49 Q58 51 58 57' },
  { x: 20, y: 60, s: 0.72, rot: 20, ripe: 1, stem: 'M28 50 Q21 52 20 60' },
  { x: 80, y: 58, s: 0.72, rot: -20, ripe: 1, stem: 'M72 48 Q79 50 80 58' },
  { x: 35, y: 49, s: 0.7, rot: 12, ripe: 1, stem: 'M39 42 Q35 44 35 49' },
  { x: 65, y: 48, s: 0.7, rot: -12, ripe: 1, stem: 'M61 41 Q65 43 65 48' },
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
      return { leaves: ls, buds: [], flowers: [], berries: [] };
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
      };
    case 5:
      return {
        leaves: ls,
        buds: [{ x0: 50, x: 50.5, y: 18, k: 0.6 }],
        flowers: [
          { x0: 48, x: 36, y: 25, r: lerp(5.4, 6.4, p) },
          { x0: 52, x: 64, y: 24, r: lerp(5.4, 6.4, p) },
        ],
        berries: p >= 0.5 ? [{ x: 72, y: 55, s: 0.7, rot: -14, ripe: 0, stem: 'M65 48 Q71 49 72 55' }] : [],
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
        berries: [
          { x: 27, y: 58, s: 0.95, rot: 16, ripe: 1, stem: 'M35 49 Q28 51 27 58' },
          { x: 73, y: 57, s: 0.95, rot: -16, ripe: 1, stem: 'M65 48 Q72 50 73 57' },
          { x: 57, y: 57, s: 0.8, rot: -6, ripe: lerp(0.4, 1, p), stem: 'M55 50 Q57 52 57 57' },
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
        berries: [
          ...EXTRA_BERRIES.slice(0, g.blooms),
          { x: 24, y: 58, s: 1, rot: 18, ripe: 1, stem: 'M33 48 Q25 50 24 58' },
          { x: 76, y: 56, s: 1, rot: -18, ripe: 1, stem: 'M67 47 Q75 49 76 56' },
          { x: 34, y: 64, s: 0.9, rot: 8, ripe: 1, stem: 'M40 52 Q35 56 34 64' },
          { x: 66, y: 63, s: 0.9, rot: -8, ripe: 1, stem: 'M60 51 Q65 55 66 63' },
          { x: 50, y: 59, s: 0.85, rot: 0, ripe: 1, stem: 'M50 51 Q50.6 54 50 59' },
        ],
      };
  }
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
        </g>
      ),
      front: pl.berries.length ? (
        <g>
          <Stems paths={pl.berries.map((b) => b.stem)} w={1.6} line={1.6} />
          {pl.berries.map((b, i) => (
            <Berry key={i} x={b.x} y={b.y} s={b.s} rot={b.rot} ripe={b.ripe} />
          ))}
        </g>
      ) : null,
    };
  },
};
