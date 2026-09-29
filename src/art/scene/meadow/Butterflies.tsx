import { OUTLINE } from '@/art/pets/geometry';
import s from './meadow.module.css';

/** [left %, top %, wings, loop seconds]: two butterflies drifting over the flowers by day. */
const BUTTERFLIES: readonly (readonly [x: number, y: number, wing: string, dur: number])[] = [
  [26, 60, '#FFC4D3', 19],
  [70, 54, '#FFE593', 23],
];

/**
 * Daytime butterflies: tiny attribute-painted SVGs. They drift on a slow CSS loop and flap by
 * squashing the whole element sideways, so both motions stay on the compositor.
 */
export function Butterflies() {
  return (
    <div class={s.critters} aria-hidden="true">
      {BUTTERFLIES.map(([x, y, wing, dur], i) => (
        <div key={i} class={s.flutter} style={{ left: `${x}%`, top: `${y}%`, '--dur': `${dur}s`, '--delay': `${-i * 7}s`, '--dir': i % 2 ? -1 : 1 }}>
          <svg class={s.butterfly} viewBox="-13 -11 26 22" focusable="false">
            <g fill={wing} stroke={OUTLINE} stroke-width={1.4} stroke-linejoin="round">
              <path d="M-1 -1 C-6 -10 -12 -9 -11.5 -4 C-11 0 -6 1 -1 0 Z" />
              <path d="M1 -1 C6 -10 12 -9 11.5 -4 C11 0 6 1 1 0 Z" />
              <path d="M-1 0.5 C-5 1 -8.5 3.5 -7 6.5 C-5.5 8.5 -2.5 6 -1 2 Z" />
              <path d="M1 0.5 C5 1 8.5 3.5 7 6.5 C5.5 8.5 2.5 6 1 2 Z" />
            </g>
            <g fill="#fff" opacity={0.75}>
              <circle cx={-7.5} cy={-4.6} r={1.3} />
              <circle cx={7.5} cy={-4.6} r={1.3} />
            </g>
            <path d="M0 -3 L0 5" stroke={OUTLINE} stroke-width={2.6} stroke-linecap="round" />
            <path d="M-0.5 -3.5 Q-2 -7 -4 -8 M0.5 -3.5 Q2 -7 4 -8" fill="none" stroke={OUTLINE} stroke-width={1} stroke-linecap="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}
