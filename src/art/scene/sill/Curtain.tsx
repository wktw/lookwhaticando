import { OUTLINE } from '@/art/pets/geometry';
import s from './sill.module.css';

/** Polka dots on the curtain: [x, y]. */
const DOTS: readonly [number, number][] = [
  [8, 10], [22, 13], [14, 24], [5, 36], [19, 33], [11, 47], [5, 70], [15, 79], [8, 91], [24, 93],
];

/**
 * A blush curtain gathered on the rod and tied back at `TIE_Y` (left side; the right one is
 * mirrored). Canvas 40×100 spanning the window's height.
 */
export function Curtain({ side }: { side: 'left' | 'right' }) {
  return (
    <svg class={`${s.curtain} ${side === 'right' ? s.right : ''}`} viewBox="0 0 40 100" aria-hidden="true" focusable="false">
      <path class={s.cloth} d="M-2 0 L37 0 C33 20 20 43 13 57 C19 71 28 86 33 101 L-2 101 Z" stroke={OUTLINE} stroke-width={1.3} stroke-linejoin="round" />
      <g class={s.fold} fill="none" stroke-width={1.6} stroke-linecap="round">
        <path d="M12 2 C12 22 9 41 7 55" />
        <path d="M25 2 C23 21 17 40 11 55" />
        <path d="M8 60 C10 75 14 87 17 98" />
        <path d="M14 61 C19 74 23 86 26 98" />
      </g>
      <g fill="#fff" opacity={0.7}>
        {DOTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} />
        ))}
      </g>
      {/* ribbon tie-back */}
      <g stroke={OUTLINE} stroke-width={1.1} stroke-linejoin="round" fill="#A6D38F">
        <path d="M-2 55 Q7 53 14 56 L14 60 Q7 57 -2 59 Z" />
        <path d="M14 58 C11 52 5 52 5.5 56.5 C6 61 11 61 14 58 Z" />
        <path d="M14 58 C17 52 23 52 22.5 56.5 C22 61 17 61 14 58 Z" />
        <path d="M13.2 59 L10.6 65 L13.8 64 L15 66 L15.8 59 Z" />
        <circle cx={14} cy={58} r={2.2} fill="#8EC07C" />
      </g>
    </svg>
  );
}
