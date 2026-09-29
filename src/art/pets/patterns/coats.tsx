import type { PatternRenderer } from './index';
import { bodyTop } from './layout';

/** Coat markings: tabby stripes, calico and tuxedo patches, points, masks and bibs. */

export const tabby: PatternRenderer = (ctx) => {
  const c = ctx.look.palette.pattern ?? '#E8955A';
  const top = bodyTop(ctx);
  const { eyes, neck } = ctx.anchors;
  const brow = Math.min(top + 9, eyes.y - 11);
  const flank = (y: number, side: 1 | -1) => {
    const x = 50 + side * (ctx.body.halfWidthAt(y) + 2);
    return `M${x} ${y} Q${x - side * 6} ${y + 1} ${x - side * 9} ${y + 5}`;
  };
  return (
    <g stroke={c} stroke-width={3} stroke-linecap="round" fill="none">
      {/* forehead "M" stripes */}
      <path d={`M43.5 ${top + 1} L44.5 ${brow - 1}`} />
      <path d={`M50 ${top} L50 ${brow + 0.5}`} />
      <path d={`M56.5 ${top + 1} L55.5 ${brow - 1}`} />
      {[neck.y - 8, neck.y].map((y) => (
        <g key={y}>
          <path d={flank(y, -1)} />
          <path d={flank(y, 1)} />
        </g>
      ))}
    </g>
  );
};

export const calico: PatternRenderer = (ctx) => {
  const orange = ctx.look.palette.pattern ?? '#F4B27A';
  const dark = ctx.look.palette.pattern2 ?? '#6E5250';
  // Head patches are placed for a cat's eye line (59) and follow other species' faces.
  const dy = ctx.anchors.eyes.y - 59;
  return (
    <g>
      <g transform={`translate(0 ${dy})`}>
        <path fill={orange} d="M14 36 C22 26 38 24 45 29 C48 32 45 38 40 40 C33 43 27 47 22 52 C17 57 10 50 14 36 Z" />
        <path fill={dark} d="M64 27 C71 27 80 32 83 40 C85 45 80 47 76 45 C72 43 70 39 66 37.5 C61.5 36 60.5 28 64 27 Z" />
      </g>
      <path fill={orange} d="M76 64 C81 60 90 63 90 71 C90 78 83 82 78 79 C73 76 72 67 76 64 Z" />
      <path fill={dark} d="M10 78 C14 74 22 75 24 80 C26 86 20 92 14 91 C8 90 7 82 10 78 Z" />
    </g>
  );
};

/** White muzzle and shirt-front bib. */
export const tuxedo: PatternRenderer = (ctx) => {
  const m = ctx.anchors.mouth.y;
  return (
    <path
      fill={ctx.look.palette.belly ?? '#FFFFFF'}
      d={`M50 ${m - 8.5} C57 ${m - 8.5} 62 ${m - 4} 62 ${m + 1} C62 ${m + 4} 60 ${m + 6} 58 ${m + 7.5} C63 ${m + 11} 66 ${m + 18} 64 96 L36 96 C34 ${m + 18} 37 ${m + 11} 42 ${m + 7.5} C40 ${m + 6} 38 ${m + 4} 38 ${m + 1} C38 ${m - 4} 43 ${m - 8.5} 50 ${m - 8.5} Z`}
    />
  );
};

/** Siamese points: a soft mocha mask around the muzzle (ears, feet and tail come from the palette). */
export const siamese: PatternRenderer = (ctx) => {
  const { x, y } = ctx.anchors.mouth;
  const c = ctx.look.palette.pattern ?? '#C9A48F';
  return (
    <g fill={c}>
      <ellipse cx={x} cy={y + 0.6} rx={11.5} ry={8} />
      <ellipse cx={50} cy={bodyTop(ctx) + 2} rx={9} ry={5} opacity={0.55} />
    </g>
  );
};

/** Panda: tilted eye patches (eyes stay readable on the mid-tone) and dark arms hugging the sides. */
export const panda: PatternRenderer = (ctx) => {
  const c = ctx.look.palette.pattern ?? '#6E5E69';
  const { eyes, neck } = ctx.anchors;
  const armY = neck.y + 7;
  const armX = ctx.body.halfWidthAt(armY) - 1;
  return (
    <g fill={c}>
      <ellipse cx={eyes.left - 0.8} cy={eyes.y + 0.8} rx={6.4} ry={7.8} transform={`rotate(28 ${eyes.left - 0.8} ${eyes.y + 0.8})`} />
      <ellipse cx={eyes.right + 0.8} cy={eyes.y + 0.8} rx={6.4} ry={7.8} transform={`rotate(-28 ${eyes.right + 0.8} ${eyes.y + 0.8})`} />
      <ellipse cx={50 - armX} cy={armY} rx={10} ry={12} />
      <ellipse cx={50 + armX} cy={armY} rx={10} ry={12} />
    </g>
  );
};

/** White socks look: a little chest bib and a forehead blaze (white feet come from palette.feet). */
export const socks: PatternRenderer = (ctx) => {
  const white = ctx.look.palette.belly ?? '#FFFFFF';
  const top = bodyTop(ctx);
  const { eyes, neck } = ctx.anchors;
  const blazeEnd = eyes.y - 3;
  return (
    <g fill={white}>
      <path d={`M50 ${top + 1} C52.4 ${top + 1} 53.2 ${blazeEnd - 6} 51.6 ${blazeEnd} L48.4 ${blazeEnd} C46.8 ${blazeEnd - 6} 47.6 ${top + 1} 50 ${top + 1} Z`} />
      <ellipse cx={50} cy={neck.y + 10} rx={10.5} ry={11} />
    </g>
  );
};

/** One soft patch over an ear corner, well above the eye, and one on the body. */
export const patch: PatternRenderer = (ctx) => {
  const c = ctx.look.palette.pattern ?? '#B89A86';
  const { eyes } = ctx.anchors;
  const top = bodyTop(ctx);
  const py = Math.min(top + 8, eyes.y - 13);
  return (
    <g fill={c}>
      <path d={`M${eyes.left - 16} ${py - 10} C${eyes.left - 6} ${py - 14} ${eyes.left + 6} ${py - 8} ${eyes.left + 5} ${py + 1} C${eyes.left + 4} ${py + 6} ${eyes.left - 4} ${py + 7} ${eyes.left - 10} ${py + 9} C${eyes.left - 16} ${py + 11} ${eyes.left - 22} ${py + 2} ${eyes.left - 16} ${py - 10} Z`} />
      <path d="M62 82 C64 77 71 76 74.5 79.5 C78 83 76.5 90 71 91.5 C65.5 93 60.5 87.5 62 82 Z" />
    </g>
  );
};

/** Shiba "urajiro": cream cheeks, brow dots and chest. */
export const urajiro: PatternRenderer = (ctx) => {
  const c = ctx.look.palette.belly ?? '#FFF4E4';
  const { eyes, neck, mouth } = ctx.anchors;
  return (
    <g fill={c}>
      <ellipse cx={eyes.left - 3} cy={mouth.y + 1} rx={10} ry={7.4} />
      <ellipse cx={eyes.right + 3} cy={mouth.y + 1} rx={10} ry={7.4} />
      <ellipse cx={50} cy={mouth.y + 3} rx={10} ry={8} />
      <ellipse cx={eyes.left + 0.6} cy={eyes.y - 7.6} rx={2.4} ry={1.5} transform={`rotate(-12 ${eyes.left + 0.6} ${eyes.y - 7.6})`} />
      <ellipse cx={eyes.right - 0.6} cy={eyes.y - 7.6} rx={2.4} ry={1.5} transform={`rotate(12 ${eyes.right - 0.6} ${eyes.y - 7.6})`} />
      <ellipse cx={50} cy={neck.y + 11} rx={13} ry={12} />
    </g>
  );
};

/** Mallard: glossy green hood with a crisp white neck ring. */
export const mallard: PatternRenderer = (ctx) => {
  const hood = ctx.look.palette.pattern ?? '#8FD0A8';
  const ring = ctx.look.palette.pattern2 ?? '#FFFFFF';
  const y = ctx.anchors.mouth.y + 5;
  return (
    <g>
      <path d={`M0 0 L100 0 L100 ${y - 2} Q50 ${y + 5} 0 ${y - 2} Z`} fill={hood} />
      <path d={`M0 ${y - 2} Q50 ${y + 5} 100 ${y - 2}`} fill="none" stroke={ring} stroke-width={2.6} />
    </g>
  );
};

export const bellyOnly: PatternRenderer = ({ look }) =>
  look.palette.belly ? <ellipse cx={50} cy={84} rx={19} ry={12} fill={look.palette.belly} /> : null;
