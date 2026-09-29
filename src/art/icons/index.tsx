/**
 * UI icon set + currency art. STUB: the icons module implements every name below in the
 * brand style (rounded, chunky 2px strokes on a 24-unit grid, currentColor-driven).
 */
import type { JSX } from 'preact';

export type IconName =
  | 'tab-today' | 'tab-progress' | 'tab-capsules' | 'tab-meadow' | 'tab-you'
  | 'plus' | 'check' | 'close' | 'chevron-left' | 'chevron-right' | 'chevron-down' | 'more'
  | 'edit' | 'pause' | 'play' | 'archive' | 'trash' | 'calendar' | 'bell' | 'share' | 'camera'
  | 'gear' | 'info' | 'sparkle' | 'heart' | 'streak' | 'moon' | 'sun' | 'undo' | 'note'
  | 'search' | 'grip' | 'download' | 'upload' | 'lock' | 'gift' | 'wand' | 'volume' | 'mute';

export interface IconProps {
  name: IconName;
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export function Icon({ size = 24, title, class: cls, style }: IconProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="0 0 24 24" width={px} height={px} class={cls} style={style} fill="none" stroke="currentColor" stroke-width={2} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <circle cx={12} cy={12} r={7} />
    </svg>
  );
}

export interface CurrencyIconProps {
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

const stub = (fill: string) =>
  function CurrencyStub({ size = 20, title, class: cls, style }: CurrencyIconProps) {
    const px = typeof size === 'number' ? `${size}px` : size;
    return (
      <svg viewBox="0 0 32 32" width={px} height={px} class={cls} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        <circle cx={16} cy={16} r={12} fill={fill} stroke="#5A3E45" stroke-width={2} />
      </svg>
    );
  };

/** Gold coin with an embossed paw. */
export const CoinIcon = stub('#F6C544');
/** Butter-yellow five-point star. */
export const StarIcon = stub('#FFD65C');
/** A little jar of sparkles (duplicates → stardust). Accepts `fill` 0..1 to show jar level. */
export const StardustIcon = stub('#D6C8F8');
/** Pink capsule ticket. */
export const TicketIcon = stub('#FFC4D3');
