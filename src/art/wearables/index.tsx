import type { WearableArt, ArtCtx } from '../pets/types';
import { OUTLINE, STROKE } from '../pets/geometry';

/**
 * Wearable art, keyed by collectible id. Each renderer draws in pet canvas coordinates
 * using ctx.anchors so the same item fits every species. Body wear is clipped to the body
 * by PetArt, so it can simply cover the region from anchors.body.top to the bottom.
 *
 * Reference implementations (one per slot): wear-pink-bow, wear-bell-collar,
 * wear-reading-glasses, wear-cozy-stripes.
 */

/** Pink bow, tilted and sitting on the top-left of the head. */
const pinkBow: WearableArt = {
  render: ({ anchors }) => {
    const x = anchors.head.x - anchors.head.width * 0.28;
    const y = anchors.head.y + 4.5;
    return (
      <g transform={`translate(${x} ${y}) rotate(-14)`} stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round">
        <path d="M0 0 C-4 -6 -12 -7.5 -12.5 -1.5 C-13 4.5 -5 5 0 0 Z" fill="#FF9FB8" />
        <path d="M0 0 C4 -6 12 -7.5 12.5 -1.5 C13 4.5 5 5 0 0 Z" fill="#FF9FB8" />
        <path d="M-1 1 L-4.5 8 L-1.2 7 L0 9.6 L1.6 1.2 Z" fill="#F58CAA" />
        <ellipse cx={0} cy={0} rx={3} ry={3.3} fill="#F58CAA" />
        <path d="M-8.5 -3.6 C-7 -4.6 -5.4 -4.4 -4.4 -3.6" fill="none" stroke="#fff" stroke-width={1.1} stroke-linecap="round" opacity={0.8} />
      </g>
    );
  },
};

/** Collar band following the neck line, with a golden bell. */
const bellCollar: WearableArt = {
  render: ({ anchors, body }) => {
    const y = anchors.neck.y;
    const hw = body.halfWidthAt(y) - 0.6;
    return (
      <g stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round">
        <path d={`M${50 - hw} ${y - 1.8} Q50 ${y + 5} ${50 + hw} ${y - 1.8} L${50 + hw} ${y + 2.2} Q50 ${y + 9} ${50 - hw} ${y + 2.2} Z`} fill="#F58CAA" />
        <g transform={`translate(50 ${y + 7.6})`}>
          <circle r={4.4} fill="#FFD65C" />
          <path d="M-2.6 0.6 L2.6 0.6" stroke-width={1.1} />
          <circle cy={2} r={0.9} fill={OUTLINE} stroke="none" />
          <circle cx={-1.4} cy={-1.6} r={1} fill="#fff" stroke="none" opacity={0.85} />
        </g>
      </g>
    );
  },
};

/** Round reading glasses across the eye anchors. */
const readingGlasses: WearableArt = {
  render: ({ anchors }) => {
    const { left, right, y } = anchors.eyes;
    const r = Math.min(7.2, (right - left) * 0.34);
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
  },
};

/** Striped sweater covering the lower body (auto-clipped), with a ribbed neckline. */
const cozyStripes: WearableArt = {
  render: ({ anchors }: ArtCtx) => {
    const top = anchors.body.top - 1;
    return (
      <g>
        <rect x={0} y={top} width={100} height={40} fill="#C3DFB4" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={0} y={top + 6 + i * 6.5} width={100} height={2.8} fill="#FFFDF8" opacity={0.9} />
        ))}
        <path d={`M0 ${top} Q50 ${top + 7} 100 ${top}`} fill="none" stroke="#8EC07C" stroke-width={5} />
        <path d={`M0 ${top - 2.2} Q50 ${top + 4.8} 100 ${top - 2.2}`} fill="none" stroke={OUTLINE} stroke-width={STROKE * 0.8} />
      </g>
    );
  },
};

export const WEARABLE_ART: Record<string, WearableArt> = {
  'wear-pink-bow': pinkBow,
  'wear-bell-collar': bellCollar,
  'wear-reading-glasses': readingGlasses,
  'wear-cozy-stripes': cozyStripes,
};
