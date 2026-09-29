import type { PatternRenderer } from './index';
import { dropPath, petalPath, sparklePath, starPath } from '../shapes';
import { scatter } from './layout';

/** Small motifs sprinkled over the body, always leaving the face clear. */

const SPRINKLE_COLORS = ['#F58CAA', '#FFA56E', '#F6C544', '#6CCBAE', '#7DB7E8', '#A993EA'];

export const sprinkles: PatternRenderer = (ctx) => (
  <g stroke-width={1.9} stroke-linecap="round">
    {scatter(ctx, 8.6, 5).map((p) => (
      <path
        key={p.i}
        d="M-2 0 L2 0"
        stroke={SPRINKLE_COLORS[p.i % SPRINKLE_COLORS.length]}
        transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${Math.round(p.r * 180)})`}
      />
    ))}
  </g>
);

export const seeds: PatternRenderer = (ctx) => (
  <g fill={ctx.look.palette.pattern ?? '#FFF1A8'}>
    {scatter(ctx, 8, 2).map((p) => (
      <path key={p.i} d={dropPath(0, 0, 1.25)} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${Math.round((p.r - 0.5) * 50)})`} />
    ))}
  </g>
);

export const petals: PatternRenderer = (ctx) => (
  <g fill={ctx.look.palette.pattern ?? '#F7A8C0'}>
    {scatter(ctx, 12.5, 7).map((p) => (
      <path key={p.i} d={petalPath(0, 0, 2.5 + p.r)} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${Math.round(p.r * 360)})`} />
    ))}
  </g>
);

export const stars: PatternRenderer = (ctx) => (
  <g fill={ctx.look.palette.pattern ?? '#FFE593'}>
    {scatter(ctx, 11.5, 4).map((p) =>
      p.i % 2 ? <path key={p.i} d={starPath(p.x, p.y, 2 + p.r)} stroke-linejoin="round" /> : <path key={p.i} d={sparklePath(p.x, p.y, 2.2 + p.r)} />,
    )}
  </g>
);

export const raindrops: PatternRenderer = (ctx) => (
  <g fill={ctx.look.palette.pattern ?? '#A7CDF2'}>
    {scatter(ctx, 10.5, 6).map((p) => (
      <path key={p.i} d={dropPath(0, 0, 1.9)} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${Math.round((p.r - 0.5) * 24)})`} />
    ))}
  </g>
);

export const snowflakes: PatternRenderer = (ctx) => (
  <g stroke={ctx.look.palette.pattern ?? '#FFFFFF'} stroke-width={0.95} stroke-linecap="round">
    {scatter(ctx, 11.5, 8).map((p) => {
      const s = 2.2 + p.r * 0.8;
      return (
        <g key={p.i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${Math.round(p.r * 60)})`}>
          <path d={`M${-s} 0 L${s} 0 M${-s / 2} ${-s * 0.87} L${s / 2} ${s * 0.87} M${-s / 2} ${s * 0.87} L${s / 2} ${-s * 0.87}`} />
        </g>
      );
    })}
  </g>
);
