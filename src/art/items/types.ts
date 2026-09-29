import type { JSX } from 'preact';
import type { Light } from '@/art/light';

export interface ItemArtOptions {
  /** Windowlight: the side the light comes from; `light.night` draws the item in Lamplight. Defaults to DAY_LIGHT. */
  light?: Light;
  /** Which way the item faces on screen: pass 'left' when mirroring it with `scaleX(-1)` so its shade stays away from the light. */
  facing?: 'left' | 'right';
}

/** Draws an item on a 100×100 canvas (no <svg> wrapper). Callable with no argument, or used as a component. */
export type ItemRenderer = (opts?: ItemArtOptions) => JSX.Element;
