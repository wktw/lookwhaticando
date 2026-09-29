import type { ArtCtx, SpeciesArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { lighten } from '../color';
import { OpenMouth } from '../face';
import { MIRROR } from './parts';

function RoundEar({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <circle cx={27.4} cy={36.2} r={8.6} fill={p.ear ?? p.body} stroke={OUTLINE} stroke-width={STROKE} />
      <circle cx={28} cy={36.8} r={4.6} fill={p.earInner} />
    </g>
  );
}

/** A rounded cocoa nose with a highlight, above a little "ω" or an open mouth. */
export function BearMouth({ ctx, noseRx = 3.4 }: { ctx: ArtCtx; noseRx?: number }) {
  const { x, y } = ctx.anchors.mouth;
  const e = ctx.expression;
  const ny = y - 3;
  const nose = (
    <g>
      <ellipse cx={x} cy={ny} rx={noseRx} ry={noseRx * 0.68} fill={ctx.look.palette.nose} />
      <ellipse cx={x - noseRx * 0.35} cy={ny - noseRx * 0.22} rx={noseRx * 0.32} ry={noseRx * 0.18} fill="#fff" opacity={0.7} />
    </g>
  );
  const my = ny + noseRx * 0.68;
  if (e === 'eat' || e === 'surprised') {
    return (
      <g>
        {nose}
        <OpenMouth x={x} y={my + 1.6} w={e === 'surprised' ? 4 : 5.6} h={e === 'surprised' ? 4.4 : 3.6} />
      </g>
    );
  }
  const open = e === 'happy' || e === 'love';
  return (
    <g>
      {open && (
        <path d={`M${x - 3.4} ${my + 1.8} Q${x} ${my + 7.2} ${x + 3.4} ${my + 1.8} Z`} fill="#C75B73" stroke={OUTLINE} stroke-width={1.4} stroke-linejoin="round" />
      )}
      <path
        d={`M${x} ${my} L${x} ${my + 1.6} M${x - 3.4} ${my + 1.8} Q${x - 1.7} ${my + 3.8} ${x} ${my + 1.6} Q${x + 1.7} ${my + 3.8} ${x + 3.4} ${my + 1.8}`}
        fill="none"
        stroke={OUTLINE}
        stroke-width={1.5}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      {nose}
    </g>
  );
}

export const bear: SpeciesArt = {
  back: () => null,
  tail: (ctx) => {
    const p = ctx.look.palette;
    return <circle class="pet-tail" style={{ '--tail-origin': '84px 84px' }} cx={85.6} cy={83} r={5} fill={p.tail ?? p.body} stroke={OUTLINE} stroke-width={STROKE} />;
  },
  ears: (ctx) => (
    <g>
      <RoundEar ctx={ctx} />
      <RoundEar ctx={ctx} mirror />
    </g>
  ),
  overlay: (ctx) => {
    const p = ctx.look.palette;
    const { x, y } = ctx.anchors.mouth;
    return <ellipse cx={x} cy={y - 0.4} rx={10.6} ry={7.8} fill={p.muzzle ?? lighten(p.body, 0.5)} />;
  },
  mouth: (ctx) => <BearMouth ctx={ctx} />,
};
