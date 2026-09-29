/**
 * Custom habit icons (see catalog/habitIcons.ts). STUB: the icons module draws every id
 * in the brand style: chunky, 2-tone pastel, cocoa outline, legible at 20–28 px.
 */
import type { JSX } from 'preact';

export interface HabitIconProps {
  id: string;
  size?: number | string;
  /** Pastel family used for the icon's main fill (matches the habit color). */
  tone?: 'blush' | 'peach' | 'butter' | 'sage' | 'mint' | 'sky' | 'lavender' | 'lilac';
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** Draws on a 32×32 canvas; receives fill colors for the chosen tone. */
export type HabitIconRenderer = (c: { fill: string; soft: string; ink: string }) => JSX.Element;

export const HABIT_ICON_ART: Record<string, HabitIconRenderer> = {};

export function HabitIcon({ id, size = 28, title, class: cls, style }: HabitIconProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const r = HABIT_ICON_ART[id];
  return (
    <svg viewBox="0 0 32 32" width={px} height={px} class={cls} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {r ? r({ fill: '#FFC4D3', soft: '#FFE9EF', ink: '#5A3E45' }) : <circle cx={16} cy={16} r={10} fill="#FFE9EF" stroke="#5A3E45" stroke-width={2} />}
    </svg>
  );
}
