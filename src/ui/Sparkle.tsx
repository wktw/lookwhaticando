import type { JSX } from 'preact';

/** The universal ✦ "magic" motif: a soft four-point star (DESIGN §10.4). */
export const SPARKLE_PATH = 'M0 -10 C1.5 -2.5 2.5 -1.5 10 0 C2.5 1.5 1.5 2.5 0 10 C-1.5 2.5 -2.5 1.5 -10 0 C-2.5 -1.5 -1.5 -2.5 0 -10 Z';

export function Sparkle({ size = 12, color = 'currentColor', class: cls, style }: { size?: number | string; color?: string; class?: string; style?: JSX.CSSProperties }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="-10 -10 20 20" width={px} height={px} class={cls} style={style} aria-hidden="true" focusable="false">
      <path d={SPARKLE_PATH} fill={color} />
    </svg>
  );
}
