import type { ArtCtx, SpeciesArt, TraitId } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { lighten, shade } from '../color';
import { OpenMouth } from '../face';
import { hasTrait, MIRROR, OutlinedStroke, StrokeTail } from './parts';

type EarStyle = 'pointy' | 'bat' | 'fluffy' | 'floppy';

function earStyle(ctx: ArtCtx): EarStyle {
  const styles: [TraitId, EarStyle][] = [
    ['fluffy', 'fluffy'],
    ['bat-ears', 'bat'],
    ['pointy-ears', 'pointy'],
  ];
  return styles.find(([t]) => hasTrait(ctx, t))?.[1] ?? 'floppy';
}

/** Upright ear shapes (left side), tucked behind the head: [outer, inner]. */
const UPRIGHT: Record<'pointy' | 'bat' | 'fluffy', [string, string]> = {
  pointy: [
    'M21.2 45 C20.6 35 22 24.4 25.4 17.6 C26.6 15.2 29.4 15 31 16.8 C35.2 21.4 39.8 25.8 43.8 29.4',
    'M25.8 36 C25.8 30 26.6 25 28.2 21.6 C31 24.4 34.2 27.6 36.8 30.2 C32.8 31 29 33.2 25.8 36 Z',
  ],
  bat: [
    'M24.4 44.6 C17 40.4 11.8 31.4 12.6 22.8 C13.2 16.2 18.8 12.2 24.8 14.2 C31.6 16.6 38.6 23.4 42.8 30.6',
    'M24.6 37.4 C19.8 33.8 17 27.8 17.4 22.8 C17.8 19.4 20.6 17.4 24 18.6 C28.6 20.2 33.4 24.6 36.4 29.4 C32 31.2 27.8 34 24.6 37.4 Z',
  ],
  fluffy: [
    'M23.5 42 C23.2 35.6 24.6 29.2 27.4 24.8 C28.6 23 31 22.9 32.4 24.4 C35.6 27.6 38.6 30.4 41.6 33',
    'M27.6 36.4 C27.8 32.6 28.6 29.8 29.8 27.8 C31.8 29.6 33.8 31.4 35.6 33.2 C32.6 33.8 30 34.8 27.6 36.4 Z',
  ],
};

function UprightEar({ ctx, style, mirror }: { ctx: ArtCtx; style: keyof typeof UPRIGHT; mirror?: boolean }) {
  const p = ctx.look.palette;
  const [outer, inner] = UPRIGHT[style];
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <path d={outer} fill={p.ear ?? p.body} stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" stroke-linecap="round" />
      <path d={inner} fill={p.earInner} />
    </g>
  );
}

/** Soft floppy ear hanging over the side of the head (drawn in front; its root blends into the head). */
function FloppyEar({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  const color = p.ear ?? shade(p.body, 0.12);
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <g class={mirror ? 'pet-ear-r' : 'pet-ear-l'} style={{ '--ear-origin': '30px 33px' }}>
        <path
          d="M38.6 30.2 C33.4 30 28.4 32.2 24.4 35.8 C19.4 40.4 14.6 47.8 14 54.4 C13.6 59.2 16.8 62.2 20.4 61.4 C24 60.6 25.8 55.4 26.8 50.2 C27.9 44.6 30.2 38.6 33.6 35.2 C35.2 33.6 36.8 32.6 38.9 32.1"
          fill={color}
          stroke={OUTLINE}
          stroke-width={STROKE}
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M24.8 41.8 C21.6 45.6 19.6 50.6 19.8 55" fill="none" stroke={OUTLINE} stroke-width={1.2} stroke-linecap="round" opacity={0.22} />
      </g>
    </g>
  );
}

export const dog: SpeciesArt = {
  back: () => null,
  tail: (ctx) => {
    const p = ctx.look.palette;
    const color = p.tail ?? p.body;
    if (hasTrait(ctx, 'curly-tail')) {
      // A cinnamon-roll curl peeking over the right side.
      return (
        <g class="pet-tail" style={{ '--tail-origin': '82px 76px' }}>
          <OutlinedStroke d="M80 78 C83.5 76.6 85.6 74.4 86.6 71.4" color={color} width={5.4} />
          <circle cx={88.6} cy={65.6} r={6.6} fill={color} stroke={OUTLINE} stroke-width={STROKE} />
          <path
            d="M89.4 66.2 C87.8 67 86.6 65.4 87.6 64.2 C89.2 62.6 92 63.8 91.8 66.2 C91.6 68.8 88.4 70 86 68.4"
            fill="none"
            stroke={OUTLINE}
            stroke-width={1.3}
            stroke-linecap="round"
            opacity={0.55}
          />
        </g>
      );
    }
    return <StrokeTail d="M77.5 85 C83.5 83.8 87.8 79.2 88.8 72" color={color} width={6.4} origin="78px 85px" />;
  },
  ears: (ctx) => {
    const style = earStyle(ctx);
    if (style === 'floppy') return null;
    return (
      <g>
        <UprightEar ctx={ctx} style={style} />
        <UprightEar ctx={ctx} style={style} mirror />
      </g>
    );
  },
  overlay: (ctx) => {
    const p = ctx.look.palette;
    const { x, y } = ctx.anchors.mouth;
    return <ellipse cx={x} cy={y + 0.2} rx={9.6} ry={6.8} fill={p.muzzle ?? lighten(p.body, 0.55)} />;
  },
  front: (ctx) =>
    earStyle(ctx) === 'floppy' && !ctx.hidden?.has('ears') ? (
      <g>
        <FloppyEar ctx={ctx} />
        <FloppyEar ctx={ctx} mirror />
      </g>
    ) : null,
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const e = ctx.expression;
    const ny = y - 3.4;
    const nose = (
      <g>
        <path
          d={`M${x - 3.4} ${ny} C${x - 3.4} ${ny - 1.6} ${x + 3.4} ${ny - 1.6} ${x + 3.4} ${ny} C${x + 3.4} ${ny + 1.8} ${x + 1.4} ${ny + 3} ${x} ${ny + 3} C${x - 1.4} ${ny + 3} ${x - 3.4} ${ny + 1.8} ${x - 3.4} ${ny} Z`}
          fill={ctx.look.palette.nose}
        />
        <ellipse cx={x - 1.2} cy={ny - 0.2} rx={1} ry={0.6} fill="#fff" opacity={0.7} />
      </g>
    );
    const my = ny + 3;
    if (e === 'eat' || e === 'surprised') {
      return (
        <g>
          {nose}
          <OpenMouth x={x} y={my + 1.4} w={e === 'surprised' ? 4 : 5.6} h={e === 'surprised' ? 4.4 : 3.6} />
        </g>
      );
    }
    const smile = (
      <path
        d={`M${x} ${my} L${x} ${my + 1.4} M${x - 3.6} ${my + 1.6} Q${x - 1.8} ${my + 3.6} ${x} ${my + 1.4} Q${x + 1.8} ${my + 3.6} ${x + 3.6} ${my + 1.6}`}
        fill="none"
        stroke={OUTLINE}
        stroke-width={1.5}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    );
    if (e === 'happy' || e === 'love') {
      return (
        <g>
          {nose}
          <path
            d={`M${x - 4.2} ${my + 1.2} Q${x} ${my + 8.4} ${x + 4.2} ${my + 1.2} Z`}
            fill="#C75B73"
            stroke={OUTLINE}
            stroke-width={1.5}
            stroke-linejoin="round"
          />
          <path
            d={`M${x - 2.4} ${my + 4.2} Q${x} ${my + 2.8} ${x + 2.4} ${my + 4.2} Q${x + 2.2} ${my + 6.6} ${x} ${my + 6.8} Q${x - 2.2} ${my + 6.6} ${x - 2.4} ${my + 4.2} Z`}
            fill="#FF9FB8"
          />
          <path d={`M${x} ${my} L${x} ${my + 1.2}`} stroke={OUTLINE} stroke-width={1.5} stroke-linecap="round" />
        </g>
      );
    }
    if (e === 'wink') {
      // A little "blep": tongue poking out.
      return (
        <g>
          {nose}
          <path
            d={`M${x - 1.2} ${my + 2.2} Q${x - 1.6} ${my + 5.8} ${x + 0.8} ${my + 5.8} Q${x + 2.8} ${my + 5.6} ${x + 2.2} ${my + 2}`}
            fill="#FF9FB8"
            stroke={OUTLINE}
            stroke-width={1.3}
            stroke-linejoin="round"
          />
          {smile}
        </g>
      );
    }
    return (
      <g>
        {nose}
        {smile}
      </g>
    );
  },
};
