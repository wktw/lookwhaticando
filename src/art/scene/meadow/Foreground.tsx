import { memo } from 'preact/compat';
import { OUTLINE } from '@/art/pets/geometry';
import type { ScenePalette } from '../palette';
import { seeded } from '../paths';
import { useUid } from '../uid';
import s from './meadow.module.css';

/**
 * Foreground framing along the front edge: a scalloped fringe of grass and flowers across the
 * bottom, and a flowering bush tucked into each bottom corner. It frames the meadow while leaving
 * the middle clear for pets. Lives in the ground layer: in front of pets that stray to the very
 * edge, behind the planter box.
 */

/** Fringe canvas: 6000×120, centred and scaled like the land (10 units to 1U). */
const FRINGE_H = 120;
const FRINGE_BASE = 104;

/** Soft scallops of grass along the front edge, with a few blades poking up between them. */
function fringePath(): string {
  const rand = seeded(11);
  let d = `M-100 ${FRINGE_H} L-100 ${FRINGE_BASE}`;
  for (let x = -100; x < 6100; ) {
    const w = 46 + rand() * 30;
    const peak = FRINGE_BASE - 24 - rand() * 16;
    d += ` Q${(x + w / 2).toFixed(1)} ${(2 * peak - FRINGE_BASE).toFixed(1)} ${(x + w).toFixed(1)} ${FRINGE_BASE}`;
    x += w;
  }
  return `${d} L6100 ${FRINGE_H} Z`;
}
const FRINGE = fringePath();
/** A three-blade tuft standing on the scallops, placed per tile: [x, y, scale]. */
const TUFT = 'M-9 0 C-9 -6 -7 -11 -4 -16 C-3 -10 -2 -6 -1 -2 C-0.5 -9 1 -16 3.5 -21 C5 -13 4.5 -7 3.2 -2 C5.4 -7 8.4 -10 11.4 -11 C9.6 -7 8.6 -3.5 8.4 0 Z';

/** Flowers along the fringe for one 2000-wide tile: [x, y, petal, scale]. */
const FRINGE_FLOWERS: readonly (readonly [x: number, y: number, petal: string, k: number])[] = [
  [2060, 84, '#FFFDF7', 1], [2210, 90, '#FFC4D3', 0.9], [2380, 80, '#FFE593', 1.1], [2560, 88, '#FFFDF7', 0.9], [2700, 82, '#E4D6FA', 1],
  [2880, 90, '#FFC4D3', 1], [3240, 86, '#FFFDF7', 1.1], [3420, 80, '#FFE593', 0.9], [3600, 90, '#FFC4D3', 1], [3760, 84, '#FFFDF7', 0.9],
  [3920, 88, '#E4D6FA', 1.1],
];
const FRINGE_TUFTS: readonly (readonly [x: number, y: number, k: number])[] = [
  [2130, 96, 1.1], [2470, 94, 0.9], [2790, 97, 1.2], [3100, 95, 1], [3330, 96, 0.9], [3680, 94, 1.1], [3850, 97, 1],
];

const PETAL_RING = [0, 72, 144, 216, 288].map((a) => [Math.sin((a * Math.PI) / 180) * 5.4, -Math.cos((a * Math.PI) / 180) * 5.4] as const);

function Bloom({ petal, bloom }: { petal: string; bloom: number }) {
  return (
    <g stroke={OUTLINE} stroke-width={1.6}>
      <g fill={petal} opacity={bloom}>
        {PETAL_RING.map(([x, y]) => (
          <circle key={x} cx={+x.toFixed(2)} cy={+y.toFixed(2)} r={4.6} />
        ))}
      </g>
      <circle r={3.1} fill="#FFD65C" stroke-width={1.4} />
    </g>
  );
}

function Fringe({ palette, zIndex }: { palette: ScenePalette; zIndex: number }) {
  const id = useUid('fringe');
  return (
    <svg class={s.fringe} style={{ zIndex }} viewBox={`0 0 6000 ${FRINGE_H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={palette.grassLine} stop-opacity={0} />
          <stop offset="1" stop-color={palette.grassLine} stop-opacity={palette.night ? 0.3 : 0.2} />
        </linearGradient>
      </defs>
      <rect x={-100} y={0} width={6200} height={FRINGE_H} fill={`url(#${id}-edge)`} />
      <path d={FRINGE} fill={palette.grass} stroke={palette.grassLine} stroke-width={3} stroke-linejoin="round" />
      <g id={`${id}-tile`}>
        {FRINGE_TUFTS.map(([x, y, k]) => (
          <path key={x} d={TUFT} transform={`translate(${x} ${y}) scale(${k})`} fill={palette.grass} stroke={palette.grassLine} stroke-width={2.6} stroke-linejoin="round" />
        ))}
        {FRINGE_FLOWERS.map(([x, y, petal, k]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
            <path d="M0 0 Q-1 10 1 30" fill="none" stroke={palette.grassLine} stroke-width={2.4} stroke-linecap="round" />
            <Bloom petal={petal} bloom={palette.bloom} />
          </g>
        ))}
      </g>
      <use href={`#${id}-tile`} x={-2000} />
      <use href={`#${id}-tile`} x={2000} />
    </svg>
  );
}

/** A flowering bush in a bottom corner (drawn for the left; `mirror` flips it for the right). */
function CornerBush({ palette, zIndex, mirror }: { palette: ScenePalette; zIndex: number; mirror?: boolean }) {
  const puffs = (
    <>
      <circle cx={34} cy={112} r={46} />
      <circle cx={88} cy={120} r={36} />
      <circle cx={126} cy={138} r={26} />
      <circle cx={-6} cy={96} r={40} />
    </>
  );
  return (
    <svg class={mirror ? `${s.corner} ${s.cornerRight}` : s.corner} style={{ zIndex }} viewBox="0 0 180 150" aria-hidden="true" focusable="false">
      <g transform={mirror ? 'translate(180 0) scale(-1 1)' : undefined}>
        <g fill={palette.line} stroke={palette.line} stroke-width={7}>
          {puffs}
        </g>
        <g fill={palette.leafShade}>{puffs}</g>
        <ellipse cx={30} cy={84} rx={20} ry={10} transform="rotate(-24 30 84)" fill={palette.leafLight} opacity={0.8} />
        <ellipse cx={86} cy={100} rx={11} ry={6} transform="rotate(-20 86 100)" fill={palette.leafLight} opacity={0.6} />
        <g transform="translate(58 98)">
          <Bloom petal={mirror ? '#FFE593' : '#FFC4D3'} bloom={palette.bloom} />
        </g>
        <g transform="translate(104 118) scale(0.85)">
          <Bloom petal="#FFFDF7" bloom={palette.bloom} />
        </g>
        <g transform="translate(18 124) scale(0.9)">
          <Bloom petal={mirror ? '#E4D6FA' : '#FFFDF7'} bloom={palette.bloom} />
        </g>
      </g>
    </svg>
  );
}

function ForegroundArt({ palette, cornerZ, fringeZ }: { palette: ScenePalette; cornerZ: number; fringeZ: number }) {
  return (
    <>
      <CornerBush palette={palette} zIndex={cornerZ} />
      <CornerBush palette={palette} zIndex={cornerZ} mirror />
      <Fringe palette={palette} zIndex={fringeZ} />
    </>
  );
}

export const Foreground = memo(ForegroundArt);
