import type { JSX } from 'preact';
import type { ArtCtx, PatternId } from '../types';
import { bellyOnly, calico, mallard, panda, patch, siamese, socks, tabby, tuxedo, urajiro } from './coats';
import { cow, cowHearts, cowMoons, cowStars, hearts, spots } from './spots';
import { petals, raindrops, seeds, snowflakes, sprinkles, stars } from './scatter';
import { candyStripes, icing, melon, nebula, rainbow, stripes } from './bands';

/**
 * Body-clipped pattern renderers. Each receives the ctx and draws in pet canvas
 * coordinates; the caller clips to the body path, so shapes can overflow the outline freely.
 * Patterns must leave the face readable: keep dark patches away from the eye anchors.
 */
export type PatternRenderer = (ctx: ArtCtx) => JSX.Element | null;

export const PATTERNS: Record<PatternId, PatternRenderer> = {
  none: () => null,
  tabby,
  calico,
  tuxedo,
  siamese,
  cow,
  'cow-hearts': cowHearts,
  'cow-moons': cowMoons,
  'cow-stars': cowStars,
  sprinkles,
  seeds,
  petals,
  stars,
  hearts,
  panda,
  socks,
  patch,
  stripes,
  'candy-stripes': candyStripes,
  melon,
  rainbow,
  nebula,
  icing,
  'belly-only': bellyOnly,
  spots,
  urajiro,
  raindrops,
  snowflakes,
  mallard,
};
