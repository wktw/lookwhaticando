import type { ArtCtx, WearableArt } from '../pets/types';
import { dropPath, heartPath, starPath } from '../pets/shapes';
import { ctxIcon, ICON_CTX, INK, SW } from './kit';

/** Face wear, placed on the eye and mouth anchors. */

/** Lens radius that fits between a species' eyes. */
const lensR = ({ anchors }: ArtCtx) => Math.min(7.2, (anchors.eyes.right - anchors.eyes.left) * 0.34);

/** Temple arms and bridge for any pair of lenses. */
function Frame({ ctx, r, color, width = 1.9, lift = 1 }: { ctx: ArtCtx; r: number; color: string; width?: number; lift?: number }) {
  const { left, right, y } = ctx.anchors.eyes;
  return (
    <g fill="none" stroke={color} stroke-width={width} stroke-linecap="round">
      <path d={`M${left + r} ${y - lift} Q50 ${y - lift - 2.5} ${right - r} ${y - lift}`} />
      <path d={`M${left - r} ${y - lift} L${left - r - 5} ${y - lift - 2}`} />
      <path d={`M${right + r} ${y - lift} L${right + r + 5} ${y - lift - 2}`} />
    </g>
  );
}

/** Round reading glasses across the eye anchors. */
const readingGlassesRender = (ctx: ArtCtx) => {
  const { left, right, y } = ctx.anchors.eyes;
  const r = lensR(ctx);
  return (
    <g fill="rgba(255,255,255,0.28)" stroke="#8C6A5A" stroke-width={1.9}>
      <circle cx={left} cy={y} r={r} />
      <circle cx={right} cy={y} r={r} />
      <path d={`M${left + r} ${y - 1} Q50 ${y - 3.5} ${right - r} ${y - 1}`} fill="none" />
      <path d={`M${left - r} ${y - 1} L${left - r - 5} ${y - 3}`} fill="none" />
      <path d={`M${right + r} ${y - 1} L${right + r + 5} ${y - 3}`} fill="none" />
      <path d={`M${left - r * 0.45} ${y - r * 0.45} q${r * 0.3} ${-r * 0.25} ${r * 0.6} ${-r * 0.2}`} stroke="#fff" stroke-width={1.2} fill="none" />
    </g>
  );
};
export const readingGlasses: WearableArt = { render: readingGlassesRender, icon: ctxIcon(readingGlassesRender, 1.8) };

/** A fluffy white milk mustache on the upper lip, with one little drip. */
const milkMustacheRender = ({ anchors }: ArtCtx) => {
  const { x, y } = anchors.mouth;
  const m = y + 0.8;
  return (
    <g stroke={INK} stroke-width={SW * 0.7} stroke-linejoin="round">
      <path
        d={`M${x - 9} ${m} C${x - 10} ${m - 3} ${x - 6.4} ${m - 4.8} ${x - 3.6} ${m - 3.2} C${x - 2.2} ${m - 4.8} ${x + 2.2} ${m - 4.8} ${x + 3.6} ${m - 3.2} C${x + 6.4} ${m - 4.8} ${x + 10} ${m - 3} ${x + 9} ${m} C${x + 8.4} ${m + 2.4} ${x + 5} ${m + 2.8} ${x + 3} ${m + 1.6} C${x + 2.6} ${m + 4.6} ${x + 0.6} ${m + 4.6} ${x + 0.8} ${m + 1.8} C${x - 1.4} ${m + 2.8} ${x - 4} ${m + 2.8} ${x - 5} ${m + 2} C${x - 7} ${m + 3} ${x - 9.4} ${m + 2.4} ${x - 9} ${m} Z`}
        fill="#FFFFFF"
      />
      <path d={`M${x - 6} ${m - 1.6} C${x - 4.6} ${m - 2.6} ${x - 3} ${m - 2.4} ${x - 2} ${m - 1.4}`} fill="none" stroke="#E7F3FD" stroke-width={1.1} />
    </g>
  );
};
/** Icon: the same mustache waxed into a handlebar, with two milk drips. */
const handlebar = (side: 1 | -1) => `M${50 + side * 8.6} 50.6 C${50 + side * 11.6} 51.6 ${50 + side * 13.6} 49.6 ${50 + side * 13.4} 47.4 C${50 + side * 13.2} 45.4 ${50 + side * 11.2} 45 ${50 + side * 10.4} 46.4`;
export const milkMustache: WearableArt = {
  render: milkMustacheRender,
  icon: () => (
    <g transform="translate(50 50) scale(2.9) translate(-50 -51)" stroke-linecap="round" stroke-linejoin="round">
      {[-1, 1].map((side) => (
        <g key={side} fill="none">
          <path d={handlebar(side as 1 | -1)} stroke={INK} stroke-width={3} />
          <path d={handlebar(side as 1 | -1)} stroke="#FFFFFF" stroke-width={1.6} />
        </g>
      ))}
      <g fill="#FFFFFF" stroke={INK} stroke-width={0.85}>
        <path d={dropPath(46.6, 55.4, 1.9)} />
        <path d={dropPath(53.2, 54.6, 1.4)} />
      </g>
      {milkMustacheRender(ICON_CTX)}
    </g>
  ),
};

/** Star-shaped celebrity sunglasses. */
const starShadesRender = (ctx: ArtCtx) => {
  const { left, right, y } = ctx.anchors.eyes;
  const r = lensR(ctx) * 1.28;
  return (
    <g stroke-linejoin="round">
      <Frame ctx={ctx} r={r * 0.8} color="#F58CAA" width={2.2} lift={0.4} />
      {[left, right].map((cx) => (
        <g key={cx}>
          <path d={starPath(cx, y + 0.4, r, 0.56)} fill="#6E5C8F" stroke={INK} stroke-width={1.2 + 2.6} />
          <path d={starPath(cx, y + 0.4, r, 0.56)} fill="#6E5C8F" stroke="#F58CAA" stroke-width={2.4} />
          <path
            d={`M${cx - r * 0.36} ${y - r * 0.12} L${cx - r * 0.06} ${y - r * 0.42}`}
            stroke="#FFFFFF"
            stroke-width={1.3}
            stroke-linecap="round"
            opacity={0.85}
          />
        </g>
      ))}
    </g>
  );
};
export const starShades: WearableArt = { render: starShadesRender, icon: ctxIcon(starShadesRender, 1.76) };

/** A soft sleep mask with embroidered closed eyes. */
const sleepMaskRender = ({ anchors }: ArtCtx) => {
  const { left, right, y } = anchors.eyes;
  const cx = (left + right) / 2;
  const hw = (right - left) / 2 + 8.5;
  const h = 6.4;
  const lash = (ex: number) => (
    <g fill="none" stroke={INK} stroke-width={1.3} stroke-linecap="round">
      <path d={`M${ex - 3.4} ${y - 0.6} Q${ex} ${y + 2.6} ${ex + 3.4} ${y - 0.6}`} />
      <path
        d={`M${ex - 2.6} ${y + 1} L${ex - 3.4} ${y + 2.6} M${ex} ${y + 1.8} L${ex} ${y + 3.6} M${ex + 2.6} ${y + 1} L${ex + 3.4} ${y + 2.6}`}
        stroke-width={1}
      />
    </g>
  );
  return (
    <g stroke-linejoin="round">
      <path
        d={`M${cx - hw} ${y - 1} L${cx - hw - 6} ${y - 3} M${cx + hw} ${y - 1} L${cx + hw + 6} ${y - 3}`}
        stroke={INK}
        stroke-width={2.4}
        stroke-linecap="round"
      />
      <path
        d={`M${cx - hw} ${y} C${cx - hw} ${y - h} ${cx - 2.4} ${y - h - 1} ${cx} ${y - h + 1.8} C${cx + 2.4} ${y - h - 1} ${cx + hw} ${y - h} ${cx + hw} ${y} C${cx + hw} ${y + h} ${cx + 2.4} ${y + h + 0.6} ${cx} ${y + h - 1.2} C${cx - 2.4} ${y + h + 0.6} ${cx - hw} ${y + h} ${cx - hw} ${y} Z`}
        fill="#D6C8F8"
        stroke={INK}
        stroke-width={SW * 0.85}
      />
      {lash(left)}
      {lash(right)}
      <path d={starPath(cx, y - h + 4.4, 1.6)} fill="#FFE593" stroke={INK} stroke-width={0.7} />
    </g>
  );
};
export const sleepMask: WearableArt = { render: sleepMaskRender, icon: ctxIcon(sleepMaskRender, 1.62) };

/** Thin pink heart-shaped frames with a rosy tint. */
const heartGlassesRender = (ctx: ArtCtx) => {
  const { left, right, y } = ctx.anchors.eyes;
  const s = lensR(ctx) * 1.05;
  return (
    <g stroke-linejoin="round">
      <Frame ctx={ctx} r={s * 0.9} color="#F58CAA" width={1.8} lift={1.2} />
      {[left, right].map((cx) => (
        <g key={cx}>
          <path d={heartPath(cx, y + 0.6, s)} fill="rgba(255,196,211,0.45)" stroke="#F58CAA" stroke-width={2} />
          <path
            d={`M${cx - s * 0.62} ${y - s * 0.3} q${s * 0.2} ${-s * 0.3} ${s * 0.5} ${-s * 0.34}`}
            fill="none"
            stroke="#FFFFFF"
            stroke-width={1.2}
            stroke-linecap="round"
          />
        </g>
      ))}
    </g>
  );
};
export const heartGlasses: WearableArt = { render: heartGlassesRender, icon: ctxIcon(heartGlassesRender, 1.8) };

/** Chunky white sunglasses with deep rose heart lenses. */
const heartShadesRender = (ctx: ArtCtx) => {
  const { left, right, y } = ctx.anchors.eyes;
  const s = lensR(ctx) * 1.18;
  return (
    <g stroke-linejoin="round">
      <Frame ctx={ctx} r={s * 0.9} color="#FFFFFF" width={2.6} lift={1} />
      <Frame ctx={ctx} r={s * 0.9} color={INK} width={0.9} lift={1} />
      {[left, right].map((cx) => (
        <g key={cx}>
          <path d={heartPath(cx, y + 0.6, s)} fill="#D9557E" stroke={INK} stroke-width={1.2 + 3} />
          <path d={heartPath(cx, y + 0.6, s)} fill="#D9557E" stroke="#FFFFFF" stroke-width={2.6} />
          <path
            d={`M${cx - s * 0.58} ${y - s * 0.28} q${s * 0.2} ${-s * 0.3} ${s * 0.5} ${-s * 0.34}`}
            fill="none"
            stroke="#FFFFFF"
            stroke-width={1.4}
            stroke-linecap="round"
            opacity={0.9}
          />
        </g>
      ))}
    </g>
  );
};
export const heartShades: WearableArt = { render: heartShadesRender, icon: ctxIcon(heartShadesRender, 1.74) };
