/**
 * Medal parts on a 100-unit canvas: ribbon tails behind a pie-crust medallion, whose face
 * holds a 40×40 emblem (scaled 1.1×) centered at (50, 42). The lock tag marks badges still to come.
 */
import { heartPath, scallopPath } from '@/art/icons/shapes';
import type { MedalColors } from './palette';

export const MEDAL_STROKE = 2.4;
/** The emblem's 40×40 box, scaled so its 2.2 strokes land on the medal's 2.4 weight. */
export const EMBLEM_TRANSFORM = 'translate(28 20) scale(1.1)';

const CRUST = scallopPath(50, 42, 29.5, 18);
const KEYHOLE = heartPath(73, 76.6, 5.4);

export function Ribbon({ m, ink }: { m: MedalColors; ink: string }) {
  return (
    <g stroke={ink} stroke-width={MEDAL_STROKE} stroke-linejoin="round" stroke-linecap="round">
      <path d="M38.5 58L27.5 90.5l6.6-3.2 4.6 6.8L48.6 62z" fill={m.ribbon} />
      <path d="M61.5 58l11 32.5-6.6-3.2-4.6 6.8L51.4 62z" fill={m.ribbon} />
      <path d="M40.6 66.4l-6.2 18.8M59.4 66.4l6.2 18.8" fill="none" stroke={m.ribbonDeep} stroke-width={3} />
    </g>
  );
}

export function Medallion({ m, ink }: { m: MedalColors; ink: string }) {
  return (
    <g stroke={ink} stroke-linejoin="round">
      <path d={CRUST} fill={m.crust} stroke-width={MEDAL_STROKE} />
      <circle cx={50} cy={42} r={27.2} fill={m.crustLight} stroke="none" />
      <circle cx={50} cy={42} r={24.6} fill={m.face} stroke-width={2.2} />
      <path d="M23.3 31.6A28.4 28.4 0 0 1 35.8 17.4" fill="none" stroke="#fff" stroke-width={1.8} stroke-linecap="round" opacity={0.85} />
    </g>
  );
}

/** A little padlock with a heart keyhole: "not yet", said kindly. */
export function LockTag({ ink }: { ink: string }) {
  return (
    <g stroke={ink} stroke-width={2.2} stroke-linejoin="round" stroke-linecap="round">
      <path d="M67.4 72v-3.4a5.6 5.6 0 0 1 11.2 0V72" fill="none" />
      <rect x={63.6} y={71.6} width={18.8} height={14} rx={4.2} fill="#D6C8F8" />
      <path d={KEYHOLE} fill="#fff" stroke="none" />
    </g>
  );
}
