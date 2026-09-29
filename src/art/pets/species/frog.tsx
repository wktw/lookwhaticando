import type { ArtCtx, SpeciesArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { lighten } from '../color';
import { blinks, Eye, faceInk, OpenMouth } from '../face';
import { MIRROR } from './parts';

/** Webbed foot: an oval with three round toes, outlined as one shape (stroke pass, then fill pass). */
function Foot({ cx, fill }: { cx: number; fill: string }) {
  const toes = [-5, 0, 5].map((dx) => ({ cx: cx + dx, cy: 94, r: 2.2 }));
  const shapes = (
    <>
      <ellipse cx={cx} cy={92.2} rx={7.4} ry={3.2} />
      {toes.map((t) => (
        <circle key={t.cx} {...t} />
      ))}
    </>
  );
  return (
    <g>
      <g fill={fill} stroke={OUTLINE} stroke-width={STROKE * 1.8}>
        {shapes}
      </g>
      <g fill={fill}>{shapes}</g>
    </g>
  );
}

/**
 * The left eye bump as it sits on the body path: a dome filled with fur (its lower edge melts into
 * the face) and the bump's own contour. Mirror for the right.
 */
const BUMP_FILL =
  'M22.6 36.5 C22.6 31 27 26.5 33 26.5 C38.5 26.5 42.5 29.8 43.6 35 C44.1 37.2 44.9 38.6 45.6 40 C41 43.6 28.6 44.4 23.6 41 C23.2 39.4 22.8 38 22.6 36.5 Z';
const BUMP_EDGE = 'M22.6 36.5 C22.6 31 27 26.5 33 26.5 C38.5 26.5 42.5 29.8 43.6 35 C43.9 36.4 44.4 37.5 44.9 38.4';

function EyeBump({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <path d={BUMP_FILL} fill={ctx.look.palette.body} />
      <path d={BUMP_EDGE} fill="none" stroke={OUTLINE} stroke-width={STROKE} stroke-linecap="round" />
    </g>
  );
}

function FrogEyes({ ctx }: { ctx: ArtCtx }) {
  const { eyes } = ctx.anchors;
  return (
    <g class={blinks(ctx) ? 'pet-blink' : undefined}>
      <Eye x={eyes.left} y={eyes.y} ctx={ctx} side="l" scale={1.08} />
      <Eye x={eyes.right} y={eyes.y} ctx={ctx} side="r" scale={1.08} />
    </g>
  );
}

export const frog: SpeciesArt = {
  back: () => null,
  overlay: (ctx) => {
    const p = ctx.look.palette;
    const belly = p.belly ?? lighten(p.body, 0.55);
    const { x, y } = ctx.anchors.mouth;
    return (
      <g fill={belly}>
        <ellipse cx={50} cy={84} rx={26} ry={16} />
        <ellipse class="pet-throat" style={{ '--throat-origin': `${x}px ${y + 4}px` }} cx={x} cy={y + 7.2} rx={7.4} ry={3.4} opacity={0.9} />
      </g>
    );
  },
  feet: (ctx) => {
    const p = ctx.look.palette;
    const fill = p.feet ?? p.body;
    return (
      <g>
        <Foot cx={34} fill={fill} />
        <Foot cx={66} fill={fill} />
      </g>
    );
  },
  // The eye bumps are redrawn over head wear, so hats sit behind the eyes (like bunny ears).
  ears: (ctx) => (
    <g>
      <EyeBump ctx={ctx} />
      <EyeBump ctx={ctx} mirror />
      <FrogEyes ctx={ctx} />
    </g>
  ),
  eyes: (ctx) => (ctx.hidden?.has('ears') ? <FrogEyes ctx={ctx} /> : null),
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const e = ctx.expression;
    if (e === 'eat' || e === 'surprised') {
      return <OpenMouth x={x} y={y} w={e === 'surprised' ? 4.6 : 7.4} h={e === 'surprised' ? 4.8 : 4} />;
    }
    if (e === 'happy' || e === 'love') {
      return (
        <g>
          <path d={`M${x - 9} ${y - 0.4} Q${x} ${y + 9.4} ${x + 9} ${y - 0.4} Z`} fill="#C75B73" stroke={OUTLINE} stroke-width={1.6} stroke-linejoin="round" />
          <path d={`M${x - 4.4} ${y + 4.4} Q${x} ${y + 2.2} ${x + 4.4} ${y + 4.4} Q${x} ${y + 6.8} ${x - 4.4} ${y + 4.4} Z`} fill="#FF9FB8" />
        </g>
      );
    }
    const smile = e === 'sleep' ? `M${x - 6} ${y + 0.4} Q${x} ${y + 3} ${x + 6} ${y + 0.4}` : `M${x - 9} ${y - 0.6} Q${x} ${y + 5.6} ${x + 9} ${y - 0.6}`;
    return (
      <g>
        {e === 'wink' && (
          <path
            d={`M${x + 1} ${y + 2.2} Q${x + 1.4} ${y + 6.6} ${x + 3.8} ${y + 6} Q${x + 5.8} ${y + 5.2} ${x + 4.8} ${y + 1.6}`}
            fill="#FF9FB8"
            stroke={OUTLINE}
            stroke-width={1.3}
            stroke-linejoin="round"
          />
        )}
        <path d={smile} fill="none" stroke={faceInk(ctx)} stroke-width={1.7} stroke-linecap="round" />
      </g>
    );
  },
};
