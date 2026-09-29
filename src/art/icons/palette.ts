/**
 * Fixed colors for the icon, currency, habit-icon and badge art. These mirror the light-theme
 * tokens (styles/tokens.css) as literal hexes because illustrations keep their colors in both
 * themes, exactly like the pets do.
 */
import type { PastelKey } from '@/catalog/types';

/** Illustration outline (never pure black). */
export const COCOA = '#5A3E45';

export interface PastelShades {
  100: string;
  300: string;
  500: string;
  700: string;
}

export const PASTEL: Record<PastelKey, PastelShades> = {
  blush: { 100: '#FFE9EF', 300: '#FFC4D3', 500: '#F58CAA', 700: '#C23F68' },
  peach: { 100: '#FFEEDF', 300: '#FFCBA8', 500: '#FF9E6E', 700: '#B85A2B' },
  butter: { 100: '#FFF7D9', 300: '#FFE593', 500: '#F6C544', 700: '#9A7200' },
  sage: { 100: '#EBF5E6', 300: '#C3DFB4', 500: '#8EC07C', 700: '#4F7F41' },
  mint: { 100: '#E3F7F1', 300: '#B3E6D6', 500: '#6CCBAE', 700: '#2E7D66' },
  sky: { 100: '#E7F3FD', 300: '#BBDCF6', 500: '#7DB7E8', 700: '#2F6E9E' },
  lavender: { 100: '#F2EDFE', 300: '#D6C8F8', 500: '#A993EA', 700: '#6A51BF' },
  lilac: { 100: '#FBEAFB', 300: '#F0C6F0', 500: '#D98ED9', 700: '#8E4A8E' },
};

/** Small saturated accents (a strawberry, a coin): used sparingly, never for large areas. */
export const ACCENT = {
  gold: '#F6C544',
  goldLight: '#FFE593',
  goldDeep: '#E2A72E',
  star: '#FFD65C',
  red: '#F7837F',
  redDeep: '#E0676A',
  leaf: '#A5D38F',
  leafDeep: '#7FB86A',
  cheek: '#FF9FB8',
  cream: '#FFFBF5',
  wood: '#E8B98C',
  white: '#FFFFFF',
} as const;
