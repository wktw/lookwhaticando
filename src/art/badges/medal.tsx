/**
 * Medal parts on a 100-unit canvas: ribbon tails behind a pie-crust medallion, whose face
 * holds a 40×40 emblem. Two layouts: `full` (a gold inner band, 18 fine scallops, long tails)
 * and `compact` for shelf sizes (≤ 64 px), where the emblem grows, the scallops get bolder and
 * the tails shorter so the picture, not the chrome, carries the medal.
 */
import { heartPath, scallopPath } from '@/art/icons/shapes';
import { PASTEL } from '@/art/icons/palette';
import type { MedalColors } from './palette';

export const MEDAL_STROKE = 2.4;

export interface MedalLayout {
  crust: string;
  /** Radius of the gold inner band, or 0 for none. */
  band: number;
  face: { cy: number; r: number };
  /** Places the 40×40 emblem box on the face (its 2.2 strokes land near the medal's 2.4). */
  emblem: string;
  sheen: string;
  ribbons: { left: string; right: string; stripes: string };
  lock?: string;
}

const LAYOUTS: Record<'full' | 'compact', MedalLayout> = {
  full: {
    crust: scallopPath(50, 42, 29.5, 18),
    band: 27.2,
    face: { cy: 42, r: 24.6 },
    emblem: 'translate(28 20) scale(1.1)',
    sheen: 'M23.3 31.6A28.4 28.4 0 0 1 35.8 17.4',
    ribbons: {
      left: 'M38.5 58L27.5 90.5l6.6-3.2 4.6 6.8L48.6 62z',
      right: 'M61.5 58l11 32.5-6.6-3.2-4.6 6.8L51.4 62z',
      stripes: 'M40.6 66.4l-6.2 18.8M59.4 66.4l6.2 18.8',
    },
  },
  compact: {
    crust: scallopPath(50, 43, 31, 14),
    band: 0,
    face: { cy: 43, r: 27 },
    emblem: 'translate(24.8 17.8) scale(1.26)',
    sheen: 'M22.2 32.9A29.6 29.6 0 0 1 35.2 17.4',
    ribbons: {
      left: 'M38 60L29.5 87.5l6-2.8 4.2 6.2L48.6 64z',
      right: 'M62 60l8.5 27.5-6-2.8-4.2 6.2L51.4 64z',
      stripes: 'M40.4 68l-4.8 14.8M59.6 68l4.8 14.8',
    },
    lock: 'translate(73 80) scale(1.3) translate(-73 -80)',
  },
};

export const medalLayout = (compact: boolean) => LAYOUTS[compact ? 'compact' : 'full'];

const KEYHOLE = heartPath(73, 76.6, 5.4);

export function Ribbon({ m, ink, layout }: { m: MedalColors; ink: string; layout: MedalLayout }) {
  return (
    <g stroke={ink} stroke-width={MEDAL_STROKE} stroke-linejoin="round" stroke-linecap="round">
      <path d={layout.ribbons.left} fill={m.ribbon} />
      <path d={layout.ribbons.right} fill={m.ribbon} />
      <path d={layout.ribbons.stripes} fill="none" stroke={m.ribbonDeep} stroke-width={3} />
    </g>
  );
}

export function Medallion({ m, ink, layout }: { m: MedalColors; ink: string; layout: MedalLayout }) {
  const { cy, r } = layout.face;
  return (
    <g stroke={ink} stroke-linejoin="round">
      <path d={layout.crust} fill={m.crust} stroke-width={MEDAL_STROKE} />
      {layout.band > 0 && <circle cx={50} cy={cy} r={layout.band} fill={m.crustLight} stroke="none" />}
      <circle cx={50} cy={cy} r={r} fill={m.face} stroke-width={2.2} />
      <path d={layout.sheen} fill="none" stroke="#fff" stroke-width={1.8} stroke-linecap="round" opacity={0.85} />
    </g>
  );
}

/** A little padlock with a heart keyhole: "not yet", said kindly. */
export function LockTag({ ink, layout }: { ink: string; layout: MedalLayout }) {
  return (
    <g transform={layout.lock} stroke={ink} stroke-width={2.2} stroke-linejoin="round" stroke-linecap="round">
      <path d="M67.4 72v-3.4a5.6 5.6 0 0 1 11.2 0V72" fill="none" />
      <rect x={63.6} y={71.6} width={18.8} height={14} rx={4.2} fill={PASTEL.lavender[300]} />
      <path d={KEYHOLE} fill="#fff" stroke="none" />
    </g>
  );
}
