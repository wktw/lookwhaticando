import type { ArtCtx } from './types';
import { BLUSH, EYE, OUTLINE } from './geometry';

/** One eye at (x, y) for the current expression. `side` mirrors asymmetric shapes. */
export function Eye({ x, y, ctx, side, scale = 1 }: { x: number; y: number; ctx: ArtCtx; side: 'l' | 'r'; scale?: number }) {
  const color = ctx.look.palette.eye ?? EYE;
  const e = ctx.expression;
  const wink = e === 'wink' && side === 'r';
  const s = scale;

  if (e === 'happy' || e === 'eat' || wink) {
    return (
      <path
        d={`M${x - 3.6 * s} ${y + 1.4 * s} Q${x} ${y - 3.8 * s} ${x + 3.6 * s} ${y + 1.4 * s}`}
        fill="none"
        stroke={color}
        stroke-width={2.3 * s}
        stroke-linecap="round"
      />
    );
  }
  if (e === 'sleep') {
    return (
      <path
        d={`M${x - 3.6 * s} ${y - 0.4 * s} Q${x} ${y + 3 * s} ${x + 3.6 * s} ${y - 0.4 * s}`}
        fill="none"
        stroke={color}
        stroke-width={2.1 * s}
        stroke-linecap="round"
      />
    );
  }
  if (e === 'love') {
    // A plump heart with a highlight.
    const k = 0.95 * s;
    return (
      <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path
          d="M0 4.2 C-1.2 3.1 -5 0.6 -5 -1.8 C-5 -3.8 -3.4 -5 -2 -5 C-0.9 -5 -0.3 -4.4 0 -3.7 C0.3 -4.4 0.9 -5 2 -5 C3.4 -5 5 -3.8 5 -1.8 C5 0.6 1.2 3.1 0 4.2 Z"
          fill="#F0607F"
          stroke={OUTLINE}
          stroke-width={1}
          stroke-linejoin="round"
        />
        <circle cx={-2.2} cy={-2.6} r={0.95} fill="#fff" opacity={0.85} />
      </g>
    );
  }
  const big = e === 'surprised' ? 1.25 : 1;
  const rx = 3.7 * s * big;
  const ry = 4.5 * s * big;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={color} />
      <circle cx={x + 1.3 * s * big} cy={y - 1.7 * s * big} r={1.45 * s * big} fill="#fff" />
      <circle cx={x - 1.3 * s * big} cy={y + 1.9 * s * big} r={0.6 * s * big} fill="#fff" opacity={0.7} />
    </g>
  );
}

/** Default eyes at the species' eye anchors, in a group that blinks when idle. */
export function DefaultEyes({ ctx }: { ctx: ArtCtx }) {
  const { eyes } = ctx.anchors;
  const blinkable = ctx.expression === 'idle' || ctx.expression === 'surprised';
  return (
    <g class={blinkable ? 'pet-blink' : undefined}>
      <Eye x={eyes.left} y={eyes.y} ctx={ctx} side="l" />
      <Eye x={eyes.right} y={eyes.y} ctx={ctx} side="r" />
    </g>
  );
}

export function Blush({ ctx, dy = 6.5, spread = 7.5, opacity = 0.55 }: { ctx: ArtCtx; dy?: number; spread?: number; opacity?: number }) {
  const { eyes } = ctx.anchors;
  const strong = ctx.expression === 'love' || ctx.expression === 'happy';
  return (
    <g opacity={strong ? Math.min(1, opacity + 0.2) : opacity}>
      <ellipse cx={eyes.left - spread} cy={eyes.y + dy} rx={5} ry={2.9} fill={BLUSH} />
      <ellipse cx={eyes.right + spread} cy={eyes.y + dy} rx={5} ry={2.9} fill={BLUSH} />
    </g>
  );
}

/** A small open mouth used by several species for eat/surprised/happy. */
export function OpenMouth({ x, y, w = 5.2, h = 4.2 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <path
        d={`M${x - w / 2} ${y} Q${x} ${y + h * 1.5} ${x + w / 2} ${y} Z`}
        fill="#C75B73"
        stroke={OUTLINE}
        stroke-width={1.5}
        stroke-linejoin="round"
      />
      <path d={`M${x - w / 4} ${y + h * 0.75} Q${x} ${y + h * 0.35} ${x + w / 4} ${y + h * 0.75}`} fill="#FF9FB8" />
    </g>
  );
}
