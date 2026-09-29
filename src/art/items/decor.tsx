/**
 * Decor art, keyed by collectible id (100×100 canvas, standalone icon view). Owned by the world
 * module: the drawings live in art/scene/decor so the Meadow places the very same art in-scene.
 */
import type { ItemRenderer } from './types';
import { DECOR_ENTRIES } from '@/art/scene/decor';

export { decorFootprint } from '@/art/scene/decor';

export const DECOR_ART: Record<string, ItemRenderer> = Object.fromEntries(
  Object.entries(DECOR_ENTRIES).map(([id, entry]) => [id, () => entry.art()]),
);
