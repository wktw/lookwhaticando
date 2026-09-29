/**
 * Badge colors. Emblems paint with semantic swatches so an unearned medal can be redrawn in
 * soft lavender-grey (three values keep every shape readable) without any CSS filter.
 */
import type { BadgeDef } from '@/catalog/badges';
import { ACCENT, COCOA, PASTEL } from '@/art/icons/palette';

export interface EmblemPalette {
  ink: string;
  white: string;
  gold: string;
  goldLight: string;
  goldDeep: string;
  blush: string;
  blushDeep: string;
  peach: string;
  peachDeep: string;
  butter: string;
  leaf: string;
  leafDeep: string;
  sage: string;
  mint: string;
  mintDeep: string;
  sky: string;
  skyDeep: string;
  lavender: string;
  lavenderDeep: string;
  lilac: string;
  red: string;
  wood: string;
  brown: string;
  cheek: string;
}

export const EARNED: EmblemPalette = {
  ink: COCOA,
  white: '#FFFFFF',
  gold: ACCENT.gold,
  goldLight: ACCENT.goldLight,
  goldDeep: ACCENT.goldDeep,
  blush: PASTEL.blush[300],
  blushDeep: PASTEL.blush[500],
  peach: PASTEL.peach[300],
  peachDeep: PASTEL.peach[500],
  butter: ACCENT.star,
  leaf: ACCENT.leaf,
  leafDeep: ACCENT.leafDeep,
  sage: PASTEL.sage[300],
  mint: PASTEL.mint[300],
  mintDeep: PASTEL.mint[500],
  sky: PASTEL.sky[300],
  skyDeep: PASTEL.sky[500],
  lavender: PASTEL.lavender[300],
  lavenderDeep: PASTEL.lavender[500],
  lilac: PASTEL.lilac[300],
  red: ACCENT.red,
  wood: ACCENT.wood,
  brown: '#B98A6E',
  cheek: ACCENT.cheek,
};

const M_LIGHT = '#F6F3FA';
const M_MID = '#E4DDEF';
const M_DEEP = '#CEC4DF';

/** The unearned look: soft lavender-grey, still friendly. */
export const MUTED: EmblemPalette = {
  ink: '#9E90B2',
  white: M_LIGHT,
  gold: M_MID,
  goldLight: M_LIGHT,
  goldDeep: M_DEEP,
  blush: M_MID,
  blushDeep: M_DEEP,
  peach: M_MID,
  peachDeep: M_DEEP,
  butter: M_MID,
  leaf: M_MID,
  leafDeep: M_DEEP,
  sage: M_MID,
  mint: M_MID,
  mintDeep: M_DEEP,
  sky: M_MID,
  skyDeep: M_DEEP,
  lavender: M_MID,
  lavenderDeep: M_DEEP,
  lilac: M_MID,
  red: M_DEEP,
  wood: M_MID,
  brown: M_DEEP,
  cheek: M_DEEP,
};

/** Colors of the medal itself (ribbon, crust, face) for a badge color family. */
export interface MedalColors {
  ribbon: string;
  ribbonDeep: string;
  crust: string;
  crustLight: string;
  face: string;
}

export function medalColors(color: BadgeDef['color'], earned: boolean): MedalColors {
  if (!earned) return { ribbon: M_MID, ribbonDeep: M_DEEP, crust: M_MID, crustLight: M_LIGHT, face: '#FBFAFD' };
  return { ribbon: PASTEL[color][300], ribbonDeep: PASTEL[color][500], crust: ACCENT.gold, crustLight: ACCENT.goldLight, face: PASTEL[color][100] };
}
