import type { ArtCtx, SpeciesArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { faceInk, OpenMouth } from '../face';
import { MIRROR } from './parts';

function SmallEar({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <circle cx={30} cy={40.2} r={6.6} fill={p.ear ?? p.body} stroke={OUTLINE} stroke-width={STROKE} />
      <circle cx={30.6} cy={40.8} r={3.4} fill={p.earInner} />
    </g>
  );
}

export const hamster: SpeciesArt = {
  back: () => null,
  ears: (ctx) => (
    <g>
      <SmallEar ctx={ctx} />
      <SmallEar ctx={ctx} mirror />
    </g>
  ),
  overlay: (ctx) => {
    const p = ctx.look.palette;
    const { cheeks } = ctx.anchors;
    const c = cheeks ?? { y: 67, left: 27, right: 73 };
    // White muzzle, cheeks and tummy: the classic hamster bib.
    return (
      <g fill={p.belly ?? '#FFFFFF'}>
        <ellipse cx={50} cy={87} rx={29} ry={17} />
        <circle cx={c.left + 8} cy={c.y + 2.4} r={10.6} />
        <circle cx={c.right - 8} cy={c.y + 2.4} r={10.6} />
        <ellipse cx={50} cy={68} rx={10} ry={6.4} />
      </g>
    );
  },
  front: (ctx) => {
    const p = ctx.look.palette;
    const paw = p.feet ?? '#FFC9D4';
    return (
      <g>
        {ctx.expression === 'eat' && (
          // A sunflower seed held up to nibble.
          <g transform="translate(50 70.4) rotate(-8)" stroke={OUTLINE} stroke-width={1.2} stroke-linejoin="round">
            <path d="M0 -4.6 C2.6 -3 2.8 2.6 0 4.2 C-2.8 2.6 -2.6 -3 0 -4.6 Z" fill="#7D6A74" />
            <path d="M0 -3.6 L0 3.4" stroke="#EDE3E6" stroke-width={0.9} />
          </g>
        )}
        {/* tiny pink paws tucked together under the chin */}
        <g fill={paw} stroke={OUTLINE} stroke-width={1.3}>
          <ellipse cx={46.6} cy={73.6} rx={2.5} ry={2.1} transform="rotate(-24 46.6 73.6)" />
          <ellipse cx={53.4} cy={73.6} rx={2.5} ry={2.1} transform="rotate(24 53.4 73.6)" />
        </g>
      </g>
    );
  },
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const e = ctx.expression;
    const ny = y - 1.8;
    const nose = <ellipse cx={x} cy={ny} rx={1.9} ry={1.3} fill={ctx.look.palette.nose} />;
    if (e === 'eat' || e === 'surprised') {
      return (
        <g class="pet-nibble" style={{ '--mouth-origin': `${x}px ${y}px` }}>
          {nose}
          <OpenMouth x={x} y={ny + 2.4} w={e === 'surprised' ? 3.6 : 4.4} h={e === 'surprised' ? 4 : 3} />
        </g>
      );
    }
    const open = e === 'happy' || e === 'love';
    return (
      <g class="pet-nibble" style={{ '--mouth-origin': `${x}px ${y}px` }}>
        {open && <path d={`M${x - 2.6} ${ny + 2.6} Q${x} ${ny + 6.4} ${x + 2.6} ${ny + 2.6} Z`} fill="#C75B73" stroke={OUTLINE} stroke-width={1.2} stroke-linejoin="round" />}
        <path
          d={`M${x} ${ny + 1.2} L${x} ${ny + 2.4} M${x - 2.8} ${ny + 2.6} Q${x - 1.4} ${ny + 4} ${x} ${ny + 2.4} Q${x + 1.4} ${ny + 4} ${x + 2.8} ${ny + 2.6}`}
          fill="none"
          stroke={faceInk(ctx)}
          stroke-width={1.3}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        {nose}
      </g>
    );
  },
};
