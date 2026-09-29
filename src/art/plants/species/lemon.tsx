import type { Growth, PlantSpeciesArt } from '../types';
import { Blob, Blossom, FINE, Leaf, OUTLINE, Shine, Stems, type Circle } from '../parts';
import { f, lerp, mix } from '../math';
import { seedling, sprout } from '../early';

const BARK = '#C49A86';
const CANOPY = '#98CB82';
const CANOPY_BACK = '#7FB86C';
const LEAF = '#9FD08A';
const LEMON = '#FFE066';
const UNRIPE = '#C9E79C';

/** A plump lemon with little nubs at both ends; `ripe` goes from green to sunny yellow. */
export function Lemon({ x, y, s = 1, rot = 0, ripe = 1 }: { x: number; y: number; s?: number; rot?: number; ripe?: number }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`} stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      <path
        d="M0 -6.2 Q0.7 -5.4 1.8 -5 C4 -4.2 4.8 -2 4.8 0 C4.8 2 4 4.2 1.8 5 Q0.7 5.4 0 6.2 Q-0.7 5.4 -1.8 5 C-4 4.2 -4.8 2 -4.8 0 C-4.8 -2 -4 -4.2 -1.8 -5 Q-0.7 -5.4 0 -6.2 Z"
        fill={mix(UNRIPE, LEMON, ripe)}
        stroke-width={f(FINE / s)}
      />
      <Shine d="M-2.8 -1.8 Q-2.6 -3.4 -1.2 -4" w={1.2 / s} />
      <Leaf x={0.4} y={-5.8} rot={50} L={5} W={2} fill={LEAF} vein={null} />
    </g>
  );
}

/** A round, bumpy canopy of radius R with a darker back layer for depth. */
function Canopy({ x, y, R }: { x: number; y: number; R: number }) {
  const ring = (n: number, k: number, r: number, squash: number, lift = 0): Circle[] =>
    Array.from({ length: n }, (_, i) => {
      const a = ((360 / n) * i * Math.PI) / 180;
      return [x + Math.cos(a) * R * k, y + Math.sin(a) * R * k * squash - lift, R * r] as const;
    });
  return (
    <g>
      <Blob circles={ring(7, 0.6, 0.36, 0.8, R * 0.12)} fill={CANOPY_BACK} />
      <Blob circles={[[x, y, R * 0.64], ...ring(10, 0.66, 0.33, 0.82)]} fill={CANOPY} />
      <g fill="none" stroke={CANOPY_BACK} stroke-width={1.3} stroke-linecap="round">
        <path d={`M${f(x - R * 0.42)} ${f(y + R * 0.2)} q${f(R * 0.1)} ${f(R * 0.1)} ${f(R * 0.2)} 0`} />
        <path d={`M${f(x + R * 0.18)} ${f(y - R * 0.36)} q${f(R * 0.1)} ${f(R * 0.1)} ${f(R * 0.2)} 0`} />
        <path d={`M${f(x + R * 0.3)} ${f(y + R * 0.32)} q${f(R * 0.1)} ${f(R * 0.1)} ${f(R * 0.2)} 0`} />
      </g>
      <Shine d={`M${f(x - R * 0.7)} ${f(y - R * 0.12)} Q${f(x - R * 0.6)} ${f(y - R * 0.52)} ${f(x - R * 0.22)} ${f(y - R * 0.68)}`} w={1.6} opacity={0.55} />
    </g>
  );
}

interface Tree {
  top: number;
  R: number;
  buds: [number, number][];
  blossoms: [number, number][];
  /** [x, y, scale, rotation, ripeness (default 1)] */
  lemons: [number, number, number, number, number?][];
}

/** Lemons after Evergreen, tucked around the canopy. */
const EXTRA: Tree['lemons'] = [
  [37, 24, 0.8, -20],
  [63, 20, 0.8, 16],
  [29, 38, 0.78, -10],
  [72, 36, 0.78, 12],
  [48, 13, 0.72, 4],
  [56, 42, 0.72, -8],
];

function tree(g: Growth): Tree {
  const p = g.progress;
  switch (g.stage) {
    case 3:
      return { top: lerp(42, 38, p), R: lerp(11, 13, p), buds: [], blossoms: [], lemons: [] };
    case 4:
      return {
        top: 34,
        R: lerp(14, 15.5, p),
        buds: (
          [
            [42, 30],
            [58, 27],
            [50, 40],
            [39, 40],
            [61, 38],
          ] as [number, number][]
        ).slice(0, 2 + Math.round(p * 3)),
        blossoms: [],
        lemons: [],
      };
    case 5:
      return {
        top: 30,
        R: 17,
        buds: [[60, 38]],
        blossoms: [
          [40, 27],
          [58, 23],
          [46, 38],
          [64, 31],
        ],
        lemons: p >= 0.5 ? [[40, 40, 0.62, -14, 0]] : [],
      };
    case 6:
      return {
        top: 27,
        R: 19,
        buds: [],
        blossoms: [
          [40, 20],
          [61, 17],
          [33, 33],
        ],
        lemons: [
          [44, 36, 0.95, -12],
          [62, 32, 1, 10],
          [53, 22, 0.85, 4],
        ],
      };
    default:
      return {
        top: 25,
        R: 21,
        buds: [],
        blossoms: [
          [37, 17],
          [62, 13],
          [30, 30],
          [70, 27],
        ],
        lemons: [
          [42, 33, 1, -14],
          [60, 30, 1.05, 12],
          [51, 19, 0.9, 4],
          [33, 42, 0.9, -10],
          [68, 40, 0.9, 10],
          ...EXTRA.slice(0, g.blooms),
        ],
      };
  }
}

export const lemon: PlantSpeciesArt = {
  seed: '#EFE3C4',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    if (g.stage === 2) return seedling(g, { leaf: LEAF });
    const t = tree(g);
    const cy = t.top + 2;
    const trunkW = lerp(3.6, 5.4, (g.stage - 3) / 4);
    return {
      back: (
        <g>
          <Stems paths={[`M50 66 C50 58 48.6 ${f(cy + 14)} 50 ${f(cy + 4)}`]} w={trunkW} color={BARK} />
          <Canopy x={50} y={cy - t.R * 0.3} R={t.R} />
          <g fill="#fff" stroke={OUTLINE} stroke-width={1.3}>
            {t.buds.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2} />
            ))}
          </g>
          {t.blossoms.map(([x, y], i) => (
            <Blossom key={i} x={x} y={y} r={3.6} petal="#FFFFFF" rot={i * 23} line={1.4} />
          ))}
          {t.lemons.map(([x, y, s, rot, ripe], i) => (
            <Lemon key={i} x={x} y={y} s={s} rot={rot} ripe={ripe ?? 1} />
          ))}
        </g>
      ),
    };
  },
};
