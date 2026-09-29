/**
 * Custom habit icons (see catalog/habitIcons.ts), drawn in the brand style on a 32-unit canvas:
 * two tones from the habit's pastel family, cocoa outlines and a few tiny fixed accents.
 * Legible at 22 px, charming at 40 px.
 */
import type { JSX } from 'preact';
import type { PastelKey } from '@/catalog/types';
import { COCOA, PASTEL } from '@/art/icons/palette';
import { LINE, type HabitColors, type HabitDrawing } from './kit';
import { BODY_ICONS } from './body';
import { MIND_ICONS } from './mind';
import { HOME_ICONS } from './home';
import { HEART_ICONS } from './heart';

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

/** The colors each tone hands to a renderer (light-theme hexes; art keeps them at night). */
export function habitIconColors(tone: PastelKey): HabitColors {
  return { fill: PASTEL[tone][300], soft: PASTEL[tone][100], ink: COCOA };
}

/** Wraps a drawing in the shared outline style so every renderer is self-contained. */
const inked =
  (draw: HabitDrawing): HabitIconRenderer =>
  (c) => (
    <g fill="none" stroke={c.ink} stroke-width={LINE} stroke-linecap="round" stroke-linejoin="round">
      {draw(c)}
    </g>
  );

const DRAWINGS: Record<string, HabitDrawing> = { ...BODY_ICONS, ...MIND_ICONS, ...HOME_ICONS, ...HEART_ICONS };

export const HABIT_ICON_ART: Record<string, HabitIconRenderer> = Object.fromEntries(
  Object.entries(DRAWINGS).map(([id, draw]) => [id, inked(draw)]),
);

export function HabitIcon({ id, size = 28, tone = 'blush', title, class: cls, style }: HabitIconProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const render = HABIT_ICON_ART[id] ?? HABIT_ICON_ART.sparkle!;
  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      class={cls}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {render(habitIconColors(tone))}
    </svg>
  );
}
