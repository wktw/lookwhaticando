import type { ArtCtx, SpeciesArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { faceInk, OpenMouth } from '../face';
import { hasTrait, MIRROR, puffPath, rim } from './parts';

const TALL_EAR = 'M34.6 31.4 C32.2 24.4 31.2 15 33 8.6 C34.4 3.8 40 3 42.6 7.2 C45.6 12 46.6 20.6 46 27.8';
const LOP_EAR =
  'M42.2 26.6 C35.2 26 27.4 29.2 22.8 35.4 C17.6 42.4 14.8 53.4 15.6 62.2 C16 67 20 69.4 23.6 67.8 C27 66.2 27.8 60.4 28.2 55 C28.8 47 30.4 39.4 34.6 34 C36.6 31.4 39.4 29.8 42.6 29.2';

/** Tall upright ear; drawn in front of head wear, its base blends into the head. */
function TallEar({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <g class={mirror ? 'pet-ear-r' : 'pet-ear-l'} style={{ '--ear-origin': '40px 30px' }}>
        <path
          d={TALL_EAR}
          fill={p.ear ?? p.body}
          stroke={OUTLINE}
          stroke-width={STROKE}
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M37 27 C35.6 21.2 35.3 14 36.8 9.8 C37.8 7.4 40.2 7.4 41.3 10 C42.9 13.8 43.2 20.6 42.6 26.2 C40.6 26.2 38.6 26.4 37 27 Z" fill={p.earInner} />
      </g>
    </g>
  );
}

/** Lop ear draping down the side of the head. */
function LopEar({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <g class={mirror ? 'pet-ear-r' : 'pet-ear-l'} style={{ '--ear-origin': '36px 30px' }}>
        <path
          d={LOP_EAR}
          fill={p.ear ?? p.body}
          stroke={OUTLINE}
          stroke-width={STROKE}
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M25 43.6 C22.4 49 21.4 56 22.2 61.8 C22.6 64 24.4 64 25 61.8 C25.8 55.4 26.8 48.8 28.6 43.4 C27.4 42.4 26 42.6 25 43.6 Z" fill={p.earInner} />
      </g>
    </g>
  );
}

export const bunny: SpeciesArt = {
  back: () => null,
  tail: (ctx) => {
    const p = ctx.look.palette;
    return (
      <g class="pet-tail" style={{ '--tail-origin': '82px 84px' }}>
        <path d={puffPath(84.5, 81, 5.6, 7, 0.28)} {...rim(STROKE * 0.9)} />
        <path d={puffPath(84.5, 81, 5.6, 7, 0.28)} fill={p.tail ?? '#FFFFFF'} stroke={OUTLINE} stroke-width={STROKE * 0.9} stroke-linejoin="round" />
      </g>
    );
  },
  ears: (ctx) =>
    hasTrait(ctx, 'lop-ears') ? (
      <g>
        <LopEar ctx={ctx} />
        <LopEar ctx={ctx} mirror />
      </g>
    ) : (
      <g>
        <TallEar ctx={ctx} />
        <TallEar ctx={ctx} mirror />
      </g>
    ),
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const e = ctx.expression;
    const ny = y - 1.8;
    const nose = (
      <g class="pet-nose" style={{ '--nose-origin': `${x}px ${ny}px` }}>
        <path
          d={`M${x - 1.9} ${ny - 1} Q${x} ${ny - 1.9} ${x + 1.9} ${ny - 1} Q${x + 1.6} ${ny + 0.8} ${x} ${ny + 1.2} Q${x - 1.6} ${ny + 0.8} ${x - 1.9} ${ny - 1} Z`}
          fill={ctx.look.palette.nose}
          stroke={ctx.look.palette.nose}
          stroke-width={0.8}
          stroke-linejoin="round"
        />
      </g>
    );
    if (e === 'eat' || e === 'surprised') {
      return (
        <g>
          {nose}
          <OpenMouth x={x} y={ny + 2.4} w={e === 'surprised' ? 3.8 : 5} h={e === 'surprised' ? 4.2 : 3.4} />
        </g>
      );
    }
    const flat = e === 'sleep';
    const ymouth = (
      <path
        d={`M${x} ${ny + 1.2} L${x} ${ny + 2.6} M${x - 2.8} ${ny + (flat ? 3 : 3.6)} Q${x - 1.2} ${ny + (flat ? 3.6 : 4.4)} ${x} ${ny + 2.6} Q${x + 1.2} ${ny + (flat ? 3.6 : 4.4)} ${x + 2.8} ${ny + (flat ? 3 : 3.6)}`}
        fill="none"
        stroke={faceInk(ctx)}
        stroke-width={1.4}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    );
    const teeth =
      e === 'happy' || e === 'love' ? (
        <g fill="#fff" stroke={OUTLINE} stroke-width={1} stroke-linejoin="round">
          <path
            d={`M${x - 1.9} ${ny + 3.5} L${x - 1.9} ${ny + 5.4} Q${x - 1.9} ${ny + 6} ${x - 1.3} ${ny + 6} L${x + 1.3} ${ny + 6} Q${x + 1.9} ${ny + 6} ${x + 1.9} ${ny + 5.4} L${x + 1.9} ${ny + 3.5} Z`}
          />
          <path d={`M${x} ${ny + 3.3} L${x} ${ny + 6}`} fill="none" />
        </g>
      ) : null;
    return (
      <g>
        {teeth}
        {ymouth}
        {nose}
      </g>
    );
  },
};
