import type { JSX } from 'preact';
import { C, GARMENT, GARMENT_NECK, item } from './kit';
import type { WearCtx } from '../pets/types';
import { ellipse, fmt, rrect, scallop } from '../pets/shape';
import { heart, star } from '../pets/species/marks';

/**
 * Body wear, drawn in the canonical body frame (u 0–100 from rump to chest, v 0–100 from back to
 * belly) and clipped to the torso, so a sweater fits a sitting cat and a standing cow alike.
 * Garments cover the front of the body from u ≈ 34; a rug covers the back. Motifs keep their
 * shape with `round`, which undoes the frame's stretch. Icons lay the garment out flat.
 */

const FRONT = 'M34 -12H112V112H34Z';
/** Undo the body frame's stretch around (u, v) so hearts and stars stay round. */
const round = (ctx: WearCtx | null, u: number, v: number) => (ctx ? `translate(${u} ${v}) scale(1 ${fmt(ctx.body.aspect)}) translate(${-u} ${-v})` : undefined);

/** Bands across the body (perpendicular to the spine), from `u0` every `step`. */
const bands = (u0: number, step: number, w: number, n: number) => Array.from({ length: n }, (_, i) => rrect(u0 + i * step, -12, w, 124, 0)).join('');

/** A flat-lay garment icon: the outline in `base`, with `inside` drawn over it and trimmed at the hem. */
function garmentIcon(base: string, inside: JSX.Element | null, collar: string = C.paper) {
  return (
    <g>
      <path d={GARMENT} fill={base} />
      {inside}
      <path d={GARMENT_NECK} fill={collar} opacity={0.6} />
    </g>
  );
}

export const knitSweater = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: () => (
    <g>
      <path d={FRONT} fill={C.cream} />
      <path d={bands(46, 14, 6, 5)} fill={C.blush} />
      <path d="M34 -12H40V112H34Z" fill={C.blushDeep} />
      <path d="M35.5 -12V112M38.5 -12V112" class="pet-line" stroke={C.blush} stroke-width="0.8" fill="none" />
    </g>
  ),
  icon: () =>
    garmentIcon(
      C.cream,
      <g fill={C.blush}>
        <path d="M26 40H74V46H26ZM26 54H74V60H26ZM26 68H74V74H26Z" />
        <path d="M26 78H74V82C66 86 34 86 26 82Z" fill={C.blushDeep} />
      </g>,
    ),
});

/** A small knitted snowflake: a cross and a saltire of stitches round a centre. */
const snowflake = (x: number, y: number, r: number) => {
  const k = r * 0.28;
  const arm = (a: number) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `M${fmt(x - s * k)} ${fmt(y + c * k)}L${fmt(x + c * r - s * k * 0.5)} ${fmt(y + s * r + c * k * 0.5)}L${fmt(x + c * r + s * k * 0.5)} ${fmt(y + s * r - c * k * 0.5)}L${fmt(x + s * k)} ${fmt(y - c * k)}Z`;
  };
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => arm((i * Math.PI) / 4)).join('');
};

/** Fair Isle: navy wool with a cream yoke of snowflakes, knitted in two colours. */
export const fairisleSweater = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: (ctx) => (
    <g>
      <path d={FRONT} fill={C.navy} />
      {/* The yoke round the neck, and a band at the hem. */}
      <path d="M66 -12H112V112H66Z" fill={C.wool} />
      <g fill={C.navy}>
        {[4, 26, 48, 70, 92].map((v) => (
          <path key={v} d={snowflake(80, v, 5.6)} transform={round(ctx, 80, v)} />
        ))}
      </g>
      <path d="M59 -12H61.6V112H59Z" fill={C.wool} />
      <path d="M34 -12H40V112H34Z" fill={C.wool} />
    </g>
  ),
  icon: () =>
    garmentIcon(
      C.navy,
      <g>
        <path d="M24 30H76V52H24Z" fill={C.wool} />
        <g fill={C.navy}>
          {[33, 50, 67].map((x) => (
            <path key={x} d={snowflake(x, 41, 6)} />
          ))}
        </g>
        <path d="M26 78H74V82C66 86 34 86 26 82Z" fill={C.wool} />
      </g>,
      C.wool,
    ),
});

export const heartKnit = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: (ctx) => (
    <g>
      <path d={FRONT} fill={C.wool} />
      <path d="M34 -12H40V112H34Z" fill={C.woolDeep} />
      <path d={heart(84, 50, 16, 14)} fill={C.red} transform={round(ctx, 84, 50)} />
    </g>
  ),
  icon: () =>
    garmentIcon(
      C.wool,
      <g>
        <path d={heart(50, 52, 18, 16)} fill={C.red} />
        <path d="M26 78H74V82C66 86 34 86 26 82Z" fill={C.woolDeep} />
      </g>,
    ),
});

export const stripedTee = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: () => (
    <g>
      <path d="M38 -12H112V112H38Z" fill={C.paper} />
      <path d={bands(44, 9, 4, 8)} fill={C.navy} />
    </g>
  ),
  icon: () => garmentIcon(C.paper, <path d="M22 36H78V40H22ZM24 46H76V50H24ZM26 56H74V60H26ZM26 66H74V70H26ZM26 76H74V80H26Z" fill={C.navy} />),
});

export const pumpkinCardigan = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: (ctx) => (
    <g>
      <path d={FRONT} fill={C.pumpkin} />
      <path d="M34 -12H40V112H34Z" fill="#CF8444" />
      <path d="M100 -12H106V112H100Z" fill="#CF8444" />
      <g fill={C.cream} transform={round(ctx, 103, 50)}>
        <circle cx={103} cy={30} r={2.4} />
        <circle cx={103} cy={50} r={2.4} />
        <circle cx={103} cy={70} r={2.4} />
      </g>
    </g>
  ),
  icon: () =>
    garmentIcon(
      C.pumpkin,
      <g>
        <path d="M47 28H53V84H47Z" fill="#CF8444" />
        <g fill={C.cream}>
          <circle cx={50} cy={40} r={2.6} />
          <circle cx={50} cy={54} r={2.6} />
          <circle cx={50} cy={68} r={2.6} />
        </g>
      </g>,
    ),
});

export const starryPajamas = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: (ctx) => (
    <g>
      <path d="M30 -12H112V112H30Z" fill={C.navy} />
      <g fill={C.butter}>
        {[
          [42, 18],
          [58, 44],
          [76, 16],
          [90, 62],
          [48, 76],
          [70, 88],
          [96, 30],
        ].map(([u, v]) => (
          <path key={`${u}${v}`} d={star(u!, v!, 3)} transform={round(ctx, u!, v!)} />
        ))}
      </g>
    </g>
  ),
  icon: () =>
    garmentIcon(
      C.navy,
      <g fill={C.butter}>
        {[
          [36, 40],
          [58, 36],
          [46, 58],
          [66, 62],
          [34, 72],
          [54, 76],
        ].map(([x, y]) => (
          <path key={`${x}${y}`} d={star(x!, y!, 3.4)} />
        ))}
      </g>,
    ),
});

export const heatherShawl = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: (ctx) => (
    <g>
      <path d="M50 -12H112V70C104 60 96 56 88 62C80 54 72 52 64 58C60 46 56 38 50 34Z" fill={C.heather} />
      <path d="M54 -12H58V40M66 -12V50M78 -12V56M90 -12V60" class="pet-line" stroke="#9D97A1" stroke-width="0.8" fill="none" />
      <g transform={round(ctx, 96, 50)}>
        <circle cx={96} cy={50} r={3.2} fill={C.brass} />
        <circle cx={96} cy={50} r={1.4} fill={C.brassDeep} />
      </g>
    </g>
  ),
  icon: () => (
    <g>
      <path d="M14 30C30 24 70 24 86 30L80 58C70 50 60 50 50 62C40 50 30 50 20 58Z" fill={C.heather} />
      <path d="M30 28V52M42 27V58M58 27V58M70 28V52" class="pet-line" stroke="#9D97A1" stroke-width="1.2" fill="none" />
      <circle cx={50} cy={36} r={4.4} fill={C.brass} />
      <circle cx={50} cy={36} r={2} fill={C.brassDeep} />
    </g>
  ),
});

export const linenApron = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: () => (
    <g>
      <path d="M36 26H112V32H36Z" fill={C.oat} />
      <path d="M62 24H112V112H62Z" fill={C.linen} />
      <path d={rrect(74, 58, 16, 14, 2)} fill={C.oat} />
    </g>
  ),
  icon: () => (
    <g>
      <path d="M14 30H86V35H14Z" fill={C.oat} />
      <path d="M30 32H70V84C60 88 40 88 30 84Z" fill={C.linen} />
      <path d={rrect(40, 52, 20, 16, 2)} fill={C.oat} />
      <path d="M36 22C40 14 60 14 64 22L62 32H38Z" fill={C.linen} />
    </g>
  ),
});

export const woolRug = item({
  slot: 'body',
  hideIn: ['sleep'],
  draw: () => (
    <g>
      <path d="M6 -12H96V64C70 70 32 70 6 64Z" fill={C.red} />
      <path d={`${bands(18, 24, 8, 4)}`} fill={C.navy} opacity={0.4} />
      <path d="M6 10H96V18H6ZM6 38H96V46H6Z" fill="#3E6A55" opacity={0.45} />
      <path d="M6 27H96V28.4H6ZM30 -12V66M54 -12V68M78 -12V66" class="pet-line" stroke={C.butter} stroke-width="0.9" fill="none" />
      <path d="M86 60H92V112H86Z" fill={C.leather} />
      <path d={rrect(84.6, 70, 8.8, 7, 1.4)} fill={C.brass} />
    </g>
  ),
  icon: () => (
    <g>
      <path d={rrect(16, 26, 68, 48, 6)} fill={C.red} />
      <path d="M26 26H34V74H26ZM50 26H58V74H50ZM74 26H80V74H74Z" fill={C.navy} opacity={0.4} />
      <path d="M16 38H84V46H16ZM16 58H84V64H16Z" fill="#3E6A55" opacity={0.45} />
      <path d="M16 51H84M40 26V74M66 26V74" class="pet-line" stroke={C.butter} stroke-width="1.2" fill="none" />
      <path d={rrect(42, 70, 16, 8, 2)} fill={C.brass} />
    </g>
  ),
});

/** The raincoat's hood, standing up by itself behind the head. */
function hood(fill: string, trim: string, opacity = 1) {
  return (ctx: WearCtx) => {
    const h = ctx.head.hat;
    const r = h.w * 0.66;
    return (
      <g opacity={opacity}>
        <path d={ellipse(h.x - h.w * 0.1, h.y + r * 0.74, r * 1.1, r * 1.08)} fill={trim} />
        <path d={scallop(h.x - h.w * 0.1, h.y + r * 0.74, r * 1.02, r, 12, 0.02)} fill={fill} />
      </g>
    );
  };
}

export const dogRaincoat = item({
  slot: 'body',
  hideIn: ['sleep'],
  hood: hood(C.butter, C.mustard),
  draw: (ctx) => (
    <g>
      <path d="M30 -12H112V112H30Z" fill={C.butter} />
      <path d="M30 -12H34V112H30Z" fill={C.mustard} />
      <g fill={C.mustard} transform={round(ctx, 98, 50)}>
        <circle cx={98} cy={34} r={1.8} />
        <circle cx={98} cy={52} r={1.8} />
        <circle cx={98} cy={70} r={1.8} />
      </g>
    </g>
  ),
  icon: () => (
    <g>
      <path d="M36 22C36 10 64 10 64 22Z" fill={C.butter} />
      {garmentIcon(
        C.butter,
        <g fill={C.mustard}>
          <circle cx={50} cy={42} r={2.4} />
          <circle cx={50} cy={56} r={2.4} />
          <circle cx={50} cy={70} r={2.4} />
        </g>,
        C.mustard,
      )}
    </g>
  ),
});

export const clearRaincoat = item({
  slot: 'body',
  hideIn: ['sleep'],
  hood: hood('#FFFFFF', C.blush, 0.5),
  draw: () => (
    <g>
      <path d="M30 -12H112V112H30Z" fill="#FFFFFF" opacity={0.42} />
      <path d="M30 -12H34V112H30Z" fill={C.blush} />
      <path d="M30 98H112V112H30Z" fill={C.blush} opacity={0.8} />
    </g>
  ),
  icon: () => (
    <g>
      <path d={GARMENT} fill="#E9EEF3" />
      <path d="M26 78H74V82C66 86 34 86 26 82Z" fill={C.blush} />
      <path d={GARMENT_NECK} fill={C.blush} />
      <path d="M32 34L40 30L36 52Z" fill="#FFFFFF" opacity={0.8} />
    </g>
  ),
});
