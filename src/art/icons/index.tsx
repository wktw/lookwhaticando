/**
 * UI icon set + currency art. Glyphs sit on a 24-unit grid with rounded 2 px currentColor
 * strokes (./glyphs.tsx); the five tab icons are two-state illustrations (./tabs.tsx).
 */
import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { UI_GLYPHS, type Glyph } from './glyphs';
import { TAB_GLYPHS } from './tabs';

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
  /**
   * Active/solid state. Tab icons bloom into full-color pastel illustrations (outline stays
   * currentColor, inner details turn cocoa); `heart` becomes solid. Other glyphs ignore it.
   */
  filled?: boolean;
  /** Stroke width in grid units (default 2, crisp at 24 px). */
  strokeWidth?: number;
}

const GLYPHS: Record<IconName, Glyph> = { ...TAB_GLYPHS, ...UI_GLYPHS };

/** Every icon name, in display order (gallery, tests). */
export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];

export function Icon({ name, size = 24, title, class: cls, style, filled = false, strokeWidth = 2 }: IconProps) {
  const uid = `ic${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      class={cls}
      style={style}
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {GLYPHS[name]({ filled, uid })}
    </svg>
  );
}

export { CoinIcon, StarIcon, StardustIcon, TicketIcon } from './currency';
export type { CurrencyIconProps, StardustIconProps } from './currency';
