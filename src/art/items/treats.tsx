/**
 * Treat art, keyed by collectible id (100×100 canvas, no <svg> wrapper): real kitchen treats at pet
 * scale, drawn flat and matte in one light (DESIGN §10.4), each readable at 40 px. Call with
 * `{ light }` for Windowlight from the left, above or the right, or Lamplight when `light.night`.
 */
import type { ItemRenderer } from './types';
import { FRESH_TREATS } from './fresh';
import { BAKED_TREATS } from './baked';
import { SERVED_TREATS } from './served';

export const TREAT_ART: Record<string, ItemRenderer> = {
  ...FRESH_TREATS,
  ...BAKED_TREATS,
  ...SERVED_TREATS,
};
