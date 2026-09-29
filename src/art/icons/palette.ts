/**
 * Fixed colours for the icon, currency, habit-icon, pin and app-icon art (DESIGN §10.1). These mirror
 * the light-theme tokens (styles/tokens.css) as literal hexes, because printed objects keep their
 * colours in both themes, like the pets do. UI glyphs never use these: they paint in currentColor.
 */
import type { PastelKey } from '@/catalog/types';

/** Warm graphite ink (never pure black). Also `--on-accent`. */
export const INK = '#3B3236';
export const INK_2 = '#66585D';
/** Paper surfaces. */
export const PAPER = '#FAF6EF';
export const OAT = '#F1E9DD';
export const CARD = '#FFFDF9';
/** The lavender ink of every hard shade (`--shade` is this at 16%). */
export const SHADE_INK = '#5E4C9A';

export interface FamilyShades {
  100: string;
  300: string;
  500: string;
  700: string;
}

/** The eight ink families, light-theme values (100 tint · 300 soft · 500 hero fill · 700 text-safe). */
export const FAMILY: Record<PastelKey, FamilyShades> = {
  blush: { 100: '#FBE9EC', 300: '#F5CDD6', 500: '#EFB4C1', 700: '#A3405B' },
  peach: { 100: '#F9EBE3', 300: '#EFCDBD', 500: '#DDA088', 700: '#91492C' },
  butter: { 100: '#FBF3DA', 300: '#F6E6B4', 500: '#F2D98A', 700: '#735A0B' },
  sage: { 100: '#EEF3E7', 300: '#D5E3C7', 500: '#B5CC9C', 700: '#46653A' },
  mint: { 100: '#E8F3EE', 300: '#CDE6DA', 500: '#A9D3C0', 700: '#2D6653' },
  sky: { 100: '#EAF2F9', 300: '#D2E4F2', 500: '#B3D1E8', 700: '#2D6186' },
  lavender: { 100: '#F1EDF9', 300: '#DDD4F1', 500: '#C8BAE6', 700: '#5A4896' },
  lilac: { 100: '#F8ECF6', 300: '#EDD3EA', 500: '#DDB6DA', 700: '#834281' },
};

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) =>
  `#${rgb
    .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

/** Mix two hex colours (t = 0 → a, 1 → b). Used at module load to pre-mix flat tones, never per frame. */
export function mix(a: string, b: string, t: number): string {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex(A.map((v, i) => v + (B[i]! - v) * t));
}

/** The side of a shape away from the window: the colour pre-mixed with the lavender shade ink. */
export const shadeOf = (hex: string, amount = 0.2) => mix(hex, '#5A4870', amount);

/** Materials: the ordinary things the art is made of. */
export const MATERIAL = {
  terracotta: '#DDA088',
  terracottaRim: '#CF8E74',
  terracottaShade: shadeOf('#DDA088', 0.24),
  terracottaRimShade: shadeOf('#CF8E74', 0.22),
  brass: '#D8B769',
  brassLight: '#E8CF8C',
  brassDeep: '#B8954A',
  brassShade: shadeOf('#D8B769', 0.2),
  leafLight: '#BCD3A3',
  leaf: '#9CBC87',
  leafDeep: '#7F9F6F',
  stem: '#8DAA79',
  twig: '#7E6152',
  catkin: '#E6E0E2',
  catkinShade: '#C9C1C8',
  plum: '#3A3238',
  plumRim: '#6B6177',
  catEye: '#F2D98A',
  glass: '#E4EEF6',
  water: '#B3D1E8',
  cream: '#F7EDE0',
  wood: '#D9B48F',
  woodDeep: '#B98D68',
} as const;

