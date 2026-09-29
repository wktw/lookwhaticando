import type { ArtCtx, SpeciesArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { lighten, shade } from '../color';
import { OpenMouth } from '../face';
import { MIRROR, OutlinedStroke } from './parts';

const HORN = '#FFF1C9';

/** Short rounded horn on the top-left of the head; its base follows the head curve. */
function Horn({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const color = ctx.look.palette.accent ?? HORN;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <path
        d="M33.6 34.4 C31.9 31.8 31 29 31.3 26.4 C31.6 23.7 34.5 22.9 36.5 24.4 C38.7 26 40.3 28.4 41.3 30.9 C38.6 31.6 35.9 32.8 33.6 34.4 Z"
        fill={color}
        stroke={OUTLINE}
        stroke-width={STROKE * 0.9}
        stroke-linejoin="round"
      />
      <path d="M33 27.6 C33.2 26.4 33.9 25.6 34.8 25.6" fill="none" stroke="#fff" stroke-width={1.2} stroke-linecap="round" opacity={0.8} />
    </g>
  );
}

/** Soft floppy side ear with a pink inner, tucked behind the head. */
function SideEar({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <g class={mirror ? 'pet-ear-r' : 'pet-ear-l'} style={{ '--ear-origin': '19px 45px' }}>
        <path
          d="M21 40.5 C14.5 38.4 6.8 39.6 4.6 44.2 C3.2 47.4 6.2 50.6 11 51.2 C14.8 51.7 18.4 51 21.4 49.8"
          fill={p.ear ?? p.body}
          stroke={OUTLINE}
          stroke-width={STROKE}
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M19 43 C15 41.8 10.2 42.4 8.6 44.8 C7.6 46.6 9.8 48.4 13 48.6 C15.4 48.8 17.6 48.2 19.4 47.4 Z" fill={p.earInner} />
      </g>
    </g>
  );
}

export const cow: SpeciesArt = {
  back: (ctx) => (
    <g>
      <SideEar ctx={ctx} />
      <SideEar ctx={ctx} mirror />
    </g>
  ),
  tail: (ctx) => {
    const p = ctx.look.palette;
    const tuft = p.pattern ?? shade(p.body, 0.25);
    return (
      <g class="pet-tail" style={{ '--tail-origin': '80px 86px' }}>
        <OutlinedStroke d="M78 87 C85 87.5 89 83 89.5 76 C89.8 72 90.5 69.5 91.5 68" color={p.tail ?? p.body} width={3.2} />
        <path
          d="M91.5 70.2 C88.6 69.2 88.3 65.4 90.4 62.8 C91.3 61.7 92.1 60.8 92.5 59.4 C94.6 61.8 95.9 65 94.9 67.7 C94.3 69.3 93 70.4 91.5 70.2 Z"
          fill={tuft}
          stroke={OUTLINE}
          stroke-width={STROKE * 0.8}
          stroke-linejoin="round"
        />
      </g>
    );
  },
  ears: (ctx) => (
    <g>
      <Horn ctx={ctx} />
      <Horn ctx={ctx} mirror />
    </g>
  ),
  overlay: (ctx) => {
    const p = ctx.look.palette;
    const { x, y } = ctx.anchors.mouth;
    return <ellipse cx={x} cy={y + 0.4} rx={15.6} ry={9.2} fill={p.muzzle ?? lighten(p.body, 0.6)} stroke={OUTLINE} stroke-width={STROKE * 0.66} />;
  },
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const nostril = ctx.look.palette.nose;
    const e = ctx.expression;
    const nostrils = (
      <g fill={nostril}>
        <ellipse cx={x - 5} cy={y - 2.4} rx={1.5} ry={2.1} transform={`rotate(-12 ${x - 5} ${y - 2.4})`} />
        <ellipse cx={x + 5} cy={y - 2.4} rx={1.5} ry={2.1} transform={`rotate(12 ${x + 5} ${y - 2.4})`} />
      </g>
    );
    const my = y + 3.2;
    let mouth;
    if (e === 'eat' || e === 'surprised') {
      mouth = <OpenMouth x={x} y={my - 0.6} w={e === 'surprised' ? 4 : 5.6} h={e === 'surprised' ? 4.4 : 3.6} />;
    } else if (e === 'happy' || e === 'love' || e === 'wink') {
      mouth = (
        <g>
          <path
            d={`M${x - 4} ${my - 0.8} Q${x} ${my + 4.6} ${x + 4} ${my - 0.8} Z`}
            fill="#C75B73"
            stroke={OUTLINE}
            stroke-width={1.5}
            stroke-linejoin="round"
          />
          <path d={`M${x - 1.8} ${my + 2.2} Q${x} ${my + 0.8} ${x + 1.8} ${my + 2.2} Q${x} ${my + 3.4} ${x - 1.8} ${my + 2.2} Z`} fill="#FF9FB8" />
        </g>
      );
    } else {
      mouth = (
        <path
          d={e === 'sleep' ? `M${x - 2.4} ${my} Q${x} ${my + 1.4} ${x + 2.4} ${my}` : `M${x - 3} ${my - 0.4} Q${x} ${my + 2.8} ${x + 3} ${my - 0.4}`}
          fill="none"
          stroke={OUTLINE}
          stroke-width={1.6}
          stroke-linecap="round"
        />
      );
    }
    return (
      <g>
        {nostrils}
        {mouth}
      </g>
    );
  },
};
