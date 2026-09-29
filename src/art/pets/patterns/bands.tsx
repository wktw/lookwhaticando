import type { PatternRenderer } from './index';
import { dropPath, RAINBOW } from '../shapes';
import { bodyTop, scatter } from './layout';

/** Bands, swirls and drips: stripes, candy cane, melon rind, rainbow, nebula, icing. */

export const stripes: PatternRenderer = (ctx) => {
  const y0 = ctx.anchors.neck.y + 1;
  return (
    <g fill="none" stroke={ctx.look.palette.pattern ?? '#F7B3C4'} stroke-width={3.6}>
      {[0, 7, 14].map((dy) => (
        <path key={dy} d={`M0 ${y0 + dy} Q50 ${y0 + dy + 3.5} 100 ${y0 + dy}`} />
      ))}
    </g>
  );
};

export const candyStripes: PatternRenderer = (ctx) => (
  <g fill={ctx.look.palette.pattern ?? '#F58CAA'} transform="rotate(-38 50 60)">
    {Array.from({ length: 13 }, (_, i) => (
      <rect key={i} x={-22 + i * 12} y={-20} width={5.6} height={150} />
    ))}
  </g>
);

export const melon: PatternRenderer = (ctx) => {
  const p = ctx.look.palette;
  return (
    <g>
      <g fill={p.pattern2 ?? '#6B4F58'}>
        {scatter(ctx, 11, 9)
          .filter((pt) => pt.y < 80)
          .map((pt) => (
            <path key={pt.i} d={dropPath(0, 0, 1.5)} transform={`translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${Math.round((pt.r - 0.5) * 40)})`} />
          ))}
      </g>
      <path d="M0 83.5 Q50 90 100 83.5 L100 100 L0 100 Z" fill="#E4F4D6" />
      <path d="M0 86.5 Q50 93 100 86.5 L100 100 L0 100 Z" fill={p.pattern ?? '#9BCF86'} />
    </g>
  );
};

/** Concentric rainbow arcs across the lower body, starting just under the mouth. */
export const rainbow: PatternRenderer = (ctx) => {
  const cy = 120;
  const outer = cy - (ctx.anchors.mouth.y + 6.5);
  return (
    <g fill="none" stroke-width={4.9}>
      {RAINBOW.map((c, i) => (
        <circle key={c} cx={50} cy={cy} r={outer - i * 4.7} stroke={c} />
      ))}
    </g>
  );
};

/** Galaxy swirls in two tones with tiny white stars. */
export const nebula: PatternRenderer = (ctx) => {
  const p = ctx.look.palette;
  const a = p.pattern ?? '#F2A7D8';
  const b = p.pattern2 ?? '#9EC5F5';
  const top = bodyTop(ctx);
  return (
    <g>
      <g opacity={0.85}>
        <path fill={a} d={`M10 ${top + 16} C18 ${top + 2} 36 ${top - 2} 44 ${top + 4} C48 ${top + 8} 40 ${top + 12} 32 ${top + 14} C24 ${top + 16} 20 ${top + 24} 13 ${top + 26} C8 ${top + 27} 7 ${top + 20} 10 ${top + 16} Z`} />
        <path fill={b} d={`M62 ${top + 1} C72 ${top} 84 ${top + 8} 86 ${top + 16} C87 ${top + 21} 82 ${top + 21} 78 ${top + 17} C74 ${top + 13} 68 ${top + 12} 62 ${top + 8} C58 ${top + 6} 58 ${top + 2} 62 ${top + 1} Z`} />
        <path fill={b} d="M6 74 C14 68 30 70 36 78 C40 84 34 90 26 88 C20 86 16 80 10 82 C5 83 3 77 6 74 Z" />
        <path fill={a} d="M56 86 C62 76 80 72 90 76 C96 79 92 86 84 86 C76 86 72 90 66 94 C60 97 53 92 56 86 Z" />
      </g>
      <g fill="#FFFFFF">
        {scatter(ctx, 9, 11).map((pt) => (
          <circle key={pt.i} cx={pt.x} cy={pt.y} r={0.45 + pt.r * 0.5} opacity={0.6 + pt.r * 0.4} />
        ))}
      </g>
    </g>
  );
};

/** A drippy coat of icing (or honey, or chocolate) over the top of the head; drips stop above the eyes. */
export const icing: PatternRenderer = (ctx) => {
  const { eyes } = ctx.anchors;
  const base = Math.min(eyes.y - 13, bodyTop(ctx) + 14);
  const drips: [number, number, number][] = [
    [eyes.left - 9, 3.4, 10],
    [eyes.left + 2, 2.4, 3.5],
    [50, 3, 7],
    [eyes.right - 2, 2.2, 4],
    [eyes.right + 9, 3.2, 8.5],
  ];
  let d = `M0 0 L0 ${base}`;
  let x = 0;
  for (const [cx, w, len] of drips) {
    d += ` Q${(x + cx - w) / 2} ${base + 2.4} ${cx - w} ${base}`;
    d += ` C${cx - w} ${base + len * 0.7} ${cx - w * 0.8} ${base + len} ${cx} ${base + len}`;
    d += ` C${cx + w * 0.8} ${base + len} ${cx + w} ${base + len * 0.7} ${cx + w} ${base}`;
    x = cx + w;
  }
  d += ` Q${(x + 100) / 2} ${base + 2.4} 100 ${base} L100 0 Z`;
  return <path d={d} fill={ctx.look.palette.pattern ?? '#FFC4D3'} />;
};
