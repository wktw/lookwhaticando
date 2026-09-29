import type { ArtCtx } from './types';
import { BLUSH, EYE, OUTLINE } from './geometry';

/** One eye at (x, y) for the current expression. `side` mirrors asymmetric shapes. */
export function Eye({ x, y, ctx, side, scale = 1 }: { x: number; y: number; ctx: ArtCtx; side: 'l' | 'r'; scale?: number }) {
  const { iris } = ctx.look.palette;
  const color = ctx.look.palette.eye ?? EYE;
  const line = ctx.look.palette.ink ?? color;
  const e = ctx.expression;
  const wink = e === 'wink' && side === 'r';
  const s = scale;

  if (e === 'happy' || e === 'eat' || wink) {
    return (
      <path
        d={`M${x - 3.6 * s} ${y + 1.4 * s} Q${x} ${y - 3.8 * s} ${x + 3.6 * s} ${y + 1.4 * s}`}
        fill="none"
        stroke={line}
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
        stroke={line}
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
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={iris ?? color} />
      {iris && <ellipse cx={x} cy={y + 0.2 * s} rx={rx * 0.5} ry={ry * 0.78} fill={color} />}
      <circle cx={x + 1.3 * s * big} cy={y - 1.7 * s * big} r={1.45 * s * big} fill="#fff" />
      <circle cx={x - 1.3 * s * big} cy={y + 1.9 * s * big} r={0.6 * s * big} fill="#fff" opacity={0.7} />
    </g>
  );
}

/** Line color for mouths drawn straight on the fur (light on dark coats). */
export const faceInk = (ctx: ArtCtx) => ctx.look.palette.ink ?? OUTLINE;

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

export function Blush({ ctx, opacity = 0.55 }: { ctx: ArtCtx; opacity?: number }) {
  const { eyes, cheeks } = ctx.anchors;
  const c = cheeks ?? { y: eyes.y + 6.5, left: eyes.left - 7.5, right: eyes.right + 7.5 };
  const k = c.size ?? 1;
  const strong = ctx.expression === 'love' || ctx.expression === 'happy';
  return (
    <g opacity={strong ? Math.min(1, opacity + 0.2) : opacity}>
      <ellipse cx={c.left} cy={c.y} rx={5 * k} ry={2.9 * k} fill={BLUSH} />
      <ellipse cx={c.right} cy={c.y} rx={5 * k} ry={2.9 * k} fill={BLUSH} />
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
