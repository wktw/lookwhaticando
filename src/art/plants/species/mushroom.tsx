import type { Growth, PlantSpeciesArt } from '../types';
import { EYE } from '../../pets/geometry';
import { FINE, GREEN, Moss, OUTLINE, STROKE, Shine, Sparkle } from '../parts';
import { f, lerp } from '../math';

const STEM = '#FFF4E2';
const HERO = '#F7A1B2';
const TAN = '#EBC1A2';
const PEACH = '#FFC9A6';
const LILAC = '#D8C9F6';
const BUTTER = '#FFE3A3';

interface Shroom {
  x: number;
  h: number;
  r: number;
  cap: string;
  spots?: number;
  face?: boolean;
  /** Still a closed round button (a "bud") rather than an open cap. */
  button?: boolean;
  /** Leans out from its base (degrees), for the mushrooms at the edge of the patch. */
  lean?: number;
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
function Mushroom({ x, h, r, cap, spots = 0, face = false, button = false, lean = 0 }: Shroom) {
  const top = 64 - h;
  const dome = button
    ? `M${f(x - r)} ${f(top + r * 0.3)} C${f(x - r * 1.05)} ${f(top - r * 1.1)} ${f(x + r * 1.05)} ${f(top - r * 1.1)} ${f(x + r)} ${f(top + r * 0.3)} C${f(x + r * 0.7)} ${f(top + r * 0.75)} ${f(x - r * 0.7)} ${f(top + r * 0.75)} ${f(x - r)} ${f(top + r * 0.3)} Z`
    : `M${f(x - r)} ${f(top + r * 0.18)} C${f(x - r * 1.02)} ${f(top - r * 0.86)} ${f(x + r * 1.02)} ${f(top - r * 0.86)} ${f(x + r)} ${f(top + r * 0.18)} Q${f(x)} ${f(top - r * 0.14)} ${f(x - r)} ${f(top + r * 0.18)} Z`;
  const sw = r * 0.4;
  const line = r > 9 ? STROKE : r < 5 ? 1.6 : FINE;
  const eyeY = top + Math.min(h * 0.38, 7);
  return (
    <g stroke-linejoin="round" stroke-linecap="round" transform={lean ? `rotate(${lean} ${f(x)} 64)` : undefined}>
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
          <g fill={EYE}>
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

const HEART_LEAFLET = 'M0 -0.6 C-1 -1.8 -3.6 -2.6 -3.6 -4.8 C-3.6 -6.2 -2.5 -6.9 -1.6 -6.9 C-0.8 -6.9 -0.2 -6.4 0 -5.6 C0.2 -6.4 0.8 -6.9 1.6 -6.9 C2.5 -6.9 3.6 -6.2 3.6 -4.8 C3.6 -2.6 1 -1.8 0 -0.6 Z';

/** A little clover sprig: three separate heart leaflets, each with a soft unoutlined sheen. */
function Clover({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} Q${f(x - 0.6)} ${f(y + 3)} ${f(x - 0.2)} ${f(y + 6)}`} fill="none" stroke={OUTLINE} stroke-width={1.4} stroke-linecap="round" />
      <g transform={`translate(${x} ${y})`} fill={GREEN.light} stroke={OUTLINE} stroke-width={1.2} stroke-linejoin="round">
        {[-72, 0, 72].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d={HEART_LEAFLET} />
            <ellipse cx={-1.6} cy={-5} rx={0.7} ry={0.5} fill="#fff" stroke="none" opacity={0.75} />
          </g>
        ))}
      </g>
    </g>
  );
}

interface Patch {
  /** Behind the moss. */
  back: Shroom[];
  /** In front of the moss: the little ones. */
  front: Shroom[];
  moss: number;
  clover: boolean;
}

/** Extra little mushrooms popping up through the moss after Evergreen. */
const EXTRA: Shroom[] = [
  { x: 57.5, h: 7.4, r: 4, cap: LILAC, spots: 1 },
  { x: 35, h: 6.8, r: 3.8, cap: PEACH, spots: 1 },
  { x: 65.5, h: 6.8, r: 3.8, cap: TAN, spots: 1 },
  { x: 39.5, h: 5.4, r: 3.2, cap: BUTTER },
  { x: 61, h: 5.4, r: 3.2, cap: HERO },
  { x: 51.5, h: 5, r: 3.2, cap: PEACH },
];

/**
 * One cast that grows up together: tan (left), peach (right), lilac (far right), the pink hero with a
 * face (center, from Budding), a butter baby (far left) and a pink button (front). Each keeps its color
 * and side from stage to stage and only grows.
 */
function patch(g: Growth): Patch {
  const p = g.progress;
  switch (g.stage) {
    case 1:
      return {
        back: [
          { x: 56, h: lerp(10, 12, p), r: lerp(5, 5.8, p), cap: PEACH },
          { x: 45, h: lerp(13, 15, p), r: lerp(6.2, 7, p), cap: TAN },
        ],
        front: [],
        moss: 0,
        clover: false,
      };
    case 2:
      return {
        back: [
          { x: 65, h: lerp(6, 9, p), r: lerp(3.6, 4.6, p), cap: LILAC },
          { x: 57, h: 13, r: 6.4, cap: PEACH },
          { x: 44, h: lerp(16, 18, p), r: lerp(7.4, 8, p), cap: TAN, spots: p >= 0.5 ? 1 : 0 },
        ],
        front: [],
        moss: 0,
        clover: false,
      };
    case 3:
      return {
        back: [
          { x: 66, h: lerp(10, 12, p), r: 5.6, cap: LILAC },
          { x: 58, h: lerp(15, 17, p), r: 7.6, cap: PEACH, spots: p >= 0.5 ? 1 : 0 },
          { x: 42, h: 20, r: 8.8, cap: TAN, spots: 1 },
        ],
        front: [],
        moss: 0.8,
        clover: true,
      };
    case 4:
      return {
        back: [
          { x: 68, h: 12, r: 5.8, cap: LILAC, spots: 1, lean: 8 },
          { x: 60, h: 18, r: 8.4, cap: PEACH, spots: 1 },
          { x: 39, h: 21, r: 9, cap: TAN, spots: 1 },
        ],
        front: [{ x: 50, h: lerp(7, 10, p), r: lerp(5, 6.6, p), cap: HERO, spots: 2, button: true }],
        moss: 0.9,
        clover: true,
      };
    case 5:
      return {
        back: [
          { x: 69, h: 12, r: 5.8, cap: LILAC, spots: 1, lean: 12 },
          { x: 32, h: 7, r: 4.2, cap: BUTTER, lean: -12 },
          { x: 37, h: 20, r: 9, cap: TAN, spots: 1 },
          { x: 63, h: 18, r: 8.6, cap: PEACH, spots: 1 },
          { x: 50, h: lerp(26, 29, p), r: lerp(12, 13.4, p), cap: HERO, spots: 4, face: true },
        ],
        front: [],
        moss: 1,
        clover: true,
      };
    case 6:
      return {
        back: [
          { x: 69.5, h: 12, r: 6, cap: LILAC, spots: 2, lean: 14 },
          { x: 31, h: 9, r: 5, cap: BUTTER, spots: 1, lean: -14 },
          { x: 37, h: 22, r: 9.6, cap: TAN, spots: 2 },
          { x: 63, h: 20, r: 9.4, cap: PEACH, spots: 2 },
          { x: 50, h: lerp(31, 34, p), r: 14.6, cap: HERO, spots: 5, face: true },
        ],
        front: p >= 0.5 ? [{ x: 44, h: 6, r: 3.8, cap: HERO, spots: 1, button: true }] : [],
        moss: 1.1,
        clover: true,
      };
    default:
      return {
        back: [
          { x: 70, h: 13, r: 6.4, cap: LILAC, spots: 2, lean: 16 },
          { x: 30.5, h: 11, r: 5.8, cap: BUTTER, spots: 2, lean: -16 },
          { x: 37, h: 24, r: 10.2, cap: TAN, spots: 3 },
          { x: 63, h: 21, r: 9.8, cap: PEACH, spots: 3 },
          { x: 50, h: 38, r: 16.6, cap: HERO, spots: 6, face: true },
        ],
        front: [{ x: 44, h: 8, r: 4.6, cap: HERO, spots: 2 }, ...EXTRA.slice(0, g.blooms)],
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
          {pt.back.map((m, i) => (
            <Mushroom key={i} {...m} />
          ))}
          {g.stage >= 7 && (
            <g>
              <Sparkle x={27} y={34} s={0.55} fill="#FFF3C4" />
              <Sparkle x={73} y={28} s={0.5} fill="#FFF3C4" />
            </g>
          )}
        </g>
      ),
      ground: pt.moss ? (
        <g>
          <Moss w={17 * pt.moss} h={2.6 + pt.moss * 1.6} />
          {pt.clover && <Clover x={g.stage >= 5 ? 58 : 50} y={58.4} />}
          {pt.front.map((m, i) => (
            <Mushroom key={i} {...m} />
          ))}
        </g>
      ) : null,
    };
  },
};
