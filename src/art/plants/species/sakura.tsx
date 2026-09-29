import type { Growth, PlantSpeciesArt } from '../types';
import { Blob, Blossom, Moss, OUTLINE, Stems, type Circle } from '../parts';
import { f, lerp } from '../math';
import { seedling, sprout } from '../early';

const BARK = '#BF907C';
const PAD = '#A6D48F';
const PINK = '#FFC4D3';
const PINK_LIGHT = '#FFDDE6';
const PETAL = '#FFEFF3';

/** A flat-bottomed foliage pad (the classic bonsai "cloud"), `w` wide. */
function padCircles(x: number, y: number, w: number): Circle[] {
  const r = w * 0.24;
  return [
    [x - w * 0.34, y + r * 0.2, r * 0.95],
    [x + w * 0.34, y + r * 0.2, r * 0.95],
    [x - w * 0.14, y - r * 0.35, r * 1.1],
    [x + w * 0.16, y - r * 0.3, r * 1.05],
    [x, y + r * 0.3, r],
  ];
}

interface Pad {
  x: number;
  y: number;
  w: number;
  /** 0 = green leaves, 1 = full pink blossom cloud. */
  bloom: number;
}

interface Tree {
  trunk: string[];
  pads: Pad[];
  /** Tiny pink buds dotted over green pads. */
  buds: [number, number][];
  flowers: [number, number, number][];
  petals: [number, number, number][];
}

/** Soft pink flecks for pads caught between green and full bloom. */
function PadBlossoms({ pad }: { pad: Pad }) {
  if (pad.bloom <= 0 || pad.bloom >= 1) return null;
  const spots = padCircles(pad.x, pad.y, pad.w).slice(0, Math.max(1, Math.round(pad.bloom * 5)));
  return <Blob circles={spots.map(([x, y, r]) => [x, y - r * 0.15, r * 0.55] as const)} fill={PINK} line={1.6} />;
}

const EXTRA_FLOWERS: [number, number, number][] = [
  [27, 40, 3],
  [73, 34, 3],
  [44, 22, 2.8],
  [62, 16, 2.8],
  [36, 30, 2.6],
  [58, 36, 2.6],
];

function tree(g: Growth): Tree {
  const p = g.progress;
  switch (g.stage) {
    case 3:
      return {
        trunk: ['M50 66 C49 58 44 55 45 49 C46 44 52 43 52 38', 'M45.6 50 C42 48 39 48 37 46'],
        pads: [
          { x: 37, y: 45, w: lerp(14, 17, p), bloom: 0 },
          { x: 53, y: 36, w: lerp(17, 21, p), bloom: 0 },
        ],
        buds: [],
        flowers: [],
        petals: [],
      };
    case 4:
      return {
        trunk: ['M50 66 C49 56 42 53 44 45 C46 38 54 38 53 31', 'M44.4 47 C40 45 36 45 33 43', 'M50.6 38.6 C56 38 62 39 66 37'],
        pads: [
          { x: 33, y: 42, w: 17, bloom: 0 },
          { x: 67, y: 36, w: 17, bloom: 0 },
          { x: 53, y: 29, w: 22, bloom: 0 },
        ],
        buds: (
          [
            [28, 38],
            [36, 37],
            [48, 23],
            [58, 24],
            [63, 32],
            [71, 31],
            [53, 20],
          ] as [number, number][]
        ).slice(0, 3 + Math.round(p * 4)),
        flowers: [],
        petals: [],
      };
    case 5:
      return {
        trunk: ['M50 66 C49 56 41 53 43 44 C45 36 55 37 53 28', 'M43.6 46 C39 44 35 44 31 42', 'M50.4 36.6 C56 36 63 37 68 35'],
        pads: [
          { x: 31, y: 41, w: 18, bloom: lerp(0.2, 0.6, p) },
          { x: 68, y: 34, w: 18, bloom: lerp(0.4, 0.8, p) },
          { x: 53, y: 26, w: 24, bloom: 1 },
        ],
        buds: [],
        flowers: [
          [45, 20, 3.2],
          [60, 22, 3],
        ],
        petals: [],
      };
    case 6:
      return {
        trunk: ['M50 66 C49 55 40 52 42 43 C44 34 56 35 53 25', 'M42.6 45 C38 43 33 43 28 41', 'M50.6 34.6 C57 34 64 35 70 32'],
        pads: [
          { x: 28, y: 40, w: 20, bloom: 1 },
          { x: 70, y: 31, w: 20, bloom: 1 },
          { x: 52, y: 22, w: 26, bloom: 1 },
          ...(p >= 0.5 ? [{ x: 40, y: 34, w: 13, bloom: 1 }] : []),
        ],
        buds: [],
        flowers: [
          [44, 16, 3.2],
          [60, 18, 3],
          [24, 36, 2.8],
          [74, 27, 2.8],
        ],
        petals: [
          [18, 54, 20],
          [80, 48, -30],
        ],
      };
    default:
      return {
        trunk: ['M50 66 C49 55 39 51 41 42 C43 32 57 33 53 22', 'M41.6 44 C36 42 31 42 25 40', 'M50.8 32.6 C58 32 66 33 73 30', 'M45 36 C44 32 41 30 38 28'],
        pads: [
          { x: 25, y: 39, w: 22, bloom: 1 },
          { x: 74, y: 29, w: 22, bloom: 1 },
          { x: 37, y: 27, w: 17, bloom: 1 },
          { x: 53, y: 18, w: 28, bloom: 1 },
        ],
        buds: [],
        flowers: [
          [45, 11, 3.4],
          [62, 13, 3.2],
          [20, 35, 3],
          [79, 25, 3],
          [34, 22, 2.8],
          ...EXTRA_FLOWERS.slice(0, g.blooms),
        ],
        petals: [
          [14, 56, 20],
          [86, 46, -30],
          [80, 60, 60],
        ],
      };
  }
}

export const sakura: PlantSpeciesArt = {
  seed: '#C79B83',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    if (g.stage === 2) return seedling(g, { leaf: PAD, shape: 'round' });
    const t = tree(g);
    return {
      back: (
        <g>
          <Stems paths={t.trunk} w={g.stage >= 6 ? 5.6 : 4.8} color={BARK} />
          {t.pads.map((pad, i) => (
            <g key={i}>
              <Blob circles={padCircles(pad.x, pad.y, pad.w)} fill={pad.bloom >= 1 ? PINK : PAD} line={2.2} />
              <PadBlossoms pad={pad} />
              {pad.bloom >= 1 && (
                <g fill={PINK_LIGHT}>
                  {padCircles(pad.x - pad.w * 0.1, pad.y - pad.w * 0.1, pad.w * 0.5).map(([x, y, r], j) => (
                    <circle key={j} cx={f(x)} cy={f(y)} r={f(r)} />
                  ))}
                </g>
              )}
            </g>
          ))}
          <g fill="#F58CAA" stroke={OUTLINE} stroke-width={1.2}>
            {t.buds.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={1.9} />
            ))}
          </g>
          {t.flowers.map(([x, y, r], i) => (
            <Blossom key={i} x={x} y={y} r={r} petal={PETAL} center="#F58CAA" rot={i * 17} line={1.4} />
          ))}
          {t.petals.map(([x, y, rot], i) => (
            <ellipse key={i} cx={0} cy={0} rx={2.4} ry={1.5} transform={`translate(${f(x)} ${f(y)}) rotate(${rot})`} fill={PINK} stroke={OUTLINE} stroke-width={1.1} />
          ))}
        </g>
      ),
      ground: <Moss w={10} h={5} />,
    };
  },
};
