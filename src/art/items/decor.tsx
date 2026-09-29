/**
 * Decor art as icons, keyed by collectible id (100×100 canvas). The drawings live in art/scene/decor
 * so the Shelf places the very same art in the room; `light.night` draws the Lamplight version.
 */
import type { ItemRenderer } from './types';
import { DECOR_ENTRIES } from '@/art/scene/decor';

export { decorFootprint } from '@/art/scene/decor';

export const DECOR_ART: Record<string, ItemRenderer> = Object.fromEntries(
  Object.entries(DECOR_ENTRIES).map(([id, entry]) => [id, (opts) => entry.art({ light: opts?.light, night: opts?.light?.night, facing: opts?.facing })]),
);
