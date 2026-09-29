import type { Growth, PlantSpeciesArt } from '../types';
import { Blob, Blossom, FINE, Leaf, OUTLINE, Shine, Stems, leafD, type Circle } from '../parts';
import { f, lerp, mix } from '../math';
import { seedling, sprout } from '../early';

const BARK = '#C49A86';
/** Glossy citrus green: a touch deeper than the other plants' leaves. */
const CANOPY = '#8CC67A';
const CANOPY_BACK = '#71AC61';
const LEAF = '#9FD08A';
const LEMON = '#FFE066';
const UNRIPE = '#C9E79C';

/** A plump lemon with little nubs at both ends; `ripe` goes from green to sunny yellow. */
function Lemon({ x, y, s = 1, rot = 0, ripe = 1 }: { x: number; y: number; s?: number; rot?: number; ripe?: number }) {
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

/** Pointed lemon leaves poking out of the canopy edge: [angle° from the top, clockwise]. */
const EDGE_LEAVES = [-118, 66, 118];

/** A round, bumpy, glossy canopy of radius R with a darker back layer and pointed citrus leaves at the edge. */
function Canopy({ x, y, R }: { x: number; y: number; R: number }) {
  const ring = (n: number, k: number, r: number, squash: number, lift = 0): Circle[] =>
    Array.from({ length: n }, (_, i) => {
      const a = ((360 / n) * i * Math.PI) / 180;
      return [x + Math.cos(a) * R * k, y + Math.sin(a) * R * k * squash - lift, R * r] as const;
    });
  const edge = EDGE_LEAVES.map((deg) => {
    const a = (deg * Math.PI) / 180;
    const L = R * 0.88;
    return { d: leafD('lance', L, L * 0.36, deg > 0 ? 0.12 : -0.12), transform: `translate(${f(x + Math.sin(a) * R * 0.5)} ${f(y - Math.cos(a) * R * 0.46)}) rotate(${deg})` };
  });
  return (
    <g>
      <g fill={CANOPY_BACK} stroke={OUTLINE} stroke-width={FINE} stroke-linejoin="round">
        {edge.map((l, i) => (
          <path key={i} d={l.d} transform={l.transform} />
        ))}
      </g>
      <Blob circles={ring(7, 0.6, 0.36, 0.8, R * 0.12)} fill={CANOPY_BACK} />
      <Blob circles={[[x, y, R * 0.64], ...ring(10, 0.66, 0.33, 0.82)]} fill={CANOPY} />
      <g fill="none" stroke={CANOPY_BACK} stroke-width={1.3} stroke-linecap="round">
        <path d={`M${f(x - R * 0.42)} ${f(y + R * 0.2)} q${f(R * 0.1)} ${f(R * 0.1)} ${f(R * 0.2)} 0`} />
        <path d={`M${f(x + R * 0.18)} ${f(y - R * 0.36)} q${f(R * 0.1)} ${f(R * 0.1)} ${f(R * 0.2)} 0`} />
        <path d={`M${f(x + R * 0.3)} ${f(y + R * 0.32)} q${f(R * 0.1)} ${f(R * 0.1)} ${f(R * 0.2)} 0`} />
      </g>
      <Shine d={`M${f(x - R * 0.7)} ${f(y - R * 0.12)} Q${f(x - R * 0.6)} ${f(y - R * 0.52)} ${f(x - R * 0.22)} ${f(y - R * 0.68)}`} w={1.8} opacity={0.7} />
      <circle cx={f(x - R * 0.2)} cy={f(y - R * 0.5)} r={f(R * 0.06)} fill="#fff" opacity={0.7} />
    </g>
  );
}

/** A young grafted trunk: thin, with the little graft knot a nursery tree has. */
function Trunk({ top, w }: { top: number; w: number }) {
  return (
    <g>
      <Stems paths={[`M50 66 C50 58 48.6 ${f(top + 14)} 50 ${f(top + 4)}`]} w={w} color={BARK} />
      <ellipse cx={49.7} cy={56.6} rx={f(w * 0.5 + 1.5)} ry={1.9} fill={BARK} stroke={OUTLINE} stroke-width={1.5} />
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
  [37, 29, 0.8, -20],
  [63, 25, 0.8, 16],
  [29, 42, 0.78, -10],
  [72, 40, 0.78, 12],
  [47, 18, 0.72, 4],
  [57, 46, 0.72, -8],
];

function tree(g: Growth): Tree {
  const p = g.progress;
  switch (g.stage) {
    case 3:
      return { top: lerp(42, 38, p), R: lerp(11.5, 13.5, p), buds: [], blossoms: [], lemons: [] };
    case 4:
      return {
        top: 35,
        R: lerp(14, 15.5, p),
        buds: (
          [
            [42, 31],
            [58, 28],
            [50, 41],
            [39, 41],
            [61, 39],
          ] as [number, number][]
        ).slice(0, 2 + Math.round(p * 3)),
        blossoms: [],
        lemons: [],
      };
    case 5:
      return {
        top: 32,
        R: 16.6,
        buds: [[60, 40]],
        blossoms: [
          [40, 29],
          [58, 25],
          [46, 40],
          [64, 33],
        ],
        lemons: p >= 0.5 ? [[40, 42, 0.62, -14, 0]] : [],
      };
    case 6:
      return {
        top: 32,
        R: lerp(17.6, 18.2, p),
        buds: [],
        blossoms: [
          [40, 25],
          [61, 22],
          [33, 38],
        ],
        lemons: [
          [44, 41, 0.95, -12],
          [62, 37, 1, 10],
          [53, 27, 0.85, 4],
          ...(p >= 0.5 ? [[35, 47, 0.8, -8, 0.5] as Tree['lemons'][number]] : []),
        ],
      };
    default:
      return {
        top: 31,
        R: 19,
        buds: [],
        blossoms: [
          [37, 22],
          [62, 18],
          [30, 35],
          [70, 32],
        ],
        lemons: [
          [42, 38, 1, -14],
          [60, 35, 1.05, 12],
          [51, 24, 0.9, 4],
          [34, 47, 0.9, -10],
          [67, 45, 0.9, 10],
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
    const trunkW = lerp(2.8, 5, (g.stage - 3) / 4);
    return {
      back: (
        <g>
          <Trunk top={cy} w={trunkW} />
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
