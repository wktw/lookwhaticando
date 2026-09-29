/**
 * Enamel and metal for the pins. Enamel is flat and matte in the catkin families; the metal is brass,
 * the one "outline" a pin is allowed, because it is the real stamped rim. Colours are fixed (a pin is
 * an object, it keeps its colours at night) except the unearned outline, which follows the theme.
 */
import type { BadgeDef } from '@/catalog/badges';
import { FAMILY, INK, MATERIAL, mix, shadeOf } from '@/art/icons/palette';

/** The stamped brass rim, and its darker edge on the side away from the window. */
export const METAL = {
  rim: '#C9A75E',
  edge: '#A8874A',
} as const;

/** The unearned "not yet" outline (a theme token, so it stays quiet on paper and on indigo). */
export const NOT_YET = 'var(--ink-disabled, #B9ADA8)';

/** The pin's base enamel for its colour family. */
export const plateEnamel = (color: BadgeDef['color']) => FAMILY[color][300];

/** Enamel colours emblems are drawn with: the families plus the materials of real things. */
export const E = {
  ink: INK,
  paper: '#FFFDF6',
  cream: MATERIAL.cream,
  glass: '#F2F7FB',
  leafLight: MATERIAL.leafLight,
  leaf: MATERIAL.leaf,
  leafDeep: MATERIAL.leafDeep,
  stem: MATERIAL.stem,
  soil: '#A07E68',
  terracotta: MATERIAL.terracotta,
  terracottaShade: MATERIAL.terracottaShade,
  terracottaRim: MATERIAL.terracottaRim,
  brass: MATERIAL.brass,
  brassDeep: MATERIAL.brassDeep,
  wood: MATERIAL.wood,
  woodDeep: MATERIAL.woodDeep,
  plum: MATERIAL.plum,
  catEye: MATERIAL.catEye,
  blush: FAMILY.blush[500],
  blushDeep: mix(FAMILY.blush[500], FAMILY.blush[700], 0.35),
  blushInk: FAMILY.blush[700],
  peach: FAMILY.peach[500],
  peachInk: FAMILY.peach[700],
  butter: FAMILY.butter[500],
  butterDeep: mix(FAMILY.butter[500], FAMILY.butter[700], 0.22),
  sage: FAMILY.sage[500],
  mint: FAMILY.mint[500],
  mintDeep: mix(FAMILY.mint[500], FAMILY.mint[700], 0.3),
  sky: FAMILY.sky[500],
  skyDeep: mix(FAMILY.sky[500], FAMILY.sky[700], 0.3),
  lavender: FAMILY.lavender[500],
  lavenderDeep: mix(FAMILY.lavender[500], FAMILY.lavender[700], 0.3),
  lilac: FAMILY.lilac[500],
  lilacDeep: mix(FAMILY.lilac[500], FAMILY.lilac[700], 0.3),
  strawberry: '#E7848F',
  lamp: '#FFC98A',
} as const;

/** A flat, pre-mixed shade tone for the side of a shape away from the window. */
export const shade = (hex: string) => shadeOf(hex, 0.18);
