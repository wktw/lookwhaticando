import type { ScenePalette } from '../palette';
import { ridge, type Pt } from '../paths';
import s from './sill.module.css';

/** Rolling hills with a few far-off trees, seen through the window (6000×1000, scaled by height). */
const FAR: Pt[] = [
  [-100, 760], [700, 700], [1400, 770], [2100, 690], [2800, 760], [3400, 700], [4100, 770], [4800, 690], [5500, 760], [6100, 720],
];
const NEAR: Pt[] = [
  [-100, 860], [600, 820], [1300, 880], [2000, 830], [2700, 870], [3500, 815], [4300, 880], [5000, 830], [5700, 875], [6100, 850],
];
/** Distant lollipop trees on the far ridge, half hidden by the near hills: [x, y, size]. */
const TREES: readonly (readonly [x: number, y: number, k: number])[] = [
  [2240, 790, 0.7],
  [2320, 800, 0.5],
  [3440, 786, 0.85],
  [3520, 796, 0.6],
  [4560, 796, 0.65],
];

/** A soft, outline-free tree in the haze of distance. */
function HazyTree({ palette, x, y, k }: { palette: ScenePalette; x: number; y: number; k: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} fill={palette.hillFarDetail}>
      <rect x={-9} y={-70} width={18} height={80} rx={8} />
      <ellipse cx={0} cy={-110} rx={62} ry={70} />
    </g>
  );
}

export function OutsideView({ palette }: { palette: ScenePalette }) {
  return (
    <svg class={s.view} viewBox="0 0 6000 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <path d={ridge(FAR, 1000)} fill={palette.hillFar} />
      {TREES.map(([x, y, k]) => (
        <HazyTree key={x} palette={palette} x={x} y={y} k={k} />
      ))}
      <path d={ridge(NEAR, 1000)} fill={palette.hillNear} stroke={palette.hillLine} stroke-width={10} stroke-linejoin="round" />
    </svg>
  );
}
