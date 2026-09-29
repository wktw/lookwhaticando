import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, GREEN, Leaf, Moss, OUTLINE, STROKE, Shine, Sparkle } from '../parts';
import { f, lerp } from '../math';

const STEM = '#FFF4E2';
const HERO = '#F7A1B2';
const TAN = '#EBC1A2';
const PEACH = '#FFC9A6';
const LILAC = '#D8C9F6';

interface Shroom {
  x: number;
  h: number;
  r: number;
  cap: string;
  spots?: number;
  face?: boolean;
  /** Still a closed round button (a "bud") rather than an open cap. */
  button?: boolean;
}

const SPOTS: [number, number, number][] = [
  [-0.42, -0.36, 0.17],
  [0.22, -0.52, 0.2],
  [0.62, -0.14, 0.13],
  [-0.06, -0.12, 0.11],
  [-0.72, -0.06, 0.1],
  [0.38, -0.3, 0.09],
];

/** A mushroom rising from the soil at x: cream stem, domed cap with optional spots and face. */
function Mushroom({ x, h, r, cap, spots = 0, face = false, button = false }: Shroom) {
  const top = 64 - h;
  const dome = button
    ? `M${f(x - r)} ${f(top + r * 0.3)} C${f(x - r * 1.05)} ${f(top - r * 1.1)} ${f(x + r * 1.05)} ${f(top - r * 1.1)} ${f(x + r)} ${f(top + r * 0.3)} C${f(x + r * 0.7)} ${f(top + r * 0.75)} ${f(x - r * 0.7)} ${f(top + r * 0.75)} ${f(x - r)} ${f(top + r * 0.3)} Z`
    : `M${f(x - r)} ${f(top + r * 0.18)} C${f(x - r * 1.02)} ${f(top - r * 0.86)} ${f(x + r * 1.02)} ${f(top - r * 0.86)} ${f(x + r)} ${f(top + r * 0.18)} Q${f(x)} ${f(top - r * 0.14)} ${f(x - r)} ${f(top + r * 0.18)} Z`;
  const sw = r * 0.4;
  const line = r > 9 ? STROKE : FINE;
  const eyeY = top + Math.min(h * 0.38, 7);
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <path
        d={`M${f(x - sw * 1.15)} 66 C${f(x - sw * 1.25)} ${f(top + h * 0.45)} ${f(x - sw)} ${f(top + 2)} ${f(x - sw * 0.9)} ${f(top - r * 0.3)} L${f(x + sw * 0.9)} ${f(top - r * 0.3)} C${f(x + sw)} ${f(top + 2)} ${f(x + sw * 1.25)} ${f(top + h * 0.45)} ${f(x + sw * 1.15)} 66 Z`}
        fill={STEM}
        stroke={OUTLINE}
        stroke-width={line}
      />
      <path
        d={dome}
        fill={cap}
        stroke={OUTLINE}
        stroke-width={line}
      />
      <g fill="#fff">
        {SPOTS.slice(0, spots).map(([dx, dy, s], i) => (
          <ellipse key={i} cx={f(x + dx * r)} cy={f(top + dy * r)} rx={f(s * r)} ry={f(s * r * 0.8)} />
        ))}
      </g>
      <Shine d={`M${f(x - r * 0.72)} ${f(top - r * 0.12)} Q${f(x - r * 0.62)} ${f(top - r * 0.5)} ${f(x - r * 0.25)} ${f(top - r * 0.62)}`} w={r > 6 ? 1.5 : 1.1} opacity={0.6} />
      {face && (
        <g>
          <g fill="#FF9FB8" opacity={0.65}>
            <ellipse cx={f(x - sw * 0.72)} cy={f(eyeY + 2.8)} rx={1.9} ry={1.1} />
            <ellipse cx={f(x + sw * 0.72)} cy={f(eyeY + 2.8)} rx={1.9} ry={1.1} />
          </g>
          <g fill="#4A3540">
            <ellipse cx={f(x - sw * 0.42)} cy={f(eyeY)} rx={1.2} ry={1.55} />
            <ellipse cx={f(x + sw * 0.42)} cy={f(eyeY)} rx={1.2} ry={1.55} />
          </g>
          <g fill="#fff">
            <circle cx={f(x - sw * 0.42 + 0.45)} cy={f(eyeY - 0.6)} r={0.45} />
            <circle cx={f(x + sw * 0.42 + 0.45)} cy={f(eyeY - 0.6)} r={0.45} />
          </g>
          <path d={`M${f(x - 1.2)} ${f(eyeY + 1.8)} Q${f(x)} ${f(eyeY + 3)} ${f(x + 1.2)} ${f(eyeY + 1.8)}`} fill="none" stroke={OUTLINE} stroke-width={1} />
        </g>
      )}
    </g>
  );
}

/** A little three-leaf clover sprig. */
function Clover({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} Q${x - 0.6} ${y + 3} ${x - 0.2} ${y + 6}`} fill="none" stroke={OUTLINE} stroke-width={1.5} stroke-linecap="round" />
      <Leaf x={x} y={y} rot={-60} L={5.6} W={2.8} shape="round" fill={GREEN.light} vein={null} />
      <Leaf x={x} y={y} rot={60} L={5.6} W={2.8} shape="round" fill={GREEN.light} vein={null} />
      <Leaf x={x} y={y} rot={0} L={6} W={2.9} shape="round" fill={GREEN.light} vein={null} />
    </g>
  );
}

interface Patch {
  shrooms: Shroom[];
  moss: number;
  clover: boolean;
}

/** Extra little mushrooms popping up after Evergreen. */
const EXTRA: Shroom[] = [
  { x: 41, h: 9, r: 4.4, cap: TAN, spots: 2 },
  { x: 59.5, h: 8.6, r: 4.2, cap: PEACH, spots: 2 },
  { x: 30, h: 8, r: 4.2, cap: HERO, spots: 2 },
  { x: 70.5, h: 7.6, r: 4, cap: HERO, spots: 2 },
  { x: 43.5, h: 22, r: 3.8, cap: PEACH },
  { x: 57, h: 19, r: 3.8, cap: TAN },
];

function patch(g: Growth): Patch {
  const p = g.progress;
  switch (g.stage) {
    case 1:
      return {
        shrooms: [
          { x: 45, h: lerp(10, 12.5, p), r: lerp(5, 5.8, p), cap: TAN },
          { x: 55, h: lerp(8, 10, p), r: lerp(4.2, 5, p), cap: PEACH },
        ],
        moss: 0,
        clover: false,
      };
    case 2:
      return {
        shrooms: [
          ...(p >= 0.5 ? [{ x: 38.5, h: 7.4, r: 3.8, cap: LILAC }] : []),
          { x: 56, h: 11.5, r: 5.4, cap: PEACH },
          { x: 46, h: lerp(13, 16, p), r: lerp(6, 6.8, p), cap: TAN },
        ],
        moss: 0,
        clover: false,
      };
    case 3:
      return {
        shrooms: [
          { x: 63, h: 11, r: 5.8, cap: LILAC },
          { x: 42, h: 15, r: 7.8, cap: TAN },
          { x: 54, h: lerp(18, 21, p), r: 8.8, cap: PEACH, spots: p >= 0.5 ? 1 : 0 },
        ],
        moss: 0.8,
        clover: true,
      };
    case 4:
      return {
        shrooms: [
          { x: 64, h: 13, r: 6.4, cap: LILAC },
          { x: 38, h: 17, r: 8, cap: TAN, spots: 1 },
          { x: 57, h: 22, r: 9.2, cap: PEACH, spots: 1 },
          { x: 47.5, h: lerp(8, 12, p), r: lerp(5.2, 7, p), cap: HERO, spots: 2, button: true },
          { x: 70.5, h: lerp(6, 8, p), r: lerp(3.4, 4, p), cap: HERO, spots: 1, button: true },
        ],
        moss: 0.9,
        clover: true,
      };
    case 5:
      return {
        shrooms: [
          { x: 35, h: 15, r: 7.6, cap: TAN, spots: 1 },
          { x: 65.5, h: 13, r: 6.8, cap: LILAC, spots: 1 },
          { x: 27, h: 7, r: 4.2, cap: PEACH },
          { x: 50, h: lerp(26, 29, p), r: lerp(12, 13.4, p), cap: HERO, spots: 4, face: true },
        ],
        moss: 1,
        clover: true,
      };
    case 6:
      return {
        shrooms: [
          { x: 73, h: 8, r: 4.6, cap: PEACH },
          { x: 26, h: 9, r: 5.2, cap: TAN },
          { x: 34, h: 20, r: 9.2, cap: PEACH, spots: 3 },
          { x: 66.5, h: 17, r: 8.8, cap: LILAC, spots: 2 },
          ...(p >= 0.5 ? [{ x: 59, h: 8, r: 4, cap: HERO, spots: 1, button: true }] : []),
          { x: 50, h: lerp(31, 34, p), r: 14.6, cap: HERO, spots: 5, face: true },
        ],
        moss: 1.1,
        clover: true,
      };
    default:
      return {
        shrooms: [
          ...EXTRA.slice(0, g.blooms),
          { x: 76.5, h: 10, r: 5.6, cap: TAN, spots: 1 },
          { x: 23.5, h: 11, r: 6.2, cap: LILAC, spots: 2 },
          { x: 33, h: 24, r: 10.2, cap: PEACH, spots: 3 },
          { x: 67.5, h: 20, r: 9.8, cap: LILAC, spots: 3 },
          { x: 50, h: 40, r: 16.6, cap: HERO, spots: 6, face: true },
        ],
        moss: 1.2,
        clover: true,
      };
  }
}

export const mushroom: PlantSpeciesArt = {
  seed: '#E6D2BE',
  render: (g) => {
    const pt = patch(g);
    return {
      back: (
        <g>
          {pt.shrooms.map((s, i) => (
            <Mushroom key={i} {...s} />
          ))}
          {g.stage >= 7 && (
            <g>
              <Sparkle x={30} y={30} s={0.55} fill="#FFF3C4" />
              <Sparkle x={72} y={25} s={0.5} fill="#FFF3C4" />
            </g>
          )}
        </g>
      ),
      ground: pt.moss ? (
        <g>
          <Moss w={17 * pt.moss} h={4 + pt.moss * 2} />
          {pt.clover && <Clover x={g.stage >= 5 ? 41.5 : 47.5} y={56} />}
        </g>
      ) : null,
    };
  },
};
