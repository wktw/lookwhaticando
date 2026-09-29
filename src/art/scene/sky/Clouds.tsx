import type { ScenePalette } from '../palette';
import s from './sky.module.css';

/** Puffs of one fluffy cloud on a 220×100 canvas: [cx, cy, r]. */
const PUFFS: readonly [number, number, number][] = [
  [58, 60, 23],
  [96, 43, 31],
  [138, 49, 26],
  [170, 63, 18],
];
const BASE = { x: 30, y: 58, w: 164, h: 28, rx: 14 };

/** One cloud. The outline is a fat stroke behind the fills, so the silhouette reads as one soft shape. */
function Cloud({ palette, line }: { palette: ScenePalette; line: number }) {
  const shapes = (
    <>
      {PUFFS.map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} />
      ))}
      <rect x={BASE.x} y={BASE.y} width={BASE.w} height={BASE.h} rx={BASE.rx} />
    </>
  );
  return (
    <>
      <g fill={palette.cloudLine} stroke={palette.cloudLine} stroke-width={line * 2}>
        {shapes}
      </g>
      <g fill={palette.cloud}>{shapes}</g>
      <rect x={40} y={72} width={146} height={11} rx={5.5} fill={palette.cloudShade} />
      <ellipse cx={84} cy={30} rx={11} ry={5.5} transform="rotate(-24 84 30)" fill="#fff" opacity={0.7} />
    </>
  );
}

export interface CloudSpec {
  /** Resting left edge, % of the container width. */
  x: number;
  /** Top, % of the container height. */
  top: number;
  /** Height, % of the container height. */
  height: number;
  /** Seconds for one full crossing. */
  duration: number;
}

/** Clouds that drift slowly across the container and wrap (static under reduced motion). */
export function DriftingClouds({ palette, clouds, line = 4 }: { palette: ScenePalette; clouds: readonly CloudSpec[]; line?: number }) {
  return (
    <>
      {clouds.map((c) => (
        <svg
          key={`${c.x}-${c.top}`}
          class={s.cloud}
          style={{
            top: `${c.top}%`,
            height: `${c.height}%`,
            '--x': c.x,
            '--dur': `${c.duration}s`,
            '--delay': `${(-c.duration * (c.x + 20)) / 120}s`,
          }}
          viewBox="0 0 220 100"
          aria-hidden="true"
          focusable="false"
        >
          <Cloud palette={palette} line={line} />
        </svg>
      ))}
    </>
  );
}
