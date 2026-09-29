/**
 * UI icon set, currency tokens and the brand mark. Glyphs sit on a 24-unit grid as flat currentColor
 * shapes with a softer second tone (./glyphs.tsx); the five tab icons have a quiet and an active state
 * (./tabs.tsx); currency tokens are small printed objects (./currency.tsx); the wordmark and sprig
 * live in ./brand.tsx.
 */
import type { JSX } from 'preact';
import { GLYPH_ALIASES, UI_GLYPHS, type Glyph } from './glyphs';
import { TAB_GLYPHS } from './tabs';
import type { Species } from '@/catalog/types';

export type IconName =
  | 'tab-today' | 'tab-progress' | 'tab-capsules' | 'tab-shelf' | 'tab-you'
  | 'plus' | 'check' | 'close' | 'chevron-left' | 'chevron-right' | 'chevron-down' | 'chevron-up' | 'more'
  | 'edit' | 'pause' | 'play' | 'archive' | 'trash' | 'calendar' | 'bell' | 'share' | 'export' | 'import' | 'camera'
  | 'gear' | 'info' | 'sparkle' | 'heart' | 'streak' | 'moon' | 'sun' | 'undo' | 'note'
  | 'search' | 'grip' | 'download' | 'upload' | 'lock' | 'gift' | 'wand' | 'volume' | 'mute'
  | 'watering-can' | 'sprout' | 'drop' | 'lamp' | 'hanger' | 'bowl' | 'frame' | 'pot' | 'book'
  | 'magnifier' | 'field-guide' | 'rest' | 'tiny';

export interface IconProps {
  name: IconName;
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /**
   * Active/solid state. Tab icons switch from quiet (currentColor, soft body) to filled in the
   * accent family; `heart` becomes solid. Other glyphs ignore it.
   */
  filled?: boolean;
  /** Stroke width of the line parts in grid units (default 2, crisp at 24 px). */
  strokeWidth?: number;
  /**
   * `tab-shelf` only: the species of your closest pet (DESIGN §1), drawn on the pot rim. Left out: the cat; null: no
   * pets yet (a sprig in the pot). Pick it with `closestPet` (favourite, then out on the Shelf, then most friendship).
   */
  species?: Species | null;
}

const GLYPHS: Record<IconName, Glyph> = { ...TAB_GLYPHS, ...UI_GLYPHS, ...GLYPH_ALIASES };

/** Every icon name, in display order (gallery, tests). Aliases come last. */
export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];

/** Names that only repeat another drawing (kept so older screens keep working). */
export const ICON_ALIASES: Partial<Record<IconName, IconName>> = {
  magnifier: 'search',
  'field-guide': 'book',
  rest: 'moon',
  tiny: 'sprout',
};

export function Icon({ name, size = 24, title, class: cls, style, filled = false, strokeWidth = 2, species }: IconProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      class={cls}
      style={style}
      fill="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {GLYPHS[name]({ filled, sw: strokeWidth, species })}
    </svg>
  );
}

export { CoinIcon, StampIcon, SwapIcon, TicketIcon, STAMP_INK } from './currency';
export type { CurrencyIconProps, SwapIconProps } from './currency';
export { CatkinSprig, Wordmark } from './brand';
export type { CatkinSprigProps, WordmarkProps } from './brand';
