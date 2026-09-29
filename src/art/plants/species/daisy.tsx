import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, GREEN, Leaf, OUTLINE, PetalRing, Shine, Stems, stemD, type LeafProps } from '../parts';
import { f, lerp, ramp } from '../math';
import { seedling, sprout } from '../early';

const PETAL = '#FFFFFF';
const CENTER = '#FFD65C';

/** Classic daisy: white petals around a butter-yellow button. */
function DaisyHead({ x, y, r, rot = 0, petal = PETAL }: { x: number; y: number; r: number; rot?: number; petal?: string }) {
  const c = r * 0.36;
  return (
    <g>
      <PetalRing x={x} y={y} r={r} n={12} inner={c * 0.6} width={r * 0.17} fill={petal} rot={rot} line={1.7} />
      <circle cx={f(x)} cy={f(y)} r={f(c)} fill={CENTER} stroke={OUTLINE} stroke-width={FINE} />
      <circle cx={f(x + c * 0.25)} cy={f(y + c * 0.3)} r={f(c * 0.28)} fill="#F6C544" />
      <Shine d={`M${f(x - c * 0.55)} ${f(y - c * 0.1)} Q${f(x - c * 0.5)} ${f(y - c * 0.55)} ${f(x - c * 0.1)} ${f(y - c * 0.6)}`} w={1.1} />
    </g>
  );
}

/** A green bud with white petal tips peeking out as it ripens (`k` 0 → 1). A finer line keeps it from reading as a knot. */
function DaisyBud({ x, y, k }: { x: number; y: number; k: number }) {
  const r = 4.4;
  return (
    <g stroke={OUTLINE} stroke-width={1.5} stroke-linejoin="round">
      <ellipse cx={f(x)} cy={f(y - r * 0.72)} rx={f(lerp(2, 3.8, k))} ry={f(lerp(1.4, 2.8, k))} fill={PETAL} />
      <circle cx={f(x)} cy={f(y)} r={r} fill={GREEN.light} />
      <path d={`M${f(x - r * 0.6)} ${f(y + r * 0.2)} L${f(x)} ${f(y - r * 0.3)} L${f(x + r * 0.6)} ${f(y + r * 0.2)}`} fill="none" stroke={GREEN.vein} stroke-width={1.1} stroke-linecap="round" />
    </g>
  );
}

interface Flower {
  x0: number;
  x: number;
  y: number;
  /** Petal radius, or a bud when omitted. */
  r?: number;
  bud?: number;
}

const EXTRA: Flower[] = [
  { x0: 47, x: 38, y: 47, r: 6.2 },
  { x0: 53, x: 62, y: 46, r: 6.2 },
  { x0: 45, x: 18, y: 55, r: 5.8 },
  { x0: 55, x: 82, y: 54, r: 5.8 },
  { x0: 49, x: 43, y: 35, r: 5.6 },
  { x0: 51, x: 58, y: 36, r: 5.6 },
];

function flowers(g: Growth): Flower[] {
  const p = g.progress;
  switch (g.stage) {
    case 4:
      return [
        { x0: 47, x: 41, y: lerp(36, 31, p), bud: p * 0.6 },
        { x0: 53, x: 59.5, y: lerp(39, 34, p), bud: p * 0.4 },
        ...(p >= 0.5 ? [{ x0: 50, x: 50.5, y: 27, bud: (p - 0.5) * 0.8 }] : []),
      ];
    case 5:
      return [
        { x0: 47, x: 38, y: 37, bud: 0.4 + p * 0.4 },
        ...(p >= 0.5 ? [{ x0: 53, x: 62, y: 39, bud: p * 0.6 }] : []),
        { x0: 50, x: 50.5, y: 25, r: lerp(7.5, 9.5, p) },
      ];
    case 6:
      return [
        { x0: 48, x: 43, y: 44, bud: 0.5 },
        ...(p >= 0.5 ? [{ x0: 52, x: 58, y: 45, bud: 0.7 }] : []),
        { x0: 47, x: 34, y: 32, r: 8.6 },
        { x0: 53, x: 66, y: 30, r: 8.6 },
        { x0: 50, x: 50.5, y: 20, r: 9.8 },
      ];
    case 7:
      return [
        ...EXTRA.slice(0, g.blooms),
        { x0: 46, x: 24, y: 43, r: 7.6 },
        { x0: 54, x: 76, y: 41, r: 7.6 },
        { x0: 47, x: 33, y: 28, r: 9 },
        { x0: 53, x: 67, y: 26, r: 9 },
        { x0: 50, x: 50.5, y: 18.5, r: 10.2 },
      ];
    default:
      return [];
  }
}

/** Spoon leaves as [rotation, length, in the back row]; each keeps its row and color as the mound fills in. */
const FAN: [number, number, boolean][] = [
  [-76, 16, false],
  [-50, 21, true],
  [-25, 25, false],
  [2, 27, true],
  [27, 24, false],
  [52, 20, true],
  [77, 15, false],
];
/** The leaf that joins at progress .5 of Leafy, tucked into the back row. */
const LATE_LEAF: [number, number, boolean] = [-10, 23, true];

/** A mound of spoon-shaped leaves in two rows; fuller with every stage. */
function leaves(g: Growth): { back: LeafProps[]; front: LeafProps[] } {
  const k = lerp(1, 1.12, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.08;
  const fan = g.t >= 3.5 ? [...FAN, LATE_LEAF] : FAN;
  const rows = { back: [] as LeafProps[], front: [] as LeafProps[] };
  for (const [rot, L, back] of fan) {
    rows[back ? 'back' : 'front'].push({ x: 50 + rot * 0.05, y: 63.5, rot, L: L * k, W: 5.8, bend: rot * 0.0012, fill: back ? GREEN.back : GREEN.leaf });
  }
  return rows;
}

export const daisy: PlantSpeciesArt = {
  seed: '#E9D6B4',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    if (g.stage === 2) return seedling(g, { shape: 'round' });
    const { back, front } = leaves(g);
    const fs = flowers(g);
    return {
      back: (
        <g>
          {back.map((l, i) => (
            <Leaf key={i} shape="round" {...l} />
          ))}
          <Stems paths={fs.map((b) => stemD(b.x0, b.x, b.y + 2))} w={2.2} />
          {front.map((l, i) => (
            <Leaf key={i} shape="round" {...l} />
          ))}
          {fs.map((b, i) => (b.r ? <DaisyHead key={i} x={b.x} y={b.y} r={b.r} rot={i * 9} /> : <DaisyBud key={i} x={b.x} y={b.y} k={b.bud ?? 0} />))}
        </g>
      ),
    };
  },
};
