import type { ArtCtx } from '../types';
import type { PatternRenderer } from './index';
import { crescentPath, heartPath, sparklePath, starPath } from '../shapes';
import { scatter } from './layout';

/**
 * The cow family shares one layout: a big patch hugging the top-right of the head (kept above
 * the eyes), a spot on the left flank and one low on the right.
 */
const HEAD_PATCH =
  'M58 26 C68 25 80 31 83 41 C85 47 79 50 74 47 C70 45 71 40 66 39 C60 38 56 35 56.5 31 C57 28.5 57 26.5 58 26 Z';
const FLANK_SPOT = 'M12 72 C15 67 22 67 24.5 71.5 C27 76 23 81 18.5 81 C14 81 10 77 12 72 Z';
const LOW_SPOT = 'M63 85 C65 80.5 72 80 75 83.5 C78 87 76 94 70 95 C65 95.5 61.5 90 63 85 Z';

/**
 * Vertical offset for head markings, designed on the cat (eye line 59). Faces a little higher or
 * lower keep the patch in place on the forehead; eyes high on the head (frog bumps) push it off the top.
 */
function headDy(ctx: ArtCtx): number {
  const d = ctx.anchors.eyes.y - 59;
  return d < -10 ? d : Math.max(-2.5, Math.min(2.5, d));
}

export const cow: PatternRenderer = (ctx) => (
  <g fill={ctx.look.palette.pattern ?? '#6B4A48'}>
    <path d={HEAD_PATCH} transform={`translate(0 ${headDy(ctx)})`} />
    <path d={FLANK_SPOT} />
    <path d={LOW_SPOT} />
  </g>
);

/** Lovebug: every spot is a heart. */
export const cowHearts: PatternRenderer = (ctx) => {
  const dy = headDy(ctx);
  const heart = (x: number, y: number, s: number, rot: number) => (
    <path d={heartPath(0, 0, s)} transform={`translate(${x} ${y}) rotate(${rot})`} />
  );
  return (
    <g fill={ctx.look.palette.pattern ?? '#F59AB4'}>
      {heart(71, 36 + dy, 8.5, 16)}
      {heart(17.5, 74, 7, -14)}
      {heart(70, 87, 6.4, 10)}
      {heart(31, 86, 3.2, -8)}
    </g>
  );
};

/** Moon Cow: the head patch is a crescent moon she brought back; the rest are plain spots. */
export const cowMoons: PatternRenderer = (ctx) => {
  const p = ctx.look.palette;
  const dy = headDy(ctx);
  return (
    <g>
      <g fill={p.pattern ?? '#B7A8E6'}>
        <path d={FLANK_SPOT} />
        <path d={LOW_SPOT} />
      </g>
      <path d={crescentPath(71, 35.5 + dy, 9)} transform={`rotate(-24 71 ${35.5 + dy})`} fill={p.pattern2 ?? '#FFE593'} />
      <g fill={p.pattern2 ?? '#FFE593'}>
        <path d={sparklePath(31, 84, 2.6)} />
        <path d={sparklePath(59, 37 + dy, 1.8)} />
      </g>
    </g>
  );
};

/** Celestial: cow patches filled with little constellations. */
export const cowStars: PatternRenderer = (ctx) => {
  const p = ctx.look.palette;
  const star = p.pattern2 ?? '#FFE593';
  const dy = headDy(ctx);
  const constellation = (pts: [number, number][]) => (
    <g>
      <path d={`M${pts.map(([x, y]) => `${x} ${y}`).join(' L')}`} fill="none" stroke={star} stroke-width={0.7} opacity={0.75} />
      {pts.map(([x, y], i) => (
        <path key={i} d={i % 2 ? sparklePath(x, y, 1.6) : starPath(x, y, 1.5)} fill={star} />
      ))}
    </g>
  );
  return (
    <g>
      <g fill={p.pattern ?? '#5E5696'}>
        <path d={HEAD_PATCH} transform={`translate(0 ${dy})`} />
        <path d={FLANK_SPOT} />
        <path d={LOW_SPOT} />
      </g>
      <g transform={`translate(0 ${dy})`}>{constellation([[62, 31], [68, 33.5], [73.5, 32], [78, 38.5]])}</g>
      {constellation([[14.5, 74.5], [19, 71.5], [22, 76.5]])}
      {constellation([[66, 86], [70.5, 84], [73.5, 89]])}
    </g>
  );
};

/** Dalmatian: small round spots all over (never on the face). */
export const spots: PatternRenderer = (ctx) => (
  <g fill={ctx.look.palette.pattern ?? '#5E4B55'}>
    {scatter(ctx, 10.5, 3).map((p) => (
      <circle key={p.i} cx={p.x} cy={p.y} r={1.7 + p.r * 1.6} />
    ))}
  </g>
);

/** Sweetheart: one big heart-shaped spot plus two little ones. */
export const hearts: PatternRenderer = (ctx) => {
  const dy = headDy(ctx);
  return (
    <g fill={ctx.look.palette.pattern ?? '#F58CAA'}>
      <path d={heartPath(0, 0, 9)} transform="translate(24.5 77) rotate(-14)" />
      <path d={heartPath(0, 0, 4)} transform="translate(73 84) rotate(12)" />
      <path d={heartPath(0, 0, 3.2)} transform={`translate(68 ${38 + dy}) rotate(16)`} />
    </g>
  );
};
