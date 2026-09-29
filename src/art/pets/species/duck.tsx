import type { ArtCtx, SpeciesArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { shade } from '../color';
import { MIRROR } from './parts';

const BILL = '#FFB877';

/** Little wing nub resting on the side of the body. */
function Wing({ ctx, mirror }: { ctx: ArtCtx; mirror?: boolean }) {
  const p = ctx.look.palette;
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <path
        d="M22.4 66.2 C17.6 68.4 15.2 74.4 16.4 80.6 C16.8 82.4 18.6 83 20.2 82.2 C23.8 80.2 26.4 75.6 26.6 71 C26.7 68.6 25 66.4 22.4 66.2 Z"
        fill={shade(p.body, 0.08)}
        stroke={OUTLINE}
        stroke-width={STROKE * 0.85}
        stroke-linejoin="round"
      />
    </g>
  );
}

export const duck: SpeciesArt = {
  // Three-feather tuft, tucked behind the top of the head.
  back: (ctx) => {
    const p = ctx.look.palette;
    return (
      <g class="pet-tuft" fill={p.pattern ?? p.body} stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round">
        <path d="M44.2 33 C41.6 30.6 40.4 27.6 40.8 24.8 C43.6 25.8 45.8 28.2 47 31.2 Z" />
        <path d="M55.8 33 C58.4 30.6 59.6 27.6 59.2 24.8 C56.4 25.8 54.2 28.2 53 31.2 Z" />
        <path d="M47.6 32.4 C46.6 27.6 47.6 23 50.6 20 C52.4 23.6 52.8 28.2 52.2 32.4 Z" />
      </g>
    );
  },
  tail: (ctx) => {
    const p = ctx.look.palette;
    return (
      <path
        class="pet-tail"
        style={{ '--tail-origin': '84px 86px' }}
        d="M80 85 C84.6 83.8 88.2 80.6 90.4 75.8 C91.6 78.6 91 82 89.4 84.2 C91 84.4 92.4 84 93.6 83.2 C92.4 87.6 88.2 90.6 81.6 90.8 Z"
        fill={p.tail ?? p.body}
        stroke={OUTLINE}
        stroke-width={STROKE * 0.9}
        stroke-linejoin="round"
      />
    );
  },
  feet: (ctx) => {
    const p = ctx.look.palette;
    const fill = p.feet ?? p.accent ?? BILL;
    const foot = (cx: number) => (
      <g key={cx}>
        <path
          d={`M${cx - 7.4} ${92.4} C${cx - 7.4} ${89.6} ${cx + 7.4} ${89.6} ${cx + 7.4} ${92.4} C${cx + 7.4} ${94.6} ${cx + 5} ${95.4} ${cx + 3.6} ${94.6} C${cx + 2.4} ${95.6} ${cx + 1} ${95.6} ${cx} ${94.8} C${cx - 1} ${95.6} ${cx - 2.4} ${95.6} ${cx - 3.6} ${94.6} C${cx - 5} ${95.4} ${cx - 7.4} ${94.6} ${cx - 7.4} ${92.4} Z`}
          fill={fill}
          stroke={OUTLINE}
          stroke-width={STROKE * 0.85}
          stroke-linejoin="round"
        />
      </g>
    );
    return <g>{[38.5, 61.5].map(foot)}</g>;
  },
  front: (ctx) => (
    <g>
      <Wing ctx={ctx} />
      <Wing ctx={ctx} mirror />
    </g>
  ),
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const bill = ctx.look.palette.accent ?? BILL;
    const e = ctx.expression;
    const open = e === 'happy' || e === 'love' || e === 'eat' || e === 'surprised';
    const w = 7.4;
    if (open) {
      const drop = e === 'surprised' ? 6.2 : e === 'eat' ? 4.6 : 5.4;
      return (
        <g stroke={OUTLINE} stroke-width={1.6} stroke-linejoin="round">
          <path d={`M${x - w + 0.6} ${y + 0.4} C${x - w + 1} ${y + drop + 1.6} ${x + w - 1} ${y + drop + 1.6} ${x + w - 0.6} ${y + 0.4} Z`} fill={shade(bill, 0.1)} />
          <path d={`M${x - w + 2} ${y + 0.8} C${x - w + 2.6} ${y + drop} ${x + w - 2.6} ${y + drop} ${x + w - 2} ${y + 0.8} Z`} fill="#C75B73" stroke="none" />
          <path d={`M${x - 2.4} ${y + drop - 0.6} Q${x} ${y + drop - 2.2} ${x + 2.4} ${y + drop - 0.6}`} fill="#FF9FB8" stroke="none" />
          <path d={`M${x - w} ${y - 0.4} C${x - w} ${y - 3.8} ${x + w} ${y - 3.8} ${x + w} ${y - 0.4} C${x + w} ${y + 1.6} ${x + 3} ${y + 2.2} ${x} ${y + 2.2} C${x - 3} ${y + 2.2} ${x - w} ${y + 1.6} ${x - w} ${y - 0.4} Z`} fill={bill} />
          <g fill={OUTLINE} stroke="none" opacity={0.5}>
            <ellipse cx={x - 2.2} cy={y - 1.4} rx={0.7} ry={0.5} />
            <ellipse cx={x + 2.2} cy={y - 1.4} rx={0.7} ry={0.5} />
          </g>
        </g>
      );
    }
    return (
      <g stroke={OUTLINE} stroke-width={1.6} stroke-linejoin="round">
        <path d={`M${x - w} ${y} C${x - w} ${y - 3.6} ${x + w} ${y - 3.6} ${x + w} ${y} C${x + w} ${y + 2.8} ${x + 3.4} ${y + 3.8} ${x} ${y + 3.8} C${x - 3.4} ${y + 3.8} ${x - w} ${y + 2.8} ${x - w} ${y} Z`} fill={bill} />
        <path d={`M${x - w + 1.6} ${y + 0.6} Q${x} ${y + (e === 'wink' ? 3 : 2.2)} ${x + w - 1.6} ${y + 0.6}`} fill="none" stroke-width={1.2} opacity={0.55} stroke-linecap="round" />
        <g fill={OUTLINE} stroke="none" opacity={0.5}>
          <ellipse cx={x - 2.2} cy={y - 1.2} rx={0.7} ry={0.5} />
          <ellipse cx={x + 2.2} cy={y - 1.2} rx={0.7} ry={0.5} />
        </g>
      </g>
    );
  },
};
