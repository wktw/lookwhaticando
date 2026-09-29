import type { ScenePalette } from '../palette';
import { ridge, type Pt } from '../paths';
import s from './sill.module.css';

/** Rolling hills and a round tree seen through the window (6000×1000, scaled by height). */
const FAR: Pt[] = [
  [-100, 760], [700, 700], [1400, 770], [2100, 690], [2800, 760], [3400, 700], [4100, 770], [4800, 690], [5500, 760], [6100, 720],
];
const NEAR: Pt[] = [
  [-100, 860], [600, 820], [1300, 880], [2000, 830], [2700, 870], [3500, 815], [4300, 880], [5000, 830], [5700, 875], [6100, 850],
];

function RoundTree({ palette, x, y, k }: { palette: ScenePalette; x: number; y: number; k: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} stroke={palette.line} stroke-width={9} stroke-linejoin="round">
      <rect x={-18} y={-120} width={36} height={124} rx={8} fill={palette.trunk} />
      <circle cx={0} cy={-200} r={118} fill={palette.leaf} />
      <ellipse cx={-42} cy={-250} rx={40} ry={22} transform="rotate(-30 -42 -250)" fill={palette.leafLight} stroke="none" />
    </g>
  );
}

export function OutsideView({ palette }: { palette: ScenePalette }) {
  return (
    <svg class={s.view} viewBox="0 0 6000 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <path d={ridge(FAR, 1000)} fill={palette.hillFar} />
      <RoundTree palette={palette} x={3520} y={845} k={0.9} />
      <RoundTree palette={palette} x={2280} y={860} k={0.55} />
      <path d={ridge(NEAR, 1000)} fill={palette.hillNear} stroke={palette.hillLine} stroke-width={10} stroke-linejoin="round" />
    </svg>
  );
}
