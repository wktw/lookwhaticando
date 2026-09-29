import type { JSX } from 'preact';

/**
 * The one sparkle a Secret is allowed (DESIGN §10.1): a soft four-point star. Never used to
 * decorate anything else.
 */
export const SPARKLE_PATH = 'M0 -10 C1.5 -2.5 2.5 -1.5 10 0 C2.5 1.5 1.5 2.5 0 10 C-1.5 2.5 -2.5 1.5 -10 0 C-2.5 -1.5 -1.5 -2.5 0 -10 Z';

/**
 * A foil glint: light catching a printed foil edge for a moment. Long vertical rays, short
 * horizontal ones and a hair-thin waist, so it reads as light, not as a star.
 */
export const GLINT_PATH = 'M0 -10 C0.5 -2.2 0.9 -0.9 6.5 0 C0.9 0.9 0.5 2.2 0 10 C-0.5 2.2 -0.9 0.9 -6.5 0 C-0.9 -0.9 -0.5 -2.2 0 -10 Z';

interface MarkProps {
  size?: number | string;
  color?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** The Secret's sparkle: on the Secret pill and the Secret's reveal, and nowhere else. */
export function SecretSparkle({ size = 12, color = 'currentColor', class: cls, style }: MarkProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="-10 -10 20 20" width={px} height={px} class={cls} style={style} aria-hidden="true" focusable="false">
      <path d={SPARKLE_PATH} fill={color} />
    </svg>
  );
}

/** A still foil glint (the animated one is fx/SparkleBurst). */
export function Glint({ size = 16, color = 'currentColor', class: cls, style }: MarkProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="-10 -10 20 20" width={px} height={px} class={cls} style={style} aria-hidden="true" focusable="false">
      <path d={GLINT_PATH} fill={color} />
    </svg>
  );
}
