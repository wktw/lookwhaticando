import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, GREEN, Leaf, OUTLINE, PetalRing, STROKE, Shine, Stems, type LeafProps } from '../parts';
import { f, lerp, ramp } from '../math';
import { seedling, sprout } from '../early';

const PETAL = '#FFD65C';
const PETAL_BACK = '#F7BE3E';
const CENTER = '#B98A6E';
const STEM = '#8EC07C';

/** A sunflower head with a sleepy-happy face on its seed disc (always facing the bright side). */
function SunHead({ x, y, r, face = true }: { x: number; y: number; r: number; face?: boolean }) {
  const c = r * 0.46;
  return (
    <g>
      <PetalRing x={x} y={y} r={r} n={13} inner={c * 0.7} width={r * 0.17} fill={PETAL_BACK} rot={360 / 26} shape="oval" line={1.6} />
      <PetalRing x={x} y={y} r={r * 0.93} n={13} inner={c * 0.7} width={r * 0.17} fill={PETAL} shape="oval" line={1.6} />
      <circle cx={f(x)} cy={f(y)} r={f(c)} fill={CENTER} stroke={OUTLINE} stroke-width={STROKE * 0.9} />
      <circle cx={f(x)} cy={f(y)} r={f(c * 0.72)} fill="none" stroke="#A47760" stroke-width={1.1} stroke-dasharray="0.1 2.2" stroke-linecap="round" />
      {face ? (
        <g stroke={OUTLINE} stroke-width={1.3} stroke-linecap="round" fill="none">
          <path d={`M${f(x - c * 0.52)} ${f(y - c * 0.02)} q${f(c * 0.16)} ${f(-c * 0.24)} ${f(c * 0.32)} 0`} />
          <path d={`M${f(x + c * 0.2)} ${f(y - c * 0.02)} q${f(c * 0.16)} ${f(-c * 0.24)} ${f(c * 0.32)} 0`} />
          <path d={`M${f(x - c * 0.14)} ${f(y + c * 0.28)} q${f(c * 0.14)} ${f(c * 0.18)} ${f(c * 0.28)} 0`} />
          <g fill="#FF9FB8" stroke="none" opacity={0.75}>
            <ellipse cx={f(x - c * 0.62)} cy={f(y + c * 0.32)} rx={f(c * 0.2)} ry={f(c * 0.12)} />
            <ellipse cx={f(x + c * 0.62)} cy={f(y + c * 0.32)} rx={f(c * 0.2)} ry={f(c * 0.12)} />
          </g>
        </g>
      ) : (
        <circle cx={f(x + c * 0.2)} cy={f(y + c * 0.2)} r={f(c * 0.3)} fill="#A47760" />
      )}
      <Shine d={`M${f(x - c * 0.7)} ${f(y - c * 0.25)} Q${f(x - c * 0.55)} ${f(y - c * 0.7)} ${f(x - c * 0.1)} ${f(y - c * 0.78)}`} w={1.2} opacity={0.55} />
    </g>
  );
}

/** Closed bud: green sepals with yellow petal tips showing as `k` goes 0 → 1. */
function SunBud({ x, y, r, k }: { x: number; y: number; r: number; k: number }) {
  return (
    <g>
      {k > 0.2 && <PetalRing x={x} y={y} r={r * lerp(1.05, 1.3, k)} n={9} inner={r * 0.4} width={r * 0.2} fill={PETAL} shape="oval" rot={20} />}
      <PetalRing x={x} y={y} r={r * 1.15} n={7} inner={r * 0.3} width={r * 0.28} fill={GREEN.light} shape="oval" />
      <circle cx={f(x)} cy={f(y)} r={f(r * 0.7)} fill={GREEN.leaf} stroke={OUTLINE} stroke-width={FINE} />
      <Shine d={`M${f(x - r * 0.4)} ${f(y - r * 0.1)} Q${f(x - r * 0.35)} ${f(y - r * 0.4)} ${f(x - r * 0.05)} ${f(y - r * 0.45)}`} w={1.1} />
    </g>
  );
}

/** Pairs of heart-ish leaves stepping up a tall main stem, smaller toward the top, stem showing between. */
function leaves(g: Growth, top: number): LeafProps[] {
  const k = lerp(0.9, 1, ramp(g.t, 3, 5)) + ramp(g.t, 5, 7) * 0.12;
  const at = (fr: number) => lerp(62, top, fr);
  const list: LeafProps[] = [
    { x: 49.5, y: at(0.12), rot: -68, L: 18.5 * k, W: 6.8 * k, bend: -0.1 },
    { x: 50.5, y: at(0.2), rot: 66, L: 17.5 * k, W: 6.6 * k, bend: 0.1 },
    { x: 49.5, y: at(0.44), rot: -56, L: 15 * k, W: 5.6 * k, bend: -0.08 },
    { x: 50.5, y: at(0.52), rot: 58, L: 14.4 * k, W: 5.4 * k, bend: 0.08 },
  ];
  if (g.t >= 3.5) list.push({ x: 49.6, y: at(0.74), rot: -42, L: 11 * k, W: 4.4 * k }, { x: 50.4, y: at(0.8), rot: 44, L: 10.4 * k, W: 4.2 * k });
  return list;
}

interface Head {
  x: number;
  y: number;
  r: number;
  /** Stem path from the main stem. */
  stem?: string;
}

const EXTRA: Head[] = [
  { x: 36, y: 50, r: 5.6, stem: 'M49.6 57 Q42 55 36 50' },
  { x: 64, y: 49, r: 5.6, stem: 'M50.4 56 Q58 54 64 49' },
  { x: 18, y: 35, r: 5.4, stem: 'M26 43 Q21 40 18 35' },
  { x: 83, y: 29, r: 5.4, stem: 'M76 35 Q81 33 83 29' },
  { x: 38, y: 34, r: 5, stem: 'M49.6 40 Q43 38.6 38 34' },
  { x: 62, y: 44, r: 5, stem: 'M50.4 48 Q57 47.6 62 44' },
];

function heads(g: Growth): { top: number; list: Head[] } {
  const p = g.progress;
  switch (g.stage) {
    case 3:
      return { top: lerp(35, 30, p), list: [] };
    case 4:
      return { top: lerp(29, 27, p), list: [] };
    case 5:
      return { top: 27, list: [{ x: 50, y: 27, r: lerp(12, 13.6, p) }] };
    case 6:
      return {
        top: 23,
        list: [
          { x: 71, y: 40, r: lerp(8, 9, p), stem: 'M50.4 52 Q64 50 71 40' },
          { x: 49, y: 23, r: 14.6 },
        ],
      };
    default:
      return {
        top: 23,
        list: [
          ...EXTRA.slice(0, g.blooms),
          { x: 26, y: 43, r: 9, stem: 'M49.6 54 Q34 53 26 43' },
          { x: 74, y: 36, r: 10, stem: 'M50.4 50 Q67 48 74 36' },
          { x: 48.5, y: 23, r: 15.6 },
        ],
      };
  }
}

export const sunflower: PlantSpeciesArt = {
  seed: '#9C8574',
  seedStripes: '#F4E6CF',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    if (g.stage === 2) return seedling(g, { shape: 'spade' });
    const { top, list } = heads(g);
    const ls = leaves(g, top);
    const stems = [`M50 66 C50 ${f(lerp(66, top, 0.5))} ${f(lerp(50, list.at(-1)?.x ?? 50, 0.5))} ${f(top + 8)} ${f(list.at(-1)?.x ?? 50)} ${f(top)}`];
    for (const h of list) if (h.stem) stems.push(h.stem);
    const bud = g.stage === 4 ? <SunBud x={50} y={top} r={lerp(5.4, 7, g.progress)} k={g.progress} /> : null;
    return {
      back: (
        <g>
          <Stems paths={stems} w={3.6} color={STEM} />
          {ls.map((l, i) => (
            <Leaf key={i} shape="spade" {...l} />
          ))}
          {g.stage === 3 && <Leaf x={50} y={top + 1} rot={0} L={lerp(5, 8, g.progress)} W={2.6} shape="round" fill={GREEN.light} vein={null} />}
          {bud}
          {list.map((h, i) => (
            <SunHead key={i} x={h.x} y={h.y} r={h.r} face={h.r > 11} />
          ))}
        </g>
      ),
    };
  },
};
