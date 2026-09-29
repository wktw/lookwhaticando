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

/** A green bud with white petal tips peeking out as it ripens (`k` 0 → 1). */
function DaisyBud({ x, y, k }: { x: number; y: number; k: number }) {
  const r = 4.2;
  return (
    <g stroke={OUTLINE} stroke-width={FINE} stroke-linejoin="round">
      <ellipse cx={f(x)} cy={f(y - r * 0.72)} rx={f(lerp(1.8, 3.6, k))} ry={f(lerp(1.3, 2.6, k))} fill={PETAL} />
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
        { x0: 50, x: 50.5, y: 17, r: 10.2 },
      ];
    default:
      return [];
  }
}

/** A mound of spoon-shaped leaves; fuller with every stage. */
function leaves(g: Growth): LeafProps[] {
  const k = lerp(0.82, 1, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.12;
  const fan: [number, number][] = [
    [-76, 16],
    [-50, 21],
    [-25, 25],
    [2, 27],
    [27, 24],
    [52, 20],
    [77, 15],
  ];
  if (g.t >= 3.5) fan.splice(3, 0, [-10, 22]);
  return fan.map(([rot, L], i) => ({
    x: 50 + rot * 0.05,
    y: 63.5,
    rot,
    L: L * k,
    W: 5.4,
    bend: rot * 0.0012,
    fill: i % 2 ? GREEN.back : GREEN.leaf,
  }));
}

export const daisy: PlantSpeciesArt = {
  seed: '#E9D6B4',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    if (g.stage === 2) return seedling(g, { shape: 'round' });
    const ls = leaves(g);
    const fs = flowers(g);
    const back = ls.filter((_, i) => i % 2);
    const front = ls.filter((_, i) => !(i % 2));
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
