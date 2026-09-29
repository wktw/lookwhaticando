import type { SpeciesArt, ArtCtx } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { faceInk, OpenMouth } from '../face';
import { MIRROR, rim, StrokeTail } from './parts';

const EAR = 'M22.5 47 C22 38 23.5 28 26.5 22.8 C27.6 20.9 29.6 20.8 31 22.2 C35.5 26.2 40.5 30.5 44 34';

/** Rounded cat ear, drawn behind the body so the head hides its base. Left ear; mirror for right. */
function Ear({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  const outer = p.ear ?? p.body;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <g class={mirror ? 'pet-ear-r' : 'pet-ear-l'} style={{ '--ear-origin': '33px 36px' }}>
        <path d={EAR} {...rim()} />
        <path
          d={EAR}
          fill={outer}
          stroke={OUTLINE}
          stroke-width={STROKE}
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M27 37 C27 32 27.8 28 29 26 C31.6 28.4 34.8 31.2 37.2 33.6 C33 34.2 29.6 35.4 27 37 Z" fill={p.earInner} />
      </g>
    </g>
  );
}

export const cat: SpeciesArt = {
  back: () => null,
  tail: (ctx) => {
    const p = ctx.look.palette;
    return <StrokeTail d="M74 88 C86 90 93 82 92 72 C91.5 67 89 64.5 86.5 64" color={p.tail ?? p.body} />;
  },
  ears: (ctx) => (
    <g>
      <Ear ctx={ctx} />
      <Ear ctx={ctx} mirror />
    </g>
  ),
  front: () => (
    <g stroke={OUTLINE} stroke-width={1.3} stroke-linecap="round" opacity={0.55}>
      <path d="M11.5 60.5 L20 62" />
      <path d="M11.5 66.5 L20 65.5" />
      <path d="M88.5 60.5 L80 62" />
      <path d="M88.5 66.5 L80 65.5" />
    </g>
  ),
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const nose = ctx.look.palette.nose;
    const e = ctx.expression;
    const noseEl = (
      <path
        d={`M${x - 1.9} ${y - 2.6} L${x + 1.9} ${y - 2.6} Q${x + 1.9} ${y - 2.2} ${x} ${y - 0.5} Q${x - 1.9} ${y - 2.2} ${x - 1.9} ${y - 2.6} Z`}
        fill={nose}
        stroke={nose}
        stroke-width={1.2}
        stroke-linejoin="round"
      />
    );
    if (e === 'eat' || e === 'surprised') {
      return (
        <g>
          {noseEl}
          <OpenMouth x={x} y={y + 0.4} w={e === 'surprised' ? 4.2 : 5.6} h={e === 'surprised' ? 4.6 : 3.8} />
        </g>
      );
    }
    if (e === 'happy' || e === 'love') {
      return (
        <g>
          {noseEl}
          <path
            d={`M${x - 3.6} ${y - 0.2} Q${x - 1.8} ${y + 2.2} ${x} ${y - 0.2} Q${x + 1.8} ${y + 2.2} ${x + 3.6} ${y - 0.2}`}
            fill="none"
            stroke={faceInk(ctx)}
            stroke-width={1.6}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d={`M${x - 1.6} ${y + 1.2} Q${x} ${y + 4.4} ${x + 1.6} ${y + 1.2} Z`} fill="#F58CAA" />
        </g>
      );
    }
    return (
      <g>
        {noseEl}
        <path
          d={`M${x - 3.4} ${y - 0.3} Q${x - 1.7} ${y + 2.1} ${x} ${y - 0.3} Q${x + 1.7} ${y + 2.1} ${x + 3.4} ${y - 0.3}`}
          fill="none"
          stroke={faceInk(ctx)}
          stroke-width={1.6}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    );
  },
};
