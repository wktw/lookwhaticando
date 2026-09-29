/**
 * Habit icons (catalog/habitIcons.ts): 48 small real objects on a 32-unit canvas, printed flat in
 * the habit's pastel family (DESIGN §10.4). Each one is legible at 20 px on the little stake in a pot
 * and keeps its colours at night, like every printed object in the app.
 */
import type { JSX } from 'preact';
import type { PastelKey } from '@/catalog/types';
import { FAMILY, shadeOf } from '@/art/icons/palette';
import type { HabitColors, HabitDrawing } from './kit';
import { BODY_ICONS } from './body';
import { MIND_ICONS } from './mind';
import { HOME_ICONS } from './home';
import { HEART_ICONS } from './heart';

export type { HabitColors } from './kit';

export interface HabitIconProps {
  id: string;
  size?: number | string;
  /** Pastel family the icon is printed in (matches the habit colour). */
  tone?: PastelKey;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /**
   * Kept for callers of the old sticker-edged icons. The catkin icons are flat prints with no
   * outline to protect, so they read on dark cards without a backing; this prop changes nothing.
   */
  sticker?: boolean;
}

/** What a renderer takes: the three tones older callers pass, and optionally the two newer ones. */
export interface HabitIconColorsInput {
  fill: string;
  soft: string;
  ink: string;
  light?: string;
  shade?: string;
}

/** Draws on a 32 × 32 canvas in the given tones. */
export type HabitIconRenderer = (c: HabitIconColorsInput) => JSX.Element;

/** The tones one family hands to a drawing (light-theme hexes; the art keeps them at night). */
export function habitIconColors(tone: PastelKey): HabitColors {
  const f = FAMILY[tone];
  return { soft: f[100], light: f[300], fill: f[500], ink: f[700], shade: shadeOf(f[500], 0.18) };
}

const complete = (c: HabitIconColorsInput): HabitColors => ({ ...c, light: c.light ?? c.soft, shade: c.shade ?? c.fill });

const DRAWINGS: Record<string, HabitDrawing> = { ...BODY_ICONS, ...MIND_ICONS, ...HOME_ICONS, ...HEART_ICONS };

export const HABIT_ICON_ART: Record<string, HabitIconRenderer> = Object.fromEntries(
  Object.entries(DRAWINGS).map(([id, draw]) => [id, (c: HabitIconColorsInput) => draw(complete(c))]),
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
